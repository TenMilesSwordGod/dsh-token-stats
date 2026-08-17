import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { zstdDecompressSync } from "node:zlib";
import { decodeStorageRecord } from "@deepseek-ai/dsh-session";
import { dshHomePath } from "@deepseek-ai/dsh-home-paths";

/**
 * @deepseek-ai/dsh-token-stats — host half.
 *
 * Scans every persisted session log under `$DSH_HOME/sessions` and aggregates
 * provider-reported token usage per provider/model pair per local calendar
 * day, then serves the result as JSON from `GET /token-stats` (an exact route
 * on the web server, outside the reserved `/api` prefix). Live session events
 * invalidate the small TTL cache so the current day stays fresh.
 *
 * Cost estimation rides the same scan: each usage sample is priced with the
 * model's per-1M-token rates (input / output / cache-read / cache-write),
 * applying the model's off-peak discount when the sample's UTC time falls in
 * the configured window — so "day price vs night price" is computed per
 * event, not per day. Rates come from a built-in default table, merged with a
 * user-editable JSON file at `$DSH_HOME/storages/token-stats-prices.json`
 * (GET/POST `/token-stats/prices`), and can be refreshed from the public
 * OpenRouter model catalog (`POST /token-stats/prices/sync`).
 *
 * Attribution: the provider/model of a usage sample is the pair of the most
 * recent `request/header` event in the same log; a sample is the final
 * `assistant/message` usage (or the last `assistant/chunk` usage sample of a
 * turn/step, so a failed request still counts). Same-turn/step samples
 * replace rather than double count, mirroring the token-meter projection.
 */

const name = "token-stats";
const inject = ["webServer"];

/** Zstandard frame magic, little-endian `0xFD2FB528`. */
const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
/** Response cache TTL; live session events invalidate earlier. */
const CACHE_TTL_MS = 10_000;
/** Price-table file mtime cache TTL (edits picked up quickly, not per request). */
const PRICE_STAT_TTL_MS = 2_000;
/** OpenRouter catalog fetch timeout. */
const OPENROUTER_TIMEOUT_MS = 15_000;
/** Price table schema version. */
const PRICE_VERSION = 1;

//#region pricing
/** DeepSeek off-peak window: UTC 16:30–00:30 (Beijing 00:30–08:30). */
const DEEPSEEK_OFF_PEAK = Object.freeze({ multiplier: 0.5, startUtc: 16.5, endUtc: 24.5 });
/** Neutral placeholder for models without any known rate (client marks it 估算). */
const UNKNOWN_PRICE = Object.freeze({ input: 1, output: 2, cacheRead: 0.1, cacheWrite: 1, offPeak: null });

/**
 * Built-in default rates, USD per 1M tokens, keyed by model id. Values seeded
 * from the public OpenRouter catalog (2026-08); off-peak only where the
 * provider is known to discount (DeepSeek). Users can override any entry and
 * re-sync from OpenRouter.
 */
