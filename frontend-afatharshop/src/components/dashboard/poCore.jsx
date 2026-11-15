import React, {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import Footer from '../Footer';
import { DEFAULT_DP_PCT, stageRowsOf, defaultStagePcts, stageLabelFor } from '../../utils/terminScheme';
import {
  extractOrderShippingLabels,
  formatAllShippingLabelsText,
  formatShippingLabelText,
  openShippingLabelsPrintTab
} from '../../utils/printShippingLabel';

/* ============================================================================
   PO CORE — model status, helper, komponen UI, shell & data demo
   Dipakai bersama oleh PurchasingDashboard, FinanceDashboard, OwnerFinanceDashboard.
   Semua file dashboard diimpor dari folder yang sama.
   ========================================================================== */

/* ---------------------------------------------------------------- formatter */
export const uid = (prefix = 'id') =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
export const num = (n) => Number(n || 0);
export const pct = (n) => `${Math.round(Number(n || 0))}%`;

export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseISO = (iso) => {
  if (!iso) return new Date();
  if (iso instanceof Date) return iso;
  const s = String(iso).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return new Date(`${m[1]}T00:00:00`);
  return new Date();
};
export const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISO(d);
};
export const diffDays = (a, b) => Math.round((parseISO(a) - parseISO(b)) / 86400000);
export const todayISO = () => toISO(new Date());

export const fmtDate = (iso) =>
  iso ? parseISO(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtDateShort = (iso) =>
  iso ? parseISO(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—';
export const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = parseISO(iso);
  return `${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
};
export const nowStamp = () =>
  new Date().toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ---------------------------------------------------------- reminder close PO */
export const poClosingToday = (products, today = todayISO()) =>
  (products || [])
    .filter((p) => p && p.status === 'open' && p.closeDate && diffDays(p.closeDate, today) <= 0)
    .map((p) => ({ ...p, daysLeft: diffDays(p.closeDate, today) }))
    .sort((a, b) => String(a.closeDate).localeCompare(String(b.closeDate)));

export function PoClosingReminder({ products, onAction, actionLabel = 'Kelola Katalog', className = '' }) {
  const [dismissed, setDismissed] = useState(false);
  const due = useMemo(() => poClosingToday(products), [products]);
  if (dismissed || !due.length) return null;

  const todayCount = due.filter((p) => p.daysLeft === 0).length;
  const overdueCount = due.length - todayCount;
  const shown = due.slice(0, 4);
  const actions = (
    <>
      {onAction && (
        <Button size="xs" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1.5 rounded-md text-amber-600 hover:bg-amber-100"
        title="Tutup pengingat"
      >
        <Icon name="x" className="w-3.5 h-3.5" />
      </button>
    </>
  );

  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50/80 px-3 sm:px-4 py-3 ${className}`}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Icon name="alert" className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold text-amber-900">Reminder Tutup PO</p>
            {todayCount > 0 && <Badge tone="red">{todayCount} tutup hari ini</Badge>}
            {overdueCount > 0 && <Badge tone="amber">{overdueCount} lewat jadwal</Badge>}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {shown.map((p) => (
              <span
                key={p.id}
                className="flex sm:inline-flex w-full sm:w-auto min-w-0 items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-[10px] text-amber-900"
              >
                <span className="min-w-0 truncate font-semibold">{p.title}</span>
                <span className="shrink-0 text-amber-500">·</span>
                <span className="shrink-0">{p.daysLeft === 0 ? 'tutup hari ini' : `lewat ${Math.abs(p.daysLeft)} hari`}</span>
              </span>
            ))}
            {due.length > shown.length && (
              <span className="py-1 text-[10px] text-amber-700">+{due.length - shown.length} produk lain</span>
            )}
          </div>
          <p className="mt-1.5 text-[10px] text-amber-800/80">
            Pastikan pesanan masuk sudah di-ACC dan DP terverifikasi sebelum PO ditutup.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">{actions}</div>
      </div>
      <div className="mt-2 flex sm:hidden items-center justify-end gap-1.5">{actions}</div>
    </div>
  );
}

export const terminDueList = (products, today = todayISO(), windowDays = 21) => {
  const rows = [];
  (products || []).forEach((product) => {
    if (!product || product.status === 'closed') return;
    const fallbackPct = num(product.dpPct) || DEFAULT_DP_PCT;
    const plan =
      stageRowsOf(product) ||
      defaultStagePcts(product.terminCount, fallbackPct).map((pct, index, arr) => ({
        label: stageLabelFor(index, arr.length),
        pct,
        date: index === arr.length - 1 ? product.pelunasanDueDate : product.openDate || product.closeDate
      }));
    plan.forEach((stage) => {
      if (!stage?.date) return;
      const days = diffDays(stage.date, today);
      if (days < 0 || days > windowDays) return;
      rows.push({
        productId: product.id,
        title: product.title,
        label: stage.label || 'Termin',
        pct: num(stage.pct ?? stage.percent),
        date: stage.date,
        days
      });
    });
  });
  return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
};

export function TerminDueReminder({
  products,
  windowDays = 21,
  onAction,
  actionLabel = 'Kelola Katalog',
  className = ''
}) {
  const [dismissed, setDismissed] = useState(false);
  const due = useMemo(() => terminDueList(products, todayISO(), windowDays), [products, windowDays]);
  if (dismissed || !due.length) return null;

  const todayCount = due.filter((row) => row.days === 0).length;
  const shown = due.slice(0, 4);
  const actions = (
    <>
      {onAction && (
        <Button size="xs" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="p-1.5 rounded-md text-sky-600 hover:bg-sky-100"
        title="Tutup pengingat"
      >
        <Icon name="x" className="w-3.5 h-3.5" />
      </button>
    </>
  );

  return (
    <div className={`rounded-xl border border-sky-200 bg-sky-50/80 px-3 sm:px-4 py-3 ${className}`}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
          <Icon name="alert" className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold text-sky-900">Reminder Termin Pembayaran</p>
            {todayCount > 0 && <Badge tone="red">{todayCount} jatuh tempo hari ini</Badge>}
            <Badge tone="blue">{due.length} termin dalam {windowDays} hari</Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {shown.map((row, index) => (
              <span
                key={`${row.productId}-${row.label}-${index}`}
                className="flex sm:inline-flex w-full sm:w-auto min-w-0 items-center gap-1 rounded-md border border-sky-200 bg-white px-2 py-1 text-[10px] text-sky-900"
              >
                <span className="min-w-0 truncate font-semibold">{row.title}</span>
                <span className="shrink-0 text-sky-400">·</span>
                <span className="shrink-0">{row.label}</span>
                <span className="hidden sm:inline text-sky-400">·</span>
                <span className="shrink-0">{row.days === 0 ? 'hari ini' : `H-${row.days}`}</span>
              </span>
            ))}
            {due.length > shown.length && (
              <span className="py-1 text-[10px] text-sky-700">+{due.length - shown.length} termin lain</span>
            )}
          </div>
          <p className="mt-1.5 text-[10px] text-sky-800/80">
            Ingatkan mitra & finance untuk menyiapkan pembayaran sesuai jadwal termin produk PO.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">{actions}</div>
      </div>
      <div className="mt-2 flex sm:hidden items-center justify-end gap-1.5">{actions}</div>
    </div>
  );
}

export const normPhone = (p) => {
  let s = String(p || '').replace(/\D/g, '');
  if (s.startsWith('0')) s = '62' + s.slice(1);
  else if (s.startsWith('8')) s = '62' + s;
  return s;
};

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const escapeHtml = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const copyText = async (text) => {
  const str = String(text ?? '');
  if (!str) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(str);
      return true;
    } catch {
      // Lanjut ke fallback textarea + execCommand di bawah
    }
  }

  if (typeof document !== 'undefined') {
    let textarea = null;
    try {
      const prevActive = document.activeElement;
      textarea = document.createElement('textarea');
      textarea.value = str;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '-9999px';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.opacity = '0';
      textarea.style.fontSize = '16px';
      document.body.appendChild(textarea);
      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, str.length);
      const copied = document.execCommand('copy');
      if (prevActive && typeof prevActive.focus === 'function') {
        try {
          prevActive.focus({ preventScroll: true });
        } catch {
          // ignore
        }
      }
      if (copied) return true;
    } catch {
      // ignore fallback error
    } finally {
      if (textarea && textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
    }
  }

  return false;
};

export const waLink = (phone, text) =>
  `https://wa.me/${normPhone(phone)}?text=${encodeURIComponent(text)}`;

/* ------------------------------------------------------------------ status */
export const PAY = {
  BELUM: 'Belum',
  MENUNGGU: 'Menunggu Verifikasi',
  ACC: 'ACC',
  TOLAK: 'Ditolak'
};

export const MKT = {
  PENDING: 'Menunggu ACC',
  ACC: 'ACC',
  TOLAK: 'Ditolak'
};

export const PROD = {
  QUEUE: 'Antrian',
  RUN: 'Produksi',
  READY: 'Ready'
};

export const SHIP = {
  BELUM: 'Belum',
  SIAP: 'Siap Kirim',
  DIKIRIM: 'Dikirim',
  DITERIMA: 'Diterima'
};

export const PREQ = {
  REVIEW_MKT: 'Menunggu Review Purchasing',
  APPROVAL_OWNER: 'Menunggu Approval Owner',
  APPROVED: 'Disetujui Owner',
  TRANSFERRED: 'Ditransfer',
  REJECTED: 'Ditolak',
  CANCELED: 'Dibatalkan'
};

export const isPaid = (s) => s === PAY.ACC;
export const payTone = (s) =>
  s === PAY.ACC ? 'emerald' : s === PAY.MENUNGGU ? 'blue' : s === PAY.TOLAK ? 'red' : 'gray';
export const mktTone = (s) =>
  s === MKT.ACC ? 'emerald' : s === MKT.PENDING ? 'amber' : s === MKT.TOLAK ? 'red' : 'gray';
export const preqTone = (s) =>
  s === PREQ.TRANSFERRED
    ? 'emerald'
    : s === PREQ.APPROVED
    ? 'teal'
    : s === PREQ.APPROVAL_OWNER
    ? 'violet'
    : s === PREQ.REVIEW_MKT
    ? 'amber'
    : s === PREQ.REJECTED
    ? 'red'
    : 'gray';

/* ------------------------------------------------------------------- stages */
export const STAGES = [
  { id: 'baru', label: 'Pesanan Baru', tone: 'amber' },
  { id: 'dp', label: 'Pembayaran DP', tone: 'blue' },
  { id: 'produksi', label: 'Produksi', tone: 'violet' },
  { id: 'alamat', label: 'Input Alamat', tone: 'cyan' },
  { id: 'ongkir', label: 'Input Ongkir', tone: 'orange' },
  { id: 'pelunasan', label: 'Pelunasan', tone: 'indigo' },
  { id: 'ongkir_bayar', label: 'Bayar Ongkir', tone: 'orange' },
  { id: 'kirim', label: 'Siap Kirim', tone: 'teal' },
  { id: 'dikirim', label: 'Dikirim', tone: 'blue' },
  { id: 'selesai', label: 'Selesai', tone: 'emerald' },
  { id: 'ditolak', label: 'Ditolak', tone: 'red' }
];

export const stageMeta = (id) => STAGES.find((s) => s.id === id) || STAGES[0];
export const activeStages = STAGES.filter((s) => s.id !== 'ditolak');

export const hasAddress = (o) => {
  if (!o) return false;
  if (typeof o.address === 'string') return o.address.trim().length > 0;
  return !!(o.address && (o.address.street || o.address.city || o.address.recipient));
};
export const addressText = (o) => {
  if (!hasAddress(o)) return '';
  if (typeof o.address === 'string') return o.address;
  const a = o.address;
  return [a.recipient, a.phone, a.street, a.kelurahan, a.kecamatan, a.city, a.province, a.postalCode, a.note]
    .filter(Boolean)
    .join(', ');
};

export const splitAddressGroups = (o) => {
  const map = new Map();
  (o?._projectMeta?.items || []).forEach((item) => {
    (item.splits || []).forEach((sp) => {
      const key = String(sp.address?.id ?? sp.address?.recipient ?? sp.id);
      if (!map.has(key)) map.set(key, { address: sp.address, courier: sp.courier || null, rows: [] });
      const group = map.get(key);
      group.rows.push({ item, split: sp });
      if (sp.courier) group.courier = sp.courier;
    });
  });
  return [...map.values()];
};

export const effectiveProd = (o) => {
  if (o?.productionStatus === PROD.READY || o?.readyAt) return PROD.READY;
  if (o?.productionStatus === PROD.RUN || o?.status === 'Produksi' || o?.status === 'Dalam Produksi') return PROD.RUN;
  if (o?.productionStatus === PROD.QUEUE) return PROD.QUEUE;
  return o?.productionStatus || PROD.QUEUE;
};

