import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { getUserMedals, getUserVisitCount, getFollowers, getFollowing, type UserMedal, type FollowUser } from "../lib/supabase";
import { supabase, syncProfile } from "../lib/supabase";
import { AvatarImage, AvatarPicker, type AvatarId } from "../components/AvatarPicker";
import { FollowListModal } from "../components/FollowListModal";
import { BottomNav } from "../components/BottomNav";
import { TIER_CONFIG } from "../lib/tierConfig";

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const [medals, setMedals] = useState<UserMedal[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [showFollowList, setShowFollowList] = useState<"followers" | "following" | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { state: { from: "/profile" } }); return; }

    Promise.all([getUserMedals(), getUserVisitCount(), getFollowers(user.id), getFollowing(user.id)])
      .then(([m, v, frs, fng]) => { setMedals(m); setVisitCount(v); setFollowers(frs); setFollowing(fng); })
      .finally(() => setDataLoading(false));
  }, [user, loading, navigate]);

  const handleAvatarChange = async (newAvatar: AvatarId) => {
    setSavingAvatar(true);
    await supabase.auth.updateUser({ data: { avatar: newAvatar } });
    await syncProfile(username, newAvatar);
    await supabase.auth.refreshSession();
    setSavingAvatar(false);
    setEditingAvatar(false);
  };

  const meta = user?.user_metadata as { username?: string; avatar?: string } | undefined;
  const username = meta?.username ?? user?.email?.split("@")[0] ?? "—";
  const avatarId = meta?.avatar ?? null;

  if (loading || dataLoading) {
    return (
      <main className="min-h-full flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-pinterest-red border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-full pb-24 px-6 pt-8 max-w-screen-md mx-auto">

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate("/")} className="text-ash-gray text-body-sm">← {t("nav.back")}</button>
        <button onClick={() => { signOut(); navigate("/"); }} className="text-body-sm text-pinterest-red font-medium">
          {t("auth.sign_out")}
        </button>
      </div>

      {/* Avatar + nombre */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          <AvatarImage avatarId={avatarId} size="lg" />
          <button
            onClick={() => setEditingAvatar(true)}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-pinterest-red text-canvas-white text-xs flex items-center justify-center shadow"
            aria-label="Cambiar avatar"
          >
            ✏️
          </button>
        </div>
        <div>
          <h1 className="text-subheading font-bold text-jet-black">{username}</h1>
          <p className="text-body-sm text-ash-gray">{user?.email}</p>
        </div>
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
        <button onClick={() => setShowFollowList("followers")} className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 text-center active:bg-whisper-gray transition-colors">
          <p className="text-heading font-bold text-jet-black">{followers.length}</p>
          <p className="text-body-sm text-ash-gray">{t("profile.followers")}</p>
        </button>
        <button onClick={() => setShowFollowList("following")} className="rounded-3xl bg-canvas-white border border-whisper-gray p-4 text-center active:bg-whisper-gray transition-colors">
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
          <p className="text-body-sm text-ash-gray mt-1">{t("profile.no_medals_hint")}</p>
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

      <BottomNav />
    </main>
  );
}
