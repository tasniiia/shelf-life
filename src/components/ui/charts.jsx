// Small, dependency-free chart primitives matching the app's card-catalog
// palette. Used on both the mobile story slides and the desktop flip cards.

const PALETTE = {
  stamp: '#B23A2E',
  ledger: '#3F5B4A',
  gold: '#C9A24B',
  ink: '#22252B',
  line: '#D8CFB8',
};

function resolveColor(c) {
  return PALETTE[c] || c;
}

/**
 * Ring/donut chart for 2-4 category breakdowns (e.g. finished vs. abandoned,
 * series vs. standalone). `segments`: [{ label, value, color }]
 */
export function Donut({ segments, size = 88, strokeWidth = 14, centerLabel }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let acc = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {/* Rotate only the ring itself (via a native SVG transform) so the
            first segment starts at 12 o'clock — the center label below is a
            sibling, not a child, so it's never affected by this rotation. */}
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={PALETTE.line}
            strokeWidth={strokeWidth}
            opacity="0.35"
          />
          {segments.map((seg, i) => {
            const pct = seg.value / total;
            const dash = Math.max(pct * circumference, seg.value > 0 ? 1 : 0);
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={resolveColor(seg.color)}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-acc}
                strokeLinecap="butt"
              />
            );
            acc += dash;
            return el;
          })}
        </g>
        {centerLabel && (
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="16"
            fontFamily="IBM Plex Mono, monospace"
            fill={PALETTE.ink}
          >
            {centerLabel}
          </text>
        )}
      </svg>
      <div className="space-y-1.5 min-w-0">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: resolveColor(seg.color) }}
            />
            <span className="text-ink/70 truncate">
              {seg.label} · {seg.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Simple vertical bar histogram. `buckets`: [{ label, count }]
 */
export function Histogram({ buckets, height = 72, color = 'stamp', showCounts }) {
  const max = Math.max(...buckets.map((b) => b.count), 1);
  // A 4-digit count label is wider than a narrow column once there are more
  // than ~8 bars (e.g. a 12-month chart) — showing it anyway lets the first
  // and last labels overflow past the card edge and get clipped. Past that
  // threshold, skip per-bar labels entirely; the axis labels plus body copy
  // already call out the peak/trough numbers.
  const shouldShowCounts = showCounts ?? buckets.length <= 8;
  const topPad = shouldShowCounts ? 14 : 6;

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: topPad + height }}>
        {buckets.map((b) => (
          <div key={b.label} className="flex-1 flex flex-col items-center justify-end min-w-0">
            {shouldShowCounts && (
              <span
                className="text-[9px] font-mono text-ink/40 leading-none mb-1 flex items-end justify-center"
                style={{ height: topPad }}
              >
                {b.count || ''}
              </span>
            )}
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: `${Math.max((b.count / max) * height, b.count > 0 ? 6 : 2)}px`,
                backgroundColor: resolveColor(color),
                opacity: b.count > 0 ? 1 : 0.15,
              }}
            />
          </div>
        ))}
      </div>
      {/* Axis labels render in their own row, entirely separate from the
          bar area above, so they're never squeezed out by a tall bar. */}
      <div className="flex gap-1.5 mt-1.5">
        {buckets.map((b) => (
          <span
            key={b.label}
            className="flex-1 text-center text-[9px] font-mono text-ink/40 truncate min-w-0"
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Horizontal ranked bar list (e.g. top authors). `items`: [{ label, count, pct }]
 */
export function RankedBars({ items, color = 'stamp' }) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-xs text-ink/70 mb-1">
            <span className="truncate pr-2">{item.label}</span>
            <span className="font-mono text-ink/40 shrink-0">{item.count}</span>
          </div>
          <div className="h-1.5 bg-line rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${item.pct}%`, backgroundColor: resolveColor(color) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
