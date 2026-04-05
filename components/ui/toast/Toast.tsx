"use client";
import { useEffect, useRef } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  isOpen: boolean;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = manual close
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onClose: () => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg className="text-success-500" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.707 7.293a1 1 0 00-1.414 0L10 14.586l-2.293-2.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l6-6a1 1 0 000-1.414z" fill="currentColor" />
    </svg>
  ),
  error: (
    <svg className="text-error-500" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 5a1 1 0 112 0v5a1 1 0 11-2 0V7zm1 9a1.25 1.25 0 100-2.5A1.25 1.25 0 0013 16z" fill="currentColor" />
    </svg>
  ),
  warning: (
    <svg className="text-warning-500" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1zm0 8a1.25 1.25 0 100-2.5A1.25 1.25 0 0012 17z" fill="currentColor" />
    </svg>
  ),
  info: (
    <svg className="text-brand-500" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 7a1 1 0 10-2 0 1 1 0 002 0zm-1 3a1 1 0 011 1v4a1 1 0 11-2 0v-4a1 1 0 011-1z" fill="currentColor" />
    </svg>
  ),
};

const bgMap: Record<ToastType, string> = {
  success: "bg-success-50 dark:bg-success-500/10 border-success-200 dark:border-success-500/20",
  error:   "bg-error-50 dark:bg-error-500/10 border-error-200 dark:border-error-500/20",
  warning: "bg-warning-50 dark:bg-warning-500/10 border-warning-200 dark:border-warning-500/20",
  info:    "bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/20",
};

const btnMap: Record<ToastType, string> = {
  success: "bg-success-500 hover:bg-success-600 text-white",
  error:   "bg-error-500 hover:bg-error-600 text-white",
  warning: "bg-warning-500 hover:bg-warning-600 text-white",
  info:    "bg-brand-500 hover:bg-brand-600 text-white",
};

export default function Toast({
  isOpen, type, title, message, duration = 0,
  confirmText, cancelText, onConfirm, onClose,
}: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (duration > 0) {
      timerRef.current = setTimeout(onClose, duration);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const hasActions = confirmText || cancelText;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/40 dark:bg-gray-900/60 backdrop-blur-sm"
        onClick={!hasActions ? onClose : undefined}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-sm rounded-2xl border p-6 shadow-theme-xl ${bgMap[type]} animate-in fade-in zoom-in-95 duration-200`}>
        {/* Close button (only when no actions) */}
        {!hasActions && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <div className="flex flex-col items-center text-center gap-3">
          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white dark:bg-gray-900/50 shadow-theme-sm">
            {icons[type]}
          </div>

          {/* Text */}
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
            {message && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
            )}
          </div>

          {/* Actions */}
          {hasActions && (
            <div className="flex w-full gap-3 mt-1">
              {cancelText && (
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
                >
                  {cancelText}
                </button>
              )}
              {confirmText && (
                <button
                  onClick={() => { onConfirm?.(); onClose(); }}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${btnMap[type]}`}
                >
                  {confirmText}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
