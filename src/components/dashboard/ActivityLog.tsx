type EventType = "fan" | "temp" | "schedule" | "error";

export interface ActivityEntry {
  id: string;
  type: EventType;
  message: string;
  time: string;
}

const DOT_COLORS: Record<EventType, string> = {
  fan: "bg-success",
  temp: "bg-info",
  schedule: "bg-warning",
  error: "bg-destructive",
};

interface ActivityLogProps {
  entries: ActivityEntry[];
  maxItems?: number;
  onShowAll?: () => void;
  totalCount?: number;
}

export function ActivityLog({ entries, maxItems = 7, onShowAll, totalCount }: ActivityLogProps) {
  const visibleEntries = entries.slice(0, maxItems);
  const total = totalCount ?? entries.length;
  const hasMore = entries.length > maxItems || total > entries.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card p-4">
      <h2 className="mb-3 shrink-0 text-sm font-semibold text-foreground">
        Activity Log
      </h2>

      {entries.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground">No activity yet</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-2.5 overflow-auto">
          {visibleEntries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2.5">
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT_COLORS[entry.type]}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground">{entry.message}</p>
                <p className="text-[10px] text-muted-foreground">{entry.time}</p>
              </div>
            </div>
          ))}
          {hasMore && onShowAll && (
            <button
              type="button"
              onClick={onShowAll}
              className="mt-1 w-full rounded border border-border py-1.5 text-xs font-medium text-info hover:bg-muted"
            >
              Show All ({total})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
