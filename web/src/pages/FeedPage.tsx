import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { feedForMeRich, type FeedEvent } from "../lib/api/social";
import { useAuth } from "../context/authContext";
import { AvatarImage } from "../components/AvatarPicker";
import { BottomNav } from "../components/BottomNav";

function timeAgo(iso: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return t("feed.now");
  if (secs < 3600) return t("feed.minutes_ago", { count: Math.floor(secs / 60) });
  if (secs < 86400) return t("feed.hours_ago", { count: Math.floor(secs / 3600) });
  return t("feed.days_ago", { count: Math.floor(secs / 86400) });
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
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { state: { from: "/feed" } }); return; }
    let cancelled = false;
    setFetching(true);
    setFetchError(false);
    feedForMeRich(50)
      .then((items) => { if (!cancelled) setEvents(items); })
      .catch(() => { if (!cancelled) setFetchError(true); })
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [user, loading, navigate, reloadKey, t]);

  function eventText(ev: FeedEvent): string {
    switch (ev.type) {
      case "visit":                return t("feed.event.visit", { name: "", monument: ev.monument_name ?? t("feed.unknown_monument") }).replace(/^\s*·?\s*/, "");
      case "medal_earned":         return t("feed.event.medal_earned", { name: "", medal: ev.medal_name ?? "?" }).replace(/^\s*·?\s*/, "");
      case "collection_completed": return t("feed.event.collection_completed", { name: "", collection: ev.medal_name ?? "?" }).replace(/^\s*·?\s*/, "");
      default:                     return t("feed.event_fallback");
    }
  }

  return (
    <main className="min-h-full pb-20">
      <header className="px-6 pt-8 pb-4 flex items-center justify-between">
        <h1 className="text-heading font-bold text-jet-black">{t("feed.title")}</h1>
        <button
          onClick={() => navigate("/search")}
          className="size-10 rounded-full bg-whisper-gray flex items-center justify-center text-xl"
          aria-label={t("feed.search_explorers")}
        >
          🔍
        </button>
      </header>

      {fetching && (
        <ul className="px-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-start gap-3 rounded-3xl bg-canvas-white border border-whisper-gray p-4 animate-pulse">
              <div className="size-10 rounded-full bg-whisper-gray shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-whisper-gray rounded-full w-3/4" />
                <div className="h-3 bg-whisper-gray rounded-full w-1/3" />
              </div>
              <div className="size-6 rounded-full bg-whisper-gray shrink-0 mt-0.5" />
            </li>
          ))}
        </ul>
      )}

      {!fetching && fetchError && (
        <div className="px-6 pt-8 text-center">
          <p className="text-4xl mb-3">📡</p>
          <p className="text-body font-semibold text-graphite">{t("feed.load_error_title")}</p>
          <p className="text-body-sm text-ash-gray mt-1">{t("common.connection_error")}</p>
          <button
            onClick={() => setReloadKey((value) => value + 1)}
            className="mt-4 rounded-full border border-whisper-gray text-graphite px-6 py-2.5 text-body font-medium"
          >
            {t("common.retry")}
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
            <button type="button" onClick={() => navigate(`/user/${ev.user_id}`)} aria-label={ev.user_name} className="shrink-0 mt-0.5">
              <AvatarImage avatarId={ev.user_avatar} size="md" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-body text-graphite">
                <button onClick={() => navigate(`/user/${ev.user_id}`)} className="font-semibold hover:underline">
                  {ev.user_name}
                </button>{" "}
                <span className="text-ash-gray">{eventText(ev)}</span>
              </p>
              <p className="text-body-sm text-ash-gray mt-0.5">{timeAgo(ev.created_at, t)}</p>
            </div>
            <span className="text-xl shrink-0">{EVENT_ICON[ev.type] ?? "⭐"}</span>
          </li>
        ))}
      </ul>

      <BottomNav />
    </main>
  );
}
