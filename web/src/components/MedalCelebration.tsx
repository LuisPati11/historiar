import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCollectionsProgress, type CollectionProgress, type EarnedMedal } from "../lib/api/achievements";
import { useModalAccessibility } from "../hooks/useModalAccessibility";

const TIER_CONFIG: Record<string, { labelKey: string; accent: string; soft: string; glow: string }> = {
  bronze: {
    labelKey: "medal.rarity.bronze",
    accent: "#9a5a1b",
    soft: "rgba(154,90,27,0.13)",
    glow: "rgba(201,132,35,0.34)",
  },
  silver: {
    labelKey: "medal.rarity.silver",
    accent: "#697386",
    soft: "rgba(105,115,134,0.13)",
    glow: "rgba(148,163,184,0.34)",
  },
  gold: {
    labelKey: "medal.rarity.gold",
    accent: "#b58100",
    soft: "rgba(181,129,0,0.14)",
    glow: "rgba(234,179,8,0.36)",
  },
  platinum: {
    labelKey: "medal.rarity.diamond",
    accent: "#24749c",
    soft: "rgba(36,116,156,0.13)",
    glow: "rgba(56,189,248,0.32)",
  },
};

const CONFETTI = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${6 + ((index * 17) % 88)}%`,
  delay: `${(index % 7) * 0.16}s`,
  duration: `${4.2 + (index % 5) * 0.45}s`,
  size: 5 + (index % 4) * 2,
  rotate: `${(index * 37) % 180}deg`,
}));

function playVictoryChime() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch { /* AudioContext no disponible */ }
}

interface Props {
  medals: EarnedMedal[];
  onClose: () => void;
}

export function MedalCelebration({ medals, onClose }: Props) {
  const { i18n, t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [collections, setCollections] = useState<CollectionProgress[]>([]);
  const [imageReady, setImageReady] = useState(false);
  const chimePlayed = useRef(false);
  const closeRef = useModalAccessibility(onClose);

  useEffect(() => {
    let cancelled = false;
    getCollectionsProgress()
      .then((data) => {
        if (!cancelled) setCollections(data);
      })
      .catch(() => {
        if (!cancelled) setCollections([]);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setImageReady(false);
  }, [index]);

  useEffect(() => {
    if (!imageReady) return;
    if (!chimePlayed.current) {
      chimePlayed.current = true;
      playVictoryChime();
    }
  }, [imageReady]);

  const medal = medals[index];
  const tier = TIER_CONFIG[medal?.tier ?? "bronze"] ?? TIER_CONFIG.bronze;
  const hasNext = index < medals.length - 1;
  const collection = collections.find((item) => item.medal_id === medal?.id) ?? null;
  const earnedDate = medal?.earned_at
    ? new Date(medal.earned_at).toLocaleDateString(i18n.language, { day: "numeric", month: "long", year: "numeric" })
    : null;

  const progress = useMemo(() => {
    if (!collection || collection.total_monuments <= 0) return 0;
    return Math.min(100, Math.round((collection.visited_monuments / collection.total_monuments) * 100));
  }, [collection]);

  if (!medal) return null;

  const advance = () => {
    if (hasNext) {
      chimePlayed.current = false;
      setIndex((current) => current + 1);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-jet-black text-graphite" role="dialog" aria-modal="true" aria-labelledby="medal-celebration-title">
      <style>{`
        @keyframes medal-confetti-fall {
          0% { transform: translate3d(0, -18vh, 0) rotate(0deg); opacity: 0; }
          12% { opacity: 0.75; }
          100% { transform: translate3d(18px, 112vh, 0) rotate(250deg); opacity: 0; }
        }
        @keyframes medal-reveal {
          0% { transform: translateY(22px) scale(0.92); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      <div className="absolute inset-x-0 top-0 h-28 bg-jet-black" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-canvas-white" />

      <section className="absolute inset-x-0 bottom-0 top-14 overflow-hidden rounded-t-[32px] bg-[#f8f4ed]">
        {medal.image_url && (
          <img
            src={medal.image_url}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-125 object-cover opacity-20 blur-xl"
          />
        )}
        <div className="absolute inset-0 bg-canvas-white/70" />
        <div
          className="absolute left-1/2 top-[33%] h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, ${tier.glow} 0%, rgba(255,255,255,0) 66%)` }}
        />

        {CONFETTI.map((piece) => (
          <span
            key={piece.id}
            className="absolute top-0 rounded-[2px]"
            style={{
              left: piece.left,
              width: piece.size,
              height: piece.size * 1.7,
              background: piece.id % 3 === 0 ? "#8B1A1A" : piece.id % 3 === 1 ? "#d7a33f" : "#f4dfaa",
              transform: `rotate(${piece.rotate})`,
              animation: `medal-confetti-fall ${piece.duration} linear ${piece.delay} infinite`,
              opacity: 0.68,
            }}
          />
        ))}

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute right-5 top-5 z-10 grid h-12 w-12 place-items-center rounded-full bg-canvas-white/72 text-graphite backdrop-blur active:scale-95 transition-transform"
        >
          <span className="relative h-6 w-6 before:absolute before:left-1/2 before:top-0 before:h-6 before:w-0.5 before:-translate-x-1/2 before:rotate-45 before:rounded-full before:bg-current after:absolute after:left-1/2 after:top-0 after:h-6 after:w-0.5 after:-translate-x-1/2 after:-rotate-45 after:rounded-full after:bg-current" />
        </button>

        <div className="relative flex h-full flex-col items-center overflow-hidden px-6 pb-[max(18px,env(safe-area-inset-bottom))] pt-[clamp(56px,8vh,84px)] text-center">
          <div className="mb-[clamp(16px,2.4vh,28px)] flex flex-col items-center" style={{ animation: imageReady ? "medal-reveal 520ms cubic-bezier(0.2, 0.85, 0.2, 1) both" : "none", opacity: imageReady ? undefined : 0 }}>
            <span className="mb-2 text-2xl font-black text-pinterest-red">✦</span>
            <h2 id="medal-celebration-title" className="text-[clamp(1.65rem,4.4vh,2rem)] font-medium leading-none text-graphite">{t("medal.celebration_title")}</h2>
            <p className="mt-2 text-[clamp(1rem,2.7vh,1.25rem)] font-medium text-ash-gray">{t("medal.celebration_subtitle")}</p>
          </div>

          <div
            className="relative mb-[clamp(14px,2.3vh,28px)]"
            style={{
              animation: imageReady ? "medal-reveal 620ms 80ms cubic-bezier(0.2, 0.85, 0.2, 1) both" : "none",
              filter: `drop-shadow(0 18px 18px rgba(33,25,34,0.2)) drop-shadow(0 0 28px ${tier.glow})`,
              opacity: imageReady ? undefined : 0,
            }}
          >
            <div
              className="relative overflow-hidden rounded-full bg-[#c98a2f] p-2"
              style={{
                height: "clamp(176px,27vh,250px)",
                width: "clamp(176px,27vh,250px)",
                WebkitMaskImage: "-webkit-radial-gradient(white, black)",
              }}
            >
              {medal.image_url ? (
                <img
                  src={medal.image_url}
                  alt={medal.name}
                  className="h-full w-full object-cover"
                  style={{ borderRadius: "50%", transform: "scale(1.18)", transformOrigin: "50% 43%" }}
                  onLoad={() => setImageReady(true)}
                />
              ) : (
                <div className="grid h-full w-full place-items-center rounded-full bg-[#ecd29a] text-7xl" ref={() => setImageReady(true)}>🏅</div>
              )}
            </div>
          </div>

          <div
            className="mb-[clamp(10px,1.7vh,20px)] inline-flex items-center gap-2 rounded-full bg-canvas-white/68 px-4 py-2 text-body font-bold backdrop-blur"
            style={{ color: tier.accent, animation: imageReady ? "medal-reveal 520ms 170ms cubic-bezier(0.2, 0.85, 0.2, 1) both" : "none", opacity: imageReady ? undefined : 0 }}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full" style={{ background: tier.soft }}>
              <span className="h-3 w-3 rounded-full" style={{ background: tier.accent }} />
            </span>
            {t(tier.labelKey)}
          </div>

          <h1
            className="max-w-[340px] text-[clamp(2rem,5.4vh,2.7rem)] font-black leading-[0.98] text-jet-black"
            style={{ animation: imageReady ? "medal-reveal 520ms 230ms cubic-bezier(0.2, 0.85, 0.2, 1) both" : "none", opacity: imageReady ? undefined : 0 }}
          >
            {medal.name}
          </h1>

          <div
            className="mt-[clamp(10px,1.7vh,16px)] h-1 w-14 rounded-full bg-pinterest-red"
            style={{ animation: "medal-reveal 520ms 280ms cubic-bezier(0.2, 0.85, 0.2, 1) both" }}
          />

          {earnedDate && (
            <p
              className="mt-[clamp(14px,2.3vh,24px)] flex items-center justify-center gap-2 text-[clamp(0.92rem,2vh,1rem)] font-medium text-ash-gray"
              style={{ animation: "medal-reveal 520ms 330ms cubic-bezier(0.2, 0.85, 0.2, 1) both" }}
            >
              <span className="relative h-5 w-5 rounded-[4px] border-2 border-current before:absolute before:left-1 before:right-1 before:top-[5px] before:h-0.5 before:bg-current after:absolute after:left-[4px] after:top-[-4px] after:h-2 after:w-0.5 after:bg-current" />
              {t("medal.earned_on", { date: earnedDate })}
            </p>
          )}

          {collection && (
            <article
              className="mt-[clamp(18px,3vh,32px)] w-full max-w-[370px] rounded-card border border-canvas-white/70 bg-canvas-white/66 p-4 text-left backdrop-blur"
              style={{ animation: "medal-reveal 520ms 400ms cubic-bezier(0.2, 0.85, 0.2, 1) both" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
                  style={{ background: tier.soft, color: tier.accent }}
                >
                  <span className="relative h-7 w-7 rounded-[7px] border-2 border-current before:absolute before:-top-2 before:left-1/2 before:h-3 before:w-3 before:-translate-x-1/2 before:rotate-45 before:border-l-2 before:border-t-2 before:border-current" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[clamp(1rem,2.4vh,1.25rem)] font-bold leading-tight text-graphite">{collection.collection_name}</h3>
                  <p className="mt-0.5 text-body text-ash-gray">{t("medal.collection_label")}</p>
                </div>
                <div className="text-right">
                  <p className="text-[clamp(1.75rem,3.7vh,2rem)] font-black leading-none text-pinterest-red">{collection.visited_monuments}</p>
                  <p className="text-body-lg font-medium leading-none text-graphite">/ {collection.total_monuments}</p>
                </div>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e9ded2]">
                <div className="h-full rounded-full bg-pinterest-red" style={{ width: `${progress}%` }} />
              </div>
            </article>
          )}

          {medals.length > 1 && (
            <p className="mt-3 text-body font-semibold text-ash-gray">{index + 1} / {medals.length}</p>
          )}

          <button
            onClick={advance}
            className="mt-auto flex min-h-14 w-full max-w-[370px] items-center justify-center gap-4 rounded-3xl bg-pinterest-red px-8 py-3.5 text-subheading font-black text-canvas-white active:scale-[0.98] transition-transform"
          >
            {hasNext ? t("medal.next") : t("medal.continue")}
            <span className="text-3xl leading-none">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}
