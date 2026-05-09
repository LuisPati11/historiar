import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase, syncProfile } from "../lib/supabase";
import { AvatarPicker, type AvatarId } from "../components/AvatarPicker";

type Mode = "login" | "register";

export function AuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<AvatarId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        if (!avatar) { setError(t("auth.avatar_required")); setLoading(false); return; }
        const finalUsername = username || email.split("@")[0];
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: finalUsername, avatar },
            emailRedirectTo: "https://travel-guide-medals.netlify.app",
          },
        });
        if (error) throw error;
        if (data.user) await syncProfile(finalUsername, avatar);
        setPendingEmail(email);
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setResent(false);
    await supabase.auth.resend({ type: "signup", email: pendingEmail, options: { emailRedirectTo: "https://travel-guide-medals.netlify.app" } });
    setResent(true);
  };

  if (pendingEmail) {
    return (
      <main className="min-h-full flex items-center justify-center px-6 py-12 bg-whisper-gray">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-6">✉️</div>
          <h1 className="text-heading font-bold text-jet-black mb-2">{t("auth.check_email_title")}</h1>
          <p className="text-body text-ash-gray mb-1">{t("auth.check_email_body")}</p>
          <p className="text-body font-medium text-graphite mb-8">{pendingEmail}</p>
          <button
            onClick={handleResend}
            className="rounded-2xl border border-whisper-gray bg-canvas-white text-graphite px-6 py-3 text-body font-medium active:scale-95 transition-transform"
          >
            {resent ? t("auth.check_email_resent") : t("auth.check_email_resend")}
          </button>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="w-full text-center mt-4 text-body-sm text-ash-gray"
          >
            {t("auth.skip")}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full flex items-center justify-center px-6 py-12 bg-whisper-gray">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-heading font-bold text-jet-black">HistoriAR</h1>
          <p className="text-body text-ash-gray mt-1">
            {mode === "login" ? t("auth.login_tagline") : t("auth.register_tagline")}
          </p>
        </div>

        {/* Tarjeta */}
        <div className="rounded-3xl bg-canvas-white shadow-sm p-6">

          {/* Toggle login / registro */}
          <div className="flex rounded-2xl bg-whisper-gray p-1 mb-6">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 rounded-xl py-2 text-body font-medium transition-colors ${
                  mode === m
                    ? "bg-canvas-white text-jet-black shadow-sm"
                    : "text-ash-gray"
                }`}
              >
                {t(`auth.${m}`)}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === "register" && (
              <div>
                <label className="block text-body-sm font-medium text-graphite mb-1.5">
                  {t("auth.username")}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("auth.username_placeholder")}
                  className="w-full rounded-2xl border border-whisper-gray bg-whisper-gray px-4 py-3 text-body text-graphite placeholder:text-ash-gray focus:outline-none focus:border-pinterest-red focus:bg-canvas-white transition"
                />
              </div>
            )}

            <div>
              <label className="block text-body-sm font-medium text-graphite mb-1.5">
                {t("auth.email")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-2xl border border-whisper-gray bg-whisper-gray px-4 py-3 text-body text-graphite placeholder:text-ash-gray focus:outline-none focus:border-pinterest-red focus:bg-canvas-white transition"
              />
            </div>

            <div>
              <label className="block text-body-sm font-medium text-graphite mb-1.5">
                {t("auth.password")}
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-whisper-gray bg-whisper-gray px-4 py-3 text-body text-graphite placeholder:text-ash-gray focus:outline-none focus:border-pinterest-red focus:bg-canvas-white transition"
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-body-sm font-medium text-graphite mb-3">
                  {t("auth.choose_avatar")}
                </label>
                <AvatarPicker selected={avatar} onSelect={setAvatar} />
              </div>
            )}

            {error && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-body-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-pinterest-red text-canvas-white py-3 text-body font-semibold disabled:opacity-50 active:scale-95 transition-transform mt-1"
            >
              {loading ? "…" : t(`auth.${mode}_cta`)}
            </button>
          </form>
        </div>

        {/* Saltar */}
        <button
          onClick={() => navigate(from, { replace: true })}
          className="w-full text-center mt-4 text-body-sm text-ash-gray"
        >
          {t("auth.skip")}
        </button>
      </div>
    </main>
  );
}
