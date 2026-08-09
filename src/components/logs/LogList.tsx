import { Loader2, Server } from "lucide-react";
import { type ActivityLogEntry } from "../../lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const typeBadgeClass: Record<string, string> = {
  fan: "bg-blue-50 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
  temp: "bg-orange-50 text-orange-700 dark:bg-orange-800 dark:text-orange-200",
  schedule: "bg-purple-50 text-purple-700 dark:bg-purple-800 dark:text-purple-200",
  error: "bg-red-50 text-red-700 dark:bg-red-800 dark:text-red-200",
  system: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  source: "bg-teal-50 text-teal-700 dark:bg-teal-800 dark:text-teal-200",
  curve: "bg-amber-50 text-amber-700 dark:bg-amber-800 dark:text-amber-200"
};

interface LogListProps {
  entries: ActivityLogEntry[];
  loading: boolean;
  emptyMessage?: string;
  onEntryClick?: (entry: ActivityLogEntry) => void;
}

export function LogList({ entries, loading, emptyMessage = "No logs found.", onEntryClick }: LogListProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Server size={24} className="mb-2 text-border" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header row */}
      <div className="grid grid-cols-[150px_80px_1fr_1fr] gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>Time</span>
        <span>Type</span>
        <span>Message</span>
        <span>Details</span>
      </div>
      {/* Rows — div-based list so each row can use content-visibility:auto,
          which skips painting off-screen rows during scroll (eliminates the
          raster cost that the old <table> caused on every scroll frame). */}
      <div className="divide-y divide-border">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="grid cursor-pointer grid-cols-[150px_80px_1fr_1fr] items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 [content-visibility:auto] [contain-intrinsic-size:auto_36px]"
            onClick={() => onEntryClick?.(entry)}
          >
            <span className="whitespace-nowrap font-mono text-muted-foreground">{entry.ts}</span>
            <span>
              <Badge className={`text-[10px] ${typeBadgeClass[entry.event_type] ?? typeBadgeClass.system}`}>{entry.event_type.toUpperCase()}</Badge>
            </span>
            <span className="truncate">{entry.message}</span>
            <span className="truncate font-mono text-muted-foreground">{entry.details || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
