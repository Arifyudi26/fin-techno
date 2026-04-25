import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import axiosGlobal from "@/services/AxiosGlobal";
import useAuthStore from "@/store/authStore";

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
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

/** Returns true only if token exists and is not expired (checks JWT exp claim) */
function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<UploadNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Refs for SSE lifecycle — mutations only, no re-renders needed
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedTokenRef = useRef<string | null>(null);

  const applyData = (data: { notifications: UploadNotification[]; unreadCount: number }) => {
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  };

  const refresh = useCallback(async () => {
    try {
      const res = await axiosGlobal.get("/notifications");
      applyData(res.data);
    } catch { /* silently fail */ }
  }, []);

  const disconnect = () => {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    connectedTokenRef.current = null;
  };

  const connect = useCallback((t: string) => {
    if (connectedTokenRef.current === t && esRef.current) return; // already connected
    disconnect();

    const es = new EventSource(`${API_BASE}/notifications/stream?token=${encodeURIComponent(t)}`);
    esRef.current = es;
    connectedTokenRef.current = t;

    es.onmessage = (e) => {
      try { applyData(JSON.parse(e.data)); } catch { /* ignore */ }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      connectedTokenRef.current = null;
      const state = useAuthStore.getState();
      if (isTokenValid(state.token) && state.isAuthenticated) {
        retryRef.current = setTimeout(() => connect(state.token!), 10_000);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isTokenValid(token) || !isAuthenticated) {
      disconnect();
      if (fallbackRef.current) { clearInterval(fallbackRef.current); fallbackRef.current = null; }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (typeof EventSource !== "undefined") {
      connect(token!);
    } else {
      // SSE not supported — fallback polling
      refresh();
      if (!fallbackRef.current) fallbackRef.current = setInterval(refresh, 60_000);
    }

    return () => {
      disconnect();
      if (fallbackRef.current) { clearInterval(fallbackRef.current); fallbackRef.current = null; }
    };
  }, [token, isAuthenticated, connect, refresh]);

  const addNotification = useCallback(
    async (n: { type: NotifType; title: string; message: string; fileName?: string }) => {
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
