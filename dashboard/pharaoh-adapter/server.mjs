import http from 'node:http';

const HOST = process.env.PHARAOH_ADAPTER_HOST || '127.0.0.1';
const PORT = boundedInt(process.env.PHARAOH_ADAPTER_PORT, 8002, 1, 65535);
const GATEWAY = process.env.AVAX_RADAR_GATEWAY_URL || 'http://127.0.0.1:43140';
const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173').split(',').map((v) => v.trim()));
const ADDRESS = /^0x[0-9a-f]{40}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const cache = new Map();

if (!['http://127.0.0.1:43140', 'http://localhost:43140'].includes(GATEWAY)) {
  throw new Error('AVAX_RADAR_GATEWAY_URL must be the canonical loopback Gateway');
}

function boundedInt(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function json(res, status, payload, origin) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': status === 200 ? 'private, max-age=10' : 'no-store',
    ...(origin && ALLOWED_ORIGINS.has(origin) ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
  });
  res.end(JSON.stringify(payload));
}

async function gateway(path, ttlMs = 15_000) {
  const prior = cache.get(path);
  if (prior && Date.now() - prior.at < ttlMs) return prior.value;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_500);
  try {
    const response = await fetch(new URL(path, GATEWAY), { signal: controller.signal });
    if (!response.ok) throw new Error(`Gateway returned ${response.status}`);
    const value = await response.json();
    cache.set(path, { at: Date.now(), value });
    return value;
  } finally { clearTimeout(timeout); }
}

function validateAnalytics(value) {
  if (value?.schemaVersion !== 'avalanche-gateway-dex-analytics/v1' || value?.source !== 'avalanche_gateway' || value?.protocol !== 'pharaoh') throw new Error('historical schema mismatch');
  if (!Array.isArray(value.daily) || !Array.isArray(value.pools) || value.coverage?.days !== value.daily.length) throw new Error('historical coverage mismatch');
  return value;
}

function validateLive(value) {
  if (value?.schemaVersion !== 'avalanche-gateway-pharaoh-live/v1' || value?.source !== 'avalanche_gateway' || !Array.isArray(value.rows)) throw new Error('live schema mismatch');
  return value;
}

const analytics = () => gateway('/api/gateway/dex-analytics?protocol=pharaoh', 30_000).then(validateAnalytics);
const live = () => gateway('/api/gateway/pharaoh/live-swaps', 8_000).then(validateLive);
const poolView = (pool) => ({
  pool_address: pool.address,
  pair: pool.pair,
  mode: pool.type,
  chain: 'Avalanche',
  chain_id: 43114,
  volume_usd: pool.volumeUsd ?? null,
  swaps: pool.swapEvents ?? null,
  transactions: pool.transactions ?? null,
  traders: pool.traders ?? null,
  pricing_coverage: pool.pricingCoverage ?? null,
  fee_tier_bps: pool.feeTierBps ?? null,
  bin_step_bps: pool.binStepBps ?? null,
  active_days: pool.activeDays ?? null,
  last_active_date: pool.lastActiveDate ?? null,
  tvl_usd: null,
  fees_usd: null,
  revenue_usd: null,
});

function coverage(value) {
  return {
    state: value.coverage.state,
    from: value.coverage.from,
    through: value.coverage.completeThrough,
    days: value.coverage.days,
    pool_universe: 'partial',
    surfaced_pools: value.pools.length,
    registered_pools: value.coverage.factoryRegistry?.total ?? null,
    lifetime_complete: false,
  };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  try {
    if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' }, origin);
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (url.pathname === '/health') {
      const value = await analytics();
      return json(res, 200, { status: 'ok', source: 'avalanche_gateway', coverage: coverage(value) }, origin);
    }
    if (url.pathname === '/api/v1/pharaoh/overview') {
      const value = await analytics();
      return json(res, 200, { protocol: 'Pharaoh', chain: 'Avalanche', chain_id: 43114, latest: value.latest, market: value.market, retention: value.retention, daily: value.daily, coverage: coverage(value) }, origin);
    }
    if (url.pathname === '/api/v1/pharaoh/trending') {
      const value = await analytics();
      const limit = boundedInt(url.searchParams.get('limit'), 12, 1, 50);
      const pools = [...value.pools].sort((a, b) => (b.volumeUsd ?? -1) - (a.volumeUsd ?? -1)).slice(0, limit).map(poolView);
      return json(res, 200, { pools, coverage: coverage(value) }, origin);
    }
    if (url.pathname === '/api/v1/pharaoh/search') {
      const value = await analytics();
      const query = String(url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 80);
      if (!query) return json(res, 200, { pools: [], coverage: coverage(value) }, origin);
      const pools = value.pools.filter((pool) => pool.address.toLowerCase() === query || pool.pair.toLowerCase().includes(query)).slice(0, 25).map(poolView);
      return json(res, 200, { pools, coverage: coverage(value) }, origin);
    }
    const poolMatch = url.pathname.match(/^\/api\/v1\/pharaoh\/pools\/(0x[0-9a-fA-F]{40})$/);
    if (poolMatch) {
      const value = await analytics();
      const address = poolMatch[1].toLowerCase();
      const pool = value.pools.find((item) => item.address.toLowerCase() === address);
      return pool ? json(res, 200, { pool: poolView(pool), coverage: coverage(value) }, origin) : json(res, 404, { error: 'pool_not_found' }, origin);
    }
    if (url.pathname === '/api/v1/pharaoh/swaps') {
      const value = await live();
      const limit = boundedInt(url.searchParams.get('limit'), 100, 1, 200);
      const requestedPool = String(url.searchParams.get('pool') || '').toLowerCase();
      if (requestedPool && !ADDRESS.test(requestedPool)) return json(res, 422, { error: 'invalid_pool_address' }, origin);
      const rows = value.rows.filter((row) => !requestedPool || row.poolAddress === requestedPool).slice(-limit).reverse().map((row) => ({
        ...row,
        tx_url: HASH.test(row.txHash) ? `https://snowscan.xyz/tx/${row.txHash}` : null,
        pool_url: ADDRESS.test(row.poolAddress) ? `https://snowscan.xyz/address/${row.poolAddress}` : null,
      }));
      return json(res, 200, { rows, cursor: value.cursor, generated_at: value.generatedAt, modes: ['LEGACY', 'CL', 'DLMM'], coverage: { registered_pools: value.registryPools, window_blocks: value.windowBlocks, lifetime_complete: false } }, origin);
    }
    if (url.pathname === '/api/v1/pharaoh/history') {
      const value = await analytics();
      return json(res, 200, { daily: value.daily, coverage: coverage(value) }, origin);
    }
    return json(res, 404, { error: 'not_found' }, origin);
  } catch (error) {
    console.error('Pharaoh adapter request failed');
    return json(res, 503, { error: 'pharaoh_data_unavailable', detail: 'The canonical Avalanche Gateway is unavailable or returned an incompatible schema.' }, origin);
  }
});

server.listen(PORT, HOST, () => console.log(`TradesLens Pharaoh adapter listening on http://${HOST}:${PORT}`));
