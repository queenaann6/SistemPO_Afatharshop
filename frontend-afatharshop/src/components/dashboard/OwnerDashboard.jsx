import React, { useState, useMemo } from 'react';
import { openInvoicePrintTab } from '../../utils/printInvoice';

/* ============================================================
   HELPERS & FORMATTERS
   ============================================================ */
const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISO = (iso) => new Date(iso + 'T00:00:00');
const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISO(d);
};
const diffDays = (a, b) => Math.round((parseISO(a) - parseISO(b)) / 86400000);
const fmtDate = (iso) =>
  parseISO(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtAgo = (ts) => {
  const h = Math.floor((Date.now() - ts) / 3600000);
  if (h < 1) return 'baru saja';
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
};
const normPhone = (p) => {
  let s = String(p || '').replace(/\D/g, '');
  if (s.startsWith('0')) s = '62' + s.slice(1);
  else if (s.startsWith('8')) s = '62' + s;
  return s;
};

const downloadCSV = (name, rows) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\n')], {
    type: 'text/csv;charset=utf-8;'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const isPaid = (s) => s === 'ACC' || s === 'Lunas';
const orderStatus = (o) => (isPaid(o.pelunasanStatus) ? 'Lunas' : isPaid(o.dpStatus) ? 'Sudah DP' : 'Belum DP');
const paidAmount = (o) => (isPaid(o.dpStatus) ? o.dpNominal : 0) + (isPaid(o.pelunasanStatus) ? o.pelunasanNominal : 0);

/* Tahap Alur Pre Order */
const STAGES = [
  { id: 'baru', label: 'Pesanan Baru' },
  { id: 'dp', label: 'Menunggu DP' },
  { id: 'pelunasan', label: 'Pelunasan' },
  { id: 'atur', label: 'Atur Kurir' },
  { id: 'tagihan', label: 'Tagihan Ongkir' },
  { id: 'siap', label: 'Siap Kirim' },
  { id: 'selesai', label: 'Selesai' }
];

const orderStage = (o) => {
  if (o.dpStatus === 'Menunggu Verifikasi') return 'dp';
  if (!isPaid(o.dpStatus)) return 'baru';
  if (!isPaid(o.pelunasanStatus)) return 'pelunasan';
  if (o.ship === 'dikirim') return 'selesai';
  if (o.ship !== 'diatur') return 'atur';
  if (o.ongkirStatus !== 'Lunas') return 'tagihan';
  return 'siap';
};
const stageLabel = (id) => STAGES.find((s) => s.id === id)?.label || id;
const inScope = (scope, produk) => scope === 'all' || produk === scope;

const poInfo = (close, today) => {
  const d = diffDays(close, today);
  if (d < 0) return { tone: 'gray', label: 'PO Ditutup' };
  if (d === 0) return { tone: 'red', label: 'PO Tutup Hari Ini' };
  if (d <= 3) return { tone: 'amber', label: `PO Tutup ${d} Hari Lagi` };
  return { tone: 'emerald', label: `PO Buka s/d ${fmtDate(close)}` };
};

const PRODUCT_COLORS = [
  { dot: 'bg-emerald-600', bar: 'border-emerald-600', soft: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { dot: 'bg-blue-600', bar: 'border-blue-600', soft: 'bg-blue-50 text-blue-800 border-blue-200' },
  { dot: 'bg-amber-500', bar: 'border-amber-500', soft: 'bg-amber-50 text-amber-800 border-amber-200' },
  { dot: 'bg-purple-600', bar: 'border-purple-600', soft: 'bg-purple-50 text-purple-800 border-purple-200' },
  { dot: 'bg-rose-500', bar: 'border-rose-500', soft: 'bg-rose-50 text-rose-800 border-rose-200' }
];

const billItems = (o, st) => {
  const items = [];
  if (!isPaid(o.dpStatus) && o.dpStatus !== 'Menunggu Verifikasi') {
    items.push({ kind: 'DP', amount: o.dpNominal, due: addDays(o.checkoutDate, st.dpDueDays), locked: false });
  }
  if (!isPaid(o.pelunasanStatus) && o.pelunasanStatus !== 'Menunggu Verifikasi') {
    items.push({
      kind: 'Pelunasan',
      amount: o.pelunasanNominal,
      due: addDays(o.checkoutDate, st.pelunasanDueDays),
      locked: !isPaid(o.dpStatus)
    });
  }
  if (o.ongkirStatus !== 'Lunas' && o.ongkirStatus !== 'Menunggu Verifikasi') {
    items.push({
      kind: 'Ongkir',
      amount: o.ongkir,
      due: addDays(o.checkoutDate, st.pelunasanDueDays),
      locked: !isPaid(o.pelunasanStatus)
    });
  }
  return items;
};

const dueInfo = (due, today) => {
  const d = diffDays(due, today);
  if (d < 0) return { tone: 'red', label: `Terlambat ${-d} hari`, overdue: -d, isDue: true };
  if (d === 0) return { tone: 'amber', label: 'Jatuh tempo hari ini', overdue: 0, isDue: true };
  if (d <= 2) return { tone: 'amber', label: `${d} hari lagi`, overdue: 0, isDue: false };
  return { tone: 'gray', label: `${d} hari lagi`, overdue: 0, isDue: false };
};

const expectedNominal = (type, o) =>
  !o ? null : type === 'DP' ? o.dpNominal : type === 'Pelunasan' ? o.pelunasanNominal : type === 'Ongkir' ? o.ongkir : null;

/* ============================================================
   UI ATOMS & BADGES
   ============================================================ */
const TONES = {
  emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  red: 'bg-rose-50 text-rose-700 border border-rose-200',
  blue: 'bg-sky-50 text-sky-700 border border-sky-200',
  gray: 'bg-gray-100 text-gray-600 border border-gray-200'
};

const statusTone = (s) =>
  isPaid(s) ? 'emerald' : s === 'Menunggu Verifikasi' ? 'blue' : s === 'Ditolak' || s === 'Belum DP' ? 'red' : s === 'Sudah DP' ? 'amber' : 'gray';

const Badge = ({ tone = 'gray', children }) => (
  <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${TONES[tone]}`}>
    {children}
  </span>
);

const Switch = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="inline-flex items-center gap-2 text-xs text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
  >
    <span className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#0F6B4F]' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </span>
    {label && <span>{label}</span>}
  </button>
);

const Segmented = ({ value, onChange, options }) => (
  <div className="inline-flex p-1 bg-gray-100 rounded-lg text-xs gap-0.5">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={`px-3 py-1.5 rounded-md font-medium transition-all ${
          value === o.value ? 'bg-white text-[#0F6B4F] shadow-xs font-semibold' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Card = ({ title, action, children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden ${className}`}>
    {(title || action) && (
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap bg-gray-50/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">{title}</h3>
        {action}
      </div>
    )}
    {children}
  </div>
);

const MetricTile = ({ label, value, sub, hint, tone = 'text-gray-900', badge }) => (
  <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        {badge}
      </div>
      <p className={`text-2xl font-bold mt-1.5 tracking-tight ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
    {hint && <p className="text-[11px] text-gray-400 mt-2 pt-2 border-t border-gray-100">{hint}</p>}
  </div>
);

const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-xl' : 'max-w-md'} p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl`}>
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);

const TH = 'px-4 py-3 font-semibold text-gray-600 uppercase text-[10px] tracking-wider';
const TD = 'px-4 py-3 text-xs';
const INPUT =
  'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#0F6B4F] focus:border-[#0F6B4F] transition-all';
const BTN_GREEN = 'bg-[#0F6B4F] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#0c563f] transition-all shadow-xs cursor-pointer';
const BTN_OUTLINE =
  'border border-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:border-[#0F6B4F] hover:text-[#0F6B4F] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

/* ============================================================
   STRUKTUR MENU
   ============================================================ */
const MENU = [
  { id: 'dashboard', label: 'Executive Dashboard', title: 'Ringkasan Eksekutif & Omzet PO' },
  { id: 'reminder', label: 'Tagihan & Reminder WA', title: 'Piutang & Reminder Jatuh Tempo' },
  { id: 'user', label: 'Kredit & Saldo Mitra', title: 'Analisis Mitra, Piutang & Deposit' },
  {
    group: 'po',
    label: 'Data Pre Order',
    children: [
      { id: 'po_brand', label: 'Rekap Per Brand', title: 'Monitoring Invoice per Brand' },
      { id: 'po_produk', label: 'Rekap Per Produk', title: 'Monitoring Invoice per Produk' },
      { id: 'po_mitra', label: 'Rekap Per Mitra', title: 'Monitoring Invoice per Mitra' }
    ]
  },
  {
    group: 'bayar',
    label: 'Pusat Approval',
    children: [
      { id: 'acc_dp', label: 'Verifikasi DP', title: 'Verifikasi Down Payment (DP)' },
      { id: 'acc_pelunasan', label: 'Verifikasi Pelunasan', title: 'Verifikasi Pelunasan Sisa Tagihan' },
      { id: 'acc_deposit', label: 'Deposit Saldo', title: 'Verifikasi Penambahan Deposit Mitra' },
      { id: 'input_bukti', label: 'Input Manual Bukti', title: 'Pencatatan Pembayaran Manual' }
    ]
  },
  { id: 'ledger', label: 'Buku Kas Masuk', title: 'Buku Kas & Riwayat Aliran Dana' },
  { id: 'ekspedisi', label: 'Logistik & Ongkir', title: 'Manajemen Ongkir & Status Kurir' },
  { id: 'pengaturan', label: 'Konfigurasi Bisnis', title: 'Rekening Bank, Batas Tempo, & Master Produk' }
];

const ALL_MENU = MENU.flatMap((m) => (m.children ? m.children : [m]));
const PAY_MENU_BY_CATEGORY = { DP: 'acc_dp', Pelunasan: 'acc_pelunasan', Ongkir: 'ekspedisi' };

/* ============================================================
   SUB-KOMPONEN: GROUPED ORDERS
   ============================================================ */
function GroupedOrders({ groups, expanded, setExpanded, prefix, onInvoice }) {
  return (
    <div className="space-y-3">
      {groups.map(({ key, list }) => {
        const id = `${prefix}:${key}`;
        const open = expanded[id] ?? true;
        const pcs = list.reduce((s, o) => s + o.qty, 0);
        const total = list.reduce((s, o) => s + o.nilai, 0);
        const sisa = total - list.reduce((s, o) => s + paidAmount(o), 0);
        return (
          <div key={key} className="bg-white rounded-xl border border-gray-200/90 overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => setExpanded({ ...expanded, [id]: !open })}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{open ? '▼' : '▶'}</span>
                <span className="text-xs font-bold text-gray-800">{key}</span>
                <span className="text-xs text-gray-500">
                  ({pcs} pcs · Total: {rp(total)})
                </span>
              </div>
              <div className="text-xs">
                {sisa > 0 ? (
                  <span className="text-rose-600 font-semibold">Piutang: {rp(sisa)}</span>
                ) : (
                  <span className="text-emerald-600 font-medium">Lunas Seluruhnya</span>
                )}
              </div>
            </button>
            {open && (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-2.5 font-semibold text-[10px] uppercase">Invoice</th>
                      <th className={TH}>Nama Mitra</th>
                      <th className={TH}>Item Produk</th>
                      <th className={`${TH} text-center`}>Qty</th>
                      <th className={TH}>Nilai Pesanan</th>
                      <th className={`${TH} text-center`}>Tahap Operasional</th>
                      <th className="px-5 py-2.5 font-semibold text-right text-[10px] uppercase">Status Finansial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {list.map((o) => (
                      <tr key={o.invoice} className="hover:bg-gray-50/80">
                        <td className="px-5 py-3 font-medium">
                          <button type="button" onClick={() => onInvoice(o)} className="text-blue-600 hover:underline">
                            {o.invoice} ↗
                          </button>
                        </td>
                        <td className={TD}>{o.name} <span className="text-gray-400">({o.mitra})</span></td>
                        <td className={TD}>{o.produk} {o.varian}</td>
                        <td className={`${TD} text-center`}>{o.qty}</td>
                        <td className={`${TD} font-semibold text-gray-900`}>{rp(o.nilai)}</td>
                        <td className={`${TD} text-center`}><Badge tone="gray">{stageLabel(orderStage(o))}</Badge></td>
                        <td className="px-5 py-3 text-right">
                          <Badge tone={statusTone(orderStatus(o))}>{orderStatus(o)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   KOMPONEN UTAMA DASHBOARD
   ============================================================ */
export default function OwnerFinanceDashboard({
  currentUser,
  onNavigateStore,
  onLogout,
  onApprovePayment,
  onRejectPayment,
  onUpdateBankAccounts,
  onUpdateCouriers,
  bankAccounts
}) {
  const todayISO = toISO(new Date());
  const actor = currentUser?.name || 'Owner';

  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({ po: true, bayar: true });
  const [toastMsg, setToastMsg] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [expanded, setExpanded] = useState({});

  // Scope dan Tab
  const [scope, setScope] = useState('all');
  const [stageTab, setStageTab] = useState('baru');
  const [stageSearch, setStageSearch] = useState('');
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ name: '', brand: '', hpp: '', poClose: addDays(todayISO, 14) });

  // Konfigurasi
  const [settings, setSettings] = useState({
    dpDueDays: 3,
    pelunasanDueDays: 14,
    shopName: 'Afathar Shop',
    senderName: 'Owner Afathar Shop'
  });

  // Reminder WhatsApp
  const [waMode, setWaMode] = useState('invoice');
  const [waTone, setWaTone] = useState('auto');
  const [previewBeforeSend, setPreviewBeforeSend] = useState(true);
  const [offsetDeposit, setOffsetDeposit] = useState(true);
  const [reminderOff, setReminderOff] = useState({});
  const [reminderFilter, setReminderFilter] = useState('all');
  const [waModal, setWaModal] = useState(null);
  const [reminderHistory, setReminderHistory] = useState([
    { id: 'h-1', ts: Date.now() - 26 * 3600 * 1000, mode: 'invoice', key: 'INV-0002', name: 'Siti Rahma', label: 'INV-0002 · DP' }
  ]);

  // Master Data
  const usersList = [
    { id: 1, name: 'Budi Santoso', level: 'DB All', phone: '081234567801', city: 'Bandung' },
    { id: 2, name: 'Siti Rahma', level: 'Agen', phone: '081234567802', city: 'Surabaya' },
    { id: 3, name: 'Dewi Lestari', level: 'Reseller', phone: '081234567803', city: 'Medan' },
    { id: 4, name: 'HENI', level: 'DB All', phone: '081219991888', city: 'Bekasi' }
  ];

  const [productsList, setProductsList] = useState([
    { name: 'Gamis Almira', brand: 'Hanara', hpp: 110000, poClose: todayISO },
    { name: 'Tunik Alma', brand: 'Nusaku', hpp: 105000, poClose: addDays(todayISO, 5) },
    { name: 'Greenism Senada', brand: 'Greenism', hpp: 120000, poClose: addDays(todayISO, -3) }
  ]);

  const [ordersList, setOrdersList] = useState([
    {
      invoice: 'INV-0001', name: 'Budi Santoso', mitra: 'DB All', brand: 'Hanara',
      produk: 'Gamis Almira', varian: 'Dusty Pink/M', qty: 5, nilai: 875000,
      dpNominal: 437500, dpStatus: 'ACC',
      pelunasanNominal: 437500, pelunasanStatus: 'Belum Pelunasan',
      ongkir: 45000, ekspedisi: 'JNE Trucking', ongkirStatus: 'Lunas', ship: 'belum',
      checkoutDate: daysAgo(4)
    },
    {
      invoice: 'INV-0002', name: 'Siti Rahma', mitra: 'Agen', brand: 'Hanara',
      produk: 'Gamis Almira', varian: 'Navy/L', qty: 2, nilai: 400000,
      dpNominal: 200000, dpStatus: 'Menunggu Transfer',
      pelunasanNominal: 200000, pelunasanStatus: 'Belum Pelunasan',
      ongkir: 30000, ekspedisi: 'J&T Cargo', ongkirStatus: 'Menunggu', ship: 'belum',
      checkoutDate: daysAgo(4)
    },
    {
      invoice: 'INV-0003', name: 'Dewi Lestari', mitra: 'Reseller', brand: 'Nusaku',
      produk: 'Tunik Alma', varian: 'Cokelat/M', qty: 3, nilai: 495000,
      dpNominal: 198000, dpStatus: 'ACC',
      pelunasanNominal: 297000, pelunasanStatus: 'Menunggu Verifikasi',
      pelunasanProof: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80',
      ongkir: 35000, ekspedisi: 'JNE', ongkirStatus: 'Menunggu Verifikasi', ship: 'belum',
      checkoutDate: daysAgo(5)
    },
    {
      invoice: 'INV-0004', name: 'Budi Santoso', mitra: 'DB All', brand: 'Greenism',
      produk: 'Greenism Senada', varian: 'Dad Panjang XL', qty: 10, nilai: 1800000,
      dpNominal: 900000, dpStatus: 'ACC',
      pelunasanNominal: 900000, pelunasanStatus: 'ACC',
      ongkir: 60000, ekspedisi: 'Dakota Cargo', ongkirStatus: 'Menunggu', ship: 'diatur',
      checkoutDate: daysAgo(12)
    },
    {
      invoice: 'INV-0005', name: 'Siti Rahma', mitra: 'Agen', brand: 'Hanara',
      produk: 'Gamis Almira', varian: 'Hitam/M', qty: 4, nilai: 800000,
      dpNominal: 400000, dpStatus: 'ACC',
      pelunasanNominal: 400000, pelunasanStatus: 'ACC',
      ongkir: 40000, ekspedisi: 'JNE Trucking', ongkirStatus: 'Lunas', ship: 'belum',
      checkoutDate: daysAgo(9)
    },
    {
      invoice: 'INV-0006', name: 'Dewi Lestari', mitra: 'Reseller', brand: 'Greenism',
      produk: 'Greenism Senada', varian: 'Dad Panjang L', qty: 6, nilai: 1080000,
      dpNominal: 540000, dpStatus: 'ACC',
      pelunasanNominal: 540000, pelunasanStatus: 'ACC',
      ongkir: 50000, ekspedisi: 'J&T Cargo', ongkirStatus: 'Lunas', ship: 'diatur',
      checkoutDate: daysAgo(11)
    },
    {
      invoice: 'INV-0007', name: 'Budi Santoso', mitra: 'DB All', brand: 'Greenism',
      produk: 'Greenism Senada', varian: 'Dad Panjang XL', qty: 3, nilai: 540000,
      dpNominal: 270000, dpStatus: 'Menunggu Verifikasi',
      dpProof: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80',
      pelunasanNominal: 270000, pelunasanStatus: 'Belum Pelunasan',
      ongkir: 25000, ekspedisi: 'Dakota Cargo', ongkirStatus: 'Menunggu', ship: 'belum',
      checkoutDate: daysAgo(1)
    },
    {
      invoice: 'INV-0008', name: 'Siti Rahma', mitra: 'Agen', brand: 'Nusaku',
      produk: 'Tunik Alma', varian: 'Navy/L', qty: 2, nilai: 330000,
      dpNominal: 132000, dpStatus: 'ACC',
      pelunasanNominal: 198000, pelunasanStatus: 'ACC',
      ongkir: 30000, ekspedisi: 'JNE', ongkirStatus: 'Lunas', ship: 'dikirim',
      checkoutDate: daysAgo(20)
    }
  ]);

  const [depositHistory, setDepositHistory] = useState([
    {
      id: 'dep-1', date: daysAgo(2), name: 'Siti Rahma', mitra: 'Agen', invoice: '-', nominal: 500000, bank: 'Mandiri',
      proof: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80',
      status: 'ACC'
    }
  ]);

  const [ledger, setLedger] = useState([
    { id: 'l-1', date: daysAgo(5), type: 'DP', ref: 'INV-0003', name: 'Dewi Lestari', bank: 'BCA', nominal: 198000, by: 'System' },
    { id: 'l-2', date: daysAgo(4), type: 'DP', ref: 'INV-0001', name: 'Budi Santoso', bank: 'BCA', nominal: 437500, by: 'System' },
    { id: 'l-3', date: daysAgo(2), type: 'Deposit', ref: '-', name: 'Siti Rahma', bank: 'Mandiri', nominal: 500000, by: 'System' },
    { id: 'l-4', date: daysAgo(1), type: 'Ongkir', ref: 'INV-0001', name: 'Budi Santoso', bank: 'BCA', nominal: 45000, by: 'System' }
  ]);
  const [ledgerFilter, setLedgerFilter] = useState('Semua');

  const [bankAccountsList, setBankAccountsList] = useState([
    { id: 'bca', bank: 'BCA', accountNo: '1234567890', holder: 'PT Afathar Makmur / Owner', active: true },
    { id: 'mandiri', bank: 'Mandiri', accountNo: '133-00-2998801', holder: 'Afathar Shop Official', active: true },
    { id: 'bri', bank: 'BRI', accountNo: '987654312156', holder: 'Afathar Shop Official', active: true }
  ]);

  const [courierList, setCourierList] = useState([
    { id: 'jne', name: 'JNE Trucking (JTR)', active: true, note: 'Koli besar volume tinggi' },
    { id: 'jt', name: 'J&T Cargo', active: true, note: 'Ekspedisi retail & koli menengah' },
    { id: 'dakota', name: 'Dakota Cargo', active: true, note: 'Spesialis kiriman antar pulau' }
  ]);

  const [previewProofModal, setPreviewProofModal] = useState(null);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [newBankForm, setNewBankForm] = useState({ bank: 'BCA', accountNo: '', holder: 'Afathar Shop Official' });
  const [isAddCourierModalOpen, setIsAddCourierModalOpen] = useState(false);
  const [newCourierForm, setNewCourierForm] = useState({ name: '', note: '' });

  const [inputBuktiForm, setInputBuktiForm] = useState({
    userName: 'Budi Santoso',
    paymentType: 'Pelunasan',
    invoiceNo: 'INV-0001',
    nominal: 437500,
    transferDate: todayISO,
    targetBank: 'BCA 1234567890',
    proofPreviewUrl: ''
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  /* ============================================================
     CALCULATED METRICS (EXECUTIVE SUMMARY)
     ============================================================ */
  const depositByUser = useMemo(() => {
    const m = {};
    depositHistory.forEach((d) => {
      if (d.status === 'ACC') m[d.name] = (m[d.name] || 0) + d.nominal;
    });
    return m;
  }, [depositHistory]);

  const payItem = (o, category) => ({
    id: `${o.invoice}-${category}`,
    category,
    user: o.name,
    invoice: o.invoice,
    produk: o.produk,
    nominal: category === 'DP' ? o.dpNominal : category === 'Pelunasan' ? o.pelunasanNominal : o.ongkir,
    courier: o.ekspedisi,
    proof: category === 'Pelunasan' ? o.pelunasanProof : category === 'DP' ? o.dpProof : o.ongkirProof
  });

  const pendingVerifications = useMemo(() => {
    const list = [];
    ordersList.forEach((o) => {
      if (o.dpStatus === 'Menunggu Verifikasi') list.push(payItem(o, 'DP'));
      if (o.pelunasanStatus === 'Menunggu Verifikasi') list.push(payItem(o, 'Pelunasan'));
      if (o.ongkirStatus === 'Menunggu Verifikasi') list.push(payItem(o, 'Ongkir'));
    });
    return list;
  }, [ordersList]);

  const billingRows = useMemo(
    () =>
      ordersList.map((o) => {
        const items = billItems(o, settings);
        const current = items.filter((i) => !i.locked);
        const upcoming = items.filter((i) => i.locked);
        const sum = (a) => a.reduce((s, i) => s + i.amount, 0);
        const earliestDue = current.length ? current.map((i) => i.due).sort()[0] : null;
        return {
          order: o,
          current,
          upcoming,
          currentTotal: sum(current),
          upcomingTotal: sum(upcoming),
          earliestDue,
          due: earliestDue ? dueInfo(earliestDue, todayISO) : null
        };
      }),
    [ordersList, settings, todayISO]
  );

  const dueRows = useMemo(
    () => billingRows.filter((r) => r.current.length).sort((a, b) => a.earliestDue.localeCompare(b.earliestDue)),
    [billingRows]
  );

  const mitraRows = useMemo(() => {
    const map = {};
    billingRows.forEach((r) => {
      const n = r.order.name;
      if (!map[n]) map[n] = { name: n, mitra: r.order.mitra, rows: [], currentTotal: 0, upcomingTotal: 0 };
      map[n].rows.push(r);
      map[n].currentTotal += r.currentTotal;
      map[n].upcomingTotal += r.upcomingTotal;
    });
    return Object.values(map)
      .filter((m) => m.currentTotal > 0)
      .map((m) => {
        const deposit = depositByUser[m.name] || 0;
        const dues = m.rows.filter((r) => r.earliestDue).map((r) => r.earliestDue).sort();
        const earliestDue = dues[0];
        return {
          ...m,
          phone: usersList.find((u) => u.name === m.name)?.phone,
          deposit,
          offset: Math.min(deposit, m.currentTotal),
          earliestDue,
          due: earliestDue ? dueInfo(earliestDue, todayISO) : null
        };
      })
      .sort((a, b) => (a.earliestDue || '').localeCompare(b.earliestDue || ''));
  }, [billingRows, depositByUser, todayISO]);

  const invoiceReminders = useMemo(
    () =>
      dueRows.map((r) => ({
        key: r.order.invoice,
        target: { mode: 'invoice', invoice: r.order.invoice },
        name: r.order.name,
        mitra: r.order.mitra,
        produk: r.order.produk,
        title: r.order.invoice,
        kinds: r.current.map((i) => i.kind).join(' + '),
        sub: `${r.order.produk} ${r.order.varian} · ${r.order.qty} pcs`,
        amount: r.currentTotal,
        upcoming: r.upcomingTotal,
        due: r.due,
        dueDate: r.earliestDue
      })),
    [dueRows]
  );

  const totalReminders = useMemo(
    () =>
      mitraRows.map((m) => ({
        key: m.name,
        target: { mode: 'total', name: m.name },
        name: m.name,
        mitra: m.mitra,
        title: m.name,
        kinds: `${m.rows.filter((r) => r.current.length).length} invoice`,
        sub: m.deposit > 0 && offsetDeposit ? `Saldo deposit ${rp(m.deposit)} dipotong` : 'Semua tagihan berjalan',
        amount: m.currentTotal - (offsetDeposit ? m.offset : 0),
        upcoming: m.upcomingTotal,
        due: m.due,
        dueDate: m.earliestDue
      })),
    [mitraRows, offsetDeposit]
  );

  const reminderList = waMode === 'invoice' ? invoiceReminders : totalReminders;
  const overdueCount = dueRows.filter((r) => r.due.isDue).length;

  const sOrders = useMemo(() => ordersList.filter((o) => inScope(scope, o.produk)), [ordersList, scope]);
  const sDueRows = useMemo(() => dueRows.filter((r) => inScope(scope, r.order.produk)), [dueRows, scope]);
  const sPending = useMemo(() => pendingVerifications.filter((p) => inScope(scope, p.produk)), [pendingVerifications, scope]);

  // Executive Metrics
  const execMetrics = useMemo(() => {
    const hppOf = (o) => (productsList.find((p) => p.name === o.produk)?.hpp || 0) * o.qty;
    const dpOrders = sOrders.filter((o) => isPaid(o.dpStatus));
    const totalOmzet = sOrders.reduce((s, o) => s + o.nilai, 0);
    const sudahMasuk = sOrders.reduce((s, o) => s + paidAmount(o), 0);
    const totalHpp = sOrders.reduce((s, o) => s + hppOf(o), 0);
    const estProfit = totalOmzet - totalHpp;
    const grossMargin = totalOmzet > 0 ? ((estProfit / totalOmzet) * 100).toFixed(1) : 0;

    return {
      trx: sOrders.length,
      totalOmzet,
      mitraCount: new Set(sOrders.map((o) => o.name)).size,
      totalPcs: sOrders.reduce((s, o) => s + o.qty, 0),
      dpSales: dpOrders.reduce((s, o) => s + o.nilai, 0),
      estProfit,
      grossMargin,
      sudahMasuk,
      piutangSisa: Math.max(0, totalOmzet - sudahMasuk),
      pendingCount: sPending.length,
      overdueTotal: sDueRows.filter((r) => r.due.isDue).reduce((s, r) => s + r.currentTotal, 0),
      overdueCount: sDueRows.filter((r) => r.due.isDue).length,
      cashCollectionRate: totalOmzet ? Math.round((sudahMasuk / totalOmzet) * 100) : 0
    };
  }, [sOrders, sPending, sDueRows, productsList]);

  const totalDeposit = useMemo(() => Object.values(depositByUser).reduce((s, v) => s + v, 0), [depositByUser]);

  const aging = useMemo(() => {
    const b = [
      { label: 'Belum Jatuh Tempo', amount: 0, count: 0, bar: 'bg-emerald-500' },
      { label: 'Terlambat 1–3 Hari', amount: 0, count: 0, bar: 'bg-amber-400' },
      { label: 'Terlambat 4–7 Hari', amount: 0, count: 0, bar: 'bg-orange-500' },
      { label: 'Macet (> 7 Hari)', amount: 0, count: 0, bar: 'bg-rose-600' }
    ];
    sDueRows.forEach((r) => {
      const d = r.due;
      const i = !d.isDue ? 0 : d.overdue <= 3 ? 1 : d.overdue <= 7 ? 2 : 3;
      b[i].amount += r.currentTotal;
      b[i].count += 1;
    });
    return b;
  }, [sDueRows]);

  const stageCounts = useMemo(() => {
    const c = {};
    STAGES.forEach((s) => (c[s.id] = 0));
    sOrders.forEach((o) => (c[orderStage(o)] += 1));
    return c;
  }, [sOrders]);

  const stageRows = sOrders.filter((o) => {
    if (orderStage(o) !== stageTab) return false;
    const q = stageSearch.trim().toLowerCase();
    return !q || `${o.invoice} ${o.name} ${o.mitra} ${o.produk} ${o.varian}`.toLowerCase().includes(q);
  });

  const activeProduct = productsList.find((p) => p.name === scope);
  const productColor = (name) => {
    const i = productsList.findIndex((p) => p.name === name);
    return i < 0 ? null : PRODUCT_COLORS[i % PRODUCT_COLORS.length];
  };

  /* ============================================================
     MUTASI DATA LOGIKA
     ============================================================ */
  const patchOrder = (invoice, patch) =>
    setOrdersList((prev) => prev.map((o) => (o.invoice === invoice ? { ...o, ...patch } : o)));

  const addLedger = (e) =>
    setLedger((prev) => [
      { id: 'l-' + Date.now() + Math.random().toString(36).slice(2, 6), date: todayISO, by: actor, bank: '-', ...e },
      ...prev
    ]);

  const approvePayment = (p) => {
    const patch =
      p.category === 'DP' ? { dpStatus: 'ACC' } : p.category === 'Pelunasan' ? { pelunasanStatus: 'ACC' } : { ongkirStatus: 'Lunas' };
    patchOrder(p.invoice, patch);
    addLedger({ type: p.category, ref: p.invoice, name: p.user, nominal: p.nominal, bank: p.bank || '-' });
    onApprovePayment && onApprovePayment(p.id);
    showToast(`Dana ${p.category} ${p.invoice} (${rp(p.nominal)}) berhasil diverifikasi masuk kas.`);
  };

  const rejectPayment = (p) => {
    const reason = window.prompt(`Alasan penolakan ${p.category} ${p.invoice}:`, 'Nominal transfer tidak sesuai');
    if (reason === null) return;
    const patch =
      p.category === 'DP'
        ? { dpStatus: 'Ditolak', dpNote: reason }
        : p.category === 'Pelunasan'
        ? { pelunasanStatus: 'Ditolak', pelunasanNote: reason }
        : { ongkirStatus: 'Ditolak', ongkirNote: reason };
    patchOrder(p.invoice, patch);
    onRejectPayment && onRejectPayment(p.id, reason);
    showToast(`Bukti transfer ${p.invoice} ditolak.`);
  };

  const setShip = (o, ship) => {
    patchOrder(o.invoice, { ship });
    showToast(ship === 'diatur' ? `Kurir untuk ${o.invoice} telah dikonfirmasi.` : `${o.invoice} ditandai telah dikirim.`);
  };

  const printInvoice = (o) =>
    openInvoicePrintTab({
      ...o,
      orderNo: o.invoice,
      date: fmtDate(o.checkoutDate),
      recipientName: o.name,
      items: [{ id: 1, title: o.produk, variant: o.varian, price: Math.round(o.nilai / o.qty), qty: o.qty, subtotal: o.nilai }]
    }, bankAccounts?.length ? bankAccounts : bankAccountsList);

  const handleUserChangeInForm = (userName) => {
    const userInvs = ordersList.filter((o) => o.name === userName);
    const firstInv = userInvs[0]?.invoice || '';
    const exp = expectedNominal(inputBuktiForm.paymentType, userInvs[0]);
    setInputBuktiForm((prev) => ({
      ...prev,
      userName,
      invoiceNo: prev.paymentType === 'Deposit' ? '' : firstInv,
      nominal: exp ?? prev.nominal
    }));
  };

  const handleSaveBukti = (e) => {
    e.preventDefault();
    const f = inputBuktiForm;
    const nominalNum = Number(f.nominal);
    if (!nominalNum || nominalNum <= 0) return alert('Masukkan nominal yang valid.');
    const bank = f.targetBank.split(' ')[0];

    if (f.paymentType === 'Deposit') {
      setDepositHistory((prev) => [
        {
          id: 'dep-' + Date.now(),
          date: f.transferDate,
          name: f.userName,
          mitra: usersList.find((u) => u.name === f.userName)?.level || 'Mitra',
          invoice: '-',
          nominal: nominalNum,
          bank,
          proof: f.proofPreviewUrl,
          status: 'ACC'
        },
        ...prev
      ]);
      addLedger({ type: 'Deposit', ref: '-', name: f.userName, nominal: nominalNum, bank, date: f.transferDate });
      showToast(`Deposit ${rp(nominalNum)} untuk ${f.userName} dicatat.`);
      setActiveMenu('acc_deposit');
    } else {
      const o = ordersList.find((x) => x.invoice === f.invoiceNo);
      if (!o) return alert('Pilih invoice terkait.');
      const statusKey = { DP: 'dpStatus', Pelunasan: 'pelunasanStatus', Ongkir: 'ongkirStatus' }[f.paymentType];
      const patch = { [statusKey]: f.paymentType === 'Ongkir' ? 'Lunas' : 'ACC' };
      if (f.proofPreviewUrl && f.paymentType !== 'Ongkir') {
        patch[f.paymentType === 'DP' ? 'dpProof' : 'pelunasanProof'] = f.proofPreviewUrl;
      }
      patchOrder(o.invoice, patch);
      addLedger({ type: f.paymentType, ref: o.invoice, name: o.name, nominal: nominalNum, bank, date: f.transferDate });
      showToast(`Pembayaran manual ${f.paymentType} ${o.invoice} berhasil disimpan.`);
      setActiveMenu(PAY_MENU_BY_CATEGORY[f.paymentType]);
    }
    setInputBuktiForm((prev) => ({ ...prev, proofPreviewUrl: '' }));
  };

  /* WhatsApp Dispatcher */
  const composeMessage = (target) => {
    const bankLines = bankAccountsList.filter((b) => b.active).map((b) => `• ${b.bank} ${b.accountNo} a.n ${b.holder}`).join('\n');
    const footer = `\n\nTransfer melalui rekening:\n${bankLines}\n\nKirimkan bukti transfer setelah pembayaran.\nTerima kasih 🙏\n${settings.senderName}`;

    if (target.mode === 'invoice') {
      const r = billingRows.find((x) => x.order.invoice === target.invoice);
      if (!r || !r.current.length) return '';
      const o = r.order;
      const tone = waTone === 'auto' ? (r.due.overdue > 0 ? 'tegas' : 'halus') : waTone;
      const kinds = r.current.map((i) => i.kind).join(' + ');
      const intro =
        tone === 'halus'
          ? `Halo Kak ${o.name}, kami infokan tagihan *${kinds}* pesanan Anda di ${settings.shopName}:`
          : `Pemberitahuan: Tagihan *${kinds}* pesanan Anda di ${settings.shopName} ${r.due.overdue > 0 ? `telah melewati tempo ${r.due.overdue} hari` : 'telah jatuh tempo'}:`;

      return (
        `Assalamu'alaikum Kak ${o.name} (${o.mitra}),\n\n${intro}\n\n` +
        `🧾 No Invoice: *${o.invoice}*\n📦 Item: ${o.produk} ${o.varian} (${o.qty} pcs)\n💰 Nominal Tagihan: *${rp(r.currentTotal)}*\n📅 Batas Tempo: ${fmtDate(r.earliestDue)}\n\n` +
        `Mohon selesaikan pembayaran agar pesanan dapat segera diproses ke gudang / pabrik.` +
        footer
      );
    }

    const m = mitraRows.find((x) => x.name === target.name);
    if (!m) return '';
    const lines = m.rows
      .filter((r) => r.current.length)
      .flatMap((r) => r.current.map((i) => `• ${r.order.invoice} (${i.kind}): ${rp(i.amount)} - tempo ${fmtDate(i.due)}`))
      .join('\n');
    const off = offsetDeposit ? m.offset : 0;
    return (
      `Assalamu'alaikum Kak ${m.name} (${m.mitra}),\n\nBerikut rekap seluruh tagihan Pre-Order berjalan Kakak per ${fmtDate(todayISO)}:\n\n` +
      `${lines}\n\nTotal Tagihan: ${rp(m.currentTotal)}` +
      (off > 0 ? `\nPotongan Deposit: -${rp(off)}` : '') +
      `\n💰 *Total Bersih yang Harus Ditransfer: ${rp(m.currentTotal - off)}*` +
      footer
    );
  };

  const openWA = (target, text) => {
    const phone =
      target.mode === 'invoice'
        ? usersList.find((u) => u.name === billingRows.find((x) => x.order.invoice === target.invoice)?.order.name)?.phone
        : mitraRows.find((x) => x.name === target.name)?.phone;
    if (!phone) return alert('Nomor telepon mitra tidak ditemukan.');
    window.open(`https://wa.me/${normPhone(phone)}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const groupBy = (fn) => {
    const m = {};
    sOrders.forEach((o) => (m[fn(o)] = [...(m[fn(o)] || []), o]));
    return Object.entries(m).map(([key, list]) => ({ key, list }));
  };

  return (
    <div className="min-h-screen bg-[#F6F8F7] flex text-stone-800 antialiased font-sans">
      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div onClick={() => setIsMobileSidebarOpen(false)} className="fixed top-16 sm:top-[72px] inset-x-0 bottom-0 bg-black/50 z-30 lg:hidden" />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed top-16 sm:top-[72px] bottom-0 left-0 z-40 w-64 bg-white border-r border-gray-200 shrink-0 flex flex-col justify-between select-none transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:shadow-none`}
      >
        <div>
          <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0F6B4F] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                A
              </div>
              <div>
                <h1 className="font-bold text-stone-900 text-sm leading-none">Afathar Group</h1>
                <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider mt-0.5">Owner Portal</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden text-stone-400 hover:text-stone-700"
            >
              ✕
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {MENU.map((m) =>
              m.children ? (
                <div key={m.group} className="pt-2">
                  <button
                    type="button"
                    onClick={() => setOpenGroups({ ...openGroups, [m.group]: !openGroups[m.group] })}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-50"
                  >
                    <span>{m.label}</span>
                    <span>{openGroups[m.group] ? '▾' : '▸'}</span>
                  </button>
                  {openGroups[m.group] && (
                    <div className="space-y-0.5 mt-1 pl-2">
                      {m.children.map((c) => {
                        const active = activeMenu === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setActiveMenu(c.id);
                              setIsMobileSidebarOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              active ? 'bg-[#0F6B4F] text-white font-semibold shadow-xs' : 'text-gray-700 hover:bg-emerald-50/70 hover:text-[#0F6B4F]'
                            }`}
                          >
                            <span>{c.label}</span>
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
                    setActiveMenu(m.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    activeMenu === m.id ? 'bg-[#0F6B4F] text-white font-semibold shadow-xs' : 'text-gray-700 hover:bg-emerald-50/70 hover:text-[#0F6B4F]'
                  }`}
                >
                  <span>{m.label}</span>
                  {m.id === 'reminder' && overdueCount > 0 && (
                    <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {overdueCount}
                    </span>
                  )}
                </button>
              )
            )}
          </nav>
        </div>

        <div className="p-3 border-t border-gray-100 space-y-1.5 bg-gray-50/50">
          {onNavigateStore && (
            <button
              type="button"
              onClick={onNavigateStore}
              className="w-full py-2 px-3 text-xs font-semibold text-[#0F6B4F] bg-white border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>🏪</span> Toko Utama
            </button>
          )}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2 px-3 text-xs text-rose-600 hover:bg-rose-50 font-semibold rounded-lg transition-colors"
            >
              Keluar Sesi
            </button>
          )}
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* HEADER TOP BAR */}
        <header className="h-16 px-4 sm:px-8 flex items-center justify-between border-b border-gray-200/80 bg-white sticky top-16 sm:top-[72px] z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-1.5 rounded-lg border border-gray-200 text-stone-700"
            >
              ☰
            </button>
            <div className="text-sm font-bold text-gray-900 truncate">
              {ALL_MENU.find((m) => m.id === activeMenu)?.title}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              Status: {actor}
            </span>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 relative"
              >
                🔔
                {sPending.length + overdueCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {sPending.length + overdueCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 text-xs">
                  <div className="px-3 pb-2 border-b border-gray-100 font-bold text-gray-800 flex justify-between">
                    <span>Pemberitahuan Owner</span>
                    <span className="text-[10px] text-gray-400">Real-time</span>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                    {sPending.map((p) => (
                      <div key={p.id} className="p-3 hover:bg-gray-50">
                        <p className="font-semibold text-gray-800">Perlu ACC {p.category}</p>
                        <p className="text-gray-500 text-[11px]">{p.user} · {rp(p.nominal)}</p>
                      </div>
                    ))}
                    {sPending.length === 0 && (
                      <div className="p-4 text-center text-gray-400 text-xs">Tidak ada antrean pending.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* TOAST ALERTS */}
        {toastMsg && (
          <div className="fixed bottom-5 right-5 z-[60] bg-gray-900 text-white px-4 py-2.5 rounded-lg text-xs shadow-lg flex items-center gap-3">
            <span>{toastMsg}</span>
            <button type="button" onClick={() => setToastMsg('')} className="text-gray-400 hover:text-white">✕</button>
          </div>
        )}

        {/* FILTER BAR PRODUK / SCOPE */}
        <div className="bg-white border-b border-gray-200/80 px-4 sm:px-8 py-3">
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  scope === 'all' ? 'bg-[#0F6B4F] text-white shadow-2xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Semua Produk ({ordersList.length})
              </button>
              {productsList.map((p) => {
                const active = scope === p.name;
                const c = productColor(p.name);
                const cnt = ordersList.filter((o) => o.produk === p.name).length;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setScope(p.name)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
                      active ? `${c.soft} ring-1 ring-current` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    {p.name} <span className="opacity-50 font-normal">({cnt})</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setIsAddProductModalOpen(true)}
              className="text-xs font-semibold text-[#0F6B4F] hover:underline whitespace-nowrap shrink-0"
            >
              + Buat PO Baru
            </button>
          </div>
        </div>

        {/* BODY UTAMA DASHBOARD */}
        <main className="flex-1 px-4 sm:px-8 py-6 space-y-6">
          {/* ================= SECTION: EXECUTIVE DASHBOARD ================= */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6">
              {/* Row 1: Executive KPI Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricTile
                  label="Total Omzet Pesanan"
                  value={rp(execMetrics.totalOmzet)}
                  sub={`${execMetrics.totalPcs} pcs total terpesan`}
                  hint={`${execMetrics.trx} transaksi dari ${execMetrics.mitraCount} mitra`}
                  tone="text-gray-900"
                />
                <MetricTile
                  label="Estimasi Laba Kotor"
                  value={rp(execMetrics.estProfit)}
                  sub={`Gross Margin: ${execMetrics.grossMargin}%`}
                  hint="Dihitung dari total nilai jual dikurangi HPP"
                  tone="text-emerald-700"
                  badge={<Badge tone="emerald">Margin {execMetrics.grossMargin}%</Badge>}
                />
                <MetricTile
                  label="Realisasi Kas Masuk"
                  value={rp(execMetrics.sudahMasuk)}
                  sub={`Collection Rate: ${execMetrics.cashCollectionRate}%`}
                  hint={`Dari total omzet ${rp(execMetrics.totalOmzet)}`}
                  tone="text-blue-700"
                />
                <MetricTile
                  label="Sisa Piutang Berjalan"
                  value={rp(execMetrics.piutangSisa)}
                  sub={`${execMetrics.overdueCount} tagihan overdue`}
                  hint={`Total macet/tempo: ${rp(execMetrics.overdueTotal)}`}
                  tone={execMetrics.piutangSisa > 0 ? 'text-rose-600' : 'text-gray-700'}
                  badge={execMetrics.overdueCount > 0 ? <Badge tone="red">Perlu Difollow-up</Badge> : null}
                />
              </div>

              {/* Row 2: Tabel Pesanan Berdasarkan Tahap Operasional */}
              <Card title="Pipa Proses Pesanan Pre-Order">
                <div className="px-5 pt-4 flex flex-wrap gap-1.5 border-b border-gray-100 pb-3">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStageTab(s.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        stageTab === s.id ? 'bg-[#0F6B4F] text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s.label}
                      <span className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${stageTab === s.id ? 'bg-white/20' : 'bg-gray-200'}`}>
                        {stageCounts[s.id]}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="p-4 flex items-center justify-between gap-4">
                  <input
                    type="text"
                    value={stageSearch}
                    onChange={(e) => setStageSearch(e.target.value)}
                    placeholder="Cari no invoice, nama mitra, atau produk..."
                    className={`${INPUT} max-w-sm`}
                  />
                  <span className="text-xs text-gray-400">Menampilkan {stageRows.length} data</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-y border-gray-100">
                      <tr>
                        <th className="px-5 py-3 font-semibold text-[10px] uppercase">Invoice</th>
                        <th className={TH}>Mitra</th>
                        <th className={TH}>Item PO</th>
                        <th className={`${TH} text-center`}>Qty</th>
                        <th className={TH}>Nilai</th>
                        <th className={`${TH} text-center`}>Status DP</th>
                        <th className={`${TH} text-center`}>Status Pelunasan</th>
                        <th className="px-5 py-3 font-semibold text-right text-[10px] uppercase">Aksi Cepat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {stageRows.map((o) => (
                        <tr key={o.invoice} className="hover:bg-gray-50/70">
                          <td className="px-5 py-3.5 font-medium text-blue-600">
                            <button type="button" onClick={() => printInvoice(o)} className="hover:underline">
                              {o.invoice}
                            </button>
                          </td>
                          <td className={TD}>
                            <p className="font-semibold text-gray-900">{o.name}</p>
                            <p className="text-[11px] text-gray-400">{o.mitra}</p>
                          </td>
                          <td className={TD}>{o.produk} {o.varian}</td>
                          <td className={`${TD} text-center font-semibold`}>{o.qty}</td>
                          <td className={`${TD} font-semibold text-gray-900`}>{rp(o.nilai)}</td>
                          <td className={`${TD} text-center`}><Badge tone={statusTone(o.dpStatus)}>{o.dpStatus}</Badge></td>
                          <td className={`${TD} text-center`}><Badge tone={statusTone(o.pelunasanStatus)}>{o.pelunasanStatus}</Badge></td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openWA({ mode: 'invoice', invoice: o.invoice }, composeMessage({ mode: 'invoice', invoice: o.invoice }))}
                                className={BTN_OUTLINE}
                              >
                                💬 WA
                              </button>
                              {o.dpStatus === 'Menunggu Verifikasi' && (
                                <button type="button" onClick={() => approvePayment(payItem(o, 'DP'))} className={BTN_GREEN}>
                                  ACC DP
                                </button>
                              )}
                              {o.pelunasanStatus === 'Menunggu Verifikasi' && (
                                <button type="button" onClick={() => approvePayment(payItem(o, 'Pelunasan'))} className={BTN_GREEN}>
                                  ACC Pelunasan
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {stageRows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-gray-400 text-xs">
                            Tidak ada pesanan pada tahap ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Row 3: Analisis Aging Piutang & Rekap Kas Masuk */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Analisis Umur Piutang (Aging Tagihan)">
                  <div className="p-5 space-y-4">
                    {aging.map((a) => {
                      const max = Math.max(1, ...aging.map((x) => x.amount));
                      return (
                        <div key={a.label}>
                          <div className="flex justify-between text-xs mb-1.5 font-medium">
                            <span className="text-gray-700">{a.label} ({a.count} tagihan)</span>
                            <span className="font-bold text-gray-900">{rp(a.amount)}</span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${a.bar}`} style={{ width: `${(a.amount / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card title="Mitra dengan Piutang Terbesar">
                  <div className="divide-y divide-gray-100 px-5 text-xs">
                    {mitraRows.slice(0, 5).map((m) => (
                      <div key={m.name} className="py-3.5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{m.name} <span className="font-normal text-gray-400">({m.mitra})</span></p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{m.rows.length} Invoice aktif · Deposit: {rp(m.deposit)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-rose-600">{rp(m.currentTotal)}</p>
                          <button
                            type="button"
                            onClick={() => openWA({ mode: 'total', name: m.name }, composeMessage({ mode: 'total', name: m.name }))}
                            className="text-[11px] text-[#0F6B4F] hover:underline font-semibold"
                          >
                            Tagih Sekarang
                          </button>
                        </div>
                      </div>
                    ))}
                    {mitraRows.length === 0 && (
                      <div className="py-8 text-center text-gray-400 text-xs">Semua mitra telah melunasi tagihannya.</div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ================= SECTION: TAGIHAN & REMINDER ================= */}
          {activeMenu === 'reminder' && (
            <div className="space-y-5">
              <Card>
                <div className="p-4 sm:p-5 flex flex-wrap items-center gap-6 justify-between">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Metode Rekap</p>
                      <Segmented
                        value={waMode}
                        onChange={setWaMode}
                        options={[
                          { value: 'invoice', label: 'Per Invoice' },
                          { value: 'total', label: 'Total per Mitra' }
                        ]}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Gaya Bahasa</p>
                      <Segmented
                        value={waTone}
                        onChange={setWaTone}
                        options={[
                          { value: 'auto', label: 'Otomatis' },
                          { value: 'halus', label: 'Santun' },
                          { value: 'tegas', label: 'Tegas' }
                        ]}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch checked={previewBeforeSend} onChange={setPreviewBeforeSend} label="Tampilkan draf sebelum kirim" />
                  </div>
                </div>
              </Card>

              <Card
                title={waMode === 'invoice' ? 'Daftar Tagihan per Invoice' : 'Total Tagihan per Mitra'}
                action={
                  <div className="flex gap-2">
                    <Segmented
                      value={reminderFilter}
                      onChange={setReminderFilter}
                      options={[
                        { value: 'all', label: 'Semua' },
                        { value: 'late', label: 'Hanya Overdue' }
                      ]}
                    />
                  </div>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-5 py-3 font-semibold text-[10px] uppercase">Rincian Mitra</th>
                        <th className={TH}>Komponen</th>
                        <th className={TH}>Tagihan</th>
                        <th className={TH}>Jatuh Tempo</th>
                        <th className="px-5 py-3 font-semibold text-right text-[10px] uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {reminderList
                        .filter((r) => reminderFilter === 'all' || r.due?.isDue)
                        .map((r) => (
                          <tr key={r.key} className="hover:bg-gray-50/70">
                            <td className="px-5 py-3.5">
                              <p className="font-bold text-gray-900">{r.title}</p>
                              <p className="text-[11px] text-gray-400">{r.name} ({r.mitra})</p>
                            </td>
                            <td className={TD}>{r.kinds}</td>
                            <td className={`${TD} font-bold text-gray-900`}>{rp(r.amount)}</td>
                            <td className={TD}>
                              {r.due && <Badge tone={r.due.tone}>{r.due.label}</Badge>}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const text = composeMessage(r.target);
                                  if (previewBeforeSend) {
                                    setWaModal({ targets: [r.target], idx: 0, text });
                                  } else {
                                    openWA(r.target, text);
                                  }
                                }}
                                className={BTN_OUTLINE}
                              >
                                💬 Kirim Reminder
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ================= SECTION: PRE-ORDER MONITORING ================= */}
          {activeMenu === 'po_brand' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Rekap PO per Brand</h2>
              <GroupedOrders groups={groupBy((o) => o.brand)} expanded={expanded} setExpanded={setExpanded} prefix="brand" onInvoice={printInvoice} />
            </div>
          )}
          {activeMenu === 'po_produk' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Rekap PO per Produk</h2>
              <GroupedOrders groups={groupBy((o) => o.produk)} expanded={expanded} setExpanded={setExpanded} prefix="produk" onInvoice={printInvoice} />
            </div>
          )}
          {activeMenu === 'po_mitra' && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Rekap PO per Mitra</h2>
              <GroupedOrders groups={groupBy((o) => o.mitra)} expanded={expanded} setExpanded={setExpanded} prefix="mitra" onInvoice={printInvoice} />
            </div>
          )}

          {/* ================= SECTION: INPUT BUKTI MANUAL ================= */}
          {activeMenu === 'input_bukti' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <Card title="Pencatatan Pembayaran Manual">
                <form onSubmit={handleSaveBukti} className="p-5 space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Nama Mitra</label>
                    <select
                      value={inputBuktiForm.userName}
                      onChange={(e) => handleUserChangeInForm(e.target.value)}
                      className={INPUT}
                    >
                      {usersList.map((u) => (
                        <option key={u.id} value={u.name}>{u.name} ({u.level})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Alokasi Pembayaran</label>
                      <select
                        value={inputBuktiForm.paymentType}
                        onChange={(e) => setInputBuktiForm({ ...inputBuktiForm, paymentType: e.target.value })}
                        className={INPUT}
                      >
                        <option value="DP">Uang Muka (DP)</option>
                        <option value="Pelunasan">Pelunasan</option>
                        <option value="Ongkir">Biaya Pengiriman (Ongkir)</option>
                        <option value="Deposit">Deposit Saldo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Nomor Invoice Terkait</label>
                      <select
                        value={inputBuktiForm.invoiceNo}
                        disabled={inputBuktiForm.paymentType === 'Deposit'}
                        onChange={(e) => {
                          const o = ordersList.find((x) => x.invoice === e.target.value);
                          const exp = expectedNominal(inputBuktiForm.paymentType, o);
                          setInputBuktiForm({ ...inputBuktiForm, invoiceNo: e.target.value, nominal: exp ?? inputBuktiForm.nominal });
                        }}
                        className={`${INPUT} disabled:bg-gray-100`}
                      >
                        {inputBuktiForm.paymentType === 'Deposit' ? (
                          <option value="">- Tidak Perlu Invoice (Masuk Saldo) -</option>
                        ) : (
                          ordersList
                            .filter((o) => o.name === inputBuktiForm.userName)
                            .map((o) => <option key={o.invoice} value={o.invoice}>{o.invoice} ({o.produk})</option>)
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Nominal (Rp)</label>
                      <input
                        type="number"
                        value={inputBuktiForm.nominal}
                        onChange={(e) => setInputBuktiForm({ ...inputBuktiForm, nominal: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Tanggal Masuk</label>
                      <input
                        type="date"
                        value={inputBuktiForm.transferDate}
                        onChange={(e) => setInputBuktiForm({ ...inputBuktiForm, transferDate: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-600 font-semibold mb-1">Rekening Tujuan</label>
                    <select
                      value={inputBuktiForm.targetBank}
                      onChange={(e) => setInputBuktiForm({ ...inputBuktiForm, targetBank: e.target.value })}
                      className={INPUT}
                    >
                      {bankAccountsList.filter((b) => b.active).map((b) => (
                        <option key={b.id} value={`${b.bank} ${b.accountNo}`}>{b.bank} - {b.accountNo} (a.n {b.holder})</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button type="submit" className={BTN_GREEN}>
                      Simpan & Konfirmasi Pembayaran
                    </button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          {/* ================= SECTION: BUKU KAS ================= */}
          {activeMenu === 'ledger' && (
            <div className="space-y-5">
              <Card
                title="Buku Kas Masuk"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      downloadCSV(`buku_kas_${todayISO}.csv`, [
                        ['Tanggal', 'Jenis', 'Invoice', 'Nama Mitra', 'Bank', 'Nominal', 'Diinput Oleh'],
                        ...ledger.map((l) => [l.date, l.type, l.ref, l.name, l.bank, l.nominal, l.by])
                      ])
                    }
                    className={BTN_OUTLINE}
                  >
                    Unduh CSV
                  </button>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-5 py-3 font-semibold text-[10px] uppercase">Tanggal</th>
                        <th className={TH}>Tipe Transaksi</th>
                        <th className={TH}>Referensi</th>
                        <th className={TH}>Mitra</th>
                        <th className={TH}>Bank Tujuan</th>
                        <th className={`${TH} text-right`}>Nominal Masuk</th>
                        <th className="px-5 py-3 font-semibold text-right text-[10px] uppercase">Petugas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {ledger.map((l) => (
                        <tr key={l.id} className="hover:bg-gray-50/70">
                          <td className="px-5 py-3">{fmtDate(l.date)}</td>
                          <td className={TD}><Badge tone="emerald">{l.type}</Badge></td>
                          <td className={TD}>{l.ref}</td>
                          <td className={`${TD} font-semibold text-gray-900`}>{l.name}</td>
                          <td className={TD}>{l.bank}</td>
                          <td className={`${TD} text-right font-bold text-gray-900`}>{rp(l.nominal)}</td>
                          <td className="px-5 py-3 text-right text-gray-400">{l.by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ================= SECTION: KONFIGURASI BISNIS ================= */}
          {activeMenu === 'pengaturan' && (
            <div className="space-y-6">
              <Card title="Katalog Produk & HPP (Dasar Perhitungan Margin)">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-5 py-3 font-semibold text-[10px] uppercase">Nama Produk</th>
                        <th className={TH}>Brand</th>
                        <th className={TH}>HPP / Modal per Pcs</th>
                        <th className={TH}>Batas Akhir PO</th>
                        <th className="px-5 py-3 font-semibold text-right text-[10px] uppercase">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {productsList.map((p) => (
                        <tr key={p.name} className="hover:bg-gray-50/70">
                          <td className="px-5 py-3 font-bold text-gray-900">{p.name}</td>
                          <td className={TD}>{p.brand}</td>
                          <td className={TD}>
                            <input
                              type="number"
                              value={p.hpp}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setProductsList((prev) => prev.map((x) => (x.name === p.name ? { ...x, hpp: val } : x)));
                              }}
                              className="w-32 bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                            />
                          </td>
                          <td className={TD}>{fmtDate(p.poClose)}</td>
                          <td className="px-5 py-3 text-right">
                            <Badge tone={poInfo(p.poClose, todayISO).tone}>
                              {poInfo(p.poClose, todayISO).label}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Rekening Bank Tujuan Resmi">
                <div className="divide-y divide-gray-100 text-xs">
                  {bankAccountsList.map((b) => (
                    <div key={b.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{b.bank} - {b.accountNo}</p>
                        <p className="text-gray-400 text-[11px]">Atas Nama: {b.holder}</p>
                      </div>
                      <Switch
                        checked={b.active}
                        label={b.active ? 'Aktif' : 'Non-aktif'}
                        onChange={() => {
                          const next = bankAccountsList.map((x) => (x.id === b.id ? { ...x, active: !x.active } : x));
                          setBankAccountsList(next);
                          onUpdateBankAccounts && onUpdateBankAccounts(next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* MODAL WA PREVIEW */}
      {waModal && (
        <Modal title="Pratinjau Pesan Tagihan WhatsApp" onClose={() => setWaModal(null)} wide>
          <textarea
            value={waModal.text}
            onChange={(e) => setWaModal({ ...waModal, text: e.target.value })}
            rows={12}
            className={`${INPUT} font-mono leading-relaxed`}
          />
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(waModal.text);
                showToast('Teks disalin ke clipboard');
              }}
              className={BTN_OUTLINE}
            >
              Salin Teks
            </button>
            <button
              type="button"
              onClick={() => {
                openWA(waModal.targets[0], waModal.text);
                setWaModal(null);
              }}
              className={BTN_GREEN}
            >
              Kirim Langsung ke WhatsApp
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL BUAT PO / TAMBAH PRODUK */}
      {isAddProductModalOpen && (
        <Modal title="Tambah Katalog / Buka Pre-Order Baru" onClose={() => setIsAddProductModalOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newProductForm.name) return alert('Nama produk wajib diisi.');
              setProductsList((prev) => [
                ...prev,
                {
                  name: newProductForm.name,
                  brand: newProductForm.brand || 'General',
                  hpp: Number(newProductForm.hpp) || 0,
                  poClose: newProductForm.poClose
                }
              ]);
              setIsAddProductModalOpen(false);
              showToast(`Produk PO ${newProductForm.name} dibuka.`);
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block text-gray-600 font-semibold mb-1">Nama Produk PO</label>
              <input
                type="text"
                placeholder="Misal: Gamis Rayyan Series"
                value={newProductForm.name}
                onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-gray-600 font-semibold mb-1">Nama Brand</label>
              <input
                type="text"
                placeholder="Misal: Hanara"
                value={newProductForm.brand}
                onChange={(e) => setNewProductForm({ ...newProductForm, brand: e.target.value })}
                className={INPUT}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-600 font-semibold mb-1">HPP Modal (Rp/pcs)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newProductForm.hpp}
                  onChange={(e) => setNewProductForm({ ...newProductForm, hpp: e.target.value })}
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-gray-600 font-semibold mb-1">Tanggal Tutup PO</label>
                <input
                  type="date"
                  value={newProductForm.poClose}
                  onChange={(e) => setNewProductForm({ ...newProductForm, poClose: e.target.value })}
                  className={INPUT}
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setIsAddProductModalOpen(false)} className={BTN_OUTLINE}>
                Batal
              </button>
              <button type="submit" className={BTN_GREEN}>
                Buka PO Sekarang
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}