export const hasConfirmedAddress = (o) => {
  if (!o) return false;
  if (o.addressConfirmed || o.addressSubmitted) return true;
  if (num(o.ongkir) > 0 && hasAddress(o)) return true;
  return false;
};
/**
 * Patch inti pesanan dashboard -> kolom yang diterima endpoint
 * PATCH /management/orders/{id}. Kolom lain hanya untuk tampilan dan tidak dikirim.
 */
export const orderPatchToServer = (patch = {}) => {
  const body = {};
  const put = (key, value) => {
    if (value !== undefined && value !== null && value !== '') body[key] = value;
  };

  put('status', patch.status);
  put('marketing_status', patch.marketingStatus);
  put('marketing_by', patch.marketingBy);
  put('marketing_at', patch.marketingAt);
  if (patch.marketingNote !== undefined) body.marketing_note = patch.marketingNote ?? '';
  put('production_status', patch.productionStatus);
  put('ready_at', patch.readyAt);
  put('courier_name', patch.ekspedisi ?? patch.courier_name);
  put('tracking_number', patch.resi ?? patch.tracking_number);
  put('shipping_cost', patch.ongkir);
  put('weight_kg', patch.weight !== undefined && patch.weight !== '' ? parseFloat(String(patch.weight).replace(/[^\d.]/g, '')) || 0 : undefined);
  if (patch.shippingNote !== undefined) body.shipping_note = patch.shippingNote ?? '';
  put('ongkir_at', patch.ongkirAt);
  put('shipped_at', patch.shippedAt);
  put('received_at', patch.receivedAt);
  if (patch.notes !== undefined) body.notes = patch.notes ?? '';
  put('dpStatus', patch.dpStatus);
  put('pelunasanStatus', patch.pelunasanStatus);
  put('ongkirStatus', patch.ongkirStatus);
  put('addressConfirmed', patch.addressConfirmed);
  put('addressSubmitted', patch.addressSubmitted);
  put('note', patch.note || patch.rejectionNote || patch.dpNote || patch.pelunasanNote || patch.marketingNote);

  return body;
};

/**
 * Patch rincian tagihan -> body endpoint PATCH /management/orders/{id}/invoice.
 * Hanya dikirim bahan perhitungannya (produk, diskon, addon, DP); subtotal,
 * termin, dan sisa dihitung ulang oleh server supaya angkanya satu sumber.
 * Mengembalikan null bila patch bukan edit invoice.
 */
export const invoicePatchToServer = (patch = {}) => {
  const rows = Array.isArray(patch.invoiceItems) ? patch.invoiceItems : null;
  if (!rows || !rows.length) return null;

  const dbNumber = (value) => {
    const text = String(value ?? '').trim();
    return /^[1-9]\d*$/.test(text) ? Number(text) : undefined;
  };

  const body = {
    items: rows.map((row) => ({
      id: dbNumber(row.id),
      product_variant_id: dbNumber(row.variantId),
      quantity: Math.max(1, num(row.qty)),
      unit_price: num(row.price),
      discount_pct: Math.min(100, Math.max(0, num(row.discountPct))),
      addon: Math.max(0, num(row.addon))
    }))
  };

  const dpPct = Math.min(100, Math.max(1, num(patch.dpPct)));
  if (dpPct > 0) body.dp_pct = dpPct;
  if (patch.ongkir !== undefined && patch.ongkir !== null && patch.ongkir !== '') {
    body.shipping_cost = Math.max(0, num(patch.ongkir));
  }
  if (patch.notes !== undefined) body.notes = String(patch.notes ?? '');

  return body;
};

export const orderStage = (o) => {
  if (!o) return 'baru';
  if (o.marketingStatus === MKT.TOLAK) return 'ditolak';
  if (o.marketingStatus && o.marketingStatus !== MKT.ACC) return 'baru';
  if (!isPaid(o.dpStatus)) return 'dp';
  if (effectiveProd(o) !== PROD.READY) return 'produksi';
  if (!hasConfirmedAddress(o)) return 'alamat';
  if (!num(o.ongkir)) return 'ongkir';
  if (!isPaid(o.pelunasanStatus) || !isPaid(o.ongkirStatus)) return 'pelunasan';
  if (!o.resi) return 'kirim';
  if (o.shipStatus !== SHIP.DITERIMA) return 'dikirim';
  return 'selesai';
};

export const orderValue = (o) => num(o?.subtotal);
export const orderPaid = (o) =>
  (isPaid(o?.dpStatus) ? num(o?.dpNominal) : 0) +
  (isPaid(o?.pelunasanStatus) ? num(o?.pelunasanNominal) : 0) +
  (isPaid(o?.ongkirStatus) ? num(o?.ongkir) : 0);
export const orderOutstanding = (o) =>
  Math.max(0, orderValue(o) + num(o?.ongkir) - orderPaid(o));

export const nextAction = (o) => {
  const st = orderStage(o);
  if (st === 'baru') return { who: 'Purchasing', label: 'ACC pesanan masuk', tone: 'amber' };
  if (st === 'ditolak') return { who: 'Purchasing', label: 'Pesanan ditolak', tone: 'red' };
  if (st === 'dp')
    return o.dpStatus === PAY.MENUNGGU
      ? { who: 'Finance', label: 'Verifikasi bukti DP', tone: 'blue' }
      : { who: 'Mitra', label: 'Bayar DP', tone: 'blue' };
  if (st === 'produksi') return { who: 'Purchasing', label: 'Update produksi → Set Ready', tone: 'violet' };
  if (st === 'alamat') return { who: 'Mitra', label: 'Lengkapi & konfirmasi alamat', tone: 'cyan' };
  if (st === 'ongkir') return { who: 'Finance', label: 'Input ongkir & ekspedisi', tone: 'orange' };
  if (st === 'pelunasan')
    return o.pelunasanStatus === PAY.MENUNGGU
      ? { who: 'Finance', label: 'Verifikasi bukti pelunasan + ongkir', tone: 'indigo' }
      : { who: 'Mitra', label: 'Bayar sisa pelunasan + ongkir', tone: 'indigo' };
  if (st === 'ongkir_bayar')
    return o.ongkirStatus === PAY.MENUNGGU
      ? { who: 'Finance', label: 'Verifikasi bukti ongkir', tone: 'orange' }
      : { who: 'Mitra', label: 'Bayar ongkir', tone: 'orange' };
  if (st === 'kirim') return { who: 'Finance', label: 'Input resi & kirim', tone: 'teal' };
  if (st === 'dikirim') return { who: 'Mitra', label: 'Konfirmasi pesanan diterima', tone: 'blue' };
  return { who: '—', label: 'Pesanan selesai', tone: 'emerald' };
};

export const orderTimeline = (o) => {
  const st = orderStage(o);
  const idx = STAGES.findIndex((s) => s.id === st);
  const reached = (id) => idx >= STAGES.findIndex((s) => s.id === id);
  const done = (cond, id) => (cond ? 'done' : reached(id) ? 'active' : 'pending');

  return [
    { key: 'checkout', label: 'Checkout', at: o.date, state: 'done', note: `Oleh ${o.mitraName}` },
    {
      key: 'mkt',
      label: 'ACC Purchasing',
      at: o.marketingAt,
      state:
        o.marketingStatus === MKT.TOLAK
          ? 'reject'
          : !o.marketingStatus || o.marketingStatus === MKT.ACC
          ? 'done'
          : 'active',
      note: o.marketingNote || o.marketingBy
    },
    {
      key: 'dp',
      label: 'DP',
      at: o.dpVerifiedAt,
      state:
        o.dpStatus === PAY.TOLAK
          ? 'reject'
          : isPaid(o.dpStatus)
          ? 'done'
          : reached('dp')
          ? 'active'
          : 'pending',
      note: `${rp(o.dpNominal)} · ${o.dpStatus}`
    },
    {
      key: 'produksi',
      label: 'Produksi',
      at: o.readyAt,
      state: effectiveProd(o) === PROD.READY ? 'done' : reached('produksi') ? 'active' : 'pending',
      note: effectiveProd(o)
    },
    {
      key: 'ready',
      label: 'Ready',
      at: o.readyAt,
      state: o.readyAt ? 'done' : reached('alamat') ? 'done' : reached('produksi') ? 'active' : 'pending',
      note: o.readyAt ? 'Mitra dinotifikasi' : ''
    },
    {
      key: 'alamat',
      label: 'Alamat',
      at: o.readyAt,
      state: hasAddress(o) ? 'done' : reached('alamat') ? 'active' : 'pending',
      note: hasAddress(o) ? o.address.city : 'Belum diisi mitra'
    },
    {
      key: 'ongkir',
      label: 'Ongkir',
      at: o.ongkirAt,
      state: num(o.ongkir) ? 'done' : reached('ongkir') ? 'active' : 'pending',
      note: num(o.ongkir) ? `${o.ekspedisi || 'Ekspedisi'} · ${rp(o.ongkir)}` : ''
    },
    {
      key: 'pelunasan',
      label: 'Pelunasan',
      at: o.pelunasanVerifiedAt,
      state:
        o.pelunasanStatus === PAY.TOLAK
          ? 'reject'
          : isPaid(o.pelunasanStatus)
          ? 'done'
          : reached('pelunasan')
          ? 'active'
          : 'pending',
      note: `${rp(o.pelunasanNominal)} · ${o.pelunasanStatus}`
    },
    {
      key: 'ongkir_bayar',
      label: 'Ongkir Dibayar',
      at: o.ongkirVerifiedAt,
      state:
        o.ongkirStatus === PAY.TOLAK
          ? 'reject'
          : isPaid(o.ongkirStatus)
          ? 'done'
          : reached('ongkir_bayar')
          ? 'active'
          : 'pending',
      note: `${rp(o.ongkir)} · ${o.ongkirStatus}`
    },
    {
      key: 'kirim',
      label: 'Pengiriman',
      at: o.shippedAt,
      state: o.resi ? 'done' : reached('kirim') ? 'active' : 'pending',
      note: o.resi ? `${o.ekspedisi || 'Ekspedisi'} · ${o.resi}` : ''
    },
    {
      key: 'selesai',
      label: 'Selesai',
      at: o.receivedAt,
      state: o.shipStatus === SHIP.DITERIMA ? 'done' : reached('dikirim') ? 'active' : 'pending',
      note: o.shipStatus === SHIP.DITERIMA ? 'Diterima mitra' : ''
    }
  ];
};

