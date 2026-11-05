/**
 * Satu sumber kebenaran untuk skema pembayaran (DP dan termin) di sisi frontend.
 *
 * Aturan yang sama dipakai backend (App\Support\TerminPlan): susunan persen
 * diambil dari products.payment_stages, dan angka default hanya dipakai ketika
 * katalog belum punya susunan yang sah. Karena itu tidak ada lagi halaman yang
 * menuliskan default DP-nya sendiri (40% / 50% / 30% dulu tersebar).
 */

export const DEFAULT_DP_PCT = 25;
export const DEFAULT_LAST_STAGE_PCT = 25;

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const clampPercent = (value, max = 100) => Math.min(max, Math.max(0, toNumber(value)));

const percentOf = (stage) => toNumber(stage?.pct ?? stage?.percent);

export const stageLabelFor = (index, total) =>
  index === 0
    ? 'Termin 1 · DP'
    : index === total - 1
      ? `Termin ${index + 1} · Pelunasan`
      : `Termin ${index + 1} · Cicilan`;

const rowsOf = (...sources) => {
  const found = sources.find((rows) => Array.isArray(rows) && rows.length) || [];
  return found.filter(Boolean);
};

/**
 * Susunan termin dari katalog/order. null bila tidak layak pakai: jumlah baris
 * < 2 atau total persen != 100 (syarat yang sama dengan TerminPlan::decodeStages).
 */
export const stageRowsOf = (entity) => {
  if (!entity) return null;
  const raw = rowsOf(entity.paymentStages, entity.payment_stages, entity.stages, entity.stageDetails);
  const usable = raw.filter((stage) => percentOf(stage) > 0);
  if (usable.length < 2) return null;

  const sum = usable.reduce((total, stage) => total + percentOf(stage), 0);
  if (Math.abs(sum - 100) > 0.01) return null;

  return usable.map((stage, index) => ({
    label: stage.label || stage.stage || stage.type || stageLabelFor(index, usable.length),
    pct: percentOf(stage),
    date: stage.date || stage.due_at || ''
  }));
};

/**
 * Jadwal termin bawaan untuk produk yang belum punya payment_stages.
 * Aturannya sama dengan TerminPlan::forProduct: DP, lalu sisa setelah
 * termin terakhir (25%) dipakai sebagai cicilan. Bila sisanya nol,
 * jadwalnya cuma dua termin.
 */
export const defaultStagePcts = (count = 3, dpPct = DEFAULT_DP_PCT) => {
  const dp = clampPercent(toNumber(dpPct) || DEFAULT_DP_PCT, 90);
  if (Number(count) === 2 || 100 - dp - DEFAULT_LAST_STAGE_PCT <= 0) {
    return dp >= 100 ? [100] : [dp, 100 - dp];
  }
  const cicilan = 100 - dp - DEFAULT_LAST_STAGE_PCT;
  return [dp, cicilan, 100 - dp - cicilan];
};

/** Persen DP: jadwal katalog menang, lalu min_dp_percent/dpPct, baru default. */
export const dpPercentFor = (entity, fallbackPct = DEFAULT_DP_PCT) => {
  const rows = stageRowsOf(entity);
  if (rows) return rows[0].pct;
  const explicit = clampPercent(
    entity?.dpPct ?? entity?.minDpPercent ?? entity?.min_dp_percent ?? entity?.dp_percent ?? 0
  );
  return explicit > 0 ? explicit : clampPercent(toNumber(fallbackPct) || DEFAULT_DP_PCT);
};

/**
 * Jadwal termin lengkap untuk dipakai render/hitung. `seed` boleh berisi
 * { dpPct, terminCount, date } milik form yang sedang diisi.
 */
export const terminPlanFor = (entity, seed = {}) => {
  const rows = stageRowsOf(entity);
  if (rows) return rows;

  const dpPct = seed.dpPct ?? dpPercentFor(entity, seed.fallbackPct);
  const count = seed.terminCount ?? entity?.terminCount ?? entity?.termin_count;
  const baseDate = seed.date || entity?.closeDate || entity?.openDate || '';

  return defaultStagePcts(count, dpPct).map((pct, index, arr) => ({
    label: stageLabelFor(index, arr.length),
    pct,
    date: index === arr.length - 1 ? seed.lastDate || entity?.pelunasanDueDate || baseDate : baseDate
  }));
};

/** Nominal DP untuk satu basis tagihan (subtotal produk, bukan total+ongkir). */
export const dpNominalFor = (base, entity, seed = {}) =>
  Math.round(Math.max(0, toNumber(base)) * (dpPercentFor(entity, seed.fallbackPct) / 100));
