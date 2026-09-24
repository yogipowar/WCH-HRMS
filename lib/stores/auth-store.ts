"use client";

import { create } from "zustand";
import { api, setApiToken } from "@/lib/api/client";
import { useDataStore } from "@/lib/stores/data-store";
import type { User } from "@/types";

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  status: "idle" | "loading" | "ready";
  login: (username: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  status: "idle",
  login: async (username, password, remember = true) => {
    try {
      const { user, token } = await api.login(username, password, remember);
      setApiToken(token);
      set({ user, isAuthenticated: true, status: "ready" });
    } catch {
      set({ user: null, isAuthenticated: false, status: "ready" });
      return false;
    }
    try {
      await useDataStore.getState().hydrateFromApi();
    } catch (error) {
      console.error("Failed to load workspace data after login.", error);
      useDataStore.setState({ ready: true });
    }
    return true;
  },
  logout: async () => {
    try {
      await api.logout();
    } catch {
      // Cookie clear can fail if the session is already gone.
    }
    setApiToken(null);
    useDataStore.getState().reset();
    set({ user: null, isAuthenticated: false, status: "ready" });
  },
  restore: async () => {
    if (get().status === "loading") return;
    if (get().status === "ready" && get().user && useDataStore.getState().ready) return;
    set({ status: "loading" });
    try {
      const { user } = await api.me();
      set({ user, isAuthenticated: true, status: "ready" });
      try {
        await useDataStore.getState().hydrateFromApi();
      } catch (error) {
        console.error("Failed to load workspace data.", error);
        useDataStore.setState({ ready: true });
      }
    } catch {
      setApiToken(null);
      useDataStore.getState().reset();
      set({ user: null, isAuthenticated: false, status: "ready" });
    }
  },
}));
