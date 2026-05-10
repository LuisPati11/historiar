import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const centerLat = userLat ?? 38.9959;
  const centerLng = userLng ?? -3.9278;
  const [selected, setSelected] = useState<SelectedMonument | null>(null);

  return (
    <Map
      initialViewState={{ longitude: centerLng, latitude: centerLat, zoom: 15 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={`https://api.maptiler.com/maps/019e112b-e6a2-70b0-b98e-a3582b0ab594/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`}
      onError={() => {}}
      attributionControl={false}
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
              Ver detalle →
            </button>
          </div>
        </Popup>
      )}
    </Map>
  );
}
