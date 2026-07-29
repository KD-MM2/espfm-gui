import { Circle } from "lucide-react";

type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

interface ConnectionBadgeProps {
  status: ConnectionStatus;
}

const dotColors: Record<ConnectionStatus, string> = {
  connected: "text-[#16a34a]",
  reconnecting: "text-[#ab6400]",
  disconnected: "text-[#dc2626]",
};

const labels: Record<ConnectionStatus, string> = {
  connected: "Connected",
  reconnecting: "Reconnecting...",
  disconnected: "Disconnected",
};

export function ConnectionBadge({ status }: ConnectionBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Circle size={8} className={`shrink-0 ${dotColors[status]}`} />
      <span className="text-xs text-[#60646c]">{labels[status]}</span>
    </div>
  );
}
