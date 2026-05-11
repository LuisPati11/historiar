import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase, syncProfile } from "../lib/supabase";
import { AvatarPicker, type AvatarId } from "../components/AvatarPicker";
import { LanguageSelect } from "../components/LanguageSelect";
import { currentLocale, type Locale } from "../lib/i18n";

type Mode = "login" | "register";

const HERO_URL = "https://qvevpackpwpjqgsapqws.supabase.co/storage/v1/object/public/monument-images/puerta-toledo-login.jpg";

export function AuthPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/";

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<AvatarId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [locale, setLocale] = useState<Locale>(() => currentLocale());

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale);
    await i18n.changeLanguage(nextLocale);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        if (!avatar) { setError(t("auth.avatar_required")); setLoading(false); return; }
        const finalUsername = username || email.split("@")[0];
        const { error, data } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { username: finalUsername, full_name: finalUsername, avatar, locale },
            emailRedirectTo: "https://travel-guide-medals.netlify.app",
          },
        });
        if (error) throw error;
        if (data.user) await syncProfile(finalUsername, avatar, locale);
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

  if (pendingEmail) {
    return (
      <main className="min-h-full flex items-center justify-center px-6 py-12 bg-[#F5F2EE]">
        <div className="w-full max-w-sm text-center">
          <p className="text-5xl mb-6">✉️</p>
          <h1 className="text-heading font-bold text-jet-black mb-2">{t("auth.check_email_title")}</h1>
          <p className="text-body text-ash-gray mb-1">{t("auth.check_email_body")}</p>
          <p className="text-body font-medium text-graphite mb-8">{pendingEmail}</p>
          <button onClick={async () => { setResent(false); await supabase.auth.resend({ type: "signup", email: pendingEmail, options: { emailRedirectTo: "https://travel-guide-medals.netlify.app" } }); setResent(true); }}
            className="rounded-full border border-[#DDD8D0] bg-canvas-white text-graphite px-6 py-3 text-body font-medium">
            {resent ? t("auth.check_email_resent") : t("auth.check_email_resend")}
          </button>
          <button onClick={() => navigate("/", { replace: true })} className="w-full text-center mt-4 text-body-sm text-ash-gray">
            {t("auth.skip")}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full bg-[#F5F2EE] flex flex-col overflow-hidden">

      {/* Hero con gradiente */}
      <div className="relative w-full shrink-0" style={{ height: mode === "register" ? "25vh" : "40vh", minHeight: mode === "register" ? "140px" : "200px" }}>
        <img src={HERO_URL} alt="HistoriAR" className="w-full h-full object-cover" style={{ objectPosition: "70% 38%" }} />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, transparent 30%, #F5F2EE 100%)"
        }} />
      </div>

      {/* Contenido */}
      <div className="flex-1 px-6 pb-4 -mt-4 overflow-y-auto flex flex-col">

        {/* Logo */}
        <div className="mb-4">
          <div className="mb-2">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <line x1="4" y1="30" x2="32" y2="30" stroke="#8B1A1A" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="10" y1="30" x2="10" y2="18" stroke="#8B1A1A" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="18" y1="30" x2="18" y2="18" stroke="#8B1A1A" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="26" y1="30" x2="26" y2="18" stroke="#8B1A1A" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="6" y1="18" x2="30" y2="18" stroke="#8B1A1A" strokeWidth="1.8" strokeLinecap="round"/>
              <polyline points="4,16 18,7 32,16" stroke="#8B1A1A" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-[2.2rem] font-black leading-tight text-jet-black">
            Histori<span className="text-pinterest-red">AR</span>
          </h1>
          <p className="text-body text-ash-gray mt-1">
            {mode === "login" ? "Explora la historia\na tu alrededor" : "Crea tu cuenta de explorador"}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">

          {mode === "register" && (
            <div>
              <label className="block text-body-sm font-semibold text-graphite mb-2">Nombre de explorador</label>
              <div className="flex items-center gap-3 border-b border-[#CCC8C2] pb-2">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="6" r="3.5" stroke="#9E9E9E" strokeWidth="1.3" fill="none"/>
                  <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="#9E9E9E" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
                </svg>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="tu_nombre" autoComplete="username"
                  className="flex-1 bg-transparent text-body text-graphite placeholder:text-[#BBB7B0] focus:outline-none" />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-body-sm font-semibold text-graphite mb-2">Email</label>
            <div className="flex items-center gap-3 border-b border-[#CCC8C2] pb-2">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2" y="4" width="14" height="10" rx="1.5" stroke="#9E9E9E" strokeWidth="1.3" fill="none"/>
                <polyline points="2,5 9,11 16,5" stroke="#9E9E9E" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" autoComplete="email"
                className="flex-1 bg-transparent text-body text-graphite placeholder:text-[#BBB7B0] focus:outline-none" />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-body-sm font-semibold text-graphite mb-2">Contraseña</label>
            <div className="flex items-center gap-3 border-b border-[#CCC8C2] pb-2">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="4" y="8" width="10" height="7" rx="1.5" stroke="#9E9E9E" strokeWidth="1.3" fill="none"/>
                <path d="M6 8V6a3 3 0 016 0v2" stroke="#9E9E9E" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
              </svg>
              <input type={showPassword ? "text" : "password"} required minLength={6}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete={mode === "register" ? "new-password" : "current-password"}
                className="flex-1 bg-transparent text-body text-graphite placeholder:text-[#BBB7B0] focus:outline-none" />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="shrink-0 text-ash-gray">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  {showPassword ? (
                    <>
                      <path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                    </>
                  ) : (
                    <>
                      <path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                      <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {mode === "register" && (
            <>
              <LanguageSelect
                value={locale}
                onChange={(nextLocale) => { void handleLocaleChange(nextLocale); }}
                label={t("profile.language")}
              />

              <div>
                <label className="block text-body-sm font-semibold text-graphite mb-3">{t("auth.choose_avatar")}</label>
                <AvatarPicker selected={avatar} onSelect={setAvatar} />
              </div>
            </>
          )}

          {error && <p className="text-body-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

          {/* Botón principal */}
          <button type="submit" disabled={loading}
            className="w-full rounded-full bg-pinterest-red text-canvas-white py-4 text-body font-semibold flex items-center justify-center gap-2 px-6 disabled:opacity-50 active:scale-[0.98] transition-transform shadow-sm mt-1">
            <span>{loading ? "…" : mode === "login" ? "Entrar" : "Crear cuenta"}</span>
          </button>
        </form>

        {/* Cambiar modo */}
        <p className="text-center text-body-sm text-ash-gray mt-3">
          {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
            className="text-pinterest-red font-semibold">
            {mode === "login" ? "Crear cuenta" : "Iniciar sesión"} →
          </button>
        </p>

        {/* Divisor */}
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-[#DDD8D0]" />
          <span className="text-body-sm text-ash-gray">o</span>
          <div className="flex-1 h-px bg-[#DDD8D0]" />
        </div>

        {/* Explorar sin cuenta */}
        <button onClick={() => navigate("/", { replace: true })}
          className="w-full flex items-center gap-4 active:opacity-70 transition-opacity">
          <div className="w-11 h-11 rounded-full border border-[#DDD8D0] flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="#9E9E9E" strokeWidth="1.4" fill="none"/>
              <polygon points="10,4 12,9 17,10 12,11 10,16 8,11 3,10 8,9" stroke="#9E9E9E" strokeWidth="1.2" fill="none" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-body font-semibold text-jet-black">Explorar sin cuenta</p>
            <p className="text-body-sm text-ash-gray">Descubre monumentos y vive la experiencia AR</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="#9E9E9E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

      </div>
    </main>
  );
}
