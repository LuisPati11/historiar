import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Monument } from "../lib/supabase";

interface Props {
  monuments: Array<Monument & { distance_m?: number }>;
  userLat: number | null;
  userLng: number | null;
}

interface SelectedMonument {
  monument: Monument & { distance_m?: number };
}

export function MonumentsMap({ monuments, userLat, userLng }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const centerLat = userLat ?? 38.9959;
  const centerLng = userLng ?? -3.9278;
  const [selected, setSelected] = useState<SelectedMonument | null>(null);
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
          <div className="w-8 h-8 rounded-full border-[3px] border-pinterest-red border-t-transparent animate-spin" />
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
        onError={() => {}}
        attributionControl={false}
        reuseMaps
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {/* Posición del usuario */}
        {userLat && userLng && (
          <Marker longitude={userLng} latitude={userLat} anchor="center">
            <div className="w-4 h-4 rounded-full bg-pinterest-red border-2 border-white shadow-md" />
          </Marker>
        )}

        {/* Monumentos */}
        {monuments.filter((m) => m.lat && m.lng).map((m) => (
          <Marker
            key={m.id}
            longitude={m.lng!}
            latitude={m.lat!}
            anchor="center"
            onClick={(e) => { e.originalEvent.stopPropagation(); setSelected({ monument: m }); }}
          >
            <div className="w-10 h-10 rounded-full bg-canvas-white border-2 border-whisper-gray shadow-md flex items-center justify-center text-xl cursor-pointer hover:scale-110 transition-transform">
              🏛️
            </div>
          </Marker>
        ))}

        {/* Popup al tocar monumento */}
        {selected && (
          <Popup
            longitude={selected.monument.lng!}
            latitude={selected.monument.lat!}
            anchor="bottom"
            offset={24}
            closeButton={false}
            onClose={() => setSelected(null)}
          >
            <div className="px-1 py-1 min-w-[140px]">
              <p className="font-semibold text-sm text-graphite leading-snug">{selected.monument.name}</p>
              <p className="text-xs text-ash-gray mt-0.5">
                {selected.monument.city}
                {selected.monument.distance_m != null ? ` · ${Math.round(selected.monument.distance_m)} m` : ""}
              </p>
              <button
                onClick={() => navigate(`/monument/${selected.monument.id}`)}
                className="mt-2 text-xs font-semibold text-pinterest-red"
              >
                {t("map.view_detail")}
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
