import type { SeriesPoint } from "@/lib/services/analytics";

// A dependency-free, server-rendered line chart.
//
// Palette: validated with the dataviz skill's validate_palette.js on the real card surfaces
// (white / #1a1921), strictest "all pairs" test: every check PASSES in both themes, worst colour-blind
// separation ΔE 11.0 (target ≥ 8). The brand's own yellow and mint fail on white (L 0.85+, 1.48:1), so
// the chart steps them: gold stands in for the yellow, and green is dropped because pink + green is the
// classic red-green collision (ΔE 5.3 under deuteranopia).
//
// Mark specs: 2px lines, round joins; 8px end-dots with a 2px surface ring; hairline solid grid;
// text only ever wears text tokens (never the series colour). The hover tooltip is CSS-only (:hover and
// :focus-visible on a keyboard-focusable column), and every value is also in the table below the chart.

export type ChartSeries = { key: string; label: string; points: SeriesPoint[] };

const W = 640;
const H = 250;
const M = { top: 14, right: 34, bottom: 30, left: 34 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const shortDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

/** A round axis maximum with about four intervals: 4, 8, 10, 20, 40, 100… */
function niceMax(max: number): { top: number; step: number } {
  if (max <= 4) return { top: 4, step: 1 };
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  return { top: Math.ceil(max / step) * step, step };
}

export default function ActivityChart({ series, title, unit = "per day" }: { series: ChartSeries[]; title: string; unit?: string }) {
  const n = series[0]?.points.length ?? 0;
  if (n === 0) return null;
  const dates = series[0].points.map((p) => p.date);
  const rawMax = Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.value)));
  const { top, step } = niceMax(rawMax);
  const x = (i: number) => M.left + (n === 1 ? PLOT_W / 2 : (i * PLOT_W) / (n - 1));
  const y = (v: number) => M.top + PLOT_H - (v / top) * PLOT_H;
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
  const colW = n === 1 ? PLOT_W : PLOT_W / (n - 1);
  const labelEvery = n > 10 ? 3 : 1;
  const totals = series.map((s) => s.points.reduce((a, p) => a + p.value, 0));

  return (
    <figure className="pf-chart" aria-labelledby="chart-title">
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <span id="chart-title" className="text-xl font-bold">
          {title}
        </span>
        {/* Legend: always present for two or more series; colour mark beside text-token text. */}
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {series.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2">
              <svg width="22" height="10" aria-hidden>
                <line x1="1" x2="21" y1="5" y2="5" stroke={`var(--c${i + 1})`} strokeWidth="2" strokeLinecap="round" />
                <circle cx="11" cy="5" r="4" fill={`var(--c${i + 1})`} stroke="var(--pf-surface)" strokeWidth="2" />
              </svg>
              <span>
                {s.label} <span className="pf-muted">· {totals[i]} total</span>
              </span>
            </li>
          ))}
        </ul>
      </figcaption>

      <div className="overflow-x-auto" role="region" aria-label={`${title} chart, scrolls sideways on small screens`} tabIndex={0}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block min-w-[34rem] w-full" role="img" aria-label={`${title}: ${unit}, ${shortDate(dates[0])} to ${shortDate(dates[n - 1])}. Full values are in the table below.`}>
          {/* grid + y axis */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className="pf-chart-grid" />
              <text x={M.left - 8} y={y(t)} className="pf-chart-tick" textAnchor="end" dominantBaseline="middle">
                {t}
              </text>
            </g>
          ))}
          {/* x axis labels */}
          {dates.map((d, i) =>
            // Anchored to the LAST day (today), so the newest label is never squeezed against its neighbour.
            (n - 1 - i) % labelEvery === 0 ? (
              <text key={d} x={x(i)} y={H - 8} className="pf-chart-tick" textAnchor="middle">
                {shortDate(d)}
              </text>
            ) : null,
          )}

          {/* lines */}
          {series.map((s, si) => (
            <polyline
              key={s.key}
              fill="none"
              stroke={`var(--c${si + 1})`}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={s.points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")}
            />
          ))}

          {/* end dots with surface ring, plus the value when it doesn't collide with another label */}
          {series.map((s, si) => {
            const last = s.points[n - 1];
            const py = y(last.value);
            const crowded = series.some((o, oi) => oi < si && Math.abs(y(o.points[n - 1].value) - py) < 13);
            return (
              <g key={s.key}>
                <circle cx={x(n - 1)} cy={py} r="4.5" fill={`var(--c${si + 1})`} stroke="var(--pf-surface)" strokeWidth="2" />
                {!crowded ? (
                  <text x={x(n - 1) + 10} y={py} className="pf-chart-value" dominantBaseline="middle">
                    {last.value}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* hover / focus columns: crosshair, markers, tooltip. Each column is wider than a dot (≥ 24px hit area). */}
          {dates.map((d, i) => {
            const cx = x(i);
            const left = i > n / 2;
            const tipW = 148;
            const tipH = 22 + series.length * 18;
            const tx = left ? cx - tipW - 10 : cx + 10;
            const label = `${shortDate(d)}: ${series.map((s) => `${s.points[i].value} ${s.label.toLowerCase()}`).join(", ")}`;
            return (
              <g key={d} className="pf-chart-col" tabIndex={0} role="img" aria-label={label}>
                <rect x={cx - colW / 2} y={M.top} width={colW} height={PLOT_H + 6} fill="transparent" />
                <g className="pf-chart-hover" aria-hidden>
                  <line x1={cx} x2={cx} y1={M.top} y2={M.top + PLOT_H} className="pf-chart-cross" />
                  {series.map((s, si) => (
                    <circle key={s.key} cx={cx} cy={y(s.points[i].value)} r="4.5" fill={`var(--c${si + 1})`} stroke="var(--pf-surface)" strokeWidth="2" />
                  ))}
                  <g transform={`translate(${tx} ${M.top + 4})`}>
                    <rect width={tipW} height={tipH} rx="8" className="pf-chart-tip" />
                    <text x="10" y="16" className="pf-chart-tipTitle">
                      {shortDate(d)}
                    </text>
                    {series.map((s, si) => (
                      <g key={s.key} transform={`translate(10 ${32 + si * 18})`}>
                        <circle cx="4" cy="-4" r="4" fill={`var(--c${si + 1})`} />
                        <text x="16" y="0" className="pf-chart-tipRow">
                          {s.label}
                        </text>
                        <text x={tipW - 20} y="0" textAnchor="end" className="pf-chart-tipVal">
                          {s.points[i].value}
                        </text>
                      </g>
                    ))}
                  </g>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* The table view is the WCAG-clean twin: every number the chart shows. */}
      <details className="mt-3">
        <summary className="pf-link cursor-pointer text-sm">View as table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="pf-table">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col">Day (UTC)</th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="text-right">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((d, i) => (
                <tr key={d}>
                  <th scope="row" className="!bg-transparent !font-semibold !normal-case !tracking-normal !text-(--pf-fg)">
                    {shortDate(d)}
                  </th>
                  {series.map((s) => (
                    <td key={s.key} className="text-right tabular-nums">
                      {s.points[i].value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
