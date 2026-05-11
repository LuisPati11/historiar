import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { feedForMeRich, type FeedEvent } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { AvatarImage } from "../components/AvatarPicker";
import { BottomNav } from "../components/BottomNav";

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "ahora";
  if (secs < 3600) return `hace ${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `hace ${Math.floor(secs / 3600)}h`;
  return `hace ${Math.floor(secs / 86400)}d`;
}

const EVENT_ICON: Record<string, string> = {
  visit: "🗺️",
  medal_earned: "🏅",
  collection_completed: "🏆",
};

export function FeedPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { state: { from: "/feed" } }); return; }
    setFetchError(false);
    feedForMeRich(50)
      .then(setEvents)
      .catch(() => setFetchError(true))
      .finally(() => setFetching(false));
  }, [user, loading, navigate]);

  function eventText(ev: FeedEvent): string {
    switch (ev.type) {
      case "visit":                return t("feed.event.visit", { name: "", monument: ev.monument_name ?? "un monumento" }).replace(/^\s*·?\s*/, "");
      case "medal_earned":         return t("feed.event.medal_earned", { name: "", medal: ev.medal_name ?? "?" }).replace(/^\s*·?\s*/, "");
      case "collection_completed": return t("feed.event.collection_completed", { name: "", collection: ev.medal_name ?? "?" }).replace(/^\s*·?\s*/, "");
      default:                     return "hizo algo genial";
    }
  }

  return (
    <main className="min-h-full pb-20">
      <header className="px-6 pt-8 pb-4 flex items-center justify-between">
        <h1 className="text-heading font-bold text-jet-black">{t("feed.title")}</h1>
        <button
          onClick={() => navigate("/search")}
          className="w-10 h-10 rounded-full bg-whisper-gray flex items-center justify-center text-xl"
          aria-label="Buscar exploradores"
        >
          🔍
        </button>
      </header>

      {fetching && (
        <div className="flex flex-col items-center pt-16 gap-3">
          <div className="w-8 h-8 rounded-full border-[3px] border-pinterest-red border-t-transparent animate-spin" />
          <p className="text-body-sm text-ash-gray">Cargando actividad…</p>
        </div>
      )}

      {!fetching && fetchError && (
        <div className="px-6 pt-8 text-center">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-body font-semibold text-graphite">No se pudo cargar el feed</p>
          <p className="text-body-sm text-ash-gray mt-1">Comprueba tu conexión e inténtalo de nuevo.</p>
          <button
            onClick={() => { setFetching(true); setFetchError(false); feedForMeRich(50).then(setEvents).catch(() => setFetchError(true)).finally(() => setFetching(false)); }}
            className="mt-4 rounded-full border border-whisper-gray text-graphite px-6 py-2.5 text-body font-medium"
          >
            Reintentar
          </button>
        </div>
      )}

      {!fetching && !fetchError && events.length === 0 && (
        <div className="px-6 pt-8 text-center">
          <p className="text-5xl mb-4">🧭</p>
          <p className="text-body font-semibold text-graphite">{t("feed.empty_title")}</p>
          <p className="text-body-sm text-ash-gray mt-1">{t("feed.empty_hint")}</p>
          <button
            onClick={() => navigate("/search")}
            className="mt-4 rounded-full bg-pinterest-red text-canvas-white px-6 py-2.5 text-body font-medium"
          >
            {t("feed.find_explorers")}
          </button>
        </div>
      )}

      <ul className="px-6 space-y-3">
        {events.map((ev) => (
          <li key={ev.id} className="flex items-start gap-3 rounded-3xl bg-canvas-white border border-whisper-gray p-4">
            <button onClick={() => navigate(`/user/${ev.user_id}`)} className="shrink-0 mt-0.5">
              <AvatarImage avatarId={ev.user_avatar} size="md" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-body text-graphite">
                <button onClick={() => navigate(`/user/${ev.user_id}`)} className="font-semibold hover:underline">
                  {ev.user_name}
                </button>{" "}
                <span className="text-ash-gray">{eventText(ev)}</span>
              </p>
              <p className="text-body-sm text-ash-gray mt-0.5">{timeAgo(ev.created_at)}</p>
            </div>
            <span className="text-xl shrink-0">{EVENT_ICON[ev.type] ?? "⭐"}</span>
          </li>
        ))}
      </ul>

      <BottomNav />
    </main>
  );
}
