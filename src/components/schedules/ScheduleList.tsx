import { Clock, Pencil, Trash2, CheckCircle2, Circle } from "lucide-react";
import type { ScheduleState } from "../../lib/api";
import { EmptyState } from "../ui/EmptyState";
import { Card, CardContent } from "@/components/ui/card";

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface ScheduleListProps {
  schedules: ScheduleState[];
  onEdit: (schedule: ScheduleState) => void;
  onDelete: (schedule: ScheduleState) => void;
  onToggle: (schedule: ScheduleState) => void;
  onCreateFirst: () => void;
}

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onToggle,
}: {
  schedule: ScheduleState;
  onEdit: (schedule: ScheduleState) => void;
  onDelete: (schedule: ScheduleState) => void;
  onToggle: (schedule: ScheduleState) => void;
}) {
  return (
    <Card
      className={`rounded-lg border py-0 gap-0 ${
        !schedule.enabled ? "opacity-60" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">
                Fan {schedule.fan_id}
              </h3>
              {!schedule.enabled && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Disabled
                </span>
              )}
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {schedule.duty}%
                </span>
                <span>duty</span>
                <span className="text-border">|</span>
                <span>
                  {minutesToHHMM(schedule.start_min)} &ndash;{" "}
                  {minutesToHHMM(schedule.end_min)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onToggle(schedule)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              title={schedule.enabled ? "Disable schedule" : "Enable schedule"}
            >
              {schedule.enabled ? (
                <CheckCircle2 size={16} className="text-success" />
              ) : (
                <Circle size={16} />
              )}
            </button>
            <button
              type="button"
              onClick={() => onEdit(schedule)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
              title="Edit schedule"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(schedule)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Delete schedule"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ScheduleList({
  schedules,
  onEdit,
  onDelete,
  onToggle,
  onCreateFirst,
}: ScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <EmptyState
        icon={<Clock size={40} />}
        title="No schedules configured"
        description="Create your first schedule to get started"
        actionLabel="Create your first schedule"
        onAction={onCreateFirst}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {schedules.map((schedule) => (
        <ScheduleCard
          key={schedule.slot}
          schedule={schedule}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
