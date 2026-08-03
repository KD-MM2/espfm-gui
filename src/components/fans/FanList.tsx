import { Fan, Pencil, Trash2, CheckCircle2, Circle } from "lucide-react";
import type { FanState } from "../../lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "../ui/EmptyState";

interface FanListProps {
  fans: FanState[];
  onEdit: (fan: FanState) => void;
  onDelete: (fan: FanState) => void;
  onToggle: (fan: FanState) => void;
}

function FanCard({ fan, onEdit, onDelete, onToggle }: { fan: FanState; onEdit: (fan: FanState) => void; onDelete: (fan: FanState) => void; onToggle: (fan: FanState) => void }) {
  return (
    <Card className={`py-0 rounded-lg gap-0 ${!fan.enabled ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">{fan.name}</h3>
              {!fan.enabled && <Badge className="bg-gray-100 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">Disabled</Badge>}
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium">PWM</span>
                <span>GPIO {fan.pwm_gpio}</span>
                <span className="text-border">|</span>
                <span className="font-medium">Tach</span>
                <span>GPIO {fan.tach_gpio}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{fan.rpm}</span> RPM
                </span>
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{fan.duty_pct}</span>% duty
                </span>
                <Badge className={`text-[10px] ${fan.mode === "auto" ? "bg-green-50 text-green-700 dark:bg-green-800 dark:text-green-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>{fan.mode}</Badge>
                {fan.inverted && <Badge className="bg-amber-50 text-[10px] text-amber-700 dark:bg-amber-800 dark:text-amber-200">inv</Badge>}
                {fan.alarm !== "none" && <Badge className="bg-red-50 text-[10px] text-red-700 dark:bg-red-800 dark:text-red-200">{fan.alarm === "stall" ? "Stall" : "Overtemp"}</Badge>}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onToggle(fan)} title={fan.enabled ? "Disable fan" : "Enable fan"}>
              {fan.enabled ? <CheckCircle2 size={16} className="text-success" /> : <Circle size={16} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(fan)} title="Edit fan">
              <Pencil size={16} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(fan)} title="Delete fan" className="hover:bg-destructive/10 hover:text-destructive">
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FanList({ fans, onEdit, onDelete, onToggle }: FanListProps) {
  if (fans.length === 0) {
    return <EmptyState icon={<Fan size={40} />} title="No fans configured" description="Create your first fan to get started" />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fans.map((fan) => (
        <FanCard key={fan.slot} fan={fan} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />
      ))}
    </div>
  );
}