const DEFAULT_PRICES = {
	"deepseek-v4-flash": { input: 0.14, output: 0.28, cacheRead: 0.028, cacheWrite: 0.14, offPeak: DEEPSEEK_OFF_PEAK },
	"deepseek-v4-pro": { input: 1.168, output: 2.336, cacheRead: 0.09855, cacheWrite: 1.168, offPeak: DEEPSEEK_OFF_PEAK },
	"deepseek-chat": { input: 0.2574, output: 1.0287, cacheRead: 0.13, cacheWrite: 0.2574, offPeak: DEEPSEEK_OFF_PEAK },
	"deepseek-reasoner": { input: 0.55, output: 2.19, cacheRead: 0.14, cacheWrite: 0.55, offPeak: DEEPSEEK_OFF_PEAK },
	"gpt-4o": { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 3.125 },
	"gpt-4o-mini": { input: 0.15, output: 0.6, cacheRead: 0.075, cacheWrite: 0.1875 },
	"gpt-4.1": { input: 2, output: 8, cacheRead: 0.5, cacheWrite: 2.5 },
	"gpt-4.1-mini": { input: 0.4, output: 1.6, cacheRead: 0.1, cacheWrite: 0.5 },
	"claude-sonnet-4": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
	"claude-sonnet-4.5": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
	"claude-haiku-4.5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
	"claude-opus-4": { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
	"gemini-2.0-flash": { input: 0.1, output: 0.4, cacheRead: 0.025, cacheWrite: 0.1 },
	"gemini-2.5-pro": { input: 1.25, output: 10, cacheRead: 0.3125, cacheWrite: 1.25 }
};

/** Round a per-1M price to 6 decimals. */
function roundPrice(value) {
	return Math.round(value * 1e6) / 1e6;
}

/** UTC hour as a float (0..24) for an epoch-ms timestamp. */
function utcHourFloat(timeMs) {
	const d = new Date(timeMs);
	return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}

/** Whether `hour` (UTC float) falls in [startUtc, endUtc), allowing end > 24 for wrap. */
function inOffPeakWindow(hour, startUtc, endUtc) {
	if (!Number.isFinite(startUtc) || !Number.isFinite(endUtc) || endUtc <= startUtc) return false;
	let h = hour;
	if (h < startUtc && endUtc > 24) h += 24;
	return h >= startUtc && h < endUtc;
}

/** Cost components (USD) of one usage sample under a resolved price entry. */
function costComponents(price, usage, timeMs) {
	const input = usage.inputTokens ?? 0;
	const output = usage.outputTokens ?? 0;
	const cacheRead = usage.cacheReadTokens ?? 0;
	const cacheWrite = usage.cacheWriteTokens ?? 0;
	// A manual save without the off-peak toggle writes an entry with NO
	// `offPeak` key at all (undefined, not null) — treat both as "no discount".
	const offPeak = price.offPeak === void 0 ? null : price.offPeak;
	const off = offPeak !== null && inOffPeakWindow(utcHourFloat(timeMs), offPeak.startUtc, offPeak.endUtc) ? offPeak.multiplier : 1;
	return {
		input: (input * price.input * off) / 1e6,
		output: (output * price.output) / 1e6,
		cacheRead: (cacheRead * price.cacheRead) / 1e6,
		cacheWrite: (cacheWrite * price.cacheWrite * off) / 1e6
	};
}

/** Total USD cost of one usage sample. */
function costForSample(price, usage, timeMs) {
	const c = costComponents(price, usage, timeMs);
	return c.input + c.output + c.cacheRead + c.cacheWrite;
}

/** Normalize one price entry from user input; throws on invalid values. */
function normalizeEntry(raw, previous) {
	if (typeof raw !== "object" || raw === null) throw new Error("price entry must be an object");
	const num = (key) => {
		const v = Number(raw[key]);
		if (!Number.isFinite(v) || v < 0) throw new Error(`price field "${key}" must be a non-negative number`);
		return v;
	};
	const entry = {
		input: roundPrice(num("input")),
		output: roundPrice(num("output")),
		cacheRead: roundPrice(num("cacheRead")),
		cacheWrite: roundPrice(num("cacheWrite"))
	};
	if (raw.offPeak !== void 0 && raw.offPeak !== null) {
		const off = raw.offPeak;
		const multiplier = Number(off.multiplier);
		const startUtc = Number(off.startUtc);
		const endUtc = Number(off.endUtc);
		if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 1) throw new Error("off-peak multiplier must be in (0, 1]");
		if (!Number.isFinite(startUtc) || startUtc < 0 || startUtc > 24) throw new Error("off-peak startUtc must be 0..24");
		if (!Number.isFinite(endUtc) || endUtc <= startUtc || endUtc > 48) throw new Error("off-peak endUtc must be in (startUtc, 48]");
		entry.offPeak = { multiplier, startUtc, endUtc };
	}
	entry.source = typeof raw.source === "string" && raw.source !== "" ? raw.source : "manual";
	entry.updatedAt = Date.now();
	if (previous !== void 0 && previous.source === "openrouter" && raw.source === void 0) entry.source = "manual";
	return entry;
}

/**
 * Price table store: built-in defaults merged with the editable JSON file.
 * The file is re-read when its mtime changes (checked with a short TTL).
 */
