/**
 * Unit tests for @deepseek-ai/dsh-token-stats host half (lib/index.js).
 *
 * Covers the pure helpers, the price table store, session-log scanning
 * (incl. same-turn/step de-duplication and attribution), the HTTP routes
 * (shape, status codes, validation), sync against a stubbed OpenRouter
 * catalog, the response cache, and the off-peak-missing regression that
 * previously wiped every bucket after a manual price save.
 *
 * Run: node --test test/
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { zstdCompressSync, zstdDecompressSync } from "node:zlib";
import { internals, apply as applyTokenStats } from "../lib/index.js";

const {
	DEEPSEEK_OFF_PEAK,
	UNKNOWN_PRICE,
	DEFAULT_PRICES,
	roundPrice,
	utcHourFloat,
	inOffPeakWindow,
	costComponents,
	costForSample,
	normalizeEntry,
	PriceTable,
	splitZstdFrames,
	decodeLogText,
	localDayKey,
	zeroBucket,
	addUsage,
	ensureBucket,
	listSessionLogs,
	scanSessionFile,
	readJsonBody,
	sendJson,
} = internals;

const SMOKE_HOME = join(tmpdir(), "dsh-token-stats-unit");
rmSync(SMOKE_HOME, { recursive: true, force: true });
process.env.DSH_HOME = join(SMOKE_HOME, ".dsh");
mkdirSync(process.env.DSH_HOME, { recursive: true });

// ── fixtures ─────────────────────────────────────────────────────────────────
const mkLine = (ev) => JSON.stringify(ev);
const header = (time, model, provider = "deepseek-official") =>
	mkLine({ type: "request/header", seq: 0, time, data: { header: { config: { provider, model } } } });
const msgUsage = (seq, time, turn, step, usage) =>
	mkLine({ type: "assistant/message", seq, time, data: { turn, step, usage } });
const chunkUsage = (seq, time, turn, step, usage) =>
	mkLine({ type: "assistant/chunk", seq, time, data: { turn, step, chunk: { type: "usage", usage } } });
const mkZstd = (lines) => zstdCompressSync(Buffer.from(lines.join("\n") + "\n", "utf8"));

const tPeak = Date.UTC(2026, 7, 14, 12, 0, 0); // DeepSeek peak (UTC 12:00)
const tOff = Date.UTC(2026, 7, 14, 22, 0, 0); // DeepSeek off-peak (UTC 22:00)

/** A session log file on disk; returns its absolute path. */
function writeLog(root, name, lines) {
	const dir = join(root, "sessions", name);
	mkdirSync(dir, { recursive: true });
	const path = join(dir, "session.jsonl.zstd");
	writeFileSync(path, mkZstd(lines));
	return path;
}

const resolveStub = async (modelName) =>
	internals.DEFAULT_PRICES[modelName.split("/").pop()] ?? UNKNOWN_PRICE;

// ── pricing helpers ──────────────────────────────────────────────────────────
describe("roundPrice", () => {
	test("rounds to 6 decimals", () => {
		assert.equal(roundPrice(0.123456789), 0.123457);
		assert.equal(roundPrice(0.140000001), 0.14);
		assert.equal(roundPrice(2.336), 2.336);
	});
	test("keeps integers and zero", () => {
		assert.equal(roundPrice(0), 0);
		assert.equal(roundPrice(15), 15);
	});
});

describe("utcHourFloat", () => {
	test("pure UTC math", () => {
		assert.equal(utcHourFloat(Date.UTC(2026, 0, 1, 12, 0, 0)), 12);
		assert.equal(utcHourFloat(Date.UTC(2026, 0, 1, 16, 30, 0)), 16.5);
		assert.equal(utcHourFloat(Date.UTC(2026, 0, 1, 0, 0, 0)), 0);
		const h = utcHourFloat(Date.UTC(2026, 0, 1, 23, 59, 59));
		assert.ok(Math.abs(h - 23.9997222) < 1e-6);
	});
});

describe("inOffPeakWindow", () => {
	test("guards non-finite or inverted windows", () => {
		assert.equal(inOffPeakWindow(12, NaN, 24), false);
		assert.equal(inOffPeakWindow(12, 16, NaN), false);
		assert.equal(inOffPeakWindow(12, 24, 16), false);
		assert.equal(inOffPeakWindow(12, 16, 16), false);
	});
	test("simple window containment", () => {
		assert.equal(inOffPeakWindow(15, 14, 16), true);
		assert.equal(inOffPeakWindow(16, 14, 16), false); // end-exclusive
		assert.equal(inOffPeakWindow(13, 14, 16), false);
	});
	test("midnight wrap (DeepSeek 16:30–00:30)", () => {
		assert.equal(inOffPeakWindow(12, 16.5, 24.5), false);
		assert.equal(inOffPeakWindow(23, 16.5, 24.5), true);
		assert.equal(inOffPeakWindow(0, 16.5, 24.5), true);
		assert.equal(inOffPeakWindow(0.5, 16.5, 24.5), false); // 00:30 boundary
	});
	test("deep wrap (e.g. 22:00–02:00)", () => {
		assert.equal(inOffPeakWindow(23, 22, 26), true);
		assert.equal(inOffPeakWindow(1, 22, 26), true);
		assert.equal(inOffPeakWindow(3, 22, 26), false);
	});
});

