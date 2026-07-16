import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppUser } from "@/db/database";
import { supabase } from "@/integrations/supabase/client";
import { authenticateOffline, cacheOfflineUser } from "@/lib/offline";

const db = supabase as any;

type AuthContextValue = {
  user: AppUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = "aschrisk.auth.user.v2";

function readUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null") as AppUser | null; } catch { return null; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => readUser());

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  const login: AuthContextValue["login"] = async (username, password) => {
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) return { ok: false, error: "Identifiant et mot de passe requis" };

    const offlineUser = await authenticateOffline(cleanUsername, password);
    if (!navigator.onLine && offlineUser) {
      setUser(offlineUser as AppUser);
      return { ok: true };
    }

    try {
      const { data, error } = await db.rpc("authenticate_app_user", { p_username: cleanUsername, p_password: password });
      if (error) throw error;
      const found = Array.isArray(data) ? data[0] : data;
      if (!found) return { ok: false, error: "Identifiant ou mot de passe incorrect" };
      const nextUser: AppUser = {
        id: found.id,
        username: found.username,
        role: found.role,
        display_name: found.display_name,
        is_active: found.is_active,
        created_at: found.created_at,
      };
      await cacheOfflineUser(nextUser, password);
      setUser(nextUser);
      return { ok: true };
    } catch {
      if (!offlineUser) return { ok: false, error: "Connexion impossible. Réessayez avec un compte déjà utilisé ici." };
      setUser(offlineUser as AppUser);
      return { ok: true };
    }
  };

  const value = useMemo<AuthContextValue>(() => ({ user, isAuthenticated: Boolean(user), login, logout: () => setUser(null) }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