class PriceTable {
	constructor(ctx) {
		this.ctx = ctx;
		this.path = dshHomePath("storages", "token-stats-prices.json");
		this.merged = null;
		this.lastStat = 0;
		this.lastMtime = -1;
	}
	/** Read the raw saved entries (defaults not included). */
	async readSaved() {
		try {
			const text = await readFile(this.path, "utf8");
			const parsed = JSON.parse(text);
			return parsed !== null && typeof parsed === "object" && typeof parsed.models === "object" && parsed.models !== null ? parsed.models : {};
		} catch (error) {
			if (error?.code !== "ENOENT") this.ctx.logger.warn(`token-stats: price table read failed: ${String(error)}`);
			return {};
		}
	}
	/** Merge defaults + saved entries; mtime-cached. */
	async load() {
		const now = Date.now();
		let mtime = -1;
		try {
			const st = await stat(this.path);
			mtime = st.mtimeMs;
		} catch {
			/* missing file -> defaults only */
		}
		if (this.merged === null || now - this.lastStat > PRICE_STAT_TTL_MS || mtime !== this.lastMtime) {
			const saved = await this.readSaved();
			this.merged = {};
			for (const [key, entry] of Object.entries(DEFAULT_PRICES)) this.merged[key] = { ...entry, source: "default" };
			for (const [key, entry] of Object.entries(saved)) this.merged[key] = { ...entry };
			this.lastStat = now;
			this.lastMtime = mtime;
		}
		return this.merged;
	}
	/** Persist a normalized full/partial entry set (merged over defaults on read). */
	async save(models) {
		const saved = await this.readSaved();
		for (const [key, entry] of Object.entries(models)) {
			const previous = saved[key];
			if (entry === null) {
				delete saved[key];
				continue;
			}
			saved[key] = normalizeEntry(entry, previous);
		}
		const payload = JSON.stringify({ version: PRICE_VERSION, updatedAt: Date.now(), models: saved }, null, 2);
		await mkdir(this.path.slice(0, this.path.lastIndexOf("/")), { recursive: true });
		const tmp = `${this.path}.tmp`;
		await writeFile(tmp, payload, "utf8");
		await rename(tmp, this.path);
		this.merged = null;
		this.lastMtime = -1;
		return saved;
	}
	/** Resolve the effective entry for a `provider/model` key (exact, then model part, then defaults). */
	async resolve(modelName) {
		const table = await this.load();
		const direct = table[modelName];
		if (direct !== void 0) return direct;
		const slash = modelName.lastIndexOf("/");
		const modelPart = slash > 0 ? modelName.slice(slash + 1) : modelName;
		const byModel = table[modelPart];
		if (byModel !== void 0) return byModel;
		return UNKNOWN_PRICE;
	}
}
//#endregion

/** Split a buffer holding one or more concatenated zstd frames. */
function splitZstdFrames(buffer) {
	const frames = [];
	let idx = 0;
	while (idx < buffer.length) {
		const start = buffer.indexOf(ZSTD_MAGIC, idx);
		if (start === -1) break;
		const next = buffer.indexOf(ZSTD_MAGIC, start + 4);
		const end = next === -1 ? buffer.length : next;
		frames.push(buffer.subarray(start, end));
		idx = start + 4;
	}
	return frames;
}

/** Local calendar-day key for an epoch-ms timestamp, e.g. `2026-08-14`. */
function localDayKey(timeMs) {
	const d = new Date(timeMs);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

/** Zeroed usage bucket (tokens + estimated USD cost components). */
function zeroBucket() {
	return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 0, cost: 0, costInput: 0, costOutput: 0, costCacheRead: 0, costCacheWrite: 0 };
}

/** Add a provider usage report onto a bucket (total excludes reasoning to avoid double counting). */
function addUsage(bucket, usage) {
	const input = usage.inputTokens ?? 0;
	const output = usage.outputTokens ?? 0;
	const cacheRead = usage.cacheReadTokens ?? 0;
	const cacheWrite = usage.cacheWriteTokens ?? 0;
	bucket.input += input;
	bucket.output += output;
	bucket.cacheRead += cacheRead;
	bucket.cacheWrite += cacheWrite;
	bucket.reasoning += usage.reasoningTokens ?? 0;
	bucket.total += input + output + cacheRead + cacheWrite;
}

/** Get-or-create the bucket for (model, day) in a nested table. */
function ensureBucket(table, model, day) {
	let byDay = table[model];
	if (byDay === void 0) byDay = table[model] = {};
	let bucket = byDay[day];
	if (bucket === void 0) bucket = byDay[day] = zeroBucket();
	return bucket;
}

