import { useState, useEffect } from "react";
import { Loader2, Trash2, ChevronLeft, ChevronRight, Server } from "lucide-react";
import { api, type ActivityLogEntry } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import { useActivityStore } from "../stores/activityStore";
import { useToast } from "@/hooks/use-toast";
import { LogDetailDialog } from "../components/logs/LogDetailDialog";

const PAGE_SIZE = 50;

const typeColors: Record<string, { bg: string; text: string }> = {
  fan: { bg: "#f0fdf4", text: "#16a34a" },
  temp: { bg: "#eff6ff", text: "#2563eb" },
  schedule: { bg: "#fefce8", text: "#a16207" },
  error: { bg: "#fdf2f8", text: "#be185d" },
  system: { bg: "#f0f0f3", text: "#60646c" },
  source: { bg: "#eff6ff", text: "#2563eb" },
  curve: { bg: "#fefce8", text: "#a16207" },
};

const LOG_TYPES = ["all", "fan", "temp", "schedule", "error", "system", "source", "curve"] as const;

export function LogsPage() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { showToast } = useToast();
  const storeEntries = useActivityStore((s) => s.entries);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<ActivityLogEntry | null>(null);
  const [clearing, setClearing] = useState(false);

  // Derive filtered + paginated entries from store
  const filtered = typeFilter === "all"
    ? storeEntries
    : storeEntries.filter((e) => e.event_type === typeFilter);
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
          <p className="mt-1 text-xs text-muted-foreground">
            Activity log for the connected device
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground"
          >
            {LOG_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleClear}
            disabled={clearing || activeDeviceId == null || logs.length === 0}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Clear All
          </button>
        </div>
      </div>

      {activeDeviceId == null ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-12">
          <Server size={24} className="mb-2 text-border" />
          <p className="text-sm text-muted-foreground">
            No device selected. Connect to a device first.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-card py-12">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-12">
          <Server size={24} className="mb-2 text-border" />
          <p className="text-sm text-muted-foreground">No logs found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                    Time
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                    Message
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => {
                  const colors = typeColors[entry.event_type] || typeColors.system;
                  return (
                    <tr
                      key={entry.id}
                      className="cursor-pointer border-b border-muted transition-colors hover:bg-muted"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {entry.ts}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: colors.bg, color: colors.text }}
                        >
                          {entry.event_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="max-w-[300px] truncate px-4 py-2.5 text-xs text-foreground">
                        {entry.message}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {entry.details || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {page + 1} ({logs.length} entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={logs.length < PAGE_SIZE}
                className="flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Detail dialog */}
      {selectedEntry && (
        <LogDetailDialog
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
