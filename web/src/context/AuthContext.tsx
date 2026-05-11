import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

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
    // getUser() va al servidor y devuelve user_metadata fresco (no el JWT cacheado)
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const { data: { user } } = await supabase.auth.getUser();
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