/** Recursively collect session log files under a root directory. */
async function listSessionLogs(root, out = []) {
	let entries;
	try {
		entries = await readdir(root, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		if (entry.isDirectory()) {
			await listSessionLogs(join(root, entry.name), out);
		} else if (entry.isFile() && (entry.name === "session.jsonl.zstd" || entry.name === "session.jsonl")) {
			out.push(join(root, entry.name));
		}
	}
	return out;
}

/** Decode a log file's bytes into its text. */
function decodeLogText(path, buffer) {
	if (!path.endsWith(".zstd")) return buffer.toString("utf8");
	const parts = [];
	for (const frame of splitZstdFrames(buffer)) {
		try {
			parts.push(zstdDecompressSync(frame).toString("utf8"));
		} catch {
			/* torn frame (mid-write) — skip; the next rescan sees the rest */
		}
	}
	return parts.join("");
}

/**
 * Scan one session log into the shared tables.
 * @param path - absolute log path.
 * @param byModel - nested {model: {day: bucket}}.
 * @param all - {day: bucket} across every model.
 * @param resolvePrice - async (modelName) => resolved price entry.
 */
async function scanSessionFile(path, byModel, all, resolvePrice) {
	let buffer;
	try {
		buffer = await readFile(path);
	} catch {
		return;
	}
	const text = decodeLogText(path, buffer);
	let model = null;
	let provider = null;
	/** Last usage sample per turn/step (replacement support). */
	let lastKey = null;
	let last = null;
	for (const line of text.split("\n")) {
		if (line.trim() === "") continue;
		let value;
		try {
			value = JSON.parse(line);
		} catch {
			continue;
		}
		let events;
		try {
			events = decodeStorageRecord(value);
		} catch {
			continue;
		}
		for (const event of events) {
			if (event.type === "request/header") {
				const config = event.data?.header?.config;
				if (config !== void 0) {
					if (typeof config.model === "string") model = config.model;
					if (typeof config.provider === "string" && config.provider !== "") provider = config.provider;
				}
				continue;
			}
			let usage;
			let turn;
			let step;
			if (event.type === "assistant/chunk" && event.data?.chunk?.type === "usage") {
				({ turn, step } = event.data);
				usage = event.data.chunk.usage;
			} else if (event.type === "assistant/message" && event.data?.usage !== void 0) {
				({ turn, step } = event.data);
				usage = event.data.usage;
			}
			if (usage === void 0 || turn === void 0 || step === void 0) continue;
			const key = `${turn}:${step}`;
			const day = localDayKey(event.time);
			const modelName = provider !== null ? `${provider}/${model ?? "unknown"}` : (model ?? "unknown");
			const price = await resolvePrice(modelName);
			const cost = costComponents(price, usage, event.time);
			if (lastKey === key && last !== null) {
				// A later sample replaces the earlier one for this turn/step.
				const bucket = ensureBucket(byModel, last.model, last.day);
				bucket.input -= last.added.input;
				bucket.output -= last.added.output;
				bucket.cacheRead -= last.added.cacheRead;
				bucket.cacheWrite -= last.added.cacheWrite;
				bucket.reasoning -= last.added.reasoning;
				bucket.total -= last.added.total;
				bucket.cost -= last.added.cost;
				bucket.costInput -= last.added.costInput;
				bucket.costOutput -= last.added.costOutput;
				bucket.costCacheRead -= last.added.costCacheRead;
				bucket.costCacheWrite -= last.added.costCacheWrite;
				const allBucket = ensureBucket(all, "__all__", last.day);
				allBucket.input -= last.added.input;
				allBucket.output -= last.added.output;
				allBucket.cacheRead -= last.added.cacheRead;
				allBucket.cacheWrite -= last.added.cacheWrite;
				allBucket.reasoning -= last.added.reasoning;
				allBucket.total -= last.added.total;
				allBucket.cost -= last.added.cost;
				allBucket.costInput -= last.added.costInput;
				allBucket.costOutput -= last.added.costOutput;
				allBucket.costCacheRead -= last.added.costCacheRead;
				allBucket.costCacheWrite -= last.added.costCacheWrite;
			}
			const bucket = ensureBucket(byModel, modelName, day);
			const allBucket = ensureBucket(all, "__all__", day);
			const before = { ...bucket };
			addUsage(bucket, usage);
			addUsage(allBucket, usage);
			bucket.cost += cost.input + cost.output + cost.cacheRead + cost.cacheWrite;
			bucket.costInput += cost.input;
			bucket.costOutput += cost.output;
			bucket.costCacheRead += cost.cacheRead;
			bucket.costCacheWrite += cost.cacheWrite;
			allBucket.cost += cost.input + cost.output + cost.cacheRead + cost.cacheWrite;
			allBucket.costInput += cost.input;
			allBucket.costOutput += cost.output;
			allBucket.costCacheRead += cost.cacheRead;
			allBucket.costCacheWrite += cost.cacheWrite;
			lastKey = key;
			last = {
				model: modelName,
				day,
				added: {
					input: bucket.input - before.input,
					output: bucket.output - before.output,
					cacheRead: bucket.cacheRead - before.cacheRead,
					cacheWrite: bucket.cacheWrite - before.cacheWrite,
					reasoning: bucket.reasoning - before.reasoning,
					total: bucket.total - before.total,
					cost: bucket.cost - before.cost,
					costInput: bucket.costInput - before.costInput,
					costOutput: bucket.costOutput - before.costOutput,
					costCacheRead: bucket.costCacheRead - before.costCacheRead,
					costCacheWrite: bucket.costCacheWrite - before.costCacheWrite
				}
			};
		}
	}
}

/** Read a JSON request body (cap the size). */
async function readJsonBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.length;
		if (size > 1_000_000) throw new Error("request body too large");
		chunks.push(chunk);
	}
	const text = Buffer.concat(chunks).toString("utf8");
	return text === "" ? {} : JSON.parse(text);
}

