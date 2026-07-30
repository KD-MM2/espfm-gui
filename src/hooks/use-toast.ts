import { useMemo } from "react";
import { toast } from "sonner";

export function useToast(): { showToast: (message: string, type: "success" | "warning" | "error") => void } {
  return useMemo(
    () => ({
      showToast: (message: string, type: "success" | "warning" | "error") => {
        if (type === "success") toast.success(message);
        else if (type === "error") toast.error(message);
        else toast.warning(message);
      },
    }),
    []
  );
}