/* ------------------------------------------------------------------ utility */
export const downloadCSV = (filename, rows) => {
  /* Excel locale Indonesia memakai ';' sebagai pemisah daftar; direktif sep=;
     membuat kolom langsung terpisah tanpa perlu Text Import Wizard. */
  const cell = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Number.isInteger(value)
        ? String(value)
        : String(Math.round(value * 100) / 100).replace('.', ',');
    }
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const text = String(value);
    return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const blob = new Blob(
    ['\ufeffsep=;\r\n' + rows.map((row) => row.map(cell).join(';')).join('\r\n')],
    { type: 'text/csv;charset=utf-8;' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const BRAND_FEE_FIELDS = [
  ['discountDBAll', 'DB All'],
  ['discountSubDB', 'Sub DB'],
  ['discountAgen', 'Agen'],
  ['discountReseller', 'Reseller']
];

const brandFeeKey = (level) => {
  const map = {
    'DB All': 'discountDBAll',
    'Sub DB': 'discountSubDB',
    Agen: 'discountAgen',
    Reseller: 'discountReseller'
  };
  return map[level] || null;
};

export const feeTypeFor = (brand) => (brand?.feeType === 'nominal' ? 'nominal' : 'pct');

export const brandFeeValue = (brand, level) => {
  const key = brandFeeKey(level);
  return key ? num(brand?.[key]) : 0;
};

export const feeNominalFor = (brand, level, price) => {
  if (!level || level === 'Guest' || level === 'Retail') return 0;
  const value = brandFeeValue(brand, level);
  if (!value) return 0;
  const perUnit = feeTypeFor(brand) === 'nominal' ? value : Math.round((num(price) * value) / 100);
  return Math.max(0, Math.min(num(price), Math.round(perUnit)));
};

export const brandDiscountTypeFor = (brand) => (brand?.discountType === 'nominal' ? 'nominal' : 'pct');

export const brandDiscountValueFor = (brand) =>
  num(brand?.discountValue ?? brand?.discountDBAll);

export const brandDiscountNominalFor = (brand, price) => {
  const value = brandDiscountValueFor(brand);
  if (!value) return 0;
  const perUnit =
    brandDiscountTypeFor(brand) === 'nominal' ? value : Math.round((num(price) * value) / 100);
  return Math.max(0, Math.min(num(price), Math.round(perUnit)));
};

export const discountPctFor = (brand, level) => {
  if (!brand) return 0;
  return num(brand[brandFeeKey(level)]);
};

export const calcOrderAmount = ({
  price,
  qty,
  discountPct = 0,
  feeNominal = null,
  brandDiscountNominal = 0,
  dpPct = DEFAULT_DP_PCT
}) => {
  const gross = num(price) * num(qty);
  const feePerUnit =
    feeNominal != null ? num(feeNominal) : Math.round((num(price) * num(discountPct)) / 100);
  const discountNominal = Math.max(0, Math.min(gross, Math.round(feePerUnit * num(qty))));
  const subtotal = gross - discountNominal;
  const dpNominal = Math.round((subtotal * num(dpPct)) / 100);
  const brandDiscountTotal = Math.max(
    0,
    Math.min(gross, Math.round(num(brandDiscountNominal) * num(qty)))
  );
  return {
    gross,
    discountNominal,
    feeMitraNominal: discountNominal,
    brandDiscountNominal: brandDiscountTotal,
    feeCompanyNominal: brandDiscountTotal - discountNominal,
    subtotal,
    dpNominal,
    pelunasanNominal: subtotal - dpNominal
  };
};

export const groupBy = (list, fn) => {
  const map = {};
  (list || []).forEach((item) => {
    const key = fn(item);
    map[key] = [...(map[key] || []), item];
  });
  return Object.entries(map).map(([key, items]) => ({ key, items }));
};

export const sumBy = (list, fn) => (list || []).reduce((s, x) => s + num(fn(x)), 0);

export const variantPricing = (product, variant) => {
  const base = Number(product?.price || 0);
  const addon = Number(variant?.addon || 0);
  const price = addon > 0 ? base + addon : Number(variant?.price || base);
  return { price, addon };
};

export const variantLabel = (v) => [v?.color, v?.model, v?.size].filter(Boolean).join('/');

/* -------------------------------------------------------- WhatsApp messages */
export const buildWA = (kind, order, ctx = {}) => {
  const shop = ctx.shopName || 'Afatharshop';
  const sender = ctx.senderName || 'Admin Afatharshop';
  const banks = (ctx.banks || []).filter((b) => b.active && (b.type || 'public') === 'public');
  const bankLines = banks.length
    ? banks.map((b) => `• ${b.bank} ${b.accountNo} a.n ${b.holder}`).join('\n')
    : '• (rekening belum diatur)';
  const footer = `\n\nTransfer hanya ke rekening resmi:\n${bankLines}\n\nTerima kasih 🙏\n${sender}`;

  const head = `Assalamu'alaikum Kak ${order?.mitraName || 'Mitra'} (${order?.level || 'Mitra'}),`;

  if (kind === 'dp') {
    return (
      `${head}\n\nPesanan Anda di *${shop}* sudah kami ACC dan masuk antrean.\n\n` +
      `🧾 Invoice: *${order.invoice}*\n📦 ${order.produk} — ${order.variant} (${order.qty} pcs)\n` +
      `🧮 Nilai pesanan: ${rp(order.subtotal)}\n💰 DP yang harus dibayar: *${rp(order.dpNominal)}*\n\n` +
      `Mohon transfer DP lalu unggah bukti di dashboard mitra.` +
      footer
    );
  }
  if (kind === 'ready') {
    return (
      `${head}\n\nKabar baik! Pesanan *${order.invoice}* (${order.produk} ${order.variant}) sudah *READY*.\n\n` +
      `Langkah berikutnya:\n1. Lengkapi alamat pengiriman di dashboard mitra\n2. Kami hitung ongkir & kirim tagihannya\n\n` +
      `Mohon segera diisi agar pesanan dapat kami jadwalkan kirim.` +
      footer
    );
  }
  if (kind === 'ongkir') {
    return (
      `${head}\n\nOngkir pesanan *${order.invoice}* sudah dihitung:\n\n` +
      `🚚 Ekspedisi: ${order.ekspedisi || '-'}\n📦 Berat/koli: ${order.weight ? `${order.weight} kg` : '-'}\n` +
      `💰 Ongkir: *${rp(order.ongkir)}*\n${order.shippingNote ? `📝 ${order.shippingNote}\n` : ''}\n` +
      `Sisa pelunasan: *${rp(order.pelunasanNominal)}* (${order.pelunasanStatus})\n\n` +
      `Silakan selesaikan pembayaran pelunasan & ongkir di dashboard mitra.` +
      footer
    );
  }
  if (kind === 'pelunasan') {
    return (
      `${head}\n\nTagihan pelunasan pesanan *${order.invoice}*:\n\n` +
      `📦 ${order.produk} — ${order.variant} (${order.qty} pcs)\n💰 Pelunasan: *${rp(order.pelunasanNominal)}*\n` +
      `🚚 Ongkir: ${rp(order.ongkir)} (${order.ongkirStatus})\n\n` +
      `Mohon selesaikan pembayaran agar pesanan dapat segera dikirim.` +
      footer
    );
  }
  if (kind === 'shipped') {
    return (
      `${head}\n\nPesanan *${order.invoice}* sudah kami kirimkan 🚚\n\n` +
      `🚚 Ekspedisi: ${order.ekspedisi || '-'}\n🔖 No. Resi: *${order.resi || '-'}*\n📅 Tanggal kirim: ${fmtDate(order.shippedAt)}\n\n` +
      `Silakan pantau resi dan konfirmasi "Diterima" di dashboard mitra setelah barang sampai.` +
      footer
    );
  }
  if (kind === 'diterima') {
    return (
      `${head}\n\nTerima kasih, pesanan *${order.invoice}* sudah dikonfirmasi diterima.\n\n` +
      `Semoga produknya bermanfaat. Sampai jumpa di PO berikutnya 💚\n${sender}`
    );
  }
  if (kind === 'ditolak') {
    return (
      `${head}\n\nMohon maaf, pesanan *${order.invoice}* belum dapat kami proses.\n\n` +
      `Alasan: ${order.marketingNote || order.cancelReason || '-'}\n\n` +
      `Silakan hubungi admin purchasing bila ingin melakukan revisi pesanan.\n${sender}`
    );
  }
  return (
    `${head}\n\nRingkasan tagihan pesanan *${order.invoice}*:\n\n` +
    `📦 ${order.produk} — ${order.variant} (${order.qty} pcs)\n` +
    `💰 Nilai: ${rp(order.subtotal)}\n` +
    `• DP: ${rp(order.dpNominal)} (${order.dpStatus})\n` +
    `• Pelunasan: ${rp(order.pelunasanNominal)} (${order.pelunasanStatus})\n` +
    `• Ongkir: ${rp(order.ongkir)} (${order.ongkirStatus})\n\n` +
    `Total sisa tagihan: *${rp(orderOutstanding(order))}*` +
    footer
  );
};

/* ------------------------------------------------------------ demo seed data */
const proofSvg = (title, amount) =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="840" viewBox="0 0 640 840">
      <rect width="640" height="840" fill="#eef2f7"/>
      <rect x="28" y="28" width="584" height="784" rx="18" fill="#ffffff" stroke="#dbe3ec"/>
      <rect x="28" y="28" width="584" height="96" rx="18" fill="#0f6b4f"/>
      <text x="56" y="86" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#ffffff">BUKTI TRANSFER</text>
      <text x="56" y="112" font-family="Arial, sans-serif" font-size="14" fill="#c7ead9">${escapeHtml(title)}</text>
      <text x="56" y="190" font-family="Arial, sans-serif" font-size="14" fill="#64748b">Nominal</text>
      <text x="56" y="232" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#0f172a">${escapeHtml(amount)}</text>
      <line x1="56" y1="268" x2="584" y2="268" stroke="#e2e8f0" stroke-dasharray="6 6"/>
      <text x="56" y="312" font-family="Arial, sans-serif" font-size="14" fill="#64748b">Bank Pengirim</text>
      <text x="56" y="340" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#0f172a">BCA</text>
      <text x="56" y="392" font-family="Arial, sans-serif" font-size="14" fill="#64748b">Bank Tujuan</text>
      <text x="56" y="420" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#0f172a">BCA 1234567890</text>
      <text x="56" y="472" font-family="Arial, sans-serif" font-size="14" fill="#64748b">Atas Nama</text>
      <text x="56" y="500" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#0f172a">PT Afathar Makmur</text>
      <text x="56" y="552" font-family="Arial, sans-serif" font-size="14" fill="#64748b">Waktu</text>
      <text x="56" y="580" font-family="Arial, sans-serif" font-size="17" font-weight="bold" fill="#0f172a">${escapeHtml(nowStamp())}</text>
      <rect x="56" y="640" width="528" height="96" rx="12" fill="#f1f5f9"/>
      <text x="80" y="682" font-family="Arial, sans-serif" font-size="13" fill="#64748b">Status</text>
      <text x="80" y="712" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0f6b4f">TRANSFER BERHASIL</text>
      <text x="320" y="790" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Dokumen demo · bukan transaksi sebenarnya</text>
    </svg>`
  );

export const SAMPLE_PROOF = proofSvg('DP Pesanan PO', 'Rp341.250');
export const SAMPLE_PROOF_2 = proofSvg('Pelunasan + Ongkir', 'Rp774.000');

export const createSeedData = () => {
  const today = todayISO();

  const mitra = [];
  const team = [];
  const suppliers = [];
  const brands = [];
  const products = [];

  const orders = [];
  const deletedOrders = [];
  const deposits = [];

  const bankAccounts = [
    // Rekening Publik (Resmi Distributor untuk Mitra / Checkout / Deposit / Invoice)
    { id: 'bk-1', bank: 'BCA', accountNo: '739-082-9988', holder: 'CV AFATHARSHOP DISTRIBUTOR', active: true, type: 'public', purpose: 'Penerimaan Pembayaran Mitra' },
    { id: 'bk-2', bank: 'Mandiri', accountNo: '133-00-2998801', holder: 'CV AFATHARSHOP DISTRIBUTOR', active: true, type: 'public', purpose: 'Penerimaan Pembayaran Mitra' },
    { id: 'bk-3', bank: 'BRI', accountNo: '0120-01-002998-50-2', holder: 'CV AFATHARSHOP DISTRIBUTOR', active: true, type: 'public', purpose: 'Penerimaan Pembayaran Mitra' },
    { id: 'bk-4', bank: 'BSI', accountNo: '718-002-9988', holder: 'CV AFATHARSHOP DISTRIBUTOR', active: true, type: 'public', purpose: 'Penerimaan Pembayaran Mitra' },

    // Rekening Pengajuan ke Owner (Tujuan Transfer Vendor / Supplier / Produksi / Operasional)
    { id: 'pr-1', bank: 'BCA', accountNo: '522-034-1100', holder: 'PT HANA TEXTILE NUSANTARA', active: true, type: 'pengajuan', purpose: 'Supplier Kain & Bahan Baku' },
    { id: 'pr-2', bank: 'Mandiri', accountNo: '131-00-9821733', holder: 'CV INDAH BORDIR KREASI', active: true, type: 'pengajuan', purpose: 'Vendor Jahit & Bordir Pabrik' },
    { id: 'pr-3', bank: 'BCA', accountNo: '883-019-4421', holder: 'PT LOGISTIK PRIMA CARGO', active: true, type: 'pengajuan', purpose: 'Ekspedisi Kargo Produksi' }
  ];

  const couriers = [
    { id: 'c-1', name: 'JNE Trucking (JTR)', code: 'JTR', active: true, note: 'Koli besar & volume tinggi', createdAt: daysAgo(300) },
    { id: 'c-2', name: 'J&T Cargo', code: 'JTC', active: true, note: 'Retail & koli menengah', createdAt: daysAgo(280) },
    { id: 'c-3', name: 'Dakota Cargo', code: 'DKT', active: true, note: 'Antar pulau, minimal 5 kg', createdAt: daysAgo(200) },
    { id: 'c-4', name: 'SiCepat REG', code: 'SCP', active: true, note: 'Paket kecil < 5 kg', createdAt: daysAgo(90) },
    { id: 'c-5', name: 'AnterAja', code: 'ANT', active: false, note: 'Sementara tidak dipakai', createdAt: daysAgo(120) }
  ];

  const categories = [
    'Sarimbit Keluarga',
    'Gamis & Abaya',
    "Khimar & Bergo Syar'i",
    'Scarf & Voal Premium',
    'Oneset & Kids',
    'Prayer Set & Mukena',
    'Tas Kulit & Aksesoris'
  ];

  const ledger = [];
  const paymentRequests = [];

  const settings = {
    shopName: 'Afatharshop',
    senderName: 'Owner Afatharshop',
    dpPct: DEFAULT_DP_PCT,
    pelunasanDueDays: 7,
    ongkirDueDays: 3,
    waFooter: 'Transfer hanya ke rekening resmi Afatharshop.',
    instagram: '@afatharshop'
  };

  const auditLog = [];

  return {
    mitra,
    team,
    suppliers,
    brands,
    products,
    orders,
    deletedOrders,
    deposits,
    bankAccounts,
    couriers,
    categories,
    ledger,
    paymentRequests,
    settings,
    auditLog
  };
};

/* ------------------------------------------------------------------ hooks */
export function useDataState(propValue, seedValue, onChange) {
  const [local, setLocal] = useState(seedValue);
  const value = propValue !== undefined ? propValue : local;
  const commit = useCallback(
    (nextOrFn) => {
      const next = typeof nextOrFn === 'function' ? nextOrFn(value) : nextOrFn;
      setLocal(next);
      if (onChange) onChange(next);
    },
    [value, onChange]
  );
  return [value, commit];
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((msg, tone = 'success') => {
    setToast({ msg, tone });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);
  useEffect(() => () => timer.current && clearTimeout(timer.current), []);
  return { show, toast, close: () => setToast(null) };
}

/* ------------------------------------------------------------------ accents */
export const ACCENTS = {
  finance: {
    key: 'finance',
    solid: 'bg-[#0F6B4F] hover:bg-[#0C563F]',
    solidText: 'bg-[#0F6B4F] text-white',
    text: 'text-[#0F6B4F]',
    textHover: 'hover:text-[#0F6B4F]',
    soft: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    softBg: 'bg-emerald-50',
    inputFocus: 'focus:ring-2 focus:ring-emerald-600/15 focus:border-emerald-600',
    sidebarActive: 'bg-[#0F6B4F] text-white shadow-sm',
    sidebarHover: 'hover:bg-emerald-50/70 hover:text-[#0F6B4F]',
    border: 'border-emerald-200',
    gradient: 'from-[#0F6B4F] to-[#0A4A36]',
    chip: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  },
  marketing: {
    key: 'marketing',
    solid: 'bg-[#6B1416] hover:bg-[#571012]',
    solidText: 'bg-[#6B1416] text-white',
    text: 'text-[#6B1416]',
    textHover: 'hover:text-[#6B1416]',
    soft: 'bg-rose-50 text-[#6B1416] border-rose-200',
    softBg: 'bg-rose-50',
    inputFocus: 'focus:ring-2 focus:ring-rose-800/15 focus:border-[#6B1416]',
    sidebarActive: 'bg-[#6B1416] text-white shadow-sm',
    sidebarHover: 'hover:bg-rose-50/70 hover:text-[#6B1416]',
    border: 'border-rose-200',
    gradient: 'from-[#6B1416] to-[#3F0B0D]',
    chip: 'bg-amber-50 text-amber-900 border-amber-200'
  },
  owner: {
    key: 'owner',
    solid: 'bg-[#8A6A2F] hover:bg-[#745725]',
    solidText: 'bg-[#8A6A2F] text-white',
    text: 'text-[#8A6A2F]',
    textHover: 'hover:text-[#8A6A2F]',
    soft: 'bg-amber-50 text-amber-900 border-amber-200',
    softBg: 'bg-amber-50',
    inputFocus: 'focus:ring-2 focus:ring-amber-700/15 focus:border-[#8A6A2F]',
    sidebarActive: 'bg-[#8A6A2F] text-white shadow-sm',
    sidebarHover: 'hover:bg-amber-50/80 hover:text-[#8A6A2F]',
    border: 'border-amber-200',
    gradient: 'from-[#1F2937] to-[#0B1220]',
    chip: 'bg-amber-50 text-amber-900 border-amber-200'
  }
};

const AccentContext = createContext(ACCENTS.finance);
export const useAccent = () => useContext(AccentContext);

export const ROLE_LABEL = {
  owner: 'Owner',
  finance: 'Admin Finance',
  marketing: 'Admin Purchasing',
  mitra: 'Mitra'
};
export const roleLabel = (r) => ROLE_LABEL[r] || r || 'Tim';

export const LEVELS = ['DB All', 'Sub DB', 'Agen', 'Reseller'];
export const levelTone = (level) =>
  level === 'DB All'
    ? 'emerald'
    : level === 'Sub DB'
    ? 'teal'
    : level === 'Agen'
    ? 'blue'
    : 'violet';

/* ------------------------------------------------------------------- badges */
const TONES = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200'
};

export function Badge({ tone = 'gray', children, dot = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap ${
        TONES[tone] || TONES.gray
      } ${className}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export const PayBadge = ({ status }) => <Badge tone={payTone(status)}>{status || PAY.BELUM}</Badge>;

export const StageBadge = ({ order }) => {
  const meta = stageMeta(orderStage(order));
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
};

export const RoleBadge = ({ role }) => (
  <Badge tone={role === 'owner' ? 'amber' : role === 'finance' ? 'emerald' : role === 'marketing' ? 'red' : 'blue'}>
    {roleLabel(role)}
  </Badge>
);

/* ------------------------------------------------------------------ buttons */
export function Button({ variant = 'primary', size = 'sm', icon, children, className = '', ...rest }) {
  const a = useAccent();
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap focus:outline-none';
  const sizes = {
    xs: 'px-2.5 py-1.5 text-[11px]',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs',
    lg: 'px-5 py-2.5 text-sm'
  };
  const variants = {
    primary: `${a.solid} text-white shadow-xs`,
    outline: 'border border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    soft: `${a.soft} border`,
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs',
    dangerOutline: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
    gold: 'bg-[#8A6A2F] text-white hover:bg-[#745725] shadow-xs'
  };
  return (
    <button type="button" className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {icon && <Icon name={icon} className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- icons */
const ICON_PATHS = {
  grid: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
  bell: 'M12 3a5 5 0 0 0-5 5v3.2L5.4 15a1 1 0 0 0 .9 1.5h11.4a1 1 0 0 0 .9-1.5L17 11.2V8a5 5 0 0 0-5-5Zm0 18a2.4 2.4 0 0 0 2.3-2H9.7A2.4 2.4 0 0 0 12 21Z',
  search: 'M10 4a6 6 0 1 0 3.8 10.7l4.2 4.2 1.4-1.4-4.2-4.2A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z',
  edit: 'm4 17.3V20h2.7L18 8.7 15.3 6 4 17.3ZM19.7 7a1 1 0 0 0 0-1.4l-1.3-1.3a1 1 0 0 0-1.4 0L15.6 5.7 18.3 8.4 19.7 7Z',
  trash: 'M6 7h12l-1 14H7L6 7Zm3-3h6l1 2H8l1-2Zm1 5v9h1.5V9H10Zm3.5 0v9H15V9h-1.5Z',
  check: 'M20 6 9 17l-5-5 1.4-1.4L9 14.2 18.6 4.6 20 6Z',
  x: 'M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3 1.4 1.4Z',
  chevron: 'm9 6 6 6-6 6-1.4-1.4L12.2 12 7.6 7.4 9 6Z',
  menu: 'M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z',
  store: 'M4 4h16l1 5a3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1-6 0 3 3 0 0 1-3 3 3 3 0 0 1-3-3l1-5Zm1 9.5A5 5 0 0 0 8 12.4a5 5 0 0 0 4-2 5 5 0 0 0 8 2V20H5v-6.5Z',
  logout: 'M10 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7v-2h7V5h-7V3Zm-2.6 5L11 11.6H4v.8h7L7.4 16 6 14.6 2.8 12 6 8.6 7.4 7.4Z',
  box: 'M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3L18.8 8 12 11.7 5.2 8 12 4.3ZM5 9.7l6 3.3v6.3l-6-3.3V9.7Zm8 9.6V13l6-3.3v6.3l-6 3.3Z',
  truck: 'M3 5h11v9h2.5l3.5-4H23v7h-2a2 2 0 0 1-4 0h-5a2 2 0 0 1-4 0H3V5Zm2 2v3h5V7H5Z',
  users: 'M9 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm7 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM2 19a7 7 0 0 1 14 0v1H2v-1Zm15.5-4.5A5.5 5.5 0 0 1 22 19v1h-3.2a8.9 8.9 0 0 0-2.6-5.2l1.3-.3Z',
  receipt: 'M6 2h12v20l-3-2-3 2-3-2-3 2V2Zm3 5v2h6V7H9Zm0 4v2h6v-2H9Z',
  wallet: 'M3 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3V6Zm2 3v9h14V9H5Zm10 3h3v2h-3v-2Z',
  file: 'M6 2h8l4 4v16H6V2Zm7 2v4h4l-4-4ZM8 12h8v2H8v-2Zm0 4h8v2H8v-2Z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 4v6l4.5 2.7-.8 1.4L11 13V6h2Z',
  alert: 'M12 2 1 21h22L12 2Zm1 6v6h-2V8h2Zm0 8v2h-2v-2h2Z',
  eye: 'M12 5C6.5 5 2.7 9.4 1.5 12c1.2 2.6 5 7 10.5 7s9.3-4.4 10.5-7C21.3 9.4 17.5 5 12 5Zm0 2c3.9 0 6.9 2.8 8.1 5-1.2 2.2-4.2 5-8.1 5s-6.9-2.8-8.1-5c1.2-2.2 4.2-5 8.1-5Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  download: 'M11 3h2v9.2l3.3-3.3 1.4 1.4L12 16 6.3 10.3l1.4-1.4L11 12.2V3ZM4 18h16v3H4v-3Z',
  upload: 'M11 16h2V6.8l3.3 3.3 1.4-1.4L12 3 6.3 8.7l1.4 1.4L11 6.8V16ZM4 18h16v3H4v-3Z',
  refresh: 'M12 4a8 8 0 0 1 7.4 5H17v2h6V5h-2v2.3A10 10 0 1 0 22 12h-2a8 8 0 1 1-8-8Z',
  print: 'M7 3h10v4h3v9h-3v5H7v-5H4V7h3V3Zm2 2v2h6V5H9Zm-2 9v5h10v-5H7Zm10-3h1.5v-2H5.5v2H7v-2h10v2Z',
  chat: 'M3 3h18v14H8l-5 4V3Zm3 3v8h11.2l1.8 1.4V6H6Zm2 2h9v2H8V8Zm0 4h6v2H8v-2Z',
  filter: 'M3 5h18v2l-7 7v6l-4 2v-8L3 7V5Z',
  copy: 'M8 2h11v14h-3V4H9V2H8ZM5 6h11v16H5V6Zm2 2v12h7V8H7Z',
  arrow: 'M4 11h12.2l-4.6-4.6L13 5l7 7-7 7-1.4-1.4 4.6-4.6H4v-2Z',
  card: 'M3 5h18v14H3V5Zm2 3v2h14V8H5Zm0 4v5h8v-5H5Z',
  shield: 'M12 2 4 5v6c0 5 3.4 9.5 8 11 4.6-1.5 8-6 8-11V5l-8-3Zm0 2.2 6 2.2V11c0 3.9-2.5 7.5-6 8.8C8.5 18.5 6 14.9 6 11V6.4l6-2.2Z',
  spark: 'm12 2 2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2Z',
  settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.44.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  key: 'M12.65 10C11.7 7.31 8.9 5.5 5.77 6.12 3.48 6.58 1.62 8.44 1.14 10.74c-.82 3.93 1.84 7.26 5.51 7.26 2.37 0 4.41-1.29 5.5-3.2l2.43 2.42c.39.39 1.02.39 1.41 0l1.42-1.42 1.41 1.42c.39.39 1.02.39 1.41 0l2.83-2.83c.39-.39.39-1.02 0-1.41L12.65 10zm-6.15 4c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'
};

export function Icon({ name, className = 'w-4 h-4' }) {
  const d = ICON_PATHS[name] || ICON_PATHS.grid;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* ------------------------------------------------------------------- inputs */
export function Field({ label, hint, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-[11px] font-semibold text-gray-600 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      )}
      {children}
      {hint && <span className="block text-[10px] text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

const fieldBase =
  'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 transition-all outline-none disabled:bg-gray-100 disabled:text-gray-500';

export function Input({ className = '', ...rest }) {
  const a = useAccent();
  return <input className={`${fieldBase} ${a.inputFocus} ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  const a = useAccent();
  return (
    <select className={`${fieldBase} ${a.inputFocus} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...rest }) {
  const a = useAccent();
  return <textarea className={`${fieldBase} ${a.inputFocus} ${className}`} {...rest} />;
}

export function SearchBox({ value, onChange, placeholder = 'Cari...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Icon name="search" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400"
      />
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  const a = useAccent();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-xs text-gray-700 disabled:opacity-40 cursor-pointer"
    >
      <span
        className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${
          checked ? a.solidText.split(' ')[0] : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </span>
      {label && <span>{label}</span>}
    </button>
  );
}

export function Segmented({ value, onChange, options, className = '' }) {
  return (
    <div className={`inline-flex p-0.5 bg-gray-100 rounded-lg text-[11px] gap-0.5 flex-wrap ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
            value === o.value ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={`ml-1 text-[10px] ${value === o.value ? 'text-gray-500' : 'text-gray-400'}`}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- cards */
export function Card({ title, subtitle, action, children, className = '', bodyClassName = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-start justify-between gap-3 flex-wrap bg-gray-50/40">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">{title}</h3>
            {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0 ml-auto">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

export function MetricCard({ label, value, sub, hint, tone = 'gray', icon, badge, onClick }) {
  const toneCls = {
    gray: 'text-gray-900',
    emerald: 'text-emerald-700',
    blue: 'text-sky-700',
    amber: 'text-amber-700',
    red: 'text-rose-600',
    violet: 'text-violet-700',
    orange: 'text-orange-600'
  }[tone];
  const iconCls = {
    gray: 'bg-gray-100 text-gray-500',
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-700',
    orange: 'bg-orange-50 text-orange-600'
  }[tone];
  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-gray-300 transition-colors' : ''
      }`}
    >
      <div>
        <div className="flex min-h-[48px] items-start justify-between gap-2">
          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
            {badge}
          </div>
          {icon && (
            <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${iconCls}`}>
              <Icon name={icon} className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <p className={`text-xl sm:text-2xl font-bold mt-1.5 tracking-tight whitespace-nowrap ${toneCls}`}>{value}</p>
        {sub && <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{sub}</p>}
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-100">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, tone = 'emerald', className = '' }) {
  const cls = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-400',
    red: 'bg-rose-500',
    blue: 'bg-sky-500',
    violet: 'bg-violet-500',
    orange: 'bg-orange-500'
  }[tone];
  const pctVal = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-2 bg-gray-100 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${cls}`} style={{ width: `${pctVal}%` }} />
    </div>
  );
}

export function EmptyState({ title = 'Belum ada data', desc, icon = 'box', action }) {
  return (
    <div className="py-12 px-6 text-center">
      <div className="w-11 h-11 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
        <Icon name={icon} className="w-5 h-5" />
      </div>
      <p className="text-xs font-semibold text-gray-700">{title}</p>
      {desc && <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">{desc}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- page head */
export function PageHead({ title, desc, actions, badge }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-base font-bold text-gray-900 tracking-tight">{title}</h1>
          {badge}
        </div>
        {desc && <p className="text-[11px] text-gray-500 mt-1 max-w-3xl leading-relaxed">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </div>
  );
}

export function Toolbar({ children, className = '' }) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
}

export function usePagination(list, initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const rows = useMemo(() => list.slice((safePage - 1) * pageSize, safePage * pageSize), [list, safePage, pageSize]);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  return { rows, page: safePage, setPage, pageSize, setPageSize, total };
}

/* ------------------------------------------------------------------- tables */
export const TH =
  'px-3 sm:px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap';
export const TD = 'px-3 sm:px-4 py-2.5 sm:py-3 text-xs text-gray-700 align-middle';

export function TableWrap({ children, className = '', minWidth, fluid = false }) {
  const autoMinWidth = useMemo(() => {
    const nodes = Children.toArray(children);
    const thead = nodes.find((n) => n?.type === 'thead');
    const headRow = thead ? Children.toArray(thead.props.children)[0] : null;
    const cols = headRow ? Children.count(headRow.props.children) : 0;
    if (cols >= 9) return 1040;
    if (cols === 8) return 960;
    if (cols === 7) return 880;
    if (cols === 6) return 800;
    if (cols === 5) return 700;
    return 620;
  }, [children]);
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full" style={fluid ? undefined : { minWidth: Number(minWidth) || autoMinWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-gray-100 text-[11px] text-gray-500">
      <div className="flex items-center gap-2">
        <span>
          Menampilkan <b className="text-gray-700">{from}</b>–<b className="text-gray-700">{to}</b> dari{' '}
          <b className="text-gray-700">{total}</b>
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="border border-gray-200 rounded-md px-1.5 py-1 text-[11px] bg-white"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / hal
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-2 py-1 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
        >
          ‹
        </button>
        {Array.from({ length: Math.min(5, pages) }).map((_, i) => {
          const start = Math.min(Math.max(1, page - 2), Math.max(1, pages - 4));
          const p = start + i;
          if (p > pages) return null;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-[26px] px-2 py-1 rounded-md border ${
                p === page ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="px-2 py-1 rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
        >
          ›
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- modals */
export function Modal({ title, subtitle, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/55 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative w-full ${widths[size]} bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ title, subtitle, onClose, children, footer, width = 'max-w-xl' }) {
  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[65] flex justify-end">
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative w-full ${width} bg-gray-50 h-full flex flex-col shadow-2xl`}>
        <div className="px-5 py-4 bg-white border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Tutup"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 bg-white border-t border-gray-200 flex justify-end gap-2 flex-wrap">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  const tones = {
    success: 'bg-emerald-700 text-white',
    error: 'bg-rose-700 text-white',
    info: 'bg-gray-900 text-white',
    warning: 'bg-amber-600 text-white'
  };
  return (
    <div className="fixed bottom-5 right-5 z-[80] max-w-sm">
      <div
        className={`px-4 py-3 rounded-xl shadow-xl text-xs font-medium flex items-start gap-3 ${
          tones[toast.tone] || tones.info
        }`}
      >
        <span className="mt-0.5">
          <Icon name={toast.tone === 'error' ? 'alert' : 'check'} className="w-4 h-4" />
        </span>
        <span className="leading-relaxed">{toast.msg}</span>
        <button type="button" onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
          <Icon name="x" className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ReasonModal({ title, subtitle, label = 'Catatan', placeholder, confirmLabel = 'Simpan', danger, onClose, onSubmit, extra }) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            disabled={!reason.trim()}
            onClick={() => onSubmit(reason.trim())}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {extra}
        <Field label={label} required>
          <Textarea
            rows={4}
            value={reason}
            placeholder={placeholder}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </Field>
      </div>
    </Modal>
  );
}

export function ConfirmModal({ title, message, confirmLabel = 'Ya, lanjutkan', danger, onClose, onConfirm }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-xs text-gray-600 leading-relaxed">{message}</p>
    </Modal>
  );
}

export function ProofModal({ src, title = 'Bukti Transfer', onClose }) {
  return (
    <Modal title={title} onClose={onClose} size="md">
      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        {src ? (
          <img src={src} alt={title} className="w-full max-h-[65vh] object-contain" />
        ) : (
          <div className="py-16 text-center text-xs text-gray-400">Tidak ada berkas bukti.</div>
        )}
      </div>
    </Modal>
  );
}

export function ProofThumb({ src, onClick, label = 'Lihat bukti' }) {
  if (!src) return <span className="text-[11px] text-gray-400">—</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 hover:underline"
    >
      <span className="w-7 h-7 rounded-md overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
        <img src={src} alt={label} className="w-full h-full object-cover" />
      </span>
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------- stepper */
export function Stepper({ steps, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row gap-2 sm:gap-0 ${className}`}>
      {steps.map((s, i) => {
        const dot =
          s.state === 'done'
            ? 'bg-emerald-500 text-white border-emerald-500'
            : s.state === 'reject'
            ? 'bg-rose-500 text-white border-rose-500'
            : s.state === 'active'
            ? 'bg-white text-amber-600 border-amber-500'
            : 'bg-white text-gray-400 border-gray-300';
        return (
          <div key={s.label} className="flex-1 flex sm:flex-col items-start gap-2 sm:gap-1.5 relative">
            <div className="flex items-center gap-2 sm:w-full">
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shrink-0 ${dot}`}>
                {s.state === 'done' ? '✓' : s.state === 'reject' ? '!' : i + 1}
              </span>
              {i < steps.length - 1 && <span className="hidden sm:block flex-1 h-px bg-gray-200" />}
            </div>
            <div className="sm:pr-3">
              <p className={`text-[11px] font-semibold ${s.state === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>
                {s.label}
              </p>
              {s.by && <p className="text-[10px] text-gray-400">{s.by}</p>}
              {s.at && <p className="text-[10px] text-gray-400">{fmtDate(s.at)}</p>}
              {s.note && <p className="text-[10px] text-gray-500 leading-snug">{s.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const prSteps = (req) => [
  {
    label: 'Diajukan Finance',
    state: 'done',
    by: req.createdBy,
    at: req.createdAt
  },
  {
    label: 'Review Purchasing',
    state: req.marketing ? (req.marketing.decision === 'ACC' ? 'done' : 'reject') : req.status === PREQ.REVIEW_MKT ? 'active' : 'pending',
    by: req.marketing?.by,
    at: req.marketing?.at,
    note: req.marketing?.note
  },
  {
    label: 'Approval Owner',
    state: req.owner ? (req.owner.decision === 'ACC' ? 'done' : 'reject') : req.status === PREQ.APPROVAL_OWNER ? 'active' : 'pending',
    by: req.owner?.by,
    at: req.owner?.at,
    note: req.owner?.note
  },
  {
    label: 'Transfer',
    state: req.transfer ? 'done' : req.status === PREQ.APPROVED ? 'active' : 'pending',
    by: req.transfer?.by,
    at: req.transfer?.at,
    note: req.transfer?.note
  }
];

/* -------------------------------------------------------------- stage tabs */
export function StageTabs({ orders, value, onChange, includeRejected = true, className = '' }) {
  const list = includeRejected ? STAGES : activeStages;
  const counts = useMemo(() => {
    const c = {};
    STAGES.forEach((s) => (c[s.id] = 0));
    (orders || []).forEach((o) => (c[orderStage(o)] += 1));
    return c;
  }, [orders]);
  return (
    <div className={`flex gap-1.5 overflow-x-auto pb-1 ${className}`}>
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-all ${
          value === 'all'
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
        }`}
      >
        Semua <span className="opacity-60">({(orders || []).length})</span>
      </button>
      {list.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-all ${
            value === s.id
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {s.label} <span className="opacity-60">({counts[s.id] || 0})</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ orders table */
export function OrdersTable({ orders, onOpen, renderActions, empty = 'Tidak ada pesanan pada filter ini.', compact = false }) {
  const HEAD = 'px-2 sm:px-3 xl:px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap';
  const CELL = 'px-2 sm:px-3 xl:px-4 py-2.5 sm:py-3 text-xs text-gray-700 align-middle';
  return (
    <TableWrap fluid>
      <thead className="bg-gray-50 border-b border-gray-100">
        <tr>
          <th className={HEAD}>Invoice</th>
          <th className={HEAD}>Mitra</th>
          <th className={HEAD}>Item PO</th>
          <th className={`${HEAD} text-right`}>Nilai</th>
          <th className={HEAD}><span className="xl:hidden">Bayar</span><span className="hidden xl:inline">Pembayaran</span></th>
          <th className={HEAD}>Tahap</th>
          {renderActions && <th className={`${HEAD} text-right`}>Aksi</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {orders.map((o) => (
          <tr key={o.invoice} className="hover:bg-gray-50/70">
            <td className={CELL}>
              <button
                type="button"
                onClick={() => onOpen(o)}
                className="font-bold text-sky-700 hover:underline whitespace-nowrap"
              >
                {o.invoice}
              </button>
              <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(o.date)}</p>
            </td>
            <td className={CELL}>
              <p className="font-semibold text-gray-900">{o.mitraName}</p>
              <p className="text-[10px] text-gray-400">
                {o.level} · {o.brand}
              </p>
            </td>
            <td className={CELL}>
              <p className="font-medium text-gray-800">{o.produk}</p>
              <p className="text-[10px] text-gray-400">
                {o.variant} · {o.qty} pcs
              </p>
              {(() => {
                const groups = splitAddressGroups(o);
                if (!groups.length) return null;
                return (
                  <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    {groups.length} alamat kirim ·{' '}
                    {groups.filter((g) => g.courier?.name).length} ekspedisi terpilih
                  </p>
                );
              })()}
            </td>
            <td className={`${CELL} text-right`}>
              <p className="font-bold text-gray-900 whitespace-nowrap">{rp(o.subtotal)}</p>
              <p className="text-[10px] text-gray-400">Ongkir {o.ongkir ? rp(o.ongkir) : '—'}</p>
            </td>
            <td className={CELL}>
              {compact ? (
                <div className="flex items-center gap-1">
                  <span title={`DP: ${o.dpStatus}`} className={`w-2 h-2 rounded-full ${isPaid(o.dpStatus) ? 'bg-emerald-500' : o.dpStatus === PAY.MENUNGGU ? 'bg-amber-400' : 'bg-gray-300'}`} />
                  <span title={`Pelunasan: ${o.pelunasanStatus}`} className={`w-2 h-2 rounded-full ${isPaid(o.pelunasanStatus) ? 'bg-emerald-500' : o.pelunasanStatus === PAY.MENUNGGU ? 'bg-amber-400' : 'bg-gray-300'}`} />
                  <span title={`Ongkir: ${o.ongkirStatus}`} className={`w-2 h-2 rounded-full ${isPaid(o.ongkirStatus) ? 'bg-emerald-500' : o.ongkirStatus === PAY.MENUNGGU ? 'bg-amber-400' : 'bg-gray-300'}`} />
                </div>
              ) : (
                <>
                  <div className="flex xl:hidden items-center gap-1">
                    <span title={`DP: ${o.dpStatus}`} className={`w-2 h-2 rounded-full ${isPaid(o.dpStatus) ? 'bg-emerald-500' : o.dpStatus === PAY.MENUNGGU ? 'bg-amber-400' : 'bg-gray-300'}`} />
                    <span title={`Pelunasan: ${o.pelunasanStatus}`} className={`w-2 h-2 rounded-full ${isPaid(o.pelunasanStatus) ? 'bg-emerald-500' : o.pelunasanStatus === PAY.MENUNGGU ? 'bg-amber-400' : 'bg-gray-300'}`} />
                    <span title={`Ongkir: ${o.ongkirStatus}`} className={`w-2 h-2 rounded-full ${isPaid(o.ongkirStatus) ? 'bg-emerald-500' : o.ongkirStatus === PAY.MENUNGGU ? 'bg-amber-400' : 'bg-gray-300'}`} />
                  </div>
                  <div className="hidden xl:flex flex-wrap gap-1">
                    <Badge tone={payTone(o.dpStatus)}>DP {isPaid(o.dpStatus) ? '✓' : ''}</Badge>
                    <Badge tone={payTone(o.pelunasanStatus)}>Lunas {isPaid(o.pelunasanStatus) ? '✓' : ''}</Badge>
                    <Badge tone={payTone(o.ongkirStatus)}>Ongkir {isPaid(o.ongkirStatus) ? '✓' : ''}</Badge>
                  </div>
                </>
              )}
            </td>
            <td className={CELL}>
              <StageBadge order={o} />
              <p className="text-[10px] text-gray-400 mt-0.5">{nextAction(o).label}</p>
            </td>
            {renderActions && (
              <td className={`${CELL} text-right`}>
                <div className="flex items-center justify-end gap-1.5 flex-wrap">{renderActions(o)}</div>
              </td>
            )}
          </tr>
        ))}
        {orders.length === 0 && (
          <tr>
            <td colSpan={renderActions ? 7 : 6} className="px-4 py-12 text-center text-xs text-gray-400">
              {empty}
            </td>
          </tr>
        )}
      </tbody>
    </TableWrap>
  );
}

/* ------------------------------------------------------------- order drawer */
export function OrderSummaryStrip({ order }) {
  const outstanding = orderOutstanding(order);
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <p className="text-[10px] font-semibold uppercase text-gray-400">Nilai Pesanan</p>
        <p className="text-sm font-bold text-gray-900 mt-1">{rp(order.subtotal)}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <p className="text-[10px] font-semibold uppercase text-gray-400">Sudah Dibayar</p>
        <p className="text-sm font-bold text-emerald-700 mt-1">{rp(orderPaid(order))}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <p className="text-[10px] font-semibold uppercase text-gray-400">Sisa Tagihan</p>
        <p className={`text-sm font-bold mt-1 ${outstanding > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{rp(outstanding)}</p>
      </div>
    </div>
  );
}

export function OrderPaymentList({ order, onProof }) {
  const rows = [
    { label: 'DP', status: order.dpStatus, amount: order.dpNominal, proof: order.dpProof, by: order.dpVerifiedBy, at: order.dpVerifiedAt },
    { label: 'Pelunasan', status: order.pelunasanStatus, amount: order.pelunasanNominal, proof: order.pelunasanProof, by: order.pelunasanVerifiedBy, at: order.pelunasanVerifiedAt },
    { label: 'Ongkir', status: order.ongkirStatus, amount: order.ongkir, proof: order.ongkirProof, by: order.ongkirVerifiedBy, at: order.ongkirVerifiedAt }
  ];
  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {rows.map((r) => (
        <div key={r.label} className="px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-800">{r.label}</p>
            <p className="text-[10px] text-gray-400">
              {r.at ? `Diverifikasi ${r.by || '-'} · ${fmtDate(r.at)}` : 'Belum diverifikasi'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-900">{rp(r.amount)}</p>
            <div className="mt-1 flex items-center justify-end gap-2">
              <PayBadge status={r.status} />
              {r.proof && <ProofThumb src={r.proof} onClick={() => onProof(r.proof, `Bukti ${r.label} ${order.invoice}`)} />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderTimeline({ order }) {
  const timeline = orderTimeline(order);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">Timeline Pesanan</p>
      <ol className="space-y-0">
        {timeline.map((s, i) => (
          <li key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold shrink-0 ${
                  s.state === 'done'
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : s.state === 'reject'
                    ? 'bg-rose-500 border-rose-500 text-white'
                    : s.state === 'active'
                    ? 'bg-white border-amber-500 text-amber-600'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {s.state === 'done' ? '✓' : s.state === 'reject' ? '!' : i + 1}
              </span>
              {i < timeline.length - 1 && (
                <span className={`w-px flex-1 min-h-[18px] ${s.state === 'done' ? 'bg-emerald-200' : 'bg-gray-200'}`} />
              )}
            </div>
            <div className="pb-3">
              <p className={`text-[11px] font-semibold ${s.state === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>
                {s.label}
              </p>
              <p className="text-[10px] text-gray-400">
                {s.at ? fmtDate(s.at) : ''} {s.note ? `· ${s.note}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const orderPaymentPlan = (order) => {
  const plan = Array.isArray(order?.paymentStages) ? order.paymentStages.filter(Boolean) : [];
  if (plan.length >= 2) return plan.slice(0, 3);
  const dp = Math.min(100, Math.max(0, num(order?.dpPct) || DEFAULT_DP_PCT));
  return [
    { label: 'Termin 1 · DP', pct: dp, date: order?.date || '' },
    { label: 'Termin 2 · Pelunasan', pct: 100 - dp, date: order?._projectMeta?.pelunasanDueDate || '' }
  ].filter((stage) => num(stage.pct) > 0);
};

const paymentStageMeta = (order, index, total, stage) => {
  const overdue = stage?.date && diffDays(stage.date, todayISO()) < 0;
  const lunas = { label: 'Lunas', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const menunggu = { label: 'Menunggu verifikasi', className: 'bg-sky-50 text-sky-700 border-sky-200' };
  if (index === 0) {
    if (order.pelunasanStatus === PAY.ACC) return lunas;
    if (order.dpStatus === PAY.ACC) return { label: 'DP terverifikasi', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (order.dpStatus === PAY.MENUNGGU) return menunggu;
  } else if (index === total - 1) {
    if (order.pelunasanStatus === PAY.ACC) return lunas;
    if (order.pelunasanStatus === PAY.MENUNGGU) return menunggu;
  } else if (order.pelunasanStatus === PAY.ACC) {
    return lunas;
  }
  return overdue
    ? { label: 'Lewat jatuh tempo', className: 'bg-rose-50 text-rose-700 border-rose-200' }
    : { label: 'Terjadwal', className: 'bg-amber-50 text-amber-700 border-amber-200' };
};

function PaymentPlanCard({ order }) {
  const plan = orderPaymentPlan(order);
  if (!plan.length) return null;
  const total = plan.length;
  const sumPct = plan.reduce((sum, stage) => sum + num(stage.pct ?? stage.percent), 0);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Termin Pembayaran</p>
        <span className="text-[10px] text-gray-400">
          {total}x termin · total {sumPct}%
        </span>
      </div>
      <div className="space-y-1.5">
        {plan.map((stage, index) => {
          const pct = num(stage.pct ?? stage.percent);
          const amount = Math.round((num(order.subtotal) * pct) / 100);
          const meta = paymentStageMeta(order, index, total, stage);
          return (
            <div key={`${index}-${stage.label || ''}`} className="rounded-lg border border-gray-100 bg-gray-50/70 px-2.5 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-gray-800">
                  {stage.label || `Termin ${index + 1}`}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${meta.className}`}>
                  {meta.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px] text-gray-500 mt-0.5">
                <span>
                  {pct}% · jatuh tempo {stage.date ? fmtDate(stage.date) : '—'}
                </span>
                <span className="font-semibold text-gray-700">{rp(amount)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400">Nominal dihitung dari subtotal pesanan, di luar ongkir.</p>
    </div>
  );
}

export function OrderDrawer({ order, onClose, actions, onProof, printInvoice }) {
  const [copiedKey, setCopiedKey] = useState('');
  const [manualCopyText, setManualCopyText] = useState('');
  if (!order) return null;
  const next = nextAction(order);
  const st = stageMeta(orderStage(order));

  const orderItems = order._projectMeta?.items || [];
  const splitGroups = splitAddressGroups(order);
  const shippingLabels = extractOrderShippingLabels(order);
  const hasAnyAddress = hasAddress(order) || splitGroups.length > 0;

  const handleCopyLabel = async (key, text) => {
    const ok = await copyText(text);
    if (ok) {
      setManualCopyText('');
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? '' : prev)), 2000);
    } else {
      setManualCopyText(text);
    }
  };

  return (
    <Drawer
      title={
        <span className="flex items-center gap-2 flex-wrap">
          {order.invoice}
          <Badge tone={st.tone}>{st.label}</Badge>
        </span>
      }
      subtitle={`${order.mitraName} · ${order.level} · ${fmtDate(order.date)}`}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          {hasAnyAddress && (
            <>
              <Button
                variant="outline"
                icon={copiedKey === 'all' ? 'check' : 'copy'}
                onClick={() => handleCopyLabel('all', formatAllShippingLabelsText(order))}
              >
                {copiedKey === 'all' ? 'Alamat Tersalin' : shippingLabels.length > 1 ? `Salin Semua Alamat (${shippingLabels.length})` : 'Salin Alamat'}
              </Button>
              <Button
                variant="outline"
                icon="print"
                onClick={() => openShippingLabelsPrintTab(order)}
              >
                Cetak Label
              </Button>
            </>
          )}
          {printInvoice && (
            <Button variant="outline" icon="print" onClick={() => printInvoice(order)}>
              Cetak Invoice
            </Button>
          )}
          {actions}
        </>
      }
    >
      <div className={`rounded-xl border ${TONES[next.tone] || TONES.gray} px-4 py-3`}>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Tindakan berikutnya</p>
        <p className="text-xs font-semibold mt-0.5">
          {next.who} — {next.label}
        </p>
      </div>

      <OrderSummaryStrip order={order} />

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Rincian Item</p>
          <span className="text-[10px] text-gray-400">
            {orderItems.length || 1} produk · {num(order.qty) || 1} pcs · DP {num(order.dpPct) || 0}%
          </span>
        </div>
        {(orderItems.length
          ? orderItems
          : [
              {
                id: 'single',
                title: order.produk,
                brand: order.brand,
                variant: order.variant,
                qty: order.qty,
                price: order.price,
                discountPct: order.discountPct,
                addon: order.addon,
                subtotal: order.subtotal
              }
            ]
        ).map((item, idx) => {
          const qty = Math.max(1, num(item.qty));
          const price = num(item.price);
          const disc = num(item.discountPct);
          const addon = num(item.addon);
          const subtotal = num(item.subtotal) || (price + addon) * qty;
          return (
            <div
              key={item.id ?? idx}
              className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900">{item.title || order.produk}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {[item.brand || order.brand, item.variant, `${qty} pcs x ${rp(price)}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {(disc > 0 || addon > 0) && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {disc > 0 ? `Diskon mitra ${disc}%` : ''}
                      {disc > 0 && addon > 0 ? ' · ' : ''}
                      {addon > 0 ? `Tambahan ${rp(addon)}/pcs` : ''}
                    </p>
                  )}
                </div>
                <p className="text-xs font-bold text-gray-900 shrink-0">{rp(subtotal)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <OrderPaymentList order={order} onProof={onProof} />

      <PaymentPlanCard order={order} />

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Alamat Pengiriman Utama</p>
          {hasAddress(order) ? (
            <>
              <p className="text-xs font-semibold text-gray-900">
                {order.addressObject?.recipient || order.address?.recipient || order.mitraName}
              </p>
              {(order.addressObject?.phone || order.address?.phone || order.phone) && (
                <p className="text-[11px] font-medium text-gray-700 mt-0.5">
                  HP: {order.addressObject?.phone || order.address?.phone || order.phone}
                </p>
              )}
              <p className="text-[11px] text-gray-600 leading-relaxed mt-0.5">
                {order.addressObject?.address || addressText(order)}
              </p>
            </>
          ) : (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
              Mitra belum melengkapi alamat pengiriman.
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Pengiriman</p>
          <dl className="text-[11px] space-y-1">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-400">Ekspedisi</dt>
              <dd className="font-semibold text-gray-800">{order.ekspedisi || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-400">Ongkir</dt>
              <dd className="font-semibold text-gray-800">{order.ongkir ? rp(order.ongkir) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-400">No. Resi</dt>
              <dd className="font-semibold text-gray-800">{order.resi || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-400">Status</dt>
              <dd className="font-semibold text-gray-800">{order.shipStatus}</dd>
            </div>
          </dl>
        </div>
      </div>

      {hasAnyAddress && shippingLabels.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Label Alamat & Pengiriman ({shippingLabels.length} alamat)
              </p>
              <p className="text-[10px] text-gray-400">
                Format siap salin & cetak untuk packing (Penerima, HP, Alamat, Pengirim, Orderan)
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="xs"
                variant="outline"
                icon={copiedKey === 'all-card' ? 'check' : 'copy'}
                onClick={() => handleCopyLabel('all-card', formatAllShippingLabelsText(order))}
              >
                {copiedKey === 'all-card' ? 'Tersalin' : shippingLabels.length > 1 ? 'Salin Semua' : 'Salin'}
              </Button>
              <Button
                size="xs"
                variant="outline"
                icon="print"
                onClick={() => openShippingLabelsPrintTab(order)}
              >
                Cetak Label
              </Button>
            </div>
          </div>

          <div className="space-y-2.5">
            {shippingLabels.map((label) => (
              <div
                key={label.key}
                className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200/80 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-gray-900">{label.labelTitle}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-700">
                      {label.courier || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyLabel(label.key, formatShippingLabelText(label))}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      <Icon name={copiedKey === label.key ? 'check' : 'copy'} className="w-3 h-3" />
                      {copiedKey === label.key ? 'Tersalin' : 'Salin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openShippingLabelsPrintTab(order, label.key)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      <Icon name="print" className="w-3 h-3" />
                      Cetak
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5 text-[11px]">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Penerima</p>
                    <p className="font-bold text-gray-900">{label.recipientName}</p>
                    <p className="text-gray-700 font-medium">HP: {label.recipientPhone}</p>
                    <p className="text-gray-600 leading-relaxed">{label.recipientAddress}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Pengirim</p>
                    <p className="font-bold text-gray-900">{label.senderName}</p>
                    <p className="text-gray-700 font-medium">HP: {label.senderPhone}</p>
                    {label.senderNotes && (
                      <p className="text-amber-700 text-[10px] mt-0.5">Catatan: {label.senderNotes}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200/80 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Orderan</p>
                  <div className="space-y-0.5">
                    {label.items.map((it, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-gray-700">
                          {it.title}
                          {it.variant ? ` (${it.variant})` : ''}
                        </span>
                        <span className="font-bold text-gray-900 shrink-0">{it.qty} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {manualCopyText && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-amber-900">
                  Browser membatasi salin otomatis — silakan blok & tekan Ctrl+C:
                </p>
                <button
                  type="button"
                  onClick={() => setManualCopyText('')}
                  className="text-[10px] font-bold text-amber-800 hover:underline cursor-pointer"
                >
                  Tutup
                </button>
              </div>
              <textarea
                readOnly
                value={manualCopyText}
                rows={6}
                onFocus={(e) => e.target.select()}
                className="w-full rounded border border-amber-300 bg-white p-2 text-[11px] font-mono text-gray-800"
              />
            </div>
          )}
        </div>
      )}

      {order.revisionNote && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Catatan Revisi Mitra</p>
          <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">{order.revisionNote}</p>
        </div>
      )}

      {order.notes && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Catatan</p>
          <p className="text-[11px] text-gray-700 mt-1 leading-relaxed">{order.notes}</p>
        </div>
      )}

      <OrderTimeline order={order} />

      <div className="bg-white rounded-xl border border-gray-200 p-4 text-[10px] text-gray-400 flex flex-wrap gap-x-6 gap-y-1">
        <span>Dibuat oleh: {order.createdBy || '—'}</span>
        <span>ACC Purchasing: {order.marketingBy || '—'}</span>
        <span>DP oleh: {order.dpVerifiedBy || '—'}</span>
        <span>Pelunasan oleh: {order.pelunasanVerifiedBy || '—'}</span>
        <span>Ongkir oleh: {order.ongkirVerifiedBy || '—'}</span>
      </div>
    </Drawer>
  );
}

/* -------------------------------------------------------------------- shell */
function findMenuItem(menus, id) {
  for (const m of menus) {
    if (m.id === id) return m;
    if (m.children) {
      const found = m.children.find((c) => c.id === id);
      if (found) return found;
    }
  }
  return null;
}

export function DashboardShell({
  accent = ACCENTS.finance,
  menus = [],
  activeMenu,
  onNavigate,
  portalLabel = 'Portal',
  portalSub = '',
  brandName = 'Afatharshop',
  brandInitial = 'A',
  currentUser,
  onLogout,
  onNavigateStore,
  notifications = [],
  headerRight,
  children,
  darkSidebar = false
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState([]);
  const [openGroups, setOpenGroups] = useState(() => {
    const o = {};
    menus.forEach((m) => {
      if (m.group) o[m.group] = true;
    });
    return o;
  });

  const activeItem = findMenuItem(menus, activeMenu);
  const readSet = useMemo(() => new Set(readNotifIds), [readNotifIds]);
  const notifCount = notifications.filter((n) => n.unread !== false && !readSet.has(n.id)).length;
  const markNotifRead = (id) =>
    setReadNotifIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const markAllNotifRead = () =>
    setReadNotifIds((prev) => [...new Set([...prev, ...notifications.map((n) => n.id)])]);

  const sideBg = darkSidebar ? 'bg-[#111827] border-gray-800' : 'bg-white border-gray-200';
  const sideText = darkSidebar ? 'text-gray-300' : 'text-gray-700';
  const sideMuted = darkSidebar ? 'text-gray-500' : 'text-gray-400';
  const sideBorder = darkSidebar ? 'border-gray-800' : 'border-gray-100';
  const sideHover = darkSidebar ? 'hover:bg-white/5 hover:text-white' : accent.sidebarHover;
  const groupColor = darkSidebar ? 'text-gray-500 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-50';

  return (
    <AccentContext.Provider value={accent}>
      <div className="min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-72px)] bg-[#F5F7F6] text-stone-800 antialiased font-sans flex flex-col">
        <div className="flex flex-1">
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed top-16 sm:top-[72px] inset-x-0 bottom-0 bg-gray-900/50 z-30 lg:hidden"
          />
        )}

        <aside
          className={`fixed top-16 sm:top-[72px] bottom-0 left-0 z-40 w-64 border-r shrink-0 flex flex-col justify-between transition-transform duration-300 ${sideBg} ${
            mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
          } lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:translate-x-0`}
        >
          <div className="min-h-0 flex flex-col">
            <div className={`px-5 py-4 border-b ${sideBorder} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl ${accent.solidText} flex items-center justify-center font-bold text-sm shadow-sm`}>
                  {brandInitial}
                </div>
                <div>
                  <h1 className={`text-sm font-bold leading-none ${darkSidebar ? 'text-white' : 'text-stone-900'}`}>
                    {brandName}
                  </h1>
                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${darkSidebar ? 'text-amber-400' : accent.text}`}>
                    {portalLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className={`lg:hidden p-1 rounded-md ${sideMuted} hover:text-gray-800`}
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>

            {portalSub && (
              <p className={`px-5 pt-3 pb-1 text-[10px] ${sideMuted}`}>{portalSub}</p>
            )}

            <nav className="p-3 space-y-0.5 overflow-y-auto flex-1">
              {menus.map((m) =>
                m.children ? (
                  <div key={m.group || m.label} className="pt-2">
                    <button
                      type="button"
                      onClick={() => setOpenGroups({ ...openGroups, [m.group]: !openGroups[m.group] })}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${groupColor}`}
                    >
                      <span>{m.label}</span>
                      <span className={`transition-transform ${openGroups[m.group] ? 'rotate-90' : ''}`}>
                        <Icon name="chevron" className="w-3 h-3" />
                      </span>
                    </button>
                    {openGroups[m.group] && (
                      <div className="mt-1 space-y-0.5 pl-1">
                        {m.children.map((c) => {
                          const active = activeMenu === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                onNavigate(c.id);
                                setMobileOpen(false);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
                                active
                                  ? accent.sidebarActive
                                  : `${sideText} ${sideHover}`
                              }`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <Icon name={c.icon || 'chevron'} className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                <span className="truncate">{c.label}</span>
                              </span>
                              {c.badge ? (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                    active ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                                  }`}
                                >
                                  {c.badge}
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onNavigate(m.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
                      activeMenu === m.id ? accent.sidebarActive : `${sideText} ${sideHover}`
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon name={m.icon || 'grid'} className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      <span className="truncate">{m.label}</span>
                    </span>
                    {m.badge ? (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          activeMenu === m.id ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {m.badge}
                      </span>
                    ) : null}
                  </button>
                )
              )}
            </nav>
          </div>

          <div className={`p-3 border-t ${sideBorder} space-y-2`}>
            <div
              onClick={() => onNavigate && onNavigate('pengaturan_akun')}
              className={`flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition ${
                darkSidebar ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              title="Buka Pengaturan Akun"
            >
              <div className={`w-8 h-8 rounded-full ${accent.solidText} overflow-hidden flex items-center justify-center text-[11px] font-bold shrink-0 border border-gray-200/50`}>
                {currentUser?.avatar && !currentUser.avatar.includes('unsplash.com') ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser?.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials(currentUser?.name || 'User')
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-semibold truncate ${darkSidebar ? 'text-white' : 'text-gray-900'}`}>
                  {currentUser?.name || 'User'}
                </p>
                <p className={`text-[9px] uppercase tracking-wider ${sideMuted}`}>
                  {roleLabel(currentUser?.role)}
                </p>
              </div>
              <Icon name="settings" className={`w-3.5 h-3.5 shrink-0 ${sideMuted}`} />
            </div>
            {onNavigateStore && (
              <button
                type="button"
                onClick={onNavigateStore}
                className={`w-full py-2 px-3 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 border transition ${
                  darkSidebar
                    ? 'border-gray-700 text-amber-300 hover:bg-white/5'
                    : `bg-white border-gray-200 ${accent.text} hover:border-gray-300`
                }`}
              >
                <Icon name="store" className="w-3.5 h-3.5" /> Toko Mitra
              </button>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2 px-3 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1.5 text-rose-500 hover:bg-rose-50 transition"
              >
                <Icon name="logout" className="w-3.5 h-3.5" /> Keluar
              </button>
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-72px)]">
          <header className="h-16 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-3 border-b border-gray-200/80 bg-white/95 backdrop-blur sticky top-16 sm:top-[72px] z-20">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-1.5 rounded-lg border border-gray-200 text-gray-700"
                aria-label="Buka menu"
              >
                <Icon name="menu" className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 shrink-0">
                  {portalLabel}
                </span>
                <span className="text-gray-300 select-none">/</span>
                <span className="text-xs font-semibold text-gray-700 truncate">
                  {activeItem?.label || 'Dashboard'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
              {headerRight && <div className="hidden md:flex items-center">{headerRight}</div>}
              <span className="hidden lg:inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-full">
                <Icon name="clock" className="w-3 h-3" />
                {fmtDate(todayISO())}
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 cursor-pointer"
                  title="Pemberitahuan & Notifikasi"
                >
                  <Icon name="bell" className="w-4 h-4" />
                  {notifCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                      {notifCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="fixed inset-x-3 top-[132px] sm:inset-x-auto sm:absolute sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-[360px] md:w-[380px] max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                      <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gray-900 text-white flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon name="bell" className="w-4 h-4 text-amber-300" />
                          <span className="text-xs sm:text-[13px] font-bold">Pemberitahuan</span>
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold bg-white/15 px-2.5 py-0.5 rounded-full">
                          {notifCount > 0 ? `${notifCount} Baru` : 'Semua dibaca'}
                        </span>
                      </div>
                      <div className="max-h-[55vh] sm:max-h-[360px] overflow-y-auto divide-y divide-gray-100">
                        {notifications.length === 0 && (
                          <div className="px-4 py-8 text-center space-y-1">
                            <p className="text-xs font-semibold text-gray-500">Tidak ada pemberitahuan</p>
                            <p className="text-[11px] text-gray-400">Semua aktivitas dan antrean sudah terkendali.</p>
                          </div>
                        )}
                        {notifications.map((n) => {
                          const isRead = n.unread === false || readSet.has(n.id);
                          const isRejected =
                            n.tone === 'red' ||
                            String(n.title || '').toLowerCase().includes('ditolak') ||
                            String(n.sub || '').toLowerCase().includes('ditolak');
                          return (
                            <div
                              key={n.id}
                              onClick={() => markNotifRead(n.id)}
                              className={`px-3.5 py-3 sm:px-4 flex items-start gap-2.5 sm:gap-3 transition cursor-pointer ${
                                isRead ? 'bg-white hover:bg-gray-50' : 'bg-amber-50/40 hover:bg-amber-50/70'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                  isRead
                                    ? 'bg-gray-300'
                                    : n.tone === 'red'
                                    ? 'bg-rose-500'
                                    : n.tone === 'amber'
                                    ? 'bg-amber-500'
                                    : n.tone === 'blue'
                                    ? 'bg-sky-500'
                                    : 'bg-emerald-500'
                                }`}
                              />
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <span
                                    className={`block text-xs sm:text-[13px] leading-snug ${
                                      isRead ? 'font-semibold text-gray-600' : 'font-bold text-gray-900'
                                    }`}
                                  >
                                    {n.title}
                                  </span>
                                  {!isRead && (
                                    <span className="text-[9px] font-bold uppercase text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0">
                                      Baru
                                    </span>
                                  )}
                                </div>
                                {n.sub && (
                                  <span className="block text-[11px] sm:text-xs text-gray-600 leading-relaxed">{n.sub}</span>
                                )}
                                <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                  {isRead ? (
                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                      ✓ Dibaca
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markNotifRead(n.id);
                                      }}
                                      className="text-[10px] font-bold text-white bg-gray-900 hover:bg-gray-800 px-2 py-0.5 rounded cursor-pointer transition"
                                    >
                                      Baca
                                    </button>
                                  )}
                                  {n.onClick && !isRejected && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markNotifRead(n.id);
                                        n.onClick();
                                        setNotifOpen(false);
                                      }}
                                      className="text-[10px] sm:text-[11px] font-bold text-sky-700 hover:underline px-1.5 py-0.5 rounded hover:bg-sky-50 cursor-pointer transition"
                                    >
                                      Lihat &rsaquo;
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                        {notifCount > 0 ? (
                          <button
                            type="button"
                            onClick={markAllNotifRead}
                            className="text-[11px] sm:text-xs font-bold text-gray-800 hover:underline cursor-pointer"
                          >
                            Tandai semua dibaca
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400">Semua terbaca</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setNotifOpen(false)}
                          className="text-[11px] sm:text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div
                onClick={() => onNavigate && onNavigate('pengaturan_akun')}
                className="flex items-center gap-2 pl-2 border-l border-gray-200 cursor-pointer hover:opacity-80 transition"
                title="Buka Pengaturan Akun"
              >
                <div className={`w-8 h-8 rounded-full ${accent.solidText} overflow-hidden flex items-center justify-center text-[11px] font-bold border border-gray-200/50`}>
                  {currentUser?.avatar && !currentUser.avatar.includes('unsplash.com') ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser?.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials(currentUser?.name || 'U')
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-[11px] font-bold text-gray-900 leading-none">{currentUser?.name || 'User'}</p>
                  <p className="text-[9px] uppercase tracking-wider text-gray-400 mt-1">{roleLabel(currentUser?.role)}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-3 sm:px-5 lg:px-8 py-5 lg:py-6">
            <div className="max-w-[1500px] mx-auto space-y-5">{children}</div>
          </main>
        </div>
        </div>
        <Footer />
      </div>
    </AccentContext.Provider>
  );
}

/* ------------------------------------------------------------------ rekap fee */
const feeLabelOf = (brand) =>
  brandDiscountTypeFor(brand) === 'nominal'
    ? rp(brandDiscountValueFor(brand))
    : `${brandDiscountValueFor(brand)}%`;
const feeMitraLabelOf = (brand, level) =>
  feeTypeFor(brand) === 'nominal' ? rp(brandFeeValue(brand, level)) : `${brandFeeValue(brand, level)}%`;
const feeCompanyLabelOf = (brand, level) => {
  const diff = num(brandDiscountValueFor(brand)) - num(brandFeeValue(brand, level));
  return brandDiscountTypeFor(brand) === 'nominal' ? rp(Math.max(0, diff)) : `${Math.max(0, diff)}%`;
};
const levelOfOrder = (order) => (LEVELS.includes(order?.level) ? order.level : 'DB All');

export function FeeRecapPanel({
  orders = [],
  brands = [],
  title = 'Rekap Fee & Diskon Brand',
  subtitle = 'Fee mitra dipotong saat checkout, diskon pabrik diterima perusahaan. Fee perusahaan = diskon pabrik − fee mitra.'
}) {
  const [brandFilter, setBrandFilter] = useState('all');
  const valid = useMemo(
    () => (orders || []).filter((o) => !o.cancelReason && o.marketingStatus !== MKT.TOLAK),
    [orders]
  );
  const filtered = useMemo(
    () => (brandFilter === 'all' ? valid : valid.filter((o) => o.brand === brandFilter)),
    [valid, brandFilter]
  );
  const feeOf = (o) => num(o.feeMitraNominal) || num(o.discountNominal);
  const brandDiscOf = (o) => num(o.brandDiscountNominal);
  const companyOf = (o) => Math.max(0, num(o.feeCompanyNominal) || brandDiscOf(o) - feeOf(o));

  const totals = useMemo(
    () => ({
      count: filtered.length,
      qty: sumBy(filtered, (o) => o.qty),
      omzet: sumBy(filtered, (o) => o.subtotal),
      feeMitra: sumBy(filtered, feeOf),
      brandDiscount: sumBy(filtered, brandDiscOf),
      feeCompany: sumBy(filtered, companyOf)
    }),
    [filtered]
  );

  const brandRows = useMemo(() => {
    const map = new Map();
    filtered.forEach((o) => {
      const key = o.brand || 'Lainnya';
      const row = map.get(key) || {
        brand: key,
        count: 0,
        qty: 0,
        omzet: 0,
        feeMitra: 0,
        brandDiscount: 0,
        feeCompany: 0
      };
      row.count += 1;
      row.qty += num(o.qty);
      row.omzet += num(o.subtotal);
      row.feeMitra += feeOf(o);
      row.brandDiscount += brandDiscOf(o);
      row.feeCompany += companyOf(o);
      map.set(key, row);
    });
    return [...map.values()].sort((a, b) => b.feeMitra - a.feeMitra);
  }, [filtered]);

  const levelRows = useMemo(
    () =>
      LEVELS.map((level) => {
        const rows = filtered.filter((o) => levelOfOrder(o) === level);
        return {
          level,
          count: rows.length,
          feeMitra: sumBy(rows, feeOf),
          feeCompany: sumBy(rows, companyOf)
        };
      }),
    [filtered]
  );

  const pagination = usePagination(filtered, 10);

  return (
    <div className="space-y-4">
      <PageHead
        title={title}
        desc={subtitle}
        actions={
          <Select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="min-w-[180px]">
            <option value="all">Semua Brand</option>
            {[...new Set((orders || []).map((o) => o.brand).filter(Boolean))].map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        }
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Omzet Pesanan" value={rp(totals.omzet)} sub={`${totals.count} pesanan · ${totals.qty} pcs`} icon="receipt" tone="gray" />
        <MetricCard label="Fee Mitra (dipotong)" value={rp(totals.feeMitra)} sub="Mengurangi harga varian saat checkout" icon="users" tone="emerald" />
        <MetricCard label="Diskon Pabrik" value={rp(totals.brandDiscount)} sub="Diterima dari brand / pabrik" icon="box" tone="amber" />
        <MetricCard label="Fee Perusahaan" value={rp(totals.feeCompany)} sub="Diskon pabrik − fee mitra" icon="wallet" tone="red" />
      </div>

      <Card title="Rekap per Brand" subtitle="Total fee mitra, diskon pabrik, dan fee perusahaan tiap brand">
        {brandRows.length ? (
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={TH}>Brand</th>
                <th className={`${TH} text-right`}>Pesanan</th>
                <th className={`${TH} text-right`}>Qty</th>
                <th className={`${TH} text-right`}>Omzet</th>
                <th className={`${TH} text-right`}>Fee Mitra</th>
                <th className={`${TH} text-right`}>Diskon Pabrik</th>
                <th className={`${TH} text-right`}>Fee Perusahaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brandRows.map((row) => (
                <tr key={row.brand}>
                  <td className={`${TD} font-semibold text-gray-900`}>{row.brand}</td>
                  <td className={`${TD} text-right`}>{row.count}</td>
                  <td className={`${TD} text-right`}>{row.qty} pcs</td>
                  <td className={`${TD} text-right`}>{rp(row.omzet)}</td>
                  <td className={`${TD} text-right font-semibold text-emerald-700`}>{rp(row.feeMitra)}</td>
                  <td className={`${TD} text-right text-amber-700`}>{rp(row.brandDiscount)}</td>
                  <td className={`${TD} text-right font-semibold`}>{rp(row.feeCompany)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <EmptyState title="Belum ada pesanan" desc="Rekap fee muncul setelah pesanan mitra dibuat." icon="receipt" />
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Fee Mitra per Level" subtitle="Total fee mitra yang dipotong dari harga varian">
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={TH}>Level</th>
                <th className={`${TH} text-right`}>Pesanan</th>
                <th className={`${TH} text-right`}>Fee Mitra</th>
                <th className={`${TH} text-right`}>Fee Perusahaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {levelRows.map((row) => (
                <tr key={row.level}>
                  <td className={TD}>
                    <Badge tone={levelTone(row.level)}>{row.level}</Badge>
                  </td>
                  <td className={`${TD} text-right`}>{row.count}</td>
                  <td className={`${TD} text-right font-semibold text-emerald-700`}>{rp(row.feeMitra)}</td>
                  <td className={`${TD} text-right`}>{rp(row.feeCompany)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>

        <Card title="Konfigurasi Brand" subtitle="Diskon pabrik & fee mitra yang diinput di menu Brand">
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={TH}>Brand</th>
                <th className={`${TH} text-right`}>Diskon Pabrik</th>
                {LEVELS.map((level) => (
                  <th key={level} className={`${TH} text-right`}>
                    {level}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(brands || []).map((b) => (
                <tr key={b.id || b.name}>
                  <td className={`${TD} font-semibold text-gray-900`}>
                    {b.name}
                    <span className="block text-[10px] text-gray-400">
                      Fee perusahaan {feeCompanyLabelOf(b, 'DB All')} / pcs (DB All)
                    </span>
                  </td>
                  <td className={`${TD} text-right`}>{feeLabelOf(b)}</td>
                  {LEVELS.map((level) => (
                    <td key={level} className={`${TD} text-right`}>
                      {feeMitraLabelOf(b, level)}
                    </td>
                  ))}
                </tr>
              ))}
              {!brands?.length && (
                <tr>
                  <td className={`${TD} text-gray-400`} colSpan={6}>
                    Belum ada brand.
                  </td>
                </tr>
              )}
            </tbody>
          </TableWrap>
        </Card>
      </div>

      <Card title="Rincian Fee per Pesanan" subtitle={`${pagination.total} pesanan`}>
        {filtered.length ? (
          <>
            <TableWrap>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={TH}>Invoice</th>
                  <th className={TH}>Mitra</th>
                  <th className={TH}>Brand / Produk</th>
                  <th className={`${TH} text-right`}>Qty</th>
                  <th className={`${TH} text-right`}>Omzet</th>
                  <th className={`${TH} text-right`}>Fee Mitra</th>
                  <th className={`${TH} text-right`}>Diskon Pabrik</th>
                  <th className={`${TH} text-right`}>Fee Perusahaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagination.rows.map((o) => (
                  <tr key={o.id || o.invoice}>
                    <td className={TD}>
                      <p className="font-semibold text-gray-900">{o.invoice}</p>
                      <p className="text-[10px] text-gray-400">{fmtDate(o.date)}</p>
                    </td>
                    <td className={TD}>
                      <p className="font-semibold text-gray-800">{o.mitraName}</p>
                      <p className="text-[10px] text-gray-400">{o.level}</p>
                    </td>
                    <td className={TD}>
                      <p className="font-semibold text-gray-800">{o.produk}</p>
                      <p className="text-[10px] text-gray-400">{o.brand}</p>
                    </td>
                    <td className={`${TD} text-right`}>{o.qty}</td>
                    <td className={`${TD} text-right`}>{rp(o.subtotal)}</td>
                    <td className={`${TD} text-right font-semibold text-emerald-700`}>{rp(feeOf(o))}</td>
                    <td className={`${TD} text-right text-amber-700`}>{rp(brandDiscOf(o))}</td>
                    <td className={`${TD} text-right font-semibold`}>{rp(companyOf(o))}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </>
        ) : (
          <EmptyState title="Belum ada data fee" desc="Pilih brand lain atau buat pesanan terlebih dahulu." icon="receipt" />
        )}
      </Card>
    </div>
  );
}

