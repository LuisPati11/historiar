import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getNearbyMonuments, getAllMonuments, type Monument } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { AvatarImage } from "../components/AvatarPicker";
import { BottomNav } from "../components/BottomNav";

type ViewMode = "list" | "map";

const loadMonumentsMap = () => import("../components/MonumentsMap");
const MonumentsMap = lazy(() => loadMonumentsMap().then((m) => ({ default: m.MonumentsMap })));

function MonumentImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  return (
    <div className="relative w-full h-full" style={{ minHeight: "130px" }}>
      {status === "loading" && (
        <div className="absolute inset-0 bg-[#E8E3DC] overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#f0ece6]">
          <svg width="44" height="44" viewBox="0 0 36 36" fill="none" opacity="0.35">
            <line x1="4" y1="30" x2="32" y2="30" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
            <line x1="10" y1="30" x2="10" y2="18" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
            <line x1="18" y1="30" x2="18" y2="18" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
            <line x1="26" y1="30" x2="26" y2="18" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
            <line x1="6" y1="18" x2="30" y2="18" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
            <polyline points="4,16 18,7 32,16" stroke="#7C6A55" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover transition-opacity duration-300 ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
        style={{ minHeight: "130px" }}
      />
    </div>
  );
}

function EmptyState({ icon, title, hint, action }: {
  icon: string;
  title: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center pt-16 pb-8 px-6 text-center gap-3">
      <span className="text-5xl mb-1">{icon}</span>
      <p className="text-body font-semibold text-graphite">{title}</p>
      {hint && <p className="text-body-sm text-ash-gray">{hint}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded-full bg-pinterest-red text-canvas-white px-6 py-2.5 text-body font-semibold"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function formatDistance(m: number) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

export function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [monuments, setMonuments] = useState<Array<Monument & { distance_m: number }>>([]);
  const [allMonuments, setAllMonuments] = useState<Monument[]>([]);
  const [gpsState, setGpsState] = useState<"searching" | "denied" | "timeout" | "unavailable" | "done">("searching");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [view, setView] = useState<ViewMode>("list");

  useEffect(() => {
    getAllMonuments().then(setAllMonuments).catch(() => {});
  }, []);

  useEffect(() => {
    const preload = () => { void loadMonumentsMap(); };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(preload, { timeout: 2500 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }
    const timer = globalThis.setTimeout(preload, 1200);
    return () => globalThis.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsState("unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        try {
          const nearby = await getNearbyMonuments(pos.coords.latitude, pos.coords.longitude, 5000);
          setMonuments(nearby);
        } catch {
          // datos no disponibles pero GPS ok — mostrar lista vacía
        } finally {
          setGpsState("done");
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsState("denied");
        else if (err.code === err.TIMEOUT) setGpsState("timeout");
        else setGpsState("unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  return (
    <main className="min-h-full flex flex-col pb-24 bg-canvas-white">
      {/* Header */}
      <header className="px-5 pt-10 pb-4 flex items-center justify-between bg-canvas-white">
        <div className="flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="shrink-0">
            {/* Base */}
            <line x1="4" y1="30" x2="32" y2="30" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round"/>
            {/* Columnas */}
            <line x1="10" y1="30" x2="10" y2="18" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round"/>
            <line x1="18" y1="30" x2="18" y2="18" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round"/>
            <line x1="26" y1="30" x2="26" y2="18" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round"/>
            {/* Friso */}
            <line x1="6" y1="18" x2="30" y2="18" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round"/>
            {/* Frontón triangular */}
            <polyline points="4,16 18,7 32,16" stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <h1 className="text-heading font-bold text-jet-black leading-tight">{t("home.title")}</h1>
            <p className="text-body-sm text-ash-gray">{t("app.tagline")}</p>
          </div>
        </div>
        {user ? (
          <Link to="/profile">
            <AvatarImage avatarId={(user.user_metadata as { avatar?: string })?.avatar} size="sm" />
          </Link>
        ) : (
          <Link to="/auth" className="rounded-2xl bg-canvas-white border border-whisper-gray text-jet-black px-4 py-2 text-body font-medium shadow-sm">
            {t("home.sign_in")}
          </Link>
        )}
      </header>

      {/* Toggle lista / mapa */}
      <div className="px-5 mb-4">
        <div className="flex rounded-2xl bg-[#F0F0F0] p-1 w-full">
          <button
            onClick={() => setView("list")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-body font-medium transition-all ${view === "list" ? "bg-jet-black text-canvas-white shadow-sm" : "text-ash-gray"}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="1" y1="4" x2="15" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="1" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {t("home.list")}
          </button>
          <button
            onClick={() => setView("map")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-body font-medium transition-all ${view === "map" ? "bg-jet-black text-canvas-white shadow-sm" : "text-ash-gray"}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <polygon points="1,3 6,1 10,3 15,1 15,13 10,15 6,13 1,15" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
              <line x1="6" y1="1" x2="6" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="10" y1="3" x2="10" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {t("home.map")}
          </button>
        </div>
      </div>

      {/* Vista lista */}
      {view === "list" && (
        <div className="px-5 flex-1">
          {/* Spinner buscando GPS */}
          {gpsState === "searching" && (
            <div className="flex flex-col items-center pt-16 gap-3">
              <div className="w-8 h-8 rounded-full border-[3px] border-ash-gray border-t-transparent animate-spin" />
              <p className="text-body text-ash-gray">{t("home.searching")}</p>
            </div>
          )}

          {/* GPS denegado */}
          {gpsState === "denied" && (
            <EmptyState
              icon="📍"
              title={t("home.location_denied")}
              hint={t("home.location_denied_hint")}
              action={{ label: t("home.see_map"), onClick: () => setView("map") }}
            />
          )}

          {/* Timeout GPS */}
          {gpsState === "timeout" && (
            <EmptyState
              icon="⏱️"
              title={t("home.location_timeout")}
              hint={t("home.location_timeout_hint")}
              action={{ label: t("home.retry"), onClick: () => window.location.reload() }}
            />
          )}

          {/* GPS no disponible */}
          {gpsState === "unavailable" && (
            <EmptyState
              icon="🧭"
              title={t("home.no_geolocation")}
              hint={t("home.no_geolocation_hint")}
              action={{ label: t("home.see_map"), onClick: () => setView("map") }}
            />
          )}

          {/* Sin monumentos cerca */}
          {gpsState === "done" && monuments.length === 0 && (
            <EmptyState
              icon="🏛️"
              title={t("home.none_nearby")}
              hint={t("home.none_nearby_hint")}
              action={{ label: t("home.see_map"), onClick: () => setView("map") }}
            />
          )}
          <ul className="space-y-3">
            {monuments.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => navigate(`/monument/${m.id}`)}
                  className="w-full text-left rounded-3xl bg-canvas-white shadow-sm active:scale-[0.99] transition-transform overflow-hidden"
                >
                  <div className="flex gap-0 h-[148px]">
                    {/* Foto */}
                    <div className="w-36 shrink-0 h-full">
                      {m.reference_image_url ? (
                        <MonumentImage src={m.reference_image_url} alt={m.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#f0ece6]" style={{ minHeight: "130px" }}>
                          <svg width="44" height="44" viewBox="0 0 36 36" fill="none" opacity="0.35">
                            <line x1="4" y1="30" x2="32" y2="30" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="10" y1="30" x2="10" y2="18" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="18" y1="30" x2="18" y2="18" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="26" y1="30" x2="26" y2="18" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="6" y1="18" x2="30" y2="18" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
                            <polyline points="4,16 18,7 32,16" stroke="#7C6A55" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0 p-4">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h2 className="text-subheading font-bold text-jet-black leading-snug flex-1 line-clamp-2">{m.name}</h2>
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <span className="text-body-sm font-medium text-amber-700">{formatDistance(m.distance_m)}</span>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ash-gray">
                            <path d="M5 2.5L9.5 7 5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      <p className="text-body-sm text-ash-gray flex items-center gap-1 mb-3">
                        <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
                          <path d="M5.5 1C3.015 1 1 3.015 1 5.5c0 3.375 4.5 7.5 4.5 7.5S10 8.875 10 5.5C10 3.015 7.985 1 5.5 1z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                          <circle cx="5.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                        </svg>
                        {m.city}
                      </p>
                      <div className="flex items-center gap-2 pt-2 border-t border-whisper-gray">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-ash-gray">
                          <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                          <rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                          <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                          <rect x="11" y="11" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
                          <rect x="15" y="11" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
                          <rect x="11" y="15" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
                          <rect x="15" y="15" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
                          <rect x="4" y="4" width="3" height="3" fill="currentColor" rx="0.3"/>
                          <rect x="13" y="4" width="3" height="3" fill="currentColor" rx="0.3"/>
                          <rect x="4" y="13" width="3" height="3" fill="currentColor" rx="0.3"/>
                        </svg>
                        <p className="text-body-sm text-ash-gray">{t("home.scan_qr_hint")}</p>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vista mapa */}
      {view === "map" && (
        <div className="flex-1 mx-5 rounded-3xl overflow-hidden shadow-sm" style={{ height: "calc(100dvh - 260px)" }}>
          {allMonuments.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center bg-canvas-white rounded-3xl">
              <p className="text-body text-ash-gray">{t("home.searching")}</p>
            </div>
          ) : (
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-canvas-white rounded-3xl">
                <div className="w-8 h-8 rounded-full border-[3px] border-pinterest-red border-t-transparent animate-spin" />
              </div>
            }>
              <MonumentsMap monuments={allMonuments} userLat={userLat} userLng={userLng} />
            </Suspense>
          )}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
