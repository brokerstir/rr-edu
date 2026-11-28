/**
 * StatsDiagram.jsx
 *
 * Declarative SVG statistics renderer for Topic 4 (Statistics & Probability).
 * Supports parallel box plots (horizontal & vertical orientation) with
 * five-number summaries, outlier points, custom styling, axis ticks/labels,
 * and extensible architecture for future chart types (ogive, histogram, scatter, etc.).
 */

const DEFAULT_SERIES_COLORS = [
  '#818cf8', // Indigo
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#38bdf8', // Sky
  '#f472b6', // Pink
  '#a78bfa', // Violet
];

/**
 * Computes a default domain [min, max] from plots if not specified.
 */
function resolveDomain(specDomain, plots) {
  if (Array.isArray(specDomain) && specDomain.length === 2 && isFinite(specDomain[0]) && isFinite(specDomain[1])) {
    return [Number(specDomain[0]), Number(specDomain[1])];
  }

  let min = Infinity;
  let max = -Infinity;

  plots.forEach((p) => {
    if (isFinite(p.min)) min = Math.min(min, p.min);
    if (isFinite(p.max)) max = Math.max(max, p.max);
    if (Array.isArray(p.outliers)) {
      p.outliers.forEach((o) => {
        if (isFinite(o)) {
          min = Math.min(min, o);
          max = Math.max(max, o);
        }
      });
    }
  });

  if (!isFinite(min) || !isFinite(max)) {
    return [0, 100];
  }

  if (min === max) {
    return [min - 10, max + 10];
  }

  // Add 5% padding
  const span = max - min;
  return [Math.floor(min - span * 0.05), Math.ceil(max + span * 0.05)];
}

/**
 * Computes a default major tick step from the domain span if not provided.
 */
function resolveStep(specStep, [min, max]) {
  if (isFinite(specStep) && specStep > 0) {
    return Number(specStep);
  }
  const span = max - min;
  if (span <= 10) return 1;
  if (span <= 25) return 5;
  if (span <= 100) return 10;
  if (span <= 250) return 25;
  if (span <= 500) return 50;
  return Math.pow(10, Math.floor(Math.log10(span)));
}

/**
 * Generates an array of major tick values between domain[0] and domain[1].
 */
function generateTicks([min, max], step) {
  const ticks = [];
  // Align first tick to multiple of step
  const firstTick = Math.ceil(min / step) * step;
  for (let val = firstTick; val <= max + 1e-9; val += step) {
    // Round to avoid floating point precision artifacts
    ticks.push(Math.round(val * 1e6) / 1e6);
  }
  return ticks;
}

/**
 * BoxPlotDiagram Sub-component
 */
