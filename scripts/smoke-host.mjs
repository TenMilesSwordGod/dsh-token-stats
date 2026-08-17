/**
 * Offline host-stack smoke test for @deepseek-ai/dsh-token-stats.
 *
 * Builds a fake session log (real zstd framing) with usage samples at a
 * peak and an off-peak UTC hour, boots the plugin against stub cordis
 * services, and asserts:
 *   1. per-day token buckets (input/output/cacheRead/cacheWrite/total),
 *   2. cost per event with the DeepSeek off-peak discount (peak $0.28,
 *      off-peak $0.07 for the fixture below),
 *   3. GET /token-stats/prices returns the merged default table,
 *   4. POST /token-stats/prices persists a manual override and re-prices,
 *   5. POST /token-stats/prices/sync merges a stubbed OpenRouter catalog
 *      (no network) and keeps an existing manual off-peak window.
 *
 * Run: node scripts/smoke-host.mjs
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { zstdCompressSync } from 'node:zlib'
import { apply as applyTokenStats } from '../lib/index.js'

const pass = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
  if (!ok) process.exitCode = 1
}

const SMOKE_ROOT = join(tmpdir(), 'dsh-token-stats-smoke')
rmSync(SMOKE_ROOT, { recursive: true, force: true })
// DSH_HOME points at the harness home root; sessions/storages live under it.
process.env.DSH_HOME = join(SMOKE_ROOT, '.dsh')

const sessionsDir = join(process.env.DSH_HOME, 'sessions', 'w', 's1')
mkdirSync(sessionsDir, { recursive: true })

const mkLine = (ev) => JSON.stringify(ev)
const header = (time, model) =>
  mkLine({ type: 'request/header', seq: 0, time, data: { header: { config: { provider: 'deepseek-official', model } } } })
const usage = (seq, time, turn, step, u) =>
  mkLine({ type: 'assistant/message', seq, time, data: { turn, step, usage: u } })

// DeepSeek off-peak: UTC 16:30–00:30. Peak sample at UTC 12:00 (local +8 =
// 2026-08-14 20:00), off-peak sample at UTC 22:00 (local 2026-08-15 06:00).
const tPeak = Date.UTC(2026, 7, 14, 12, 0, 0)
const tOff = Date.UTC(2026, 7, 14, 22, 0, 0)
const log = [
  header(tPeak - 1000, 'deepseek-v4-flash'),
  usage(1, tPeak, 0, 0, { inputTokens: 1_000_000, outputTokens: 500_000, cacheReadTokens: 0, cacheWriteTokens: 0 }),
  header(tOff - 1000, 'deepseek-v4-flash'),
  usage(2, tOff, 1, 0, { inputTokens: 1_000_000, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }),
].join('\n') + '\n'
writeFileSync(join(sessionsDir, 'session.jsonl.zstd'), zstdCompressSync(Buffer.from(log, 'utf8')))

// Boot the plugin against stub cordis services; capture the routes.
const routes = {}
const ctx = {
  logger: { warn: () => {} },
  on: () => {},
  effect: (fn) => fn(),
  webServer: { register: (route) => { routes[route.path] = route.handler; return () => {} } },
}
applyTokenStats(ctx, {})

/** Drive one captured route with a JSON request/response pair. */
async function call(path, method = 'GET', body) {
  const res = { status: 0, body: '', writeHead(s) { this.status = s }, end(b) { this.body = b || '' }, destroy() {} }
  const req = { method, url: path }
  if (body !== undefined) {
    req[Symbol.asyncIterator] = async function* () { yield Buffer.from(JSON.stringify(body)) }
  }
  await routes[path](req, res)
  return { status: res.status, json: res.body ? JSON.parse(res.body) : null }
}

