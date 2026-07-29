import { toast } from "sonner";

export function useToast() {
  return {
    showToast: (message: string, type: "success" | "warning" | "error") => {
      if (type === "success") toast.success(message);
      else if (type === "error") toast.error(message);
      else toast.warning(message);
    },
  };
}
