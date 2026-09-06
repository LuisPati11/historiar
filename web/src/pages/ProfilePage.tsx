import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/authContext";
import { getUserMedals, getCollectionsProgress, type UserMedal, type CollectionProgress } from "../lib/api/achievements";
import { getFollowers, getFollowing, type FollowUser } from "../lib/api/social";
import { getMyProfileSettings, syncProfile, updatePreferredLocale, updateProfileVisibility } from "../lib/api/profile";
import { publicStorageUrl, supabase } from "../lib/supabaseClient";
import { AvatarImage, AvatarPicker, type AvatarId } from "../components/AvatarPicker";
import { FollowListModal } from "../components/FollowListModal";
import { BottomNav } from "../components/BottomNav";
import { TIER_CONFIG } from "../lib/tierConfig";
import { MedalModal } from "../components/MedalCard";
import { LanguageSelect } from "../components/LanguageSelect";
import { currentLocale, normalizeLocale, type Locale } from "../lib/i18n";
import { useModalAccessibility } from "../hooks/useModalAccessibility";
import { GyroPermissionBanner } from "../components/GyroPermissionBanner";

const HERO_URL = publicStorageUrl("monument-images", "puerta-toledo-login.jpg");
const PROFILE_LOAD_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId = 0;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("Profile load timed out")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const [medals, setMedals] = useState<UserMedal[]>([]);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [collectionsProgress, setCollectionsProgress] = useState<CollectionProgress[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingLocale, setSavingLocale] = useState(false);
  const [localeError, setLocaleError] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>(() => currentLocale());
  const [isPublic, setIsPublic] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [showFollowList, setShowFollowList] = useState<"followers" | "following" | null>(null);
  const [selectedMedal, setSelectedMedal] = useState<UserMedal | null>(null);
  const avatarCloseRef = useModalAccessibility(() => setEditingAvatar(false), editingAvatar && !savingAvatar);
  const userId = user?.id;
  const userLocale = (user?.user_metadata as { locale?: string } | undefined)?.locale;

  useEffect(() => {
    if (loading) return;
    if (!userId) { navigate("/auth", { state: { from: "/profile" } }); return; }
    let cancelled = false;
    setDataLoading(true);
    setDataError(false);

    withTimeout(Promise.all([
      getUserMedals(),
      getFollowers(userId),
      getFollowing(userId),
      getCollectionsProgress(),
      getMyProfileSettings(),
    ]), PROFILE_LOAD_TIMEOUT_MS)
      .then(([m, frs, fng, cp, settings]) => {
        if (cancelled) return;
        const preferredLocale = normalizeLocale(settings?.locale ?? userLocale);
        setMedals(m);
        setFollowers(frs);
        setFollowing(fng);
        setCollectionsProgress(cp);
        setLocale(preferredLocale);
        setIsPublic(settings?.is_public ?? false);
        if (i18n.resolvedLanguage !== preferredLocale) void i18n.changeLanguage(preferredLocale);
      })
      .catch(() => { if (!cancelled) setDataError(true); })
      .finally(() => { if (!cancelled) setDataLoading(false); });
    return () => { cancelled = true; };
  }, [userId, userLocale, loading, navigate, i18n, reloadKey]);

  const handleAvatarChange = async (newAvatar: AvatarId) => {
    setSavingAvatar(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { avatar: newAvatar } });
      if (error) throw error;
      await syncProfile(username, newAvatar, locale);
      await supabase.auth.refreshSession();
      setEditingAvatar(false);
    } catch {
      setLocaleError(t("common.connection_error"));
    } finally {
      setSavingAvatar(false);
    }
  };

  const handlePrivacyChange = async () => {
    const nextValue = !isPublic;
    setIsPublic(nextValue);
    setSavingPrivacy(true);
    setPrivacyError(null);
    try {
      await updateProfileVisibility(nextValue);
    } catch {
      setIsPublic(!nextValue);
      setPrivacyError(t("profile.privacy_save_error"));
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleLocaleChange = async (nextLocale: Locale) => {
    const previousLocale = locale;
    setLocale(nextLocale);
    setSavingLocale(true);
    setLocaleError(null);

    let timeoutId = 0;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(t("profile.language_save_error"))), 8000);
    });

    try {
      await Promise.race([
        updatePreferredLocale(nextLocale),
        timeout,
      ]);
      await i18n.changeLanguage(nextLocale);
    } catch {
      setLocale(previousLocale);
      setLocaleError(t("profile.language_save_error"));
      await i18n.changeLanguage(previousLocale);
    } finally {
      window.clearTimeout(timeoutId);
      setSavingLocale(false);
    }
  };

  const handleSignOut = async () => {
    setLocaleError(null);
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch {
      setLocaleError(t("common.action_error"));
    }
  };

  const meta = user?.user_metadata as { username?: string; avatar?: string } | undefined;
  const username = meta?.username ?? user?.email?.split("@")[0] ?? "—";
  const avatarId = meta?.avatar ?? null;

  const selectedMedalCollection = selectedMedal
    ? collectionsProgress.find(c => c.medal_id === selectedMedal.medal_id) ?? null
    : null;
  const collectionsCount = collectionsProgress.filter((collection) => collection.earned_at).length;

  if (loading || dataLoading) {
    return (
      <main className="h-full overflow-y-auto pb-24 bg-[#F5F2EE] animate-pulse">
        <div className="h-52 bg-whisper-gray" />
        <div className="-mt-6 px-5">
          <div className="flex items-end gap-4 mb-5">
            <div className="size-20 rounded-full bg-[#ddd] ring-4 ring-[#F5F2EE] shrink-0" />
            <div className="pb-1 space-y-2">
              <div className="h-5 w-32 bg-whisper-gray rounded-full" />
              <div className="h-3 w-24 bg-whisper-gray rounded-full" />
            </div>
          </div>
          <div className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 mb-6 h-14" />
          <div className="grid grid-cols-2 gap-3 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-3xl bg-canvas-white border border-whisper-gray h-24" />
            ))}
          </div>
          <div className="h-5 w-24 bg-whisper-gray rounded-full mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-3xl bg-canvas-white border border-whisper-gray h-16" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (dataError) {
    return (
      <main className="min-h-full flex flex-col items-center justify-center px-6 text-center gap-3 bg-[#F5F2EE]">
        <p className="text-4xl">📡</p>
        <h1 className="text-subheading font-semibold text-graphite">{t("user_profile.load_error_title")}</h1>
        <p className="text-body-sm text-ash-gray">{t("common.connection_error")}</p>
        <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-2 rounded-full bg-pinterest-red px-5 py-2.5 text-body-sm font-semibold text-canvas-white">
          {t("common.retry")}
        </button>
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
          onError={(event) => { event.currentTarget.hidden = true; }}
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
            onClick={() => { void handleSignOut(); }}
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
              className="absolute -bottom-1 -right-1 size-7 rounded-full bg-pinterest-red text-canvas-white flex items-center justify-center shadow-md"
              aria-label={t("common.change_avatar")}
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
          {localeError && (
            <p className="text-body-sm text-red-600 mt-2">{localeError}</p>
          )}
          <div className="mt-4 border-t border-whisper-gray pt-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-body font-semibold text-graphite">
                {isPublic ? t("profile.make_public") : t("profile.make_private")}
              </p>
              <p className="text-body-sm text-ash-gray">{t("profile.privacy_hint")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              aria-label={t("profile.make_public")}
              disabled={savingPrivacy}
              onClick={() => void handlePrivacyChange()}
              className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${isPublic ? "bg-pinterest-red" : "bg-ash-gray"}`}
            >
              <span className={`absolute top-1 size-5 rounded-full bg-canvas-white transition-transform ${isPublic ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {privacyError && <p className="text-body-sm text-red-600 mt-2">{privacyError}</p>}
        </div>

        {/* Stats 2×2 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => document.getElementById("medals-section")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 text-center active:bg-whisper-gray transition-colors"
          >
            <div className="flex justify-center mb-1"><MedalIcon /></div>
            <p className="text-heading font-bold text-jet-black">{medals.length}</p>
            <p className="text-body-sm text-ash-gray">{t("profile.medals")}</p>
          </button>
          <button
            onClick={() => navigate("/collections")}
            className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 text-center active:bg-whisper-gray transition-colors"
          >
            <div className="flex justify-center mb-1"><CollectionIcon /></div>
            <p className="text-heading font-bold text-jet-black">{collectionsCount}</p>
            <p className="text-body-sm text-ash-gray">{t("profile.collections")}</p>
          </button>
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
        <h2 id="medals-section" className="text-subheading font-bold text-jet-black mb-4">{t("profile.medals")}</h2>
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
                      <img src={m.medal.image_url} alt={m.medal.name} className="size-12 rounded-full object-cover shrink-0" />
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
                      {tier ? t(tier.labelKey) : "—"}
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
          <div className="bg-canvas-white rounded-3xl p-6 w-full max-w-sm" role="dialog" aria-modal="true" aria-labelledby="avatar-picker-title">
            <h3 id="avatar-picker-title" className="text-subheading font-bold text-jet-black mb-4 text-center">
              {t("auth.choose_avatar")}
            </h3>
            <AvatarPicker selected={avatarId as AvatarId} onSelect={handleAvatarChange} />
            {savingAvatar ? (
              <p className="text-center text-body-sm text-ash-gray mt-4">{t("profile.saving")}</p>
            ) : (
              <button ref={avatarCloseRef} type="button" onClick={() => setEditingAvatar(false)} className="mt-5 w-full rounded-2xl bg-whisper-gray text-graphite py-2.5 text-body font-medium">
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
          location={t("profile.medal_location_toledo")}
          collectionName={selectedMedalCollection?.collection_name}
          collectionProgress={selectedMedalCollection?.visited_monuments}
          collectionTotal={selectedMedalCollection?.total_monuments}
          onClose={() => setSelectedMedal(null)}
        />
      )}

      {medals.length > 0 && <GyroPermissionBanner />}

      <BottomNav />
    </main>
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

function CollectionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M5 8.5L11 4l6 4.5v8.5H5V8.5z" stroke="#9E9E9E" strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
      <path d="M8 17v-5h6v5M7.5 10.5h7" stroke="#9E9E9E" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
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
