export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function toRoman(value: number): string {
  const numerals: Array<[number, string]> = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let result = "";
  let remaining = value;
  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }
  return result;
}

function ordinal(value: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const lastTwo = value % 100;
  return value + (suffixes[(lastTwo - 20) % 10] ?? suffixes[lastTwo] ?? suffixes[0]);
}

export function centuryLabel(year: number, locale: string): string {
  if (year <= 0) return "";
  const century = Math.ceil(year / 100);
  return locale.startsWith("es") ? `s. ${toRoman(century)}` : `${ordinal(century)} c.`;
}
