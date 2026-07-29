import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ChartDataPoint } from "../../lib/fanSample";
import type { TimeRange, BucketSize } from "../../lib/timeSeriesBuffer";
import { BUCKET_OPTIONS } from "../../lib/timeSeriesBuffer";

interface FanTempChartProps {
  data: ChartDataPoint[];
  fanNames: string[];
  tempNames: string[];
  timeRange: TimeRange;
  bucketSize: BucketSize;
  onTimeRangeChange: (range: TimeRange) => void;
  onBucketSizeChange: (size: BucketSize) => void;
}

const FAN_COLORS = ["#171717", "#0d74ce", "#60646c", "#476cff"];
const TEMP_COLORS = ["#ab6400", "#dc2626", "#16a34a"];

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "30m", label: "30m" },
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
];

export function FanTempChart({
  data,
  fanNames,
  tempNames,
  timeRange,
  bucketSize,
  onTimeRangeChange,
  onBucketSizeChange,
}: FanTempChartProps) {
  const hasTemp = tempNames.length > 0;

  return (
    <div className="rounded-lg border border-[#dcdee0] bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#171717]">
          Fan RPM & Temperature
        </h2>
        <div className="flex items-center gap-3">
          {/* Bucket size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#999]">Group by:</span>
            <select
              value={bucketSize}
              onChange={(e) => onBucketSizeChange(Number(e.target.value) as BucketSize)}
              className="rounded-md border border-[#dcdee0] bg-white px-2 py-1 text-xs text-[#171717] outline-none"
            >
              {BUCKET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {/* Time range selector */}
          <div className="flex gap-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                type="button"
                onClick={() => onTimeRangeChange(range.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  timeRange === range.value
                    ? "bg-[#171717] text-white"
                    : "bg-[#f0f0f3] text-[#60646c] hover:bg-[#dcdee0]"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 4, right: hasTemp ? 12 : 0, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#dcdee0" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: "#60646c" }}
            tickLine={false}
            axisLine={{ stroke: "#dcdee0" }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="rpm"
            tick={{ fontSize: 11, fill: "#60646c" }}
            tickLine={false}
            axisLine={false}
            width={40}
            label={{ value: "RPM", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#999" } }}
          />
          {hasTemp && (
            <YAxis
              yAxisId="temp"
              orientation="right"
              tick={{ fontSize: 11, fill: "#60646c" }}
              tickLine={false}
              axisLine={false}
              width={40}
              domain={["auto", "auto"]}
              label={{ value: "°C", angle: 90, position: "insideRight", style: { fontSize: 10, fill: "#999" } }}
            />
          )}
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #dcdee0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
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
            <Line
              key={name}
              yAxisId="rpm"
              type="monotone"
              dataKey={name}
              stroke={FAN_COLORS[i % FAN_COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
          {tempNames.map((name, i) => (
            <Line
              key={name}
              yAxisId="temp"
              type="monotone"
              dataKey={name}
              stroke={TEMP_COLORS[i % TEMP_COLORS.length]}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
