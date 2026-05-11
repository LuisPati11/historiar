import type { Locale } from "../lib/i18n";

interface Props {
  value: Locale;
  onChange: (locale: Locale) => void;
  disabled?: boolean;
  label: string;
}

const OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

export function LanguageSelect({ value, onChange, disabled = false, label }: Props) {
  return (
    <label className="block">
      <span className="block text-body-sm font-semibold text-graphite mb-2">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as Locale)}
        className="w-full rounded-2xl border border-[#DDD8D0] bg-canvas-white px-4 py-3 text-body font-medium text-graphite focus:outline-none focus:ring-2 focus:ring-pinterest-red/25 disabled:opacity-60"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
