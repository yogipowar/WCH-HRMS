"use client";

import { create } from "zustand";
import { ApiError, api, setApiToken } from "@/lib/api/client";
import { useDataStore } from "@/lib/stores/data-store";
import type { User } from "@/types";

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  status: "idle" | "loading" | "ready";
  login: (username: string, password: string, remember?: boolean) => Promise<true | string>;
  loginWithGoogle: (credential: string, remember?: boolean) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  savePreferences: (patch: { colorTheme?: string; appearance?: "light" | "dark" | "system" }) => Promise<void>;
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
    } catch (error) {
      set({ user: null, isAuthenticated: false, status: "ready" });
      if (error instanceof ApiError && error.status !== 401 && error.message) return error.message;
      return "The username or password is incorrect.";
    }
    try {
      await useDataStore.getState().hydrateFromApi();
    } catch (error) {
      console.error("Failed to load workspace data after login.", error);
      useDataStore.setState({ ready: true });
    }
    return true;
  },
  loginWithGoogle: async (credential, remember = true) => {
    try {
      const { user, token } = await api.loginWithGoogle(credential, remember);
      setApiToken(token);
      set({ user, isAuthenticated: true, status: "ready" });
    } catch (error) {
      set({ user: null, isAuthenticated: false, status: "ready" });
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Google Sign-In failed.",
      };
    }
    try {
      await useDataStore.getState().hydrateFromApi();
    } catch (error) {
      console.error("Failed to load workspace data after Google login.", error);
      useDataStore.setState({ ready: true });
    }
    return { ok: true };
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
  savePreferences: async (patch) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, ...patch } });
    try {
      const { user } = await api.updatePreferences(patch);
      set({ user });
    } catch (error) {
      set({ user: current });
      console.error("Failed to save theme preference.", error);
    }
  },
}));