describe("costComponents", () => {
	const price = { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 1, offPeak: { multiplier: 0.5, startUtc: 16.5, endUtc: 24.5 } };
	const usage = { inputTokens: 1_000_000, outputTokens: 500_000, cacheReadTokens: 100_000, cacheWriteTokens: 50_000 };
	test("peak hour: no discount", () => {
		const c = costComponents(price, usage, tPeak);
		assert.equal(c.input, 1);
		assert.equal(c.output, 1);
		assert.equal(c.cacheRead, 0.01);
		assert.equal(c.cacheWrite, 0.05);
	});
	test("off-peak hour: input and cacheWrite discounted only", () => {
		const c = costComponents(price, usage, tOff);
		assert.equal(c.input, 0.5);
		assert.equal(c.output, 1); // output never discounted
		assert.equal(c.cacheRead, 0.01); // cache read never discounted
		assert.equal(c.cacheWrite, 0.025);
	});
	test("missing offPeak key (manual save without the toggle) -> no discount, no crash", () => {
		const { offPeak, ...noOff } = price;
		assert.equal(offPeak !== void 0, true);
		const c = costComponents(noOff, usage, tOff);
		assert.equal(c.input, 1);
		assert.equal(c.cacheWrite, 0.05);
	});
	test("offPeak null (UNKNOWN_PRICE) -> no discount", () => {
		const c = costComponents({ ...price, offPeak: null }, usage, tOff);
		assert.equal(c.input, 1);
	});
	test("zero usage -> zero cost", () => {
		const c = costComponents(price, { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, tPeak);
		assert.deepEqual(c, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
	});
	test("missing usage fields default to 0", () => {
		const c = costComponents(price, {}, tPeak);
		assert.deepEqual(c, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
	});
});

describe("costForSample", () => {
	test("sums the components", () => {
		const price = { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 1, offPeak: null };
		const c = costForSample(price, { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 1_000_000 }, tPeak);
		assert.equal(c, 4.1);
	});
});

// ── price entry normalization ─────────────────────────────────────────────────
describe("normalizeEntry", () => {
	const base = { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 1 };
	test("valid entry passes through, source defaults to manual", () => {
		const e = normalizeEntry(base, undefined);
		assert.deepEqual({ input: e.input, output: e.output, cacheRead: e.cacheRead, cacheWrite: e.cacheWrite }, base);
		assert.equal(e.source, "manual");
		assert.ok(Number.isFinite(e.updatedAt));
	});
	test("no offPeak key when not provided (the regression shape)", () => {
		const e = normalizeEntry(base, undefined);
		assert.equal("offPeak" in e, false);
	});
	test("explicit offPeak null also omits the key", () => {
		const e = normalizeEntry({ ...base, offPeak: null }, undefined);
		assert.equal("offPeak" in e, false);
	});
	test("valid offPeak kept with numbers", () => {
		const e = normalizeEntry({ ...base, offPeak: { multiplier: 0.5, startUtc: 16.5, endUtc: 24.5 } }, undefined);
		assert.deepEqual(e.offPeak, { multiplier: 0.5, startUtc: 16.5, endUtc: 24.5 });
	});
	test("source kept when provided", () => {
		assert.equal(normalizeEntry({ ...base, source: "openrouter" }, undefined).source, "openrouter");
		assert.equal(normalizeEntry({ ...base, source: "" }, undefined).source, "manual");
	});
	test("openrouter previous + no source -> manual", () => {
		const prev = { ...base, source: "openrouter" };
		assert.equal(normalizeEntry(base, prev).source, "manual");
	});
	test("rounds to 6 decimals", () => {
		const e = normalizeEntry({ ...base, input: 0.123456789 }, undefined);
		assert.equal(e.input, 0.123457);
	});
	test("accepts numeric strings", () => {
		const e = normalizeEntry({ input: "1.5", output: "2", cacheRead: "0.1", cacheWrite: "1" }, undefined);
		assert.equal(e.input, 1.5);
	});
	test("rejects empty strings (would otherwise silently become 0)", () => {
		assert.throws(() => normalizeEntry({ ...base, input: "" }, undefined), /non-negative number/);
	});
	test("rejects negative / NaN / Infinity", () => {
		assert.throws(() => normalizeEntry({ ...base, input: -1 }, undefined), /non-negative number/);
		assert.throws(() => normalizeEntry({ ...base, input: "abc" }, undefined), /non-negative number/);
		assert.throws(() => normalizeEntry({ ...base, input: Number.NaN }, undefined), /non-negative number/);
		assert.throws(() => normalizeEntry({ ...base, input: Number.POSITIVE_INFINITY }, undefined), /non-negative number/);
	});
	test("rejects non-numeric field types", () => {
		assert.throws(() => normalizeEntry({ ...base, input: true }, undefined), /must be a number/);
		assert.throws(() => normalizeEntry({ ...base, input: null }, undefined), /must be a number/);
		assert.throws(() => normalizeEntry({ ...base, input: {} }, undefined), /must be a number/);
		assert.throws(() => normalizeEntry(null, undefined), /price entry must be an object/);
	});
	test("rejects invalid off-peak windows", () => {
		assert.throws(() => normalizeEntry({ ...base, offPeak: { multiplier: 0, startUtc: 16, endUtc: 24 } }, undefined), /multiplier/);
		assert.throws(() => normalizeEntry({ ...base, offPeak: { multiplier: 1.5, startUtc: 16, endUtc: 24 } }, undefined), /multiplier/);
		assert.throws(() => normalizeEntry({ ...base, offPeak: { multiplier: 0.5, startUtc: -1, endUtc: 24 } }, undefined), /startUtc/);
		assert.throws(() => normalizeEntry({ ...base, offPeak: { multiplier: 0.5, startUtc: 25, endUtc: 26 } }, undefined), /startUtc/);
		assert.throws(() => normalizeEntry({ ...base, offPeak: { multiplier: 0.5, startUtc: 16, endUtc: 16 } }, undefined), /endUtc/);
		assert.throws(() => normalizeEntry({ ...base, offPeak: { multiplier: 0.5, startUtc: 16, endUtc: 49 } }, undefined), /endUtc/);
		assert.throws(() => normalizeEntry({ ...base, offPeak: { multiplier: 0.5, startUtc: 16 } }, undefined), /endUtc|multiplier|startUtc/);
	});
});

// ── zstd frame handling ───────────────────────────────────────────────────────
describe("splitZstdFrames", () => {
	test("empty and magic-less buffers", () => {
		assert.deepEqual(splitZstdFrames(Buffer.alloc(0)), []);
		assert.deepEqual(splitZstdFrames(Buffer.from("no magic here")), []);
	});
	test("splits concatenated frames", () => {
		const a = zstdCompressSync(Buffer.from("hello"));
		const b = zstdCompressSync(Buffer.from("world"));
		const frames = splitZstdFrames(Buffer.concat([a, b]));
		assert.equal(frames.length, 2);
		assert.deepEqual(frames.map((f) => zstdDecompressSync(f).toString()), ["hello", "world"]);
	});
});

describe("decodeLogText", () => {
	test("plain jsonl passes through", () => {
		assert.equal(decodeLogText("session.jsonl", Buffer.from("a\nb\n")), "a\nb\n");
	});
	test("single zstd frame", () => {
		const out = decodeLogText("x.zstd", mkZstd(["a", "b"]));
		assert.equal(out, "a\nb\n");
	});
	test("concatenated frames joined", () => {
		const buf = Buffer.concat([mkZstd(["a"]), mkZstd(["b"])]);
		assert.equal(decodeLogText("x.zstd", buf), "a\nb\n");
	});
	test("torn trailing frame skipped, leading content kept", () => {
		const buf = Buffer.concat([mkZstd(["a"]), Buffer.from("garbage-that-is-not-a-frame")]);
		assert.equal(decodeLogText("x.zstd", buf), "a\n");
	});
});

// ── day keys & buckets ────────────────────────────────────────────────────────
describe("localDayKey", () => {
	test("formats as YYYY-MM-DD in the local calendar", () => {
		const k = localDayKey(Date.UTC(2026, 7, 14, 12, 0, 0));
		assert.match(k, /^\d{4}-\d{2}-\d{2}$/);
		const d = new Date(Date.UTC(2026, 7, 14, 12, 0, 0));
		const p = (n) => String(n).padStart(2, "0");
		assert.equal(k, `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
	});
	test("same local day, different hours -> same key", () => {
		const a = new Date(2026, 7, 14, 1, 0, 0);
		const b = new Date(2026, 7, 14, 23, 0, 0);
		assert.equal(localDayKey(a.getTime()), localDayKey(b.getTime()));
	});
});

describe("zeroBucket / addUsage / ensureBucket", () => {
	test("zero bucket has all counters", () => {
		const z = zeroBucket();
		assert.deepEqual(z, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0, total: 0, cost: 0, costInput: 0, costOutput: 0, costCacheRead: 0, costCacheWrite: 0 });
	});
	test("addUsage sums tokens; total excludes reasoning", () => {
		const b = zeroBucket();
		addUsage(b, { inputTokens: 100, outputTokens: 50, cacheReadTokens: 10, cacheWriteTokens: 5, reasoningTokens: 40 });
		assert.equal(b.input, 100);
		assert.equal(b.output, 50);
		assert.equal(b.cacheRead, 10);
		assert.equal(b.cacheWrite, 5);
		assert.equal(b.reasoning, 40);
		assert.equal(b.total, 165);
	});
	test("ensureBucket get-or-creates nested", () => {
		const t = {};
		const b1 = ensureBucket(t, "m", "2026-08-14");
		const b2 = ensureBucket(t, "m", "2026-08-14");
		const b3 = ensureBucket(t, "n", "2026-08-14");
		assert.equal(b1, b2);
		assert.notEqual(b1, b3);
		assert.equal(t.m["2026-08-14"], b1);
	});
});

// ── session log discovery ─────────────────────────────────────────────────────
describe("listSessionLogs", () => {
	test("recursively finds only session.jsonl* files", async () => {
		const root = join(SMOKE_HOME, "list");
		mkdirSync(join(root, "a", "deep", "nested"), { recursive: true });
		mkdirSync(join(root, "b"), { recursive: true });
		writeFileSync(join(root, "a", "deep", "nested", "session.jsonl.zstd"), "x");
		writeFileSync(join(root, "a", "deep", "nested", "session.jsonl"), "x");
		writeFileSync(join(root, "b", "session.jsonl.zstd"), "x");
		writeFileSync(join(root, "b", "other.txt"), "x");
		writeFileSync(join(root, "a", "session.jsonl.zstd.tmp"), "x");
		const files = await listSessionLogs(root);
		assert.equal(files.length, 3);
		assert.ok(files.every((f) => f.endsWith("session.jsonl") || f.endsWith("session.jsonl.zstd")));
	});
	test("missing root -> empty", async () => {
		assert.deepEqual(await listSessionLogs(join(SMOKE_HOME, "does-not-exist")), []);
	});
});

// ── session log scanning ──────────────────────────────────────────────────────
describe("scanSessionFile", () => {
	test("attributes usage to the latest request/header and buckets by local day", async () => {
		const root = join(SMOKE_HOME, "scan-basic");
		const path = writeLog(root, "s1", [
			header(tPeak - 1000, "deepseek-v4-flash"),
			msgUsage(1, tPeak, 0, 0, { inputTokens: 1_000_000, outputTokens: 500_000, cacheReadTokens: 0, cacheWriteTokens: 0 }),
		]);
		const byModel = {};
		const all = {};
		await scanSessionFile(path, byModel, all, resolveStub);
		const day = localDayKey(tPeak);
		const bucket = byModel["deepseek-official/deepseek-v4-flash"]?.[day];
		assert.ok(bucket, "bucket exists");
		assert.equal(bucket.input, 1_000_000);
		assert.equal(bucket.output, 500_000);
assert.equal(bucket.total, 1_500_000);
		assert.equal(bucket.cost, 0.28); // input 1M x 0.14 + output 0.5M x 0.28
		assert.equal(all.__all__[day].total, 1_500_000);
	});

	test("chunk usage samples are counted too", async () => {
		const root = join(SMOKE_HOME, "scan-chunk");
		const path = writeLog(root, "s1", [
			header(tPeak - 1000, "deepseek-v4-flash"),
			chunkUsage(1, tPeak, 0, 0, { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 }),
		]);
		const byModel = {};
		const all = {};
		await scanSessionFile(path, byModel, all, resolveStub);
		const day = localDayKey(tPeak);
		assert.equal(byModel["deepseek-official/deepseek-v4-flash"][day].total, 150);
	});

	test("same turn/step: later sample replaces the earlier one", async () => {
		const root = join(SMOKE_HOME, "scan-replace");
		const path = writeLog(root, "s1", [
			header(tPeak - 1000, "deepseek-v4-flash"),
			msgUsage(1, tPeak, 0, 0, { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
			msgUsage(2, tPeak + 1000, 0, 0, { inputTokens: 2_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
		]);
		const byModel = {};
		const all = {};
		await scanSessionFile(path, byModel, all, resolveStub);
		const day = localDayKey(tPeak);
		const bucket = byModel["deepseek-official/deepseek-v4-flash"][day];
		assert.equal(bucket.input, 2_000_000);
		assert.equal(bucket.total, 2_000_000);
		assert.equal(bucket.cost, 0.28); // re-priced at the second sample's rate
		assert.equal(all.__all__[day].total, 2_000_000);
	});

	test("same turn/step NON-consecutive: the later sample still replaces", async () => {
		const root = join(SMOKE_HOME, "scan-replace-nonconsec");
		const path = writeLog(root, "s1", [
			header(tPeak - 1000, "deepseek-v4-flash"),
			msgUsage(1, tPeak, 0, 0, { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
			msgUsage(2, tPeak + 1000, 0, 1, { inputTokens: 500_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
			msgUsage(3, tPeak + 2000, 0, 0, { inputTokens: 3_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
		]);
		const byModel = {};
		const all = {};
		await scanSessionFile(path, byModel, all, resolveStub);
		const day = localDayKey(tPeak);
		const bucket = byModel["deepseek-official/deepseek-v4-flash"][day];
		assert.equal(bucket.input, 3_000_000 + 500_000);
		assert.equal(bucket.total, 3_500_000);
		assert.equal(all.__all__[day].total, 3_500_000);
	});

	test("provider/model change re-attributes following samples", async () => {
		const root = join(SMOKE_HOME, "scan-reattr");
		const path = writeLog(root, "s1", [
			header(tPeak - 1000, "deepseek-v4-flash"),
			msgUsage(1, tPeak, 0, 0, { inputTokens: 100, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
			header(tPeak + 500, "gpt-4o", "openai"),
			msgUsage(2, tPeak + 1000, 0, 1, { inputTokens: 200, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
		]);
		const byModel = {};
		const all = {};
		await scanSessionFile(path, byModel, all, resolveStub);
		const day = localDayKey(tPeak);
		assert.equal(byModel["deepseek-official/deepseek-v4-flash"][day].input, 100);
		assert.equal(byModel["openai/gpt-4o"][day].input, 200);
		assert.equal(all.__all__[day].input, 300);
	});

	test("usage before any header lands on 'unknown'", async () => {
		const root = join(SMOKE_HOME, "scan-unknown");
		const path = writeLog(root, "s1", [
			msgUsage(1, tPeak, 0, 0, { inputTokens: 100, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
		]);
		const byModel = {};
		const all = {};
		await scanSessionFile(path, byModel, all, resolveStub);
		const day = localDayKey(tPeak);
		assert.equal(byModel["unknown"][day].input, 100);
		assert.equal(all.__all__[day].input, 100);
	});

	test("malformed lines and undecodable records are skipped", async () => {
		const root = join(SMOKE_HOME, "scan-badlines");
		const path = writeLog(root, "s1", [
			"this is not json",
			header(tPeak - 1000, "deepseek-v4-flash"),
			msgUsage(1, tPeak, 0, 0, { inputTokens: 100, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
		]);
		const byModel = {};
		const all = {};
		await scanSessionFile(path, byModel, all, resolveStub);
		const day = localDayKey(tPeak);
		assert.equal(byModel["deepseek-official/deepseek-v4-flash"][day].input, 100);
	});

	test("missing file is a no-op", async () => {
		const byModel = {};
		const all = {};
		await scanSessionFile(join(SMOKE_HOME, "nope", "session.jsonl.zstd"), byModel, all, resolveStub);
		assert.deepEqual(byModel, {});
	});

	test("off-peak discount applied per sample time (regression: no offPeak key)", async () => {
		const root = join(SMOKE_HOME, "scan-offpeak");
		const path = writeLog(root, "s1", [
			header(tPeak - 1000, "deepseek-v4-flash"),
			msgUsage(1, tPeak, 0, 0, { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
			msgUsage(2, tOff, 1, 0, { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
		]);
		const byModel = {};
		const all = {};
		// manual price WITHOUT offPeak — the exact shape the client saves when the toggle is off
		const priceNoOff = { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 1 };
		await scanSessionFile(path, byModel, all, async () => priceNoOff);
		// tPeak and tOff may land on the same or different local days (timezone);
		// aggregate across every day either way.
		const total = Object.values(byModel["deepseek-official/deepseek-v4-flash"]).reduce((s, b) => s + b.total, 0);
		const cost = Object.values(all.__all__).reduce((s, b) => s + b.cost, 0);
		assert.equal(total, 2_000_000);
		assert.equal(cost, 2); // both samples at full rate
	});
});

// ── price table store ─────────────────────────────────────────────────────────
describe("PriceTable", () => {
	const priceRoot = join(SMOKE_HOME, "prices");
	rmSync(priceRoot, { recursive: true, force: true });
	const warns = [];
	const mkTable = () => new PriceTable({ logger: { warn: (m) => warns.push(String(m)), info: () => {} } });
	before(() => {
		process.env.DSH_HOME = join(priceRoot, ".dsh");
		mkdirSync(join(process.env.DSH_HOME, "storages"), { recursive: true });
	});

	test("load with no file -> defaults only, source=default", async () => {
		const table = await mkTable().load();
		assert.equal(table["deepseek-v4-flash"].input, 0.14);
		assert.equal(table["deepseek-v4-flash"].source, "default");
		assert.deepEqual(table["deepseek-v4-flash"].offPeak, DEEPSEEK_OFF_PEAK);
		assert.ok(Object.keys(table).length >= Object.keys(DEFAULT_PRICES).length);
	});

	test("corrupt file -> defaults + warn, no throw", async () => {
		const dir = join(process.env.DSH_HOME, "storages");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, "token-stats-prices.json"), "{ not json !!!");
		const table = await mkTable().load();
		assert.equal(table["deepseek-v4-flash"].input, 0.14);
		assert.ok(warns.length > 0);
	});

	test("wrong top-level shape -> defaults only", async () => {
		const dir = join(process.env.DSH_HOME, "storages");
		writeFileSync(join(dir, "token-stats-prices.json"), JSON.stringify({ "deepseek-v4-flash": { input: 9 } }));
		const table = await mkTable().load();
		assert.equal(table["deepseek-v4-flash"].input, 0.14);
	});

	test("save persists and overrides defaults; null deletes", async () => {
		const t = mkTable();
		await t.save({ "deepseek-v4-flash": { input: 7, output: 8, cacheRead: 1, cacheWrite: 2 } });
		let table = await t.load();
		assert.equal(table["deepseek-v4-flash"].input, 7);
		assert.equal(table["deepseek-v4-flash"].source, "manual");
		// a fresh instance reads the file
		const fresh = await mkTable().load();
		assert.equal(fresh["deepseek-v4-flash"].input, 7);
		await t.save({ "deepseek-v4-flash": null });
		table = await t.load();
		assert.equal(table["deepseek-v4-flash"].input, 0.14); // back to default
	});

	test("saved entry without offPeak keeps no offPeak in the merged table", async () => {
		const t = mkTable();
		await t.save({ "deepseek-v4-flash": { input: 3, output: 4, cacheRead: 0.5, cacheWrite: 0.75 } });
		const table = await t.load();
		assert.equal("offPeak" in table["deepseek-v4-flash"], false);
	});

	test("invalid save input rejected and file untouched", async () => {
		const t = mkTable();
		await assert.rejects(() => t.save({ "deepseek-v4-flash": { input: -5, output: 1, cacheRead: 0, cacheWrite: 0 } }), /non-negative number/);
		const table = await t.load();
		assert.notEqual(table["deepseek-v4-flash"].input, -5);
	});

	test("resolve: exact combo key, model part, unknown identity", async () => {
		// fresh home so earlier saves in this suite can't leak in
		const prevHome = process.env.DSH_HOME;
		const resolveRoot = join(SMOKE_HOME, "prices-resolve");
		rmSync(resolveRoot, { recursive: true, force: true });
		process.env.DSH_HOME = join(resolveRoot, ".dsh");
		try {
			const t = mkTable();
			assert.equal((await t.resolve("deepseek-official/deepseek-v4-flash")).input, 0.14);
			assert.equal((await t.resolve("deepseek-v4-flash")).input, 0.14);
			assert.equal(await t.resolve("someprovider/no-such-model"), UNKNOWN_PRICE);
			assert.equal((await t.resolve("someprovider/no-such-model")).source, undefined);
		} finally {
			process.env.DSH_HOME = prevHome;
		}
	});

	test("file edits are picked up (mtime invalidation)", async () => {
		const t = mkTable();
		await t.load();
		const dir = join(process.env.DSH_HOME, "storages");
		writeFileSync(join(dir, "token-stats-prices.json"), JSON.stringify({ version: 1, updatedAt: Date.now(), models: { "deepseek-v4-flash": { input: 11, output: 12, cacheRead: 1, cacheWrite: 1, source: "manual" } } }));
		const table = await t.load();
		assert.equal(table["deepseek-v4-flash"].input, 11);
	});

	test("plain file (no .zstd) is decoded as utf8", async () => {
		const t = mkTable();
		// covered via decodeLogText; sanity here
		const dir = join(process.env.DSH_HOME, "storages");
		writeFileSync(join(dir, "token-stats-prices.json"), JSON.stringify({ version: 1, updatedAt: Date.now(), models: {} }));
		const table = await t.load();
		assert.equal(table["deepseek-v4-flash"].input, 0.14);
	});
});

// ── http helpers ──────────────────────────────────────────────────────────────
describe("readJsonBody / sendJson", () => {
	test("readJsonBody parses streamed chunks", async () => {
		const req = { [Symbol.asyncIterator]: async function* () { yield Buffer.from("{\"a\""); yield Buffer.from(":1}"); } };
		assert.deepEqual(await readJsonBody(req), { a: 1 });
	});
	test("readJsonBody rejects oversized bodies", async () => {
		const big = Buffer.alloc(2_000_000, "x");
		const req = { [Symbol.asyncIterator]: async function* () { yield big; } };
		await assert.rejects(() => readJsonBody(req), /too large/);
	});
	test("sendJson writes status, headers and JSON body", () => {
		const calls = [];
		const res = { writeHead: (s, h) => calls.push(["head", s, h]), end: (b) => calls.push(["end", b]) };
		sendJson(res, 201, { ok: true });
		assert.equal(calls[0][0], "head");
		assert.equal(calls[0][1], 201);
		assert.equal(calls[0][2]["content-type"], "application/json; charset=utf-8");
		assert.equal(calls[1][0], "end");
		assert.equal(calls[1][1], JSON.stringify({ ok: true }));
	});
});

// ── plugin routes + cache ─────────────────────────────────────────────────────
describe("plugin routes", () => {
	const bootRoot = join(SMOKE_HOME, "routes");
	rmSync(bootRoot, { recursive: true, force: true });

	const routes = {};
	const events = [];
	const ctx = {
		logger: { warn: () => {} },
		on: (name, fn) => events.push([name, fn]),
		effect: (fn) => fn(),
		webServer: { register: (r) => { routes[r.path] = r.handler; return () => {} } },
	};
	before(() => {
		process.env.DSH_HOME = join(bootRoot, ".dsh");
		writeLog(process.env.DSH_HOME, "s1", [
			header(tPeak - 1000, "deepseek-v4-flash"),
			msgUsage(1, tPeak, 0, 0, { inputTokens: 1_000_000, outputTokens: 500_000, cacheReadTokens: 0, cacheWriteTokens: 0 }),
			msgUsage(2, tOff, 1, 0, { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
		]);
		applyTokenStats(ctx, {});
	});

	const call = async (path, method = "GET", body) => {
		const res = { status: 0, headers: {}, body: "", writeHead(s, h) { this.status = s; this.headers = h || {}; }, end(b) { this.body = b || ""; }, destroy() {} };
		const req = { method, url: path };
		if (body !== undefined) req[Symbol.asyncIterator] = async function* () { yield Buffer.from(JSON.stringify(body)); };
		await routes[path](req, res);
		let json = null;
		try { json = JSON.parse(res.body); } catch {}
		return { status: res.status, headers: res.headers, body: res.body, json };
	};
	const fire = async (event) => { for (const [name, fn] of events) if (name === "session/event") await fn({}, event); };

	test("GET /token-stats shape", async () => {
		const r = await call("/token-stats");
		assert.equal(r.status, 200);
		assert.deepEqual(r.json.models, ["deepseek-official/deepseek-v4-flash"]);
		assert.ok(Number.isFinite(r.json.generatedAt));
		assert.ok(Number.isFinite(r.json.tzOffsetMinutes));
		assert.ok(r.json.all && r.json.byModel);
		assert.equal(r.json.prices["deepseek-official/deepseek-v4-flash"].input, 0.14);
		assert.equal(r.json.prices["deepseek-official/deepseek-v4-flash"].source, "default");
	});

	test("HEAD /token-stats -> 200, empty body", async () => {
		const r = await call("/token-stats", "HEAD");
		assert.equal(r.status, 200);
		assert.equal(r.body, "");
	});

	test("POST /token-stats -> 405", async () => {
		const r = await call("/token-stats", "POST", {});
		assert.equal(r.status, 405);
	});

	test("GET /token-stats/prices -> merged table", async () => {
		const r = await call("/token-stats/prices");
		assert.equal(r.status, 200);
		assert.equal(r.json.version, 1);
		assert.equal(r.json.models["deepseek-v4-flash"].input, 0.14);
	});

	test("POST prices: invalid body -> 400", async () => {
		const r = await call("/token-stats/prices", "POST", { nope: true });
		assert.equal(r.status, 400);
	});
	test("POST prices: invalid entry -> 400", async () => {
		const r = await call("/token-stats/prices", "POST", { models: { x: { input: -1, output: 1, cacheRead: 0, cacheWrite: 0 } } });
		assert.equal(r.status, 400);
	});
	test("POST prices: empty string field -> 400 (no silent zero)", async () => {
		const r = await call("/token-stats/prices", "POST", { models: { x: { input: "", output: 1, cacheRead: 0, cacheWrite: 0 } } });
		assert.equal(r.status, 400);
	});
	test("POST prices: too many entries -> 400", async () => {
		const models = {};
		for (let i = 0; i < 501; i++) models[`m${i}`] = { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 };
		const r = await call("/token-stats/prices", "POST", { models });
		assert.equal(r.status, 400);
	});

	test("manual save without offPeak: stats stay intact (the reported bug)", async () => {
		const r = await call("/token-stats/prices", "POST", {
			models: { "deepseek-v4-flash": { input: 0.14, output: 0.28, cacheRead: 0.028, cacheWrite: 0.14 } },
		});
		assert.equal(r.status, 200);
		const stats = await call("/token-stats");
		const totals = Object.values(stats.json.all).reduce((s, b) => s + b.total, 0);
		const costs = Object.values(stats.json.all).reduce((s, b) => s + b.cost, 0);
		assert.ok(totals > 0, "tokens still aggregated");
		// both samples at full rate now: peak input 0.14 + output 0.14 + off input 0.14
		assert.ok(Math.abs(costs - 0.42) < 1e-9, `cost ${costs}`);
		assert.ok(stats.json.prices["deepseek-official/deepseek-v4-flash"].source === "manual");
	});

	test("response cache: hit within TTL, invalidated by live events", async () => {
		const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
		const g1 = await call("/token-stats");
		await sleep(5);
		const g2 = await call("/token-stats");
		assert.equal(g1.json.generatedAt, g2.json.generatedAt); // cached
		await fire({ type: "request/header", data: { header: { config: { provider: "p", model: "m" } } } });
		await sleep(5);
		const g3 = await call("/token-stats");
		assert.notEqual(g1.json.generatedAt, g3.json.generatedAt); // recomputed
		await fire({ type: "assistant/message", data: { turn: 1, step: 2, usage: { inputTokens: 1 } } });
		await sleep(5);
		const g4 = await call("/token-stats");
		assert.notEqual(g3.json.generatedAt, g4.json.generatedAt);
		await fire({ type: "assistant/message", data: { turn: 1, step: 2 } }); // no usage -> no invalidation
		await sleep(5);
		const g5 = await call("/token-stats");
		assert.equal(g4.json.generatedAt, g5.json.generatedAt);
	});

	test("sync: wanted from body, catalog rates, fallback cache prices", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () => ({
			ok: true,
			status: 200,
			json: async () => ({
				data: [
					{ id: "deepseek/deepseek-v4-flash", pricing: { prompt: "0.00000014", completion: "0.00000028", input_cache_read: "0.000000028", input_cache_write: "0.00000014" } },
					{ id: "openai/gpt-4o", pricing: { prompt: "0.0000025", completion: "0.00001", input_cache_read: "0.00000125" } },
					{ id: "openai/not-wanted", pricing: { prompt: "0.000001", completion: "0.000002" } },
				],
			}),
		});
		try {
			const r = await call("/token-stats/prices/sync", "POST", { models: ["deepseek-v4-flash", "gpt-4o"] });
			assert.equal(r.status, 200);
			assert.equal(r.json.updated, 2);
			assert.equal(r.json.models["deepseek-v4-flash"].input, 0.14);
			assert.equal(r.json.models["deepseek-v4-flash"].source, "openrouter");
			assert.equal(r.json.models["gpt-4o"].cacheWrite, 3.125); // 1.25 x input fallback for gpt
			assert.equal("not-wanted" in r.json.models, false);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("sync: empty models list derives wanted ids from the logs", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () => ({
			ok: true,
			status: 200,
			json: async () => ({
				data: [
					{ id: "deepseek/deepseek-v4-flash", pricing: { prompt: "0.00000014", completion: "0.00000028" } },
				],
			}),
		});
		try {
			const r = await call("/token-stats/prices/sync", "POST", { models: [] });
			assert.equal(r.status, 200);
			assert.equal(r.json.updated, 1);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("sync: catalog fetch failure -> 500", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () => { throw new Error("network down"); };
		try {
			const r = await call("/token-stats/prices/sync", "POST", { models: ["deepseek-v4-flash"] });
			assert.equal(r.status, 500);
			assert.match(r.json.error, /network down/);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("sync: non-ok HTTP response -> 500", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () => ({ ok: false, status: 429 });
		try {
			const r = await call("/token-stats/prices/sync", "POST", { models: ["deepseek-v4-flash"] });
			assert.equal(r.status, 500);
			assert.match(r.json.error, /429/);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test("sync: zero/NaN catalog pricing skipped", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () => ({
			ok: true,
			status: 200,
			json: async () => ({
				data: [
					{ id: "deepseek/deepseek-v4-flash", pricing: { prompt: "0", completion: "0.00000028" } },
					{ id: "openai/gpt-4o", pricing: null },
				],
			}),
		});
		try {
			const r = await call("/token-stats/prices/sync", "POST", { models: ["deepseek-v4-flash", "gpt-4o"] });
			assert.equal(r.status, 200);
			assert.equal(r.json.updated, 0);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});

after(() => {
	delete process.env.DSH_HOME;
});
