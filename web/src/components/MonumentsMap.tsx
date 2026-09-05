import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Monument } from "../lib/api/monuments";
import { formatDistance } from "../lib/format";
import { walkingMinutes } from "../lib/geo";

interface Props {
  monuments: Array<Monument & { distance_m?: number }>;
  userLat: number | null;
  userLng: number | null;
}

function BuildingIcon({ color = "#1A1A1A" }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
      <line x1="4" y1="30" x2="32" y2="30" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="10" y1="30" x2="10" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="18" y1="30" x2="18" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="26" y1="30" x2="26" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="6" y1="18" x2="30" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <polyline points="4,16 18,7 32,16" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function QRIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="0.8" stroke="white" strokeWidth="1.3"/>
      <rect x="8" y="1" width="5" height="5" rx="0.8" stroke="white" strokeWidth="1.3"/>
      <rect x="1" y="8" width="5" height="5" rx="0.8" stroke="white" strokeWidth="1.3"/>
      <rect x="2.5" y="2.5" width="2" height="2" fill="white" rx="0.3"/>
      <rect x="9.5" y="2.5" width="2" height="2" fill="white" rx="0.3"/>
      <rect x="2.5" y="9.5" width="2" height="2" fill="white" rx="0.3"/>
      <rect x="8" y="8" width="1.8" height="1.8" fill="white" rx="0.2"/>
      <rect x="10.2" y="8" width="1.8" height="1.8" fill="white" rx="0.2"/>
      <rect x="8" y="10.2" width="1.8" height="1.8" fill="white" rx="0.2"/>
      <rect x="10.2" y="10.2" width="1.8" height="1.8" fill="white" rx="0.2"/>
    </svg>
  );
}

export function MonumentsMap({ monuments, userLat, userLng }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const centerLat = userLat ?? 38.9959;
  const centerLng = userLng ?? -3.9278;
  const [selected, setSelected] = useState<(Monument & { distance_m?: number }) | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    const timeout = window.setTimeout(() => setTimedOut(true), 12000);
    return () => window.clearTimeout(timeout);
  }, [mapKey]);

  const retry = () => {
    setSelected(null);
    setMapKey((key) => key + 1);
  };

  return (
    <div className="relative h-full w-full">
      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-canvas-white">
          <div className="size-8 rounded-full border-[3px] border-pinterest-red border-t-transparent animate-spin" />
          <p className="text-body-sm text-ash-gray">{t("map.loading")}</p>
        </div>
      )}

      {timedOut && !loaded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-canvas-white px-6 text-center">
          <p className="text-body font-semibold text-graphite">{t("map.load_error_title")}</p>
          <p className="text-body-sm text-ash-gray">{t("map.load_error_hint")}</p>
          <button
            onClick={retry}
            className="rounded-full bg-pinterest-red text-canvas-white px-6 py-2.5 text-body font-semibold"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      <Map
        key={mapKey}
        initialViewState={{ longitude: centerLng, latitude: centerLat, zoom: 15 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={`https://api.maptiler.com/maps/019e112b-e6a2-70b0-b98e-a3582b0ab594/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`}
        onLoad={() => { setLoaded(true); setTimedOut(false); }}
        onError={() => setTimedOut(true)}
        attributionControl={false}
        reuseMaps
        onClick={() => setSelected(null)}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Posición del usuario */}
        {userLat != null && userLng != null && (
          <Marker longitude={userLng} latitude={userLat} anchor="center">
            <div className="size-4 rounded-full bg-pinterest-red border-2 border-white shadow-md" />
          </Marker>
        )}

        {/* Monumentos */}
        {monuments.filter((m) => m.lat != null && m.lng != null).map((m) => {
          const isSelected = selected?.id === m.id;
          return (
            <Marker
              key={m.id}
              longitude={m.lng!}
              latitude={m.lat!}
              anchor="center"
              onClick={(e) => { e.originalEvent.stopPropagation(); setSelected(m); }}
            >
              <div className={`size-10 rounded-full border-2 shadow-md flex items-center justify-center cursor-pointer transition-all ${
                isSelected
                  ? "bg-pinterest-red border-canvas-white scale-110"
                  : "bg-canvas-white border-whisper-gray"
              }`}>
                <BuildingIcon color={isSelected ? "white" : "#1A1A1A"} />
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* Tarjeta inferior al seleccionar monumento */}
      {selected && (
        <div
          className="absolute left-4 right-4 z-10"
          style={{ bottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="rounded-3xl bg-canvas-white shadow-xl p-3 flex items-center gap-3">
            <div className="size-20 rounded-2xl overflow-hidden shrink-0 bg-whisper-gray">
              {selected.reference_image_url ? (
                <img
                  src={selected.reference_image_url}
                  alt={selected.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BuildingIcon color="#C0B9B0" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-body font-bold text-jet-black truncate leading-snug">{selected.name}</p>
              {selected.distance_m != null && (
                <p className="text-body-sm text-ash-gray mt-0.5">
                  🚶 {walkingMinutes(selected.distance_m)} min · {formatDistance(selected.distance_m)}
                </p>
              )}
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={() => navigate(`/monument/${selected.id}`)}
                  className="flex-1 rounded-2xl border border-whisper-gray bg-canvas-white text-graphite py-2 text-body-sm font-semibold active:bg-whisper-gray transition-colors"
                >
                  {t("map.view_detail")}
                </button>
                <button
                  onClick={() => navigate(`/ar/${selected.id}`)}
                  className="flex-1 rounded-2xl bg-pinterest-red text-canvas-white py-2 text-body-sm font-semibold flex items-center justify-center gap-1.5 active:brightness-90 transition-all"
                >
                  {t("home.activate_ar")}
                  <QRIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
