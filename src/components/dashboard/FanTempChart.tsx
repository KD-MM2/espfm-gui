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

export interface ChartDataPoint {
  time: string;
  [fanKey: string]: number | string;
}

type TimeRange = "30m" | "1h" | "6h" | "24h";

interface FanTempChartProps {
  data: ChartDataPoint[];
  fanNames: string[];
  showTemp?: boolean;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const FAN_COLORS = ["#171717", "#0d74ce"];
const TEMP_COLOR = "#ab6400";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "30m", label: "30m" },
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
];

export function FanTempChart({
  data,
  fanNames,
  showTemp = true,
  timeRange,
  onTimeRangeChange,
}: FanTempChartProps) {
  return (
    <div className="rounded-lg border border-[#dcdee0] bg-white p-4">
      {/* Header with time range selector */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#171717]">
          Fan RPM & Temperature
        </h2>
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

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#dcdee0"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: "#60646c" }}
            tickLine={false}
            axisLine={{ stroke: "#dcdee0" }}
          />
          <YAxis
            yAxisId="rpm"
            tick={{ fontSize: 11, fill: "#60646c" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          {showTemp && (
            <YAxis
              yAxisId="temp"
              orientation="right"
              tick={{ fontSize: 11, fill: "#60646c" }}
              tickLine={false}
              axisLine={false}
              width={40}
              domain={["auto", "auto"]}
              unit="°C"
            />
          )}
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #dcdee0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="plainline"
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
          {showTemp && (
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              stroke={TEMP_COLOR}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4 }}
              name="Temperature"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
