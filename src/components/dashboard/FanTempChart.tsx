import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { ChartDataPoint } from "../../lib/fanSample";
import type { TimeRange, BucketSize } from "../../lib/timeSeriesBuffer";
import { BUCKET_OPTIONS } from "../../lib/timeSeriesBuffer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FanTempChartProps {
  data: ChartDataPoint[];
  fanNames: string[];
  tempNames: string[];
  timeRange: TimeRange;
  bucketSize: BucketSize;
  onTimeRangeChange: (range: TimeRange) => void;
  onBucketSizeChange: (size: BucketSize) => void;
}

// Theme colors — must match @theme in index.css
const THEME = {
  foreground: "#171717",
  border: "#dcdee0",
  mutedForeground: "#60646c",
  warning: "#ab6400",
  destructive: "#dc2626",
  success: "#16a34a"
} as const;

// Chart series colors (intentionally distinct from theme)
const FAN_COLORS = [THEME.foreground, "#0d74ce", THEME.mutedForeground, "#476cff"];
const TEMP_COLORS = [THEME.warning, THEME.destructive, THEME.success];

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "30m", label: "30m" },
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" }
];

export function FanTempChart({ data, fanNames, tempNames, timeRange, bucketSize, onTimeRangeChange, onBucketSizeChange }: FanTempChartProps) {
  const hasTemp = tempNames.length > 0;

  return (
    <>
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Fan RPM & Temperature</h2>
        <div className="flex items-center gap-3">
          {/* Bucket size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Group by:</span>
            <Select value={String(bucketSize)} onValueChange={(v) => onBucketSizeChange(Number(v) as BucketSize)}>
              <SelectTrigger className="h-7 w-auto text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUCKET_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Time range selector */}
          <div className="flex gap-1">
            {TIME_RANGES.map((range) => (
              <Button key={range.value} variant={timeRange === range.value ? "default" : "outline"} size="sm" onClick={() => onTimeRangeChange(range.value)}>
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: hasTemp ? 12 : 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 11, fill: THEME.mutedForeground }} tickLine={false} axisLine={{ stroke: THEME.border }} interval="preserveStartEnd" />
            <YAxis
              yAxisId="rpm"
              tick={{ fontSize: 11, fill: THEME.mutedForeground }}
              tickLine={false}
              axisLine={false}
              width={40}
              label={{
                value: "RPM",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 10, fill: THEME.mutedForeground }
              }}
            />
            {hasTemp && (
              <YAxis
                yAxisId="temp"
                orientation="right"
                tick={{ fontSize: 11, fill: THEME.mutedForeground }}
                tickLine={false}
                axisLine={false}
                width={40}
                domain={["auto", "auto"]}
                label={{
                  value: "°C",
                  angle: 90,
                  position: "insideRight",
                  style: { fontSize: 10, fill: THEME.mutedForeground }
                }}
              />
            )}
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: `1px solid ${THEME.border}`,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
              }}
              formatter={(value, name) => {
                const num = typeof value === "number" ? value : 0;
                if (typeof name === "string" && name.startsWith("temp_")) {
                  return [`${num.toFixed(1)} °C`, name.replace("temp_", "")];
                }
                return [`${num} RPM`, typeof name === "string" ? name : String(name)];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="plainline"
              formatter={(value) => {
                const str = typeof value === "string" ? value : String(value);
                if (str.startsWith("temp_")) return str.replace("temp_", "") + " (°C)";
                return str + " (RPM)";
              }}
            />
            {fanNames.map((name, i) => (
              <Line key={name} yAxisId="rpm" type="monotone" dataKey={name} stroke={FAN_COLORS[i % FAN_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            ))}
            {tempNames.map((name, i) => (
              <Line key={name} yAxisId="temp" type="monotone" dataKey={name} stroke={TEMP_COLORS[i % TEMP_COLORS.length]} strokeWidth={2} strokeDasharray="6 3" dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
