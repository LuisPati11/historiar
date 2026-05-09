import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getNearbyMonuments, getAllMonuments, type Monument } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { AvatarImage } from "../components/AvatarPicker";
import { BottomNav } from "../components/BottomNav";
import { MonumentsMap } from "../components/MonumentsMap";

type ViewMode = "list" | "map";

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

  // Carga todos los monumentos inmediatamente — no espera al GPS
  useEffect(() => {
    getAllMonuments().then(setAllMonuments).catch(() => {});
  }, []);

  // GPS: centra el mapa y trae la lista "cerca de ti"
  useEffect(() => {
    if (!navigator.geolocation) {
      setError(t("home.no_geolocation"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        try {
          const nearby = await getNearbyMonuments(pos.coords.latitude, pos.coords.longitude, 5000);
          setMonuments(nearby);
        } catch (err) {
          setError((err as Error).message);
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [t]);

  return (
    <main className="min-h-full flex flex-col pb-20">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-heading-lg font-bold text-jet-black">{t("app.name")}</h1>
          <p className="text-body-lg text-ash-gray mt-1">{t("app.tagline")}</p>
        </div>
        {user ? (
          <Link to="/profile">
            <AvatarImage avatarId={(user.user_metadata as { avatar?: string })?.avatar} size="md" />
          </Link>
        ) : (
          <Link to="/auth" className="rounded-2xl bg-pinterest-red text-canvas-white px-4 py-2 text-body font-medium">
            {t("auth.sign_in")}
          </Link>
        )}
      </header>

      {/* Toggle lista / mapa */}
      <div className="px-6 mb-4">
        <div className="flex rounded-2xl bg-whisper-gray p-1 w-fit">
          <button
            onClick={() => setView("list")}
            className={`rounded-xl px-4 py-1.5 text-body font-medium transition-colors ${view === "list" ? "bg-canvas-white text-jet-black shadow-sm" : "text-ash-gray"}`}
          >
            Lista
          </button>
          <button
            onClick={() => setView("map")}
            className={`rounded-xl px-4 py-1.5 text-body font-medium transition-colors ${view === "map" ? "bg-canvas-white text-jet-black shadow-sm" : "text-ash-gray"}`}
          >
            Mapa
          </button>
        </div>
      </div>

      {error && (
        <p className="mx-6 rounded-2xl bg-whisper-gray px-4 py-3 text-body text-graphite mb-4">
          ⚠️ {error}
        </p>
      )}

      {/* Vista lista */}
      {view === "list" && (
        <div className="px-6 flex-1">
          {monuments.length === 0 && !error && (
            <p className="text-body text-ash-gray">{t("home.searching")}</p>
          )}
          <ul className="space-y-4">
            {monuments.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => navigate(`/monument/${m.id}`)}
                  className="w-full text-left rounded-3xl bg-canvas-white border border-whisper-gray p-4 active:bg-whisper-gray transition-colors"
                >
                  <div className="flex justify-between items-baseline gap-4">
                    <div className="min-w-0">
                      <h2 className="text-subheading font-semibold text-graphite truncate">{m.name}</h2>
                      <p className="text-body text-ash-gray">{m.city}</p>
                    </div>
                    <span className="text-body text-muted-slate shrink-0">{Math.round(m.distance_m)} m</span>
                  </div>
                  <p className="mt-3 text-body text-ash-gray flex items-center gap-1.5">
                    <span>⬛</span> {t("home.scan_qr_hint")}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vista mapa */}
      {view === "map" && (
        <div className="flex-1 mx-6 rounded-3xl overflow-hidden" style={{ height: "calc(100dvh - 280px)" }}>
          {allMonuments.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center bg-whisper-gray rounded-3xl">
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
