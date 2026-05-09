const AVATARS = [
  { id: "owl",    emoji: "🦉", label: "Búho sabio"       },
  { id: "fox",    emoji: "🦊", label: "Zorro explorador" },
  { id: "pigeon", emoji: "🐦", label: "Paloma mensajera" },
  { id: "cat",    emoji: "🐱", label: "Gato detective"   },
  { id: "dog",    emoji: "🐶", label: "Perro aventurero" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];

interface Props {
  selected: AvatarId | null;
  onSelect: (id: AvatarId) => void;
}

export function AvatarPicker({ selected, onSelect }: Props) {
  return (
    <div className="flex justify-center gap-3 flex-wrap">
      {AVATARS.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelect(a.id)}
          aria-label={a.label}
          className={`relative w-16 h-16 rounded-full overflow-hidden transition-all active:scale-95 ${
            selected === a.id
              ? "ring-4 ring-pinterest-red ring-offset-2 scale-105"
              : "ring-2 ring-whisper-gray opacity-70 hover:opacity-100"
          }`}
        >
          <img
            src={`/avatars/${a.id}.png`}
            alt={a.label}
            className="w-full h-full object-cover scale-[1.18]"
            onError={(e) => {
              // fallback emoji mientras no hay imagen real
              const el = e.currentTarget;
              el.style.display = "none";
              (el.nextSibling as HTMLElement).style.display = "flex";
            }}
          />
          <span
            style={{ display: "none" }}
            className="absolute inset-0 bg-whisper-gray flex items-center justify-center text-3xl"
          >
            {a.emoji}
          </span>
        </button>
      ))}
    </div>
  );
}

export function AvatarImage({
  avatarId,
  size = "md",
  className = "",
}: {
  avatarId: AvatarId | string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-16 h-16" }[size];
  const avatar = AVATARS.find((a) => a.id === avatarId);

  return (
    <div className={`${sizeClass} rounded-full overflow-hidden bg-whisper-gray flex items-center justify-center shrink-0 ${className}`}>
      {avatarId ? (
        <>
          <img
            src={`/avatars/${avatarId}.png`}
            alt={avatar?.label ?? "Avatar"}
            className="w-full h-full object-cover scale-[1.18]"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              (el.nextSibling as HTMLElement).style.display = "flex";
            }}
          />
          <span style={{ display: "none" }} className="text-xl w-full h-full items-center justify-center">
            {avatar?.emoji ?? "🧭"}
          </span>
        </>
      ) : (
        <span className="text-xl">🧭</span>
      )}
    </div>
  );
}

export { AVATARS };
