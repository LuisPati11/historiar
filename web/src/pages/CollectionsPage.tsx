import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function visitStr(count: number, t: (k: string) => string) {
  return `${count} ${count === 1 ? t("collections.visit_one") : t("collections.visits_count")}`;
}
function medalStr(count: number, t: (k: string) => string) {
  return `${count} ${count === 1 ? t("collections.medal_one") : t("collections.medals_count")}`;
}

function RankMedalIcon({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <path d="M9 2h8l-1.8 5.5H10.8L9 2z" fill={color} opacity="0.55"/>
      <circle cx="13" cy="17" r="7.5" fill={color} opacity="0.12"/>
      <circle cx="13" cy="17" r="7.5" stroke={color} strokeWidth="1.4" fill="none"/>
      <path d="M13 12.2l1.2 2.4 2.65.38-1.92 1.87.45 2.65L13 18.18l-2.38 1.32.45-2.65-1.92-1.87 2.65-.38L13 12.2z" fill={color}/>
    </svg>
  );
}

function GoldMedalBadge() {
  return (
    <div className="shrink-0 flex flex-col items-center" style={{ width: 50 }}>
      {/* Cintas inclinadas */}
      <div className="flex gap-1" style={{ height: 22, marginBottom: 1 }}>
        <div style={{
          width: 10, height: 22,
          background: "linear-gradient(180deg, #D4A017, #A87010)",
          borderRadius: "3px 3px 0 0",
          transform: "skewX(-10deg)",
        }}/>
        <div style={{
          width: 10, height: 22,
          background: "linear-gradient(180deg, #F5C842, #D4A017)",
          borderRadius: "3px 3px 0 0",
          transform: "skewX(10deg)",
        }}/>
      </div>
      {/* Círculo de medalla */}
      <div
        className="size-11 rounded-full flex items-center justify-center font-black text-xl"
        style={{
          background: "radial-gradient(circle at 38% 35%, #FFD966 0%, #E09020 100%)",
          color: "#7A5000",
          boxShadow: "0 3px 10px rgba(180,120,0,0.5), inset 0 1px 2px rgba(255,255,255,0.35)",
          border: "2.5px solid #C8880A",
        }}
      >
        1
      </div>
    </div>
  );
}

function CathedralSilhouette() {
  return (
    <svg width="76" height="94" viewBox="0 0 76 94" fill="none">
      {/* Cruz en la cima */}
      <rect x="35" y="2" width="4" height="11" fill="#D4A017" fillOpacity="0.2"/>
      <rect x="30" y="5" width="14" height="4" fill="#D4A017" fillOpacity="0.2"/>
      {/* Silueta catedral: cuerpo central + alas laterales */}
      <path
        d="M0 88 L0 50 L14 50 L14 42 L19 42 L19 50 L27 50 L27 26 L37 4 L47 26 L47 50 L55 50 L55 42 L60 42 L60 50 L76 50 L76 88 Z"
        fill="#D4A017"
        fillOpacity="0.18"
      />
      {/* Ventana arco central */}
      <path d="M32 36 Q37 28 42 36 L42 46 L32 46 Z" fill="white" fillOpacity="0.55"/>
      {/* Ventanas laterales */}
      <path d="M14 55 Q17 50 20 55 L20 63 L14 63 Z" fill="white" fillOpacity="0.55"/>
      <path d="M54 55 Q57 50 60 55 L60 63 L54 63 Z" fill="white" fillOpacity="0.55"/>
      {/* Puerta central arco */}
      <path d="M33 88 Q37 79 41 88 L41 88 L33 88 Z" fill="white" fillOpacity="0.55"/>
      <rect x="33" y="78" width="8" height="10" fill="white" fillOpacity="0.55"/>
    </svg>
  );
}

