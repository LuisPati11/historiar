import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getNearbyMonuments, getAllMonuments, type Monument } from "../lib/api/monuments";
import { useAuth } from "../context/authContext";
import { AvatarImage } from "../components/AvatarPicker";
import { BottomNav } from "../components/BottomNav";
import { centuryLabel, formatDistance } from "../lib/format";

type ViewMode = "list" | "map";

const loadMonumentsMap = () => import("../components/MonumentsMap");
const MonumentsMap = lazy(() => loadMonumentsMap().then((m) => ({ default: m.MonumentsMap })));

function MonumentImage({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  return (
    <div className="relative w-full h-full">
      {status === "loading" && (
        <div className="absolute inset-0 bg-[#E8E3DC] overflow-hidden rounded-2xl">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#f0ece6] rounded-2xl">
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
        className={`w-full h-full object-cover rounded-2xl transition-opacity duration-300 ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
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

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [monuments, setMonuments] = useState<Array<Monument & { distance_m: number }>>([]);
  const [allMonuments, setAllMonuments] = useState<Monument[]>([]);
  const [gpsState, setGpsState] = useState<"searching" | "denied" | "timeout" | "unavailable" | "done">("searching");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [fetchError, setFetchError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFetchError(false);
    getAllMonuments()
      .then((items) => { if (!cancelled) setAllMonuments(items); })
      .catch(() => { if (!cancelled) setFetchError(true); });

    if (!navigator.geolocation) {
      setGpsState("unavailable");
      return () => { cancelled = true; };
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        try {
          const nearby = await getNearbyMonuments(pos.coords.latitude, pos.coords.longitude, 5000);
          if (!cancelled) setMonuments(nearby);
        } catch {
          if (!cancelled) setFetchError(true);
        } finally {
          if (!cancelled) setGpsState("done");
        }
      },
      (err) => {
        if (cancelled) return;
        if (err.code === err.PERMISSION_DENIED) setGpsState("denied");
        else if (err.code === err.TIMEOUT) setGpsState("timeout");
        else setGpsState("unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30_000 },
    );
    return () => { cancelled = true; };
  }, [reloadKey, i18n.resolvedLanguage]);

  const nearbyCount = gpsState === "done" && monuments.length > 0 ? monuments.length : allMonuments.length;

  return (
    <main className={`flex flex-col bg-canvas-white ${view === "map" ? "h-dvh overflow-hidden" : "min-h-full pb-24"}`}>
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
            <p className="text-body-sm text-ash-gray">
              {nearbyCount > 0
                ? t("home.nearby_count", { count: nearbyCount })
                : t("app.tagline")}
            </p>
          </div>
        </div>
        {user ? (
          <Link to="/profile" aria-label={t("nav.profile")}>
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
            aria-pressed={view === "list"}
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
            aria-pressed={view === "map"}
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
          {fetchError && (
            <div role="alert" className="mb-3 rounded-2xl bg-red-50 px-4 py-3 flex items-center gap-3">
              <p className="text-body-sm text-red-700 flex-1">{t("common.connection_error")}</p>
              <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="text-body-sm font-semibold text-pinterest-red">
                {t("common.retry")}
              </button>
            </div>
          )}
          {/* GPS denegado / timeout / sin GPS — banner no bloqueante */}
          {(gpsState === "denied" || gpsState === "timeout" || gpsState === "unavailable") && allMonuments.length > 0 && (
            <div className="mb-3 rounded-2xl bg-whisper-gray px-4 py-2.5 flex items-center gap-2">
              <span className="text-base">📍</span>
              <p className="text-body-sm text-ash-gray flex-1">
                {gpsState === "denied" ? t("home.location_denied") : t("home.no_geolocation")}
              </p>
            </div>
          )}

          {/* Sin monumentos cerca (GPS ok pero radio vacío) */}
          {gpsState === "done" && monuments.length === 0 && allMonuments.length === 0 && (
            <EmptyState
              icon="🏛️"
              title={t("home.none_nearby")}
              hint={t("home.none_nearby_hint")}
              action={{ label: t("home.see_map"), onClick: () => setView("map") }}
            />
          )}

          {/* Skeletons mientras carga la lista inicial */}
          {allMonuments.length === 0 && gpsState === "searching" && (
            <ul className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="rounded-3xl bg-canvas-white border border-whisper-gray h-[160px] flex p-3 gap-3 animate-pulse">
                  <div className="w-[134px] shrink-0 rounded-2xl bg-whisper-gray" />
                  <div className="flex-1 flex flex-col gap-2 pt-1">
                    <div className="h-3 rounded-full bg-whisper-gray w-2/3" />
                    <div className="h-4 rounded-full bg-whisper-gray w-full" />
                    <div className="h-4 rounded-full bg-whisper-gray w-4/5" />
                    <div className="mt-auto h-3 rounded-full bg-whisper-gray w-1/2" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Lista de monumentos — cercanos si hay GPS, todos si no */}
          {(() => {
            const displayList: Array<Monument & { distance_m?: number }> =
              gpsState === "done" && monuments.length > 0
                ? monuments
                : allMonuments;
            if (displayList.length === 0) return null;
            return (
              <ul className="space-y-3">
                {displayList.map((m) => {
                  const hasAR = Boolean(m.video_url && m.mind_target_url);
                  const century = m.built_year ? centuryLabel(m.built_year, i18n.language) : null;
                  return (
                    <li key={m.id}>
                      <button
                        onClick={() => navigate(`/monument/${m.id}`)}
                        className="w-full text-left rounded-3xl bg-canvas-white border border-whisper-gray active:scale-[0.99] transition-transform overflow-hidden"
                      >
                        <div className="flex gap-3 p-3 h-[160px]">
                          {/* Foto cuadrada */}
                          <div className="w-[134px] shrink-0 h-full relative">
                            {m.reference_image_url ? (
                              <MonumentImage src={m.reference_image_url} alt={m.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#f0ece6] rounded-2xl">
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
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                              {/* Badge AR */}
                              {hasAR && (
                                <div className="inline-flex items-center gap-1 rounded-full bg-[#FFF3E0] px-2.5 py-0.5 mb-1.5">
                                  <span className="text-[10px] font-semibold text-amber-700 leading-none">✦ {t("home.ar_available")}</span>
                                </div>
                              )}
                              <h2 className="text-subheading font-bold text-jet-black leading-snug line-clamp-2">{m.name}</h2>
                            </div>

                            {/* Metadatos inferiores */}
                            <div className="flex flex-col gap-1">
                              {/* Ciudad */}
                              <p className="text-body-sm text-ash-gray flex items-center gap-1">
                                <svg width="10" height="12" viewBox="0 0 11 13" fill="none" className="shrink-0">
                                  <path d="M5.5 1C3.015 1 1 3.015 1 5.5c0 3.375 4.5 7.5 4.5 7.5S10 8.875 10 5.5C10 3.015 7.985 1 5.5 1z" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                                  <circle cx="5.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.3" fill="none"/>
                                </svg>
                                {m.city}
                              </p>

                              {/* Siglo / distancia */}
                              <div className="flex items-center justify-between">
                                {century ? (
                                  <p className="text-body-sm text-ash-gray flex items-center gap-1">
                                    <svg width="12" height="12" viewBox="0 0 36 36" fill="none" className="shrink-0 opacity-60">
                                      <line x1="4" y1="30" x2="32" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                                      <line x1="10" y1="30" x2="10" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <line x1="18" y1="30" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <line x1="26" y1="30" x2="26" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <line x1="6" y1="18" x2="30" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                      <polyline points="4,16 18,7 32,16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    {century}
                                  </p>
                                ) : <span />}

                                {"distance_m" in m && m.distance_m !== undefined && (
                                  <div className="flex items-center gap-0.5">
                                    <span className="text-body-sm font-semibold text-amber-700">{formatDistance(m.distance_m)}</span>
                                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="text-amber-600">
                                      <path d="M5 2.5L9.5 7 5 11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </div>
      )}

      {/* Vista mapa */}
      {view === "map" && (
        <div className="flex-1 min-h-0">
          {allMonuments.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center bg-canvas-white">
              <p className="text-body text-ash-gray">{t("home.searching")}</p>
            </div>
          ) : (
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-canvas-white">
                <div className="size-8 rounded-full border-[3px] border-pinterest-red border-t-transparent animate-spin" />
              </div>
            }>
              <MonumentsMap
                monuments={gpsState === "done" && monuments.length > 0 ? monuments : allMonuments}
                userLat={userLat}
                userLng={userLng}
              />
            </Suspense>
          )}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
