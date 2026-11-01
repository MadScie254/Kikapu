import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, ApiClientError } from "@/lib/api";
import type { PublicUser } from "@shared/types";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (email: string, password: string, displayName: string) => Promise<PublicUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: PublicUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.get<{ user: PublicUser }>("/auth/me");
      setUser(user);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        setUser(null);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api.post<{ user: PublicUser }>("/auth/login", { email, password });
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const { user } = await api.post<{ user: PublicUser }>("/auth/register", { email, password, displayName });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
