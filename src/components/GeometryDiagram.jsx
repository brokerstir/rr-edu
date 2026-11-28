/**
 * GeometryDiagram.jsx
 *
 * Declarative SVG geometry diagram component for geometry and trigonometry questions.
 * Handles coordinate transformation (standard math coordinates with +y pointing UP),
 * automatic bounding box calculation, responsive scaling, right angle square markers,
 * angle arcs with labels, segment labels, point labels, circles/arcs, and captions.
 */

export default function GeometryDiagram({ spec }) {
  if (!spec) return null;

  const pointsList = spec.points || [];
  const segmentsList = spec.segments || [];
  const rightAnglesList = spec.rightAngles || [];
  const anglesList = spec.angles || [];
  const circlesList = spec.circles || [];
  const ellipsesList = spec.ellipses || spec.ellipticalArcs || [];

  if (pointsList.length === 0 && circlesList.length === 0 && ellipsesList.length === 0) return null;

  // 1. Build lookup dictionary for points by ID
  const pointMap = {};
  pointsList.forEach((pt) => {
    pointMap[pt.id] = { x: Number(pt.x), y: Number(pt.y), ...pt };
  });

  // 2. Compute bounding box in math coordinates (+y up)
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  pointsList.forEach((pt) => {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  });

  circlesList.forEach((c) => {
    const cx = Number(c.cx || 0);
    const cy = Number(c.cy || 0);
    const r = Number(c.r || 0);
    if (cx - r < minX) minX = cx - r;
    if (cx + r > maxX) maxX = cx + r;
    if (cy - r < minY) minY = cy - r;
    if (cy + r > maxY) maxY = cy + r;
  });

  ellipsesList.forEach((el) => {
    const cx = Number(el.cx || 0);
    const cy = Number(el.cy || 0);
    const rx = Number(el.rx || 0);
    const ry = Number(el.ry || 0);
    if (cx - rx < minX) minX = cx - rx;
    if (cx + rx > maxX) maxX = cx + rx;
    if (cy - ry < minY) minY = cy - ry;
    if (cy + ry > maxY) maxY = cy + ry;
  });

  if (!isFinite(minX)) {
    minX = -5;
    maxX = 5;
    minY = -5;
    maxY = 5;
  }

  // Ensure non-zero spans
  const spanX = Math.max(maxX - minX, 0.001);
  const spanY = Math.max(maxY - minY, 0.001);

  // Layout parameters for responsive SVG viewBox
  const viewBoxWidth = 420;
  const viewBoxHeight = 300;
  const padding = spec.padding !== undefined ? spec.padding : 48; // Padding in SVG units to prevent label clipping

  const availableWidth = viewBoxWidth - padding * 2;
  const availableHeight = viewBoxHeight - padding * 2;

  // Uniform aspect ratio scale
  const scale = Math.min(availableWidth / spanX, availableHeight / spanY);

  // Centering offsets
  const contentWidthSvg = spanX * scale;
  const contentHeightSvg = spanY * scale;

  const offsetX = padding + (availableWidth - contentWidthSvg) / 2;
  const offsetY = padding + (availableHeight - contentHeightSvg) / 2;

  // Math (+y UP) to SVG (+y DOWN) coordinate converter
  const toSvgX = (x) => offsetX + (x - minX) * scale;
  const toSvgY = (y) => offsetY + (maxY - y) * scale;

  // Vector helper functions
  const normalize = (vx, vy) => {
    const len = Math.hypot(vx, vy);
    return len === 0 ? [0, 0] : [vx / len, vy / len];
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto my-3 select-none">
      <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-xl border border-slate-800 shadow-inner overflow-hidden p-2 flex items-center justify-center">
        {spec.title && (
          <div className="absolute top-2.5 left-3.5 text-xs font-semibold text-slate-300">
            {spec.title}
          </div>
        )}

        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-full font-sans"
        >
          {/* Optional background grid / axes if specified */}
          {spec.showAxes && (
            <g stroke="#334155" strokeWidth="1" strokeDasharray="3 3">
              <line x1={0} y1={toSvgY(0)} x2={viewBoxWidth} y2={toSvgY(0)} />
              <line x1={toSvgX(0)} y1={0} x2={toSvgX(0)} y2={viewBoxHeight} />
            </g>
          )}

          {/* Circles & circular arcs */}
          {circlesList.map((c, idx) => {
            const scx = toSvgX(c.cx || 0);
            const scy = toSvgY(c.cy || 0);
            const sr = (c.r || 1) * scale;
            const strokeColor = c.color || '#94a3b8';

            if (c.startAngle !== undefined && c.endAngle !== undefined) {
              // Convert angles (in degrees, math convention CCW from +x)
              const startRad = (c.startAngle * Math.PI) / 180;
              const endRad = (c.endAngle * Math.PI) / 180;

              const x1 = scx + sr * Math.cos(startRad);
              const y1 = scy - sr * Math.sin(startRad);
              const x2 = scx + sr * Math.cos(endRad);
              const y2 = scy - sr * Math.sin(endRad);

              let angleDiff = c.endAngle - c.startAngle;
              while (angleDiff < 0) angleDiff += 360;
              const largeArcFlag = angleDiff > 180 ? 1 : 0;

              return (
                <path
                  key={`circle-arc-${idx}`}
                  d={`M ${x1} ${y1} A ${sr} ${sr} 0 ${largeArcFlag} 0 ${x2} ${y2}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={c.strokeWidth || 1.8}
                  strokeDasharray={c.dashed ? '4 4' : undefined}
                />
              );
            }

            return (
              <circle
                key={`circle-${idx}`}
                cx={scx}
                cy={scy}
                r={sr}
                fill={c.fill || 'none'}
                stroke={strokeColor}
                strokeWidth={c.strokeWidth || 1.8}
                strokeDasharray={c.dashed ? '4 4' : undefined}
              />
            );
          })}

          {/* Ellipses & Elliptical Arcs for 3D curved surfaces */}
          {ellipsesList.map((el, idx) => {
            const scx = toSvgX(el.cx || 0);
            const scy = toSvgY(el.cy || 0);
            const srx = (el.rx || 1) * scale;
            const sry = (el.ry || 1) * scale;
            const strokeColor = el.color || '#94a3b8';

            if (el.startAngle !== undefined && el.endAngle !== undefined) {
              // Convert angles (in degrees, math convention CCW from +x axis)
              const startRad = (el.startAngle * Math.PI) / 180;
              const endRad = (el.endAngle * Math.PI) / 180;

              const x1 = scx + srx * Math.cos(startRad);
              const y1 = scy - sry * Math.sin(startRad);
              const x2 = scx + srx * Math.cos(endRad);
              const y2 = scy - sry * Math.sin(endRad);

              let angleDiff = el.endAngle - el.startAngle;
              while (angleDiff < 0) angleDiff += 360;
              const largeArcFlag = angleDiff > 180 ? 1 : 0;

              return (
                <path
                  key={`ellipse-arc-${idx}`}
                  d={`M ${x1} ${y1} A ${srx} ${sry} 0 ${largeArcFlag} 0 ${x2} ${y2}`}
                  fill={el.fill || 'none'}
                  stroke={strokeColor}
                  strokeWidth={el.strokeWidth || 1.8}
                  strokeDasharray={el.dashed ? '4 4' : undefined}
                />
              );
            }

            return (
              <ellipse
                key={`ellipse-${idx}`}
                cx={scx}
                cy={scy}
                rx={srx}
                ry={sry}
                fill={el.fill || 'none'}
                stroke={strokeColor}
                strokeWidth={el.strokeWidth || 1.8}
                strokeDasharray={el.dashed ? '4 4' : undefined}
              />
            );
          })}

          {/* Right Angle Markers */}
          {rightAnglesList.map((ra, idx) => {
            const v = pointMap[ra.vertex];
            const a1 = pointMap[ra.arm1];
            const a2 = pointMap[ra.arm2];
            if (!v || !a1 || !a2) return null;

            const [u1x, u1y] = normalize(a1.x - v.x, a1.y - v.y);
            const [u2x, u2y] = normalize(a2.x - v.x, a2.y - v.y);

            // Size of square marker in math units or SVG units
            const markerSvgSize = ra.size || 14;
            const markerMathSize = markerSvgSize / scale;

            // Math coordinates of square corner points
            const p1x = v.x + u1x * markerMathSize;
            const p1y = v.y + u1y * markerMathSize;

            const pCornerX = v.x + (u1x + u2x) * markerMathSize;
            const pCornerY = v.y + (u1y + u2y) * markerMathSize;

            const p2x = v.x + u2x * markerMathSize;
            const p2y = v.y + u2y * markerMathSize;

            const color = ra.color || '#cbd5e1';

            return (
              <polyline
                key={`right-angle-${idx}`}
                points={`${toSvgX(p1x)},${toSvgY(p1y)} ${toSvgX(pCornerX)},${toSvgY(pCornerY)} ${toSvgX(p2x)},${toSvgY(p2y)}`}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Angle Arcs and Angle Labels */}
          {anglesList.map((ang, idx) => {
            const v = pointMap[ang.vertex];
            const pFrom = pointMap[ang.from];
            const pTo = pointMap[ang.to];
            if (!v || !pFrom || !pTo) return null;

            const angFrom = Math.atan2(pFrom.y - v.y, pFrom.x - v.x);
            let angTo = Math.atan2(pTo.y - v.y, pTo.x - v.x);

            // Calculate positive sweep angle in counter-clockwise direction
            let sweep = angTo - angFrom;
            while (sweep < 0) sweep += 2 * Math.PI;

            // Arc radius in SVG pixels
            const rSvg = ang.radius || 24;
            const rMath = rSvg / scale;

            // Math coordinates of arc endpoints
            const arcStartMathX = v.x + Math.cos(angFrom) * rMath;
            const arcStartMathY = v.y + Math.sin(angFrom) * rMath;

            const arcEndMathX = v.x + Math.cos(angTo) * rMath;
            const arcEndMathY = v.y + Math.sin(angTo) * rMath;

            // In SVG coordinates (+y down), counter-clockwise in math is clockwise in SVG, so sweepFlag = 0
            const sx1 = toSvgX(arcStartMathX);
            const sy1 = toSvgY(arcStartMathY);
            const sx2 = toSvgX(arcEndMathX);
            const sy2 = toSvgY(arcEndMathY);

            const arcColor = ang.color || '#818cf8'; // indigo-400

            // Position for angle label along the angle bisector
            const midAngle = angFrom + sweep / 2;
            const labelDist = (rSvg + 12) / scale;
            const labelMathX = v.x + Math.cos(midAngle) * labelDist;
            const labelMathY = v.y + Math.sin(midAngle) * labelDist;

            return (
              <g key={`angle-${idx}`}>
                <path
                  d={`M ${sx1} ${sy1} A ${rSvg} ${rSvg} 0 0 0 ${sx2} ${sy2}`}
                  fill="none"
                  stroke={arcColor}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                {ang.label && (
                  <text
                    x={toSvgX(labelMathX)}
                    y={toSvgY(labelMathY)}
                    fill={arcColor}
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {ang.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Line Segments */}
          {segmentsList.map((seg, idx) => {
            const p1 = pointMap[seg.from];
            const p2 = pointMap[seg.to];
            if (!p1 || !p2) return null;

            const sx1 = toSvgX(p1.x);
            const sy1 = toSvgY(p1.y);
            const sx2 = toSvgX(p2.x);
            const sy2 = toSvgY(p2.y);

            const color = seg.color || '#f8fafc'; // slate-50 crisp white/slate
            const strokeWidth = seg.strokeWidth || 2;

            // Segment label midpoint
            const mx = (sx1 + sx2) / 2;
            const my = (sy1 + sy2) / 2;

            // Normal vector for default offset perpendicular to segment
            const dx = sx2 - sx1;
            const dy = sy2 - sy1;
            const len = Math.hypot(dx, dy) || 1;
            const perpX = -dy / len;
            const perpY = dx / len;

            const [customDx, customDy] = seg.labelOffset || [0, 0];
            const defaultDist = 12;
            const lx = customDx !== 0 || customDy !== 0 ? mx + customDx : mx + perpX * defaultDist;
            const ly = customDx !== 0 || customDy !== 0 ? my + customDy : my + perpY * defaultDist;

            return (
              <g key={`seg-${idx}`}>
                <line
                  x1={sx1}
                  y1={sy1}
                  x2={sx2}
                  y2={sy2}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={seg.dashed ? '5 4' : undefined}
                  strokeLinecap="round"
                />
                {seg.label && (
                  <text
                    x={lx}
                    y={ly}
                    fill={seg.labelColor || '#cbd5e1'}
                    fontSize="11"
                    fontWeight="500"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="drop-shadow"
                  >
                    {seg.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Points & Point Labels */}
          {pointsList.map((pt, idx) => {
            const sx = toSvgX(pt.x);
            const sy = toSvgY(pt.y);
            const showDot = pt.dot !== false;

            const [dx, dy] = pt.labelOffset || [0, -12];
            const lx = sx + dx;
            const ly = sy + dy;

            return (
              <g key={`pt-${idx}`}>
                {showDot && (
                  <circle
                    cx={sx}
                    cy={sy}
                    r={3.5}
                    fill="#38bdf8"
                    stroke="#020617"
                    strokeWidth="1.5"
                  />
                )}
                {pt.label && (
                  <text
                    x={lx}
                    y={ly}
                    fill="#f1f5f9"
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="drop-shadow"
                  >
                    {pt.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Caption note beneath diagram */}
      {spec.caption && (
        <div className="mt-1.5 text-xs text-slate-400 text-center italic px-2">
          {spec.caption}
        </div>
      )}
    </div>
  );
}
