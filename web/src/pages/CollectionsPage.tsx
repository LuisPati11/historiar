import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getCollectionsProgress, type CollectionProgress,
  getLeaderboard, getMyRank, type LeaderboardEntry,
} from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { AvatarImage } from "../components/AvatarPicker";
import { BottomNav } from "../components/BottomNav";
import { TIER_CONFIG as TIER_BASE } from "../lib/tierConfig";

// ─── Colecciones ────────────────────────────────────────────────────────────

const TIER_BAR: Record<string, string> = {
  bronze: "bg-amber-500", silver: "bg-slate-400", gold: "bg-yellow-400", diamond: "bg-blue-400",
};

function CollectionCard({ c }: { c: CollectionProgress }) {
  const { t, i18n } = useTranslation();
  const tier = TIER_BASE[c.medal_tier] ?? TIER_BASE.bronze;
  const bar  = TIER_BAR[c.medal_tier] ?? "bg-amber-500";
  const pct  = c.total_monuments > 0 ? Math.round((c.visited_monuments / c.total_monuments) * 100) : 0;
  const done = !!c.earned_at;

  return (
    <div className={`rounded-3xl border p-5 ${done ? "bg-highlight-yellow/20 border-yellow-300" : "bg-canvas-white border-whisper-gray"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-subheading font-semibold text-graphite leading-snug">{c.collection_name}</h2>
          {c.collection_description && (
            <p className="text-body text-ash-gray mt-0.5 line-clamp-2">{c.collection_description}</p>
          )}
        </div>
        <span className="text-3xl shrink-0">{tier?.emoji}</span>
      </div>
      <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tier?.colors ?? "bg-whisper-gray text-graphite"}`}>
        {tier?.label} · {c.medal_name}
      </div>
      <div className="mt-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-ash-gray">
            {done ? t("collections.completed_badge") : t("collections.progress", { visited: c.visited_monuments, total: c.total_monuments })}
          </span>
          <span className={`text-xs font-bold ${done ? "text-yellow-600" : "text-graphite"}`}>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-whisper-gray overflow-hidden">
          <div className={`h-full rounded-full transition-all ${done ? "bg-yellow-400" : bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {done && (
        <p className="mt-2 text-xs text-yellow-700 font-medium">
          {t("collections.earned_on", { date: new Date(c.earned_at!).toLocaleDateString(i18n.language, { day: "numeric", month: "long", year: "numeric" }) })}
        </p>
      )}
    </div>
  );
}

// ─── Ranking ────────────────────────────────────────────────────────────────

const PODIUM = ["🥇", "🥈", "🥉"];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <span className="text-2xl leading-none">{PODIUM[rank - 1]}</span>;
  return (
    <span className="w-8 h-8 rounded-full bg-whisper-gray flex items-center justify-center text-xs font-bold text-ash-gray shrink-0">
      {rank}
    </span>
  );
}

function LeaderboardRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/user/${entry.user_id}`}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${isMe ? "bg-highlight-yellow/30 border border-yellow-300" : "bg-canvas-white border border-whisper-gray"}`}
    >
      <RankBadge rank={entry.rank} />
      <AvatarImage avatarId={entry.avatar_url} size="sm" />
      <div className="flex-1 min-w-0">
        <p className={`text-body font-semibold truncate ${isMe ? "text-graphite" : "text-graphite"}`}>
          {entry.display_name ?? t("collections.explorer")}
          {isMe && <span className="ml-1.5 text-xs text-yellow-700 font-normal">· {t("collections.you")}</span>}
        </p>
        <p className="text-xs text-ash-gray">{t("collections.stats", { visits: entry.visit_count, medals: entry.medal_count })}</p>
      </div>
      <span className="text-body font-bold text-graphite shrink-0">{entry.medal_count} 🏅</span>
    </Link>
  );
}

function RankingTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLeaderboard(50), user ? getMyRank() : Promise.resolve(null)])
      .then(([lb, rank]) => { setEntries(lb); setMyRank(rank); })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <div className="flex flex-col items-center pt-16 gap-3">
      <div className="w-8 h-8 rounded-full border-[3px] border-pinterest-red border-t-transparent animate-spin" />
      <p className="text-body-sm text-ash-gray">{t("collections.loading_ranking")}</p>
    </div>
  );

  const meInTop = user && entries.some(e => e.user_id === user.id);

  return (
    <div className="px-6 space-y-2">
      {!user && (
        <div className="rounded-2xl bg-whisper-gray px-4 py-3 text-body text-graphite mb-4">
          <button onClick={() => navigate("/auth")} className="font-semibold text-pinterest-red underline">{t("auth.login_cta")}</button>
          {" "}{t("collections.sign_in_ranking")}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <span className="text-5xl">🏆</span>
          <p className="text-subheading font-semibold text-graphite">{t("collections.empty_ranking_title")}</p>
          <p className="text-body text-ash-gray max-w-xs">{t("collections.empty_ranking_hint")}</p>
        </div>
      ) : (
        <>
          {entries.map(e => (
            <LeaderboardRow key={e.user_id} entry={e} isMe={user?.id === e.user_id} />
          ))}

          {/* Tu posición si no estás en el top 50 */}
          {user && !meInTop && myRank && (
            <div className="pt-2">
              <p className="text-xs text-center text-ash-gray pb-2">{t("collections.your_position")}</p>
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-highlight-yellow/30 border border-yellow-300">
                <RankBadge rank={myRank} />
                <AvatarImage avatarId={(user.user_metadata as { avatar?: string })?.avatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-graphite truncate">
                    {(user.user_metadata as { username?: string })?.username ?? t("collections.you_name")}
                    <span className="ml-1.5 text-xs text-yellow-700 font-normal">· {t("collections.you")}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

type Tab = "collections" | "ranking";

export function CollectionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("collections");
  const [collections, setCollections] = useState<CollectionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCollectionsProgress()
      .then(setCollections)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const completed = collections.filter(c => !!c.earned_at);
  const pending   = collections.filter(c => !c.earned_at);

  return (
    <main className="min-h-full flex flex-col pb-24">
      <header className="px-6 pt-8 pb-4">
        <h1 className="text-heading-lg font-bold text-jet-black">{t("collections.title")}</h1>
      </header>

      {/* Tabs */}
      <div className="px-6 mb-4">
        <div className="flex rounded-2xl bg-whisper-gray p-1 w-fit">
          {(["collections", "ranking"] as Tab[]).map(tabName => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`rounded-xl px-4 py-1.5 text-body font-medium transition-colors ${tab === tabName ? "bg-canvas-white text-jet-black shadow-sm" : "text-ash-gray"}`}
            >
              {tabName === "collections" ? t("collections.collections") : t("collections.ranking")}
            </button>
          ))}
        </div>
      </div>

      {/* Colecciones */}
      {tab === "collections" && (
        <>
          {!user && (
            <div className="mx-6 mb-4 rounded-2xl bg-whisper-gray px-4 py-3 text-body text-graphite">
              <button onClick={() => navigate("/auth")} className="font-semibold text-pinterest-red underline">{t("auth.login_cta")}</button>
              {" "}{t("collections.sign_in_progress")}
            </div>
          )}
          {loading && (
            <div className="flex flex-col items-center pt-16 gap-3">
              <div className="w-8 h-8 rounded-full border-[3px] border-pinterest-red border-t-transparent animate-spin" />
              <p className="text-body-sm text-ash-gray">{t("collections.loading")}</p>
            </div>
          )}
          {error && (
            <div className="mx-6 flex flex-col items-center py-12 text-center gap-3">
              <p className="text-4xl">📡</p>
              <p className="text-body font-semibold text-graphite">{t("collections.load_error_title")}</p>
              <p className="text-body-sm text-ash-gray">{t("collections.load_error_hint")}</p>
              <button
                onClick={() => { setLoading(true); setError(null); getCollectionsProgress().then(setCollections).catch(e => setError((e as Error).message)).finally(() => setLoading(false)); }}
                className="mt-1 rounded-full border border-whisper-gray text-graphite px-6 py-2.5 text-body font-medium"
              >
                {t("common.retry")}
              </button>
            </div>
          )}
          {!loading && !error && (
            <div className="px-6 space-y-4">
              {completed.length > 0 && (
                <>
                  <h3 className="text-body font-semibold text-ash-gray uppercase tracking-wide">{t("collections.completed")}</h3>
                  {completed.map(c => <CollectionCard key={c.collection_id} c={c} />)}
                  <div className="pt-2" />
                </>
              )}
              {pending.length > 0 && (
                <>
                  {completed.length > 0 && <h3 className="text-body font-semibold text-ash-gray uppercase tracking-wide">{t("collections.in_progress")}</h3>}
                  {pending.map(c => <CollectionCard key={c.collection_id} c={c} />)}
                </>
              )}
              {collections.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <span className="text-5xl">🏆</span>
                  <p className="text-subheading font-semibold text-graphite">{t("collections.empty_title")}</p>
                  <p className="text-body-sm text-ash-gray max-w-xs">{t("collections.empty_hint")}</p>
                  <button onClick={() => navigate("/")} className="rounded-full bg-pinterest-red text-canvas-white px-6 py-2.5 text-body font-medium">
                    {t("collections.explore_monuments")}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Ranking */}
      {tab === "ranking" && <RankingTab />}

      <BottomNav />
    </main>
  );
}
