import React from 'react'

/**
 * Decorative bar chart for dashboard inventory snapshot (sample data until live feeds exist).
 */
const DEMO_BARS = [
  { label: 'Spirits', pct: 0.72, fill: '#3730a3' },
  { label: 'Liqueurs', pct: 0.48, fill: '#0d9488' },
  { label: 'Syrups', pct: 0.56, fill: '#b45309' },
  { label: 'Citrus', pct: 0.38, fill: '#0e7490' },
  { label: 'Bitters', pct: 0.44, fill: '#6b21a8' },
]

function InventorySnapshotChart({ emptyInventory = false }) {
  const w = 320
  const h = 168
  const padL = 36
  const padB = 28
  const padR = 12
  const padT = 8
  const chartW = w - padL - padR
  const chartH = h - padB - padT
  const barW = chartW / DEMO_BARS.length - 10
  const maxBar = Math.max(...DEMO_BARS.map((b) => b.pct))

  return (
    <div
      className="inventory-snapshot-chart"
      role="img"
      aria-label="Sample bar chart of inventory categories (illustrative)"
    >
      <svg
        className="inventory-snapshot-chart__svg"
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        preserveAspectRatio="xMidYMid meet"
      >
        <line
          x1={padL}
          y1={h - padB}
          x2={w - padR}
          y2={h - padB}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
        />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padT + chartH * (1 - t)
          return (
            <line
              key={t}
              x1={padL}
              y1={y}
              x2={w - padR}
              y2={y}
              stroke="currentColor"
              strokeOpacity={t === 0 ? 0 : 0.06}
              strokeWidth={1}
            />
          )
        })}
        {DEMO_BARS.map((b, i) => {
          const bw = barW
          const x = padL + i * (chartW / DEMO_BARS.length) + (chartW / DEMO_BARS.length - bw) / 2
          const bh = (b.pct / maxBar) * chartH
          const y = padT + chartH - bh
          return (
            <rect
              key={b.label}
              x={x}
              y={y}
              width={bw}
              height={Math.max(bh, 2)}
              rx={4}
              fill={b.fill}
              fillOpacity={emptyInventory ? 0.45 : 0.9}
            />
          )
        })}
        {DEMO_BARS.map((b, i) => {
          const bw = barW
          const x = padL + i * (chartW / DEMO_BARS.length) + (chartW / DEMO_BARS.length - bw) / 2
          return (
            <text
              key={`label-${i}`}
              x={x + bw / 2}
              y={h - 6}
              textAnchor="middle"
              className="inventory-snapshot-chart__svg-label"
              fontSize="10"
              fill="currentColor"
              fillOpacity={0.55}
            >
              {b.label}
            </text>
          )
        })}
        <text
          x={padL - 4}
          y={padT + 10}
          textAnchor="end"
          fontSize="10"
          fill="currentColor"
          fillOpacity={0.45}
        >
          100%
        </text>
        <text
          x={padL - 4}
          y={padT + chartH + 4}
          textAnchor="end"
          fontSize="10"
          fill="currentColor"
          fillOpacity={0.45}
        >
          0
        </text>
      </svg>
      {emptyInventory && (
        <p className="inventory-snapshot-chart__demo-caption">Sample distribution — upload inventory to replace.</p>
      )}
    </div>
  )
}

export default InventorySnapshotChart
