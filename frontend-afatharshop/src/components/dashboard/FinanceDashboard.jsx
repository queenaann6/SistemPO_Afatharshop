import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { dbId } from '../../services/adapters';
import BankAccountModal from './BankAccountModal';
import { serverMoneyPatch } from './projectBridge';
import { dpPercentFor } from '../../utils/terminScheme';
import {
  ACCENTS,
  Badge,
  Button,
  Card,
  ConfirmModal,
  DashboardShell,
  Drawer,
  EmptyState,
  Field,
  FeeRecapPanel,
  Icon,
  Input,
  LEVELS,
  MKT,
  MetricCard,
  Modal,
  OrderDrawer,
  OrdersTable,
  PAY,
  PREQ,
  PROD,
  PageHead,
  Pagination,
  PayBadge,
  PoClosingReminder,
  ProofModal,
  ProofThumb,
  ReasonModal,
  SAMPLE_PROOF_2,
  SHIP,
  SearchBox,
  Segmented,
  Select,
  StageBadge,
  StageTabs,
  Stepper,
  Switch,
  TH,
  TD,
  TableWrap,
  TerminDueReminder,
  Textarea,
  Toast,
  Toolbar,
  addDays,
  addressText,
  buildWA,
  copyText,
  createSeedData,
  diffDays,
  downloadCSV,
  effectiveProd,
  fmtDate,
  groupBy,
  hasAddress,
  invoicePatchToServer,
  isPaid,
  levelTone,
  nextAction,
  num,
  orderOutstanding,
  orderPaid,
  orderPatchToServer,
  orderStage,
  poClosingToday,
  prSteps,
  preqTone,
  roleLabel,
  rp,
  stageMeta,
  sumBy,
  todayISO,
  uid,
  useDataState,
  usePagination,
  useToast,
  waLink
} from './poCore';

const DEFAULT_USER = { id: 'u-finance', name: 'Dewi Finance', role: 'finance', email: 'finance@afatharshop.com' };

const VERIF_META = {
  verif_dp: {
    kind: 'DP',
    title: 'Verifikasi DP',
    desc: 'Cocokkan bukti transfer DP mitra dengan mutasi rekening sebelum produksi dijalankan.',
    statusKey: 'dpStatus',
    proofKey: 'dpProof',
    nominalKey: 'dpNominal',
    verifiedByKey: 'dpVerifiedBy',
    verifiedAtKey: 'dpVerifiedAt',
    noteKey: 'dpNote',
    icon: 'wallet',
    tone: 'blue'
  },
  verif_pelunasan: {
    kind: 'Pelunasan',
    title: 'Verifikasi Pelunasan',
    desc: 'Verifikasi pelunasan sisa tagihan sebelum pesanan masuk antrean pengiriman.',
    statusKey: 'pelunasanStatus',
    proofKey: 'pelunasanProof',
    nominalKey: 'pelunasanNominal',
    verifiedByKey: 'pelunasanVerifiedBy',
    verifiedAtKey: 'pelunasanVerifiedAt',
    noteKey: 'pelunasanNote',
    icon: 'receipt',
    tone: 'indigo'
  },
  verif_ongkir: {
    kind: 'Ongkir',
    title: 'Verifikasi Ongkir',
    desc: 'Pastikan ongkir yang dibayarkan mitra sesuai dengan tagihan ekspedisi.',
    statusKey: 'ongkirStatus',
    proofKey: 'ongkirProof',
    nominalKey: 'ongkir',
    verifiedByKey: 'ongkirVerifiedBy',
    verifiedAtKey: 'ongkirVerifiedAt',
    noteKey: 'ongkirNote',
    icon: 'truck',
    tone: 'orange'
  }
};

const DEP_META = {
  kind: 'Deposit',
  title: 'Verifikasi Deposit',
  desc: 'Validasi top up saldo deposit mitra. Saldo otomatis bertambah setelah diverifikasi.',
  icon: 'card',
  tone: 'violet'
};

const SHIP_TABS = [
  { value: 'siap', label: 'Siap Kirim' },
  { value: 'dikirim', label: 'Dikirim' },
  { value: 'selesai', label: 'Selesai' }
];

