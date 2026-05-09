import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMonumentDetail, type MonumentDetail } from "../lib/supabase";
import { currentLocale } from "../lib/i18n";

function formatYear(y: number | null): string {
  if (y === null) return "";
  if (y < 0) return `${Math.abs(y)} a.C.`;
  if (y < 1000) return `s. ${Math.ceil(y / 100)}`;
  return String(y);
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function walkMinutes(m: number) {
  return Math.round(m / 80);
}

export function MonumentDetailPage() {
  const { monumentId } = useParams<{ monumentId: string }>();
  const navigate = useNavigate();
  const [monument, setMonument] = useState<MonumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);

  useEffect(() => {
    if (!monumentId) return;
    getMonumentDetail(monumentId, currentLocale())
      .then(setMonument)
      .finally(() => setLoading(false));
  }, [monumentId]);

  useEffect(() => {
    if (!monument?.lat || !monument?.lng) return;
    navigator.geolocation?.getCurrentPosition(
      pos => setDistanceM(haversineM(pos.coords.latitude, pos.coords.longitude, monument.lat!, monument.lng!)),
      () => {}, { enableHighAccuracy: false, timeout: 5000 }
    );
  }, [monument]);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-pinterest-red border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!monument) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-subheading font-semibold text-graphite">Monumento no encontrado</p>
        <button onClick={() => navigate(-1)} className="text-pinterest-red text-body font-medium">Volver</button>
      </div>
    );
  }

  const mapsUrl = monument.lat && monument.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${monument.lat},${monument.lng}`
    : null;

  const shortDesc = monument.description
    ? monument.description.length > 100
      ? monument.description.slice(0, 100) + "…"
      : monument.description
    : null;

  return (
    <main className="min-h-full bg-canvas-white pb-28">

      {/* Hero */}
      <div className="relative" style={{ height: "52vh", minHeight: "280px" }}>
        {monument.reference_image_url ? (
          <img src={monument.reference_image_url} alt={monument.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#E8E3DC] flex items-center justify-center">
            <svg width="64" height="64" viewBox="0 0 36 36" fill="none" opacity="0.25">
              <line x1="4" y1="30" x2="32" y2="30" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
              <line x1="10" y1="30" x2="10" y2="18" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
              <line x1="18" y1="30" x2="18" y2="18" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
              <line x1="26" y1="30" x2="26" y2="18" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="18" x2="30" y2="18" stroke="#7C6A55" strokeWidth="2" strokeLinecap="round"/>
              <polyline points="4,16 18,7 32,16" stroke="#7C6A55" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        {/* Botón volver */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-10 h-10 rounded-full bg-canvas-white shadow-md flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Badge distancia */}
        {distanceM !== null && (
          <div className="absolute top-12 right-4 bg-canvas-white/95 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <path d="M6 1C3.79 1 2 2.79 2 5c0 3.25 4 8 4 8s4-4.75 4-8c0-2.21-1.79-4-4-4z" stroke="#9E9E9E" strokeWidth="1.2" fill="none"/>
              <circle cx="6" cy="5" r="1.5" stroke="#9E9E9E" strokeWidth="1.2" fill="none"/>
            </svg>
            <span className="text-[13px] font-semibold text-graphite">{formatDist(distanceM)}</span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="px-5 pt-6">

        {/* Título */}
        <h1 className="text-[2rem] font-black text-jet-black leading-tight mb-2">{monument.name}</h1>

        {/* Ubicación + distancia */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="flex items-center gap-1 text-body-sm text-ash-gray">
            <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
              <path d="M5.5 1C3.015 1 1 3.015 1 5.5c0 3.375 4.5 7.5 4.5 7.5S10 8.875 10 5.5C10 3.015 7.985 1 5.5 1z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
              <circle cx="5.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            </svg>
            {[monument.city, monument.country].filter(Boolean).join(", ")}
          </span>
          {distanceM !== null && (
            <>
              <span className="text-ash-gray text-body-sm">·</span>
              <span className="flex items-center gap-1 text-body-sm text-ash-gray">
                <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
                  <path d="M5.5 1C3.015 1 1 3.015 1 5.5c0 3.375 4.5 7.5 4.5 7.5S10 8.875 10 5.5C10 3.015 7.985 1 5.5 1z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                  <circle cx="5.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                </svg>
                {formatDist(distanceM)}
              </span>
            </>
          )}
        </div>

        {/* Descripción */}
        {monument.description && (
          <div className="mb-4">
            <p className="text-body text-graphite leading-relaxed">
              {showFullDesc ? monument.description : shortDesc}
            </p>
            {monument.description.length > 100 && (
              <button
                onClick={() => setShowFullDesc(v => !v)}
                className="text-body-sm font-semibold text-amber-700 mt-1 flex items-center gap-1"
              >
                {showFullDesc ? "Leer menos" : "Leer historia"}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d={showFullDesc ? "M3 9L7 5l4 4" : "M3 5l4 4 4-4"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Períodos históricos */}
        {monument.periods.length > 0 && (
          <>
            <div className="h-px bg-whisper-gray my-4" />
            <h2 className="text-subheading font-bold text-jet-black mb-4">Historia</h2>
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
              {monument.periods.map((p, i) => (
                <div key={p.id} className="flex items-center gap-0 shrink-0">
                  {/* Card */}
                  <div className="w-40 rounded-2xl bg-[#FAF8F5] border border-[#EDE9E3] p-4 flex flex-col gap-2">
                    <div className="w-9 h-9 rounded-full bg-canvas-white border border-[#EDE9E3] flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <rect x="1" y="13" width="16" height="2" rx="0.5" stroke="#9E9E9E" strokeWidth="1.2"/>
                        <line x1="4" y1="13" x2="4" y2="8" stroke="#9E9E9E" strokeWidth="1.2" strokeLinecap="round"/>
                        <line x1="9" y1="13" x2="9" y2="8" stroke="#9E9E9E" strokeWidth="1.2" strokeLinecap="round"/>
                        <line x1="14" y1="13" x2="14" y2="8" stroke="#9E9E9E" strokeWidth="1.2" strokeLinecap="round"/>
                        <line x1="2" y1="8" x2="16" y2="8" stroke="#9E9E9E" strokeWidth="1.2" strokeLinecap="round"/>
                        <polyline points="1,7 9,2 17,7" stroke="#9E9E9E" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {(p.year_from !== null) && (
                      <p className="text-[1.1rem] font-black text-amber-700 leading-none">{formatYear(p.year_from)}</p>
                    )}
                    <p className="text-body font-bold text-jet-black leading-snug">{p.title}</p>
                    {p.description && (
                      <p className="text-body-sm text-ash-gray leading-snug">{p.description}</p>
                    )}
                  </div>
                  {/* Conector */}
                  {i < monument.periods.length - 1 && (
                    <div className="flex items-center px-1">
                      <div className="w-2 h-2 rounded-full bg-[#D4C9BB]" />
                      <div className="w-3 h-px bg-[#D4C9BB]" />
                      <div className="w-2 h-2 rounded-full bg-[#D4C9BB]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Cómo llegar */}
        {mapsUrl && (
          <>
            <div className="h-px bg-whisper-gray my-4" />
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 py-2 active:opacity-70 transition-opacity"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#FAF8F5] border border-[#EDE9E3] flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2a5 5 0 00-5 5c0 4 5 11 5 11s5-7 5-11a5 5 0 00-5-5z" stroke="#9E9E9E" strokeWidth="1.4" fill="none"/>
                  <circle cx="10" cy="7" r="2" stroke="#9E9E9E" strokeWidth="1.4" fill="none"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-body font-semibold text-jet-black">Cómo llegar</p>
                {distanceM !== null && (
                  <p className="text-body-sm text-ash-gray">{walkMinutes(distanceM)} min andando · {formatDist(distanceM)}</p>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="#9E9E9E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </>
        )}
      </div>

      {/* Botón AR fijo */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-3 bg-canvas-white/95 backdrop-blur">
        <button
          onClick={() => navigate("/scan")}
          className="w-full rounded-2xl bg-[#8B1A1A] text-canvas-white px-6 py-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-lg"
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="8" height="8" rx="1.5" stroke="white" strokeWidth="1.6"/>
            <rect x="18" y="2" width="8" height="8" rx="1.5" stroke="white" strokeWidth="1.6"/>
            <rect x="2" y="18" width="8" height="8" rx="1.5" stroke="white" strokeWidth="1.6"/>
            <rect x="4" y="4" width="4" height="4" fill="white" rx="0.5"/>
            <rect x="20" y="4" width="4" height="4" fill="white" rx="0.5"/>
            <rect x="4" y="20" width="4" height="4" fill="white" rx="0.5"/>
            <rect x="18" y="18" width="3.5" height="3.5" fill="white" rx="0.4"/>
            <rect x="22.5" y="18" width="3.5" height="3.5" fill="white" rx="0.4"/>
            <rect x="18" y="22.5" width="3.5" height="3.5" fill="white" rx="0.4"/>
            <rect x="22.5" y="22.5" width="3.5" height="3.5" fill="white" rx="0.4"/>
          </svg>
          <div className="text-left">
            <p className="text-body font-bold leading-tight">Iniciar experiencia AR</p>
            <p className="text-body-sm opacity-75">Escanea el código QR junto al monumento</p>
          </div>
        </button>
      </div>

    </main>
  );
}
