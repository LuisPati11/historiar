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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), ms)),
  ]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncLanguage = async (user: User) => {
      const metadata = user.user_metadata as { locale?: string } | undefined;
      let locale = normalizeLocale(metadata?.locale);
      const profileResult = await withTimeout(
        Promise.resolve(supabase.from("profiles").select("locale").eq("id", user.id).maybeSingle()),
        2500,
      );
      const data = profileResult?.data;
      if (!metadata?.locale && data?.locale) locale = normalizeLocale(data.locale as string);
      if (i18n.resolvedLanguage !== locale) await i18n.changeLanguage(locale);
    };

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);

      if (data.session) {
        void withTimeout(supabase.auth.getUser(), 2500).then((result) => {
          const user = result?.data.user;
          if (!user) return;
          setSession({ ...data.session!, user });
          void syncLanguage(user);
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && s) {
        void withTimeout(supabase.auth.getUser(), 2500).then((result) => {
          const user = result?.data.user;
          if (!user) return;
          setSession({ ...s, user });
          void syncLanguage(user);
        });
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
