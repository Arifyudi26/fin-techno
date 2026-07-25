/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";

interface AuthState {
  id: string | null;
  token: string | null;
  role: any | null;
  name: string | null;
  avatar: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setId: (id: string) => void;
  setToken: (token: string) => void;
  setRole: (role: any) => void;
  setName: (name: string) => void;
  setAvatar: (avatar: string | null) => void;
  logout: () => void;
  setHasHydrated: (v: boolean) => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      id: null,
      token: Cookies.get("token") || null,
      role: null,
      name: null,
      avatar: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setId: (id: string) => set({ id }),
      setToken: (token: string) => {
        Cookies.set("token", token, { expires: 1, path: "/", sameSite: "Lax" });
        set({ token, isAuthenticated: true });
      },
      setRole: (role: any) => set({ role, isAuthenticated: !!role }),
      setName: (name: string) => set({ name }),
      setAvatar: (avatar: string | null) => set({ avatar }),
      logout: () => {
        Cookies.remove("token");
        set({ id: null, token: null, role: null, name: null, avatar: null, isAuthenticated: false });
      },
      setHasHydrated: (v: boolean) => set({ _hasHydrated: v }),
    }),
    {
      name: "auth-store",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Auto-logout jika token sudah expired saat halaman di-refresh
        if (state?.token) {
          try {
            const payload = JSON.parse(atob(state.token.split(".")[1]));
            const isExpired = typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
            if (isExpired) {
              state.logout();
            }
          } catch {
            state.logout();
          }
        }
      },
    }
  )
);

export default useAuthStore;
