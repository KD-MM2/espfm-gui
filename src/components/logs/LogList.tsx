import { Loader2, Server } from "lucide-react";
import { type ActivityLogEntry } from "../../lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id} className="cursor-pointer" onClick={() => onEntryClick?.(entry)}>
              <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{entry.ts}</TableCell>
              <TableCell>
                <Badge className={`text-[10px] ${typeBadgeClass[entry.event_type] ?? typeBadgeClass.system}`}>{entry.event_type.toUpperCase()}</Badge>
              </TableCell>
              <TableCell className="max-w-[300px] truncate text-xs">{entry.message}</TableCell>
              <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground">{entry.details || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
