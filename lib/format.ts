// Peso + number formatting, matching the deployed dashboard's Intl setup.

const PESO = "₱";
const COMPACT_THRESHOLD = 1_000_000;

const whole = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const cents = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("en-PH", {
  notation: "compact",
  compactDisplay: "short",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const plain = new Intl.NumberFormat("en-PH");

function sign(n: number): string {
  return n < 0 ? "-" : "";
}

/** `₱1,234,567` — the sign leads the symbol, as in the original. */
export function formatPeso(amount: number, { cents: withCents = false } = {}): string {
  const n = Number(amount) || 0;
  const rounded = withCents ? Math.round(n * 100) / 100 : Math.round(n);
  return sign(rounded) + PESO + (withCents ? cents : whole).format(Math.abs(rounded));
}

/** `₱1.2M` past a million, otherwise identical to `formatPeso`. */
export function formatPesoCompact(amount: number): string {
  const n = Number(amount) || 0;
  if (Math.abs(n) < COMPACT_THRESHOLD) return formatPeso(n);
  return sign(n) + PESO + compact.format(Math.abs(n));
}

export function formatNumber(value: number): string {
  return plain.format(Number(value) || 0);
}
