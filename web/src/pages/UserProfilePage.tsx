import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import {
  getPublicProfile, getPublicUserMedals, getPublicUserVisitCount,
  getFollowers, getFollowing, isFollowing, followUser, unfollowUser,
  type UserMedal, type FollowUser,
} from "../lib/supabase";
import { AvatarImage } from "../components/AvatarPicker";
import { FollowListModal } from "../components/FollowListModal";
import { TIER_CONFIG } from "../lib/tierConfig";

export function UserProfilePage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<{
    id: string; display_name: string | null; avatar_url: string | null;
    bio: string | null; is_public: boolean;
  } | null>(null);
  const [medals, setMedals] = useState<UserMedal[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [amFollowing, setAmFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showList, setShowList] = useState<"followers" | "following" | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoadError(false);
    Promise.all([
      getPublicProfile(userId),
      getPublicUserMedals(userId),
      getPublicUserVisitCount(userId),
      getFollowers(userId),
      getFollowing(userId),
      isFollowing(userId),
    ]).then(([p, m, v, frs, fng, iF]) => {
      setProfile(p); setMedals(m); setVisitCount(v);
      setFollowers(frs); setFollowing(fng); setAmFollowing(iF);
    }).catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleFollow = async () => {
    if (!userId) return;
    setFollowLoading(true);
    try {
      if (amFollowing) {
        await unfollowUser(userId);
        setAmFollowing(false);
        setFollowers(f => f.filter(u => u.id !== user?.id));
      } else {
        await followUser(userId);
        setAmFollowing(true);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-full pb-8 px-6 pt-8 max-w-screen-md mx-auto animate-pulse">
        <div className="h-4 w-12 bg-whisper-gray rounded-full mb-8" />
        <div className="flex items-center gap-4 mb-6">
          <div className="size-16 rounded-full bg-whisper-gray shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-whisper-gray rounded-full" />
            <div className="h-3 w-20 bg-whisper-gray rounded-full" />
          </div>
          <div className="h-9 w-20 rounded-2xl bg-whisper-gray shrink-0" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl bg-canvas-white border border-whisper-gray h-20" />
          ))}
        </div>
        <div className="h-5 w-24 bg-whisper-gray rounded-full mb-4 mt-8" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-3xl bg-canvas-white border border-whisper-gray h-16" />
          ))}
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-full flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-4xl">📡</p>
        <p className="text-subheading font-semibold text-graphite">{t("user_profile.load_error_title")}</p>
        <p className="text-body-sm text-ash-gray">{t("common.connection_error")}</p>
        <button onClick={() => navigate(-1)} className="mt-2 text-body-sm text-pinterest-red font-medium">← {t("nav.back")}</button>
      </main>
    );
  }

  if (!profile || (!profile.is_public && profile.id !== user?.id)) {
    return (
      <main className="min-h-full flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h1 className="text-subheading font-bold text-jet-black mb-2">{t("user_profile.private_title")}</h1>
        <p className="text-body text-ash-gray mb-6">{t("user_profile.private_hint")}</p>
        <button onClick={() => navigate(-1)} className="text-body-sm text-pinterest-red font-medium">← {t("nav.back")}</button>
      </main>
    );
  }

  return (
    <main className="min-h-full pb-8 px-6 pt-8 max-w-screen-md mx-auto">
      <button onClick={() => navigate(-1)} className="text-ash-gray text-body-sm mb-8 block">← {t("nav.back")}</button>

      {/* Avatar + nombre */}
      <div className="flex items-center gap-4 mb-6">
        <AvatarImage avatarId={profile.avatar_url} size="lg" />
        <div className="flex-1 min-w-0">
          <h1 className="text-subheading font-bold text-jet-black">{profile.display_name ?? "—"}</h1>
          {profile.bio && <p className="text-body-sm text-ash-gray mt-0.5 truncate">{profile.bio}</p>}
        </div>
        {profile.id !== user?.id && user && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`rounded-2xl px-4 py-2 text-body font-semibold shrink-0 transition-colors disabled:opacity-50 ${amFollowing ? "bg-whisper-gray text-graphite" : "bg-pinterest-red text-canvas-white"}`}
          >
            {amFollowing ? t("search.unfollow") : t("search.follow")}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 text-center">
          <p className="text-heading font-bold text-jet-black">{visitCount}</p>
          <p className="text-body-sm text-ash-gray">{t("profile.visits")}</p>
        </div>
        <div className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 text-center">
          <p className="text-heading font-bold text-jet-black">{medals.length}</p>
          <p className="text-body-sm text-ash-gray">{t("profile.medals")}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button onClick={() => setShowList("followers")} className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 text-center active:bg-whisper-gray transition-colors">
          <p className="text-heading font-bold text-jet-black">{followers.length}</p>
          <p className="text-body-sm text-ash-gray">{t("profile.followers")}</p>
        </button>
        <button onClick={() => setShowList("following")} className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 text-center active:bg-whisper-gray transition-colors">
          <p className="text-heading font-bold text-jet-black">{following.length}</p>
          <p className="text-body-sm text-ash-gray">{t("profile.following")}</p>
        </button>
      </div>

      {/* Medallas */}
      <h2 className="text-subheading font-bold text-jet-black mb-4">{t("profile.medals")}</h2>
      {medals.length === 0 ? (
        <div className="rounded-3xl bg-whisper-gray px-6 py-10 text-center">
          <p className="text-4xl mb-3">🏅</p>
          <p className="text-body text-ash-gray">{t("profile.no_medals")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {medals.map((m) => {
            const tier = TIER_CONFIG[m.medal.tier];
            return (
              <li key={m.medal_id} className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 flex items-center gap-4">
                <span className="text-3xl">{tier?.emoji ?? "🏅"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-graphite">{m.medal.name}</p>
                  {m.medal.description && (
                    <p className="text-body-sm text-ash-gray truncate">{m.medal.description}</p>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-body-sm font-medium shrink-0 ${tier?.colors ?? "bg-whisper-gray text-graphite"}`}>
                  {tier?.label ?? "—"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {showList && (
        <FollowListModal
          type={showList}
          users={showList === "followers" ? followers : following}
          onClose={() => setShowList(null)}
        />
      )}
    </main>
  );
}
