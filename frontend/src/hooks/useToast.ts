import { useCallback, useContext } from "react";
import { ToastContext } from "../components/ToastContainer";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

/** Call showToast(message, type) anywhere inside <ToastProvider>. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      ctx.addToast(message, type);
    },
    [ctx]
  );

  return { showToast };
}
