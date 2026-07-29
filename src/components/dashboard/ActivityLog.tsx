type EventType = "fan" | "temp" | "schedule" | "error";

export interface ActivityEntry {
  id: string;
  type: EventType;
  message: string;
  time: string;
}

const DOT_COLORS: Record<EventType, string> = {
  fan: "bg-[#16a34a]",
  temp: "bg-[#0d74ce]",
  schedule: "bg-[#ab6400]",
  error: "bg-[#dc2626]",
};

interface ActivityLogProps {
  entries: ActivityEntry[];
}

export function ActivityLog({ entries }: ActivityLogProps) {
  return (
    <div className="rounded-lg border border-[#dcdee0] bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-[#171717]">
        Activity Log
      </h2>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#60646c]">
          No activity yet
        </p>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2.5">
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT_COLORS[entry.type]}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[#171717]">{entry.message}</p>
                <p className="text-[10px] text-[#60646c]">{entry.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
