import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import axiosGlobal from "@/services/AxiosGlobal";

export type NotifType = "success" | "error" | "warning" | "info";

export interface UploadNotification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  fileName?: string | null;
  createdAt: string;
  read: boolean;
}

interface NotificationContextValue {
  notifications: UploadNotification[];
  unreadCount: number;
  loading: boolean;
  addNotification: (n: { type: NotifType; title: string; message: string; fileName?: string }) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<UploadNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await axiosGlobal.get("/notifications");
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // silently fail — user might not be logged in yet
    }
  }, []);

  // Initial load + poll every 30s for new notifications
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const addNotification = useCallback(async (n: { type: NotifType; title: string; message: string; fileName?: string }) => {
    try {
      const res = await axiosGlobal.post("/notifications", n);
      setNotifications((prev) => [res.data, ...prev.slice(0, 49)]);
      setUnreadCount((c) => c + 1);
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await axiosGlobal.patch("/notifications");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  const clearAll = useCallback(async () => {
    setLoading(true);
    try {
      await axiosGlobal.delete("/notifications");
      setNotifications([]);
      setUnreadCount(0);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, addNotification, markAllRead, clearAll, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
