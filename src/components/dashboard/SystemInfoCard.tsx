import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status = "healthy" | "warning" | "error";

interface SystemInfoCardProps {
  uptime: string;
  heapFree: string;
  version: string;
  status?: Status;
}

const STATUS_CLASS: Record<Status, string> = {
  healthy: "bg-green-50 text-green-700 dark:bg-green-800 dark:text-green-200",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-800 dark:text-amber-200",
  error: "bg-red-50 text-red-700 dark:bg-red-800 dark:text-red-200"
};

export function SystemInfoCard({ uptime, heapFree, version, status = "healthy" }: SystemInfoCardProps) {
  return (
    <Card className="gap-2 py-0">
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-0">
        <CardTitle className="text-sm">System Info</CardTitle>
        <Badge className={STATUS_CLASS[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4">
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
      </CardContent>
    </Card>
  );
}
