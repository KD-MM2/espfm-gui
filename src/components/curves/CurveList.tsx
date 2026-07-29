import { GitBranch, Pencil, Trash2 } from "lucide-react";
import type { CurveState } from "../../lib/api";
import { EmptyState } from "../ui/EmptyState";

interface CurveListProps {
  curves: CurveState[];
  onEdit: (curve: CurveState) => void;
  onDelete: (curve: CurveState) => void;
  onCreateFirst: () => void;
}

function CurveCard({
  curve,
  onEdit,
  onDelete,
}: {
  curve: CurveState;
  onEdit: (curve: CurveState) => void;
  onDelete: (curve: CurveState) => void;
}) {
  const pointsSummary = curve.points
    .map((p) => `${p.temp_c}C:${p.duty}%`)
    .join(", ");

  return (
    <div className="rounded-lg border border-[#dcdee0] bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[#171717]">
              {curve.name}
            </h3>
            <span className="shrink-0 rounded-full bg-[#f0f0f3] px-2 py-0.5 text-[10px] font-medium text-[#60646c]">
              {curve.points.length} {curve.points.length === 1 ? "point" : "points"}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#60646c] font-mono">
            {pointsSummary}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(curve)}
            className="rounded-md p-1.5 text-[#60646c] transition-colors hover:bg-[#f0f0f3]"
            title="Edit curve"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(curve)}
            className="rounded-md p-1.5 text-[#60646c] transition-colors hover:bg-[#fee2e2] hover:text-[#dc2626]"
            title="Delete curve"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CurveList({
  curves,
  onEdit,
  onDelete,
  onCreateFirst,
}: CurveListProps) {
  if (curves.length === 0) {
    return (
      <EmptyState
        icon={<GitBranch size={40} />}
        title="No curves configured"
        description="Create your first curve to get started"
        actionLabel="Create your first curve"
        onAction={onCreateFirst}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {curves.map((curve) => (
        <CurveCard
          key={curve.slot}
          curve={curve}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
