import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "@workspace/api-client-react";
export type { AuthUser };

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  login: (returnTo?: string) => void;
  logout: (returnTo?: string) => void;
};

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/user", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Authentication request failed (${response.status}).`);
      const payload: unknown = await response.json();
      if (
        typeof payload === "object" &&
        payload !== null &&
        "user" in payload &&
        (payload.user === null || typeof payload.user === "object")
      ) {
        setUser(payload.user as AuthUser | null);
      } else {
        throw new Error("Authentication response was invalid.");
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback((returnTo = window.location.pathname) => {
    const safePath = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
    window.location.assign(`/api/login?returnTo=${encodeURIComponent(safePath)}`);
  }, []);

  const logout = useCallback((returnTo = "/") => {
    const safePath = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
    window.location.assign(`/api/logout?returnTo=${encodeURIComponent(safePath)}`);
  }, []);

  return { user, isLoading, isAuthenticated: user !== null, refresh, login, logout };
}
