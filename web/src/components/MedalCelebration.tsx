import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EarnedMedal } from "../lib/supabase";

const TIER_DATA: Record<string, { emoji: string; color: string }> = {
  bronze:   { emoji: "🥉", color: "from-amber-400 to-amber-600"   },
  silver:   { emoji: "🥈", color: "from-slate-300 to-slate-500"   },
  gold:     { emoji: "🥇", color: "from-yellow-300 to-yellow-500" },
  platinum: { emoji: "💎", color: "from-sky-300 to-sky-500"      },
};

const PARTICLES = Array.from({ length: 18 }, (_, i) => i);

interface Props {
  medals: EarnedMedal[];
  onClose: () => void;
}

export function MedalCelebration({ medals, onClose }: Props) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // pequeño retraso para que la animación arranque suave
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [index]);

  if (!medals.length) return null;
  const medal = medals[index];
  const tier = TIER_DATA[medal.tier] ?? TIER_DATA.bronze;
  const hasNext = index < medals.length - 1;

  const advance = () => {
    setVisible(false);
    setTimeout(() => {
      if (hasNext) { setIndex(i => i + 1); }
      else { onClose(); }
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-jet-black/80 backdrop-blur-sm px-6">

      {/* Partículas flotantes */}
      {visible && PARTICLES.map((i) => (
        <span
          key={i}
          className="absolute text-xl pointer-events-none animate-bounce"
          style={{
            left: `${5 + (i * 5.5) % 90}%`,
            top: `${10 + (i * 7) % 60}%`,
            animationDelay: `${(i * 0.12) % 1}s`,
            animationDuration: `${0.8 + (i % 4) * 0.2}s`,
            opacity: 0.6,
          }}
        >
          {["⭐", "✨", "🌟", "💫"][i % 4]}
        </span>
      ))}

      {/* Tarjeta */}
      <div
        className={`relative w-full max-w-xs rounded-3xl bg-canvas-white shadow-2xl text-center overflow-hidden transition-all duration-300 ${
          visible ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
      >
        {/* Banda de color por tier */}
        <div className={`h-2 w-full bg-gradient-to-r ${tier.color}`} />

        <div className="px-6 py-8">
          {/* Emoji de medalla */}
          <div className="text-7xl mb-2 animate-bounce">{tier.emoji}</div>

          <p className="text-body-sm font-semibold text-ash-gray uppercase tracking-widest mb-1">
            {t("medal.new_medal")}
          </p>

          <h2 className="text-subheading font-bold text-jet-black mb-2 leading-tight">
            {medal.name}
          </h2>

          {medal.description && (
            <p className="text-body-sm text-ash-gray mb-4">{medal.description}</p>
          )}

          {/* Puntos */}
          <div className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${tier.color} text-canvas-white px-4 py-1.5 text-body font-bold mb-6`}>
            +{medal.points_reward} pts
          </div>

          {/* Indicador si hay más medallas */}
          {medals.length > 1 && (
            <p className="text-body-sm text-ash-gray mb-4">
              {index + 1} / {medals.length}
            </p>
          )}

          <button
            onClick={advance}
            className="w-full rounded-2xl bg-pinterest-red text-canvas-white py-3 text-body font-semibold active:scale-95 transition-transform"
          >
            {hasNext ? t("medal.next") : t("medal.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
