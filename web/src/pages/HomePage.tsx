import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getNearbyMonuments, getAllMonuments, type Monument } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { AvatarImage } from "../components/AvatarPicker";
import { BottomNav } from "../components/BottomNav";
import { MonumentsMap } from "../components/MonumentsMap";

type ViewMode = "list" | "map";

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
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [view, setView] = useState<ViewMode>("list");

  useEffect(() => {
    getAllMonuments().then(setAllMonuments).catch(() => {});
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setError(t("home.no_geolocation")); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        try {
          const nearby = await getNearbyMonuments(pos.coords.latitude, pos.coords.longitude, 5000);
          setMonuments(nearby);
        } catch (err) { setError((err as Error).message); }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [t]);

  return (
    <main className="min-h-full flex flex-col pb-24 bg-whisper-gray">
      {/* Header */}
      <header className="px-5 pt-10 pb-4 flex items-center justify-between bg-whisper-gray">
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
            <h1 className="text-heading font-bold text-jet-black leading-tight">Explora</h1>
            <p className="text-body-sm text-ash-gray">Monumentos cerca de ti</p>
          </div>
        </div>
        {user ? (
          <Link to="/profile">
            <AvatarImage avatarId={(user.user_metadata as { avatar?: string })?.avatar} size="sm" />
          </Link>
        ) : (
          <Link to="/auth" className="rounded-2xl bg-canvas-white border border-whisper-gray text-jet-black px-4 py-2 text-body font-medium shadow-sm">
            Entrar
          </Link>
        )}
      </header>

      {/* Toggle lista / mapa */}
      <div className="px-5 mb-4">
        <div className="flex rounded-2xl bg-canvas-white shadow-sm p-1 w-full">
          <button
            onClick={() => setView("list")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-body font-medium transition-all ${view === "list" ? "bg-whisper-gray text-jet-black shadow-sm" : "text-ash-gray"}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="1" y1="4" x2="15" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="1" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Lista
          </button>
          <button
            onClick={() => setView("map")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-body font-medium transition-all ${view === "map" ? "bg-whisper-gray text-jet-black shadow-sm" : "text-ash-gray"}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <polygon points="1,3 6,1 10,3 15,1 15,13 10,15 6,13 1,15" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
              <line x1="6" y1="1" x2="6" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="10" y1="3" x2="10" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Mapa
          </button>
        </div>
      </div>

      {error && (
        <p className="mx-5 rounded-2xl bg-canvas-white px-4 py-3 text-body text-graphite mb-4 shadow-sm">
          ⚠️ {error}
        </p>
      )}

      {/* Vista lista */}
      {view === "list" && (
        <div className="px-5 flex-1">
          {monuments.length === 0 && !error && (
            <div className="flex flex-col items-center pt-16 gap-3">
              <div className="w-8 h-8 rounded-full border-3 border-ash-gray border-t-transparent animate-spin" />
              <p className="text-body text-ash-gray">{t("home.searching")}</p>
            </div>
          )}
          <ul className="space-y-3">
            {monuments.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => navigate(`/monument/${m.id}`)}
                  className="w-full text-left rounded-3xl bg-canvas-white shadow-sm active:scale-[0.99] transition-transform overflow-hidden"
                >
                  <div className="flex gap-0">
                    {/* Foto */}
                    <div className="w-36 shrink-0 self-stretch">
                      {m.reference_image_url ? (
                        <img
                          src={m.reference_image_url}
                          alt={m.name}
                          className="w-full h-full object-cover"
                          style={{ minHeight: "130px" }}
                        />
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
                        <h2 className="text-subheading font-bold text-jet-black leading-snug flex-1">{m.name}</h2>
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
                        <p className="text-body-sm text-ash-gray">Escanea el código QR<br/>junto al monumento</p>
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
            <MonumentsMap monuments={allMonuments} userLat={userLat} userLng={userLng} />
          )}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
