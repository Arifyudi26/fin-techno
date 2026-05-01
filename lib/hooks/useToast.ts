import { useState, useCallback } from "react";
import type { ToastType } from "@/lib/types/ui";

interface ToastState {
  isOpen: boolean;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  resolve?: (value: boolean) => void;
}

const DEFAULT: ToastState = {
  isOpen: false,
  type: "info",
  title: "",
};

export function useToast() {
  const [state, setState] = useState<ToastState>(DEFAULT);

  const close = useCallback(() => {
    setState((prev) => {
      prev.resolve?.(false);
      return { ...prev, isOpen: false };
    });
  }, []);

  // Simple fire — no await
  const fire = useCallback((
    type: ToastType,
    title: string,
    options?: { message?: string; duration?: number; confirmText?: string; cancelText?: string; onConfirm?: () => void }
  ) => {
    setState({ isOpen: true, type, title, ...options });
  }, []);

  // Awaitable fire — returns true if confirmed
  const confirm = useCallback((
    type: ToastType,
    title: string,
    options?: { message?: string; confirmText?: string; cancelText?: string }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        type,
        title,
        message: options?.message,
        confirmText: options?.confirmText ?? "Ya",
        cancelText: options?.cancelText ?? "Batal",
        resolve,
        onConfirm: () => resolve(true),
      });
    });
  }, []);

  return { toastState: state, fire, confirm, close };
}
