import { useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import i18n, { normalizeLocale } from "../lib/i18n";
import { AuthContext } from "./authContext";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timeoutId = 0;
  const result = Promise.race([
    promise,
    new Promise<null>((resolve) => {
      timeoutId = window.setTimeout(() => resolve(null), ms);
    }),
  ]);
  return result.finally(() => window.clearTimeout(timeoutId));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let revision = 0;
    let validatedUserId: string | null = null;
    const isCurrent = (version: number) => active && revision === version;

    const syncLanguage = async (user: User, version: number) => {
      const metadata = user.user_metadata as { locale?: string } | undefined;
      let locale = normalizeLocale(metadata?.locale);
      const profileResult = await withTimeout(
        Promise.resolve(supabase.from("profiles").select("locale").eq("id", user.id).maybeSingle()),
        2500,
      );
      const data = profileResult?.data;
      if (data?.locale) locale = normalizeLocale(data.locale as string);
      if (isCurrent(version) && i18n.resolvedLanguage !== locale) await i18n.changeLanguage(locale);
    };

    const validateSession = (candidate: Session, version: number) => {
      if (!isCurrent(version)) return;
      void withTimeout(supabase.auth.getUser(), 2500)
        .then((result) => {
          if (!isCurrent(version) || !result) return;
          if (result.error) {
            if (result.error.status === 401 || result.error.status === 403 || result.error.status === 404) {
              setSession(null);
              validatedUserId = null;
            }
            return;
          }
          const user = result?.data.user;
          if (!user || user.id !== candidate.user.id) return;
          setSession({ ...candidate, user });
          if (validatedUserId !== user.id) {
            void syncLanguage(user, version).then(() => {
              if (isCurrent(version)) validatedUserId = user.id;
            }).catch(() => undefined);
          }
        })
        .catch(() => undefined);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      const version = ++revision;
      setSession(nextSession);
      setLoading(false);
      if (!nextSession) validatedUserId = null;
      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && nextSession) {
        window.setTimeout(() => validateSession(nextSession, version), 0);
      }
    });

    const initialRevision = revision;
    void withTimeout(supabase.auth.getSession(), 5000)
      .then((result) => {
        if (!isCurrent(initialRevision) || !result) return;
        setSession(result.data.session);
        if (result.data.session) validateSession(result.data.session, initialRevision);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isCurrent(initialRevision)) setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      session,
      loading,
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }}>
      {children}
    </AuthContext.Provider>
  );
}
