import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ExternalLink, Search, Waves } from 'lucide-react';

const API = import.meta.env.VITE_PHARAOH_API_URL || 'http://127.0.0.1:8002';
const money = (value) => value == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value);
const integer = (value) => value == null ? '—' : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export default function PharaohDashboard() {
  const [overview, setOverview] = useState(null);
  const [pools, setPools] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`${API}/api/v1/pharaoh/overview`, { signal: controller.signal }).then(check),
      fetch(`${API}/api/v1/pharaoh/trending?limit=16`, { signal: controller.signal }).then(check),
      fetch(`${API}/api/v1/pharaoh/swaps?limit=30`, { signal: controller.signal }).then(check),
    ]).then(([summary, ranking, live]) => {
      setOverview(summary); setPools(ranking.pools); setSwaps(live.rows); setError(null);
    }).catch((reason) => { if (reason.name !== 'AbortError') setError('Canonical Gateway data is unavailable. No fallback source was used.'); });
    return () => controller.abort();
  }, []);

  const visiblePools = useMemo(() => pools.filter((pool) => `${pool.pair} ${pool.pool_address}`.toLowerCase().includes(query.toLowerCase())), [pools, query]);
  const latest = overview?.latest;
  const coverage = overview?.coverage;
  return <section className="pharaoh-shell">
    <div className="pharaoh-hero">
      <div>
        <div className="pharaoh-kicker"><span /> AVALANCHE C-CHAIN · 43114</div>
        <h1>Pharaoh <em>flow desk</em></h1>
        <p>Read-only swap intelligence across Legacy, concentrated-liquidity, and DLMM pools.</p>
      </div>
      <div className="pharaoh-status"><Activity size={15} /> Gateway only <strong>{coverage?.through || '—'}</strong></div>
    </div>

    {error && <div className="pharaoh-error"><AlertTriangle size={18} /> {error}</div>}
    <div className="pharaoh-disclosure"><Waves size={18} /><div><strong>Bounded coverage</strong><span>{coverage ? `${coverage.days} complete days, ${coverage.surfaced_pools} surfaced of ${coverage.registered_pools ?? '—'} registered pools. Partial universe; not lifetime history.` : 'Loading declared coverage…'}</span></div></div>

    <div className="pharaoh-metrics">
      <Metric label="Latest priced volume" value={money(latest?.volumeUsd)} note={latest?.date || '—'} />
      <Metric label="Swap events" value={integer(latest?.swapEvents)} note={`${integer(latest?.unpricedSwapEvents)} unpriced`} />
      <Metric label="Active traders" value={integer(latest?.dailyActiveUsers)} note="transaction.from definition" />
      <Metric label="Pricing coverage" value={latest?.pricingCoverage == null ? '—' : `${(latest.pricingCoverage * 100).toFixed(2)}%`} note="unknown values stay null" />
    </div>

    <div className="pharaoh-grid">
      <article className="pharaoh-panel pharaoh-pools">
        <header><div><span>90D POOL RADAR</span><h2>Flow leaders</h2></div><label><Search size={14}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pair or 0x pool" /></label></header>
        <div className="pharaoh-table">
          <div className="pharaoh-row pharaoh-head"><span>Pool</span><span>Mode</span><span>Volume</span><span>Trades</span><span>Priced</span></div>
          {visiblePools.map((pool) => <a className="pharaoh-row" href={`https://snowscan.xyz/address/${pool.pool_address}`} target="_blank" rel="noreferrer" key={pool.pool_address}>
            <span><strong>{pool.pair}</strong><small>{pool.pool_address.slice(0, 7)}…{pool.pool_address.slice(-5)}</small></span><span><i className={`mode mode-${pool.mode?.toLowerCase()}`}>{pool.mode}</i></span><span>{money(pool.volume_usd)}</span><span>{integer(pool.swaps)}</span><span>{pool.pricing_coverage == null ? '—' : `${(pool.pricing_coverage * 100).toFixed(1)}%`} <ExternalLink size={11}/></span>
          </a>)}
        </div>
      </article>
      <article className="pharaoh-panel pharaoh-live">
        <header><div><span>NEAR TIP</span><h2>Live swaps</h2></div><b><i/> RECEIPT-SUCCESS</b></header>
        <div className="pharaoh-tape">{swaps.map((swap) => <a href={swap.tx_url} target="_blank" rel="noreferrer" key={swap.id}>
          <div><i className={`mode mode-${swap.mode?.toLowerCase()}`}>{swap.mode}</i><strong>{swap.tokenIn} → {swap.tokenOut}</strong><time>{swap.blockTime ? new Date(swap.blockTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `#${swap.blockNumber}`}</time></div>
          <p>{swap.amountIn} <span>{swap.tokenIn}</span> <b>→</b> {swap.amountOut} <span>{swap.tokenOut}</span></p>
          <footer><span>{swap.valueUsd == null ? 'UNPRICED' : money(swap.valueUsd)}</span><code>{swap.txHash.slice(0, 9)}…</code></footer>
        </a>)}</div>
      </article>
    </div>
  </section>;
}

function check(response) { if (!response.ok) throw new Error('request failed'); return response.json(); }
function Metric({ label, value, note }) { return <div className="pharaoh-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>; }
