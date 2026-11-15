import React, { useEffect, useMemo, useState } from 'react';
import api, { mediaUrl } from '../../../services/api';
import { dbId, mapOrderToProjectOrder, normalizeLevel } from '../../../services/adapters';
import BankAccountModal from '../BankAccountModal';
import AccountSettingsPanel from '../AccountSettingsPanel';
import { projectOrderToCore, serverMoneyPatch } from '../projectBridge';
import { dpPercentFor } from '../../../utils/terminScheme';
import FinanceOverviewTab from './FinanceOverviewTab';
import FinanceVerificationTab from './FinanceVerificationTab';
import FinanceManualProofTab from './FinanceManualProofTab';
import FinanceShippingCostTab from './FinanceShippingCostTab';
import FinanceShippingResiTab from './FinanceShippingResiTab';
import FinanceOrdersTab from './FinanceOrdersTab';
import FinancePaymentRequestsTab from './FinancePaymentRequestsTab';
import FinanceLedgerTab from './FinanceLedgerTab';
import FinanceReminderTab from './FinanceReminderTab';
import FinancePoRecapTab from './FinancePoRecapTab';
import FinanceMitraTab from './FinanceMitraTab';
import FinanceTeamTab from './FinanceTeamTab';
import FinanceBankAccountsTab from './FinanceBankAccountsTab';
import FinanceCouriersTab from './FinanceCouriersTab';
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
} from '../poCore';

