import { X } from "lucide-react";
import { useToastStore, type ToastType } from "../../stores/toastStore";

const bgColors: Record<ToastType, string> = {
  success: "bg-[#16a34a]",
  warning: "bg-[#ab6400]",
  error: "bg-[#dc2626]",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm text-white shadow-lg ${bgColors[toast.type]}`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 rounded p-0.5 transition-colors hover:bg-white/20"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
