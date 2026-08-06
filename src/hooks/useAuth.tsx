/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "administrator" | "manager" | "housekeeping" | "read_only";

type AuthValue = {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  fullName: string | null;
  loading: boolean;
  canManage: boolean;
  canOperate: boolean;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  role: null,
  fullName: null,
  loading: true,
  canManage: false,
  canOperate: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const userEmail = session?.user?.email ?? null;

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setRole(null);
        setFullName(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    let active = true;
    (async () => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      ]);
      if (!active) return;
      const order: AppRole[] = ["administrator", "manager", "housekeeping", "read_only"];
      const found = (roles ?? []).map((r) => r.role as AppRole);
      setRole(order.find((r) => found.includes(r)) ?? "read_only");
      setFullName(profile?.full_name ?? userEmail);
    })();
    return () => {
      active = false;
    };
  }, [session?.user?.id, userEmail]);

  const value: AuthValue = {
    user: session?.user ?? null,
    session,
    role,
    fullName,
    loading,
    canManage: role === "administrator" || role === "manager",
    canOperate: role === "administrator" || role === "manager" || role === "housekeeping",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
