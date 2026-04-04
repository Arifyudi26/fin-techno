/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";

interface AuthState {
  setId: any | null;
  token: string | null;
  role: any | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setRole: (role: any) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      setId: null,
      token: Cookies.get("token") || null,
      role: null,
      isAuthenticated: false,
      setToken: (token: string) => {
        // Expires in 1 day
        Cookies.set("token", token, { expires: 1 });
        set({ token, isAuthenticated: true });
      },
      setRole: (role: any) => set({ role, isAuthenticated: !!role }),
      logout: () => {
        Cookies.remove("token");
        set({ token: null, role: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-store",
    }
  )
);

export default useAuthStore;
