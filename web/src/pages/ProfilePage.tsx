import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { getUserMedals, getUserVisitCount, getFollowers, getFollowing, getCollectionsProgress, getMyProfileSettings, updatePreferredLocale, type UserMedal, type FollowUser, type CollectionProgress } from "../lib/supabase";
import { supabase, syncProfile } from "../lib/supabase";
import { AvatarImage, AvatarPicker, type AvatarId } from "../components/AvatarPicker";
import { FollowListModal } from "../components/FollowListModal";
import { BottomNav } from "../components/BottomNav";
import { TIER_CONFIG } from "../lib/tierConfig";
import { MedalModal } from "../components/MedalCard";
import { LanguageSelect } from "../components/LanguageSelect";
import { currentLocale, normalizeLocale, type Locale } from "../lib/i18n";

const HERO_URL = "https://qvevpackpwpjqgsapqws.supabase.co/storage/v1/object/public/monument-images/puerta-toledo-login.jpg";

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const [medals, setMedals] = useState<UserMedal[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [collectionsProgress, setCollectionsProgress] = useState<CollectionProgress[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingLocale, setSavingLocale] = useState(false);
  const [locale, setLocale] = useState<Locale>(() => currentLocale());
  const [showFollowList, setShowFollowList] = useState<"followers" | "following" | null>(null);
  const [selectedMedal, setSelectedMedal] = useState<UserMedal | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { state: { from: "/profile" } }); return; }

    Promise.all([getUserMedals(), getUserVisitCount(), getFollowers(user.id), getFollowing(user.id), getCollectionsProgress(), getMyProfileSettings()])
      .then(([m, v, frs, fng, cp, settings]) => {
        const preferredLocale = normalizeLocale((user.user_metadata as { locale?: string } | undefined)?.locale ?? settings?.locale);
        setMedals(m);
        setVisitCount(v);
        setFollowers(frs);
        setFollowing(fng);
        setCollectionsProgress(cp);
        setLocale(preferredLocale);
        void i18n.changeLanguage(preferredLocale);
      })
      .finally(() => setDataLoading(false));
  }, [user, loading, navigate, i18n]);

  const handleAvatarChange = async (newAvatar: AvatarId) => {
    setSavingAvatar(true);
    await supabase.auth.updateUser({ data: { avatar: newAvatar } });
    await syncProfile(username, newAvatar, locale);
    await supabase.auth.refreshSession();
    setSavingAvatar(false);
    setEditingAvatar(false);
  };

  const handleLocaleChange = async (nextLocale: Locale) => {
    setLocale(nextLocale);
    setSavingLocale(true);
    await i18n.changeLanguage(nextLocale);
    try {
      await supabase.auth.updateUser({ data: { locale: nextLocale } });
      await updatePreferredLocale(nextLocale);
      await supabase.auth.refreshSession();
    } finally {
      setSavingLocale(false);
    }
  };

  const meta = user?.user_metadata as { username?: string; avatar?: string } | undefined;
  const username = meta?.username ?? user?.email?.split("@")[0] ?? "—";
  const avatarId = meta?.avatar ?? null;

  const selectedMedalCollection = selectedMedal
    ? collectionsProgress.find(c => c.medal_id === selectedMedal.medal_id) ?? null
    : null;

  if (loading || dataLoading) {
    return (
      <main className="min-h-full flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-pinterest-red border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="h-full overflow-y-auto pb-24 bg-[#F5F2EE]">

      {/* Hero */}
      <div className="relative h-52 shrink-0">
        <img
          src={HERO_URL}
          alt="HistoriAR"
          className="w-full h-full object-cover"
          style={{ objectPosition: "50% 40%" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 50%, #F5F2EE 100%)" }} />

        {/* Controles superiores */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-safe-top pt-4 z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-canvas-white text-body-sm font-medium drop-shadow"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t("nav.back")}
          </button>
          <button
            onClick={() => { signOut(); navigate("/"); }}
            className="rounded-full border border-canvas-white/80 bg-canvas-white/10 backdrop-blur-sm text-canvas-white px-4 py-1.5 text-body-sm font-medium"
          >
            {t("auth.sign_out")}
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="-mt-6 px-5">

        {/* Avatar + nombre */}
        <div className="flex items-end gap-4 mb-5">
          <div className="relative shrink-0">
            <div className="rounded-full ring-4 ring-[#F5F2EE] shadow-md">
              <AvatarImage avatarId={avatarId} size="xl" />
            </div>
            <button
              onClick={() => setEditingAvatar(true)}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-pinterest-red text-canvas-white flex items-center justify-center shadow-md"
              aria-label="Cambiar avatar"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M9.5 1.5l2 2L4 11H2V9L9.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
              </svg>
            </button>
          </div>
          <div className="pb-1 min-w-0">
            <h1 className="text-[1.25rem] font-bold text-jet-black leading-tight truncate">{username}</h1>
            <p className="text-body-sm text-ash-gray truncate">{user?.email}</p>
          </div>
        </div>

        <div className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 mb-6">
          <LanguageSelect
            value={locale}
            onChange={(nextLocale) => { void handleLocaleChange(nextLocale); }}
            disabled={savingLocale}
            label={t("profile.language")}
          />
          {savingLocale && (
            <p className="text-body-sm text-ash-gray mt-2">{t("profile.saving")}</p>
          )}
        </div>

        {/* Stats 2×2 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            icon={<LocationIcon />}
            value={visitCount}
            label={t("profile.visits")}
          />
          <StatCard
            icon={<MedalIcon />}
            value={medals.length}
            label={t("profile.medals")}
          />
          <button
            onClick={() => setShowFollowList("followers")}
            className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 text-center active:bg-whisper-gray transition-colors"
          >
            <div className="flex justify-center mb-1"><PeopleIcon /></div>
            <p className="text-heading font-bold text-jet-black">{followers.length}</p>
            <p className="text-body-sm text-ash-gray">{t("profile.followers")}</p>
          </button>
          <button
            onClick={() => setShowFollowList("following")}
            className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 text-center active:bg-whisper-gray transition-colors"
          >
            <div className="flex justify-center mb-1"><PersonIcon /></div>
            <p className="text-heading font-bold text-jet-black">{following.length}</p>
            <p className="text-body-sm text-ash-gray">{t("profile.following")}</p>
          </button>
        </div>

        {/* Medallas */}
        <h2 className="text-subheading font-bold text-jet-black mb-4">{t("profile.medals")}</h2>
        {medals.length === 0 ? (
          <div className="rounded-3xl bg-canvas-white border border-whisper-gray px-6 py-10 text-center">
            <div className="flex justify-center mb-3">
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <path d="M26 18 L20 32 L32 32 Z" stroke="#C9A84C" strokeWidth="2" fill="none" strokeLinejoin="round"/>
                <circle cx="26" cy="36" r="10" stroke="#C9A84C" strokeWidth="2" fill="none"/>
                <circle cx="26" cy="36" r="6" stroke="#C9A84C" strokeWidth="1.5" fill="none"/>
                <path d="M22 18 L18 8 M30 18 L34 8" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-body font-semibold text-graphite mb-1">{t("profile.no_medals")}</p>
            <p className="text-body-sm text-ash-gray">{t("profile.no_medals_hint")}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {medals.map((m) => {
              const tier = TIER_CONFIG[m.medal.tier];
              return (
                <li key={m.medal_id}>
                  <button
                    onClick={() => setSelectedMedal(m)}
                    className="w-full rounded-3xl bg-canvas-white border border-whisper-gray p-4 flex items-center gap-4 active:bg-whisper-gray transition-colors text-left"
                  >
                    {m.medal.image_url ? (
                      <img src={m.medal.image_url} alt={m.medal.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="text-3xl shrink-0">{tier?.emoji ?? "🏅"}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-graphite">{m.medal.name}</p>
                      {m.medal.description && (
                        <p className="text-body-sm text-ash-gray truncate">{m.medal.description}</p>
                      )}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-body-sm font-medium shrink-0 ${tier?.colors ?? "bg-whisper-gray text-graphite"}`}>
                      {tier?.label ?? "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal cambio de avatar */}
      {editingAvatar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-jet-black/60 backdrop-blur-sm px-6">
          <div className="bg-canvas-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-subheading font-bold text-jet-black mb-4 text-center">
              {t("auth.choose_avatar")}
            </h3>
            <AvatarPicker selected={avatarId as AvatarId} onSelect={handleAvatarChange} />
            {savingAvatar ? (
              <p className="text-center text-body-sm text-ash-gray mt-4">{t("profile.saving")}</p>
            ) : (
              <button onClick={() => setEditingAvatar(false)} className="mt-5 w-full rounded-2xl bg-whisper-gray text-graphite py-2.5 text-body font-medium">
                {t("nav.cancel")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal seguidores / siguiendo */}
      {showFollowList && (
        <FollowListModal
          type={showFollowList}
          users={showFollowList === "followers" ? followers : following}
          onClose={() => setShowFollowList(null)}
        />
      )}

      {/* Modal medalla 3D */}
      {selectedMedal && (
        <MedalModal
          imageUrl={selectedMedal.medal.image_url ?? "/medals/puerta-toledo.png"}
          name={selectedMedal.medal.name}
          description={selectedMedal.medal.description}
          tier={selectedMedal.medal.tier}
          earnedAt={selectedMedal.earned_at}
          backgroundUrl={HERO_URL}
          location="Ciudad Real, España"
          collectionName={selectedMedalCollection?.collection_name}
          collectionProgress={selectedMedalCollection?.visited_monuments}
          collectionTotal={selectedMedalCollection?.total_monuments}
          onClose={() => setSelectedMedal(null)}
        />
      )}

      <BottomNav />
    </main>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-heading font-bold text-jet-black">{value}</p>
      <p className="text-body-sm text-ash-gray">{label}</p>
    </div>
  );
}

function LocationIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2C7.686 2 5 4.686 5 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z" stroke="#9E9E9E" strokeWidth="1.4" fill="none"/>
      <circle cx="11" cy="8" r="2" stroke="#9E9E9E" strokeWidth="1.4" fill="none"/>
    </svg>
  );
}

function MedalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 7 L8 14 L14 14 Z" stroke="#9E9E9E" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
      <circle cx="11" cy="16" r="4" stroke="#9E9E9E" strokeWidth="1.4" fill="none"/>
      <path d="M9 7 L7 2 M13 7 L15 2" stroke="#9E9E9E" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="8.5" cy="7" r="3" stroke="#9E9E9E" strokeWidth="1.4" fill="none"/>
      <path d="M2 18c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" stroke="#9E9E9E" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      <circle cx="15" cy="7" r="2.5" stroke="#9E9E9E" strokeWidth="1.3" fill="none"/>
      <path d="M17.5 18c1.5-.8 2.5-2.3 2.5-4" stroke="#9E9E9E" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="7" r="3.5" stroke="#9E9E9E" strokeWidth="1.4" fill="none"/>
      <path d="M3 19c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#9E9E9E" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
