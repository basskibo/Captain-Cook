/** Preračunavanje količina sastojaka za drugi broj porcija ("200 g" × 1.5 → "300 g"). */

const UNICODE_FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
const NICE_FRACTIONS: [number, string][] = [
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
];

const NUMBER = /(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔])/g;

function parse(token: string): number {
  if (token in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[token];
  const mixed = token.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = token.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(token.replace(",", "."));
}

function format(value: number, unit: string): string {
  // Grami/mililitri: zaokruži na lepe brojeve
  if (/^\s*(g|gr|ml|dl)\b/i.test(unit) && value >= 20) {
    const step = value >= 200 ? 10 : 5;
    return String(Math.round(value / step) * step);
  }
  const whole = Math.floor(value);
  const rest = value - whole;
  if (rest < 0.08) return String(whole || 1);
  if (rest > 0.92) return String(whole + 1);
  const nice = NICE_FRACTIONS.find(([f]) => Math.abs(rest - f) < 0.06);
  if (nice) return whole ? `${whole} ${nice[1]}` : nice[1];
  return (Math.round(value * 10) / 10).toString().replace(".", ",");
}

export function scaleAmount(amount: string, factor: number): string {
  if (!amount || factor === 1) return amount;
  return amount.replace(NUMBER, (token, _m, offset: number) => {
    const value = parse(token);
    if (!Number.isFinite(value)) return token;
    const unit = amount.slice(offset + token.length);
    return format(value * factor, unit);
  });
}
