import { useRef, useState, useCallback, useEffect } from "react";

interface CurvePoint {
  temp_c: number;
  duty: number;
}

interface CurveEditorProps {
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
}

const SVG_WIDTH = 600;
const SVG_HEIGHT = 240;
const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };
const CHART_W = SVG_WIDTH - PADDING.left - PADDING.right;
const CHART_H = SVG_HEIGHT - PADDING.top - PADDING.bottom;

const TEMP_MIN = 0;
const TEMP_MAX = 100;
const DUTY_MIN = 0;
const DUTY_MAX = 100;

const MIN_POINTS = 2;
const MAX_POINTS = 10;
const POINT_RADIUS = 6;

function tempToX(temp: number): number {
  return PADDING.left + ((temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * CHART_W;
}

function dutyToY(duty: number): number {
  return PADDING.top + ((DUTY_MAX - duty) / (DUTY_MAX - DUTY_MIN)) * CHART_H;
}

function xToTemp(x: number): number {
  return TEMP_MIN + ((x - PADDING.left) / CHART_W) * (TEMP_MAX - TEMP_MIN);
}

function yToDuty(y: number): number {
  return DUTY_MAX - ((y - PADDING.top) / CHART_H) * (DUTY_MAX - DUTY_MIN);
}

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}

export function CurveEditor({ points, onChange }: CurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const getSvgPoint = useCallback(
    (e: React.MouseEvent): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const scaleX = SVG_WIDTH / rect.width;
      const scaleY = SVG_HEIGHT / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setDragIndex(index);
    },
    []
  );

  const handleDoubleClick = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (points.length <= MIN_POINTS) return;
      const next = points.filter((_, i) => i !== index);
      onChange(next);
    },
    [points, onChange]
  );

  const handleSvgClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragIndex !== null) return;
      if (points.length >= MAX_POINTS) return;

      const pt = getSvgPoint(e);
      if (!pt) return;

      const temp = clamp(xToTemp(pt.x), TEMP_MIN, TEMP_MAX);
      const duty = clamp(yToDuty(pt.y), DUTY_MIN, DUTY_MAX);

      // Insert in sorted position by temp_c
      const next = [...points];
      let insertIdx = next.length;
      for (let i = 0; i < next.length; i++) {
        if (next[i].temp_c >= temp) {
          insertIdx = i;
          break;
        }
      }
      // Prevent duplicate temp_c
      if (
        (insertIdx > 0 && next[insertIdx - 1]?.temp_c === temp) ||
        next[insertIdx]?.temp_c === temp
      ) {
        return;
      }
      next.splice(insertIdx, 0, { temp_c: temp, duty });
      onChange(next);
    },
    [dragIndex, points, onChange, getSvgPoint]
  );

  // Global mouse handlers for dragging
  useEffect(() => {
    if (dragIndex === null) return;

    function handleMouseMove(e: MouseEvent) {
      const svg = svgRef.current;
      if (!svg || dragIndex === null) return;

      const rect = svg.getBoundingClientRect();
      const scaleX = SVG_WIDTH / rect.width;
      const scaleY = SVG_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const temp = clamp(xToTemp(x), TEMP_MIN, TEMP_MAX);
      const duty = clamp(yToDuty(y), DUTY_MIN, DUTY_MAX);

      // Enforce monotonically increasing X
      const prev = points[dragIndex - 1]?.temp_c ?? TEMP_MIN;
      const next = points[dragIndex + 1]?.temp_c ?? TEMP_MAX;
      const clampedTemp = clamp(temp, prev + 1, next - 1);

      const updated = points.map((p, i) =>
        i === dragIndex ? { temp_c: clampedTemp, duty } : p
      );
      onChange(updated);
    }

    function handleMouseUp() {
      setDragIndex(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragIndex, points, onChange]);

  // Build polyline path
  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${tempToX(p.temp_c)} ${dutyToY(p.duty)}`
    )
    .join(" ");

  // Grid lines
  const tempGridLines = [0, 20, 40, 60, 80, 100];
  const dutyGridLines = [0, 20, 40, 60, 80, 100];

  return (
    <div className="flex min-h-0 flex-1 flex-row gap-3">
      {/* SVG Graph */}
      <div className="min-h-60 flex-1 rounded-lg border border-border bg-card p-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="h-full w-full cursor-crosshair select-none"
          preserveAspectRatio="xMidYMid meet"
          onClick={handleSvgClick}
        >
          {/* Grid lines */}
          {tempGridLines.map((t) => (
            <line
              key={`tg-${t}`}
              x1={tempToX(t)}
              y1={PADDING.top}
              x2={tempToX(t)}
              y2={PADDING.top + CHART_H}
              stroke="#f0f0f3"
              strokeWidth={1}
            />
          ))}
          {dutyGridLines.map((d) => (
            <line
              key={`dg-${d}`}
              x1={PADDING.left}
              y1={dutyToY(d)}
              x2={PADDING.left + CHART_W}
              y2={dutyToY(d)}
              stroke="#f0f0f3"
              strokeWidth={1}
            />
          ))}

          {/* Axes */}
          <line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left}
            y2={PADDING.top + CHART_H}
            stroke="#dcdee0"
            strokeWidth={1}
          />
          <line
            x1={PADDING.left}
            y1={PADDING.top + CHART_H}
            x2={PADDING.left + CHART_W}
            y2={PADDING.top + CHART_H}
            stroke="#dcdee0"
            strokeWidth={1}
          />

          {/* X-axis labels */}
          {tempGridLines.map((t) => (
            <text
              key={`tl-${t}`}
              x={tempToX(t)}
              y={SVG_HEIGHT - 8}
              textAnchor="middle"
              fontSize={11}
              fill="#60646c"
            >
              {t}°C
            </text>
          ))}

          {/* Y-axis labels */}
          {dutyGridLines.map((d) => (
            <text
              key={`dl-${d}`}
              x={PADDING.left - 8}
              y={dutyToY(d) + 4}
              textAnchor="end"
              fontSize={11}
              fill="#60646c"
            >
              {d}%
            </text>
          ))}

          {/* Curve line */}
          {points.length >= 2 && (
            <path d={linePath} fill="none" stroke="#171717" strokeWidth={2} />
          )}

          {/* Control points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={tempToX(p.temp_c)}
              cy={dutyToY(p.duty)}
              r={POINT_RADIUS}
              fill="white"
              stroke="#171717"
              strokeWidth={2}
              className="cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => handleMouseDown(i, e)}
              onDoubleClick={(e) => handleDoubleClick(i, e)}
            />
          ))}
        </svg>
      </div>

      {/* Points table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                Temperature (°C)
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                Duty (%)
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i} className="border-b border-muted last:border-0">
                <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2 font-medium text-foreground">
                  {p.temp_c}
                </td>
                <td className="px-4 py-2 font-medium text-foreground">
                  {p.duty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
