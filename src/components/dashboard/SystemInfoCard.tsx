type Status = "healthy" | "warning" | "error";

interface SystemInfoCardProps {
  uptime: string;
  heapFree: string;
  version: string;
  status?: Status;
}

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string }> = {
  healthy: { bg: "bg-success/10", text: "text-success", label: "Healthy" },
  warning: { bg: "bg-warning/10", text: "text-warning", label: "Warning" },
  error: { bg: "bg-destructive/10", text: "text-destructive", label: "Error" },
};

export function SystemInfoCard({
  uptime,
  heapFree,
  version,
  status = "healthy",
}: SystemInfoCardProps) {
  const badge = STATUS_STYLES[status];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">System Info</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Uptime</span>
          <span className="text-xs font-medium text-foreground">{uptime}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Heap Free</span>
          <span className="text-xs font-medium text-foreground">{heapFree}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Version</span>
          <span className="text-xs font-medium text-foreground">{version}</span>
        </div>
      </div>
    </div>
  );
}
