type Status = "healthy" | "warning" | "error";

interface SystemInfoCardProps {
  uptime: string;
  heapFree: string;
  version: string;
  status?: Status;
}

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string }> = {
  healthy: { bg: "bg-[#dcfce7]", text: "text-[#16a34a]", label: "Healthy" },
  warning: { bg: "bg-[#fef9c3]", text: "text-[#ab6400]", label: "Warning" },
  error: { bg: "bg-[#fee2e2]", text: "text-[#dc2626]", label: "Error" },
};

export function SystemInfoCard({
  uptime,
  heapFree,
  version,
  status = "healthy",
}: SystemInfoCardProps) {
  const badge = STATUS_STYLES[status];

  return (
    <div className="rounded-lg border border-[#dcdee0] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#171717]">System Info</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#60646c]">Uptime</span>
          <span className="text-xs font-medium text-[#171717]">{uptime}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#60646c]">Heap Free</span>
          <span className="text-xs font-medium text-[#171717]">{heapFree}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#60646c]">Version</span>
          <span className="text-xs font-medium text-[#171717]">{version}</span>
        </div>
      </div>
    </div>
  );
}
