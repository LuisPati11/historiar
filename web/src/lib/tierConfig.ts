export const TIER_CONFIG: Record<string, { emoji: string; labelKey: string; colors: string }> = {
  bronze:  { emoji: "🥉", labelKey: "medal.tier.bronze",   colors: "bg-amber-100 text-amber-800"  },
  silver:  { emoji: "🥈", labelKey: "medal.tier.silver",    colors: "bg-slate-100 text-slate-700"  },
  gold:    { emoji: "🥇", labelKey: "medal.tier.gold",      colors: "bg-yellow-100 text-yellow-800" },
  diamond: { emoji: "💎", labelKey: "medal.tier.diamond", colors: "bg-sky-100 text-sky-800"       },
};