function BoxPlotDiagram({ spec }) {
  const plots = Array.isArray(spec.plots) ? spec.plots : [];
  if (plots.length === 0) return null;

  const orientation = spec.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const domain = resolveDomain(spec.domain, plots);
  const step = resolveStep(spec.step, domain);
  const ticks = generateTicks(domain, step);
  const [valMin, valMax] = domain;
  const valSpan = Math.max(valMax - valMin, 0.001);

  if (orientation === 'vertical') {
    // ==========================================
    // VERTICAL ORIENTATION (Values along Y-axis)
    // ==========================================
    const svgWidth = 500;
    const svgHeight = 340;
    const margin = {
      top: 25,
      right: 30,
      bottom: 45,
      left: spec.axisLabel ? 70 : 55,
    };

    const plotWidth = svgWidth - margin.left - margin.right;
    const plotHeight = svgHeight - margin.top - margin.bottom;

    const toY = (val) => margin.top + ((valMax - val) / valSpan) * plotHeight;
    const slotWidth = plotWidth / plots.length;
    const boxWidth = Math.min(54, slotWidth * 0.52);
    const capWidth = boxWidth * 0.65;

    return (
      <div className="w-full flex flex-col items-center my-2">
        {spec.title && (
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            {spec.title}
          </div>
        )}

        <div className="w-full max-w-[540px] bg-slate-950 rounded-xl border border-slate-800 shadow-inner overflow-hidden flex items-center justify-center p-3">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Gridlines and Y-axis Ticks */}
            {ticks.map((t, idx) => {
              const y = toY(t);
              return (
                <g key={`grid-y-${idx}`}>
                  {/* Subtle horizontal gridline */}
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={margin.left + plotWidth}
                    y2={y}
                    stroke="#334155"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    strokeOpacity="0.45"
                  />
                  {/* Tick mark */}
                  <line
                    x1={margin.left - 5}
                    y1={y}
                    x2={margin.left}
                    y2={y}
                    stroke="#64748b"
                    strokeWidth="1.5"
                  />
                  {/* Tick number */}
                  <text
                    x={margin.left - 9}
                    y={y}
                    fill="#94a3b8"
                    fontSize="11"
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  >
                    {t}
                  </text>
                </g>
              );
            })}

            {/* Y-Axis Line */}
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={margin.top + plotHeight}
              stroke="#64748b"
              strokeWidth="1.5"
            />

            {/* Bottom Baseline / X-Axis Line */}
            <line
              x1={margin.left}
              y1={margin.top + plotHeight}
              x2={margin.left + plotWidth}
              y2={margin.top + plotHeight}
              stroke="#64748b"
              strokeWidth="1.5"
            />

            {/* Y-Axis Label */}
            {spec.axisLabel && (
              <text
                transform="rotate(-90)"
                x={-(margin.top + plotHeight / 2)}
                y={20}
                fill="#cbd5e1"
                fontSize="12"
                fontWeight="600"
                textAnchor="middle"
              >
                {spec.axisLabel}
              </text>
            )}

            {/* Parallel Box Plots */}
            {plots.map((plot, pIdx) => {
              const xCenter = margin.left + (pIdx + 0.5) * slotWidth;
              const color = plot.color || DEFAULT_SERIES_COLORS[pIdx % DEFAULT_SERIES_COLORS.length];

              const yMin = toY(plot.min);
              const yQ1 = toY(plot.q1);
              const yMed = toY(plot.median);
              const yQ3 = toY(plot.q3);
              const yMax = toY(plot.max);

              const boxTop = yQ3;
              const boxHeight = Math.max(1, yQ1 - yQ3);

              return (
                <g key={`v-plot-${pIdx}`}>
                  <title>
                    {`${plot.label || `Series ${pIdx + 1}`}: Min ${plot.min}, Q1 ${plot.q1}, Med ${plot.median}, Q3 ${plot.q3}, Max ${plot.max}`}
                  </title>

                  {/* Lower Whisker Stem (min to q1) */}
                  <line
                    x1={xCenter}
                    y1={yMin}
                    x2={xCenter}
                    y2={yQ1}
                    stroke={color}
                    strokeWidth="1.8"
                  />
                  {/* Lower Whisker End-Cap */}
                  <line
                    x1={xCenter - capWidth / 2}
                    y1={yMin}
                    x2={xCenter + capWidth / 2}
                    y2={yMin}
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                  {/* Upper Whisker Stem (q3 to max) */}
                  <line
                    x1={xCenter}
                    y1={yQ3}
                    x2={xCenter}
                    y2={yMax}
                    stroke={color}
                    strokeWidth="1.8"
                  />
                  {/* Upper Whisker End-Cap */}
                  <line
                    x1={xCenter - capWidth / 2}
                    y1={yMax}
                    x2={xCenter + capWidth / 2}
                    y2={yMax}
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                  {/* IQR Box */}
                  <rect
                    x={xCenter - boxWidth / 2}
                    y={boxTop}
                    width={boxWidth}
                    height={boxHeight}
                    fill={color}
                    fillOpacity="0.22"
                    stroke={color}
                    strokeWidth="2"
                    rx="2"
                  />

                  {/* Distinct Bold Median Line */}
                  <line
                    x1={xCenter - boxWidth / 2}
                    y1={yMed}
                    x2={xCenter + boxWidth / 2}
                    y2={yMed}
                    stroke="#ffffff"
                    strokeWidth="2.8"
                    strokeLinecap="square"
                  />

                  {/* Optional Outlier Dots */}
                  {Array.isArray(plot.outliers) &&
                    plot.outliers.map((outVal, oIdx) => (
                      <circle
                        key={`v-out-${pIdx}-${oIdx}`}
                        cx={xCenter}
                        cy={toY(outVal)}
                        r={4}
                        fill="#fbbf24"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      >
                        <title>{`Outlier: ${outVal}`}</title>
                      </circle>
                    ))}

                  {/* Series Label beneath X-axis */}
                  {plot.label && (
                    <text
                      x={xCenter}
                      y={margin.top + plotHeight + 24}
                      fill="#f1f5f9"
                      fontSize="13"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {plot.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Caption */}
        {spec.caption && (
          <div className="mt-1.5 text-xs text-slate-400 text-center italic px-2">
            {spec.caption}
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // HORIZONTAL ORIENTATION (Values along X-axis)
  // ============================================
  const svgWidth = 520;
  const svgHeight = Math.max(260, 90 + plots.length * 60);
  const margin = {
    top: 25,
    right: 35,
    bottom: spec.axisLabel ? 62 : 45,
    left: 85,
  };

  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const toX = (val) => margin.left + ((val - valMin) / valSpan) * plotWidth;
  const slotHeight = plotHeight / plots.length;
  const boxHeight = Math.min(42, slotHeight * 0.52);
  const capHeight = boxHeight * 0.65;

  return (
    <div className="w-full flex flex-col items-center my-2">
      {spec.title && (
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          {spec.title}
        </div>
      )}

      <div className="w-full max-w-[540px] bg-slate-950 rounded-xl border border-slate-800 shadow-inner overflow-hidden flex items-center justify-center p-3">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Gridlines and X-axis Ticks */}
          {ticks.map((t, idx) => {
            const x = toX(t);
            return (
              <g key={`grid-x-${idx}`}>
                {/* Subtle vertical gridline */}
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={margin.top + plotHeight}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  strokeOpacity="0.45"
                />
                {/* Tick mark */}
                <line
                  x1={x}
                  y1={margin.top + plotHeight}
                  x2={x}
                  y2={margin.top + plotHeight + 5}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                {/* Tick number */}
                <text
                  x={x}
                  y={margin.top + plotHeight + 18}
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="middle"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* X-Axis Line */}
          <line
            x1={margin.left}
            y1={margin.top + plotHeight}
            x2={margin.left + plotWidth}
            y2={margin.top + plotHeight}
            stroke="#64748b"
            strokeWidth="1.5"
          />

          {/* Left Y-Axis Guide Line */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + plotHeight}
            stroke="#64748b"
            strokeWidth="1.5"
          />

          {/* X-Axis Label */}
          {spec.axisLabel && (
            <text
              x={margin.left + plotWidth / 2}
              y={margin.top + plotHeight + 42}
              fill="#cbd5e1"
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
            >
              {spec.axisLabel}
            </text>
          )}

          {/* Parallel Box Plots */}
          {plots.map((plot, pIdx) => {
            const yCenter = margin.top + (pIdx + 0.5) * slotHeight;
            const color = plot.color || DEFAULT_SERIES_COLORS[pIdx % DEFAULT_SERIES_COLORS.length];

            const xMin = toX(plot.min);
            const xQ1 = toX(plot.q1);
            const xMed = toX(plot.median);
            const xQ3 = toX(plot.q3);
            const xMax = toX(plot.max);

            const boxLeft = xQ1;
            const boxSpan = Math.max(1, xQ3 - xQ1);

            return (
              <g key={`h-plot-${pIdx}`}>
                <title>
                  {`${plot.label || `Series ${pIdx + 1}`}: Min ${plot.min}, Q1 ${plot.q1}, Med ${plot.median}, Q3 ${plot.q3}, Max ${plot.max}`}
                </title>

                {/* Series Label to the left of the plot area */}
                {plot.label && (
                  <text
                    x={margin.left - 12}
                    y={yCenter}
                    fill="#f1f5f9"
                    fontSize="13"
                    fontWeight="bold"
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {plot.label}
                  </text>
                )}

                {/* Lower Whisker Stem (min to q1) */}
                <line
                  x1={xMin}
                  y1={yCenter}
                  x2={xQ1}
                  y2={yCenter}
                  stroke={color}
                  strokeWidth="1.8"
                />
                {/* Lower Whisker End-Cap */}
                <line
                  x1={xMin}
                  y1={yCenter - capHeight / 2}
                  x2={xMin}
                  y2={yCenter + capHeight / 2}
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Upper Whisker Stem (q3 to max) */}
                <line
                  x1={xQ3}
                  y1={yCenter}
                  x2={xMax}
                  y2={yCenter}
                  stroke={color}
                  strokeWidth="1.8"
                />
                {/* Upper Whisker End-Cap */}
                <line
                  x1={xMax}
                  y1={yCenter - capHeight / 2}
                  x2={xMax}
                  y2={yCenter + capHeight / 2}
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* IQR Box */}
                <rect
                  x={boxLeft}
                  y={yCenter - boxHeight / 2}
                  width={boxSpan}
                  height={boxHeight}
                  fill={color}
                  fillOpacity="0.22"
                  stroke={color}
                  strokeWidth="2"
                  rx="2"
                />

                {/* Distinct Bold Median Line */}
                <line
                  x1={xMed}
                  y1={yCenter - boxHeight / 2}
                  x2={xMed}
                  y2={yCenter + boxHeight / 2}
                  stroke="#ffffff"
                  strokeWidth="2.8"
                  strokeLinecap="square"
                />

                {/* Optional Outlier Dots */}
                {Array.isArray(plot.outliers) &&
                  plot.outliers.map((outVal, oIdx) => (
                    <circle
                      key={`h-out-${pIdx}-${oIdx}`}
                      cx={toX(outVal)}
                      cy={yCenter}
                      r={4}
                      fill="#fbbf24"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    >
                      <title>{`Outlier: ${outVal}`}</title>
                    </circle>
                  ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Caption */}
      {spec.caption && (
        <div className="mt-1.5 text-xs text-slate-400 text-center italic px-2">
          {spec.caption}
        </div>
      )}
    </div>
  );
}

/**
 * BarChartDiagram Sub-component
 *
 * Renders discrete column/bar graphs and continuous histograms.
 * Matches the dark-slate / indigo aesthetic of BoxPlotDiagram.
 */
function BarChartDiagram({ spec }) {
  const bars = Array.isArray(spec.bars) ? spec.bars : [];
  if (bars.length === 0) return null;

  const chartType = spec.chartType === 'histogram' ? 'histogram' : 'bar';
  const isHistogram = chartType === 'histogram';

  // Determine bar gap ratio (default 0 for histogram, 0.28 for discrete bar)
  const barGap = Number.isFinite(spec.barGap)
    ? Math.max(0, Math.min(0.8, Number(spec.barGap)))
    : isHistogram
      ? 0
      : 0.28;

  // Resolve Y-axis domain
  let yMin = 0;
  let yMax = 10;
  if (Array.isArray(spec.yDomain) && spec.yDomain.length === 2 && Number.isFinite(spec.yDomain[0]) && Number.isFinite(spec.yDomain[1])) {
    yMin = Number(spec.yDomain[0]);
    yMax = Number(spec.yDomain[1]);
  } else if (Array.isArray(spec.domain) && spec.domain.length === 2 && Number.isFinite(spec.domain[0]) && Number.isFinite(spec.domain[1])) {
    yMin = Number(spec.domain[0]);
    yMax = Number(spec.domain[1]);
  } else {
    const maxVal = bars.reduce((acc, b) => Math.max(acc, Number.isFinite(b.value) ? b.value : 0), 0);
    yMax = maxVal > 0 ? Math.ceil(maxVal * 1.1) : 10;
  }
  if (yMax <= yMin) yMax = yMin + 10;

  const yDomain = [yMin, yMax];
  const yStep = resolveStep(spec.yStep || spec.step, yDomain);
  const majorTicks = generateTicks(yDomain, yStep);

  // Minor ticks for readable precision
  const minorTicks = [];
  if (yStep > 1) {
    let minorStep = 1;
    if (yStep % 2 === 0) minorStep = yStep / 2;
    else if (yStep % 5 === 0) minorStep = yStep / 5;

    const majorTickSet = new Set(majorTicks);
    for (let val = Math.ceil(yMin / minorStep) * minorStep; val <= yMax + 1e-9; val += minorStep) {
      const rounded = Math.round(val * 1e6) / 1e6;
      if (!majorTickSet.has(rounded) && rounded >= yMin && rounded <= yMax) {
        minorTicks.push(rounded);
      }
    }
  }

  const xAxisLabel = spec.xAxisLabel || spec.xLabel;
  const yAxisLabel = spec.yAxisLabel || spec.yLabel || spec.axisLabel;
  const showValues = Boolean(spec.showValues);

  const svgWidth = 520;
  const svgHeight = 330;
  const margin = {
    top: showValues ? 32 : 25,
    right: 25,
    bottom: xAxisLabel ? 60 : 45,
    left: yAxisLabel ? 70 : 55,
  };

  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;
  const valSpan = Math.max(yMax - yMin, 0.001);

  const toY = (val) => margin.top + ((yMax - val) / valSpan) * plotHeight;
  const yBaseline = toY(Math.max(0, yMin));

  const slotWidth = plotWidth / bars.length;
  const barWidth = slotWidth * (1 - barGap);
  const barOffset = (slotWidth - barWidth) / 2;

  // Support continuous class boundaries for histograms if provided
  const hasClassBoundaries = Array.isArray(spec.classBoundaries) && spec.classBoundaries.length === bars.length + 1;

  return (
    <div className="w-full flex flex-col items-center my-2">
      {spec.title && (
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
          {spec.title}
        </div>
      )}

      <div className="w-full max-w-[540px] bg-slate-950 rounded-xl border border-slate-800 shadow-inner overflow-hidden flex items-center justify-center p-3">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Minor Horizontal Gridlines */}
          {minorTicks.map((t, idx) => {
            const y = toY(t);
            return (
              <g key={`minor-grid-y-${idx}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + plotWidth}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="1 4"
                  strokeOpacity="0.22"
                />
                {/* Minor Tick Mark */}
                <line
                  x1={margin.left - 3}
                  y1={y}
                  x2={margin.left}
                  y2={y}
                  stroke="#475569"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Major Horizontal Gridlines and Y-axis Ticks */}
          {majorTicks.map((t, idx) => {
            const y = toY(t);
            return (
              <g key={`grid-y-${idx}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + plotWidth}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  strokeOpacity="0.45"
                />
                {/* Major Tick Mark */}
                <line
                  x1={margin.left - 5}
                  y1={y}
                  x2={margin.left}
                  y2={y}
                  stroke="#64748b"
                  strokeWidth="1.5"
                />
                {/* Major Tick Number */}
                <text
                  x={margin.left - 9}
                  y={y}
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                >
                  {t}
                </text>
              </g>
            );
          })}

          {/* Left Y-Axis Line */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + plotHeight}
            stroke="#64748b"
            strokeWidth="1.5"
          />

          {/* Bottom Baseline / X-Axis Line */}
          <line
            x1={margin.left}
            y1={margin.top + plotHeight}
            x2={margin.left + plotWidth}
            y2={margin.top + plotHeight}
            stroke="#64748b"
            strokeWidth="1.5"
          />

          {/* Y-Axis Label */}
          {yAxisLabel && (
            <text
              transform="rotate(-90)"
              x={-(margin.top + plotHeight / 2)}
              y={20}
              fill="#cbd5e1"
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
            >
              {yAxisLabel}
            </text>
          )}

          {/* Bars */}
          {bars.map((bar, i) => {
            const val = Number.isFinite(bar.value) ? bar.value : 0;
            const barX = margin.left + i * slotWidth + barOffset;
            const barY = toY(Math.max(val, yMin));
            const rawHeight = Math.abs(toY(val) - yBaseline);
            const bHeight = Math.max(rawHeight, val > 0 ? 1 : 0);
            const color = bar.color || spec.barColor || DEFAULT_SERIES_COLORS[0];
            const rx = isHistogram || barGap === 0 ? 0 : 3;

            return (
              <g key={`bar-${i}`} className="transition-opacity hover:opacity-95">
                <title>{`${bar.label ?? `Bin ${i + 1}`}: ${val}`}</title>
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={bHeight}
                  fill={color}
                  fillOpacity="0.82"
                  stroke={color}
                  strokeWidth="1.5"
                  rx={rx}
                />
                {/* Optional bar value label */}
                {showValues && (
                  <text
                    x={barX + barWidth / 2}
                    y={barY - 6}
                    fill="#e2e8f0"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  >
                    {val}
                  </text>
                )}
              </g>
            );
          })}

          {/* X-Axis Ticks & Labels */}
          {hasClassBoundaries ? (
            // Continuous class-boundary ticks (for histograms)
            spec.classBoundaries.map((boundary, bIdx) => {
              const xPos = margin.left + bIdx * slotWidth;
              return (
                <g key={`boundary-tick-${bIdx}`}>
                  <line
                    x1={xPos}
                    y1={margin.top + plotHeight}
                    x2={xPos}
                    y2={margin.top + plotHeight + 5}
                    stroke="#64748b"
                    strokeWidth="1.5"
                  />
                  <text
                    x={xPos}
                    y={margin.top + plotHeight + 18}
                    fill="#94a3b8"
                    fontSize="11"
                    textAnchor="middle"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  >
                    {boundary}
                  </text>
                </g>
              );
            })
          ) : (
            // Discrete Category Ticks centered beneath each column
            bars.map((bar, i) => {
              const xCenter = margin.left + (i + 0.5) * slotWidth;
              const label = bar.label !== undefined ? String(bar.label) : String(i + 1);

              return (
                <g key={`x-tick-${i}`}>
                  <line
                    x1={xCenter}
                    y1={margin.top + plotHeight}
                    x2={xCenter}
                    y2={margin.top + plotHeight + 5}
                    stroke="#64748b"
                    strokeWidth="1.5"
                  />
                  <text
                    x={xCenter}
                    y={margin.top + plotHeight + 18}
                    fill="#94a3b8"
                    fontSize="11"
                    textAnchor="middle"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  >
                    {label}
                  </text>
                </g>
              );
            })
          )}

          {/* X-Axis Label */}
          {xAxisLabel && (
            <text
              x={margin.left + plotWidth / 2}
              y={margin.top + plotHeight + 42}
              fill="#cbd5e1"
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
            >
              {xAxisLabel}
            </text>
          )}
        </svg>
      </div>

      {/* Caption */}
      {spec.caption && (
        <div className="mt-1.5 text-xs text-slate-400 text-center italic px-2">
          {spec.caption}
        </div>
      )}
    </div>
  );
}

/**
 * Main Declarative Statistics Diagram Component
 *
 * Dispatches to the appropriate renderer based on `spec.chartType`:
 * - 'boxplot' (supported)
 * - 'bar', 'histogram', 'column' (supported)
 * - 'ogive', 'scatter', 'venn', 'tree', 'normal', 'stem_leaf' (extensible stubs)
 */
export default function StatsDiagram({ spec }) {
  if (!spec) return null;

  const chartType = spec.chartType || 'boxplot';

  switch (chartType) {
    case 'boxplot':
      return <BoxPlotDiagram spec={spec} />;
    case 'bar':
    case 'histogram':
    case 'column':
      return <BarChartDiagram spec={spec} />;
    default:
      console.warn(`[StatsDiagram] Unsupported or unhandled chartType: "${chartType}"`);
      return null;
  }
}
