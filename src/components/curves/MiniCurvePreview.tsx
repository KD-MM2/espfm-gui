// Read-only mini curve preview shown on fan cards and curve cards.
// Reuses the CurveEditor projection math (temp 0-100°C, duty 0-100%)
// but at a smaller fixed size with light axes/gridlines.

const COLORS = {
  border: "#dcdee0",
  muted: "#f0f0f3",
  mutedForeground: "#60646c",
  foreground: "#171717"
} as const;

const SVG_WIDTH = 220;
const SVG_HEIGHT = 120;
const PADDING = { top: 12, right: 12, bottom: 24, left: 40 };
const CHART_W = SVG_WIDTH - PADDING.left - PADDING.right;
const CHART_H = SVG_HEIGHT - PADDING.top - PADDING.bottom;

const TEMP_MIN = 0;
const TEMP_MAX = 100;
const DUTY_MIN = 0;
const DUTY_MAX = 100;

const GRID = [0, 50, 100];

function tempToX(temp: number): number {
  return PADDING.left + ((temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * CHART_W;
}

function dutyToY(duty: number): number {
  return PADDING.top + ((DUTY_MAX - duty) / (DUTY_MAX - DUTY_MIN)) * CHART_H;
}

interface MiniCurvePreviewProps {
  points: { temp_c: number; duty: number }[];
  emptyLabel?: string;
}

export function MiniCurvePreview({ points, emptyLabel = "No curve assigned" }: MiniCurvePreviewProps) {
  const hasLine = points.length >= 2;
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${tempToX(p.temp_c)} ${dutyToY(p.duty)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full max-w-[220px] select-none">
      {/* Gridlines */}
      {GRID.map((t) => (
        <line key={`tg-${t}`} x1={tempToX(t)} y1={PADDING.top} x2={tempToX(t)} y2={PADDING.top + CHART_H} stroke={COLORS.muted} strokeWidth={1} />
      ))}
      {GRID.map((d) => (
        <line key={`dg-${d}`} x1={PADDING.left} y1={dutyToY(d)} x2={PADDING.left + CHART_W} y2={dutyToY(d)} stroke={COLORS.muted} strokeWidth={1} />
      ))}

      {/* Axes */}
      <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + CHART_H} stroke={COLORS.border} strokeWidth={1} />
      <line x1={PADDING.left} y1={PADDING.top + CHART_H} x2={PADDING.left + CHART_W} y2={PADDING.top + CHART_H} stroke={COLORS.border} strokeWidth={1} />

      {/* X labels */}
      {GRID.map((t) => (
        <text key={`tl-${t}`} x={tempToX(t)} y={SVG_HEIGHT - 8} textAnchor="middle" fontSize={10} fill={COLORS.mutedForeground}>
          {t}°C
        </text>
      ))}

      {/* Y labels */}
      {GRID.map((d) => (
        <text key={`dl-${d}`} x={PADDING.left - 8} y={dutyToY(d) + 4} textAnchor="end" fontSize={10} fill={COLORS.mutedForeground}>
          {d}%
        </text>
      ))}

      {/* Curve line + dots */}
      {hasLine && (
        <>
          <path d={linePath} fill="none" stroke={COLORS.foreground} strokeWidth={2} />
          {points.map((p, i) => (
            <circle key={i} cx={tempToX(p.temp_c)} cy={dutyToY(p.duty)} r={3} fill="white" stroke={COLORS.foreground} strokeWidth={1.5} />
          ))}
        </>
      )}

      {/* Empty label */}
      {!hasLine && (
        <text x={PADDING.left + CHART_W / 2} y={PADDING.top + CHART_H / 2} textAnchor="middle" fontSize={11} fill={COLORS.mutedForeground}>
          {emptyLabel}
        </text>
      )}
    </svg>
  );
}
