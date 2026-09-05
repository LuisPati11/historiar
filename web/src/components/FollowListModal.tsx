import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { FollowUser } from "../lib/api/social";
import { AvatarImage } from "./AvatarPicker";
import { useModalAccessibility } from "../hooks/useModalAccessibility";

interface Props {
  type: "followers" | "following";
  users: FollowUser[];
  onClose: () => void;
}

export function FollowListModal({ type, users, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const closeRef = useModalAccessibility(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-jet-black/60 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="bg-canvas-white rounded-t-3xl w-full max-w-md max-h-[70vh] flex flex-col" role="dialog" aria-modal="true" aria-labelledby="follow-list-title">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-whisper-gray">
          <h3 id="follow-list-title" className="text-subheading font-bold text-jet-black">{t(`profile.${type}`)}</h3>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t("common.close")} className="text-ash-gray text-xl size-8 flex items-center justify-center">×</button>
        </div>
        <ul className="overflow-y-auto flex-1 px-4 py-3 space-y-1">
          {users.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => { onClose(); navigate(`/user/${u.id}`); }}
                className="w-full flex items-center gap-3 px-2 py-3 rounded-2xl active:bg-whisper-gray transition-colors"
              >
                <AvatarImage avatarId={u.avatar_url} size="md" />
                <span className="text-body font-medium text-graphite">{u.display_name ?? "—"}</span>
              </button>
            </li>
          ))}
          {users.length === 0 && (
            <p className="text-center text-body text-ash-gray py-8">{t("common.empty_users")}</p>
          )}
        </ul>
      </div>
    </div>
  );
}
