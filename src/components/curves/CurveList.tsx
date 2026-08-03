import { GitBranch, Pencil, Trash2 } from "lucide-react";
import type { CurveState } from "../../lib/api";
import { EmptyState } from "../ui/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CurveListProps {
  curves: CurveState[];
  onEdit: (curve: CurveState) => void;
  onDelete: (curve: CurveState) => void;
  onCreateFirst: () => void;
}

function CurveCard({ curve, onEdit, onDelete }: { curve: CurveState; onEdit: (curve: CurveState) => void; onDelete: (curve: CurveState) => void }) {
  const pointsSummary = curve.points.map((p) => `${p.temp_c}C:${p.duty}%`).join(", ");

  return (
    <Card className="py-0 gap-0 rounded-lg">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">{curve.name}</h3>
              <Badge className="bg-purple-50 text-[10px] text-purple-700 dark:bg-purple-800 dark:text-purple-200">
                {curve.points.length} {curve.points.length === 1 ? "point" : "points"}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground font-mono">{pointsSummary}</div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(curve)} title="Edit curve">
              <Pencil size={16} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(curve)} title="Delete curve" className="hover:bg-destructive/10 hover:text-destructive">
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CurveList({ curves, onEdit, onDelete, onCreateFirst }: CurveListProps) {
  if (curves.length === 0) {
    return <EmptyState icon={<GitBranch size={40} />} title="No curves configured" description="Create your first curve to get started" actionLabel="Create your first curve" onAction={onCreateFirst} />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {curves.map((curve) => (
        <CurveCard key={curve.slot} curve={curve} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