export default function FinanceDashboard({
  currentUser,
  onNavigateStore,
  onLogout,
  orders: ordersProp,
  products: productsProp,
  brands: brandsProp,
  mitra: mitraProp,
  team: teamProp,
  deposits: depositsProp,
  paymentRequests: paymentRequestsProp,
  bankAccounts: bankAccountsProp,
  couriers: couriersProp,
  ledger: ledgerProp,
  settings: settingsProp,
  onChangeOrders,
  onChangeMitra,
  onChangeTeam,
  onChangeDeposits,
  onChangePaymentRequests,
  onChangeBankAccounts,
  onChangeCouriers,
  onChangeLedger,
  onChangeSettings,
  onPrintInvoice
}) {
  const me = currentUser || DEFAULT_USER;
  const seed = useMemo(() => createSeedData(), []);
  const brands = brandsProp || seed.brands;
  const accent = ACCENTS.finance;
  const { show: toast, toast: toastData, close: closeToast } = useToast();

  /* ------------------------------------------------------------------ state */
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [orders, commitOrders] = useDataState(ordersProp, seed.orders, onChangeOrders);
  const [mitra, commitMitra] = useDataState(mitraProp, seed.mitra, onChangeMitra);
  const [team, commitTeam] = useDataState(teamProp, seed.team, onChangeTeam);
  const [deposits, commitDeposits] = useDataState(depositsProp, seed.deposits, onChangeDeposits);
  const [paymentRequests, commitPaymentRequests] = useDataState(
    paymentRequestsProp,
    seed.paymentRequests,
    onChangePaymentRequests
  );
  const [bankAccounts, commitBankAccounts] = useDataState(
    bankAccountsProp,
    seed.bankAccounts,
    onChangeBankAccounts
  );
  const [couriers, commitCouriers] = useDataState(couriersProp, seed.couriers, onChangeCouriers);
  const [ledger, commitLedger] = useDataState(ledgerProp, seed.ledger, onChangeLedger);
  const [settings, commitSettings] = useDataState(settingsProp, seed.settings, onChangeSettings);

  const [detailInvoice, setDetailInvoice] = useState(null);
  const [invoiceEdit, setInvoiceEdit] = useState(null);
  const [proofView, setProofView] = useState(null);
  const [reasonModal, setReasonModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // Verifikasi
  const [verifTab, setVerifTab] = useState('menunggu');
  const [verifSearch, setVerifSearch] = useState('');

  // Input bukti transfer
  const [proofForm, setProofForm] = useState({
    mitraId: '',
    invoice: '',
    kind: 'DP',
    nominal: '',
    date: todayISO(),
    bankId: seed.bankAccounts[0]?.id || '',
    refNo: '',
    proof: ''
  });

  // Ongkir & pengiriman
  const [ongkirModal, setOngkirModal] = useState(null);
  const [resiModal, setResiModal] = useState(null);
  const [shipTab, setShipTab] = useState('siap');

  // Pengajuan pembayaran
  const [prForm, setPrForm] = useState({
    purpose: '',
    amount: '',
    bankId: seed.bankAccounts.find((b) => b.type === 'pengajuan')?.id || seed.bankAccounts[0]?.id || '',
    ref: '',
    note: ''
  });
  const [prTab, setPrTab] = useState('pengajuan'); // 'pengajuan' | 'rekening_vendor'
  const [prFilter, setPrFilter] = useState('all');
  const [prDetailId, setPrDetailId] = useState(null);

  useEffect(() => {
    if (!prForm.bankId || !bankAccounts.some((b) => b.id === prForm.bankId && b.type === 'pengajuan')) {
      const firstPengajuan = bankAccounts.find((b) => b.type === 'pengajuan' && b.active);
      if (firstPengajuan) {
        setPrForm((prev) => ({ ...prev, bankId: firstPengajuan.id }));
      }
    }
  }, [bankAccounts]);

  // Pesanan
  const [stageFilter, setStageFilter] = useState('all');
  const [listSearch, setListSearch] = useState('');
  const [listBrand, setListBrand] = useState('all');

  // Buku kas & reminder
  const [ledgerType, setLedgerType] = useState('all');
  const [reminderSearch, setReminderSearch] = useState('');
  const [closingSearch, setClosingSearch] = useState('');
  const [closingUrgency, setClosingUrgency] = useState('all');

  // Rekap
  const [rekapTab, setRekapTab] = useState('brand');

  // Mitra & tim
  const [mitraSearch, setMitraSearch] = useState('');
  const [mitraModal, setMitraModal] = useState(null);
  const [mitraDetailId, setMitraDetailId] = useState(null);
  const [teamModal, setTeamModal] = useState(null);
  const [credential, setCredential] = useState(null);

  // Master Bank & Ekspedisi
  const [bankTab, setBankTab] = useState('public'); // 'public' | 'pengajuan'
  const [inlineBankId, setInlineBankId] = useState(null);
  const [inlineBankForm, setInlineBankForm] = useState({ bank: '', accountNo: '', holder: '', purpose: '', brands: [], active: true });
  const [bankModal, setBankModal] = useState(null);
  const [courierModal, setCourierModal] = useState(null);
  const [settingsForm, setSettingsForm] = useState({ ...seed.settings });

  useEffect(() => {
    setSettingsForm({ ...settings });
  }, [settings]);

  /* ---------------------------------------------------------------- derived */
  const pendingDp = useMemo(() => orders.filter((o) => o.dpStatus === PAY.MENUNGGU), [orders]);
  const pendingPelunasan = useMemo(
    () => orders.filter((o) => o.pelunasanStatus === PAY.MENUNGGU),
    [orders]
  );
  const pendingOngkir = useMemo(() => orders.filter((o) => o.ongkirStatus === PAY.MENUNGGU), [orders]);
  const pendingDeposit = useMemo(
    () => deposits.filter((d) => d.status === PAY.MENUNGGU),
    [deposits]
  );
  const totalPendingDocs =
    pendingDp.length + pendingPelunasan.length + pendingOngkir.length + pendingDeposit.length;
  const totalPendingValue =
    sumBy(pendingDp, (o) => o.dpNominal) +
    sumBy(pendingPelunasan, (o) => o.pelunasanNominal) +
    sumBy(pendingOngkir, (o) => o.ongkir) +
    sumBy(pendingDeposit, (d) => d.nominal);

  const activeOrders = useMemo(
    () => orders.filter((o) => !['selesai', 'ditolak', 'baru'].includes(orderStage(o))),
    [orders]
  );
  const piutang = useMemo(() => sumBy(activeOrders, (o) => orderOutstanding(o)), [activeOrders]);

  const needOngkir = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.marketingStatus !== MKT.TOLAK &&
          orderStage(o) === 'ongkir' &&
          effectiveProd(o) === PROD.READY &&
          hasAddress(o)
      ),
    [orders]
  );

  const readyToShip = useMemo(() => orders.filter((o) => orderStage(o) === 'kirim'), [orders]);
  const shippedOrders = useMemo(() => orders.filter((o) => orderStage(o) === 'dikirim'), [orders]);
  const doneOrders = useMemo(() => orders.filter((o) => orderStage(o) === 'selesai'), [orders]);

  const pendingPr = useMemo(
    () => paymentRequests.filter((r) => [PREQ.REVIEW_MKT, PREQ.APPROVAL_OWNER].includes(r.status)),
    [paymentRequests]
  );
  const approvedPr = useMemo(
    () => paymentRequests.filter((r) => r.status === PREQ.APPROVED),
    [paymentRequests]
  );
  const transferredPr = useMemo(
    () => paymentRequests.filter((r) => r.status === PREQ.TRANSFERRED),
    [paymentRequests]
  );

  const verifMeta = activeMenu === 'verif_deposit' ? DEP_META : VERIF_META[activeMenu] || null;

  const verifRows = useMemo(() => {
    if (activeMenu === 'verif_deposit') {
      return deposits.map((d) => {
        const m = mitra.find((x) => x.id === d.mitraId || x.name === d.mitraName);
        return {
          key: d.id,
          ref: 'Deposit',
          mitraName: d.mitraName,
          level: m?.level || 'Mitra',
          produk: 'Saldo deposit mitra',
          amount: num(d.nominal),
          status: d.status,
          proof: d.proof,
          date: d.date,
          verifiedBy: d.verifiedBy,
          note: d.note,
          deposit: d
        };
      });
    }
    if (!verifMeta) return [];
    return orders
      .filter((o) => o[verifMeta.statusKey] && o[verifMeta.statusKey] !== PAY.BELUM)
      .map((o) => ({
        key: `${o.invoice}-${verifMeta.kind}`,
        ref: o.invoice,
        mitraName: o.mitraName,
        level: o.level,
        produk: `${o.produk}  ·  ${o.variant}`,
        amount: num(o[verifMeta.nominalKey]),
        status: o[verifMeta.statusKey],
        proof: o[verifMeta.proofKey],
        date: o[verifMeta.verifiedAtKey] || o.date,
        verifiedBy: o[verifMeta.verifiedByKey],
        note: o[verifMeta.noteKey],
        order: o
      }))
      .sort((a, b) => Number(b.status === PAY.MENUNGGU) - Number(a.status === PAY.MENUNGGU));
  }, [activeMenu, verifMeta, orders, deposits, mitra]);

  const verifCounts = useMemo(
    () => ({
      menunggu: verifRows.filter((r) => r.status === PAY.MENUNGGU).length,
      acc: verifRows.filter((r) => r.status === PAY.ACC).length,
      tolak: verifRows.filter((r) => r.status === PAY.TOLAK).length,
      all: verifRows.length
    }),
    [verifRows]
  );

  const shownVerif = useMemo(() => {
    const q = verifSearch.trim().toLowerCase();
    return verifRows.filter((r) => {
      if (verifTab === 'menunggu' && r.status !== PAY.MENUNGGU) return false;
      if (verifTab === 'acc' && r.status !== PAY.ACC) return false;
      if (verifTab === 'tolak' && r.status !== PAY.TOLAK) return false;
      if (!q) return true;
      return `${r.ref} ${r.mitraName} ${r.produk}`.toLowerCase().includes(q);
    });
  }, [verifRows, verifTab, verifSearch]);

  const filteredOrders = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (stageFilter !== 'all' && orderStage(o) !== stageFilter) return false;
        if (listBrand !== 'all' && o.brand !== listBrand) return false;
        if (!q) return true;
        return `${o.invoice} ${o.mitraName} ${o.produk} ${o.variant} ${o.brand}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [orders, stageFilter, listBrand, listSearch]);
  const orderPag = usePagination(filteredOrders, 10);

  const filteredPr = paymentRequests
    .filter((r) => prFilter === 'all' || r.status === prFilter)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const prDetail = useMemo(
    () => paymentRequests.find((r) => r.id === prDetailId) || null,
    [paymentRequests, prDetailId]
  );
  const prCounts = useMemo(() => {
    const counts = { all: paymentRequests.length };
    Object.values(PREQ).forEach((status) => {
      counts[status] = paymentRequests.filter((r) => r.status === status).length;
    });
    return counts;
  }, [paymentRequests]);

  const ledgerRows = useMemo(() => {
    const rows = ledger.map((l) => ({ ...l, direction: 'in' }));
    transferredPr.forEach((r) =>
      rows.push({
        id: `trf-${r.id}`,
        date: r.transfer?.at || r.owner?.at || r.createdAt,
        type: 'Pengajuan Owner',
        ref: r.code,
        mitraName: r.purpose,
        nominal: num(r.amount),
        bank: r.bank,
        by: r.transfer?.by || r.owner?.by || 'Owner',
        status: 'Transfer',
        note: r.transfer?.note || '',
        direction: 'out'
      })
    );
    return rows
      .filter((l) => ledgerType === 'all' || l.type === ledgerType)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [ledger, transferredPr, ledgerType]);

  const kasMasuk = useMemo(() => sumBy(ledger.filter((l) => l.status === PAY.ACC), (l) => l.nominal), [ledger]);
  const kasKeluar = useMemo(() => sumBy(transferredPr, (r) => r.amount), [transferredPr]);

  const agingRows = useMemo(() => {
    const today = todayISO();
    return orders
      .filter((o) => o.marketingStatus !== MKT.TOLAK && orderOutstanding(o) > 0 && orderStage(o) !== 'baru')
      .map((o) => {
        const due = addDays(o.date, settings.pelunasanDueDays || 7);
        const late = diffDays(today, due);
        return { ...o, due, late: late > 0 ? late : 0, outstanding: orderOutstanding(o) };
      })
      .filter((o) => {
        const q = reminderSearch.trim().toLowerCase();
        return !q || `${o.invoice} ${o.mitraName} ${o.produk}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.late - a.late);
  }, [orders, settings.pelunasanDueDays, reminderSearch]);

  const rekapGroups = useMemo(() => {
    const keyFn =
      rekapTab === 'brand'
        ? (o) => o.brand
        : rekapTab === 'produk'
        ? (o) => o.produk
        : (o) => o.mitraName;
    const groups = groupBy(
      orders.filter((o) => o.marketingStatus !== MKT.TOLAK),
      keyFn
    );
    return groups
      .map(({ key, items: list }) => ({
        key,
        invoices: list.length,
        qty: sumBy(list, (o) => o.qty),
        nilai: sumBy(list, (o) => o.subtotal),
        paid: sumBy(list, (o) => orderPaid(o)),
        outstanding: sumBy(list, (o) => orderOutstanding(o))
      }))
      .sort((a, b) => b.nilai - a.nilai);
  }, [orders, rekapTab]);

  const mitraRows = useMemo(
    () =>
      mitra.map((m) => {
        const list = orders.filter((o) => o.mitraId === m.id || o.mitraName === m.name);
        return {
          ...m,
          invoiceCount: list.length,
          omzet: sumBy(list, (o) => o.subtotal),
          outstanding: sumBy(list, (o) => orderOutstanding(o)),
          lastOrder: list.map((o) => o.date).sort().reverse()[0]
        };
      }),
    [mitra, orders]
  );
  const mitraDetail = useMemo(
    () => mitraRows.find((m) => m.id === mitraDetailId) || null,
    [mitraRows, mitraDetailId]
  );
  const filteredMitra = useMemo(() => {
    const q = mitraSearch.trim().toLowerCase();
    return mitraRows.filter((m) => !q || `${m.name} ${m.email || ''} ${m.phone} ${m.city}`.toLowerCase().includes(q));
  }, [mitraRows, mitraSearch]);

  const pendingProofList = useMemo(() => {
    const rows = [];
    orders.forEach((o) => {
      if (o.dpStatus === PAY.MENUNGGU) {
        rows.push({ key: `${o.invoice}-DP`, invoice: o.invoice, mitra: o.mitraName, kind: 'DP', amount: o.dpNominal, proof: o.dpProof, date: o.date });
      }
      if (o.pelunasanStatus === PAY.MENUNGGU) {
        rows.push({ key: `${o.invoice}-Pelunasan`, invoice: o.invoice, mitra: o.mitraName, kind: 'Pelunasan', amount: o.pelunasanNominal, proof: o.pelunasanProof, date: o.date });
      }
      if (o.ongkirStatus === PAY.MENUNGGU) {
        rows.push({ key: `${o.invoice}-Ongkir`, invoice: o.invoice, mitra: o.mitraName, kind: 'Ongkir', amount: o.ongkir, proof: o.ongkirProof, date: o.date });
      }
    });
    deposits
      .filter((d) => d.status === PAY.MENUNGGU)
      .forEach((d) => rows.push({ key: d.id, invoice: 'Deposit', mitra: d.mitraName, kind: 'Deposit', amount: d.nominal, proof: d.proof, date: d.date }));
    return rows;
  }, [orders, deposits]);

  const products = productsProp !== undefined ? productsProp : seed.products;
  const closingPo = useMemo(() => poClosingToday(products), [products]);
  const closingFiltered = useMemo(() => {
    const q = closingSearch.trim().toLowerCase();
    return closingPo.filter((p) => {
      if (closingUrgency === 'today' && p.daysLeft !== 0) return false;
      if (closingUrgency === 'overdue' && p.daysLeft >= 0) return false;
      if (!q) return true;
      return [p.title, p.brand, p.category].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [closingPo, closingSearch, closingUrgency]);

  const notifications = useMemo(
    () => [
      ...closingPo.map((p) => ({
        id: `po-close-${p.id}`,
        title: `${p.title} ${p.daysLeft === 0 ? 'tutup PO hari ini' : `lewat jadwal ${Math.abs(p.daysLeft)} hari`}`,
        sub: `${p.brand}  ·  ${fmtDate(p.closeDate)}`,
        tone: 'red',
        onClick: () => setActiveMenu('reminder')
      })),
      ...pendingDp.slice(0, 4).map((o) => ({
        id: `dp-${o.invoice}`,
        title: `DP ${o.invoice} menunggu verifikasi`,
        sub: `${o.mitraName}  ·  ${rp(o.dpNominal)}`,
        tone: 'blue',
        onClick: () => setActiveMenu('verif_dp')
      })),
      ...pendingPelunasan.slice(0, 3).map((o) => ({
        id: `pl-${o.invoice}`,
        title: `Pelunasan ${o.invoice} menunggu verifikasi`,
        sub: `${o.mitraName}  ·  ${rp(o.pelunasanNominal)}`,
        tone: 'violet',
        onClick: () => setActiveMenu('verif_pelunasan')
      })),
      ...pendingOngkir.slice(0, 3).map((o) => ({
        id: `og-${o.invoice}`,
        title: `Ongkir ${o.invoice} menunggu verifikasi`,
        sub: `${o.mitraName}  ·  ${rp(o.ongkir)}`,
        tone: 'orange',
        onClick: () => setActiveMenu('verif_ongkir')
      })),
      ...pendingPr.slice(0, 3).map((r) => ({
        id: `pr-${r.id}`,
        title: `${r.code}  ·  ${r.status}`,
        sub: `${rp(r.amount)}  ·  ${r.purpose}`,
        tone: 'amber',
        onClick: () => {
          setPrDetailId(r.id);
          setActiveMenu('pengajuan');
        }
      }))
    ],
    [closingPo, pendingDp, pendingPelunasan, pendingOngkir, pendingPr]
  );

  const menus = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', title: 'Ringkasan Operasional Finance', icon: 'grid' },
      {
        group: 'verifikasi',
        label: 'Pusat Verifikasi',
        children: [
          {
            id: 'verif_dp',
            label: 'Verifikasi DP',
            title: 'Verifikasi Pembayaran DP',
            icon: 'wallet',
            badge: pendingDp.length || null
          },
          {
            id: 'verif_pelunasan',
            label: 'Verifikasi Pelunasan',
            title: 'Verifikasi Pelunasan',
            icon: 'receipt',
            badge: pendingPelunasan.length || null
          },
          {
            id: 'verif_ongkir',
            label: 'Verifikasi Ongkir',
            title: 'Verifikasi Ongkir',
            icon: 'truck',
            badge: pendingOngkir.length || null
          },
          {
            id: 'verif_deposit',
            label: 'Verifikasi Deposit',
            title: 'Verifikasi Deposit Mitra',
            icon: 'card',
            badge: pendingDeposit.length || null
          }
        ]
      },
      {
        group: 'operasional',
        label: 'Operasional PO',
        children: [
          { id: 'pesanan', label: 'Semua Pesanan', title: 'Monitoring Pesanan PO', icon: 'receipt' },
          {
            id: 'ongkir',
            label: 'Input Ongkir',
            title: 'Input Ongkir & Ekspedisi',
            icon: 'truck',
            badge: needOngkir.length || null
          },
          {
            id: 'pengiriman',
            label: 'Pengiriman & Resi',
            title: 'Pengiriman & Input Resi',
            icon: 'box',
            badge: readyToShip.length || null
          }
        ]
      },
      {
        group: 'keuangan',
        label: 'Keuangan',
        children: [
          { id: 'input_bukti', label: 'Input Bukti TF', title: 'Input Manual Bukti Transfer', icon: 'upload' },
          {
            id: 'pengajuan',
            label: 'Pengajuan ke Owner',
            title: 'Pengajuan Pembayaran ke Owner',
            icon: 'wallet',
            badge: pendingPr.length || null
          },
          { id: 'buku_kas', label: 'Buku Kas', title: 'Buku Kas Masuk & Keluar', icon: 'file' },
          { id: 'reminder', label: 'Tagihan & Reminder', title: 'Piutang & Reminder WA', icon: 'clock' }
        ]
      },
      {
        group: 'data',
        label: 'Data & Rekap',
        children: [
          { id: 'rekap', label: 'Rekap PO', title: 'Rekap PO per Brand / Produk / Mitra', icon: 'file' },
          { id: 'rekap_fee', label: 'Rekap Fee', title: 'Rekap Fee & Diskon Brand', icon: 'wallet' },
          { id: 'mitra', label: 'Mitra & User', title: 'Data Mitra & Piutang', icon: 'users' },
          { id: 'tim', label: 'Tim Admin', title: 'Manajemen Tim Admin', icon: 'shield' }
        ]
      },
      {
        group: 'master',
        label: 'Master Bank & Ekspedisi',
        children: [
          { id: 'rekening', label: 'Rekening Bank', title: 'Master Rekening Bank', icon: 'card' },
          { id: 'ekspedisi', label: 'Ekspedisi Pengiriman', title: 'Master Ekspedisi Pengiriman', icon: 'truck' }
        ]
      }
    ],
    [pendingDp.length, pendingPelunasan.length, pendingOngkir.length, pendingDeposit.length, needOngkir.length, readyToShip.length, pendingPr.length]
  );

  /* --------------------------------------------------------------- handlers */
  const serverFail = (err, action) =>
    toast(`${action} gagal: ${err?.message || 'server tidak merespons.'}`, 'error');

  const notOnServer = (label) =>
    toast(`${label} ini belum tersimpan di server. Tambahkan lewat portal lebih dulu.`, 'error');

  const patchOrder = async (invoice, patch) => {
    const matched = orders.find((o) => o.invoice === invoice);
    if (!matched) return false;

    const targetId = dbId(matched) || matched.invoice;
    const invoiceBody = invoicePatchToServer(patch);
    const body = invoiceBody || orderPatchToServer(patch);

    try {
      let serverMoney = null;
      if (Object.keys(body).length) {
        const response = invoiceBody
          ? await api.management.updateOrderInvoice(targetId, body)
          : await api.management.updateOrderStatus(targetId, body);
        serverMoney = invoiceBody ? serverMoneyPatch(response?.data) : null;
      }
      commitOrders((prev) =>
        prev.map((o) =>
          o.invoice === invoice ? { ...o, ...patch, ...(serverMoney || {}) } : o
        )
      );
      return true;
    } catch (err) {
      serverFail(err, invoiceBody ? `Perubahan invoice ${invoice}` : `Perubahan status ${invoice}`);
      return false;
    }
  };

  const openInvoiceEditor = (o) => {
    const stage = orderStage(o);
    if (stage === 'dikirim' || stage === 'selesai') {
      return toast('Invoice tidak dapat diedit setelah pesanan dikirim.', 'error');
    }
    if (stage === 'ditolak') return toast('Invoice pesanan yang ditolak tidak dapat diedit.', 'error');
    setDetailInvoice(null);
    const meta = o._projectMeta || {};
    const metaItems = Array.isArray(meta.items) ? meta.items : [];
    const source = metaItems.length
      ? metaItems
      : [
          {
            id: null,
            title: o.produk || '',
            variant: o.variant || '',
            qty: o.qty || 1,
            price: o.price || 0,
            discountPct: o.discountPct || 0
          }
        ];
    setInvoiceEdit({
      invoice: o.invoice,
      form: {
        items: source.map((it, idx) => ({
          key: it.id != null ? `it-${it.id}` : `it-new-${idx}`,
          id: it.id != null ? it.id : null,
          title: it.title || '',
          variant: it.variant || '',
          qty: it.qty || 1,
          price: it.price || 0,
          discountPct: it.discountPct || 0,
          addon: it.addon || 0,
          dueDate: it.dueDate || ''
        })),
        dpPct: dpPercentFor(o),
        notes: o.notes || ''
      }
    });
  };

  const patchInvoiceItem = (key, patch) =>
    setInvoiceEdit((prev) =>
      prev
        ? {
            ...prev,
            form: {
              ...prev.form,
              items: prev.form.items.map((it) => (it.key === key ? { ...it, ...patch } : it))
            }
          }
        : prev
    );

  const addInvoiceItem = () =>
    setInvoiceEdit((prev) =>
      prev
        ? {
            ...prev,
            form: {
              ...prev.form,
              items: [
                ...prev.form.items,
                {
                  key: uid('it'),
                  id: null,
                  title: prev.form.items[0]?.title || '',
                  variant: '',
                  qty: 1,
                  price: 0,
                  discountPct: 0,
                  addon: 0,
                  dueDate: prev.form.items[0]?.dueDate || ''
                }
              ]
            }
          }
        : prev
    );

  const removeInvoiceItem = (key) =>
    setInvoiceEdit((prev) => {
      if (!prev || prev.form.items.length <= 1) return prev;
      return {
        ...prev,
        form: { ...prev.form, items: prev.form.items.filter((it) => it.key !== key) }
      };
    });

  const saveInvoiceEdit = (e) => {
    e.preventDefault();
    if (!invoiceEdit) return;
    const f = invoiceEdit.form;
    const rows = (f.items || []).map((it) => ({
      ...it,
      title: String(it.title || '').trim(),
      variant: String(it.variant || '').trim(),
      qty: Math.max(1, num(it.qty)),
      price: num(it.price),
      discountPct: Math.min(100, Math.max(0, num(it.discountPct))),
      addon: Math.max(0, num(it.addon))
    }));
    if (!rows.length) return toast('Invoice minimal memiliki satu produk.', 'error');
    if (rows.some((it) => !it.title)) return toast('Nama produk pada setiap baris wajib diisi.', 'error');
    if (rows.some((it) => it.price <= 0)) return toast('Harga satuan setiap produk wajib lebih dari 0.', 'error');
    const dpPct = Math.min(100, Math.max(0, num(f.dpPct)));
    const target = orders.find((o) => o.invoice === invoiceEdit.invoice);
    if (!target) {
      setInvoiceEdit(null);
      return toast('Invoice tidak ditemukan.', 'error');
    }
    const meta = target._projectMeta || {};
    const prevItems = Array.isArray(meta.items) ? meta.items : [];

    const lines = rows.map((it, idx) => {
      const prev = (it.id != null && prevItems.find((p) => String(p.id) === String(it.id))) || prevItems[idx];
      const gross = it.price * it.qty;
      const discountNominal = Math.round((gross * it.discountPct) / 100);
      const addonTotal = it.addon * it.qty;
      const dueDate = it.dueDate
        ? /^\d{4}-\d{2}-\d{2}/.test(String(it.dueDate))
          ? fmtDate(String(it.dueDate).slice(0, 10))
          : it.dueDate
        : prev?.dueDate ||
          prevItems[0]?.dueDate ||
          meta.pelunasanDueDate ||
          (meta.closeDate && meta.closeDate !== '-' ? meta.closeDate : fmtDate(target.date));
      return {
        gross,
        discountNominal,
        addonTotal,
        item: {
          ...(prev || {}),
          id: prev?.id || `${target.invoice}-e${Date.now()}${idx + 1}`,
          title: it.title,
          variant: it.variant || 'All Varian',
          variation: prev?.variation || it.variant || 'All Varian',
          price: it.price,
          qty: it.qty,
          discountPct: it.discountPct,
          addon: it.addon,
          addonTotal,
          subtotal: gross - discountNominal + addonTotal,
          dueDate,
          image: prev?.image || meta.image || ''
        }
      };
    });

    const grossTotal = lines.reduce((s, l) => s + l.gross, 0);
    const discountNominal = lines.reduce((s, l) => s + l.discountNominal, 0);
    const addonNominal = lines.reduce((s, l) => s + l.addonTotal, 0);
    const subtotal = lines.reduce((s, l) => s + l.item.subtotal, 0);
    const dpNominal = Math.round((subtotal * dpPct) / 100);
    const pelunasanNominal = subtotal - dpNominal;
    const items = lines.map((l) => l.item);
    const totalQty = items.reduce((s, it) => s + it.qty, 0);
    const uniqueTitles = [...new Set(items.map((it) => it.title))];
    const weightedDiscPct = grossTotal > 0 ? Math.round((discountNominal / grossTotal) * 10000) / 100 : 0;

    patchOrder(target.invoice, {
      invoiceItems: items.map((it) => ({
        id: it.id,
        variantId: it.variantId,
        qty: it.qty,
        price: it.price,
        discountPct: it.discountPct,
        addon: it.addon
      })),
      produk: items[0].title,
      variant: items.length === 1 ? items[0].variant : items.map((it) => it.variant).join('  ·  '),
      qty: totalQty,
      price: items[0].price,
      discountPct: weightedDiscPct,
      discountNominal,
      addonNominal,
      subtotal,
      total: subtotal + num(target.ongkir),
      dpPct,
      dpNominal,
      pelunasanNominal,
      notes: String(f.notes || '').trim(),
      editedBy: me.name,
      editedAt: todayISO(),
      _projectMeta: {
        ...meta,
        originalTitle: uniqueTitles.join(' + '),
        items
      }
    });
    setInvoiceEdit(null);
    toast(`Invoice ${target.invoice} diperbarui (${items.length} produk/varian). Mitra melihat nilai terbaru.`);
  };

  const approvePayment = (row) => {
    if (row.deposit) {
      const dep = row.deposit;
      commitDeposits((prev) =>
        prev.map((d) =>
          d.id === dep.id
            ? { ...d, status: PAY.ACC, verifiedBy: me.name, verifiedAt: todayISO() }
            : d
        )
      );
      const target = mitra.find((m) => m.id === dep.mitraId || m.name === dep.mitraName);
      if (target) {
        commitMitra((prev) =>
          prev.map((m) => (m.id === target.id ? { ...m, deposit: num(m.deposit) + num(dep.nominal) } : m))
        );
      }
      commitLedger((prev) => [
        {
          id: uid('l'),
          date: todayISO(),
          type: 'Deposit',
          ref: '-',
          mitraName: dep.mitraName,
          nominal: num(dep.nominal),
          bank: dep.bank || '-',
          by: me.name,
          status: PAY.ACC,
          note: 'Verifikasi deposit mitra'
        },
        ...prev
      ]);
      toast(`Deposit ${dep.mitraName} ${rp(dep.nominal)} diverifikasi. Saldo mitra bertambah.`);
      const targetId = dep.backendId || dep.id;
      api.management.verifyDeposit(targetId, { status: 'ACC' }).catch(() => {});
    } else {
      const o = row.order;
      patchOrder(o.invoice, {
        [verifMeta.statusKey]: PAY.ACC,
        ...(verifMeta.kind === 'Pelunasan' ? { ongkirStatus: PAY.ACC, shipStatus: SHIP.SIAP } : {}),
        [verifMeta.verifiedByKey]: me.name,
        [verifMeta.verifiedAtKey]: todayISO(),
        [verifMeta.noteKey]: '',
        status: verifMeta.kind === 'DP' ? 'Produksi' : 'Siap Kirim'
      });
      commitLedger((prev) => [
        {
          id: uid('l'),
          date: todayISO(),
          type: verifMeta.kind,
          ref: o.invoice,
          mitraName: o.mitraName,
          nominal: row.amount,
          bank: '-',
          by: me.name,
          status: PAY.ACC,
          note: 'Verifikasi finance'
        },
        ...prev
      ]);
      toast(`${verifMeta.kind} ${o.invoice} diverifikasi ACC.`);
      const targetId = dbId(o) || o.backendId || o.invoice;
      const statusPayload =
        verifMeta.kind === 'DP'
          ? { status: 'Produksi', dpStatus: 'ACC' }
          : verifMeta.kind === 'Pelunasan'
            ? { status: 'Siap Kirim', pelunasanStatus: 'ACC', ongkirStatus: 'ACC' }
            : { ongkirStatus: 'ACC' };
      api.management.updateOrderStatus(targetId, statusPayload).catch(() => {});
      if (row.paymentId || row.backendPaymentId) {
        api.management.verifyPayment(row.paymentId || row.backendPaymentId, { status: 'disetujui' }).catch(() => {});
      }
    }
    setConfirmModal(null);
  };

  const rejectPayment = (row, note) => {
    if (row.deposit) {
      commitDeposits((prev) =>
        prev.map((d) =>
          d.id === row.deposit.id
            ? { ...d, status: PAY.TOLAK, verifiedBy: me.name, verifiedAt: todayISO(), note }
            : d
        )
      );
      const targetId = row.deposit.backendId || row.deposit.id;
      api.management.verifyDeposit(targetId, { status: 'Ditolak', note }).catch(() => {});
    } else {
      patchOrder(row.order.invoice, {
        [verifMeta.statusKey]: PAY.TOLAK,
        [verifMeta.verifiedByKey]: me.name,
        [verifMeta.verifiedAtKey]: todayISO(),
        [verifMeta.noteKey]: note
      });
      const targetId = dbId(row.order) || row.order.backendId || row.order.invoice;
      const statusPayload =
        verifMeta.kind === 'DP'
          ? { dpStatus: 'Tolak', note }
          : verifMeta.kind === 'Pelunasan'
            ? { pelunasanStatus: 'Tolak', note }
            : { ongkirStatus: 'Tolak', note };
      api.management.updateOrderStatus(targetId, statusPayload).catch(() => {});
      if (row.paymentId || row.backendPaymentId) {
        api.management.verifyPayment(row.paymentId || row.backendPaymentId, { status: 'ditolak', notes: note }).catch(() => {});
      }
    }
    toast(`${verifMeta.kind} ${row.ref} ditolak.`, 'warning');
  };

  const setProduction = (o, status) => {
    const patch = { productionStatus: status };
    if (status === PROD.READY) {
      patch.readyAt = todayISO();
      patch.status = 'Menunggu Alamat Mitra';
    }
    patchOrder(o.invoice, patch);
    toast(
      status === PROD.READY
        ? `${o.invoice} ditandai READY. Mitra dapat melengkapi alamat.`
        : `${o.invoice} masuk tahap ${status}.`
    );
  };

  const openWA = (o, kind) => {
    const text = buildWA(kind, o, { ...settings, banks: bankAccounts });
    window.open(waLink(o.phone, text), '_blank');
  };

  const saveOngkir = (e) => {
    e.preventDefault();
    const { order, form } = ongkirModal;
    if (!form.ekspedisi) return toast('Pilih ekspedisi terlebih dahulu.', 'error');
    if (!num(form.ongkir)) return toast('Nominal ongkir harus lebih dari 0.', 'error');
    patchOrder(order.invoice, {
      ongkir: num(form.ongkir),
      ekspedisi: form.ekspedisi,
      weight: num(form.weight),
      shippingNote: form.note || '',
      ongkirAt: todayISO(),
      ongkirStatus: PAY.BELUM,
      status: 'Menunggu Pelunasan'
    });
    setOngkirModal(null);
    toast(`Ongkir ${order.invoice} tersimpan. Mitra dapat melakukan pembayaran.`);
  };

  const saveResi = (e) => {
    e.preventDefault();
    const { order, form } = resiModal;
    if (!form.resi.trim()) return toast('Nomor resi wajib diisi.', 'error');
    const patch = { resi: form.resi.trim(), shippedAt: todayISO(), shipStatus: SHIP.DIKIRIM };
    patchOrder(order.invoice, patch);
    setResiModal(null);
    toast(`Resi ${form.resi} tersimpan. ${order.invoice} ditandai dikirim.`);
    if (form.notify) {
      window.open(
        waLink(order.phone, buildWA('shipped', { ...order, ...patch }, { ...settings, banks: bankAccounts })),
        '_blank'
      );
    }
  };

  const markReceived = (o) => {
    patchOrder(o.invoice, { receivedAt: todayISO(), shipStatus: SHIP.DITERIMA });
    toast(`${o.invoice} ditandai diterima. Pesanan selesai.`);
  };

  const handleProofFile = (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast('Ukuran berkas maksimal 2 MB.', 'error');
    const reader = new FileReader();
    reader.onload = () => setProofForm((prev) => ({ ...prev, proof: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const submitProofForm = (e) => {
    e.preventDefault();
    const f = proofForm;
    const nominal = num(f.nominal);
    if (!f.mitraId) return toast('Pilih mitra.', 'error');
    if (!nominal) return toast('Nominal harus lebih dari 0.', 'error');
    if (f.kind !== 'Deposit' && !f.invoice) return toast('Pilih invoice terkait.', 'error');
    const bank = bankAccounts.find((b) => b.id === f.bankId);
    const m = mitra.find((x) => x.id === f.mitraId);

    if (f.kind === 'Deposit') {
      commitDeposits((prev) => [
        {
          id: uid('dep'),
          date: f.date,
          mitraId: m?.id,
          mitraName: m?.name,
          nominal,
          bank: bank?.bank || '-',
          proof: f.proof,
          status: PAY.MENUNGGU,
          verifiedBy: '',
          note: f.refNo || 'Input manual admin finance'
        },
        ...prev
      ]);
      toast(`Deposit ${rp(nominal)} dicatat dan menunggu verifikasi.`);
    } else {
      const o = orders.find((x) => x.invoice === f.invoice);
      if (!o) return toast('Invoice tidak ditemukan.', 'error');
      const statusKey = { DP: 'dpStatus', Pelunasan: 'pelunasanStatus', Ongkir: 'ongkirStatus' }[f.kind];
      const proofKey = { DP: 'dpProof', Pelunasan: 'pelunasanProof', Ongkir: 'ongkirProof' }[f.kind];
      patchOrder(o.invoice, { [statusKey]: PAY.MENUNGGU, [proofKey]: f.proof });
      toast(`Bukti ${f.kind} ${o.invoice} dicatat. Menunggu verifikasi.`);
    }
    setProofForm((prev) => ({ ...prev, nominal: '', invoice: '', refNo: '', proof: '' }));
  };

  const savePR = (e) => {
    e.preventDefault();
    if (!prForm.purpose.trim()) return toast('Tujuan pembayaran wajib diisi.', 'error');
    if (!num(prForm.amount)) return toast('Nominal pengajuan harus lebih dari 0.', 'error');
    const bank = bankAccounts.find((b) => b.id === prForm.bankId);
    if (!bank) return toast('Pilih rekening tujuan transfer.', 'error');
    const maxPr = paymentRequests.reduce(
      (max, r) => Math.max(max, Number(String(r.code).replace(/\D/g, '')) || 0),
      0
    );
    const req = {
      id: uid('pr'),
      code: `PR-${String(maxPr + 1).padStart(4, '0')}`,
      createdAt: todayISO(),
      createdBy: me.name,
      amount: num(prForm.amount),
      bank: bank.bank,
      accountNo: bank.accountNo,
      holder: bank.holder,
      purpose: prForm.purpose.trim(),
      ref: prForm.ref.trim() || '-',
      note: prForm.note.trim(),
      status: PREQ.REVIEW_MKT,
      marketing: null,
      owner: null,
      transfer: null
    };
    commitPaymentRequests((prev) => [req, ...prev]);
    setPrForm((prev) => ({ ...prev, purpose: '', amount: '', ref: '', note: '' }));
    toast(`${req.code} diajukan. Menunggu review purchasing.`);
  };

  const cancelPR = (req) => {
    setConfirmModal({
      title: 'Batalkan pengajuan',
      message: `Batalkan pengajuan ${req.code} sebesar ${rp(req.amount)}?`,
      confirmLabel: 'Batalkan pengajuan',
      danger: true,
      onConfirm: () => {
        commitPaymentRequests((prev) =>
          prev.map((r) => (r.id === req.id ? { ...r, status: PREQ.CANCELED } : r))
        );
        setConfirmModal(null);
        setPrDetailId(null);
        toast(`${req.code} dibatalkan.`, 'warning');
      }
    });
  };

  const saveBank = async (formData) => {
    const f = formData || bankModal?.form;
    if (!f || !f.bank?.trim() || !f.accountNo?.trim() || !f.holder?.trim()) {
      return toast('Bank, nomor rekening, dan atas nama wajib diisi.', 'error');
    }
    const type = f.type || bankTab || 'public';
    const purpose = f.purpose?.trim() || (type === 'public' ? 'Penerimaan Pembayaran Mitra' : '');
    const brandsList = Array.isArray(f.brands) ? f.brands : [];
    const serverPayload = {
      bank_name: f.bank.trim(),
      account_number: f.accountNo.trim(),
      account_holder: f.holder.trim(),
      type,
      purpose,
      brands: brandsList,
      is_active: f.active !== false
    };

    if (bankModal.mode === 'edit') {
      const targetId = dbId(bankAccounts.find((b) => b.id === bankModal.id)) || dbId(bankModal);
      if (!targetId) return notOnServer(`Rekening ${f.bank}`);
      try {
        await api.management.updateBankAccount(targetId, serverPayload);
      } catch (err) {
        return serverFail(err, `Menyimpan rekening ${f.bank}`);
      }
      commitBankAccounts((prev) =>
        prev.map((b) =>
          b.id === bankModal.id
            ? { ...b, ...f, type, purpose, brands: brandsList }
            : b
        )
      );
      toast(`Rekening ${f.bank} diperbarui.`);
    } else {
      let created;
      try {
        created = await api.management.createBankAccount(serverPayload);
      } catch (err) {
        return serverFail(err, `Menambahkan rekening ${f.bank}`);
      }
      const row = created?.data;
      const newId = row?.id != null ? String(row.id) : uid('bk');
      commitBankAccounts((prev) => [
        ...prev,
        {
          ...f,
          type,
          purpose,
          brands: brandsList,
          id: newId,
          backendId: row?.id ?? null,
          active: f.active !== false
        }
      ]);
      if (type === 'pengajuan') {
        setPrForm((prev) => ({ ...prev, bankId: newId }));
      }
      toast(`Rekening ${f.bank} (${type === 'pengajuan' ? 'Pengajuan Owner' : 'Publik Toko'}) ditambahkan.`);
    }
    setBankModal(null);
  };

  const deleteBank = (b) => {
    setConfirmModal({
      title: 'Hapus Rekening Bank',
      message: `Hapus rekening "${b.bank} - ${b.accountNo}" (a/n ${b.holder})? Tindakan ini akan menghapus rekening dari database sistem.`,
      confirmLabel: 'Hapus Rekening',
      danger: true,
      onConfirm: async () => {
        const targetId = dbId(b) || (num(b.id) > 0 ? num(b.id) : null);
        if (!targetId) {
          commitBankAccounts((prev) => prev.filter((x) => x.id !== b.id));
          setConfirmModal(null);
          return notOnServer(`Rekening ${b.bank}`);
        }
        try {
          await api.management.deleteBankAccount(targetId);
        } catch (err) {
          return serverFail(err, `Menghapus rekening ${b.bank}`);
        }
        commitBankAccounts((prev) => prev.filter((x) => x.id !== b.id));
        setConfirmModal(null);
        toast(`Rekening ${b.bank} (${b.accountNo}) berhasil dihapus.`, 'warning');
      }
    });
  };

  const startInlineEditBank = (b) => {
    setInlineBankId(b.id);
    setInlineBankForm({
      bank: b.bank || '',
      accountNo: b.accountNo || '',
      holder: b.holder || '',
      purpose: b.purpose || '',
      brands: b.brands || [],
      active: b.active !== false
    });
  };

  const saveInlineEditBank = async (b) => {
    if (!inlineBankForm.bank.trim() || !inlineBankForm.accountNo.trim() || !inlineBankForm.holder.trim()) {
      return toast('Bank, nomor rekening, dan atas nama wajib diisi.', 'error');
    }
    const targetId = dbId(b) || (num(b.id) > 0 ? num(b.id) : null);
    const serverPayload = {
      bank_name: inlineBankForm.bank.trim(),
      account_number: inlineBankForm.accountNo.trim(),
      account_holder: inlineBankForm.holder.trim(),
      type: b.type || bankTab || 'public',
      purpose: inlineBankForm.purpose.trim(),
      brands: inlineBankForm.brands || [],
      is_active: inlineBankForm.active !== false
    };
    if (targetId) {
      try {
        await api.management.updateBankAccount(targetId, serverPayload);
      } catch (err) {
        return serverFail(err, `Menyimpan rekening ${inlineBankForm.bank}`);
      }
    }
    commitBankAccounts((prev) =>
      prev.map((item) =>
        item.id === b.id
          ? {
              ...item,
              bank: inlineBankForm.bank.trim(),
              accountNo: inlineBankForm.accountNo.trim(),
              holder: inlineBankForm.holder.trim(),
              purpose: inlineBankForm.purpose.trim(),
              brands: inlineBankForm.brands || [],
              active: inlineBankForm.active !== false
            }
          : item
      )
    );
    setInlineBankId(null);
    toast(`Rekening ${inlineBankForm.bank} berhasil disimpan.`);
  };

  const toggleBank = async (b) => {
    const targetId = dbId(b);
    if (!targetId) return notOnServer(`Rekening ${b.bank}`);
    try {
      await api.management.updateBankAccount(targetId, { is_active: !b.active });
    } catch (err) {
      return serverFail(err, `Mengubah status rekening ${b.bank}`);
    }
    commitBankAccounts((prev) => prev.map((x) => (x.id === b.id ? { ...x, active: !x.active } : x)));
    toast(`Rekening ${b.bank} ${b.active ? 'dinonaktifkan' : 'diaktifkan'}.`);
  };

  const saveCourier = async (e) => {
    e.preventDefault();
    const f = courierModal.form;
    if (!f.name?.trim()) return toast('Nama ekspedisi wajib diisi.', 'error');
    const serverPayload = {
      name: f.name.trim(),
      code: f.code || f.name.trim().slice(0, 3).toUpperCase(),
      description: f.note || '',
      is_active: f.active !== false
    };

    if (courierModal.mode === 'edit') {
      const targetId =
        dbId(couriers.find((c) => c.id === courierModal.id)) || dbId(courierModal);
      if (!targetId) return notOnServer(`Ekspedisi ${f.name}`);
      try {
        await api.management.updateCourier(targetId, serverPayload);
      } catch (err) {
        return serverFail(err, `Menyimpan ekspedisi ${f.name}`);
      }
      commitCouriers((prev) => prev.map((c) => (c.id === courierModal.id ? { ...c, ...f } : c)));
      toast(`Ekspedisi ${f.name} diperbarui.`);
    } else {
      let created;
      try {
        created = await api.management.createCourier(serverPayload);
      } catch (err) {
        return serverFail(err, `Menambahkan ekspedisi ${f.name}`);
      }
      const row = created?.data;
      commitCouriers((prev) => [
        ...prev,
        {
          ...serverPayload,
          id: row?.id != null ? `c-${row.id}` : uid('c'),
          backendId: row?.id ?? null,
          active: true,
          createdAt: todayISO()
        }
      ]);
      toast(`Ekspedisi ${f.name} ditambahkan.`);
    }
    setCourierModal(null);
  };

  const toggleCourier = async (c) => {
    const targetId = dbId(c);
    if (!targetId) return notOnServer(`Ekspedisi ${c.name}`);
    try {
      await api.management.updateCourier(targetId, { is_active: !c.active });
    } catch (err) {
      return serverFail(err, `Mengubah status ekspedisi ${c.name}`);
    }
    commitCouriers((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
    toast(`${c.name} ${c.active ? 'dinonaktifkan' : 'diaktifkan'}.`);
  };

  const deleteCourier = (c) => {
    setConfirmModal({
      title: 'Hapus Ekspedisi',
      message: `Hapus ekspedisi "${c.name}"? Ekspedisi yang sudah terhubung dengan data pesanan tidak dapat dihapus (silakan nonaktifkan).`,
      confirmLabel: 'Hapus Ekspedisi',
      danger: true,
      onConfirm: async () => {
        const targetId = dbId(c) || (num(c.id) > 0 ? num(c.id) : null);
        if (!targetId) {
          commitCouriers((prev) => prev.filter((x) => x.id !== c.id));
          setConfirmModal(null);
          return notOnServer(`Ekspedisi ${c.name}`);
        }
        try {
          await api.management.deleteCourier(targetId);
        } catch (err) {
          return serverFail(err, `Menghapus ekspedisi ${c.name}`);
        }
        commitCouriers((prev) => prev.filter((x) => x.id !== c.id));
        setConfirmModal(null);
        toast(`Ekspedisi ${c.name} berhasil dihapus.`, 'warning');
      }
    });
  };

  const saveMitra = (e) => {
    e.preventDefault();
    const f = mitraModal.form;
    if (!f.name?.trim() || !f.phone?.trim()) return toast('Nama dan WhatsApp wajib diisi.', 'error');
    if (mitraModal.mode === 'create' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.email || '').trim())) {
      return toast('Email login mitra wajib diisi dengan format valid.', 'error');
    }
    if (mitraModal.mode === 'edit') {
      commitMitra((prev) => prev.map((m) => (m.id === mitraModal.id ? { ...m, ...f } : m)));
      toast(`Mitra ${f.name} diperbarui.`);
      setMitraModal(null);
      const targetId = mitraModal.backendId || mitraModal.id;
      api.management.updateUser(targetId, {
        nama: f.name,
        phone: f.phone,
        city: f.city,
        level: f.level || 'reseller'
      }).catch(() => {});
    } else {
      const tempPassword = `Mitra#${Math.floor(1000 + Math.random() * 9000)}`;
      const newM = {
        id: uid('m'),
        ...f,
        active: true,
        deposit: 0,
        joinedAt: todayISO(),
        createdBy: me.name
      };
      commitMitra((prev) => [newM, ...prev]);
      setMitraModal(null);
      setCredential({
        title: 'Akun mitra dibuat',
        name: f.name,
        email: String(f.email || '').trim(),
        password: tempPassword,
        note: 'Kirimkan kredensial ini ke mitra. Password hanya ditampilkan sekali.'
      });
      toast(`Akun mitra ${f.name} berhasil disimpan ke database.`);

      api.management.createUser({
        nama: f.name,
        email: String(f.email || '').trim(),
        role: 'mitra',
        level: f.level || 'reseller',
        phone: f.phone,
        city: f.city,
        password: tempPassword,
        is_active: true
      }).then((res) => {
        const serverUser = res?.data;
        if (serverUser?.id) {
          newM.backendId = serverUser.id;
          commitMitra((prev) => prev.map((x) => x.id === newM.id ? { ...x, backendId: serverUser.id } : x));
        }
      }).catch((err) => {
        toast(`Gagal simpan ke database: ${err?.message || 'Error'}`, 'error');
      });
    }
  };

  const toggleMitra = (m) => {
    if (num(m.outstanding) > 0) {
      return toast('Mitra masih memiliki piutang. Selesaikan tagihan sebelum menonaktifkan.', 'error');
    }
    commitMitra((prev) => prev.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)));
    toast(`${m.name} ${m.active ? 'dinonaktifkan' : 'diaktifkan'}.`);
  };

  const deleteMitra = (m) => {
    setConfirmModal({
      title: 'Hapus Akun Mitra',
      message: `Hapus mitra "${m.name}"? Data akan dihapus dari sistem dan database.`,
      confirmLabel: 'Hapus Mitra',
      danger: true,
      onConfirm: () => {
        commitMitra((prev) => prev.filter((x) => x.id !== m.id));
        setConfirmModal(null);
        toast(`Mitra ${m.name} dihapus.`, 'warning');
        const targetId = m.backendId || (typeof m.id === 'number' ? m.id : String(m.id || '').replace(/\D/g, ''));
        if (targetId) {
          api.management.deleteUser(targetId).catch((err) => toast(`Gagal hapus di database: ${err?.message || 'Error'}`, 'error'));
        }
      }
    });
  };

  const saveTeam = (e) => {
    e.preventDefault();
    const f = teamModal.form;
    if (!f.name?.trim() || !f.email?.trim()) return toast('Nama dan email wajib diisi.', 'error');
    if (f.role === 'owner') return toast('Peran owner hanya dapat dibuat dari portal owner.', 'error');
    const tempPassword = `Tim#${Math.floor(1000 + Math.random() * 9000)}`;
    const newU = {
      id: uid('u'),
      name: f.name.trim(),
      email: f.email.trim(),
      role: f.role,
      phone: f.phone,
      active: true,
      createdAt: todayISO(),
      createdBy: me.name
    };
    commitTeam((prev) => [newU, ...prev]);
    setTeamModal(null);
    setCredential({
      title: 'Akun tim admin dibuat',
      name: newU.name,
      email: newU.email,
      password: tempPassword,
      note: `Peran: ${roleLabel(newU.role)}. Password hanya ditampilkan sekali.`
    });
    toast(`Akun tim ${newU.name} berhasil disimpan ke database.`);

    api.management.createUser({
      nama: newU.name,
      email: newU.email,
      role: newU.role,
      phone: newU.phone,
      password: tempPassword,
      is_active: true
    }).then((res) => {
      const serverUser = res?.data;
      if (serverUser?.id) {
        newU.backendId = serverUser.id;
        commitTeam((prev) => prev.map((x) => x.id === newU.id ? { ...x, backendId: serverUser.id } : x));
      }
    }).catch((err) => {
      toast(`Gagal simpan ke database: ${err?.message || 'Error'}`, 'error');
    });
  };

  const toggleTeam = (u) => {
    if (u.role === 'owner') return toast('Akun owner tidak dapat dinonaktifkan dari portal finance.', 'error');
    if (u.id === me.id) return toast('Tidak dapat menonaktifkan akun sendiri.', 'error');
    commitTeam((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)));
    toast(`${u.name} ${u.active ? 'dinonaktifkan' : 'diaktifkan'}.`);
    const targetId = u.backendId || u.id;
    api.management.updateUser(targetId, { is_active: !u.active }).catch(() => {});
  };

  const deleteTeam = (u) => {
    if (u.role === 'owner') return toast('Akun owner tidak dapat dihapus.', 'error');
    if (u.id === me.id || u.email === me.email) return toast('Tidak dapat menghapus akun sendiri yang sedang aktif.', 'error');
    setConfirmModal({
      title: 'Hapus Akun Tim Admin',
      message: `Hapus akun "${u.name}" (${roleLabel(u.role)})? Akses pengguna akan dicabut dari sistem dan database.`,
      confirmLabel: 'Hapus Akun',
      danger: true,
      onConfirm: () => {
        commitTeam((prev) => prev.filter((x) => x.id !== u.id));
        setConfirmModal(null);
        toast(`Akun tim ${u.name} berhasil dihapus.`, 'warning');
        const targetId = u.backendId || (typeof u.id === 'number' ? u.id : String(u.id || '').replace(/\D/g, ''));
        if (targetId) {
          api.management.deleteUser(targetId).catch((err) => toast(`Gagal hapus di database: ${err?.message || 'Error'}`, 'error'));
        }
      }
    });
  };

  const saveSettingsForm = (e) => {
    e.preventDefault();
    commitSettings((prev) => ({ ...prev, ...settingsForm }));
    toast('Pengaturan finance disimpan.');
  };

  const exportOrders = () => {
    downloadCSV(`monitoring_pesanan_${todayISO()}.csv`, [
      ['Invoice', 'Tanggal', 'Mitra', 'Level', 'Produk', 'Qty', 'Nilai', 'DP', 'Pelunasan', 'Ongkir', 'Sisa', 'Tahap', 'Resi'],
      ...orders.map((o) => [
        o.invoice,
        o.date,
        o.mitraName,
        o.level,
        o.produk,
        o.qty,
        o.subtotal,
        o.dpStatus,
        o.pelunasanStatus,
        o.ongkirStatus,
        orderOutstanding(o),
        stageMeta(orderStage(o)).label,
        o.resi || ''
      ])
    ]);
    toast('Monitoring pesanan diunduh.');
  };

  const exportLedger = () => {
    downloadCSV(`buku_kas_${todayISO()}.csv`, [
      ['Tanggal', 'Tipe', 'Referensi', 'Mitra / Tujuan', 'Nominal', 'Arah', 'Bank', 'Oleh', 'Status'],
      ...ledgerRows.map((l) => [
        l.date,
        l.type,
        l.ref,
        l.mitraName,
        l.nominal,
        l.direction === 'out' ? 'Keluar' : 'Masuk',
        l.bank,
        l.by,
        l.status
      ])
    ]);
    toast('Buku kas diunduh.');
  };

  const goTo = (menu) => setActiveMenu(menu);

  const blankMitra = { name: '', email: '', level: 'Agen', phone: '', city: '', address: '', active: true };

  /* ------------------------------------------------------------------ render */
  return (
    <>
      <DashboardShell
        accent={accent}
        menus={menus}
        activeMenu={activeMenu}
        onNavigate={setActiveMenu}
        portalLabel="Admin Finance"
        portalSub="AfatharShop · Verifikasi & Operasional PO"
        currentUser={me}
        onLogout={onLogout}
        onNavigateStore={onNavigateStore}
        notifications={notifications}
        headerRight={
          <Button variant="outline" icon="download" onClick={exportOrders}>
            Ekspor Pesanan
          </Button>
        }
      >
        {/* ============================= DASHBOARD ============================= */}
        {activeMenu === 'dashboard' && (
          <>
            <PageHead
              title="Dashboard Finance"
              desc="Pantau verifikasi pembayaran, input ongkir, pengiriman, dan arus kas PO dalam satu tempat."
              badge={<Badge tone="emerald">{roleLabel('finance')}</Badge>}
              actions={
                <>
                  <Button variant="outline" icon="upload" onClick={() => goTo('input_bukti')}>
                    Input Bukti TF
                  </Button>
                  <Button icon="plus" onClick={() => goTo('pengajuan')}>
                    Ajukan Pembayaran
                  </Button>
                </>
              }
            />

            <div className="space-y-2">
              <PoClosingReminder products={products} onAction={() => goTo('reminder')} actionLabel="Buka Reminder" />
              <TerminDueReminder products={products} onAction={() => goTo('reminder')} actionLabel="Buka Reminder" />
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard
                label="Menunggu Verifikasi"
                value={totalPendingDocs}
                sub={rp(totalPendingValue)}
                tone="blue"
                icon="wallet"
                badge={totalPendingDocs > 0 ? <Badge tone="blue">Perlu tindakan</Badge> : null}
                hint={`${pendingDp.length} DP  ·  ${pendingPelunasan.length} pelunasan  ·  ${pendingOngkir.length} ongkir  ·  ${pendingDeposit.length} deposit`}
              />
              <MetricCard
                label="Kas Masuk"
                value={rp(kasMasuk)}
                sub={`${ledger.filter((l) => l.status === PAY.ACC).length} transaksi ACC`}
                tone="emerald"
                icon="card"
                hint="Pembayaran mitra & deposit yang sudah ACC"
                onClick={() => goTo('buku_kas')}
              />
              <MetricCard
                label="Piutang Berjalan"
                value={rp(piutang)}
                sub={`${activeOrders.length} pesanan aktif`}
                tone="red"
                icon="receipt"
                hint="Sisa tagihan mitra yang belum lunas"
                onClick={() => goTo('reminder')}
              />
              <MetricCard
                label="Siap Dikirim"
                value={readyToShip.length}
                sub={`${needOngkir.length} pesanan perlu input ongkir`}
                tone="orange"
                icon="truck"
                hint={`${shippedOrders.length} sedang dalam pengiriman`}
                onClick={() => goTo('pengiriman')}
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card
                title="Antrean Verifikasi"
                subtitle="Pembayaran menunggu pengecekan mutasi"
                className="lg:col-span-2"
                action={<Badge tone="blue">{totalPendingDocs} dokumen</Badge>}
              >
                <div className="divide-y divide-gray-100">
                  {[
                    { meta: VERIF_META.verif_dp, rows: pendingDp, amount: sumBy(pendingDp, (o) => o.dpNominal), menu: 'verif_dp' },
                    { meta: VERIF_META.verif_pelunasan, rows: pendingPelunasan, amount: sumBy(pendingPelunasan, (o) => o.pelunasanNominal), menu: 'verif_pelunasan' },
                    { meta: VERIF_META.verif_ongkir, rows: pendingOngkir, amount: sumBy(pendingOngkir, (o) => o.ongkir), menu: 'verif_ongkir' },
                    { meta: DEP_META, rows: pendingDeposit, amount: sumBy(pendingDeposit, (d) => d.nominal), menu: 'verif_deposit' }
                  ].map(({ meta, rows, amount, menu }) => (
                    <button
                      key={menu}
                      type="button"
                      onClick={() => goTo(menu)}
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          meta.tone === 'blue'
                            ? 'bg-sky-50 text-sky-700'
                            : meta.tone === 'indigo'
                            ? 'bg-indigo-50 text-indigo-700'
                            : meta.tone === 'orange'
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-violet-50 text-violet-700'
                        }`}>
                          <Icon name={meta.icon} className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900">{meta.title}</p>
                          <p className="text-[10px] text-gray-400">{rows.length} dokumen menunggu</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-gray-900">{rp(amount)}</p>
                        <p className="text-[10px] text-sky-700 font-semibold">Periksa  → </p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              <Card title="Operasional Hari Ini" subtitle="Pekerjaan lapangan yang menunggu">
                <div className="p-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => goTo('ongkir')}
                    className="w-full flex items-center justify-between gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 text-left hover:bg-orange-100/70"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-orange-800">Input ongkir</p>
                      <p className="text-[10px] text-orange-700/70">Pesanan ready dengan alamat lengkap</p>
                    </div>
                    <span className="text-lg font-bold text-orange-700">{needOngkir.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo('pengiriman')}
                    className="w-full flex items-center justify-between gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2.5 text-left hover:bg-teal-100/70"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-teal-800">Input resi</p>
                      <p className="text-[10px] text-teal-700/70">Sudah lunas & siap dikirim</p>
                    </div>
                    <span className="text-lg font-bold text-teal-700">{readyToShip.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo('pengajuan')}
                    className="w-full flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-left hover:bg-amber-100/70"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-amber-800">Pengajuan aktif</p>
                      <p className="text-[10px] text-amber-700/70">
                        {approvedPr.length} disetujui owner  ·  menunggu transfer
                      </p>
                    </div>
                    <span className="text-lg font-bold text-amber-700">{pendingPr.length}</span>
                  </button>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[10px] font-semibold uppercase text-gray-400 mb-1">Dana keluar</p>
                    <p className="text-sm font-bold text-rose-600">{rp(kasKeluar)}</p>
                    <p className="text-[10px] text-gray-400">Pengajuan yang sudah ditransfer owner</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card
                title="Tagihan Jatuh Tempo"
                subtitle="Prioritas penagihan mitra"
                action={
                  <button type="button" onClick={() => goTo('reminder')} className={`text-[10px] font-bold ${accent.text} hover:underline`}>
                    Lihat semua
                  </button>
                }
              >
                <div className="divide-y divide-gray-100">
                  {agingRows.slice(0, 5).map((o) => (
                    <div key={o.invoice} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-gray-900">
                          {o.invoice} <span className="font-normal text-gray-500"> ·  {o.mitraName}</span>
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Jatuh tempo {fmtDate(o.due)} {o.late > 0 ? ` ·  terlambat ${o.late} hari` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-bold text-rose-600">{rp(o.outstanding)}</p>
                        <button
                          type="button"
                          onClick={() => openWA(o, 'ringkasan')}
                          className="text-[10px] font-bold text-sky-700 hover:underline"
                        >
                          Reminder WA
                        </button>
                      </div>
                    </div>
                  ))}
                  {agingRows.length === 0 && (
                    <p className="px-4 py-6 text-center text-[11px] text-gray-400">Tidak ada piutang berjalan.</p>
                  )}
                </div>
              </Card>

              <Card
                title="Posisi Tahap Pesanan"
                subtitle="Distribusi seluruh pesanan PO"
                action={<Badge tone="gray">{orders.length} pesanan</Badge>}
              >
                <div className="p-4 space-y-2">
                  {['dp', 'produksi', 'alamat', 'ongkir', 'pelunasan', 'ongkir_bayar', 'kirim', 'dikirim', 'selesai'].map((id) => {
                    const count = orders.filter((o) => orderStage(o) === id).length;
                    const meta = stageMeta(id);
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-24 shrink-0">{meta.label}</span>
                        <span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <span
                            className={`block h-full rounded-full ${
                              meta.tone === 'amber'
                                ? 'bg-amber-400'
                                : meta.tone === 'blue'
                                ? 'bg-sky-500'
                                : meta.tone === 'violet'
                                ? 'bg-violet-500'
                                : meta.tone === 'cyan'
                                ? 'bg-cyan-500'
                                : meta.tone === 'orange'
                                ? 'bg-orange-400'
                                : meta.tone === 'indigo'
                                ? 'bg-indigo-500'
                                : meta.tone === 'teal'
                                ? 'bg-teal-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (count / Math.max(1, orders.length)) * 100)}%` }}
                          />
                        </span>
                        <span className="text-[10px] font-bold text-gray-700 w-5 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ========================= PUSAT VERIFIKASI ======================= */}
        {verifMeta && (
          <>
            <PageHead
              title={verifMeta.title}
              desc={verifMeta.desc}
              badge={<Badge tone="blue">{verifCounts.menunggu} menunggu</Badge>}
              actions={
                <Button variant="outline" icon="upload" onClick={() => goTo('input_bukti')}>
                  Input Bukti Manual
                </Button>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard
                label="Menunggu Verifikasi"
                value={verifCounts.menunggu}
                sub={rp(sumBy(verifRows.filter((r) => r.status === PAY.MENUNGGU), (r) => r.amount))}
                tone="blue"
                icon="clock"
              />
              <MetricCard
                label="Sudah ACC"
                value={verifCounts.acc}
                sub={rp(sumBy(verifRows.filter((r) => r.status === PAY.ACC), (r) => r.amount))}
                tone="emerald"
                icon="check"
              />
              <MetricCard
                label="Ditolak"
                value={verifCounts.tolak}
                sub="Perlu perbaikan bukti"
                tone="red"
                icon="alert"
              />
              <MetricCard
                label="Total Dokumen"
                value={verifCounts.all}
                sub={verifMeta.kind === 'Deposit' ? 'Termasuk saldo deposit' : 'Semua bukti pembayaran'}
                tone="violet"
                icon="file"
              />
            </div>

            <Card
              title={`Dokumen ${verifMeta.kind}`}
              subtitle={
                verifMeta.kind === 'Deposit'
                  ? 'Saldo mitra otomatis bertambah setelah deposit di-ACC.'
                  : 'Cocokkan nominal, rekening, dan tanggal transfer dengan mutasi bank.'
              }
              action={
                <Segmented
                  value={verifTab}
                  onChange={setVerifTab}
                  options={[
                    { value: 'menunggu', label: 'Menunggu', count: verifCounts.menunggu },
                    { value: 'acc', label: 'ACC', count: verifCounts.acc },
                    { value: 'tolak', label: 'Ditolak', count: verifCounts.tolak },
                    { value: 'all', label: 'Semua', count: verifCounts.all }
                  ]}
                />
              }
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="w-full sm:w-80">
                  <SearchBox
                    value={verifSearch}
                    onChange={setVerifSearch}
                    placeholder="Cari invoice, mitra, produk..."
                  />
                </div>
              </div>
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Referensi</th>
                    <th className={TH}>Mitra</th>
                    <th className={TH}>Produk / Keterangan</th>
                    <th className={`${TH} text-right`}>Nominal</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Bukti</th>
                    <th className={TH}>Verifikasi</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shownVerif.map((row) => (
                    <tr key={row.key} className="hover:bg-gray-50/70">
                      <td className={TD}>
                        {row.order ? (
                          <button
                            type="button"
                            onClick={() => setDetailInvoice(row.order.invoice)}
                            className="font-bold text-sky-700 hover:underline"
                          >
                            {row.ref}
                          </button>
                        ) : (
                          <p className="font-bold text-gray-900">{row.ref}</p>
                        )}
                        <p className="text-[10px] text-gray-400">{fmtDate(row.date)}</p>
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-gray-900">{row.mitraName}</p>
                        <p className="text-[10px] text-gray-400">{row.level}</p>
                      </td>
                      <td className={`${TD} max-w-[220px]`}>
                        <p className="text-gray-800">{row.produk}</p>
                        {row.note && <p className="text-[10px] text-rose-600">{row.note}</p>}
                      </td>
                      <td className={`${TD} text-right font-bold text-gray-900`}>{rp(row.amount)}</td>
                      <td className={TD}>
                        <PayBadge status={row.status} />
                      </td>
                      <td className={TD}>
                        <ProofThumb
                          src={row.proof}
                          onClick={() => setProofView({ src: row.proof, title: `Bukti ${verifMeta.kind} ${row.ref}` })}
                        />
                      </td>
                      <td className={TD}>
                        {row.verifiedBy ? (
                          <>
                            <p className="text-[11px] font-medium text-gray-800">{row.verifiedBy}</p>
                            <p className="text-[10px] text-gray-400">{fmtDate(row.date)}</p>
                          </>
                        ) : (
                          <span className="text-[11px] text-gray-400"> — </span>
                        )}
                      </td>
                      <td className={`${TD} text-right`}>
                        {row.status === PAY.MENUNGGU ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="xs"
                              variant="dangerOutline"
                              onClick={() =>
                                setReasonModal({
                                  title: `Tolak ${verifMeta.kind}`,
                                  subtitle: `${row.ref}  ·  ${row.mitraName}  ·  ${rp(row.amount)}`,
                                  label: 'Alasan penolakan',
                                  placeholder: 'Contoh: nominal tidak sesuai mutasi / bukti tidak terbaca',
                                  confirmLabel: 'Tolak pembayaran',
                                  danger: true,
                                  onSubmit: (note) => {
                                    rejectPayment(row, note);
                                    setReasonModal(null);
                                  }
                                })
                              }
                            >
                              Tolak
                            </Button>
                            <Button
                              size="xs"
                              icon="check"
                              onClick={() =>
                                setConfirmModal({
                                  title: `ACC ${verifMeta.kind}`,
                                  message:
                                    verifMeta.kind === 'Deposit'
                                      ? `Verifikasi deposit ${row.mitraName} sebesar ${rp(row.amount)}? Saldo mitra akan bertambah.`
                                      : `Verifikasi ${verifMeta.kind} ${row.ref} sebesar ${rp(row.amount)}? Pastikan dana sudah masuk rekening.`,
                                  confirmLabel: 'ACC pembayaran',
                                  onConfirm: () => approvePayment(row)
                                })
                              }
                            >
                              ACC
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400">
                            {row.status === PAY.ACC ? 'Terbukti' : 'Ditolak'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {shownVerif.length === 0 && (
                <EmptyState
                  title="Tidak ada dokumen"
                  desc="Belum ada bukti pembayaran pada filter ini."
                  icon={verifMeta.icon}
                />
              )}
            </Card>
          </>
        )}

        {/* ========================= INPUT BUKTI TF ========================= */}
        {activeMenu === 'input_bukti' && (
          <>
            <PageHead
              title="Input Manual Bukti Transfer"
              desc="Catat pembayaran mitra yang masuk melalui transfer manual atau konfirmasi WhatsApp. Setelah disimpan, bukti masuk antrean verifikasi."
              badge={<Badge tone="blue">{pendingProofList.length} menunggu verifikasi</Badge>}
              actions={
                <Button
                  variant="outline"
                  icon="refresh"
                  onClick={() =>
                    setProofForm((prev) => ({ ...prev, invoice: '', nominal: '', refNo: '', proof: '' }))
                  }
                >
                  Reset Form
                </Button>
              }
            />

            <div className="grid lg:grid-cols-3 gap-4">
              <Card title="Form Bukti Transfer" subtitle="DP, pelunasan, ongkir, atau deposit" className="lg:col-span-2">
                <form onSubmit={submitProofForm} className="p-4 sm:p-5 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Mitra" required>
                      <Select
                        value={proofForm.mitraId}
                        onChange={(e) =>
                          setProofForm((prev) => ({ ...prev, mitraId: e.target.value, invoice: '' }))
                        }
                      >
                        <option value="">Pilih mitra...</option>
                        {mitra
                          .filter((m) => m.active)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} - {m.level}
                            </option>
                          ))}
                      </Select>
                    </Field>
                    <Field label="Jenis Pembayaran" required>
                      <Select
                        value={proofForm.kind}
                        onChange={(e) => {
                          const nextKind = e.target.value;
                          const o = orders.find((x) => x.invoice === proofForm.invoice);
                          const suggested =
                            nextKind === 'DP'
                              ? o?.dpNominal
                              : nextKind === 'Pelunasan'
                              ? o?.pelunasanNominal
                              : nextKind === 'Ongkir'
                              ? o?.ongkir
                              : '';
                          setProofForm((prev) => ({
                            ...prev,
                            kind: nextKind,
                            invoice: nextKind === 'Deposit' ? '' : prev.invoice,
                            nominal: suggested || ''
                          }));
                        }}
                      >
                        {['DP', 'Pelunasan', 'Ongkir', 'Deposit'].map((kind) => (
                          <option key={kind} value={kind}>
                            {kind}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  {proofForm.kind !== 'Deposit' && (
                    <Field label="Invoice Terkait" required hint="Hanya invoice milik mitra yang dipilih.">
                      <Select
                        value={proofForm.invoice}
                        onChange={(e) => {
                          const invoice = e.target.value;
                          const o = orders.find((x) => x.invoice === invoice);
                          const suggested =
                            proofForm.kind === 'DP'
                              ? o?.dpNominal
                              : proofForm.kind === 'Pelunasan'
                              ? o?.pelunasanNominal
                              : o?.ongkir;
                          setProofForm((prev) => ({ ...prev, invoice, nominal: suggested || '' }));
                        }}
                      >
                        <option value="">Pilih invoice...</option>
                        {orders
                          .filter((o) => o.mitraId === proofForm.mitraId && orderStage(o) !== 'ditolak')
                          .filter((o) => {
                            const statusKey = { DP: 'dpStatus', Pelunasan: 'pelunasanStatus', Ongkir: 'ongkirStatus' }[
                              proofForm.kind
                            ];
                            return o[statusKey] !== PAY.ACC;
                          })
                          .map((o) => (
                            <option key={o.invoice} value={o.invoice}>
                              {o.invoice} - {o.produk} - sisa {rp(orderOutstanding(o))}
                            </option>
                          ))}
                      </Select>
                    </Field>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Nominal Transfer" required>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={proofForm.nominal}
                        onChange={(e) => setProofForm((prev) => ({ ...prev, nominal: e.target.value }))}
                      />
                    </Field>
                    <Field label="Tanggal Transfer" required>
                      <Input
                        type="date"
                        value={proofForm.date}
                        onChange={(e) => setProofForm((prev) => ({ ...prev, date: e.target.value }))}
                      />
                    </Field>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Rekening Tujuan">
                      <Select
                        value={proofForm.bankId}
                        onChange={(e) => setProofForm((prev) => ({ ...prev, bankId: e.target.value }))}
                      >
                        {bankAccounts
                          .filter((b) => b.active)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.bank} - {b.accountNo}
                            </option>
                          ))}
                      </Select>
                    </Field>
                    <Field label="No. Referensi">
                      <Input
                        placeholder="Contoh: TRF-778812"
                        value={proofForm.refNo}
                        onChange={(e) => setProofForm((prev) => ({ ...prev, refNo: e.target.value }))}
                      />
                    </Field>
                  </div>

                  <Field label="Berkas Bukti" hint="JPG atau PNG, maksimal 2 MB.">
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={(e) => handleProofFile(e.target.files?.[0])}
                        className="block w-full text-[11px] text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                      />
                      <div className="flex items-center gap-3 flex-wrap">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setProofForm((prev) => ({ ...prev, proof: SAMPLE_PROOF_2 }))}
                        >
                          Gunakan contoh bukti
                        </Button>
                        {proofForm.proof && (
                          <ProofThumb
                            src={proofForm.proof}
                            onClick={() => setProofView({ src: proofForm.proof, title: 'Pratinjau bukti transfer' })}
                            label="Pratinjau"
                          />
                        )}
                      </div>
                    </div>
                  </Field>

                  <div className="flex justify-end">
                    <Button type="submit" icon="check">
                      Simpan Bukti
                    </Button>
                  </div>
                </form>
              </Card>

              <div className="space-y-4">
                <Card title="Rekening Resmi" subtitle="Sumber pencocokan mutasi">
                  <div className="divide-y divide-gray-100">
                    {bankAccounts
                      .filter((b) => b.active)
                      .map((b) => (
                        <div key={b.id} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-gray-900">{b.bank}</p>
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await copyText(b.accountNo);
                                toast(ok ? 'Nomor rekening disalin.' : 'Gagal menyalin.', ok ? 'success' : 'error');
                              }}
                              className="text-[10px] font-semibold text-sky-700 hover:underline"
                            >
                              Salin
                            </button>
                          </div>
                          <p className="text-[11px] font-mono text-gray-600">{b.accountNo}</p>
                          <p className="text-[10px] text-gray-400">{b.holder}</p>
                        </div>
                      ))}
                  </div>
                </Card>

                <Card title="Menunggu Verifikasi">
                  <div className="divide-y divide-gray-100">
                    {pendingProofList.slice(0, 5).map((row) => (
                      <div key={row.key} className="px-4 py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-gray-900 truncate">
                            {row.invoice}  ·  {row.mitra}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {row.kind}  ·  {rp(row.amount)}
                          </p>
                        </div>
                        <ProofThumb
                          src={row.proof}
                          onClick={() => setProofView({ src: row.proof, title: `Bukti ${row.kind} ${row.invoice}` })}
                          label=""
                        />
                      </div>
                    ))}
                    {pendingProofList.length === 0 && (
                      <p className="px-4 py-6 text-center text-[11px] text-gray-400">Semua bukti sudah diverifikasi.</p>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* ============================ INPUT ONGKIR ======================== */}
        {activeMenu === 'ongkir' && (
          <>
            <PageHead
              title="Input Ongkir & Ekspedisi"
              desc="Pesanan yang sudah READY dan memiliki alamat lengkap siap dihitung ongkirnya. Mitra akan menerima tagihan otomatis."
              badge={<Badge tone="orange">{needOngkir.length} pesanan menunggu</Badge>}
              actions={
                <Button variant="outline" icon="chat" onClick={() => goTo('pengiriman')}>
                  Lihat Pengiriman
                </Button>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Perlu Input Ongkir" value={needOngkir.length} sub="Ready + alamat lengkap" tone="orange" icon="truck" />
              <MetricCard
                label="Menunggu Bayar Ongkir"
                value={orders.filter((o) => o.ongkirStatus === PAY.BELUM && o.ongkir > 0).length}
                sub={rp(sumBy(orders.filter((o) => o.ongkirStatus === PAY.BELUM), (o) => o.ongkir))}
                tone="amber"
                icon="wallet"
              />
              <MetricCard label="Ongkir Terverifikasi" value={orders.filter((o) => o.ongkirStatus === PAY.ACC).length} sub="Siap masuk pengiriman" tone="emerald" icon="check" />
              <MetricCard
                label="Total Ongkir Ditagihkan"
                value={rp(sumBy(orders.filter((o) => o.ongkir > 0), (o) => o.ongkir))}
                sub={`${orders.filter((o) => o.ongkir > 0).length} pesanan`}
                tone="blue"
                icon="card"
              />
            </div>

            <Card
              title="Perlu Input Ongkir"
              subtitle="Hitung ongkir berdasarkan ekspedisi dan berat"
              action={<Badge tone="orange">{needOngkir.length}</Badge>}
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Invoice</th>
                    <th className={TH}>Mitra</th>
                    <th className={TH}>Produk</th>
                    <th className={TH}>Alamat Pengiriman</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {needOngkir.map((o) => (
                    <tr key={o.invoice} className="hover:bg-gray-50/70">
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => setDetailInvoice(o.invoice)}
                          className="font-bold text-sky-700 hover:underline"
                        >
                          {o.invoice}
                        </button>
                        <p className="text-[10px] text-gray-400">Ready {o.readyAt ? fmtDate(o.readyAt) : '-'}</p>
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-gray-900">{o.mitraName}</p>
                        <p className="text-[10px] text-gray-400">{o.level}  ·  {o.phone}</p>
                      </td>
                      <td className={TD}>
                        <p className="text-gray-800">{o.produk}</p>
                        <p className="text-[10px] text-gray-400">{o.variant}  ·  {o.qty} pcs</p>
                      </td>
                      <td className={`${TD} max-w-[260px] text-[11px] text-gray-600`}>{addressText(o)}</td>
                      <td className={`${TD} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="xs" variant="outline" icon="chat" onClick={() => openWA(o, 'ready')}>
                            WA
                          </Button>
                          <Button
                            size="xs"
                            icon="truck"
                            onClick={() =>
                              setOngkirModal({
                                order: o,
                                form: {
                                  ekspedisi: o.ekspedisi || '',
                                  ongkir: o.ongkir || '',
                                  weight: o.weight || '',
                                  note: o.shippingNote || ''
                                }
                              })
                            }
                          >
                            Input Ongkir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {needOngkir.length === 0 && (
                <EmptyState
                  title="Semua ongkir sudah diinput"
                  desc="Belum ada pesanan READY yang menunggu perhitungan ongkir."
                  icon="truck"
                />
              )}
            </Card>

            <Card
              title="Ongkir Sudah Diinput"
              subtitle="Menunggu pembayaran atau verifikasi mitra"
              action={<Badge tone="gray">{orders.filter((o) => o.ongkir > 0).length} pesanan</Badge>}
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Invoice</th>
                    <th className={TH}>Mitra</th>
                    <th className={TH}>Ekspedisi</th>
                    <th className={`${TH} text-right`}>Berat</th>
                    <th className={`${TH} text-right`}>Ongkir</th>
                    <th className={TH}>Status</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders
                    .filter((o) => o.ongkir > 0)
                    .map((o) => (
                      <tr key={o.invoice} className="hover:bg-gray-50/70">
                        <td className={TD}>
                          <p className="font-semibold text-gray-900">{o.invoice}</p>
                          <p className="text-[10px] text-gray-400">{o.produk}</p>
                        </td>
                        <td className={TD}>{o.mitraName}</td>
                        <td className={TD}>{o.ekspedisi || ' — '}</td>
                        <td className={`${TD} text-right`}>{o.weight ? `${o.weight} kg` : ' — '}</td>
                        <td className={`${TD} text-right font-bold text-gray-900`}>{rp(o.ongkir)}</td>
                        <td className={TD}>
                          <PayBadge status={o.ongkirStatus} />
                        </td>
                        <td className={`${TD} text-right`}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="xs" variant="outline" onClick={() => openWA(o, 'ongkir')}>
                              Tagih WA
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              icon="edit"
                              onClick={() =>
                                setOngkirModal({
                                  order: o,
                                  form: {
                                    ekspedisi: o.ekspedisi || '',
                                    ongkir: o.ongkir || '',
                                    weight: o.weight || '',
                                    note: o.shippingNote || ''
                                  }
                                })
                              }
                            >
                              Ubah
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </TableWrap>
              {orders.filter((o) => o.ongkir > 0).length === 0 && (
                <EmptyState title="Belum ada ongkir" desc="Ongkir yang sudah diinput akan tampil di sini." icon="truck" />
              )}
            </Card>
          </>
        )}

        {/* =========================== PENGIRIMAN =========================== */}
        {activeMenu === 'pengiriman' && (
          <>
            <PageHead
              title="Pengiriman & Input Resi"
              desc="Input nomor resi setelah pembayaran lunas, pantau paket yang dikirim, dan tandai pesanan diterima."
              badge={<Badge tone="teal">{readyToShip.length} siap kirim</Badge>}
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Siap Kirim" value={readyToShip.length} sub="Lunas & menunggu resi" tone="teal" icon="box" />
              <MetricCard label="Dikirim" value={shippedOrders.length} sub="Dalam perjalanan" tone="blue" icon="truck" />
              <MetricCard label="Selesai" value={doneOrders.length} sub="Dikonfirmasi diterima" tone="emerald" icon="check" />
              <MetricCard
                label="Total Nilai Dikirim"
                value={rp(sumBy([...shippedOrders, ...doneOrders], (o) => o.subtotal))}
                sub={`${shippedOrders.length + doneOrders.length} pesanan`}
                tone="violet"
                icon="receipt"
              />
            </div>

            <Card
              title="Daftar Pengiriman"
              subtitle="Kelola resi dan status paket"
              action={<Segmented value={shipTab} onChange={setShipTab} options={SHIP_TABS} />}
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Invoice</th>
                    <th className={TH}>Mitra</th>
                    <th className={TH}>Alamat</th>
                    <th className={TH}>Ekspedisi / Ongkir</th>
                    <th className={TH}>Resi</th>
                    <th className={TH}>Status</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(shipTab === 'siap' ? readyToShip : shipTab === 'dikirim' ? shippedOrders : doneOrders).map((o) => (
                    <tr key={o.invoice} className="hover:bg-gray-50/70">
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => setDetailInvoice(o.invoice)}
                          className="font-bold text-sky-700 hover:underline"
                        >
                          {o.invoice}
                        </button>
                        <p className="text-[10px] text-gray-400">{o.produk}  ·  {o.qty} pcs</p>
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-gray-900">{o.mitraName}</p>
                        <p className="text-[10px] text-gray-400">{o.phone}</p>
                      </td>
                      <td className={`${TD} max-w-[240px] text-[11px] text-gray-600`}>{addressText(o)}</td>
                      <td className={TD}>
                        <p className="text-gray-800">{o.ekspedisi || ' — '}</p>
                        <p className="text-[10px] text-gray-400">{o.ongkir ? rp(o.ongkir) : ' — '}  ·  {o.weight ? `${o.weight} kg` : ' — '}</p>
                      </td>
                      <td className={TD}>
                        {o.resi ? (
                          <>
                            <p className="font-mono text-[11px] font-semibold text-gray-900">{o.resi}</p>
                            <p className="text-[10px] text-gray-400">{o.shippedAt ? fmtDate(o.shippedAt) : ''}</p>
                          </>
                        ) : (
                          <span className="text-[11px] text-gray-400">Belum ada resi</span>
                        )}
                      </td>
                      <td className={TD}>
                        <Badge
                          tone={
                            o.shipStatus === SHIP.DITERIMA
                              ? 'emerald'
                              : o.shipStatus === SHIP.DIKIRIM
                              ? 'blue'
                              : o.shipStatus === SHIP.SIAP
                              ? 'teal'
                              : 'gray'
                          }
                        >
                          {o.shipStatus}
                        </Badge>
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          {shipTab === 'siap' && (
                            <Button
                              size="xs"
                              icon="truck"
                              onClick={() =>
                                setResiModal({
                                  order: o,
                                  form: { resi: '', notify: true }
                                })
                              }
                            >
                              Input Resi
                            </Button>
                          )}
                          {shipTab === 'dikirim' && (
                            <>
                              <Button size="xs" variant="outline" icon="chat" onClick={() => openWA(o, 'shipped')}>
                                WA
                              </Button>
                              <Button size="xs" icon="check" onClick={() => markReceived(o)}>
                                Diterima
                              </Button>
                            </>
                          )}
                          {shipTab === 'selesai' && o.receivedAt && (
                            <span className="text-[10px] text-gray-400">{fmtDate(o.receivedAt)}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {((shipTab === 'siap' && readyToShip.length === 0) ||
                (shipTab === 'dikirim' && shippedOrders.length === 0) ||
                (shipTab === 'selesai' && doneOrders.length === 0)) && (
                <EmptyState
                  title="Tidak ada pesanan"
                  desc="Belum ada pesanan pada tahap ini."
                  icon="truck"
                />
              )}
            </Card>
          </>
        )}

        {/* ============================ SEMUA PESANAN ======================= */}
        {activeMenu === 'pesanan' && (
          <>
            <PageHead
              title="Monitoring Pesanan PO"
              desc="Pantau seluruh pesanan di setiap tahap, verifikasi pembayaran, dan update status operasional."
              badge={<Badge tone="gray">{orders.length} pesanan</Badge>}
              actions={
                <Button variant="outline" icon="download" onClick={exportOrders}>
                  Ekspor CSV
                </Button>
              }
            />

            <StageTabs orders={orders} value={stageFilter} onChange={setStageFilter} />

            <Card>
              <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
                <div className="w-full sm:w-72">
                  <SearchBox value={listSearch} onChange={setListSearch} placeholder="Cari invoice, mitra, produk..." />
                </div>
                <Select value={listBrand} onChange={(e) => setListBrand(e.target.value)} className="w-36">
                  <option value="all">Semua brand</option>
                  {[...new Set(orders.map((o) => o.brand))].map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </Select>
                <span className="text-[11px] text-gray-400 ml-auto">{filteredOrders.length} hasil</span>
              </div>
              <OrdersTable
                orders={orderPag.rows}
                onOpen={(o) => setDetailInvoice(o.invoice)}
                renderActions={(o) => (
                  <>
                    <Button size="xs" variant="outline" onClick={() => setDetailInvoice(o.invoice)}>
                      Detail
                    </Button>
                    {o.dpStatus === PAY.MENUNGGU && (
                      <Button size="xs" onClick={() => goTo('verif_dp')}>
                        Verif DP
                      </Button>
                    )}
                    {o.pelunasanStatus === PAY.MENUNGGU && (
                      <Button size="xs" onClick={() => goTo('verif_pelunasan')}>
                        Verif Lunas
                      </Button>
                    )}
                    {o.ongkirStatus === PAY.MENUNGGU && (
                      <Button size="xs" onClick={() => goTo('verif_ongkir')}>
                        Verif Ongkir
                      </Button>
                    )}
                    {orderStage(o) === 'ongkir' && (
                      <Button
                        size="xs"
                        variant="soft"
                        onClick={() =>
                          setOngkirModal({
                            order: o,
                            form: {
                              ekspedisi: o.ekspedisi || '',
                              ongkir: o.ongkir || '',
                              weight: o.weight || '',
                              note: o.shippingNote || ''
                            }
                          })
                        }
                      >
                        Input Ongkir
                      </Button>
                    )}
                    {orderStage(o) === 'kirim' && (
                      <Button
                        size="xs"
                        variant="soft"
                        onClick={() => setResiModal({ order: o, form: { resi: '', notify: true } })}
                      >
                        Input Resi
                      </Button>
                    )}
                    {orderStage(o) === 'dikirim' && (
                      <Button size="xs" variant="soft" onClick={() => markReceived(o)}>
                        Diterima
                      </Button>
                    )}
                  </>
                )}
              />
              <Pagination
                page={orderPag.page}
                pageSize={orderPag.pageSize}
                total={orderPag.total}
                onPageChange={orderPag.setPage}
                onPageSizeChange={orderPag.setPageSize}
              />
            </Card>
          </>
        )}

        {/* ====================== PENGAJUAN PEMBAYARAN ====================== */}
        {activeMenu === 'pengajuan' && (
          <>
            <PageHead
              title="Pengajuan Pembayaran ke Owner"
              desc="Ajukan kebutuhan dana produksi, ongkir, atau operasional. Alur approval: Purchasing  →  Owner  →  Transfer."
              badge={<Badge tone="amber">{pendingPr.length} pengajuan aktif</Badge>}
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard
                label="Review Purchasing"
                value={prCounts[PREQ.REVIEW_MKT] || 0}
                sub="Menunggu persetujuan purchasing"
                tone="amber"
                icon="clock"
                onClick={() => setPrFilter(PREQ.REVIEW_MKT)}
              />
              <MetricCard
                label="Approval Owner"
                value={prCounts[PREQ.APPROVAL_OWNER] || 0}
                sub="Menunggu keputusan owner"
                tone="violet"
                icon="shield"
                onClick={() => setPrFilter(PREQ.APPROVAL_OWNER)}
              />
              <MetricCard
                label="Siap Ditransfer"
                value={approvedPr.length}
                sub={rp(sumBy(approvedPr, (r) => r.amount))}
                tone="blue"
                icon="wallet"
              />
              <MetricCard
                label="Sudah Ditransfer"
                value={transferredPr.length}
                sub={rp(sumBy(transferredPr, (r) => r.amount))}
                tone="emerald"
                icon="check"
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card title="Buat Pengajuan" subtitle="Dana akan ditransfer owner ke rekening tujuan">
                <form onSubmit={savePR} className="p-4 space-y-3">
                  <Field label="Pilih Brand Terkait (Ambil dari Brand)" hint="Otomatis menyaring rekening bank vendor terkait">
                    <Select
                      value={prForm.brand || ''}
                      onChange={(e) => {
                        const selectedBrandName = e.target.value;
                        setPrForm((prev) => {
                          const next = { ...prev, brand: selectedBrandName };
                          if (selectedBrandName) {
                            const matchedBank = bankAccounts.find(
                              (b) =>
                                b.type === 'pengajuan' &&
                                b.active &&
                                Array.isArray(b.brands) &&
                                b.brands.includes(selectedBrandName)
                            );
                            if (matchedBank) {
                              next.bankId = matchedBank.id;
                            }
                            if (!prev.purpose) {
                              next.purpose = `Pembayaran produksi brand ${selectedBrandName}`;
                            }
                          }
                          return next;
                        });
                      }}
                    >
                      <option value="">-- Pilih Brand (Semua) --</option>
                      {brands.map((br) => {
                        const bName = typeof br === 'object' ? br.name : br;
                        return (
                          <option key={bName} value={bName}>
                            {bName}
                          </option>
                        );
                      })}
                    </Select>
                  </Field>

                  <Field label="Tujuan Pembayaran" required>
                    <Input
                      placeholder="Contoh: DP produksi supplier / konveksi"
                      value={prForm.purpose}
                      onChange={(e) => setPrForm((prev) => ({ ...prev, purpose: e.target.value }))}
                    />
                  </Field>
                  <Field label="Nominal" required>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={prForm.amount}
                      onChange={(e) => setPrForm((prev) => ({ ...prev, amount: e.target.value }))}
                    />
                  </Field>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Rekening Tujuan (Vendor) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setBankModal({
                            mode: 'create',
                            form: {
                              bank: '',
                              accountNo: '',
                              holder: '',
                              type: 'pengajuan',
                              brands: prForm.brand ? [prForm.brand] : [],
                              purpose: prForm.brand ? `Brand: ${prForm.brand}` : '',
                              active: true
                            }
                          })
                        }
                        className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1"
                      >
                        + Rekening Baru
                      </button>
                    </div>

                    {bankAccounts.filter((b) => b.type === 'pengajuan' && b.active).length > 0 ? (
                      <Select
                        value={prForm.bankId}
                        onChange={(e) => setPrForm((prev) => ({ ...prev, bankId: e.target.value }))}
                      >
                        {bankAccounts
                          .filter((b) => b.type === 'pengajuan' && b.active)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.bank} · {b.accountNo} · {b.holder}{' '}
                              {b.brands?.length ? `[Brand: ${b.brands.join(', ')}]` : b.purpose ? `(${b.purpose})` : ''}
                            </option>
                          ))}
                      </Select>
                    ) : (
                      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900">
                        <p className="font-semibold">Belum Ada Rekening Pengajuan</p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Rekening untuk pengajuan dana ke Owner dipisahkan dari rekening toko.
                        </p>
                        <Button
                          size="xs"
                          variant="outline"
                          className="mt-2 w-full"
                          icon="plus"
                          onClick={() =>
                            setBankModal({
                              mode: 'create',
                              form: { bank: '', accountNo: '', holder: '', type: 'pengajuan', purpose: '', active: true }
                            })
                          }
                        >
                          Daftarkan Rekening Vendor Sekarang
                        </Button>
                      </div>
                    )}
                  </div>
                  <Field label="Referensi / Terkait">
                    <Input
                      placeholder="PO Gamis Almira / Batch Oktober"
                      value={prForm.ref}
                      onChange={(e) => setPrForm((prev) => ({ ...prev, ref: e.target.value }))}
                    />
                  </Field>
                  <Field label="Catatan untuk Owner">
                    <Textarea
                      rows={2}
                      placeholder="Rincian singkat penggunaan dana"
                      value={prForm.note}
                      onChange={(e) => setPrForm((prev) => ({ ...prev, note: e.target.value }))}
                    />
                  </Field>
                  <Button type="submit" icon="plus" className="w-full">
                    Ajukan ke Owner
                  </Button>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Alur Approval</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-600 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">Finance</span>
                      <span className="text-gray-300"> → </span>
                      <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">Purchasing</span>
                      <span className="text-gray-300"> → </span>
                      <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">Owner</span>
                      <span className="text-gray-300"> → </span>
                      <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">Transfer</span>
                    </div>
                  </div>
                </form>
              </Card>

              <Card
                title="Riwayat Pengajuan"
                subtitle="Semua pengajuan pembayaran"
                className="lg:col-span-2"
                action={
                  <Segmented
                    value={prFilter}
                    onChange={setPrFilter}
                    options={[
                      { value: 'all', label: 'Semua', count: prCounts.all },
                      { value: PREQ.REVIEW_MKT, label: 'Review', count: prCounts[PREQ.REVIEW_MKT] || 0 },
                      { value: PREQ.APPROVAL_OWNER, label: 'Owner', count: prCounts[PREQ.APPROVAL_OWNER] || 0 },
                      { value: PREQ.APPROVED, label: 'Disetujui', count: prCounts[PREQ.APPROVED] || 0 },
                      { value: PREQ.TRANSFERRED, label: 'Transfer', count: prCounts[PREQ.TRANSFERRED] || 0 },
                      { value: PREQ.REJECTED, label: 'Ditolak', count: prCounts[PREQ.REJECTED] || 0 }
                    ]}
                  />
                }
              >
                <TableWrap>
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className={TH}>Kode</th>
                      <th className={TH}>Tujuan</th>
                      <th className={`${TH} text-right`}>Nominal</th>
                      <th className={TH}>Progres</th>
                      <th className={TH}>Status</th>
                      <th className={`${TH} text-right`}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPr.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/70">
                        <td className={TD}>
                          <p className="font-bold text-gray-900">{r.code}</p>
                          <p className="text-[10px] text-gray-400">{fmtDate(r.createdAt)}</p>
                        </td>
                        <td className={`${TD} max-w-[220px]`}>
                          <p className="font-medium text-gray-800">{r.purpose}</p>
                          <p className="text-[10px] text-gray-400 truncate">Ref: {r.ref}</p>
                        </td>
                        <td className={`${TD} text-right font-bold text-gray-900`}>{rp(r.amount)}</td>
                        <td className={TD}>
                          <div className="flex items-center gap-1">
                            {prSteps(r).map((s) => (
                              <span
                                key={s.label}
                                title={`${s.label}: ${s.state}`}
                                className={`w-2 h-2 rounded-full ${
                                  s.state === 'done'
                                    ? 'bg-emerald-500'
                                    : s.state === 'active'
                                    ? 'bg-amber-400'
                                    : s.state === 'reject'
                                    ? 'bg-rose-500'
                                    : 'bg-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">{r.bank}  ·  {r.accountNo}</p>
                        </td>
                        <td className={TD}>
                          <Badge tone={preqTone(r.status)}>{r.status}</Badge>
                        </td>
                        <td className={`${TD} text-right`}>
                          <div className="flex items-center justify-end gap-1.5">
                            {r.status === PREQ.REVIEW_MKT && (
                              <Button size="xs" variant="dangerOutline" onClick={() => cancelPR(r)}>
                                Batalkan
                              </Button>
                            )}
                            <Button size="xs" variant="outline" onClick={() => setPrDetailId(r.id)}>
                              Detail
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
                {filteredPr.length === 0 && (
                  <EmptyState title="Belum ada pengajuan" desc="Buat pengajuan baru di form sebelah kiri." icon="wallet" />
                )}
              </Card>
            </div>
          </>
        )}

        {/* ============================= BUKU KAS =========================== */}
        {activeMenu === 'buku_kas' && (
          <>
            <PageHead
              title="Buku Kas Masuk & Keluar"
              desc="Rekap seluruh aliran dana: pembayaran mitra, deposit, dan pengajuan yang ditransfer owner."
              badge={<Badge tone="gray">{ledgerRows.length} baris</Badge>}
              actions={
                <Button variant="outline" icon="download" onClick={exportLedger}>
                  Ekspor Buku Kas
                </Button>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Kas Masuk" value={rp(kasMasuk)} sub="Pembayaran & deposit ACC" tone="emerald" icon="card" />
              <MetricCard label="Dana Keluar" value={rp(kasKeluar)} sub="Pengajuan ditransfer owner" tone="red" icon="wallet" />
              <MetricCard
                label="Arus Kas Bersih"
                value={rp(kasMasuk - kasKeluar)}
                sub="Masuk  -  keluar"
                tone={kasMasuk - kasKeluar >= 0 ? 'blue' : 'red'}
                icon="file"
              />
              <MetricCard
                label="DP Terkumpul"
                value={rp(sumBy(orders.filter((o) => isPaid(o.dpStatus)), (o) => o.dpNominal))}
                sub={`${orders.filter((o) => isPaid(o.dpStatus)).length} pesanan`}
                tone="violet"
                icon="receipt"
              />
            </div>

            <Card
              title="Mutasi Kas"
              subtitle="Diurutkan dari transaksi terbaru"
              action={
                <Segmented
                  value={ledgerType}
                  onChange={setLedgerType}
                  options={[
                    { value: 'all', label: 'Semua' },
                    { value: 'DP', label: 'DP' },
                    { value: 'Pelunasan', label: 'Pelunasan' },
                    { value: 'Ongkir', label: 'Ongkir' },
                    { value: 'Deposit', label: 'Deposit' },
                    { value: 'Pengajuan Owner', label: 'Keluar' }
                  ]}
                />
              }
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Tanggal</th>
                    <th className={TH}>Tipe</th>
                    <th className={TH}>Referensi</th>
                    <th className={TH}>Mitra / Tujuan</th>
                    <th className={`${TH} text-right`}>Nominal</th>
                    <th className={TH}>Bank</th>
                    <th className={TH}>Oleh</th>
                    <th className={TH}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ledgerRows.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/70">
                      <td className={TD}>{fmtDate(l.date)}</td>
                      <td className={TD}>
                        <Badge tone={l.direction === 'out' ? 'red' : l.type === 'Deposit' ? 'violet' : 'blue'}>
                          {l.direction === 'out' ? 'Keluar' : l.type}
                        </Badge>
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-gray-900">{l.ref}</p>
                        {l.note && <p className="text-[10px] text-gray-400">{l.note}</p>}
                      </td>
                      <td className={TD}>{l.mitraName}</td>
                      <td className={`${TD} text-right font-bold ${l.direction === 'out' ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {l.direction === 'out' ? ' - ' : '+'}
                        {rp(l.nominal)}
                      </td>
                      <td className={TD}>{l.bank || ' — '}</td>
                      <td className={TD}>{l.by || ' — '}</td>
                      <td className={TD}>
                        <Badge tone={l.status === PREQ.TRANSFERRED || l.status === 'Transfer' ? 'teal' : l.status === PAY.ACC ? 'emerald' : 'amber'}>
                          {l.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {ledgerRows.length === 0 && (
                <EmptyState title="Belum ada mutasi" desc="Transaksi kas akan tampil di sini setelah pembayaran diverifikasi." icon="file" />
              )}
            </Card>
          </>
        )}

        {/* ========================= TAGIHAN & REMINDER ===================== */}
        {activeMenu === 'reminder' && (
          <>
            <PageHead
              title="Tagihan & Reminder WhatsApp"
              desc="Pantau piutang mitra dan kirim pengingat pembayaran melalui WhatsApp."
              badge={<Badge tone="red">{agingRows.filter((o) => o.late > 0).length} terlambat</Badge>}
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Total Piutang" value={rp(sumBy(agingRows, (o) => o.outstanding))} sub={`${agingRows.length} pesanan`} tone="red" icon="receipt" />
              <MetricCard
                label="Terlambat"
                value={agingRows.filter((o) => o.late > 0).length}
                sub={rp(sumBy(agingRows.filter((o) => o.late > 0), (o) => o.outstanding))}
                tone="orange"
                icon="alert"
              />
              <MetricCard
                label="Jatuh Tempo  ≤  3 Hari"
                value={agingRows.filter((o) => o.late === 0 && diffDays(o.due, todayISO()) <= 3).length}
                sub="Segera ditagihkan"
                tone="amber"
                icon="clock"
              />
              <MetricCard
                label="Sudah Lunas"
                value={orders.filter((o) => orderOutstanding(o) === 0 && orderStage(o) === 'selesai').length}
                sub="Pesanan selesai"
                tone="emerald"
                icon="check"
              />
            </div>

            <Card
              title="PO Tutup Hari Ini"
              subtitle="Produk yang jadwal tutup PO-nya hari ini atau sudah lewat"
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-56">
                    <SearchBox
                      value={closingSearch}
                      onChange={setClosingSearch}
                      placeholder="Cari produk / brand..."
                    />
                  </div>
                  <Segmented
                    value={closingUrgency}
                    onChange={setClosingUrgency}
                    options={[
                      { value: 'all', label: 'Semua', count: closingPo.length },
                      { value: 'today', label: 'Hari ini', count: closingPo.filter((p) => p.daysLeft === 0).length },
                      { value: 'overdue', label: 'Lewat', count: closingPo.filter((p) => p.daysLeft < 0).length }
                    ]}
                  />
                  <Badge tone={closingPo.length ? 'red' : 'gray'}>{closingFiltered.length} produk</Badge>
                </div>
              }
            >
              {closingPo.length === 0 ? (
                <EmptyState
                  title="Tidak ada PO yang tutup hari ini"
                  desc="Semua jadwal PO masih dalam batas waktu."
                  icon="check"
                />
              ) : closingFiltered.length === 0 ? (
                <EmptyState
                  title="Tidak ada produk yang cocok"
                  desc="Ubah kata kunci pencarian atau filter tenggat."
                  icon="search"
                  action={
                    <Button
                      variant="outline"
                      onClick={() => {
                        setClosingSearch('');
                        setClosingUrgency('all');
                      }}
                    >
                      Reset Filter
                    </Button>
                  }
                />
              ) : (
                <TableWrap>
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className={TH}>Produk</th>
                      <th className={TH}>Brand</th>
                      <th className={TH}>Tutup PO</th>
                      <th className={`${TH} text-right`}>Varian</th>
                      <th className={`${TH} text-right`}>Sisa Kuota</th>
                      <th className={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {closingFiltered.map((p) => {
                      const quota = sumBy(p.variants || [], (v) => v.quota);
                      const used = sumBy(p.variants || [], (v) => v.used);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/70">
                          <td className={TD}>
                            <p className="font-semibold text-gray-900">{p.title}</p>
                            <p className="text-[10px] text-gray-400">{p.category}</p>
                          </td>
                          <td className={TD}>{p.brand}</td>
                          <td className={TD}>{fmtDate(p.closeDate)}</td>
                          <td className={`${TD} text-right`}>{(p.variants || []).length}</td>
                          <td className={`${TD} text-right`}>{Math.max(0, quota - used)}/{quota}</td>
                          <td className={TD}>
                            <Badge tone={p.daysLeft === 0 ? 'red' : 'amber'}>
                              {p.daysLeft === 0 ? 'Hari ini' : `Lewat ${Math.abs(p.daysLeft)} hari`}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TableWrap>
              )}
            </Card>

            <Card
              title="Daftar Piutang"
              action={
                <div className="w-full sm:w-64">
                  <SearchBox value={reminderSearch} onChange={setReminderSearch} placeholder="Cari invoice / mitra..." />
                </div>
              }
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Invoice</th>
                    <th className={TH}>Mitra</th>
                    <th className={`${TH} text-right`}>Nilai</th>
                    <th className={`${TH} text-right`}>Dibayar</th>
                    <th className={`${TH} text-right`}>Sisa</th>
                    <th className={TH}>Jatuh Tempo</th>
                    <th className={TH}>Keterlambatan</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agingRows.map((o) => (
                    <tr key={o.invoice} className="hover:bg-gray-50/70">
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => setDetailInvoice(o.invoice)}
                          className="font-bold text-sky-700 hover:underline"
                        >
                          {o.invoice}
                        </button>
                        <p className="text-[10px] text-gray-400">{o.produk}</p>
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-gray-900">{o.mitraName}</p>
                        <p className="text-[10px] text-gray-400">{o.level}</p>
                      </td>
                      <td className={`${TD} text-right`}>{rp(o.subtotal)}</td>
                      <td className={`${TD} text-right text-emerald-700`}>{rp(orderPaid(o))}</td>
                      <td className={`${TD} text-right font-bold text-rose-600`}>{rp(o.outstanding)}</td>
                      <td className={TD}>{fmtDate(o.due)}</td>
                      <td className={TD}>
                        {o.late > 0 ? (
                          <Badge tone="red">Terlambat {o.late} hari</Badge>
                        ) : (
                          <Badge tone="gray">Belum jatuh tempo</Badge>
                        )}
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="xs" variant="outline" icon="chat" onClick={() => openWA(o, 'ringkasan')}>
                            Reminder
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => setDetailInvoice(o.invoice)}>
                            Detail
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {agingRows.length === 0 && (
                <EmptyState title="Tidak ada piutang" desc="Semua tagihan mitra sudah lunas." icon="check" />
              )}
            </Card>
          </>
        )}

        {/* ============================== REKAP PO ========================== */}
        {activeMenu === 'rekap' && (
          <>
            <PageHead
              title="Rekap PO"
              desc="Akumulasi pesanan per brand, produk, atau mitra lengkap dengan nilai dan piutang."
              badge={<Badge tone="gray">{rekapGroups.length} grup</Badge>}
              actions={
                <Button
                  variant="outline"
                  icon="download"
                  onClick={() => {
                    downloadCSV(`rekap_po_${rekapTab}_${todayISO()}.csv`, [
                      [rekapTab === 'brand' ? 'Brand' : rekapTab === 'produk' ? 'Produk' : 'Mitra', 'Invoice', 'Qty', 'Nilai', 'Dibayar', 'Piutang'],
                      ...rekapGroups.map((g) => [g.key, g.invoices, g.qty, g.nilai, g.paid, g.outstanding])
                    ]);
                    toast('Rekap PO diunduh.');
                  }}
                >
                  Ekspor Rekap
                </Button>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Total Invoice" value={sumBy(rekapGroups, (g) => g.invoices)} sub="Seluruh pesanan aktif" tone="blue" icon="receipt" />
              <MetricCard label="Total Qty" value={`${sumBy(rekapGroups, (g) => g.qty)} pcs`} sub="Unit pre-order" tone="violet" icon="box" />
              <MetricCard label="Total Nilai" value={rp(sumBy(rekapGroups, (g) => g.nilai))} sub="Omzet PO" tone="emerald" icon="wallet" />
              <MetricCard label="Total Piutang" value={rp(sumBy(rekapGroups, (g) => g.outstanding))} sub="Belum lunas" tone="red" icon="card" />
            </div>

            <Card
              title={`Rekap per ${rekapTab === 'brand' ? 'Brand' : rekapTab === 'produk' ? 'Produk' : 'Mitra'}`}
              action={
                <Segmented
                  value={rekapTab}
                  onChange={setRekapTab}
                  options={[
                    { value: 'brand', label: 'Brand' },
                    { value: 'produk', label: 'Produk' },
                    { value: 'mitra', label: 'Mitra' }
                  ]}
                />
              }
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>{rekapTab === 'brand' ? 'Brand' : rekapTab === 'produk' ? 'Produk' : 'Mitra'}</th>
                    <th className={`${TH} text-right`}>Invoice</th>
                    <th className={`${TH} text-right`}>Qty</th>
                    <th className={`${TH} text-right`}>Nilai</th>
                    <th className={`${TH} text-right`}>Dibayar</th>
                    <th className={`${TH} text-right`}>Piutang</th>
                    <th className={TH}>Kontribusi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rekapGroups.map((g) => (
                    <tr key={g.key} className="hover:bg-gray-50/70">
                      <td className={`${TD} font-bold text-gray-900`}>{g.key}</td>
                      <td className={`${TD} text-right`}>{g.invoices}</td>
                      <td className={`${TD} text-right`}>{g.qty} pcs</td>
                      <td className={`${TD} text-right font-semibold`}>{rp(g.nilai)}</td>
                      <td className={`${TD} text-right text-emerald-700`}>{rp(g.paid)}</td>
                      <td className={`${TD} text-right font-semibold text-rose-600`}>{rp(g.outstanding)}</td>
                      <td className={TD}>
                        <div className="flex items-center gap-2">
                          <span className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <span
                              className="block h-full rounded-full bg-sky-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (g.nilai / Math.max(1, sumBy(rekapGroups, (x) => x.nilai))) * 100
                                )}%`
                              }}
                            />
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {Math.round((g.nilai / Math.max(1, sumBy(rekapGroups, (x) => x.nilai))) * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {rekapGroups.length === 0 && <EmptyState title="Belum ada data" desc="Rekap muncul setelah ada pesanan." icon="file" />}
            </Card>
          </>
        )}

        {activeMenu === 'rekap_fee' && (
          <FeeRecapPanel
            orders={orders}
            brands={brands}
            subtitle="Rekap fee mitra yang dipotong saat checkout dan diskon pabrik yang menjadi fee perusahaan. Dipakai untuk rekonsiliasi ke Owner."
          />
        )}

        {/* ============================ MITRA & USER ======================== */}
        {activeMenu === 'mitra' && (
          <>
            <PageHead
              title="Mitra & Piutang"
              desc="Kelola akun mitra, pantau piutang, dan buat kredensial akses katalog."
              badge={<Badge tone="gray">{mitra.length} mitra</Badge>}
              actions={
                <Button icon="plus" onClick={() => setMitraModal({ mode: 'create', form: { ...blankMitra } })}>
                  Mitra Baru
                </Button>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Total Mitra" value={mitra.length} sub={`${mitra.filter((m) => m.active).length} aktif`} tone="blue" icon="users" />
              <MetricCard label="Total Omzet" value={rp(sumBy(mitraRows, (m) => m.omzet))} sub="Seluruh pesanan" tone="emerald" icon="wallet" />
              <MetricCard label="Piutang" value={rp(sumBy(mitraRows, (m) => m.outstanding))} sub="Belum lunas" tone="red" icon="receipt" />
              <MetricCard label="Saldo Deposit" value={rp(sumBy(mitra, (m) => m.deposit))} sub="Saldo tersimpan" tone="violet" icon="card" />
            </div>

            <Card
              title="Daftar Mitra"
              action={
                <div className="w-full sm:w-64">
                  <SearchBox value={mitraSearch} onChange={setMitraSearch} placeholder="Cari nama / email / WhatsApp..." />
                </div>
              }
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Nama / Kontak</th>
                    <th className={TH}>Level</th>
                    <th className={TH}>Kota</th>
                    <th className={`${TH} text-right`}>Invoice</th>
                    <th className={`${TH} text-right`}>Omzet</th>
                    <th className={`${TH} text-right`}>Piutang</th>
                    <th className={`${TH} text-right`}>Deposit</th>
                    <th className={TH}>Status</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMitra.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/70">
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => setMitraDetailId(m.id)}
                          className="font-bold text-sky-700 hover:underline"
                        >
                          {m.name}
                        </button>
                        <p className="text-[10px] text-gray-400">{m.email || ' — '}</p>
                        <p className="text-[10px] text-gray-400">{m.phone}</p>
                      </td>
                      <td className={TD}>
                        <Badge tone={levelTone(m.level)}>{m.level}</Badge>
                      </td>
                      <td className={TD}>{m.city || ' — '}</td>
                      <td className={`${TD} text-right`}>{m.invoiceCount}</td>
                      <td className={`${TD} text-right font-semibold`}>{rp(m.omzet)}</td>
                      <td className={`${TD} text-right ${m.outstanding > 0 ? 'text-rose-600 font-semibold' : 'text-gray-400'}`}>
                        {rp(m.outstanding)}
                      </td>
                      <td className={`${TD} text-right`}>{rp(m.deposit)}</td>
                      <td className={TD}>
                        <Badge tone={m.active ? 'emerald' : 'gray'}>{m.active ? 'Aktif' : 'Nonaktif'}</Badge>
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setMitraModal({ mode: 'edit', id: m.id, form: { ...m } })}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            variant={m.active ? 'dangerOutline' : 'primary'}
                            onClick={() => toggleMitra(m)}
                          >
                            {m.active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            onClick={() => deleteMitra(m)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {filteredMitra.length === 0 && <EmptyState title="Mitra tidak ditemukan" desc="Coba kata kunci lain." icon="users" />}
            </Card>
          </>
        )}

        {/* ============================= TIM ADMIN ========================== */}
        {activeMenu === 'tim' && (
          <>
            <PageHead
              title="Tim Admin"
              desc="Buat akun tim finance & purchasing. Akun owner hanya dibuat dari portal owner."
              badge={<Badge tone="gray">{team.length} akun</Badge>}
              actions={
                <Button
                  icon="plus"
                  onClick={() => setTeamModal({ form: { name: '', email: '', phone: '', role: 'finance' } })}
                >
                  Akun Tim Baru
                </Button>
              }
            />

            <Card>
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Nama</th>
                    <th className={TH}>Email</th>
                    <th className={TH}>Peran</th>
                    <th className={TH}>Telepon</th>
                    <th className={TH}>Dibuat</th>
                    <th className={TH}>Status</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {team.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/70">
                      <td className={TD}>
                        <p className="font-semibold text-gray-900">{u.name}</p>
                        <p className="text-[10px] text-gray-400">oleh {u.createdBy || 'System'}</p>
                      </td>
                      <td className={TD}>{u.email}</td>
                      <td className={TD}>
                        <Badge tone={u.role === 'finance' ? 'emerald' : u.role === 'marketing' ? 'red' : 'amber'}>
                          {roleLabel(u.role)}
                        </Badge>
                      </td>
                      <td className={TD}>{u.phone || ' — '}</td>
                      <td className={TD}>{fmtDate(u.createdAt)}</td>
                      <td className={TD}>
                        <Badge tone={u.active ? 'emerald' : 'gray'}>{u.active ? 'Aktif' : 'Nonaktif'}</Badge>
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant={u.active ? 'dangerOutline' : 'primary'}
                            disabled={u.role === 'owner'}
                            onClick={() => toggleTeam(u)}
                          >
                            {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            disabled={u.role === 'owner'}
                            onClick={() => deleteTeam(u)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>
          </>
        )}

        {/* ============================ REKENING ============================ */}
        {activeMenu === 'rekening' && (() => {
          const publicBanks = bankAccounts.filter((b) => (b.type || 'public') === 'public');
          const pengajuanBanks = bankAccounts.filter((b) => b.type === 'pengajuan');
          const currentList = bankTab === 'public' ? publicBanks : pengajuanBanks;

          return (
            <>
              <PageHead
                title="Master Rekening Bank"
                desc={
                  bankTab === 'public'
                    ? 'Kelola rekening resmi toko untuk pembayaran checkout mitra, DP, pelunasan, dan faktur invoice.'
                    : 'Kelola rekening transfer vendor / supplier untuk tujuan pengajuan dana ke Owner.'
                }
                badge={
                  <Badge tone={bankTab === 'public' ? 'emerald' : 'amber'}>
                    {currentList.filter((b) => b.active).length} aktif / {currentList.length} total
                  </Badge>
                }
                actions={
                  <Button
                    icon="plus"
                    variant={bankTab === 'pengajuan' ? 'gold' : 'primary'}
                    onClick={() =>
                      setBankModal({
                        mode: 'create',
                        form: {
                          bank: '',
                          accountNo: '',
                          holder: '',
                          type: bankTab,
                          purpose: bankTab === 'public' ? 'Penerimaan Pembayaran Mitra' : '',
                          active: true
                        }
                      })
                    }
                  >
                    {bankTab === 'pengajuan' ? 'Rekening Pengajuan Baru' : 'Rekening Publik Baru'}
                  </Button>
                }
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <Segmented
                  value={bankTab}
                  onChange={setBankTab}
                  options={[
                    {
                      value: 'public',
                      label: 'Rekening Publik Toko',
                      count: publicBanks.length
                    },
                    {
                      value: 'pengajuan',
                      label: 'Rekening Pengajuan Owner',
                      count: pengajuanBanks.length
                    }
                  ]}
                />
              </div>

              <Card>
                <TableWrap>
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className={TH}>Bank</th>
                      <th className={TH}>Nomor Rekening</th>
                      <th className={TH}>Atas Nama</th>
                      <th className={TH}>{bankTab === 'pengajuan' ? 'Brand / Peruntukan Vendor' : 'Label / Kegunaan'}</th>
                      <th className={`${TH} text-center`}>Status</th>
                      <th className={`${TH} text-right`}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentList.map((b) => {
                      const isEditing = inlineBankId === b.id;

                      if (isEditing) {
                        return (
                          <tr key={b.id} className="bg-amber-50/60">
                            <td className={TD}>
                              <input
                                type="text"
                                value={inlineBankForm.bank}
                                onChange={(e) => setInlineBankForm((prev) => ({ ...prev, bank: e.target.value }))}
                                placeholder="Bank"
                                className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0F6B4F] bg-white font-semibold"
                              />
                            </td>
                            <td className={TD}>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={inlineBankForm.accountNo}
                                onChange={(e) => setInlineBankForm((prev) => ({ ...prev, accountNo: e.target.value.replace(/\D/g, '') }))}
                                placeholder="No Rekening"
                                className="w-36 font-mono px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0F6B4F] bg-white"
                              />
                            </td>
                            <td className={TD}>
                              <input
                                type="text"
                                value={inlineBankForm.holder}
                                onChange={(e) => setInlineBankForm((prev) => ({ ...prev, holder: e.target.value }))}
                                placeholder="Atas Nama"
                                className="w-full min-w-[140px] px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0F6B4F] bg-white"
                              />
                            </td>
                            <td className={TD}>
                              <input
                                type="text"
                                value={inlineBankForm.purpose}
                                onChange={(e) => setInlineBankForm((prev) => ({ ...prev, purpose: e.target.value }))}
                                placeholder={bankTab === 'pengajuan' ? 'Brand / Peruntukan Vendor' : 'Label / Kegunaan'}
                                className="w-full min-w-[140px] px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0F6B4F] bg-white"
                              />
                            </td>
                            <td className={`${TD} text-center`}>
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={inlineBankForm.active}
                                  onChange={(e) => setInlineBankForm((prev) => ({ ...prev, active: e.target.checked }))}
                                  className="rounded border-gray-300 text-[#0F6B4F]"
                                />
                                <span className="text-[11px] text-gray-600 font-medium">{inlineBankForm.active ? 'Aktif' : 'Nonaktif'}</span>
                              </label>
                            </td>
                            <td className={`${TD} text-right`}>
                              <div className="inline-flex items-center gap-1">
                                <Button size="xs" variant="primary" onClick={() => saveInlineEditBank(b)}>
                                  Simpan
                                </Button>
                                <Button size="xs" variant="outline" onClick={() => setInlineBankId(null)}>
                                  Batal
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={b.id} className="hover:bg-gray-50/70">
                          <td className={`${TD} font-semibold text-gray-900`}>{b.bank}</td>
                          <td className={`${TD} font-mono whitespace-nowrap`}>{b.accountNo}</td>
                          <td className={TD}>{b.holder}</td>
                          <td className={`${TD} text-xs text-gray-600`}>
                            {b.type === 'pengajuan' && Array.isArray(b.brands) && b.brands.length > 0 ? (
                              <div className="space-y-1">
                                <div className="flex flex-wrap gap-1">
                                  {b.brands.map((br) => (
                                    <span
                                      key={br}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-900 border border-rose-200"
                                    >
                                      {br}
                                    </span>
                                  ))}
                                </div>
                                {b.purpose && !b.purpose.startsWith('Brand:') && (
                                  <p className="text-[11px] text-gray-500">{b.purpose}</p>
                                )}
                              </div>
                            ) : (
                              b.purpose || (b.type === 'pengajuan' ? 'Vendor / Operasional' : 'Penerimaan Mitra')
                            )}
                          </td>
                          <td className={`${TD} text-center`}>
                            <Badge tone={b.active ? (bankTab === 'public' ? 'emerald' : 'amber') : 'gray'}>
                              {b.active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </td>
                          <td className={`${TD} text-right`}>
                            <div className="inline-flex items-center gap-1">
                              <Button size="xs" variant="outline" onClick={() => startInlineEditBank(b)}>
                                Ubah
                              </Button>
                              <Button size="xs" variant="outline" onClick={() => toggleBank(b)}>
                                {b.active ? 'Nonaktifkan' : 'Aktifkan'}
                              </Button>
                              <Button
                                size="xs"
                                variant="danger"
                                icon="trash"
                                onClick={() => deleteBank(b)}
                              >
                                Hapus
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TableWrap>
                {currentList.length === 0 && (
                  <EmptyState
                    title={bankTab === 'public' ? 'Belum ada rekening publik' : 'Belum ada rekening pengajuan vendor'}
                    desc={
                      bankTab === 'public'
                        ? 'Tambahkan rekening toko agar mitra dapat melakukan transfer pembayaran pesanan.'
                        : 'Tambahkan rekening supplier atau vendor untuk tujuan pengajuan dana ke Owner.'
                    }
                    icon="card"
                  />
                )}
              </Card>
            </>
          );
        })()}

        {/* ============================ EKSPEDISI =========================== */}
        {activeMenu === 'ekspedisi' && (
          <>
            <PageHead
              title="Master Ekspedisi Pengiriman"
              desc="Daftar jasa kirim yang bisa dipilih saat admin/finance menginput ongkir pesanan mitra dan dipublikasikan ke halaman checkout."
              badge={<Badge tone="gray">{couriers.filter((c) => c.active).length} aktif</Badge>}
              actions={
                <Button
                  icon="plus"
                  onClick={() =>
                    setCourierModal({ mode: 'create', form: { name: '', code: '', note: '', active: true } })
                  }
                >
                  Ekspedisi Baru
                </Button>
              }
            />

            <Card title="Daftar Ekspedisi" subtitle="Ekspedisi nonaktif tidak muncul pada pilihan input ongkir dan checkout mitra.">
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Ekspedisi</th>
                    <th className={TH}>Kode</th>
                    <th className={TH}>Catatan</th>
                    <th className={`${TH} text-center`}>Status</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {couriers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/70">
                      <td className={`${TD} font-semibold text-gray-900`}>{c.name}</td>
                      <td className={`${TD} font-mono whitespace-nowrap`}>{c.code || '—'}</td>
                      <td className={`${TD} max-w-[260px] text-[11px] text-gray-600`}>{c.note || '—'}</td>
                      <td className={`${TD} text-center`}>
                        <Badge tone={c.active ? 'teal' : 'gray'}>{c.active ? 'Aktif' : 'Nonaktif'}</Badge>
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="inline-flex items-center gap-1">
                          <Button size="xs" variant="outline" onClick={() => toggleCourier(c)}>
                            {c.active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            icon="edit"
                            onClick={() => setCourierModal({ mode: 'edit', id: c.id, form: { ...c } })}
                          >
                            Ubah
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            icon="trash"
                            onClick={() => deleteCourier(c)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {couriers.length === 0 && (
                <EmptyState
                  title="Belum ada ekspedisi"
                  desc="Tambahkan ekspedisi pengiriman (JNE Trucking, J&T Cargo, Dakota, dll) untuk kebutuhan pengiriman PO."
                  icon="truck"
                />
              )}
            </Card>
          </>
        )}
            </DashboardShell>

      {/* ============================= MODALS ============================= */}
      {detailInvoice &&
        (() => {
          const o = orders.find((x) => x.invoice === detailInvoice);
          if (!o) return null;
          const stage = orderStage(o);
          return (
            <OrderDrawer
              order={o}
              onClose={() => setDetailInvoice(null)}
              onProof={(src, title) => setProofView({ src, title })}
              printInvoice={onPrintInvoice}
              actions={
                <>
                  <Button variant="outline" icon="chat" onClick={() => openWA(o, 'ringkasan')}>
                    WhatsApp
                  </Button>
                  <Button variant="outline" icon="edit" onClick={() => openInvoiceEditor(o)}>
                    Edit Invoice
                  </Button>
                  {o.dpStatus === PAY.MENUNGGU && (
                    <Button
                      onClick={() => {
                        setDetailInvoice(null);
                        goTo('verif_dp');
                      }}
                    >
                      Verifikasi DP
                    </Button>
                  )}
                  {o.pelunasanStatus === PAY.MENUNGGU && (
                    <Button
                      onClick={() => {
                        setDetailInvoice(null);
                        goTo('verif_pelunasan');
                      }}
                    >
                      Verifikasi Pelunasan
                    </Button>
                  )}
                  {o.ongkirStatus === PAY.MENUNGGU && (
                    <Button
                      onClick={() => {
                        setDetailInvoice(null);
                        goTo('verif_ongkir');
                      }}
                    >
                      Verifikasi Ongkir
                    </Button>
                  )}
                  {stage === 'ongkir' && (
                    <Button
                      onClick={() => {
                        setDetailInvoice(null);
                        setOngkirModal({
                          order: o,
                          form: {
                            ekspedisi: o.ekspedisi || '',
                            ongkir: o.ongkir || '',
                            weight: o.weight || '',
                            note: o.shippingNote || ''
                          }
                        });
                      }}
                    >
                      Input Ongkir
                    </Button>
                  )}
                  {stage === 'kirim' && (
                    <Button
                      onClick={() => {
                        setDetailInvoice(null);
                        setResiModal({ order: o, form: { resi: '', notify: true } });
                      }}
                    >
                      Input Resi
                    </Button>
                  )}
                  {stage === 'dikirim' && (
                    <Button
                      onClick={() => {
                        markReceived(o);
                        setDetailInvoice(null);
                      }}
                    >
                      Tandai Diterima
                    </Button>
                  )}
                </>
              }
            />
          );
        })()}

      {invoiceEdit &&
        (() => {
          const target = orders.find((o) => o.invoice === invoiceEdit.invoice);
          const form = invoiceEdit.form;
          const rows = form.items || [];
          const lineTotals = rows.map((it) => {
            const qty = Math.max(1, num(it.qty));
            const gross = num(it.price) * qty;
            const disc = Math.round((gross * Math.min(100, Math.max(0, num(it.discountPct)))) / 100);
            const addon = Math.max(0, num(it.addon)) * qty;
            return { gross, disc, addon, subtotal: gross - disc + addon };
          });
          const totalGross = lineTotals.reduce((s, l) => s + l.gross, 0);
          const totalDisc = lineTotals.reduce((s, l) => s + l.disc, 0);
          const totalAddon = lineTotals.reduce((s, l) => s + l.addon, 0);
          const totalSubtotal = totalGross - totalDisc + totalAddon;
          const isoDateInput = (val) => {
            if (!val) return '';
            const iso = String(val).match(/(\d{4})-(\d{2})-(\d{2})/);
            if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
            const parsed = new Date(String(val));
            if (Number.isNaN(parsed.getTime())) return '';
            return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(
              parsed.getDate()
            ).padStart(2, '0')}`;
          };
          const dpPct = Math.min(100, Math.max(0, num(form.dpPct)));
          const dpNominal = Math.round((totalSubtotal * dpPct) / 100);
          const pelunasanNominal = totalSubtotal - dpNominal;
          const verified =
            target &&
            [target.dpStatus, target.pelunasanStatus, target.ongkirStatus].some((s) => isPaid(s));
          const setForm = (patch) =>
            setInvoiceEdit((prev) => ({ ...prev, form: { ...prev.form, ...patch } }));
          return (
            <Modal
              size="xl"
              title={`Edit Invoice  ·  ${invoiceEdit.invoice}`}
              subtitle={
                target
                  ? `${target.mitraName}  ·  ${target.level}  ·  ${rows.length} produk/varian`
                  : ''
              }
              onClose={() => setInvoiceEdit(null)}
              footer={
                <>
                  <Button variant="outline" onClick={() => setInvoiceEdit(null)}>
                    Batal
                  </Button>
                  <Button type="submit" form="fin-invoice-form" icon="check">
                    Simpan Perubahan
                  </Button>
                </>
              }
            >
              <form id="fin-invoice-form" onSubmit={saveInvoiceEdit} className="space-y-3">
                <div className="space-y-2.5">
                  {rows.map((it, idx) => (
                    <div key={it.key} className="rounded-xl border border-gray-200 p-3 space-y-2 bg-white">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                          {rows.length > 1 ? `Produk / Varian ${idx + 1}` : 'Detail Produk'}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">
                            Subtotal baris: <b className="text-gray-800">{rp(lineTotals[idx].subtotal)}</b>
                          </span>
                          {rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeInvoiceItem(it.key)}
                              className="text-[10px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md px-2 py-0.5"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-12 gap-2">
                        <Field label="Produk" required className="col-span-2 sm:col-span-5">
                          <Input
                            value={it.title}
                            onChange={(e) => patchInvoiceItem(it.key, { title: e.target.value })}
                          />
                        </Field>
                        <Field label="Varian" className="col-span-2 sm:col-span-7">
                          <Input
                            value={it.variant}
                            onChange={(e) => patchInvoiceItem(it.key, { variant: e.target.value })}
                          />
                        </Field>
                        <Field label="Qty" className="sm:col-span-2">
                          <Input
                            type="number"
                            min={1}
                            value={it.qty}
                            onChange={(e) => patchInvoiceItem(it.key, { qty: e.target.value })}
                          />
                        </Field>
                        <Field label="Harga Satuan" required className="sm:col-span-3">
                          <Input
                            type="number"
                            min={0}
                            value={it.price}
                            onChange={(e) => patchInvoiceItem(it.key, { price: e.target.value })}
                          />
                        </Field>
                        <Field label="Diskon (%)" className="sm:col-span-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={it.discountPct}
                            onChange={(e) => patchInvoiceItem(it.key, { discountPct: e.target.value })}
                          />
                        </Field>
                        <Field label="Tambahan / pcs" hint="Di luar diskon" className="sm:col-span-2">
                          <Input
                            type="number"
                            min={0}
                            value={it.addon ?? 0}
                            onChange={(e) => patchInvoiceItem(it.key, { addon: e.target.value })}
                          />
                        </Field>
                        <Field label="Jatuh Tempo" className="col-span-2 sm:col-span-3">
                          <Input
                            type="date"
                            value={isoDateInput(it.dueDate)}
                            onChange={(e) => patchInvoiceItem(it.key, { dueDate: e.target.value })}
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addInvoiceItem}
                    className="w-full border border-dashed border-gray-300 hover:border-amber-500 hover:bg-amber-50/40 text-gray-600 text-xs font-semibold rounded-xl py-2 transition"
                  >
                    + Tambah Produk / Varian
                  </button>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <Field
                    label="DP (%)"
                    hint="Berlaku untuk seluruh invoice"
                    className="sm:col-span-1"
                  >
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={form.dpPct}
                      onChange={(e) => setForm({ dpPct: e.target.value })}
                    />
                  </Field>
                  <Field label="Catatan Invoice" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm({ notes: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bruto ({rows.length} baris)</span>
                    <span className="font-semibold text-gray-800">{rp(totalGross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total diskon</span>
                    <span className="font-semibold text-rose-600">-{rp(totalDisc)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Harga tambahan (di luar diskon)</span>
                    <span className="font-semibold text-amber-700">+{rp(totalAddon)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1">
                    <span className="font-semibold text-gray-700">Total Pesanan</span>
                    <span className="font-bold text-gray-900">{rp(totalSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">DP {dpPct}%</span>
                    <span className="font-semibold text-gray-800">{rp(dpNominal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sisa Pelunasan ({100 - dpPct}%)</span>
                    <span className="font-semibold text-gray-800">{rp(pelunasanNominal)}</span>
                  </div>
                </div>

                {verified && (
                  <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Ada pembayaran yang sudah diverifikasi. Status pembayaran tetap, tetapi nominal tagihan
                    mengikuti nilai baru  —  mitra melihat nilai yang sama.
                  </p>
                )}
                <p className="text-[10px] text-gray-400">
                  Diskon dihitung per produk. Perubahan langsung tampil di dashboard mitra (detail pesanan,
                  tagihan, dan invoice).
                </p>
              </form>
            </Modal>
          );
        })()}

      {ongkirModal && (
        <Modal
          title={`Input Ongkir  ·  ${ongkirModal.order.invoice}`}
          subtitle={`${ongkirModal.order.mitraName}  ·  ${ongkirModal.order.produk}`}
          onClose={() => setOngkirModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setOngkirModal(null)}>
                Batal
              </Button>
              <Button type="submit" form="ongkir-form" icon="check">
                Simpan Ongkir
              </Button>
            </>
          }
        >
          <form id="ongkir-form" onSubmit={saveOngkir} className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase text-gray-400">Alamat Pengiriman</p>
              <p className="text-[11px] text-gray-700 leading-relaxed">{addressText(ongkirModal.order)}</p>
              <p className="text-[10px] text-gray-400">
                {ongkirModal.order.qty} pcs  ·  {ongkirModal.order.variant}  ·  {ongkirModal.order.phone}
              </p>
            </div>
            <Field label="Ekspedisi" required>
              <Select
                value={ongkirModal.form.ekspedisi}
                onChange={(e) =>
                  setOngkirModal((prev) => ({ ...prev, form: { ...prev.form, ekspedisi: e.target.value } }))
                }
              >
                <option value="">Pilih ekspedisi...</option>
                {couriers
                  .filter((c) => c.active)
                  .map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Ongkir (Rp)" required>
                <Input
                  type="number"
                  min="0"
                  value={ongkirModal.form.ongkir}
                  onChange={(e) =>
                    setOngkirModal((prev) => ({ ...prev, form: { ...prev.form, ongkir: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Berat (kg)">
                <Input
                  type="number"
                  min="0"
                  value={ongkirModal.form.weight}
                  onChange={(e) =>
                    setOngkirModal((prev) => ({ ...prev, form: { ...prev.form, weight: e.target.value } }))
                  }
                />
              </Field>
            </div>
            <Field label="Catatan Pengiriman">
              <Textarea
                rows={2}
                placeholder="Contoh: koli besar, ambil di gudang"
                value={ongkirModal.form.note}
                onChange={(e) =>
                  setOngkirModal((prev) => ({ ...prev, form: { ...prev.form, note: e.target.value } }))
                }
              />
            </Field>
            <p className="text-[10px] text-gray-400">
              Setelah disimpan, mitra akan melihat tagihan ongkir pada dashboard mitra.
            </p>
          </form>
        </Modal>
      )}

      {resiModal && (
        <Modal
          title={`Input Resi  ·  ${resiModal.order.invoice}`}
          subtitle={`${resiModal.order.mitraName}  ·  ${resiModal.order.ekspedisi || 'Ekspedisi belum dipilih'}`}
          onClose={() => setResiModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setResiModal(null)}>
                Batal
              </Button>
              <Button type="submit" form="resi-form" icon="truck">
                Simpan & Kirim
              </Button>
            </>
          }
        >
          <form id="resi-form" onSubmit={saveResi} className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase text-gray-400">Tujuan</p>
              <p className="text-[11px] text-gray-700 leading-relaxed">{addressText(resiModal.order)}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge tone="emerald">Pelunasan ✓</Badge>
                <Badge tone="emerald">Ongkir ✓</Badge>
                <Badge tone="gray">{resiModal.order.ekspedisi || ' — '}</Badge>
              </div>
            </div>
            <Field label="Nomor Resi" required>
              <Input
                placeholder="Contoh: JTR-8891234"
                value={resiModal.form.resi}
                onChange={(e) =>
                  setResiModal((prev) => ({ ...prev, form: { ...prev.form, resi: e.target.value } }))
                }
              />
            </Field>
            <Switch
              checked={!!resiModal.form.notify}
              label="Kirim notifikasi WhatsApp ke mitra"
              onChange={(next) => setResiModal((prev) => ({ ...prev, form: { ...prev.form, notify: next } }))}
            />
            <p className="text-[10px] text-gray-400">
              Mitra dapat mengonfirmasi pesanan diterima setelah paket sampai.
            </p>
          </form>
        </Modal>
      )}

      {prDetail && (
        <Modal
          title={prDetail.code}
          subtitle={prDetail.purpose}
          size="lg"
          onClose={() => setPrDetailId(null)}
          footer={
            <>
              {prDetail.status === PREQ.REVIEW_MKT && (
                <Button variant="dangerOutline" onClick={() => cancelPR(prDetail)}>
                  Batalkan Pengajuan
                </Button>
              )}
              <Button variant="outline" onClick={() => setPrDetailId(null)}>
                Tutup
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Stepper steps={prSteps(prDetail)} />
            <div className="grid sm:grid-cols-2 gap-2">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase text-gray-400">Nominal</p>
                <p className="text-base font-bold text-gray-900 mt-1">{rp(prDetail.amount)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase text-gray-400">Status</p>
                <div className="mt-1">
                  <Badge tone={preqTone(prDetail.status)}>{prDetail.status}</Badge>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase text-gray-400">Rekening Tujuan</p>
                <p className="text-xs font-semibold text-gray-800 mt-1">{prDetail.bank}  ·  {prDetail.accountNo}</p>
                <p className="text-[10px] text-gray-500">{prDetail.holder}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase text-gray-400">Referensi</p>
                <p className="text-xs font-semibold text-gray-800 mt-1">{prDetail.ref}</p>
                <p className="text-[10px] text-gray-500">
                  {prDetail.createdBy}  ·  {fmtDate(prDetail.createdAt)}
                </p>
              </div>
            </div>

            {prDetail.note && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Catatan Finance</p>
                <p className="text-xs text-gray-700 leading-relaxed">{prDetail.note}</p>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {[
                ['Purchasing', prDetail.marketing],
                ['Owner', prDetail.owner],
                ['Transfer', prDetail.transfer]
              ]
                .filter(([, entry]) => entry)
                .map(([label, entry]) => (
                  <div key={label} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-gray-800">{label}</p>
                      <Badge tone={entry.decision === 'TOLAK' ? 'red' : 'emerald'}>
                        {entry.decision === 'TOLAK' ? 'Ditolak' : label === 'Transfer' ? 'Ditransfer' : 'Disetujui'}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      {entry.by}  ·  {fmtDate(entry.at)}
                    </p>
                    {entry.note && <p className="text-[11px] text-gray-600 mt-1">{entry.note}</p>}
                    {entry.proof && (
                      <div className="mt-2">
                        <ProofThumb
                          src={entry.proof}
                          onClick={() => setProofView({ src: entry.proof, title: `Bukti transfer ${prDetail.code}` })}
                        />
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {[PREQ.REVIEW_MKT, PREQ.APPROVAL_OWNER].includes(prDetail.status) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[11px] text-amber-800">
                Pengajuan sedang berproses. Anda dapat membatalkan selama masih berstatus review purchasing.
              </div>
            )}
          </div>
        </Modal>
      )}

      {mitraDetail && (
        <Drawer
          title={mitraDetail.name}
          subtitle={`${mitraDetail.level}  ·  ${mitraDetail.city || 'Kota belum diisi'}`}
          width="max-w-3xl"
          onClose={() => setMitraDetailId(null)}
          footer={
            <>
              <Button
                variant="outline"
                icon="chat"
                onClick={() =>
                  window.open(
                    waLink(mitraDetail.phone, `Halo ${mitraDetail.name}, kami dari AfatharShop.`),
                    '_blank'
                  )
                }
              >
                WhatsApp
              </Button>
              <Button
                onClick={() => {
                  setMitraModal({ mode: 'edit', id: mitraDetail.id, form: { ...mitraDetail } });
                  setMitraDetailId(null);
                }}
              >
                Edit Mitra
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] font-semibold uppercase text-gray-400">Total Invoice</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{mitraDetail.invoiceCount}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] font-semibold uppercase text-gray-400">Omzet</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{rp(mitraDetail.omzet)}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] font-semibold uppercase text-gray-400">Piutang</p>
              <p className={`text-lg font-bold mt-1 ${mitraDetail.outstanding > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {rp(mitraDetail.outstanding)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] font-semibold uppercase text-gray-400">Deposit</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{rp(mitraDetail.deposit)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Kontak & Alamat</p>
            <p className="text-xs text-gray-700">
              <span className="text-gray-400">WhatsApp:</span> {mitraDetail.phone}
            </p>
            <p className="text-xs text-gray-700">
              <span className="text-gray-400">Alamat:</span> {mitraDetail.address || ' — '}
            </p>
            <p className="text-xs text-gray-700">
              <span className="text-gray-400">Bergabung:</span> {fmtDate(mitraDetail.joinedAt)}
            </p>
            <Badge tone={mitraDetail.active ? 'emerald' : 'gray'}>
              {mitraDetail.active ? 'Akun aktif' : 'Akun nonaktif'}
            </Badge>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Riwayat Pesanan</p>
            </div>
            <OrdersTable
              orders={orders.filter((o) => o.mitraId === mitraDetail.id)}
              onOpen={(o) => {
                setDetailInvoice(o.invoice);
                setMitraDetailId(null);
              }}
              empty="Mitra ini belum memiliki pesanan."
              compact
            />
          </div>
        </Drawer>
      )}

      {mitraModal && (
        <Modal
          title={mitraModal.mode === 'edit' ? 'Edit Mitra' : 'Mitra Baru'}
          subtitle="Akun mitra dapat checkout katalog sesuai level harga."
          onClose={() => setMitraModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setMitraModal(null)}>
                Batal
              </Button>
              <Button type="submit" form="fin-mitra-form" icon="check">
                {mitraModal.mode === 'edit' ? 'Simpan Mitra' : 'Buat Akun Mitra'}
              </Button>
            </>
          }
        >
          <form id="fin-mitra-form" onSubmit={saveMitra} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nama Mitra" required>
                <Input
                  value={mitraModal.form.name || ''}
                  onChange={(e) =>
                    setMitraModal((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Level Harga">
                <Select
                  value={mitraModal.form.level || 'Agen'}
                  onChange={(e) =>
                    setMitraModal((prev) => ({ ...prev, form: { ...prev.form, level: e.target.value } }))
                  }
                >
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nomor WhatsApp" required>
                <Input
                  value={mitraModal.form.phone || ''}
                  placeholder="0812..."
                  onChange={(e) =>
                    setMitraModal((prev) => ({ ...prev, form: { ...prev.form, phone: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Kota">
                <Input
                  value={mitraModal.form.city || ''}
                  onChange={(e) =>
                    setMitraModal((prev) => ({ ...prev, form: { ...prev.form, city: e.target.value } }))
                  }
                />
              </Field>
            </div>
            <Field
              label="Email Login"
              required={mitraModal.mode === 'create'}
              hint="Email ini dipakai mitra untuk masuk ke dashboard mitra."
            >
              <Input
                type="email"
                placeholder="mitra@email.com"
                value={mitraModal.form.email || ''}
                onChange={(e) =>
                  setMitraModal((prev) => ({ ...prev, form: { ...prev.form, email: e.target.value } }))
                }
              />
            </Field>
            <Field label="Alamat Lengkap">
              <Textarea
                rows={2}
                value={mitraModal.form.address || ''}
                onChange={(e) =>
                  setMitraModal((prev) => ({ ...prev, form: { ...prev.form, address: e.target.value } }))
                }
              />
            </Field>
            {mitraModal.mode === 'edit' && (
              <Switch
                checked={!!mitraModal.form.active}
                label="Akun aktif"
                onChange={(next) => setMitraModal((prev) => ({ ...prev, form: { ...prev.form, active: next } }))}
              />
            )}
            <p className="text-[10px] text-gray-400">
              Email dipakai sebagai ID login mitra. WhatsApp tetap dipakai untuk reminder & konfirmasi. Password
              ditampilkan sekali setelah akun dibuat.
            </p>
          </form>
        </Modal>
      )}

      {teamModal && (
        <Modal
          title="Akun Tim Baru"
          subtitle="Tentukan peran akses tim admin"
          onClose={() => setTeamModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setTeamModal(null)}>
                Batal
              </Button>
              <Button type="submit" form="fin-team-form" icon="check">
                Buat Akun Tim
              </Button>
            </>
          }
        >
          <form id="fin-team-form" onSubmit={saveTeam} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nama Lengkap" required>
                <Input
                  value={teamModal.form.name || ''}
                  onChange={(e) =>
                    setTeamModal((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Email" required>
                <Input
                  type="email"
                  value={teamModal.form.email || ''}
                  onChange={(e) =>
                    setTeamModal((prev) => ({ ...prev, form: { ...prev.form, email: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Telepon">
                <Input
                  value={teamModal.form.phone || ''}
                  onChange={(e) =>
                    setTeamModal((prev) => ({ ...prev, form: { ...prev.form, phone: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Peran">
                <Select
                  value={teamModal.form.role || 'finance'}
                  onChange={(e) =>
                    setTeamModal((prev) => ({ ...prev, form: { ...prev.form, role: e.target.value } }))
                  }
                >
                  <option value="finance">Finance</option>
                  <option value="marketing">Purchasing</option>
                </Select>
              </Field>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[11px] text-amber-800 flex items-start gap-2">
              <Icon name="shield" className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Akun <b>owner</b> tidak dapat dibuat dari portal finance. Password sementara ditampilkan sekali
                setelah akun berhasil dibuat.
              </p>
            </div>
          </form>
        </Modal>
      )}

      {credential && (
        <Modal
          title={credential.title}
          subtitle="Bagikan kredensial ini melalui kanal aman."
          onClose={() => setCredential(null)}
          footer={
            <Button
              icon="copy"
              onClick={async () => {
                const ok = await copyText(`${credential.email} / ${credential.password}`);
                toast(ok ? 'Kredensial disalin.' : 'Gagal menyalin, salin manual.', ok ? 'success' : 'error');
              }}
            >
              Salin Kredensial
            </Button>
          }
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Nama</p>
                <p className="text-sm font-semibold text-gray-900">{credential.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Email / ID</p>
                <p className="text-xs font-mono text-gray-800">{credential.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Password Sementara</p>
                <p className="text-xs font-mono font-bold text-gray-900">{credential.password}</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">{credential.note}</p>
          </div>
        </Modal>
      )}

      {bankModal && (
        <BankAccountModal
          isOpen={!!bankModal}
          mode={bankModal.mode}
          initialData={bankModal.form}
          brands={brands}
          defaultType={bankModal.form?.type || bankTab || 'public'}
          onClose={() => setBankModal(null)}
          onSave={saveBank}
        />
      )}

      {courierModal && (
        <Modal
          title={courierModal.mode === 'edit' ? 'Edit Ekspedisi' : 'Ekspedisi Baru'}
          onClose={() => setCourierModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setCourierModal(null)}>
                Batal
              </Button>
              <Button type="submit" form="courier-form" icon="check">
                Simpan Ekspedisi
              </Button>
            </>
          }
        >
          <form id="courier-form" onSubmit={saveCourier} className="space-y-3">
            <Field label="Nama Ekspedisi" required>
              <Input
                placeholder="JNE Trucking (JTR)"
                value={courierModal.form.name || ''}
                onChange={(e) =>
                  setCourierModal((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))
                }
              />
            </Field>
            <Field label="Kode">
              <Input
                placeholder="JTR"
                value={courierModal.form.code || ''}
                onChange={(e) =>
                  setCourierModal((prev) => ({ ...prev, form: { ...prev.form, code: e.target.value } }))
                }
              />
            </Field>
            <Field label="Catatan">
              <Textarea
                rows={2}
                value={courierModal.form.note || ''}
                onChange={(e) =>
                  setCourierModal((prev) => ({ ...prev, form: { ...prev.form, note: e.target.value } }))
                }
              />
            </Field>
            <Switch
              checked={!!courierModal.form.active}
              label="Ekspedisi aktif"
              onChange={(next) => setCourierModal((prev) => ({ ...prev, form: { ...prev.form, active: next } }))}
            />
          </form>
        </Modal>
      )}

      {proofView && <ProofModal src={proofView.src} title={proofView.title} onClose={() => setProofView(null)} />}

      {reasonModal && <ReasonModal {...reasonModal} onClose={() => setReasonModal(null)} />}

      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}

      <Toast toast={toastData} onClose={closeToast} />
    </>
  );
}
