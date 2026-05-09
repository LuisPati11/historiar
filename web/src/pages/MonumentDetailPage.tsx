import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMonumentDetail, type MonumentDetail } from "../lib/supabase";
import { currentLocale } from "../lib/i18n";

function formatYear(y: number | null): string {
  if (y === null) return "";
  if (y < 0) return `${Math.abs(y)} a.C.`;
  if (y < 1000) return `s. ${Math.ceil(y / 100)} d.C.`;
  return String(y);
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function MonumentDetailPage() {
  const { monumentId } = useParams<{ monumentId: string }>();
  const navigate = useNavigate();
  const [monument, setMonument] = useState<MonumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [distanceM, setDistanceM] = useState<number | null>(null);

  useEffect(() => {
    if (!monumentId) return;
    getMonumentDetail(monumentId, currentLocale())
      .then(setMonument)
      .finally(() => setLoading(false));
  }, [monumentId]);

  // Distancia en tiempo real
  useEffect(() => {
    if (!monument?.lat || !monument?.lng) return;
    navigator.geolocation?.getCurrentPosition(pos => {
      setDistanceM(haversineM(pos.coords.latitude, pos.coords.longitude, monument.lat!, monument.lng!));
    }, () => {}, { enableHighAccuracy: false, timeout: 5000 });
  }, [monument]);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-body text-ash-gray">Cargando…</p>
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

  const formatDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

  return (
    <main className="min-h-full flex flex-col bg-canvas-white pb-8">
      {/* Header */}
      <div className="relative">
        {/* Imagen o placeholder */}
        {monument.reference_image_url ? (
          <img src={monument.reference_image_url} alt={monument.name} className="w-full h-56 object-cover" />
        ) : (
          <div className="w-full h-56 bg-whisper-gray flex items-center justify-center">
            <span className="text-6xl opacity-30">🏛️</span>
          </div>
        )}

        {/* Botón volver */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-canvas-white/90 backdrop-blur flex items-center justify-center shadow-md text-xl"
        >
          ←
        </button>

        {/* Badge distancia */}
        {distanceM !== null && (
          <div className="absolute bottom-4 right-4 bg-canvas-white/90 backdrop-blur rounded-full px-3 py-1 text-xs font-semibold text-graphite shadow">
            📍 {formatDist(distanceM)}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="px-6 pt-5 flex flex-col gap-5">

        {/* Título + ciudad */}
        <div>
          <h1 className="text-heading font-bold text-jet-black leading-tight">{monument.name}</h1>
          <p className="text-body-lg text-ash-gray mt-1">{[monument.city, monument.country].filter(Boolean).join(", ")}</p>
        </div>

        {/* Descripción */}
        {monument.description && (
          <p className="text-body-lg text-graphite leading-relaxed">{monument.description}</p>
        )}

        {/* Períodos históricos */}
        {monument.periods.length > 0 && (
          <div>
            <h2 className="text-subheading font-semibold text-jet-black mb-3">Historia</h2>
            <div className="relative pl-5">
              {/* línea vertical */}
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-whisper-gray" />
              <div className="space-y-5">
                {monument.periods.map(p => (
                  <div key={p.id} className="relative">
                    <div className="absolute -left-3 top-1.5 w-2.5 h-2.5 rounded-full bg-pinterest-red border-2 border-canvas-white" />
                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-body font-bold text-jet-black">{p.title}</span>
                        {(p.year_from !== null || p.year_to !== null) && (
                          <span className="text-xs text-muted-slate">
                            {formatYear(p.year_from)}{p.year_to !== null ? ` – ${formatYear(p.year_to)}` : ""}
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-body text-ash-gray mt-0.5 leading-relaxed">{p.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col gap-3 pt-2">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-jet-black text-canvas-white px-6 py-4 text-body font-semibold active:scale-95 transition-transform"
            >
              🗺️ Cómo llegar
            </a>
          )}
          <button
            onClick={() => navigate("/scan")}
            className="flex items-center justify-center gap-2 rounded-2xl bg-pinterest-red text-canvas-white px-6 py-4 text-body font-semibold active:scale-95 transition-transform"
          >
            ⬛ Escanear QR
          </button>
        </div>
      </div>
    </main>
  );
}
