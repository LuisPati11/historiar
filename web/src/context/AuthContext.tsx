import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import i18n, { normalizeLocale } from "../lib/i18n";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncLanguage = async (user: User) => {
      const metadata = user.user_metadata as { locale?: string } | undefined;
      let locale = normalizeLocale(metadata?.locale);
      const { data } = await supabase.from("profiles").select("locale").eq("id", user.id).maybeSingle();
      if (!metadata?.locale && data?.locale) locale = normalizeLocale(data.locale as string);
      if (i18n.resolvedLanguage !== locale) await i18n.changeLanguage(locale);
    };

    // getUser() va al servidor y devuelve user_metadata fresco (no el JWT cacheado)
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await syncLanguage(user);
        setSession(user ? { ...data.session, user } : data.session);
      } else {
        setSession(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && s) {
        // Refrescar desde servidor para que user_metadata incluya avatar/username del signup
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await syncLanguage(user);
        setSession(user ? { ...s, user } : s);
      } else {
        setSession(s);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      session,
      loading,
      signOut: () => supabase.auth.signOut().then(() => {}),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
