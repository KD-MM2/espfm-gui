import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type ActivityLogEntry } from "@/lib/api";

type EventType = "fan" | "temp" | "schedule" | "error" | "system" | "source" | "curve";

const KNOWN_TYPES = ["fan", "temp", "schedule", "error", "system", "source", "curve"] as const;

const DOT_COLORS: Record<string, string> = {
  fan: "bg-success",
  temp: "bg-info",
  schedule: "bg-warning",
  error: "bg-destructive",
  system: "bg-muted-foreground",
  source: "bg-info",
  curve: "bg-warning"
};

interface ActivityLogProps {
  entries: ActivityLogEntry[];
  maxItems?: number;
  onShowAll?: () => void;
  totalCount?: number;
}

function toEventType(eventType: string): EventType {
  return (KNOWN_TYPES as readonly string[]).includes(eventType) ? (eventType as EventType) : "system";
}

export function ActivityLog({ entries, maxItems = 7, onShowAll, totalCount }: ActivityLogProps) {
  const visibleEntries = entries.slice(0, maxItems);
  const total = totalCount ?? entries.length;
  const hasMore = entries.length > maxItems || total > entries.length;

  return (
    <Card className="min-h-0 flex-1 gap-0 overflow-hidden py-0">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-sm">Activity Log</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        {entries.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xs text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto">
            {visibleEntries.map((entry) => {
              const type = toEventType(entry.event_type);
              return (
                <div key={entry.id} className="flex items-start gap-2.5">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT_COLORS[type]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground">{entry.message}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.ts}</p>
                  </div>
                </div>
              );
            })}
            {hasMore && onShowAll && (
              <Button variant="outline" size="sm" onClick={onShowAll} className="mt-1 w-full">
                Show All ({total})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