const DEFAULT_USER = { id: 'u-finance', name: 'Finance', role: 'finance', email: 'finance@afatharshop.com' };

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
    paymentIdKey: 'dpPaymentId',
    bankKey: 'dpBank',
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
    paymentIdKey: 'pelunasanPaymentId',
    bankKey: 'pelunasanBank',
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
    paymentIdKey: 'ongkirPaymentId',
    bankKey: 'ongkirBank',
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
  onUpdateUser,
  onUpdateAvatar,
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
    proof: '',
    proofFile: null
  });
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofInputKey, setProofInputKey] = useState(0);

  useEffect(() => {
    const activeBanks = (bankAccounts || []).filter((b) => b.active !== false);
    if (!activeBanks.length) return;
    setProofForm((prev) => {
      const valid = activeBanks.some((b) => String(b.id) === String(prev.bankId));
      return valid ? prev : { ...prev, bankId: activeBanks[0].id };
    });
  }, [bankAccounts]);

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
        paymentId: o[verifMeta.paymentIdKey] || null,
        bank: o[verifMeta.bankKey] || '-',
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
          {
            id: 'mitra',
            label: 'Mitra & User',
            title: 'Data Mitra & Piutang',
            icon: 'users',
            badge: mitra.filter((m) => !m.active).length || null
          },
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
      },
      { id: 'pengaturan_akun', label: 'Pengaturan Akun', title: 'Pengaturan Profil & Keamanan', icon: 'settings' }
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
          variantId: it.variantId ?? null,
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

  const saveInvoiceEdit = async (e) => {
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
          variantId: it.variantId ?? prev?.variantId ?? null,
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

    const ok = await patchOrder(target.invoice, {
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
    if (!ok) return;
    setInvoiceEdit(null);
    toast(`Invoice ${target.invoice} diperbarui (${items.length} produk/varian). Mitra melihat nilai terbaru.`);
  };

  const approvePayment = async (row) => {
    if (row.deposit) {
      const dep = row.deposit;
      const targetId = dep.backendId || dep.id;
      if (targetId && !String(targetId).startsWith('dep-')) {
        try {
          await api.management.verifyDeposit(targetId, { status: 'ACC' });
        } catch (err) {
          return serverFail(err, `Verifikasi deposit ${dep.mitraName}`);
        }
      }
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
    } else {
      const o = row.order;
      const pid = row.paymentId || row.backendPaymentId || o?.[verifMeta.paymentIdKey] || null;
      const ongkirCleared = num(o.ongkir) === 0 || o.ongkirStatus === PAY.ACC;
      const localPatch = {
        [verifMeta.statusKey]: PAY.ACC,
        ...(verifMeta.kind === 'Pelunasan' && ongkirCleared ? { ongkirStatus: PAY.ACC, shipStatus: SHIP.SIAP } : {}),
        ...(verifMeta.kind === 'Ongkir' && o.pelunasanStatus === PAY.ACC ? { shipStatus: SHIP.SIAP } : {}),
        [verifMeta.verifiedByKey]: me.name,
        [verifMeta.verifiedAtKey]: todayISO(),
        [verifMeta.noteKey]: '',
        status:
          verifMeta.kind === 'DP'
            ? 'Produksi'
            : verifMeta.kind === 'Pelunasan'
              ? (ongkirCleared ? 'Siap Kirim' : 'Menunggu Pembayaran Ongkir')
              : (o.pelunasanStatus === PAY.ACC ? 'Siap Kirim' : 'Menunggu Pelunasan')
      };

      if (pid && !String(pid).startsWith('p-')) {
        let res = null;
        try {
          res = await api.management.verifyPayment(pid, { status: 'disetujui' });
        } catch (err) {
          return serverFail(err, `Verifikasi ${verifMeta.kind} ${o.invoice}`);
        }
        const serverOrder = res?.order || res?.data?.order || null;
        if (serverOrder) {
          const mappedCore = projectOrderToCore(
            mapOrderToProjectOrder(serverOrder, currentUser || {}),
            { currentUser, seedMitra: mitra, products: productsProp || seed.products }
          );
          commitOrders((prev) =>
            prev.map((x) => (x.invoice === o.invoice ? { ...x, ...mappedCore } : x))
          );
        } else {
          commitOrders((prev) =>
            prev.map((x) => (x.invoice === o.invoice ? { ...x, ...localPatch } : x))
          );
        }
      } else {
        const ok = await patchOrder(o.invoice, localPatch);
        if (!ok) return;
      }

      commitLedger((prev) => [
        {
          id: uid('l'),
          date: todayISO(),
          type: verifMeta.kind,
          ref: o.invoice,
          mitraName: o.mitraName,
          nominal: row.amount,
          bank: row.bank || o?.[verifMeta.bankKey] || '-',
          by: me.name,
          status: PAY.ACC,
          note: 'Verifikasi finance'
        },
        ...prev
      ]);
      toast(`${verifMeta.kind} ${o.invoice} diverifikasi ACC.`);
    }
    setConfirmModal(null);
  };

  const rejectPayment = async (row, note) => {
    if (row.deposit) {
      const targetId = row.deposit.backendId || row.deposit.id;
      if (targetId && !String(targetId).startsWith('dep-')) {
        try {
          await api.management.verifyDeposit(targetId, { status: 'Ditolak', note });
        } catch (err) {
          return serverFail(err, `Penolakan deposit ${row.deposit.mitraName}`);
        }
      }
      commitDeposits((prev) =>
        prev.map((d) =>
          d.id === row.deposit.id
            ? { ...d, status: PAY.TOLAK, verifiedBy: me.name, verifiedAt: todayISO(), note }
            : d
        )
      );
    } else {
      const o = row.order;
      const pid = row.paymentId || row.backendPaymentId || o?.[verifMeta.paymentIdKey] || null;
      const localPatch = {
        [verifMeta.statusKey]: PAY.TOLAK,
        [verifMeta.verifiedByKey]: me.name,
        [verifMeta.verifiedAtKey]: todayISO(),
        [verifMeta.noteKey]: note
      };
      if (pid && !String(pid).startsWith('p-')) {
        let res = null;
        try {
          res = await api.management.verifyPayment(pid, { status: 'ditolak', notes: note });
        } catch (err) {
          return serverFail(err, `Penolakan ${verifMeta.kind} ${o.invoice}`);
        }
        const serverOrder = res?.order || res?.data?.order || null;
        if (serverOrder) {
          const mappedCore = projectOrderToCore(
            mapOrderToProjectOrder(serverOrder, currentUser || {}),
            { currentUser, seedMitra: mitra, products: productsProp || seed.products }
          );
          commitOrders((prev) =>
            prev.map((x) => (x.invoice === o.invoice ? { ...x, ...mappedCore } : x))
          );
        } else {
          commitOrders((prev) =>
            prev.map((x) => (x.invoice === o.invoice ? { ...x, ...localPatch } : x))
          );
        }
      } else {
        const ok = await patchOrder(o.invoice, {
          ...localPatch,
          note
        });
        if (!ok) return;
      }
    }
    toast(`${verifMeta.kind} ${row.ref} ditolak.`, 'warning');
  };

  const setProduction = async (o, status) => {
    const patch = { productionStatus: status };
    if (status === PROD.READY) {
      patch.readyAt = todayISO();
      patch.status = 'Menunggu Alamat Mitra';
    }
    const ok = await patchOrder(o.invoice, patch);
    if (!ok) return;
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

  const saveOngkir = async (e) => {
    e.preventDefault();
    const { order, form } = ongkirModal;
    if (!form.ekspedisi) return toast('Pilih ekspedisi terlebih dahulu.', 'error');
    if (!num(form.ongkir)) return toast('Nominal ongkir harus lebih dari 0.', 'error');
    const ok = await patchOrder(order.invoice, {
      ongkir: num(form.ongkir),
      ekspedisi: form.ekspedisi,
      weight: num(form.weight),
      shippingNote: form.note || '',
      ongkirAt: todayISO(),
      ongkirStatus: PAY.BELUM,
      status: order.pelunasanStatus === PAY.ACC ? 'Menunggu Pembayaran Ongkir' : 'Menunggu Pelunasan'
    });
    if (!ok) return;
    setOngkirModal(null);
    toast(`Ongkir ${order.invoice} tersimpan. Mitra dapat melakukan pembayaran.`);
  };

  const saveResi = async (e) => {
    e.preventDefault();
    const { order, form } = resiModal;
    if (!form.resi.trim()) return toast('Nomor resi wajib diisi.', 'error');
    const patch = {
      resi: form.resi.trim(),
      shippedAt: todayISO(),
      shipStatus: SHIP.DIKIRIM,
      status: 'Dikirim'
    };
    const ok = await patchOrder(order.invoice, patch);
    if (!ok) return;
    setResiModal(null);
    toast(`Resi ${form.resi} tersimpan. ${order.invoice} ditandai dikirim.`);

    if (form.notify) {
      window.open(
        waLink(order.phone, buildWA('shipped', { ...order, ...patch }, { ...settings, banks: bankAccounts })),
        '_blank'
      );
    }
  };

  const markReceived = async (o) => {
    const ok = await patchOrder(o.invoice, {
      receivedAt: todayISO(),
      shipStatus: SHIP.DITERIMA,
      status: 'Selesai'
    });
    if (!ok) return;
    toast(`${o.invoice} ditandai diterima. Pesanan selesai.`);
  };

  const handleProofFile = (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast('Ukuran berkas maksimal 2 MB.', 'error');
    const reader = new FileReader();
    reader.onload = () =>
      setProofForm((prev) => ({ ...prev, proof: String(reader.result), proofFile: file }));
    reader.readAsDataURL(file);
  };

  const resetProofForm = () => {
    setProofForm((prev) => ({ ...prev, nominal: '', invoice: '', refNo: '', proof: '', proofFile: null }));
    setProofInputKey((k) => k + 1);
  };

  const submitProofForm = async (e) => {
    e.preventDefault();
    if (isSubmittingProof) return;
    const f = proofForm;
    const nominal = num(f.nominal);
    if (!f.mitraId) return toast('Pilih mitra.', 'error');
    if (!nominal) return toast('Nominal harus lebih dari 0.', 'error');
    if (f.kind === 'Deposit' && nominal < 1000) return toast('Nominal deposit minimal Rp 1.000.', 'error');
    if (f.kind !== 'Deposit' && !f.invoice) return toast('Pilih invoice terkait.', 'error');

    const activeBanks = (bankAccounts || []).filter((b) => b.active !== false);
    const bank =
      bankAccounts.find((b) => String(b.id) === String(f.bankId)) ||
      activeBanks[0] ||
      null;
    const m = mitra.find((x) => String(x.id) === String(f.mitraId));

    setIsSubmittingProof(true);
    try {
      let serverProofPath = '';
      if (f.proofFile) {
        try {
          const uploaded = await api.management.uploadFile(f.proofFile, 'proof');
          serverProofPath = uploaded?.data?.path || '';
        } catch (err) {
          return serverFail(err, 'Mengunggah bukti transfer');
        }
        if (!serverProofPath) return toast('Bukti transfer tidak tersimpan di server.', 'error');
      }

      const proofUrlToUse = serverProofPath ? mediaUrl(serverProofPath) : '';

      if (f.kind === 'Deposit') {
        const userId = m?.backendId || dbId(m);
        let depRow = null;
        if (userId) {
          try {
            const depRes = await api.management.createDeposit({
              user_id: userId,
              amount: nominal,
              bank_account_id: dbId(bank) || bank?.backendId || null,
              date: f.date || undefined,
              description: f.refNo || 'Input manual admin finance',
              proof_url: serverProofPath || ''
            });
            depRow = depRes?.data || null;
          } catch (err) {
            return serverFail(err, `Deposit ${m?.name || 'Mitra'}`);
          }
        }
        commitDeposits((prev) => [
          {
            id: depRow?.id != null ? `dep-${depRow.id}` : uid('dep'),
            backendId: depRow?.id ?? null,
            date: f.date || todayISO(),
            mitraId: m?.id,
            mitraName: m?.name,
            nominal,
            bank: depRow?.bank || bank?.bank || '-',
            proof: depRow?.proof_url ? mediaUrl(depRow.proof_url) : proofUrlToUse,
            status: PAY.MENUNGGU,
            verifiedBy: '',
            note: depRow?.description || f.refNo || 'Input manual admin finance'
          },
          ...prev
        ]);
        toast(`Deposit ${rp(nominal)} dicatat dan menunggu verifikasi.`);
      } else {
        const o = orders.find((x) => x.invoice === f.invoice);
        if (!o) return toast('Invoice tidak ditemukan.', 'error');
        const statusKey = { DP: 'dpStatus', Pelunasan: 'pelunasanStatus', Ongkir: 'ongkirStatus' }[f.kind];
        const proofKey = { DP: 'dpProof', Pelunasan: 'pelunasanProof', Ongkir: 'ongkirProof' }[f.kind];
        const paymentIdKey = { DP: 'dpPaymentId', Pelunasan: 'pelunasanPaymentId', Ongkir: 'ongkirPaymentId' }[f.kind];
        const bankKey = { DP: 'dpBank', Pelunasan: 'pelunasanBank', Ongkir: 'ongkirBank' }[f.kind];
        const noteKey = { DP: 'dpNote', Pelunasan: 'pelunasanNote', Ongkir: 'ongkirNote' }[f.kind];

        const orderNumericId = dbId(o) || (Number.isInteger(o.backendId) ? o.backendId : null);
        let payRes = null;
        try {
          payRes = await api.management.createPayment({
            ...(orderNumericId ? { order_id: orderNumericId } : {}),
            order_number: o.invoice,
            invoice_number: o.invoiceNumber || '',
            installment_id:
              f.kind === 'DP'
                ? o.dpInstallmentId || null
                : f.kind === 'Pelunasan'
                  ? o.pelunasanInstallmentId || null
                  : null,
            amount: nominal,
            bank_account_id: dbId(bank) || bank?.backendId || null,
            bank_name: bank?.bank || '',
            account_number: bank?.accountNo || '',
            date: f.date || undefined,
            note: f.refNo || 'Input manual admin finance',
            stage: f.kind.toLowerCase(),
            proof_url: serverProofPath || ''
          });
        } catch (err) {
          return serverFail(err, `Simpan bukti ${f.kind} ${o.invoice}`);
        }

        const serverOrder = payRes?.order || payRes?.data?.order || null;
        if (serverOrder) {
          const mappedCore = projectOrderToCore(
            mapOrderToProjectOrder(serverOrder, currentUser || {}),
            { currentUser, seedMitra: mitra, products: productsProp || seed.products }
          );
          commitOrders((prev) =>
            prev.map((x) => (x.invoice === o.invoice ? { ...x, ...mappedCore } : x))
          );
        } else {
          const createdPayData = payRes?.data || null;
          const createdPaymentId = createdPayData?.payment?.id ?? createdPayData?.id ?? null;
          commitOrders((prev) =>
            prev.map((x) =>
              x.invoice === o.invoice
                ? {
                    ...x,
                    [statusKey]: PAY.MENUNGGU,
                    [proofKey]: proofUrlToUse,
                    [bankKey]: bank?.bank || x[bankKey] || '',
                    [noteKey]: f.refNo || x[noteKey] || '',
                    ...(createdPaymentId ? { [paymentIdKey]: createdPaymentId } : {})
                  }
                : x
            )
          );
        }
        toast(`Bukti ${f.kind} ${o.invoice} dicatat. Menunggu verifikasi.`);
      }
      resetProofForm();
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const savePR = async (e) => {
    e.preventDefault();
    if (!prForm.purpose.trim()) return toast('Tujuan pembayaran wajib diisi.', 'error');
    if (!num(prForm.amount)) return toast('Nominal pengajuan harus lebih dari 0.', 'error');
    const bank = bankAccounts.find((b) => b.id === prForm.bankId);
    if (!bank) return toast('Pilih rekening tujuan transfer.', 'error');
    const maxPr = paymentRequests.reduce(
      (max, r) => Math.max(max, Number(String(r.code).replace(/\D/g, '')) || 0),
      0
    );
    const code = `PR-${String(maxPr + 1).padStart(4, '0')}`;
    const amount = num(prForm.amount);
    const purpose = prForm.purpose.trim();
    const ref = prForm.ref.trim() || '-';
    const note = prForm.note.trim();

    let createdId = uid('pr');
    let backendId = null;

    try {
      const res = await api.management.createPaymentRequest({
        amount,
        bank_name: bank.bank,
        account_number: bank.accountNo,
        account_holder: bank.holder,
        purpose,
        reference: ref,
        notes: note,
        bank_account_id: dbId(bank) || bank?.backendId || bank?.id
      });
      if (res?.data?.id) {
        backendId = res.data.id;
        createdId = `pr-${res.data.id}`;
      }
    } catch (err) {
      console.warn('Gagal menyimpan pengajuan bayar ke server:', err);
    }

    const req = {
      id: createdId,
      backendId,
      code,
      createdAt: todayISO(),
      createdBy: me.name,
      amount,
      bank: bank.bank,
      accountNo: bank.accountNo,
      holder: bank.holder,
      purpose,
      ref,
      note,
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
      onConfirm: async () => {
        commitPaymentRequests((prev) =>
          prev.map((r) => (r.id === req.id ? { ...r, status: PREQ.CANCELED } : r))
        );
        const targetId = dbId(req) || req.backendId || req.id;
        if (targetId) {
          api.management.updatePaymentRequest(targetId, { status: 'dibatalkan' }).catch((err) => {
            console.warn('Gagal membatalkan pengajuan di server:', err);
          });
        }
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

  const saveMitra = async (e) => {
    e.preventDefault();
    const f = mitraModal.form;
    if (!f.name?.trim() || !f.phone?.trim()) return toast('Nama dan WhatsApp wajib diisi.', 'error');
    if (mitraModal.mode === 'create' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.email || '').trim())) {
      return toast('Email login mitra wajib diisi dengan format valid.', 'error');
    }
    if (mitraModal.mode === 'edit') {
      const current = mitra.find((m) => m.id === mitraModal.id);
      const targetId = dbId(current) || dbId(mitraModal.form) || dbId(mitraModal);
      if (!targetId) return notOnServer(`Mitra ${current?.name || f.name}`);
      try {
        await api.management.updateUser(targetId, {
          nama: f.name.trim(),
          phone: f.phone,
          city: f.city,
          address: f.address,
          email: f.email ? String(f.email).trim() : undefined,
          level: f.level || 'reseller',
          is_active: f.active !== false,
          password: f.password?.trim() ? f.password.trim() : undefined
        });
      } catch (err) {
        return serverFail(err, `Memperbarui mitra ${f.name}`);
      }
      commitMitra((prev) => prev.map((m) => (m.id === mitraModal.id ? { ...m, ...f, level: normalizeLevel(f.level) } : m)));
      toast(`Mitra ${f.name} diperbarui.`);
      setMitraModal(null);
      return;
    }

    const tempPassword = f.password?.trim() || `Mitra#${Math.floor(1000 + Math.random() * 9000)}`;
    let created;
    try {
      created = await api.management.createUser({
        nama: f.name.trim(),
        email: String(f.email || '').trim(),
        role: 'mitra',
        level: String(f.level || 'reseller').toLowerCase(),
        phone: f.phone,
        city: f.city,
        address: f.address,
        password: tempPassword,
        is_active: true
      });
    } catch (err) {
      return serverFail(err, `Membuat akun mitra ${f.name}`);
    }
    const row = created?.data;
    commitMitra((prev) => [
      {
        ...f,
        level: normalizeLevel(f.level),
        id: row?.id != null ? `m-${row.id}` : uid('m'),
        backendId: row?.id ?? null,
        active: true,
        deposit: 0,
        joinedAt: todayISO(),
        createdBy: me.name
      },
      ...prev
    ]);
    setMitraModal(null);
    setCredential({
      title: 'Akun mitra dibuat',
      name: f.name,
      email: String(f.email || '').trim(),
      password: tempPassword,
      note: 'Kirimkan kredensial ini ke mitra. Password hanya ditampilkan sekali.'
    });
    toast(`Akun mitra ${f.name} berhasil disimpan ke database.`);
  };

  const toggleMitra = async (m) => {
    if (num(m.outstanding) > 0 && m.active) {
      return toast('Mitra masih memiliki piutang. Selesaikan tagihan sebelum menonaktifkan.', 'error');
    }
    const targetId = dbId(m);
    if (!targetId) return notOnServer(`Mitra ${m.name}`);
    try {
      await api.management.updateUser(targetId, { is_active: !m.active });
    } catch (err) {
      return serverFail(err, `Mengubah status mitra ${m.name}`);
    }
    commitMitra((prev) => prev.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)));
    toast(`${m.name} ${m.active ? 'dinonaktifkan' : 'di-ACC dan diaktifkan'}.`);
  };

  const deleteMitra = (m) => {
    setConfirmModal({
      title: 'Hapus Akun Mitra',
      message: `Hapus mitra "${m.name}"? Data akan dihapus dari sistem dan database.`,
      confirmLabel: 'Hapus Mitra',
      danger: true,
      onConfirm: async () => {
        const targetId = dbId(m);
        if (!targetId) {
          commitMitra((prev) => prev.filter((x) => x.id !== m.id));
          setConfirmModal(null);
          return notOnServer(`Mitra ${m.name}`);
        }
        try {
          await api.management.deleteUser(targetId);
        } catch (err) {
          return serverFail(err, `Menghapus mitra ${m.name}`);
        }
        commitMitra((prev) => prev.filter((x) => x.id !== m.id));
        setConfirmModal(null);
        toast(`Mitra ${m.name} dihapus.`, 'warning');
      }
    });
  };

  const saveTeam = async (e) => {
    e.preventDefault();
    const f = teamModal.form;
    if (!f.name?.trim() || !f.email?.trim()) return toast('Nama dan email wajib diisi.', 'error');
    if (f.role === 'owner') return toast('Peran owner hanya dapat dibuat dari portal owner.', 'error');

    if (teamModal.mode === 'edit') {
      const current = team.find((u) => u.id === teamModal.id);
      const targetId = dbId(current) || dbId(teamModal.form) || dbId(teamModal);
      if (!targetId) return notOnServer(`Akun tim ${current?.name || f.name}`);
      try {
        await api.management.updateUser(targetId, {
          nama: f.name.trim(),
          phone: f.phone,
          role: f.role,
          email: f.email.trim(),
          is_active: f.active !== false,
          password: f.password?.trim() ? f.password.trim() : undefined
        });
      } catch (err) {
        return serverFail(err, `Memperbarui akun tim ${f.name}`);
      }
      commitTeam((prev) => prev.map((x) => (x.id === teamModal.id ? { ...x, ...f } : x)));
      toast(`Akun tim ${f.name} diperbarui.`);
      setTeamModal(null);
      return;
    }

    const tempPassword = f.password?.trim() || `Tim#${Math.floor(1000 + Math.random() * 9000)}`;
    let created;
    try {
      created = await api.management.createUser({
        nama: f.name.trim(),
        email: f.email.trim(),
        role: f.role,
        phone: f.phone,
        password: tempPassword,
        is_active: true
      });
    } catch (err) {
      return serverFail(err, `Membuat akun tim ${f.name}`);
    }
    const row = created?.data;
    commitTeam((prev) => [
      {
        id: row?.id != null ? `u-${row.id}` : uid('u'),
        backendId: row?.id ?? null,
        name: f.name.trim(),
        email: f.email.trim(),
        role: f.role,
        phone: f.phone,
        active: true,
        createdAt: todayISO(),
        createdBy: me.name
      },
      ...prev
    ]);
    setTeamModal(null);
    setCredential({
      title: 'Akun tim admin dibuat',
      name: f.name.trim(),
      email: f.email.trim(),
      password: tempPassword,
      note: `Peran: ${roleLabel(f.role)}. Password hanya ditampilkan sekali.`
    });
    toast(`Akun tim ${f.name} berhasil disimpan ke database.`);
  };

  const toggleTeam = async (u) => {
    if (u.role === 'owner') return toast('Akun owner tidak dapat dinonaktifkan dari portal finance.', 'error');
    if (u.id === me.id) return toast('Tidak dapat menonaktifkan akun sendiri.', 'error');
    const targetId = dbId(u);
    if (!targetId) return notOnServer(`Akun ${u.name}`);
    try {
      await api.management.updateUser(targetId, { is_active: !u.active });
    } catch (err) {
      return serverFail(err, `Mengubah status akun ${u.name}`);
    }
    commitTeam((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)));
    toast(`${u.name} ${u.active ? 'dinonaktifkan' : 'diaktifkan'}.`);
  };

  const deleteTeam = (u) => {
    if (u.role === 'owner') return toast('Akun owner tidak dapat dihapus.', 'error');
    if (u.id === me.id || u.email === me.email) return toast('Tidak dapat menghapus akun sendiri yang sedang aktif.', 'error');
    setConfirmModal({
      title: 'Hapus Akun Tim Admin',
      message: `Hapus akun "${u.name}" (${roleLabel(u.role)})? Akses pengguna akan dicabut dari sistem dan database.`,
      confirmLabel: 'Hapus Akun',
      danger: true,
      onConfirm: async () => {
        const targetId = dbId(u);
        if (!targetId) {
          commitTeam((prev) => prev.filter((x) => x.id !== u.id));
          setConfirmModal(null);
          return notOnServer(`Akun ${u.name}`);
        }
        try {
          await api.management.deleteUser(targetId);
        } catch (err) {
          return serverFail(err, `Menghapus akun ${u.name}`);
        }
        commitTeam((prev) => prev.filter((x) => x.id !== u.id));
        setConfirmModal(null);
        toast(`Akun tim ${u.name} berhasil dihapus.`, 'warning');
      }
    });
  };

  const saveSettingsForm = async (e) => {
    e.preventDefault();
    let saved;
    try {
      saved = await api.management.updateSettings(settingsForm);
    } catch (err) {
      return serverFail(err, 'Menyimpan pengaturan finance');
    }
    commitSettings((prev) => ({ ...prev, ...(saved?.data || {}), ...settingsForm }));
    toast('Pengaturan finance disimpan di database.');
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
        portalSub="Afatharshop · Verifikasi & Operasional PO"
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
          <FinanceOverviewTab
            role="finance"
            products={products}
            orders={orders}
            ledger={ledger}
            bankAccounts={bankAccounts}
            totalPendingDocs={totalPendingDocs}
            totalPendingValue={totalPendingValue}
            pendingDp={pendingDp}
            pendingPelunasan={pendingPelunasan}
            pendingOngkir={pendingOngkir}
            pendingDeposit={pendingDeposit}
            kasMasuk={kasMasuk}
            kasKeluar={kasKeluar}
            piutang={piutang}
            activeOrders={activeOrders}
            readyToShip={readyToShip}
            needOngkir={needOngkir}
            shippedOrders={shippedOrders}
            agingRows={agingRows}
            pendingPr={pendingPr}
            approvedPr={approvedPr}
            stageMeta={stageMeta}
            goTo={goTo}
            openWA={openWA}
            VERIF_META={VERIF_META}
            DEP_META={DEP_META}
            accent={accent}
          />
        )}

        {/* ========================= PUSAT VERIFIKASI ======================= */}
        {verifMeta && (
          <FinanceVerificationTab
            verifMeta={verifMeta}
            verifCounts={verifCounts}
            verifRows={verifRows}
            verifTab={verifTab}
            setVerifTab={setVerifTab}
            verifSearch={verifSearch}
            setVerifSearch={setVerifSearch}
            shownVerif={shownVerif}
            goTo={goTo}
            setDetailInvoice={setDetailInvoice}
            setProofView={setProofView}
            setReasonModal={setReasonModal}
            setConfirmModal={setConfirmModal}
            rejectPayment={rejectPayment}
            approvePayment={approvePayment}
          />
        )}

        {/* ========================= INPUT BUKTI TF ========================= */}
        {activeMenu === 'input_bukti' && (
          <FinanceManualProofTab
            pendingProofList={pendingProofList}
            proofForm={proofForm}
            setProofForm={setProofForm}
            submitProofForm={submitProofForm}
            resetProofForm={resetProofForm}
            isSubmittingProof={isSubmittingProof}
            proofInputKey={proofInputKey}
            mitra={mitra}
            orders={orders}
            bankAccounts={bankAccounts}
            handleProofFile={handleProofFile}
            setProofView={setProofView}
            copyText={copyText}
            toast={toast}
          />
        )}

        {/* ============================ INPUT ONGKIR ======================== */}
        {activeMenu === 'ongkir' && (
          <FinanceShippingCostTab
            needOngkir={needOngkir}
            orders={orders}
            setDetailInvoice={setDetailInvoice}
            openWA={openWA}
            setOngkirModal={setOngkirModal}
            goTo={goTo}
          />
        )}

        {/* =========================== PENGIRIMAN =========================== */}
        {activeMenu === 'pengiriman' && (
          <FinanceShippingResiTab
            readyToShip={readyToShip}
            shippedOrders={shippedOrders}
            doneOrders={doneOrders}
            shipTab={shipTab}
            setShipTab={setShipTab}
            shipTabs={SHIP_TABS}
            setDetailInvoice={setDetailInvoice}
            openWA={openWA}
            setResiModal={setResiModal}
            markReceived={markReceived}
          />
        )}

        {/* ============================ SEMUA PESANAN ======================= */}
        {activeMenu === 'pesanan' && (
          <FinanceOrdersTab
            orders={orders}
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            listSearch={listSearch}
            setListSearch={setListSearch}
            listBrand={listBrand}
            setListBrand={setListBrand}
            filteredOrders={filteredOrders}
            orderPag={orderPag}
            setDetailInvoice={setDetailInvoice}
            goTo={goTo}
            setOngkirModal={setOngkirModal}
            setResiModal={setResiModal}
            markReceived={markReceived}
            exportOrders={exportOrders}
          />
        )}

        {/* ====================== PENGAJUAN PEMBAYARAN ====================== */}
        {activeMenu === 'pengajuan' && (
          <FinancePaymentRequestsTab
            pendingPr={pendingPr}
            prCounts={prCounts}
            approvedPr={approvedPr}
            transferredPr={transferredPr}
            savePR={savePR}
            prForm={prForm}
            setPrForm={setPrForm}
            brands={brands}
            bankAccounts={bankAccounts}
            setBankModal={setBankModal}
            prFilter={prFilter}
            setPrFilter={setPrFilter}
            filteredPr={filteredPr}
            cancelPR={cancelPR}
            setPrDetailId={setPrDetailId}
          />
        )}

        {/* ============================= BUKU KAS =========================== */}
        {activeMenu === 'buku_kas' && (
          <FinanceLedgerTab
            ledgerRows={ledgerRows}
            kasMasuk={kasMasuk}
            kasKeluar={kasKeluar}
            orders={orders}
            ledgerType={ledgerType}
            setLedgerType={setLedgerType}
            exportLedger={exportLedger}
          />
        )}

        {/* ========================= TAGIHAN & REMINDER ===================== */}
        {activeMenu === 'reminder' && (
          <FinanceReminderTab
            agingRows={agingRows}
            orders={orders}
            closingPo={closingPo}
            closingFiltered={closingFiltered}
            closingSearch={closingSearch}
            setClosingSearch={setClosingSearch}
            closingUrgency={closingUrgency}
            setClosingUrgency={setClosingUrgency}
            reminderSearch={reminderSearch}
            setReminderSearch={setReminderSearch}
            setDetailInvoice={setDetailInvoice}
            openWA={openWA}
          />
        )}

        {/* ============================== REKAP PO ========================== */}
        {activeMenu === 'rekap' && (
          <FinancePoRecapTab
            rekapGroups={rekapGroups}
            rekapTab={rekapTab}
            setRekapTab={setRekapTab}
            toast={toast}
          />
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
          <FinanceMitraTab
            mitra={mitra}
            mitraRows={mitraRows}
            mitraSearch={mitraSearch}
            setMitraSearch={setMitraSearch}
            filteredMitra={filteredMitra}
            setMitraModal={setMitraModal}
            setMitraDetailId={setMitraDetailId}
            toggleMitra={toggleMitra}
            deleteMitra={deleteMitra}
            blankMitra={blankMitra}
          />
        )}

        {/* ============================= TIM ADMIN ========================== */}
        {activeMenu === 'tim' && (
          <FinanceTeamTab
            team={team}
            setTeamModal={setTeamModal}
            toggleTeam={toggleTeam}
            deleteTeam={deleteTeam}
          />
        )}

        {/* ============================ REKENING ============================ */}
        {activeMenu === 'rekening' && (
          <FinanceBankAccountsTab
            bankAccounts={bankAccounts}
            bankTab={bankTab}
            setBankTab={setBankTab}
            setBankModal={setBankModal}
            inlineBankId={inlineBankId}
            setInlineBankId={setInlineBankId}
            inlineBankForm={inlineBankForm}
            setInlineBankForm={setInlineBankForm}
            startInlineEditBank={startInlineEditBank}
            saveInlineEditBank={saveInlineEditBank}
            toggleBank={toggleBank}
            deleteBank={deleteBank}
          />
        )}

        {/* ============================ EKSPEDISI =========================== */}
        {activeMenu === 'ekspedisi' && (
          <FinanceCouriersTab
            couriers={couriers}
            setCourierModal={setCourierModal}
            toggleCourier={toggleCourier}
            deleteCourier={deleteCourier}
          />
        )}

        {/* ============================= PENGATURAN AKUN ============================= */}
        {activeMenu === 'pengaturan_akun' && (
          <AccountSettingsPanel
            currentUser={me}
            onUpdateUser={onUpdateUser}
            onUpdateAvatar={onUpdateAvatar}
            toast={toast}
            role="finance"
          />
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
                    waLink(mitraDetail.phone, `Halo ${mitraDetail.name}, kami dari Afatharshop.`),
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
              <>
                <Field label="Reset Password (Opsional)" hint="Kosongkan jika mitra tidak meminta ganti password. Minimal 6 karakter.">
                  <Input
                    type="password"
                    placeholder="Password baru mitra"
                    value={mitraModal.form.password || ''}
                    onChange={(e) =>
                      setMitraModal((prev) => ({ ...prev, form: { ...prev.form, password: e.target.value } }))
                    }
                  />
                </Field>
                <Switch
                  checked={!!mitraModal.form.active}
                  label="Akun aktif"
                  onChange={(next) => setMitraModal((prev) => ({ ...prev, form: { ...prev.form, active: next } }))}
                />
              </>
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
          title={teamModal.mode === 'edit' ? 'Edit Akun Tim' : 'Akun Tim Baru'}
          subtitle={teamModal.mode === 'edit' ? 'Perbarui informasi profil dan akses akun admin' : 'Tentukan peran akses tim admin'}
          onClose={() => setTeamModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setTeamModal(null)}>
                Batal
              </Button>
              <Button type="submit" form="fin-team-form" icon="check">
                {teamModal.mode === 'edit' ? 'Simpan Perubahan' : 'Buat Akun Tim'}
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
            {teamModal.mode === 'edit' && (
              <>
                <Field label="Reset Password (Opsional)" hint="Kosongkan jika tidak ingin mereset password. Minimal 6 karakter.">
                  <Input
                    type="password"
                    placeholder="Password baru tim"
                    value={teamModal.form.password || ''}
                    onChange={(e) =>
                      setTeamModal((prev) => ({ ...prev, form: { ...prev.form, password: e.target.value } }))
                    }
                  />
                </Field>
                <Switch
                  checked={!!teamModal.form.active}
                  label="Akun tim aktif"
                  onChange={(next) =>
                    setTeamModal((prev) => ({ ...prev, form: { ...prev.form, active: next } }))
                  }
                />
              </>
            )}
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
