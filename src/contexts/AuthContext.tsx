import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppUser } from "@/db/database";
import { supabase } from "@/integrations/supabase/client";
import { authenticateOffline, cacheOfflineUser, setSessionToken, getSessionToken } from "@/lib/offline";

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
      // Offline: no new server session token can be minted; keep any existing one.
      setUser(offlineUser as AppUser);
      return { ok: true };
    }

    // Online path: retry a few times — a transient network hiccup (or a backend
    // waking up) must never block a legitimate login.
    let lastErr: any = null;
    for (let attempt = 0; attempt < 4; attempt++) {
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
        if (found.session_token) setSessionToken(found.session_token);
        await cacheOfflineUser(nextUser, password);
        setUser(nextUser);
        // Push everything pending as soon as we have a valid session.
        forceSyncAll(supabase as any).catch(() => {});
        return { ok: true };
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
    if (offlineUser) {
      setUser(offlineUser as AppUser);
      return { ok: true };
    }
    return { ok: false, error: `Connexion impossible (${lastErr?.message || "réseau"}). Réessayez.` };

  };

  const logout = () => {
    const token = getSessionToken();
    if (token && navigator.onLine) {
      db.rpc("logout_app_session").catch(() => {});
    }
    setSessionToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(() => ({ user, isAuthenticated: Boolean(user), login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