function FirstPlaceCard({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/user/${entry.user_id}`)}
      className="w-full text-left rounded-3xl border-2 overflow-hidden relative"
      style={{ background: "#FFFBF0", borderColor: "#F0D080" }}
    >
      {/* Decoración catedral */}
      <div className="absolute right-3 top-0 bottom-0 flex items-center">
        <CathedralSilhouette />
      </div>

      <div className="flex items-center gap-3 p-4 relative">
        <GoldMedalBadge />

        <div className="size-16 rounded-full overflow-hidden shrink-0" style={{ boxShadow: "0 0 0 2px #E8C040" }}>
          <AvatarImage avatarId={entry.avatar_url} size="lg" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-subheading font-bold text-jet-black">{entry.display_name ?? t("collections.explorer")}</p>
            {isMe && (
              <span className="rounded-full text-xs font-semibold px-2.5 py-0.5 border" style={{ background: "#FFF3D0", borderColor: "#F0C840", color: "#9A6A00" }}>
                {t("collections.you_name")}
              </span>
            )}
          </div>
          <p className="text-body-sm font-semibold mb-2" style={{ color: "#C08A10" }}>{t("collections.leader")}</p>
          <div className="flex items-center gap-3">
            <span className="text-body-sm text-graphite flex items-center gap-1">
              📍 <span className="font-semibold">{visitStr(entry.visit_count, t)}</span>
            </span>
            <span className="text-body-sm text-graphite flex items-center gap-1">
              🏅 <span className="font-semibold">{medalStr(entry.medal_count, t)}</span>
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function LeaderboardRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rankColor = entry.rank === 2 ? "#D4A017" : entry.rank === 3 ? "#C47830" : "#9E9E9E";
  const medalColor = entry.medal_count > 0 ? "#D4A017" : "#C4C4C4";

  return (
    <button
      onClick={() => navigate(`/user/${entry.user_id}`)}
      className="w-full flex items-center gap-3 bg-canvas-white rounded-2xl border border-whisper-gray px-4 py-3.5 active:bg-whisper-gray transition-colors text-left"
    >
      <span className="w-5 text-center text-body font-bold shrink-0" style={{ color: rankColor }}>
        {entry.rank}
      </span>
      <AvatarImage avatarId={entry.avatar_url} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-jet-black truncate">
          {entry.display_name ?? t("collections.explorer")}
          {isMe && <span className="ml-1.5 text-xs text-ash-gray">({t("collections.you")})</span>}
        </p>
        <p className="text-body-sm text-ash-gray flex items-center gap-1">
          {entry.visit_count > 0
            ? <><span>📍</span> {visitStr(entry.visit_count, t)}</>
            : t("collections.no_explorations")
          }
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <RankMedalIcon color={medalColor} />
        <div className="text-right">
          <p className="text-body font-bold text-jet-black leading-tight">{entry.medal_count}</p>
          <p className="text-[10px] text-ash-gray leading-tight">
            {entry.medal_count === 1 ? t("collections.medal_one") : t("collections.medals_count")}
          </p>
        </div>
      </div>
    </button>
  );
}

function InviteCard() {
  const { t } = useTranslation();
  const handleInvite = () => {
    if (navigator.share) {
      void navigator.share({ title: "HistoriAR", url: window.location.origin });
    } else {
      void navigator.clipboard?.writeText(window.location.origin);
    }
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-whisper-gray px-4 py-3.5">
      <div className="size-11 rounded-full bg-canvas-white flex items-center justify-center shrink-0">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="8" cy="7" r="3" stroke="#9E9E9E" strokeWidth="1.4" fill="none"/>
          <path d="M2 18c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#9E9E9E" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
          <circle cx="15.5" cy="7" r="2.5" stroke="#9E9E9E" strokeWidth="1.3" fill="none"/>
          <path d="M17.5 18c1.2-.9 2-2.4 2-4" stroke="#9E9E9E" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body font-bold text-jet-black">{t("collections.invite_title")}</p>
        <p className="text-body-sm text-ash-gray">{t("collections.invite_hint")}</p>
      </div>
      <button
        onClick={handleInvite}
        className="rounded-full bg-pinterest-red text-canvas-white px-5 py-2 text-body font-semibold shrink-0 active:brightness-90 transition-all"
      >
        {t("collections.invite_btn")}
      </button>
    </div>
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
    <div className="px-5 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`rounded-2xl border border-whisper-gray bg-canvas-white px-4 py-3.5 flex items-center gap-3 animate-pulse ${i === 0 ? "h-24" : "h-16"}`}>
          <div className="size-5 rounded-full bg-whisper-gray shrink-0"/>
          <div className="size-10 rounded-full bg-whisper-gray shrink-0"/>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-whisper-gray rounded-full w-1/2"/>
            <div className="h-3 bg-whisper-gray rounded-full w-1/3"/>
          </div>
          <div className="size-8 rounded-full bg-whisper-gray shrink-0"/>
        </div>
      ))}
    </div>
  );

  const first = entries[0];
  const rest  = entries.slice(1);
  const meInTop = user && entries.some(e => e.user_id === user.id);

  return (
    <div className="px-5 space-y-2.5">
      {/* Cabecera sección */}
      <div className="flex items-center gap-3 mb-1">
        <div className="size-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <path d="M7 3h8v7a4 4 0 01-8 0V3z" stroke="#C0392B" strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
            <path d="M7 6H4a2 2 0 002 2h1M15 6h3a2 2 0 01-2 2h-1" stroke="#C0392B" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="11" y1="14" x2="11" y2="18" stroke="#C0392B" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="7" y1="19" x2="15" y2="19" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-body font-bold text-jet-black">{t("collections.city_ranking_title")}</p>
          <p className="text-body-sm text-ash-gray">{t("collections.weekly_ranking")}</p>
        </div>
        <button className="size-8 rounded-full bg-whisper-gray flex items-center justify-center text-ash-gray">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 7v5M8 5.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {!user && (
        <div className="rounded-2xl bg-whisper-gray px-4 py-3 text-body text-graphite">
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
          {first && <FirstPlaceCard entry={first} isMe={user?.id === first.user_id} />}
          {rest.map(e => (
            <LeaderboardRow key={e.user_id} entry={e} isMe={user?.id === e.user_id} />
          ))}

          {/* Tu posición si no estás en el top 50 */}
          {user && !meInTop && myRank && (
            <div className="pt-1">
              <p className="text-xs text-center text-ash-gray pb-2">{t("collections.your_position")}</p>
              <div className="flex items-center gap-3 bg-canvas-white rounded-2xl border-2 border-amber-200 px-4 py-3.5" style={{ background: "#FFFBF0" }}>
                <span className="w-5 text-center text-body font-bold text-ash-gray shrink-0">{myRank}</span>
                <AvatarImage avatarId={(user.user_metadata as { avatar?: string })?.avatar} size="sm" />
                <p className="text-body font-semibold text-graphite flex-1 truncate">
                  {(user.user_metadata as { username?: string })?.username ?? t("collections.you_name")}
                  <span className="ml-1.5 text-xs text-ash-gray">({t("collections.you")})</span>
                </p>
              </div>
            </div>
          )}

          <InviteCard />
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
