"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authenticate } from "@/lib/auth/credentials";
import { STORAGE_KEYS } from "@/lib/constants";
import type { User } from "@/types";

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (username, password) => {
        const account = authenticate(username, password);
        if (!account) {
          return false;
        }
        set({ user: account, isAuthenticated: true });
        return true;
      },
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: STORAGE_KEYS.auth,
    },
  ),
);