/** Send a JSON response with the shared headers. */
function sendJson(res, status, payload) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(JSON.stringify(payload));
}

/** Plugin body: aggregate on demand, price the samples, and serve the routes. */
function apply(ctx, config) {
	const sessionsRoot = dshHomePath("sessions");
	const prices = new PriceTable(ctx);
	let cache = null; // { at, payload }

	const compute = async () => {
		const table = await prices.load();
		const byModel = {};
		const all = {};
		const files = await listSessionLogs(sessionsRoot);
		const resolvePrice = async (modelName) => table[modelName] ?? await prices.resolve(modelName);
		for (const file of files) {
			try {
				await scanSessionFile(file, byModel, all, resolvePrice);
			} catch (error) {
				ctx.logger.warn(`token-stats: failed to scan ${file}: ${String(error)}`);
			}
		}
		// Resolved price snapshot for the models that actually appear.
		const resolved = {};
		for (const modelName of Object.keys(byModel)) {
			const entry = table[modelName] ?? await prices.resolve(modelName);
			resolved[modelName] = entry.source === "default" && UNKNOWN_PRICE === entry ? { ...entry, source: "estimated" } : entry;
		}
		return {
			generatedAt: Date.now(),
			tzOffsetMinutes: new Date().getTimezoneOffset(),
			models: Object.keys(byModel).sort(),
			byModel,
			all: all.__all__ ?? {},
			prices: resolved
		};
	};

	const readStats = async () => {
		const now = Date.now();
		if (cache !== null && now - cache.at < CACHE_TTL_MS) return cache.payload;
		const payload = await compute();
		cache = { at: now, payload };
		return payload;
	};

	// Live usage events invalidate the cache so the current day stays fresh.
	ctx.on("session/event", (_session, event) => {
		if (event.type === "request/header") {
			cache = null;
			return;
		}
		if (event.type === "assistant/message" && event.data?.usage !== void 0) cache = null;
	});

	const statsHandler = async (req, res) => {
		if (req.method !== "GET" && req.method !== "HEAD") {
			res.writeHead(405);
			res.end();
			return;
		}
		try {
			const payload = await readStats();
			const body = JSON.stringify(payload);
			res.writeHead(200, {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			});
			res.end(req.method === "HEAD" ? void 0 : body);
		} catch (error) {
			ctx.logger.warn(`token-stats: request failed: ${String(error)}`);
			if (res.headersSent) {
				res.destroy();
				return;
			}
			sendJson(res, 500, { error: String(error instanceof Error ? error.message : error) });
		}
	};

	const pricesHandler = async (req, res) => {
		try {
			if (req.method === "GET" || req.method === "HEAD") {
				const table = await prices.load();
				sendJson(res, 200, { version: PRICE_VERSION, updatedAt: Date.now(), models: table });
				return;
			}
			if (req.method === "POST") {
				const body = await readJsonBody(req);
				if (body === null || typeof body !== "object" || typeof body.models !== "object" || body.models === null) {
					sendJson(res, 400, { error: "expected { models: { key: entry | null } }" });
					return;
				}
				const entries = Object.keys(body.models);
				if (entries.length > 500) {
					sendJson(res, 400, { error: "too many price entries" });
					return;
				}
				const saved = await prices.save(body.models);
				cache = null;
				sendJson(res, 200, { ok: true, version: PRICE_VERSION, updatedAt: Date.now(), models: saved });
				return;
			}
			res.writeHead(405);
			res.end();
		} catch (error) {
			sendJson(res, 400, { error: String(error instanceof Error ? error.message : error) });
		}
	};

	const syncHandler = async (req, res) => {
		if (req.method !== "POST") {
			res.writeHead(405);
			res.end();
			return;
		}
		try {
			const body = await readJsonBody(req);
			// Wanted model ids: the request's list, else whatever appears in the logs.
			let wanted = Array.isArray(body?.models) ? body.models.filter((m) => typeof m === "string") : null;
			if (wanted === null || wanted.length === 0) {
				const payload = await readStats();
				wanted = [...new Set(payload.models.map((key) => key.slice(key.lastIndexOf("/") + 1)))];
			}
			const wantedSet = new Set(wanted);
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
			let catalog;
			try {
				const response = await fetch("https://openrouter.ai/api/v1/models", { signal: controller.signal });
				if (!response.ok) throw new Error(`openrouter: HTTP ${response.status}`);
				catalog = await response.json();
			} finally {
				clearTimeout(timer);
			}
			if (!Array.isArray(catalog?.data)) throw new Error("openrouter: unexpected catalog shape");
			const table = await prices.load();
			const updates = {};
			let updated = 0;
			for (const item of catalog.data) {
				const modelId = item?.id?.slice(item.id.lastIndexOf("/") + 1);
				if (modelId === void 0 || modelId === "") continue;
				if (!wantedSet.has(modelId) && table[modelId] === void 0) continue;
				const p = item.pricing ?? {};
				const input = Number(p.prompt) * 1e6;
				const output = Number(p.completion) * 1e6;
				if (!Number.isFinite(input) || !Number.isFinite(output) || input <= 0) continue;
				const cacheRead = Number.isFinite(Number(p.input_cache_read)) ? Number(p.input_cache_read) * 1e6 : roundPrice(input * 0.1);
				const writeDefault = modelId.startsWith("gpt") || modelId.startsWith("claude") ? roundPrice(input * 1.25) : input;
				const cacheWrite = Number.isFinite(Number(p.input_cache_write)) ? Number(p.input_cache_write) * 1e6 : writeDefault;
				const previous = table[modelId];
				const entry = {
					input: roundPrice(input),
					output: roundPrice(output),
					cacheRead: roundPrice(cacheRead),
					cacheWrite: roundPrice(cacheWrite),
					...(previous?.offPeak !== void 0 ? { offPeak: previous.offPeak } : modelId.startsWith("deepseek") ? { offPeak: DEEPSEEK_OFF_PEAK } : {}),
					source: "openrouter",
					updatedAt: Date.now()
				};
				updates[modelId] = entry;
				updated += 1;
			}
			const saved = await prices.save(updates);
			cache = null;
			sendJson(res, 200, { ok: true, updated, models: saved });
		} catch (error) {
			sendJson(res, 500, { error: String(error instanceof Error ? error.message : error) });
		}
	};

	ctx.effect(() => ctx.webServer.register({ kind: "exact", path: "/token-stats", handler: statsHandler }), "token-stats: route");
	ctx.effect(() => ctx.webServer.register({ kind: "exact", path: "/token-stats/prices", handler: pricesHandler }), "token-stats: prices route");
	ctx.effect(() => ctx.webServer.register({ kind: "exact", path: "/token-stats/prices/sync", handler: syncHandler }), "token-stats: prices sync route");
}

export { apply, inject, name };
