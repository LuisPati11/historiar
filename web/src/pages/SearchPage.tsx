import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { searchProfiles, followUser, unfollowUser, type ProfileResult } from "../lib/supabase";
import { AvatarImage } from "../components/AvatarPicker";
import { BottomNav } from "../components/BottomNav";

export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await searchProfiles(value);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const toggleFollow = async (profile: ProfileResult) => {
    setFollowLoading(profile.id);
    try {
      if (profile.is_following) {
        await unfollowUser(profile.id);
      } else {
        await followUser(profile.id);
      }
      setResults((prev) =>
        prev.map((p) => p.id === profile.id ? { ...p, is_following: !p.is_following } : p)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(null);
    }
  };

  return (
    <main className="min-h-full pb-20">
      <header className="px-6 pt-8 pb-4">
        <h1 className="text-heading font-bold text-jet-black">{t("search.title")}</h1>
      </header>

      {/* Buscador */}
      <div className="px-6 mb-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ash-gray">🔍</span>
          <input
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t("search.placeholder")}
            className="w-full rounded-2xl bg-whisper-gray border border-whisper-gray pl-10 pr-4 py-3 text-body text-graphite placeholder:text-ash-gray focus:outline-none focus:border-pinterest-red transition"
          />
        </div>
      </div>

      {/* Estado vacío inicial */}
      {!query && (
        <div className="px-6 pt-6 text-center">
          <p className="text-5xl mb-3">🌍</p>
          <p className="text-body text-ash-gray">{t("search.hint")}</p>
        </div>
      )}

      {/* Spinner */}
      {searching && (
        <div className="flex justify-center pt-8">
          <div className="w-7 h-7 rounded-full border-4 border-pinterest-red border-t-transparent animate-spin" />
        </div>
      )}

      {/* Sin resultados */}
      {!searching && query.length >= 2 && results.length === 0 && (
        <p className="px-6 text-center text-body text-ash-gray pt-8">{t("search.no_results")}</p>
      )}

      {/* Resultados */}
      <ul className="px-6 space-y-3">
        {results.map((profile) => (
          <li key={profile.id} className="flex items-center gap-3 rounded-3xl bg-canvas-white border border-whisper-gray p-4">
            <button onClick={() => navigate(`/user/${profile.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <AvatarImage avatarId={profile.avatar_url} size="md" />
              <div className="min-w-0">
                <p className="text-body font-semibold text-graphite truncate">{profile.display_name}</p>
                <p className="text-body-sm text-ash-gray">{profile.display_name ? "Explorador" : ""}</p>
              </div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleFollow(profile); }}
              disabled={followLoading === profile.id}
              className={`rounded-2xl px-4 py-1.5 text-body-sm font-semibold transition-all shrink-0 ${
                profile.is_following
                  ? "bg-whisper-gray text-graphite"
                  : "bg-pinterest-red text-canvas-white"
              } disabled:opacity-50`}
            >
              {followLoading === profile.id
                ? "…"
                : profile.is_following
                  ? t("search.unfollow")
                  : t("search.follow")}
            </button>
          </li>
        ))}
      </ul>

      <BottomNav />
    </main>
  );
}
