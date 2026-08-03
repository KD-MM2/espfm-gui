import { useState, useEffect } from "react";
import { Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { api, type ActivityLogEntry } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import { useActivityStore } from "../stores/activityStore";
import { useToast } from "@/hooks/use-toast";
import { LogDetailDialog } from "../components/logs/LogDetailDialog";
import { LogList } from "../components/logs/LogList";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const PAGE_SIZE = 50;

const LOG_TYPES = ["all", "fan", "temp", "schedule", "error", "system", "source", "curve"] as const;

export function LogsPage() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { showToast } = useToast();
  const storeEntries = useActivityStore((s) => s.entries);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null);
  const [clearing, setClearing] = useState(false);

  const filtered = typeFilter === "all" ? storeEntries : storeEntries.filter((e) => e.event_type === typeFilter);
  const logs = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const loading = useActivityStore((s) => s.loading);

  useEffect(() => {
    setPage(0);
  }, [typeFilter]);

  async function handleClear() {
    if (activeDeviceId == null) return;
    if (!confirm("Clear all logs for this device?")) return;
    setClearing(true);
    try {
      await api.clearLogs(activeDeviceId);
      useActivityStore.getState().clear();
      setPage(0);
    } catch (err) {
      showToast(`Failed to clear logs: ${String(err)}`, "error");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Logs</h1>
          <p className="mt-1 text-xs text-muted-foreground">Activity log for the connected device</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOG_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleClear} disabled={clearing || activeDeviceId == null || logs.length === 0} className="text-destructive hover:bg-destructive/10">
            {clearing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Clear All
          </Button>
        </div>
      </div>

      {activeDeviceId == null ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No device selected. Connect to a device first.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <LogList
            entries={logs}
            loading={loading}
            emptyMessage="No logs found."
            onEntryClick={(entry) => setSelectedEntry(entry)}
          />

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} ({logs.length} entries)
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft size={14} />
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= filtered.length}>
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail dialog */}
      {selectedEntry && <LogDetailDialog entry={selectedEntry} onClose={() => setSelectedEntry(null)} />}
    </div>
  );
}

