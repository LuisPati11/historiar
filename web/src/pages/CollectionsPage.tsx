import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getCollectionsProgress, type CollectionProgress,
  getCollectionMonuments, type CollectionMonument,
  getLeaderboard, getMyRank, type LeaderboardEntry,
} from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { AvatarImage } from "../components/AvatarPicker";
import { BottomNav } from "../components/BottomNav";
import { TIER_CONFIG as TIER_BASE } from "../lib/tierConfig";

// ─── Tier styles ─────────────────────────────────────────────────────────────

const TIER_MEDAL_COLOR: Record<string, { stroke: string; fill: string; badge: string }> = {
  bronze:   { stroke: "#c0392b", fill: "#fff1f0", badge: "bg-red-50 text-red-700 border-red-100" },
  silver:   { stroke: "#94a3b8", fill: "#f8fafc", badge: "bg-slate-50 text-slate-600 border-slate-200" },
  gold:     { stroke: "#d4a017", fill: "#fffbeb", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  diamond:  { stroke: "#38bdf8", fill: "#f0f9ff", badge: "bg-sky-50 text-sky-700 border-sky-200" },
};

function MedalCircleIcon({ tier, done }: { tier: string; done: boolean }) {
  const c = TIER_MEDAL_COLOR[tier] ?? TIER_MEDAL_COLOR.bronze;
  const stroke = done ? c.stroke : "#94a3b8";
  const bg = done ? c.fill : "#f8fafc";
  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center"
      style={{ width: 52, height: 52, background: bg, border: `2px solid ${stroke}` }}
    >
      <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
        <path d="M11 2h6l-2 7h-2L11 2z" fill={done ? stroke : "#cbd5e1"} opacity="0.5" />
        <circle cx="14" cy="18" r="8" stroke={done ? stroke : "#cbd5e1"} strokeWidth="1.8" fill="none" />
        <path d="M14 12.5l1.2 2.4 2.7.4-1.95 1.9.46 2.7L14 18.6l-2.41 1.3.46-2.7L10.1 15.3l2.7-.4L14 12.5z"
          fill={done ? stroke : "#cbd5e1"} />
      </svg>
    </div>
  );
}

// ─── Colecciones ─────────────────────────────────────────────────────────────

function CollectionCard({ c, monuments }: { c: CollectionProgress; monuments: CollectionMonument[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tier = TIER_BASE[c.medal_tier] ?? TIER_BASE.bronze;
  const mc = TIER_MEDAL_COLOR[c.medal_tier] ?? TIER_MEDAL_COLOR.bronze;
  const pct = c.total_monuments > 0 ? Math.round((c.visited_monuments / c.total_monuments) * 100) : 0;
  const done = !!c.earned_at;
  const loading = monuments.length === 0;

  // Mostrar max 3 miniaturas; si hay más, el +N va como overlay en la última
  const visible = monuments.slice(0, 3);
  const extra = c.total_monuments - 3;

  return (
    <div className="bg-canvas-white rounded-2xl border border-whisper-gray shadow-sm overflow-hidden">
      <div className="p-4 pb-3">
        {/* Miniaturas + ícono medalla */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex gap-1.5">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="size-[62px] rounded-xl bg-whisper-gray shrink-0 animate-pulse" />
                ))
              : visible.map((m, idx) => {
                  const isLast = idx === visible.length - 1 && extra > 0;
                  return (
                    <div key={m.id} className="relative size-[62px] rounded-xl overflow-hidden bg-whisper-gray shrink-0">
                      {m.reference_image_url
                        ? <img src={m.reference_image_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-whisper-gray" />}
                      {isLast && (
                        <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                          <span className="text-canvas-white text-sm font-bold">+{extra}</span>
                        </div>
                      )}
                    </div>
                  );
                })
            }
          </div>
          <MedalCircleIcon tier={c.medal_tier} done={done} />
        </div>

        {/* Nombre y descripción */}
        <h2 className="text-body-lg font-bold text-jet-black leading-snug mb-1">{c.collection_name}</h2>
        {c.collection_description && (
          <p className="text-body-sm text-ash-gray mb-2.5 line-clamp-2">{c.collection_description}</p>
        )}

        {/* Badge de tier */}
        <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium ${mc.badge}`}>
          {tier?.label} · {c.medal_name}
        </span>
      </div>

      {/* Separador + footer */}
      <div className="border-t border-whisper-gray px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-body-sm text-graphite font-medium">
            {c.visited_monuments} / {c.total_monuments} {t("collections.visited")}
          </span>
          <button
            onClick={() => navigate(`/collections/${c.collection_id}`)}
            className="text-pinterest-red text-body-sm font-semibold flex items-center gap-0.5"
          >
            {t("collections.see_collection")} <span className="text-base leading-none">›</span>
          </button>
        </div>
        <div className="h-1.5 rounded-full bg-whisper-gray overflow-hidden">
          <div
            className="h-full rounded-full transition-all bg-pinterest-red"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Ranking ────────────────────────────────────────────────────────────────

const PODIUM = ["🥇", "🥈", "🥉"];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <span className="text-2xl leading-none">{PODIUM[rank - 1]}</span>;
  return (
    <span className="size-8 rounded-full bg-whisper-gray flex items-center justify-center text-xs font-bold text-ash-gray shrink-0">
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
      <div className="size-8 rounded-full border-[3px] border-pinterest-red border-t-transparent animate-spin" />
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
  const [monumentsMap, setMonumentsMap] = useState<Record<string, CollectionMonument[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCollectionsProgress()
      .then(async (data) => {
        setCollections(data);
        // Cargar imágenes de todas las colecciones en paralelo
        const entries = await Promise.all(
          data.map(c =>
            getCollectionMonuments(c.collection_id, 3)
              .then(m => [c.collection_id, m] as [string, CollectionMonument[]])
          )
        );
        setMonumentsMap(Object.fromEntries(entries));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const completed = collections.filter(c => !!c.earned_at);
  const pending   = collections.filter(c => !c.earned_at);

  return (
    <main className="min-h-full flex flex-col pb-24 bg-canvas-white">
      <header className="px-5 pt-10 pb-3">
        <h1 className="text-[2rem] font-black text-jet-black leading-none">{t("collections.title")}</h1>
      </header>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="flex rounded-full bg-whisper-gray p-1 w-fit">
          {(["collections", "ranking"] as Tab[]).map(tabName => (
            <button
              key={tabName}
              onClick={() => setTab(tabName)}
              className={`rounded-full px-5 py-2 text-body font-semibold transition-colors ${
                tab === tabName
                  ? "bg-canvas-white text-jet-black shadow-sm"
                  : "text-ash-gray"
              }`}
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
              <div className="size-8 rounded-full border-[3px] border-pinterest-red border-t-transparent animate-spin" />
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
            <div className="px-5 space-y-4">
              {completed.length > 0 && (
                <>
                  {completed.map(c => <CollectionCard key={c.collection_id} c={c} monuments={monumentsMap[c.collection_id] ?? []} />)}
                </>
              )}
              {pending.length > 0 && (
                <>
                  {pending.map(c => <CollectionCard key={c.collection_id} c={c} monuments={monumentsMap[c.collection_id] ?? []} />)}
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
