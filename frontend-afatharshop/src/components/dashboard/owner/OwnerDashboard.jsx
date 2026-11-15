import React, { useEffect, useMemo, useState } from 'react';
import api, { mediaUrl } from '../../../services/api';
import { dbId, normalizeLevel } from '../../../services/adapters';
import AccountSettingsPanel from '../AccountSettingsPanel';
import ExportReportPanel from '../ExportReportPanel';
import OwnerOverviewTab from './OwnerOverviewTab';
import OwnerApprovalTab from './OwnerApprovalTab';
import OwnerTransferTab from './OwnerTransferTab';
import OwnerRequestHistoryTab from './OwnerRequestHistoryTab';
import OwnerOrdersTab from './OwnerOrdersTab';
import OwnerReceivablesTab from './OwnerReceivablesTab';
import OwnerRevenueRecapTab from './OwnerRevenueRecapTab';
import OwnerTeamTab from './OwnerTeamTab';
import OwnerPerformanceTab from './OwnerPerformanceTab';
import OwnerLedgerTab from './OwnerLedgerTab';
import OwnerAuditTrailTab from './OwnerAuditTrailTab';
import {
  ACCENTS,
  Badge,
  Button,
  Card,
  ConfirmModal,
  DashboardShell,
  EmptyState,
  Field,
  FeeRecapPanel,
  Icon,
  Input,
  LEVELS,
  levelTone,
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
  ProofModal,
  ProofThumb,
  ReasonModal,
  SHIP,
  SearchBox,
  Segmented,
  Select,
  StageTabs,
  Stepper,
  Switch,
  TH,
  TD,
  TableWrap,
  Textarea,
  Toast,
  addDays,
  addressText,
  buildWA,
  copyText,
  createSeedData,
  diffDays,
  downloadCSV,
  fmtDate,
  groupBy,
  isPaid,
  num,
  orderOutstanding,
  orderPatchToServer,
  orderPaid,
  orderStage,
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

const DEFAULT_USER = { id: 'u-owner', name: 'Heny Owner', role: 'owner', email: 'owner@afatharshop.com' };

const OWNER_ROLE_TONE = { owner: 'amber', finance: 'emerald', marketing: 'red' };

export default function OwnerDashboard({
  currentUser,
  onUpdateUser,
  onUpdateAvatar,
  onNavigateStore,
  onLogout,
  orders: ordersProp,
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
  onChangePaymentRequests,
  onChangeLedger,
  onChangeSettings,
  onPrintInvoice
}) {
  const me = currentUser || DEFAULT_USER;
  const seed = useMemo(() => createSeedData(), []);
  const brands = brandsProp || seed.brands;
  const accent = ACCENTS.owner;
  const { show: toast, toast: toastData, close: closeToast } = useToast();

  /* ------------------------------------------------------------------ state */
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [orders] = useDataState(ordersProp, seed.orders, onChangeOrders);
  const [mitra, commitMitra] = useDataState(mitraProp, seed.mitra, onChangeMitra);
  const [team, commitTeam] = useDataState(teamProp, seed.team, onChangeTeam);
  const [deposits] = useDataState(depositsProp, seed.deposits);
  const [paymentRequests, commitPaymentRequests] = useDataState(
    paymentRequestsProp,
    seed.paymentRequests,
    onChangePaymentRequests
  );
  const [bankAccounts] = useDataState(bankAccountsProp, seed.bankAccounts);
  const [couriers] = useDataState(couriersProp, seed.couriers);
  const [ledger, commitLedger] = useDataState(ledgerProp, seed.ledger, onChangeLedger);
  const [settings, commitSettings] = useDataState(settingsProp, seed.settings, onChangeSettings);
  const [teamTab, setTeamTab] = useState('tim');
  const [mitraSearch, setMitraSearch] = useState('');

  const [detailInvoice, setDetailInvoice] = useState(null);
  const [proofView, setProofView] = useState(null);
  const [reasonModal, setReasonModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // Pengajuan
  const [prFilter, setPrFilter] = useState('all');
  const [prSearch, setPrSearch] = useState('');
  const [prDetailId, setPrDetailId] = useState(null);
  const [transferModal, setTransferModal] = useState(null);

  // Monitoring pesanan
  const [stageFilter, setStageFilter] = useState('all');
  const [listSearch, setListSearch] = useState('');
  const [listBrand, setListBrand] = useState('all');

  // Keuangan
  const [ledgerType, setLedgerType] = useState('all');
  const [rekapTab, setRekapTab] = useState('brand');
  const [agingSearch, setAgingSearch] = useState('');

  // Audit
  const [auditSearch, setAuditSearch] = useState('');
  const [auditType, setAuditType] = useState('all');
  const [remoteAuditLogs, setRemoteAuditLogs] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const loadLogs = () => {
      api.management
        .activityLogs()
        .then((res) => {
          if (!cancelled && Array.isArray(res?.data)) {
            setRemoteAuditLogs(res.data);
          }
        })
        .catch(() => {});
    };
    loadLogs();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadLogs();
    }, 30000);
    window.addEventListener('focus', loadLogs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', loadLogs);
    };
  }, []);

  // Tim
  const [teamModal, setTeamModal] = useState(null);
  const [credential, setCredential] = useState(null);

  // Pengaturan
  const [settingsForm, setSettingsForm] = useState({ ...seed.settings });

  useEffect(() => {
    setSettingsForm({ ...settings });
  }, [settings]);

  /* ---------------------------------------------------------------- derived */
  const validOrders = useMemo(
    () => orders.filter((o) => o.marketingStatus !== MKT.TOLAK),
    [orders]
  );
  const omzet = useMemo(() => sumBy(validOrders, (o) => o.subtotal), [validOrders]);
  const dpCollected = useMemo(
    () => sumBy(validOrders.filter((o) => isPaid(o.dpStatus)), (o) => o.dpNominal),
    [validOrders]
  );
  const piutang = useMemo(() => sumBy(validOrders, (o) => orderOutstanding(o)), [validOrders]);
  const activeOrders = useMemo(
    () => orders.filter((o) => !['selesai', 'ditolak', 'baru'].includes(orderStage(o))),
    [orders]
  );

  const approvals = useMemo(
    () => paymentRequests.filter((r) => r.status === PREQ.APPROVAL_OWNER),
    [paymentRequests]
  );
  const readyTransfer = useMemo(
    () => paymentRequests.filter((r) => r.status === PREQ.APPROVED),
    [paymentRequests]
  );
  const transferred = useMemo(
    () => paymentRequests.filter((r) => r.status === PREQ.TRANSFERRED),
    [paymentRequests]
  );

  const kasMasuk = useMemo(() => sumBy(ledger.filter((l) => l.status === PAY.ACC), (l) => l.nominal), [ledger]);
  const kasKeluar = useMemo(() => sumBy(transferred, (r) => r.amount), [transferred]);
  const pendingOwnerValue = useMemo(() => sumBy(approvals, (r) => r.amount), [approvals]);

  const stageCounts = useMemo(() => {
    const c = {};
    orders.forEach((o) => {
      const s = orderStage(o);
      c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [orders]);

  const brandPerf = useMemo(() => {
    const groups = groupBy(validOrders, (o) => o.brand);
    return groups
      .map(({ key: brand, items: list }) => ({
        key: brand,
        invoices: list.length,
        qty: sumBy(list, (o) => o.qty),
        nilai: sumBy(list, (o) => o.subtotal),
        outstanding: sumBy(list, (o) => orderOutstanding(o))
      }))
      .sort((a, b) => b.nilai - a.nilai);
  }, [validOrders]);

  const rekapGroups = useMemo(() => {
    const keyFn =
      rekapTab === 'brand' ? (o) => o.brand : rekapTab === 'produk' ? (o) => o.produk : (o) => o.mitraName;
    const groups = groupBy(validOrders, keyFn);
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
  }, [validOrders, rekapTab]);

  const agingRows = useMemo(() => {
    const today = todayISO();
    return validOrders
      .filter((o) => orderOutstanding(o) > 0 && orderStage(o) !== 'baru')
      .map((o) => {
        const due = addDays(o.date, settings.pelunasanDueDays || 7);
        const late = diffDays(today, due);
        return { ...o, due, late: late > 0 ? late : 0, outstanding: orderOutstanding(o) };
      })
      .filter((o) => {
        const q = agingSearch.trim().toLowerCase();
        return !q || `${o.invoice} ${o.mitraName} ${o.produk}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.late - a.late);
  }, [validOrders, settings.pelunasanDueDays, agingSearch]);

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

  const filteredPr = useMemo(() => {
    const q = prSearch.trim().toLowerCase();
    return paymentRequests
      .filter((r) => prFilter === 'all' || r.status === prFilter)
      .filter(
        (r) =>
          !q ||
          `${r.code} ${r.purpose} ${r.ref} ${r.createdBy} ${r.bank}`.toLowerCase().includes(q)
      )
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [paymentRequests, prFilter, prSearch]);

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

  const approvalFiltered = useMemo(() => {
    const q = prSearch.trim().toLowerCase();
    return approvals
      .filter(
        (r) =>
          !q ||
          `${r.code} ${r.purpose} ${r.ref} ${r.createdBy} ${r.bank}`.toLowerCase().includes(q)
      )
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  }, [approvals, prSearch]);

  const ledgerTypes = useMemo(() => [...new Set(ledger.map((l) => l.type))], [ledger]);

  const brandOptions = useMemo(() => [...new Set(orders.map((o) => o.brand))].sort(), [orders]);

  const ledgerRows = useMemo(() => {
    const rows = ledger.map((l) => ({ ...l, direction: 'in' }));
    transferred.forEach((r) =>
      rows.push({
        id: `trf-${r.id}`,
        date: r.transfer?.at || r.owner?.at || r.createdAt,
        type: 'Pengajuan Owner',
        ref: r.code,
        mitraName: r.purpose,
        nominal: num(r.amount),
        bank: r.bank,
        by: r.transfer?.by || 'Owner',
        status: 'Transfer',
        note: r.transfer?.note || '',
        direction: 'out'
      })
    );
    return rows
      .filter((l) => ledgerType === 'all' || l.type === ledgerType)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [ledger, transferred, ledgerType]);

  /* Isi menu Ekspor Laporan: seluruh baris, tidak mengikuti filter/paginasi tab. */
  const exportSections = useMemo(() => {
    const rekapRows = (tab) => {
      const keyFn =
        tab === 'brand' ? (o) => o.brand : tab === 'produk' ? (o) => o.produk : (o) => o.mitraName;
      return groupBy(validOrders, keyFn)
        .map(({ key, items: list }) => [
          key,
          list.length,
          sumBy(list, (o) => o.qty),
          sumBy(list, (o) => o.subtotal),
          sumBy(list, (o) => orderPaid(o)),
          sumBy(list, (o) => orderOutstanding(o))
        ])
        .sort((a, b) => b[3] - a[3]);
    };

    const ledgerAll = [
      ...ledger.map((l) => ({ ...l, direction: 'in' })),
      ...transferred.map((r) => ({
        date: r.transfer?.at || r.owner?.at || r.createdAt,
        type: 'Pengajuan Owner',
        ref: r.code,
        mitraName: r.purpose,
        nominal: num(r.amount),
        bank: r.bank,
        by: r.transfer?.by || r.owner?.by || 'Owner',
        status: 'Transfer',
        direction: 'out'
      }))
    ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const dueDays = settings.pelunasanDueDays || 7;
    const today = todayISO();

    const companyFeeOf = (o) =>
      num(o.feeCompanyNominal) || Math.max(0, num(o.brandDiscountNominal) - num(o.feeMitraNominal));
    const brandDiscPctOf = (name) => {
      const brand = (brands || []).find(
        (b) => String(b.name || '').toLowerCase() === String(name || '').toLowerCase()
      );
      return num(brand?.discountValue ?? brand?.discountDBAll);
    };

    const totalOmzet = sumBy(validOrders, (o) => num(o.subtotal) || num(o.total));
    const totalQty = sumBy(validOrders, (o) => num(o.qty));
    const totalPaid = sumBy(validOrders, (o) => orderPaid(o));
    const totalOutstanding = sumBy(validOrders, (o) => orderOutstanding(o));
    const totalBrandDisc = sumBy(validOrders, (o) => num(o.brandDiscountNominal));
    const totalFeeMitra = sumBy(validOrders, (o) => num(o.feeMitraNominal));
    const totalFeeCompany = sumBy(validOrders, companyFeeOf);

    const brandRecap = groupBy(validOrders, (o) => o.brand || '-')
      .map(({ key, items: list }) => [
        key,
        brandDiscPctOf(key),
        list.length,
        sumBy(list, (o) => num(o.qty)),
        sumBy(list, (o) => num(o.subtotal)),
        sumBy(list, (o) => num(o.brandDiscountNominal)),
        sumBy(list, (o) => num(o.feeMitraNominal)),
        sumBy(list, companyFeeOf)
      ])
      .sort((a, b) => b[4] - a[4]);

    const levelRecap = LEVELS.map((levelName) => {
      const list = validOrders.filter((o) => (o.level || o.mitraLevel) === levelName);
      const omzet = sumBy(list, (o) => num(o.subtotal));
      const company = sumBy(list, companyFeeOf);
      return [
        levelName,
        list.length,
        sumBy(list, (o) => num(o.qty)),
        omzet,
        sumBy(list, (o) => num(o.brandDiscountNominal)),
        sumBy(list, (o) => num(o.feeMitraNominal)),
        company,
        omzet > 0 ? Math.round((company / omzet) * 10000) / 100 : 0
      ];
    }).filter((row) => row[1] > 0);

    const mitraRecap = groupBy(validOrders, (o) => o.mitraName || '-')
      .map(({ key, items: list }) => {
        const info = (mitra || []).find(
          (m) => String(m.name || '').toLowerCase() === String(key || '').toLowerCase()
        );
        return [
          key,
          list[0]?.level || info?.level || '-',
          info?.city || list[0]?.mitraCity || '',
          info?.phone || list[0]?.mitraPhone || '',
          list.length,
          sumBy(list, (o) => num(o.qty)),
          sumBy(list, (o) => num(o.subtotal)),
          sumBy(list, (o) => orderPaid(o)),
          sumBy(list, (o) => orderOutstanding(o)),
          sumBy(list, (o) => num(o.feeMitraNominal)),
          sumBy(list, companyFeeOf)
        ];
      })
      .sort((a, b) => b[6] - a[6]);

    const summaryRows = [
      ['Total Invoice', validOrders.length],
      ['Total Qty', totalQty],
      ['Omzet (Rp)', totalOmzet],
      ['Total Dibayar (Rp)', totalPaid],
      ['Piutang (Rp)', totalOutstanding],
      ['Diskon Pabrik (Rp)', totalBrandDisc],
      ['Fee Mitra (Rp)', totalFeeMitra],
      ['Fee Perusahaan (Rp)', totalFeeCompany],
      ['Jumlah Mitra', new Set(validOrders.map((o) => o.mitraName)).size],
      ['Jumlah Brand', new Set(validOrders.map((o) => o.brand)).size]
    ];

    return [
      {
        id: 'ringkasan',
        label: 'Ringkasan',
        sheetName: 'Ringkasan',
        desc: 'Angka utama seluruh pesanan: omzet, pembayaran, piutang, dan fee perusahaan.',
        headers: ['Metrik', 'Nilai'],
        numericCols: [1],
        sum: false,
        rows: summaryRows
      },
      {
        id: 'pesanan',
        label: 'Daftar Pesanan',
        sheetName: 'Pesanan',
        desc: 'Seluruh pesanan PO: nilai, diskon pabrik, fee mitra & perusahaan, DP, pelunasan, ongkir, sisa tagihan, tahap, dan resi.',
        headers: [
          'Invoice', 'Tanggal', 'Mitra', 'Level', 'Brand', 'Produk', 'Varian', 'Qty',
          'Nilai (Rp)', 'Diskon Pabrik (Rp)', 'Fee Mitra (Rp)', 'Fee Perusahaan (Rp)',
          'DP (Rp)', 'Status DP', 'Pelunasan (Rp)', 'Status Pelunasan',
          'Ongkir (Rp)', 'Status Ongkir', 'Sisa (Rp)', 'Tahap', 'Resi'
        ],
        numericCols: [7, 8, 9, 10, 11, 12, 14, 16, 18],
        currencyCols: [8, 9, 10, 11, 12, 14, 16, 18],
        integerCols: [7],
        dateCols: [1],
        rows: orders.map((o) => [
          o.invoice, o.date, o.mitraName, o.level, o.brand, o.produk, o.variant, o.qty,
          o.subtotal, num(o.brandDiscountNominal), num(o.feeMitraNominal), companyFeeOf(o),
          o.dpNominal, o.dpStatus, o.pelunasanNominal, o.pelunasanStatus,
          o.ongkir, o.ongkirStatus, orderOutstanding(o), stageMeta(orderStage(o)).label, o.resi || ''
        ])
      },
      {
        id: 'buku_kas',
        label: 'Buku Kas',
        sheetName: 'Buku Kas',
        desc: 'Seluruh mutasi kas masuk mitra dan transfer keluar ke pengajuan.',
        headers: ['Tanggal', 'Tipe', 'Referensi', 'Mitra / Tujuan', 'Nominal (Rp)', 'Arah', 'Bank', 'Oleh', 'Status'],
        numericCols: [4],
        currencyCols: [4],
        dateCols: [0],
        rows: ledgerAll.map((l) => [
          l.date, l.type, l.ref, l.mitraName, l.nominal,
          l.direction === 'out' ? 'Keluar' : 'Masuk', l.bank || '', l.by || '', l.status || ''
        ])
      },
      {
        id: 'rekap_brand',
        label: 'Rekap per Brand',
        sheetName: 'Rekap Brand',
        desc: 'Omzet, diskon pabrik, fee mitra, dan fee perusahaan per brand.',
        headers: [
          'Brand', 'Diskon Pabrik (%)', 'Invoice', 'Qty', 'Omzet (Rp)',
          'Diskon Pabrik (Rp)', 'Fee Mitra (Rp)', 'Fee Perusahaan (Rp)'
        ],
        numericCols: [1, 2, 3, 4, 5, 6, 7],
        currencyCols: [4, 5, 6, 7],
        integerCols: [2, 3],
        sum: [2, 3, 4, 5, 6, 7],
        rows: brandRecap
      },
      {
        id: 'rekap_fee_level',
        label: 'Rekap Fee per Level',
        sheetName: 'Rekap Fee Level',
        desc: 'Keuntungan perusahaan per level mitra: diskon pabrik dikurangi fee mitra.',
        headers: [
          'Level', 'Invoice', 'Qty', 'Omzet (Rp)', 'Diskon Pabrik (Rp)',
          'Fee Mitra (Rp)', 'Fee Perusahaan (Rp)', 'Margin Fee (%)'
        ],
        numericCols: [1, 2, 3, 4, 5, 6, 7],
        currencyCols: [3, 4, 5, 6],
        integerCols: [1, 2],
        sum: [1, 2, 3, 4, 5, 6],
        rows: levelRecap
      },
      {
        id: 'rekap_produk',
        label: 'Rekap per Produk',
        sheetName: 'Rekap Produk',
        desc: 'Omzet, pembayaran, dan piutang yang dikelompokkan per produk.',
        headers: ['Produk', 'Jumlah Invoice', 'Qty', 'Nilai (Rp)', 'Dibayar (Rp)', 'Piutang (Rp)'],
        numericCols: [1, 2, 3, 4, 5],
        currencyCols: [3, 4, 5],
        integerCols: [1, 2],
        rows: rekapRows('produk')
      },
      {
        id: 'rekap_mitra',
        label: 'Rekap per Mitra',
        sheetName: 'Rekap Mitra',
        desc: 'Data mitra beserta omzet, pembayaran, piutang, dan kontribusi fee.',
        headers: [
          'Mitra', 'Level', 'Kota', 'Telepon', 'Invoice', 'Qty', 'Omzet (Rp)',
          'Dibayar (Rp)', 'Piutang (Rp)', 'Fee Mitra (Rp)', 'Fee Perusahaan (Rp)'
        ],
        numericCols: [4, 5, 6, 7, 8, 9, 10],
        currencyCols: [6, 7, 8, 9, 10],
        integerCols: [4, 5],
        rows: mitraRecap
      },
      {
        id: 'piutang',
        label: 'Piutang & Aging',
        sheetName: 'Piutang',
        desc: 'Tagihan belum lunas beserta jatuh tempo dan jumlah hari terlambat.',
        headers: ['Invoice', 'Mitra', 'Jatuh Tempo', 'Terlambat (hari)', 'Sisa (Rp)', 'Tahap'],
        numericCols: [3, 4],
        currencyCols: [4],
        integerCols: [3],
        dateCols: [2],
        rows: validOrders
          .filter((o) => orderOutstanding(o) > 0 && orderStage(o) !== 'baru')
          .map((o) => {
            const due = addDays(o.date, dueDays);
            const late = diffDays(today, due);
            return [o.invoice, o.mitraName, due, late > 0 ? late : 0, orderOutstanding(o), stageMeta(orderStage(o)).label];
          })
          .sort((a, b) => b[3] - a[3])
      }
    ];
  }, [orders, validOrders, ledger, transferred, settings.pelunasanDueDays, brands, mitra]);

  const auditEvents = useMemo(() => {
    if (remoteAuditLogs.length > 0) {
      return remoteAuditLogs.map((log) => ({
        date: log.at ? log.at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        actor: log.by || (log.role ? log.role.toUpperCase() : 'Sistem'),
        type: log.module || log.action || 'Aktivitas',
        ref: log.action || `LOG-${log.id}`,
        detail: log.description || '-'
      }));
    }
    const ev = [];
    orders.forEach((o) => {
      ev.push({
        date: o.date,
        actor: o.createdBy || 'Mitra',
        type: 'Pesanan dibuat',
        ref: o.invoice,
        detail: `${o.mitraName} · ${o.produk} ${o.variant} ×${o.qty}`
      });
      if (o.marketingStatus === MKT.ACC && o.marketingAt) {
        ev.push({
          date: o.marketingAt,
          actor: o.marketingBy || 'Purchasing',
          type: 'ACC purchasing',
          ref: o.invoice,
          detail: 'Pesanan disetujui untuk diproses'
        });
      }
      if (o.marketingStatus === MKT.TOLAK) {
        ev.push({
          date: o.marketingAt || o.date,
          actor: o.marketingBy || 'Purchasing',
          type: 'Tolak pesanan',
          ref: o.invoice,
          detail: o.marketingNote || '-'
        });
      }
      if (o.dpStatus === PAY.ACC) {
        ev.push({
          date: o.dpVerifiedAt || o.date,
          actor: o.dpVerifiedBy || 'Finance',
          type: 'Verifikasi DP',
          ref: o.invoice,
          detail: rp(o.dpNominal)
        });
      }
      if (o.productionStatus === PROD.READY) {
        ev.push({
          date: o.readyAt || o.date,
          actor: 'Produksi',
          type: 'Pesanan ready',
          ref: o.invoice,
          detail: 'Siap diisi alamat & ongkir'
        });
      }
      if (o.ongkir > 0) {
        ev.push({
          date: o.ongkirAt || o.date,
          actor: 'Finance',
          type: 'Input ongkir',
          ref: o.invoice,
          detail: `${rp(o.ongkir)} · ${o.ekspedisi || '-'}`
        });
      }
      if (o.pelunasanStatus === PAY.ACC) {
        ev.push({
          date: o.pelunasanVerifiedAt || o.date,
          actor: o.pelunasanVerifiedBy || 'Finance',
          type: 'Verifikasi pelunasan',
          ref: o.invoice,
          detail: rp(o.pelunasanNominal)
        });
      }
      if (o.ongkirStatus === PAY.ACC) {
        ev.push({
          date: o.ongkirVerifiedAt || o.date,
          actor: o.ongkirVerifiedBy || 'Finance',
          type: 'Verifikasi ongkir',
          ref: o.invoice,
          detail: rp(o.ongkir)
        });
      }
      if (o.resi) {
        ev.push({
          date: o.shippedAt || o.date,
          actor: 'Finance',
          type: 'Pengiriman',
          ref: o.invoice,
          detail: `${o.ekspedisi || '-'} · ${o.resi}`
        });
      }
      if (o.receivedAt) {
        ev.push({
          date: o.receivedAt,
          actor: 'Mitra',
          type: 'Diterima',
          ref: o.invoice,
          detail: 'Pesanan selesai'
        });
      }
    });
    paymentRequests.forEach((r) => {
      ev.push({
        date: r.createdAt,
        actor: r.createdBy,
        type: 'Pengajuan pembayaran',
        ref: r.code,
        detail: `${rp(r.amount)} · ${r.purpose}`
      });
      if (r.marketing) {
        ev.push({
          date: r.marketing.at,
          actor: r.marketing.by,
          type: r.marketing.decision === 'ACC' ? 'ACC purchasing (pengajuan)' : 'Tolak pengajuan',
          ref: r.code,
          detail: r.marketing.note || '-'
        });
      }
      if (r.owner) {
        ev.push({
          date: r.owner.at,
          actor: r.owner.by,
          type: r.owner.decision === 'ACC' ? 'Approval owner' : 'Tolak owner',
          ref: r.code,
          detail: r.owner.note || '-'
        });
      }
      if (r.transfer) {
        ev.push({
          date: r.transfer.at,
          actor: r.transfer.by,
          type: 'Transfer dana',
          ref: r.code,
          detail: `${rp(r.amount)} · ${r.transfer.note || '-'}`
        });
      }
    });
    deposits.forEach((d) => {
      if (d.status === PAY.ACC) {
        ev.push({
          date: d.date,
          actor: d.verifiedBy || 'Finance',
          type: 'Deposit ACC',
          ref: d.mitraName,
          detail: rp(d.nominal)
        });
      }
    });
    return ev
      .filter((e) => e.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [remoteAuditLogs, orders, paymentRequests, deposits]);

  const auditTypes = useMemo(() => [...new Set(auditEvents.map((e) => e.type))], [auditEvents]);

  const filteredAudit = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditEvents.filter((e) => {
      if (auditType !== 'all' && e.type !== auditType) return false;
      if (!q) return true;
      return `${e.actor} ${e.type} ${e.ref} ${e.detail}`.toLowerCase().includes(q);
    });
  }, [auditEvents, auditType, auditSearch]);

  const teamPerf = useMemo(
    () =>
      team.map((u) => {
        const marketingAcc = orders.filter(
          (o) => o.marketingBy === u.name && o.marketingStatus === MKT.ACC
        ).length;
        const dpAcc = orders.filter((o) => o.dpVerifiedBy === u.name && o.dpStatus === PAY.ACC).length;
        const pelunasanAcc = orders.filter(
          (o) => o.pelunasanVerifiedBy === u.name && o.pelunasanStatus === PAY.ACC
        ).length;
        const ongkirAcc = orders.filter(
          (o) => o.ongkirVerifiedBy === u.name && o.ongkirStatus === PAY.ACC
        ).length;
        const ordersCreated = orders.filter((o) => o.createdBy === u.name).length;
        const prCreated = paymentRequests.filter((r) => r.createdBy === u.name).length;
        const prReviewed = paymentRequests.filter((r) => r.marketing?.by === u.name).length;
        const prApproved = paymentRequests.filter((r) => r.owner?.by === u.name).length;
        return {
          ...u,
          marketingAcc,
          dpAcc,
          pelunasanAcc,
          ongkirAcc,
          ordersCreated,
          prCreated,
          prReviewed,
          prApproved,
          actions:
            marketingAcc + dpAcc + pelunasanAcc + ongkirAcc + ordersCreated + prCreated + prReviewed + prApproved
        };
      }),
    [team, orders, paymentRequests]
  );

  const notifications = useMemo(
    () => [
      ...approvals.slice(0, 5).map((r) => ({
        id: `ap-${r.id}`,
        title: `${r.code} menunggu approval Anda`,
        sub: `${rp(r.amount)} · ${r.purpose}`,
        tone: 'amber',
        onClick: () => {
          setPrDetailId(r.id);
          setActiveMenu('persetujuan');
        }
      })),
      ...readyTransfer.slice(0, 4).map((r) => ({
        id: `tr-${r.id}`,
        title: `${r.code} siap ditransfer`,
        sub: `${rp(r.amount)} · ${r.bank}`,
        tone: 'blue',
        onClick: () => {
          setActiveMenu('transfer');
        }
      }))
    ],
    [approvals, readyTransfer]
  );

  const menus = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', title: 'Ringkasan Eksekutif', icon: 'grid' },
      {
        group: 'approval',
        label: 'Persetujuan Dana',
        children: [
          {
            id: 'persetujuan',
            label: 'Approval Pengajuan',
            title: 'Persetujuan Pengajuan Pembayaran',
            icon: 'shield',
            badge: approvals.length || null
          },
          {
            id: 'transfer',
            label: 'Tandai Transfer',
            title: 'Transfer Dana ke Rekening Tujuan',
            icon: 'wallet',
            badge: readyTransfer.length || null
          },
          { id: 'riwayat_pengajuan', label: 'Riwayat Pengajuan', title: 'Riwayat Pengajuan Dana', icon: 'file' }
        ]
      },
      {
        group: 'monitoring',
        label: 'Monitoring Bisnis',
        children: [
          { id: 'pesanan', label: 'Pesanan PO', title: 'Monitoring Seluruh Pesanan', icon: 'receipt' },
          { id: 'piutang', label: 'Piutang Mitra', title: 'Piutang & Reminder Mitra', icon: 'clock' },
          { id: 'rekap', label: 'Rekap Omzet', title: 'Rekap Omzet PO', icon: 'file' },
          { id: 'rekap_fee', label: 'Rekap Fee', title: 'Rekap Fee & Diskon Brand', icon: 'wallet' }
        ]
      },
      {
        group: 'kinerja',
        label: 'Tim & Kinerja',
        children: [
          {
            id: 'tim',
            label: 'Tim & Akses',
            title: 'Manajemen Tim & Hak Akses',
            icon: 'users',
            badge: mitra.filter((m) => !m.active).length || null
          },
          { id: 'kinerja', label: 'Kinerja Tim', title: 'Kinerja Tim Admin', icon: 'spark' }
        ]
      },
      {
        group: 'keuangan',
        label: 'Keuangan & Audit',
        children: [
          { id: 'buku_kas', label: 'Buku Kas', title: 'Buku Kas Perusahaan', icon: 'card' },
          { id: 'ekspor_laporan', label: 'Ekspor Laporan', title: 'Unduh Laporan Lengkap (Excel)', icon: 'download' },
          { id: 'audit', label: 'Audit Trail', title: 'Jejak Audit Aktivitas', icon: 'eye' }
        ]
      },
      { id: 'pengaturan_akun', label: 'Pengaturan Akun', title: 'Pengaturan Profil & Keamanan', icon: 'settings' }
    ],
    [approvals.length, readyTransfer.length]
  );

  /* --------------------------------------------------------------- handlers */
  const serverFail = (err, action) =>
    toast(`${action} gagal: ${err?.message || 'Terjadi kesalahan pada server.'}`, 'error');

  const notOnServer = (label) =>
    toast(`${label} belum tersimpan di database. Muat ulang data lalu coba lagi.`, 'error');

  const decidePR = async (req, decision, note) => {
    const targetId = dbId(req);
    if (!targetId) {
      notOnServer(`Pengajuan bayar ${req.code}`);
      return false;
    }
    try {
      await api.management.updatePaymentRequest(targetId, {
        owner_decision: decision,
        owner_note: note
      });
    } catch (err) {
      serverFail(err, `Memproses pengajuan ${req.code}`);
      return false;
    }
    commitPaymentRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: decision === 'ACC' ? PREQ.APPROVED : PREQ.REJECTED,
              dbStatus: decision === 'ACC' ? 'ACC Owner' : 'Ditolak Owner',
              owner: { by: me.name, at: todayISO(), note, decision }
            }
          : r
      )
    );
    setPrDetailId(null);
    toast(
      decision === 'ACC'
        ? `${req.code} disetujui. Silakan tandai transfer setelah dana dikirim.`
        : `${req.code} ditolak.`,
      decision === 'ACC' ? 'success' : 'warning'
    );
    return true;
  };

  const approvePR = (req) => {
    setConfirmModal({
      title: 'Setujui pengajuan',
      message: `Setujui ${req.code} sebesar ${rp(req.amount)} untuk "${req.purpose}"? Dana akan masuk daftar siap transfer.`,
      confirmLabel: 'Setujui pengajuan',
      onConfirm: async () => {
        const ok = await decidePR(req, 'ACC', 'Disetujui owner.');
        if (ok !== false) setConfirmModal(null);
      }
    });
  };

  const rejectPR = (req) => {
    setPrDetailId(null);
    setReasonModal({
      title: 'Tolak pengajuan',
      subtitle: `${req.code} · ${rp(req.amount)}`,
      label: 'Alasan penolakan',
      placeholder: 'Contoh: dokumen belum lengkap / dana belum tersedia',
      confirmLabel: 'Tolak pengajuan',
      danger: true,
      onSubmit: async (note) => {
        await decidePR(req, 'TOLAK', note);
        setReasonModal(null);
      }
    });
  };

  const handleTransferProof = (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast('Ukuran berkas maksimal 2 MB.', 'error');
    const reader = new FileReader();
    reader.onload = () =>
      setTransferModal((prev) => ({
        ...prev,
        form: { ...prev.form, proof: String(reader.result), proofFile: file }
      }));
    reader.readAsDataURL(file);
  };

  const saveTransfer = async (e) => {
    e.preventDefault();
    const req = transferModal.req;
    const f = transferModal.form;
    if (!f.proofFile) return toast('Lampirkan bukti transfer terlebih dahulu.', 'error');
    const targetId = dbId(req);
    if (!targetId) return notOnServer(`Pengajuan bayar ${req.code}`);

    let proofPath = '';
    try {
      const uploaded = await api.management.uploadFile(f.proofFile, 'proof');
      proofPath = uploaded?.data?.path || '';
    } catch (err) {
      return serverFail(err, 'Mengunggah bukti transfer');
    }
    if (!proofPath) return toast('Bukti transfer tidak tersimpan di server.', 'error');

    try {
      await api.management.updatePaymentRequest(targetId, {
        transfer_proof: proofPath,
        transfer_note: f.note || f.ref,
        transfer_by: me.name
      });
    } catch (err) {
      return serverFail(err, `Menandai transfer ${req.code}`);
    }

    commitPaymentRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: PREQ.TRANSFERRED,
              dbStatus: 'Selesai Ditransfer',
              owner: r.owner || { by: me.name, at: todayISO(), note: 'Disetujui owner.', decision: 'ACC' },
              transfer: {
                by: me.name,
                at: todayISO(),
                note: f.note || f.ref || 'Transfer dari portal owner',
                proof: mediaUrl(proofPath)
              }
            }
          : r
      )
    );
    setTransferModal(null);
    toast(`${req.code} ditandai sudah ditransfer. Finance dapat melihat bukti transfer.`);
  };

  const toggleTeam = (u) => {
    if (u.id === me.id) return toast('Tidak dapat menonaktifkan akun sendiri.', 'error');
    setConfirmModal({
      title: `${u.active ? 'Nonaktifkan' : 'Aktifkan'} akun`,
      message: `${u.active ? 'Nonaktifkan' : 'Aktifkan'} akun ${u.name} (${roleLabel(u.role)})?`,
      confirmLabel: u.active ? 'Nonaktifkan' : 'Aktifkan',
      danger: u.active,
      onConfirm: async () => {
        const targetId = dbId(u);
        if (!targetId) return notOnServer(`Akun ${u.name}`);
        try {
          await api.management.updateUser(targetId, { is_active: !u.active });
        } catch (err) {
          return serverFail(err, `Mengubah status akun ${u.name}`);
        }
        commitTeam((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)));
        setConfirmModal(null);
        toast(`${u.name} ${u.active ? 'dinonaktifkan' : 'diaktifkan'}.`);
      }
    });
  };

  const deleteTeam = (u) => {
    if (u.role === 'owner' || u.id === me.id || u.email === me.email) {
      return toast('Tidak dapat menghapus akun owner sendiri.', 'error');
    }
    setConfirmModal({
      title: 'Hapus Akun Pengguna',
      message: `Hapus akun "${u.name}" (${roleLabel(u.role)})? Akses login akan dicabut dan data dihapus permanen.`,
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
        toast(`Akun ${u.name} berhasil dihapus.`, 'warning');
      }
    });
  };

  const toggleMitra = async (m) => {
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
      message: `Hapus akun mitra "${m.name}" (${normalizeLevel(m.level)})? Akses login akan dicabut dan data dihapus permanen.`,
      confirmLabel: 'Hapus Akun Mitra',
      danger: true,
      onConfirm: async () => {
        const targetId = dbId(m) || m.id;
        if (!targetId || String(targetId).startsWith('m-') || String(targetId).startsWith('usr-')) {
          commitMitra((prev) => prev.filter((x) => x.id !== m.id));
          setConfirmModal(null);
          return notOnServer(`Akun ${m.name}`);
        }
        try {
          await api.management.deleteUser(targetId, true);
        } catch (err) {
          return serverFail(err, `Menghapus akun ${m.name}`);
        }
        commitMitra((prev) => prev.filter((x) => x.id !== m.id));
        setConfirmModal(null);
        toast(`Akun mitra ${m.name} berhasil dihapus.`, 'warning');
      }
    });
  };

  const deletePR = (req) => {
    setConfirmModal({
      title: 'Hapus Pengajuan Pembayaran',
      message: `Hapus permanen pengajuan pembayaran ${req.code} (${req.purpose} - ${rp(req.amount)})? Data pengajuan akan dihapus dari sistem.`,
      confirmLabel: 'Hapus Pengajuan',
      danger: true,
      onConfirm: async () => {
        const targetId = dbId(req) || req.id;
        if (targetId && !String(targetId).startsWith('pr-')) {
          try {
            await api.management.deletePaymentRequest(targetId);
          } catch (err) {
            return serverFail(err, `Menghapus pengajuan ${req.code}`);
          }
        }
        commitPaymentRequests((prev) => prev.filter((x) => x.id !== req.id && x.code !== req.code));
        setConfirmModal(null);
        if (prDetailId === req.id) setPrDetailId(null);
        toast(`Pengajuan pembayaran ${req.code} berhasil dihapus.`, 'warning');
      }
    });
  };

  const deleteLedgerRow = (l) => {
    setConfirmModal({
      title: 'Hapus Mutasi Buku Kas',
      message: `Hapus catatan mutasi kas "${l.ref || l.type}" sebesar ${rp(l.nominal)}? Catatan ini akan dihapus dari buku kas.`,
      confirmLabel: 'Hapus Transaksi',
      danger: true,
      onConfirm: async () => {
        const targetId = l.backendId || dbId(l);
        if (targetId && !String(targetId).startsWith('k-') && !String(targetId).startsWith('leg-')) {
          try {
            if (l.type === 'Deposit' || l.direction === 'in') {
              await api.management.deleteDeposit(targetId).catch(() => {});
            } else {
              await api.management.deletePayment(targetId).catch(() => {});
            }
          } catch (err) {
            console.warn('Backend sync delete ledger:', err);
          }
        }
        commitLedger((prev) => prev.filter((x) => x.id !== l.id));
        setConfirmModal(null);
        toast(`Mutasi buku kas ${l.ref || ''} berhasil dihapus.`, 'warning');
      }
    });
  };

  const deleteAuditLog = (logItem) => {
    setConfirmModal({
      title: 'Hapus Log Riwayat Aktivitas',
      message: `Hapus rekaman audit "${logItem.action || logItem.detail}" oleh ${logItem.actor || 'user'}?`,
      confirmLabel: 'Hapus Log',
      danger: true,
      onConfirm: async () => {
        if (logItem.id && typeof logItem.id === 'number') {
          try {
            await api.management.deleteActivityLog(logItem.id);
          } catch (err) {
            console.warn('Gagal hapus log di server:', err);
          }
        }
        setRemoteAuditLogs((prev) => prev.filter((x) => x.id !== logItem.id));
        setConfirmModal(null);
        toast('Catatan jejak aktivitas dihapus.', 'warning');
      }
    });
  };

  const handleClearAuditLogs = () => {
    setConfirmModal({
      title: 'Bersihkan Seluruh Riwayat Jejak Audit',
      message: 'Apakah Anda yakin ingin menghapus seluruh rekaman log jejak audit? Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Bersihkan Semua',
      danger: true,
      onConfirm: async () => {
        try {
          await api.management.clearActivityLogs();
        } catch (err) {
          console.warn('Gagal bersihkan log di server:', err);
        }
        setRemoteAuditLogs([]);
        setConfirmModal(null);
        toast('Seluruh rekaman jejak audit berhasil dibersihkan.', 'warning');
      }
    });
  };

  const saveTeam = async (e) => {
    e.preventDefault();
    const f = teamModal.form;
    if (!f.name?.trim() || !f.email?.trim()) return toast('Nama dan email wajib diisi.', 'error');

    if (teamModal.mode === 'edit') {
      const current = team.find((u) => u.id === teamModal.id);
      const targetId = dbId(current) || dbId(teamModal.form) || dbId(teamModal);
      if (!targetId) return notOnServer(`Akun ${current?.name || f.name}`);
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
        return serverFail(err, `Memperbarui akun ${f.name}`);
      }
      commitTeam((prev) => prev.map((x) => (x.id === teamModal.id ? { ...x, ...f } : x)));
      toast(`Akun ${f.name} diperbarui.`);
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
      return serverFail(err, `Membuat akun ${f.name}`);
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
      title: 'Akun tim dibuat',
      name: f.name.trim(),
      email: f.email.trim(),
      password: tempPassword,
      note: `Peran: ${roleLabel(f.role)}. Password hanya ditampilkan sekali.`
    });
    toast(`Akun ${f.name} tersimpan di database.`);
  };

  const saveSettingsForm = async (e) => {
    e.preventDefault();
    let saved;
    try {
      saved = await api.management.updateSettings(settingsForm);
    } catch (err) {
      return serverFail(err, 'Menyimpan konfigurasi bisnis');
    }
    commitSettings((prev) => ({ ...prev, ...(saved?.data || {}), ...settingsForm }));
    toast('Konfigurasi bisnis tersimpan di database.');
  };

  const openWA = (o, kind) => {
    window.open(waLink(o.phone, buildWA(kind, o, { ...settings, banks: bankAccounts })), '_blank');
  };

  const exportRekap = () => {
    const keyLabel = rekapTab === 'brand' ? 'Brand' : rekapTab === 'produk' ? 'Produk' : 'Mitra';
    downloadCSV(`rekap_${rekapTab}_owner_${todayISO()}.csv`, [
      [keyLabel, 'Jumlah Invoice', 'Qty', 'Nilai', 'Dibayar', 'Piutang'],
      ...rekapGroups.map((g) => [g.key, g.invoices, g.qty, g.nilai, g.paid, g.outstanding])
    ]);
    toast('Rekap omzet diunduh.');
  };

  const exportLedger = () => {
    downloadCSV(`buku_kas_owner_${todayISO()}.csv`, [
      ['Tanggal', 'Tipe', 'Referensi', 'Keterangan', 'Nominal', 'Arah', 'Bank', 'Oleh', 'Status'],
      ...ledgerRows.map((l) => [
        l.date,
        l.type,
        l.ref,
        l.mitraName,
        l.nominal,
        l.direction === 'in' ? 'Masuk' : 'Keluar',
        l.bank || '',
        l.by || '',
        l.status || ''
      ])
    ]);
    toast('Buku kas diunduh.');
  };

  const goTo = (menu) => setActiveMenu(menu);

  /* ------------------------------------------------------------------ render */
  return (
    <>
      <DashboardShell
        accent={accent}
        menus={menus}
        activeMenu={activeMenu}
        onNavigate={setActiveMenu}
        portalLabel="Owner"
        portalSub="Afatharshop · Kontrol & Persetujuan"
        currentUser={me}
        onLogout={onLogout}
        onNavigateStore={onNavigateStore}
        notifications={notifications}
        darkSidebar
      >
        {/* ============================= DASHBOARD ============================= */}
        {activeMenu === 'dashboard' && (
          <OwnerOverviewTab
            omzet={omzet}
            validOrders={validOrders}
            dpCollected={dpCollected}
            kasMasuk={kasMasuk}
            kasKeluar={kasKeluar}
            approvals={approvals}
            pendingOwnerValue={pendingOwnerValue}
            piutang={piutang}
            activeOrders={activeOrders}
            readyTransfer={readyTransfer}
            stageCounts={stageCounts}
            stageMeta={stageMeta}
            orders={orders}
            brandPerf={brandPerf}
            auditEvents={auditEvents}
            agingRows={agingRows}
            goTo={goTo}
            setStageFilter={setStageFilter}
            setReasonModal={setReasonModal}
            approvePR={approvePR}
            decidePR={decidePR}
            setTransferModal={setTransferModal}
            accent={ACCENTS.amber}
          />
        )}

        {/* =========================== PERSETUJUAN ============================ */}
        {activeMenu === 'persetujuan' && (
          <OwnerApprovalTab
            approvals={approvals}
            pendingOwnerValue={pendingOwnerValue}
            readyTransfer={readyTransfer}
            transferred={transferred}
            kasKeluar={kasKeluar}
            prSearch={prSearch}
            setPrSearch={setPrSearch}
            approvalFiltered={approvalFiltered}
            setPrDetailId={setPrDetailId}
            rejectPR={rejectPR}
            approvePR={approvePR}
            deletePR={deletePR}
            goTo={goTo}
          />
        )}

        {/* ============================== TRANSFER ============================ */}
        {activeMenu === 'transfer' && (
          <OwnerTransferTab
            readyTransfer={readyTransfer}
            transferred={transferred}
            kasKeluar={kasKeluar}
            bankAccounts={bankAccounts}
            goTo={goTo}
            setPrDetailId={setPrDetailId}
            setTransferModal={setTransferModal}
            deletePR={deletePR}
            setProofView={setProofView}
            copyText={copyText}
            toast={toast}
          />
        )}

        {/* ========================= RIWAYAT PENGAJUAN ======================== */}
        {activeMenu === 'riwayat_pengajuan' && (
          <OwnerRequestHistoryTab
            paymentRequests={paymentRequests}
            filteredPr={filteredPr}
            prSearch={prSearch}
            setPrSearch={setPrSearch}
            prFilter={prFilter}
            setPrFilter={setPrFilter}
            prCounts={prCounts}
            setPrDetailId={setPrDetailId}
            deletePR={deletePR}
            toast={toast}
          />
        )}

        {/* ============================== PESANAN ============================= */}
        {activeMenu === 'pesanan' && (
          <OwnerOrdersTab
            orders={orders}
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            filteredOrders={filteredOrders}
            listSearch={listSearch}
            setListSearch={setListSearch}
            listBrand={listBrand}
            setListBrand={setListBrand}
            brandOptions={brandOptions}
            orderPag={orderPag}
            setDetailInvoice={setDetailInvoice}
            openWA={openWA}
            orderOutstanding={orderOutstanding}
          />
        )}

        {/* ============================== PIUTANG ============================= */}
        {activeMenu === 'piutang' && (
          <OwnerReceivablesTab
            agingRows={agingRows}
            piutang={piutang}
            agingSearch={agingSearch}
            setAgingSearch={setAgingSearch}
            setDetailInvoice={setDetailInvoice}
            openWA={openWA}
          />
        )}

        {/* =============================== REKAP ============================== */}
        {activeMenu === 'rekap' && (
          <OwnerRevenueRecapTab
            validOrders={validOrders}
            omzet={omzet}
            piutang={piutang}
            rekapTab={rekapTab}
            setRekapTab={setRekapTab}
            rekapGroups={rekapGroups}
            exportRekap={exportRekap}
          />
        )}

        {activeMenu === 'rekap_fee' && (
          <FeeRecapPanel
            orders={orders}
            brands={brands}
            title="Rekap Fee Mitra & Diskon Pabrik"
            subtitle="Pemantauan fee mitra per level, diskon brand dari pabrik, dan fee perusahaan yang menjadi pendapatan Owner."
          />
        )}

        {/* ================================ TIM =============================== */}
        {activeMenu === 'tim' && (
          <OwnerTeamTab
            team={team}
            mitra={mitra}
            teamTab={teamTab}
            setTeamTab={setTeamTab}
            setTeamModal={setTeamModal}
            toggleTeam={toggleTeam}
            deleteTeam={deleteTeam}
            toggleMitra={toggleMitra}
            deleteMitra={deleteMitra}
            mitraSearch={mitraSearch}
            setMitraSearch={setMitraSearch}
            me={me}
            roleTone={OWNER_ROLE_TONE}
          />
        )}

        {/* ============================== KINERJA ============================= */}
        {activeMenu === 'kinerja' && (
          <OwnerPerformanceTab
            teamPerf={teamPerf}
            roleTone={OWNER_ROLE_TONE}
          />
        )}

        {/* ============================== BUKU KAS ============================ */}
        {activeMenu === 'buku_kas' && (
          <OwnerLedgerTab
            kasMasuk={kasMasuk}
            kasKeluar={kasKeluar}
            ledgerRows={ledgerRows}
            ledgerType={ledgerType}
            setLedgerType={setLedgerType}
            ledgerTypes={ledgerTypes}
            deleteLedgerRow={deleteLedgerRow}
            exportLedger={exportLedger}
          />
        )}

        {/* =============================== AUDIT ============================== */}
        {activeMenu === 'audit' && (
          <OwnerAuditTrailTab
            filteredAudit={filteredAudit}
            handleClearAuditLogs={handleClearAuditLogs}
            auditSearch={auditSearch}
            setAuditSearch={setAuditSearch}
            auditType={auditType}
            setAuditType={setAuditType}
            auditTypes={auditTypes}
            deleteAuditLog={deleteAuditLog}
          />
        )}

        {/* ============================ EKSPOR LAPORAN ====================== */}
        {activeMenu === 'ekspor_laporan' && (
          <ExportReportPanel sections={exportSections} fileName="laporan_owner" />
        )}

        {/* ============================= PENGATURAN AKUN ============================= */}
        {activeMenu === 'pengaturan_akun' && (
          <AccountSettingsPanel
            currentUser={me}
            onUpdateUser={onUpdateUser}
            onUpdateAvatar={onUpdateAvatar}
            toast={toast}
            role="owner"
          />
        )}
      </DashboardShell>

      {/* ========================== PR DETAIL MODAL ========================= */}
      {prDetail && (
        <Modal
          title={
            <span className="flex items-center gap-2">
              {prDetail.code}
              <Badge tone={preqTone(prDetail.status)}>{prDetail.status}</Badge>
            </span>
          }
          subtitle={`${prDetail.purpose} · ${rp(prDetail.amount)}`}
          onClose={() => setPrDetailId(null)}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setPrDetailId(null)}>
                Tutup
              </Button>
              {prDetail.status === PREQ.APPROVAL_OWNER && (
                <>
                  <Button variant="dangerOutline" icon="x" onClick={() => rejectPR(prDetail)}>
                    Tolak
                  </Button>
                  <Button variant="gold" icon="check" onClick={() => approvePR(prDetail)}>
                    Setujui Pengajuan
                  </Button>
                </>
              )}
              {prDetail.status === PREQ.APPROVED && (
                <Button
                  variant="gold"
                  icon="wallet"
                  onClick={() => {
                    setTransferModal({ req: prDetail, form: { note: '', ref: '', proof: '', proofFile: null } });
                    setPrDetailId(null);
                  }}
                >
                  Tandai Transfer
                </Button>
              )}
              <Button
                variant="dangerOutline"
                icon="trash"
                onClick={() => deletePR(prDetail)}
              >
                Hapus Pengajuan
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-3.5">
              <Stepper steps={prSteps(prDetail)} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Informasi Pengajuan
                </p>
                <dl className="text-[11px] space-y-1.5">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Nominal</dt>
                    <dd className="font-bold text-gray-900">{rp(prDetail.amount)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Diajukan</dt>
                    <dd className="font-medium text-gray-800">
                      {prDetail.createdBy} · {fmtDate(prDetail.createdAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Referensi</dt>
                    <dd className="font-medium text-gray-800">{prDetail.ref || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-400">Tujuan</dt>
                    <dd className="font-medium text-gray-800 text-right max-w-[60%]">{prDetail.purpose}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Rekening Tujuan
                </p>
                <p className="text-xs font-bold text-gray-900">{prDetail.bank}</p>
                <p className="text-[11px] text-gray-700 mt-0.5">{prDetail.accountNo}</p>
                <p className="text-[10px] text-gray-400">a.n {prDetail.holder}</p>
                <Button
                  size="xs"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    copyText(`${prDetail.bank} ${prDetail.accountNo} a.n ${prDetail.holder}`);
                    toast('Rekening tujuan disalin.');
                  }}
                >
                  Salin rekening
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-3.5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Catatan Finance</p>
              <p className="text-[11px] text-gray-600 leading-relaxed">{prDetail.note || '—'}</p>

              {prDetail.marketing && (
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Review Purchasing
                  </p>
                  <p className="text-[11px] text-gray-700 mt-0.5">
                    {prDetail.marketing.by} · {fmtDate(prDetail.marketing.at)} ·{' '}
                    <Badge tone={prDetail.marketing.decision === 'ACC' ? 'emerald' : 'red'}>
                      {prDetail.marketing.decision}
                    </Badge>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{prDetail.marketing.note || '—'}</p>
                </div>
              )}

              {prDetail.owner && (
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Keputusan Owner
                  </p>
                  <p className="text-[11px] text-gray-700 mt-0.5">
                    {prDetail.owner.by} · {fmtDate(prDetail.owner.at)} ·{' '}
                    <Badge tone={prDetail.owner.decision === 'ACC' ? 'emerald' : 'red'}>
                      {prDetail.owner.decision}
                    </Badge>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{prDetail.owner.note || '—'}</p>
                </div>
              )}

              {prDetail.transfer && (
                <div className="border-t border-gray-100 pt-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                      Transfer
                    </p>
                    <p className="text-[11px] text-gray-700 mt-0.5">
                      {prDetail.transfer.by} · {fmtDate(prDetail.transfer.at)}
                    </p>
                    <p className="text-[11px] text-gray-500">{prDetail.transfer.note || '—'}</p>
                  </div>
                  <ProofThumb
                    src={prDetail.transfer.proof}
                    onClick={() =>
                      setProofView({
                        src: prDetail.transfer.proof,
                        title: `Bukti transfer ${prDetail.code}`
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================= TRANSFER MODAL =========================== */}
      {transferModal && (
        <Modal
          title="Tandai Transfer"
          subtitle={`${transferModal.req.code} · ${rp(transferModal.req.amount)}`}
          onClose={() => setTransferModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setTransferModal(null)}>
                Batal
              </Button>
              <Button
                variant="gold"
                icon="check"
                onClick={saveTransfer}
                disabled={!transferModal.form.proof}
              >
                Simpan Transfer
              </Button>
            </>
          }
        >
          <form onSubmit={saveTransfer} className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
              <p className="text-[11px] font-bold text-amber-900">{transferModal.req.purpose}</p>
              <p className="text-[10px] text-amber-800 mt-0.5">
                {transferModal.req.bank} · {transferModal.req.accountNo} a.n {transferModal.req.holder}
              </p>
              <p className="text-sm font-bold text-amber-900 mt-1.5">{rp(transferModal.req.amount)}</p>
            </div>

            <Field label="Bukti transfer" required hint="Unggah tangkapan layar / foto bukti transfer (maks 2 MB)">
              {transferModal.form.proof ? (
                <div className="flex items-center gap-3 mt-1">
                  <span className="w-24 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={transferModal.form.proof}
                      alt="Bukti transfer"
                      className="w-full h-full object-cover"
                    />
                  </span>
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-emerald-700 font-semibold">Bukti siap disimpan.</p>
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        icon="eye"
                        onClick={() =>
                          setProofView({
                            src: transferModal.form.proof,
                            title: `Bukti transfer ${transferModal.req.code}`
                          })
                        }
                      >
                        Lihat
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        icon="x"
                        onClick={() =>
                          setTransferModal((prev) => ({
                            ...prev,
                            form: { ...prev.form, proof: '', proofFile: null }
                          }))
                        }
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(e) => handleTransferProof(e.target.files?.[0])}
                    className="block w-full text-[11px] text-gray-500 file:mr-2 file:px-3 file:py-2 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-gray-900 file:text-white hover:file:bg-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setTransferModal((prev) => ({
                        ...prev,
                        form: { ...prev.form, proof: '', proofFile: null }
                      }))
                    }
                    className="mt-2 text-[10px] font-semibold text-gray-500 hover:underline"
                  >
                    Batal pilih berkas
                  </button>
                </div>
              )}
            </Field>

            <Field label="No. referensi / ID transaksi">
              <Input
                value={transferModal.form.ref}
                onChange={(e) =>
                  setTransferModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, ref: e.target.value }
                  }))
                }
                placeholder="Contoh: TRX-BSI-88231"
              />
            </Field>

            <Field label="Catatan transfer">
              <Textarea
                rows={2}
                value={transferModal.form.note}
                onChange={(e) =>
                  setTransferModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, note: e.target.value }
                  }))
                }
                placeholder="Contoh: Transfer via BSI mobile, biaya admin ditanggung pengirim."
              />
            </Field>

            <p className="text-[10px] text-gray-400">
              Setelah disimpan, pengajuan berstatus <b>Ditransfer</b> dan tercatat sebagai kas keluar.
            </p>
          </form>
        </Modal>
      )}

      {/* =========================== TEAM MODAL ============================ */}
      {teamModal && (
        <Modal
          title={teamModal.mode === 'edit' ? 'Edit Akun Tim' : 'Akun Tim Baru'}
          subtitle={teamModal.mode === 'edit' ? 'Perbarui profil dan peran akses pengguna' : 'Akun admin baru untuk membantu operasional PO'}
          onClose={() => setTeamModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setTeamModal(null)}>
                Batal
              </Button>
              <Button variant="gold" icon={teamModal.mode === 'edit' ? 'check' : 'plus'} onClick={saveTeam}>
                {teamModal.mode === 'edit' ? 'Simpan Perubahan' : 'Buat Akun'}
              </Button>
            </>
          }
        >
          <form onSubmit={saveTeam} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nama lengkap" required>
                <Input
                  value={teamModal.form.name || ''}
                  onChange={(e) =>
                    setTeamModal({ ...teamModal, form: { ...teamModal.form, name: e.target.value } })
                  }
                  placeholder="Contoh: Nadia Finance"
                />
              </Field>
              <Field label="Email" required>
                <Input
                  type="email"
                  value={teamModal.form.email || ''}
                  onChange={(e) =>
                    setTeamModal({ ...teamModal, form: { ...teamModal.form, email: e.target.value } })
                  }
                  placeholder="nama@afathar.id"
                />
              </Field>
              <Field label="Peran">
                <Select
                  value={teamModal.form.role || 'finance'}
                  onChange={(e) =>
                    setTeamModal({ ...teamModal, form: { ...teamModal.form, role: e.target.value } })
                  }
                >
                  <option value="finance">Admin Finance</option>
                  <option value="marketing">Admin Purchasing</option>
                  <option value="owner">Owner</option>
                </Select>
              </Field>
              <Field label="Nomor WhatsApp">
                <Input
                  value={teamModal.form.phone || ''}
                  onChange={(e) =>
                    setTeamModal({ ...teamModal, form: { ...teamModal.form, phone: e.target.value } })
                  }
                  placeholder="08xxxxxxxxxx"
                />
              </Field>
            </div>
            {teamModal.mode === 'edit' && (
              <>
                <Field label="Reset Password (Opsional)" hint="Kosongkan bila tidak ingin mengubah password. Minimal 6 karakter.">
                  <Input
                    type="password"
                    placeholder="Password baru tim"
                    value={teamModal.form.password || ''}
                    onChange={(e) =>
                      setTeamModal({ ...teamModal, form: { ...teamModal.form, password: e.target.value } })
                    }
                  />
                </Field>
                <Switch
                  checked={!!teamModal.form.active}
                  label="Akun tim aktif"
                  onChange={(next) =>
                    setTeamModal({ ...teamModal, form: { ...teamModal.form, active: next } })
                  }
                />
              </>
            )}
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5">
              <p className="text-[10px] text-sky-800 leading-relaxed">
                Password sementara akan dibuat otomatis dan hanya ditampilkan satu kali setelah akun
                disimpan.
              </p>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================== CREDENTIAL MODAL ========================= */}
      {credential && (
        <Modal
          title={credential.title}
          subtitle="Simpan kredensial ini sebelum menutup jendela"
          onClose={() => setCredential(null)}
          footer={<Button variant="gold" onClick={() => setCredential(null)}>Selesai</Button>}
        >
          <div className="space-y-2.5">
            {[
              ['Nama', credential.name],
              ['Email', credential.email],
              ['Password sementara', credential.password]
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-50 rounded-xl border border-gray-200 px-3.5 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs font-semibold text-gray-900 break-all">{value}</p>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      copyText(value);
                      toast(`${label} disalin.`);
                    }}
                  >
                    Salin
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-rose-600 leading-relaxed">{credential.note}</p>
          </div>
        </Modal>
      )}

      {/* =========================== ORDER DRAWER ========================== */}
      {detailInvoice && (
        <OrderDrawer
          order={detailInvoice}
          onClose={() => setDetailInvoice(null)}
          onProof={(src) => setProofView({ src, title: `Bukti pembayaran ${detailInvoice.invoice}` })}
          printInvoice={onPrintInvoice}
          actions={
            <>
              <Button variant="outline" icon="chat" onClick={() => openWA(detailInvoice, 'ringkasan')}>
                WhatsApp Mitra
              </Button>
              <Button variant="gold" onClick={() => setDetailInvoice(null)}>
                Tutup
              </Button>
            </>
          }
        />
      )}

      {proofView && (
        <ProofModal src={proofView.src} title={proofView.title} onClose={() => setProofView(null)} />
      )}

      {reasonModal && <ReasonModal {...reasonModal} onClose={() => setReasonModal(null)} />}

      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}

      <Toast toast={toastData} onClose={closeToast} />
    </>
  );
}