// ── 1. aggregation + per-event off-peak cost (timezone-agnostic) ────────────
const localKey = (t) => {
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const dayPeak = localKey(tPeak)
const dayOff = localKey(tOff)
const stats = await call('/token-stats')
pass('GET /token-stats 200', stats.status === 200, `status ${stats.status}`)
const all = stats.json.all
const dayKeys = Object.keys(all)
pass('days bucketed', dayKeys.length >= 1, dayKeys.join(', '))
const costPeak = all[dayPeak]?.cost ?? 0
const costOff = all[dayOff]?.cost ?? 0
if (dayPeak === dayOff) {
  // e.g. UTC timezone: both samples share one local day -> combined cost.
  pass('combined-day cost 0.35 (peak + off-peak)', Math.abs(costPeak - 0.35) < 1e-9, `cost ${costPeak}`)
} else {
  pass('peak-day cost 0.28', Math.abs(costPeak - 0.28) < 1e-9, `cost ${costPeak}`)
  pass('off-peak-day cost 0.07 (x0.5)', Math.abs(costOff - 0.07) < 1e-9, `cost ${costOff}`)
}
const totalCost = dayKeys.reduce((s, k) => s + all[k].cost, 0)
pass('total cost 0.35', Math.abs(totalCost - 0.35) < 1e-9, `total ${totalCost}`)
const anyBucket = all[dayPeak]
pass('cost components split', Number.isFinite(anyBucket.costInput) && Number.isFinite(anyBucket.costOutput) && Number.isFinite(anyBucket.costCacheRead) && Number.isFinite(anyBucket.costCacheWrite))
pass('models keyed provider/model', stats.json.models.includes('deepseek-official/deepseek-v4-flash'))
pass('resolved prices present', stats.json.prices['deepseek-official/deepseek-v4-flash']?.input === 0.14)

// ── 2. price table GET ──────────────────────────────────────────────────────
const prices = await call('/token-stats/prices')
pass('GET prices 200', prices.status === 200)
pass('default deepseek-v4-flash entry', prices.json.models['deepseek-v4-flash']?.input === 0.14 && prices.json.models['deepseek-v4-flash']?.offPeak?.multiplier === 0.5)

// ── 3. manual override persists and re-prices ───────────────────────────────
const saved = await call('/token-stats/prices', 'POST', {
  models: {
    'deepseek-v4-flash': {
      input: 1, output: 2, cacheRead: 0.1, cacheWrite: 1,
      offPeak: { multiplier: 0.25, startUtc: 16, endUtc: 24 },
    },
  },
})
pass('POST prices 200', saved.status === 200, `status ${saved.status}`)
pass('saved source=manual', saved.json.models['deepseek-v4-flash']?.source === 'manual')
const reStats = await call('/token-stats')
const reCost = Object.values(reStats.json.all).reduce((s, b) => s + b.cost, 0)
// peak: 1M*1 + 0.5M*2 = 2.0 ; off: 1M*1*0.25 = 0.25 ; total 2.25
pass('cost re-priced to 2.25', Math.abs(reCost - 2.25) < 1e-9, `cost ${reCost}`)

// ── 4. invalid input rejected ───────────────────────────────────────────────
const bad = await call('/token-stats/prices', 'POST', { models: { x: { input: -1, output: 1, cacheRead: 0, cacheWrite: 0 } } })
pass('invalid POST rejected 400', bad.status === 400, `status ${bad.status}`)

// ── 5. sync merges a stubbed catalog (no network) and keeps manual off-peak ─
const originalFetch = globalThis.fetch
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    data: [
      { id: 'deepseek/deepseek-v4-flash', pricing: { prompt: '0.00000014', completion: '0.00000028', input_cache_read: '0.000000028' } },
      { id: 'openai/gpt-4o', pricing: { prompt: '0.0000025', completion: '0.00001', input_cache_read: '0.00000125' } },
    ],
  }),
})
const synced = await call('/token-stats/prices/sync', 'POST', { models: ['deepseek-v4-flash', 'gpt-4o'] })
globalThis.fetch = originalFetch
pass('sync 200', synced.status === 200, `status ${synced.status} updated=${synced.json?.updated}`)
const syncedFlash = synced.json.models['deepseek-v4-flash']
pass('synced rates from catalog', syncedFlash?.input === 0.14 && syncedFlash?.output === 0.28 && syncedFlash?.cacheRead === 0.028)
pass('manual off-peak kept', syncedFlash?.offPeak?.multiplier === 0.25, `multiplier ${syncedFlash?.offPeak?.multiplier}`)
pass('gpt-4o added', synced.json.models['gpt-4o']?.input === 2.5)

// ── 6. persistence across a fresh plugin instance ───────────────────────────
const routes2 = {}
applyTokenStats({ logger: { warn: () => {} }, on: () => {}, effect: (fn) => fn(), webServer: { register: (r) => { routes2[r.path] = r.handler; return () => {} } } }, {})
const res2 = { status: 0, body: '', writeHead(s) { this.status = s }, end(b) { this.body = b || '' }, destroy() {} }
await routes2['/token-stats/prices']({ method: 'GET', url: '/token-stats/prices' }, res2)
const table2 = JSON.parse(res2.body)
pass('prices persisted across instances', table2.models['deepseek-v4-flash']?.input === 0.14 && table2.models['deepseek-v4-flash']?.source === 'openrouter')

// ── 7. manual entry WITHOUT offPeak must not break the scan (regression) ────
const noOff = await call('/token-stats/prices', 'POST', {
  models: { 'deepseek-v4-flash': { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 1 } },
})
pass('POST without offPeak 200', noOff.status === 200, `status ${noOff.status}`)
const statsAfterNoOff = await call('/token-stats')
const dayKeysAfter = Object.keys(statsAfterNoOff.json.all)
pass('stats still aggregated after no-offPeak save', dayKeysAfter.length >= 1 && Object.values(statsAfterNoOff.json.all).reduce((s, b) => s + b.total, 0) > 0, `days ${dayKeysAfter.length}`)
// off-peak sample now at full rate: peak 1M*1 + 0.5M*2 = 2.0 ; off 1M*1 = 1.0 ; total 3.0
const costNoOff = Object.values(statsAfterNoOff.json.all).reduce((s, b) => s + b.cost, 0)
pass('cost without offPeak uses full rate', Math.abs(costNoOff - 3.0) < 1e-9, `cost ${costNoOff}`)

delete process.env.DSH_HOME
console.log(process.exitCode ? '\nsmoke FAILED' : '\nsmoke OK')
