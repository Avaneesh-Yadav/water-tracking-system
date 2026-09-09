export type TariffSlab = { upto: number | null; rate: number };

export const DEFAULT_SLABS: TariffSlab[] = [
  { upto: 10000, rate: 20 },
  { upto: null, rate: 30 },
];

export function parseSlabs(raw: string | null | undefined): TariffSlab[] {
  if (!raw) return DEFAULT_SLABS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_SLABS;
    return parsed.map((s) => ({
      upto: s.upto == null || s.upto === "" ? null : Number(s.upto),
      rate: Number(s.rate) || 0,
    }));
  } catch {
    return DEFAULT_SLABS;
  }
}

/** Indian-style increasing slabs. `upto` is inclusive liters in that band. Last slab with upto=null is the remainder. */
export function amountFromSlabs(liters: number, slabs: TariffSlab[], fallbackRate: number): { amount: number; effectiveRate: number } {
  const qty = Math.max(0, Number(liters) || 0);
  if (!slabs.length) {
    const amount = qty * fallbackRate;
    return { amount: round2(amount), effectiveRate: fallbackRate };
  }
  let remaining = qty;
  let prevCap = 0;
  let amount = 0;
  for (const slab of slabs) {
    if (remaining <= 0) break;
    const cap = slab.upto == null ? Infinity : Number(slab.upto);
    const band = Math.min(remaining, Math.max(0, cap - prevCap));
    amount += band * (Number(slab.rate) || 0);
    remaining -= band;
    prevCap = cap === Infinity ? prevCap + band : cap;
  }
  if (remaining > 0) amount += remaining * fallbackRate;
  const effectiveRate = qty > 0 ? amount / qty : fallbackRate;
  return { amount: round2(amount), effectiveRate: round2(effectiveRate) };
}

export function lateFeeFor(amount: number, type: string, value: number): number {
  const a = Math.max(0, Number(amount) || 0);
  const v = Math.max(0, Number(value) || 0);
  if (type === "percent") return round2(a * (v / 100));
  return round2(v);
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}
