import type { ActivityLogEntry } from "../../lib/api";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface LogDetailDialogProps {
  entry: ActivityLogEntry;
  onClose: () => void;
}

const typeBadgeClass: Record<string, string> = {
  fan: "bg-blue-50 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
  temp: "bg-orange-50 text-orange-700 dark:bg-orange-800 dark:text-orange-200",
  schedule: "bg-purple-50 text-purple-700 dark:bg-purple-800 dark:text-purple-200",
  error: "bg-red-50 text-red-700 dark:bg-red-800 dark:text-red-200",
  system: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  source: "bg-teal-50 text-teal-700 dark:bg-teal-800 dark:text-teal-200",
  curve: "bg-amber-50 text-amber-700 dark:bg-amber-800 dark:text-amber-200"
};

export function LogDetailDialog({ entry, onClose }: LogDetailDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Detail</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-muted-foreground">Timestamp</span>
            <span className="font-mono text-xs text-foreground">{entry.ts}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-muted-foreground">Type</span>
            <Badge className={`text-[10px] ${typeBadgeClass[entry.event_type] ?? typeBadgeClass.system}`}>{entry.event_type.toUpperCase()}</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <span className="text-xs text-muted-foreground">Message</span>
            <span className="text-xs text-foreground">{entry.message}</span>
          </div>
          {entry.details && (
            <>
              <Separator />
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-muted-foreground">Details</span>
                <span className="font-mono text-xs text-foreground">{entry.details}</span>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
