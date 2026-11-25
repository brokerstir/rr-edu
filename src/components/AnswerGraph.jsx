import { useId } from 'react';

/**
 * Safely parses and evaluates an expression string for a given variable x.
 * Supports standard expressions like:
 * - "2*x - 4"
 * - "(2*x - 3)/(x - 2)"
 * - "x^2 - 4*x + 3"
 * - "Math.exp(x)", "Math.sin(x)", "Math.cos(x)", "Math.abs(x)", "Math.sqrt(x)", "Math.log(x)"
 */
function createFunctionEvaluator(exprStr) {
  if (typeof exprStr !== 'string') return () => NaN;

  // Transform ^ to ** for JS power syntax
  let jsExpr = exprStr.replace(/\^/g, '**');

  // Insert implicit multiplication e.g. 2x -> 2*x, 4(x) -> 4*(x), (x+1)(x-1) -> (x+1)*(x-1)
  // Run before prefixing Math.* so log2 is not mangled into log*2
  jsExpr = jsExpr.replace(/(?<![a-zA-Z0-9_.])(\d)\s*([a-zA-Z(])/g, '$1*$2');
  jsExpr = jsExpr.replace(/(\))\s*([a-zA-Z0-9(])/g, '$1*$2');

  // Allow safe math keywords (longer names first to avoid sub-matching)
  const allowedMath = ['log10', 'log2', 'abs', 'sin', 'cos', 'tan', 'sqrt', 'exp', 'log', 'pow', 'PI', 'E'];
  allowedMath.forEach((fn) => {
    // Replace bare function name e.g. abs(x) -> Math.abs(x) if not already Math.abs
    const regex = new RegExp(`(?<!Math\\.)\\b${fn}\\b`, 'g');
    jsExpr = jsExpr.replace(regex, `Math.${fn}`);
  });

  try {
    // Create evaluator with strictly controlled scope
    const fn = new Function('x', 'Math', `
      try {
        const val = Number(${jsExpr});
        return Number.isFinite(val) ? val : NaN;
      } catch (e) {
        return NaN;
      }
    `);
    return (x) => fn(x, Math);
  } catch (err) {
    console.warn(`[AnswerGraph] Failed to compile expression: "${exprStr}"`, err);
    return () => NaN;
  }
}

/**
 * AnswerGraph Component
 * Declarative SVG graph renderer for math solutions & sketched functions.
 *
 * @param {Object} props
 * @param {Object} props.spec
 *   @param {number[]} props.spec.domain - [xMin, xMax] (default [-5, 5])
 *   @param {number[]} props.spec.range - [yMin, yMax] (default [-5, 5])
 *   @param {number} [props.spec.xStep=1] - Grid/tick step on x-axis
 *   @param {number} [props.spec.yStep=1] - Grid/tick step on y-axis
 *   @param {string} [props.spec.xLabel='x'] - Axis label for x
 *   @param {string} [props.spec.yLabel='y'] - Axis label for y
 *   @param {string} [props.spec.title] - Optional graph title
 *   @param {string} [props.spec.caption] - Optional descriptive caption below graph
 *   @param {Array} [props.spec.functions] - Array of { expr, color, domain, label, strokeWidth, dashed }
 *   @param {Array} [props.spec.asymptotes] - Array of { axis: 'x'|'y', value, label, color }
 *   @param {Array} [props.spec.points] - Array of { x, y, label, open, color, labelPos }
 *   @param {Array} [props.spec.segments] - Array of { points: [[x1,y1], ...], label, color, dashed }
 */
export default function AnswerGraph({ spec }) {
  const clipId = useId();

  if (!spec) return null;

  const domain = spec.domain && spec.domain.length === 2 ? spec.domain : [-5, 5];
  const range = spec.range && spec.range.length === 2 ? spec.range : [-5, 5];

  const xMin = Number(domain[0]);
  const xMax = Number(domain[1]);
  const yMin = Number(range[0]);
  const yMax = Number(range[1]);

  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;

  // ViewBox layout dimensions
  const width = 480;
  const height = 360;
  const padding = { top: 24, right: 30, bottom: 32, left: 38 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Coordinate transforms (math space -> SVG space)
  const toSvgX = (x) => padding.left + ((x - xMin) / xSpan) * plotWidth;
  const toSvgY = (y) => padding.top + ((yMax - y) / ySpan) * plotHeight;

  // Axis positions in SVG coordinates
  const originX = toSvgX(0);
  const originY = toSvgY(0);

  // Clamped positions for axis lines if 0 is out of bounds
  const xAxisY = Math.max(padding.top, Math.min(height - padding.bottom, originY));
  const yAxisX = Math.max(padding.left, Math.min(width - padding.right, originX));

  // Determine tick steps
  const xStep = spec.xStep || (xSpan <= 10 ? 1 : Math.ceil(xSpan / 10));
  const yStep = spec.yStep || (ySpan <= 10 ? 1 : Math.ceil(ySpan / 10));

  // Generate grid ticks
  const xTicks = [];
  const startX = Math.ceil(xMin / xStep) * xStep;
  for (let x = startX; x <= xMax; x += xStep) {
    // Avoid floating point jitter
    const val = Math.round(x * 1000) / 1000;
    xTicks.push(val);
  }

  const yTicks = [];
  const startY = Math.ceil(yMin / yStep) * yStep;
  for (let y = startY; y <= yMax; y += yStep) {
    const val = Math.round(y * 1000) / 1000;
    yTicks.push(val);
  }

  // Pre-sample function curves into SVG path strings with asymptote jump detection
  const functionPaths = (spec.functions || []).map((fnSpec) => {
    const evaluator = createFunctionEvaluator(fnSpec.expr);
    const subDomain = fnSpec.domain || [xMin, xMax];
    const subXMin = Math.max(xMin, subDomain[0]);
    const subXMax = Math.min(xMax, subDomain[1]);

    const numSamples = 300;
    const step = (subXMax - subXMin) / numSamples;
    const segments = [];
    let currentSegment = [];

    const yPixelSpan = plotHeight;

    for (let i = 0; i <= numSamples; i++) {
      const x = subXMin + i * step;
      const y = evaluator(x);

      if (y === null || isNaN(y) || !isFinite(y)) {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
        continue;
      }

      // Check for extreme vertical jumps (asymptotes)
      if (currentSegment.length > 0) {
        const prevPt = currentSegment[currentSegment.length - 1];
        const prevSvgY = toSvgY(prevPt[1]);
        const currSvgY = toSvgY(y);
        // If jump between consecutive samples is greater than 80% of plot height and opposite directions
        if (Math.abs(currSvgY - prevSvgY) > yPixelSpan * 0.75) {
          segments.push(currentSegment);
          currentSegment = [];
        }
      }

      currentSegment.push([x, y]);
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    // Convert segments into SVG 'M x y L x y ...' paths
    const dStrings = segments.map((seg) => {
      return seg
        .map((pt, idx) => {
          const sx = toSvgX(pt[0]).toFixed(1);
          const sy = toSvgY(pt[1]).toFixed(1);
          return `${idx === 0 ? 'M' : 'L'} ${sx} ${sy}`;
        })
        .join(' ');
    });

    return {
      spec: fnSpec,
      d: dStrings.join(' '),
    };
  });

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto my-3 select-none">
      <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-xl border border-slate-800 shadow-inner overflow-hidden p-2">
        {spec.title && (
          <div className="absolute top-2 left-3 text-xs font-semibold text-slate-300">
            {spec.title}
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full text-slate-400 font-mono text-[10px]"
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x={padding.left}
                y={padding.top}
                width={plotWidth}
                height={plotHeight}
              />
            </clipPath>
          </defs>

          {/* Background Gridlines */}
          <g className="stroke-slate-900/90" strokeWidth="1">
            {xTicks.map((x) => {
              const sx = toSvgX(x);
              return <line key={`gx-${x}`} x1={sx} y1={padding.top} x2={sx} y2={height - padding.bottom} />;
            })}
            {yTicks.map((y) => {
              const sy = toSvgY(y);
              return <line key={`gy-${y}`} x1={padding.left} y1={sy} x2={width - padding.right} y2={sy} />;
            })}
          </g>

          {/* Coordinate Axes */}
          <g className="stroke-slate-600" strokeWidth="1.5">
            {/* X Axis */}
            <line
              x1={padding.left}
              y1={xAxisY}
              x2={width - padding.right}
              y2={xAxisY}
            />
            {/* Y Axis */}
            <line
              x1={yAxisX}
              y1={padding.top}
              x2={yAxisX}
              y2={height - padding.bottom}
            />
          </g>

          {/* Axis Arrowheads / Markers */}
          <text
            x={width - padding.right + 6}
            y={xAxisY + 3}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="sans-serif"
            fontWeight="bold"
          >
            {spec.xLabel || 'x'}
          </text>
          <text
            x={yAxisX - 4}
            y={padding.top - 6}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="sans-serif"
            fontWeight="bold"
            textAnchor="middle"
          >
            {spec.yLabel || 'y'}
          </text>

          {/* Tick Labels */}
          <g fill="#64748b" fontSize="9" textAnchor="middle">
            {xTicks.map((x) => {
              if (x === 0) return null; // Avoid overlapping 0
              const sx = toSvgX(x);
              return (
                <text key={`tx-${x}`} x={sx} y={xAxisY + 12}>
                  {x}
                </text>
              );
            })}
            {yTicks.map((y) => {
              if (y === 0) return null;
              const sy = toSvgY(y);
              return (
                <text key={`ty-${y}`} x={yAxisX - 8} y={sy + 3} textAnchor="end">
                  {y}
                </text>
              );
            })}
            {/* Origin label if visible */}
            {xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0 && (
              <text x={originX - 6} y={originY + 11} fill="#475569" fontSize="8" textAnchor="end">
                0
              </text>
            )}
          </g>

          {/* Plot Content (Clipped to Plot Area) */}
          <g clipPath={`url(#${clipId})`}>
            {/* Asymptotes */}
            {(spec.asymptotes || []).map((asymp, idx) => {
              const isX = asymp.axis === 'x';
              const color = asymp.color || '#f43f5e'; // default rose-500
              const val = Number(asymp.value);
              const sx1 = isX ? toSvgX(val) : padding.left;
              const sy1 = isX ? padding.top : toSvgY(val);
              const sx2 = isX ? toSvgX(val) : width - padding.right;
              const sy2 = isX ? height - padding.bottom : toSvgY(val);

              return (
                <g key={`asymp-${idx}`}>
                  <line
                    x1={sx1}
                    y1={sy1}
                    x2={sx2}
                    y2={sy2}
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    strokeOpacity="0.85"
                  />
                </g>
              );
            })}

            {/* Segments (arbitrary polylines or polygon shapes) */}
            {(spec.segments || []).map((seg, idx) => {
              const pts = (seg.points || []).map((p) => `${toSvgX(p[0])},${toSvgY(p[1])}`).join(' ');
              return (
                <polyline
                  key={`seg-${idx}`}
                  points={pts}
                  fill="none"
                  stroke={seg.color || '#818cf8'}
                  strokeWidth={seg.strokeWidth || 2}
                  strokeDasharray={seg.dashed ? '4 4' : undefined}
                />
              );
            })}

            {/* Function Curves */}
            {functionPaths.map((fn, idx) => (
              <path
                key={`fn-${idx}`}
                d={fn.d}
                fill="none"
                stroke={fn.spec.color || '#38bdf8'} // default sky-400
                strokeWidth={fn.spec.strokeWidth || 2.2}
                strokeDasharray={fn.spec.dashed ? '4 4' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Discrete Plotted Points */}
            {(spec.points || []).map((pt, idx) => {
              const sx = toSvgX(pt.x);
              const sy = toSvgY(pt.y);
              const isOpen = Boolean(pt.open);
              const pointColor = pt.color || '#818cf8'; // indigo-400

              return (
                <g key={`pt-${idx}`}>
                  <circle
                    cx={sx}
                    cy={sy}
                    r={4}
                    fill={isOpen ? '#020617' : pointColor}
                    stroke={pointColor}
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </g>

          {/* Labels & Annotations (Rendered above clip path so text is not cut off at edge) */}
          {/* Asymptote Labels */}
          {(spec.asymptotes || []).map((asymp, idx) => {
            if (!asymp.label) return null;
            const isX = asymp.axis === 'x';
            const color = asymp.color || '#f43f5e';
            const val = Number(asymp.value);
            const lx = isX ? toSvgX(val) + 4 : width - padding.right - 4;
            const ly = isX ? padding.top + 14 + (idx * 12) : toSvgY(val) - 4;
            const textAnchor = isX ? 'start' : 'end';

            return (
              <text
                key={`asymp-lbl-${idx}`}
                x={lx}
                y={ly}
                fill={color}
                fontSize="9"
                fontWeight="bold"
                textAnchor={textAnchor}
              >
                {asymp.label}
              </text>
            );
          })}

          {/* Function Curve Labels */}
          {(spec.functions || []).map((fn, idx) => {
            if (!fn.label) return null;
            const color = fn.color || '#38bdf8';
            return (
              <text
                key={`fn-lbl-${idx}`}
                x={width - padding.right - 6}
                y={padding.top + 14 + idx * 14}
                fill={color}
                fontSize="10"
                fontWeight="bold"
                textAnchor="end"
              >
                {fn.label}
              </text>
            );
          })}

          {/* Point Labels */}
          {(spec.points || []).map((pt, idx) => {
            if (!pt.label) return null;
            const sx = toSvgX(pt.x);
            const sy = toSvgY(pt.y);
            const pos = pt.labelPos || 'top'; // 'top' | 'bottom' | 'left' | 'right'

            let dx = 0;
            let dy = -8;
            let anchor = 'middle';

            if (pos === 'bottom') {
              dy = 12;
            } else if (pos === 'left') {
              dx = -8;
              dy = 3;
              anchor = 'end';
            } else if (pos === 'right') {
              dx = 8;
              dy = 3;
              anchor = 'start';
            }

            return (
              <text
                key={`pt-lbl-${idx}`}
                x={sx + dx}
                y={sy + dy}
                fill="#e2e8f0"
                fontSize="9"
                fontWeight="600"
                textAnchor={anchor}
                className="drop-shadow"
              >
                {pt.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Caption beneath graph */}
      {spec.caption && (
        <div className="mt-1.5 text-xs text-slate-400 text-center italic px-2">
          {spec.caption}
        </div>
      )}
    </div>
  );
}
