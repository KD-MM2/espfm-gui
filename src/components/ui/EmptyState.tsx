import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#dcdee0] py-12">
      <div className="text-[#dcdee0]">{icon}</div>
      <p className="mt-3 text-sm font-medium text-[#171717]">{title}</p>
      <p className="mt-1 text-xs text-[#60646c]">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-md bg-[#171717] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
