import React, { useEffect, useMemo, useState } from 'react';
import api, { mediaUrl } from '../../services/api';
import { dbId } from '../../services/adapters';
import AccountSettingsPanel from './AccountSettingsPanel';
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
} from './poCore';

const DEFAULT_USER = { id: 'u-owner', name: 'Heny Owner', role: 'owner', email: 'owner@afatharshop.com' };

const OWNER_ROLE_TONE = { owner: 'amber', finance: 'emerald', marketing: 'red' };

export default function OwnerFinanceDashboard({
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
    api.management
      .activityLogs()
      .then((res) => {
        if (!cancelled && Array.isArray(res?.data) && res.data.length > 0) {
          setRemoteAuditLogs(res.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
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
          { id: 'tim', label: 'Tim & Akses', title: 'Manajemen Tim & Hak Akses', icon: 'users' },
          { id: 'kinerja', label: 'Kinerja Tim', title: 'Kinerja Tim Admin', icon: 'spark' }
        ]
      },
      {
        group: 'keuangan',
        label: 'Keuangan & Audit',
        children: [
          { id: 'buku_kas', label: 'Buku Kas', title: 'Buku Kas Perusahaan', icon: 'card' },
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

  const exportOrders = () => {
    downloadCSV(`laporan_pesanan_owner_${todayISO()}.csv`, [
      ['Invoice', 'Tanggal', 'Mitra', 'Level', 'Brand', 'Produk', 'Qty', 'Nilai', 'Dibayar', 'Sisa', 'Tahap', 'Resi'],
      ...orders.map((o) => [
        o.invoice,
        o.date,
        o.mitraName,
        o.level,
        o.brand,
        o.produk,
        o.qty,
        o.subtotal,
        orderPaid(o),
        orderOutstanding(o),
        stageMeta(orderStage(o)).label,
        o.resi || ''
      ])
    ]);
    toast('Laporan pesanan diunduh.');
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
        portalSub="AfatharShop · Kontrol & Persetujuan"
        currentUser={me}
        onLogout={onLogout}
        onNavigateStore={onNavigateStore}
        notifications={notifications}
        darkSidebar
        headerRight={
          <Button variant="gold" icon="download" onClick={exportOrders}>
            Ekspor Laporan
          </Button>
        }
      >
        {/* ============================= DASHBOARD ============================= */}
        {activeMenu === 'dashboard' && (
          <>
            <PageHead
              title="Ringkasan Eksekutif"
              desc="Pantau omzet, arus kas, persetujuan dana, dan kesehatan operasional PO dalam satu tampilan."
              badge={<Badge tone="amber">{roleLabel('owner')}</Badge>}
              actions={
                <>
                  <Button variant="outline" icon="eye" onClick={() => goTo('audit')}>
                    Audit Trail
                  </Button>
                  <Button variant="gold" icon="wallet" onClick={() => goTo('persetujuan')}>
                    Persetujuan Dana
                  </Button>
                </>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard
                label="Omzet PO"
                value={rp(omzet)}
                sub={`${validOrders.length} pesanan valid`}
                tone="emerald"
                icon="wallet"
                hint={`DP terkumpul ${rp(dpCollected)}`}
              />
              <MetricCard
                label="Arus Kas Bersih"
                value={rp(kasMasuk - kasKeluar)}
                sub={`Masuk ${rp(kasMasuk)} · Keluar ${rp(kasKeluar)}`}
                tone={kasMasuk - kasKeluar >= 0 ? 'blue' : 'red'}
                icon="card"
                onClick={() => goTo('buku_kas')}
              />
              <MetricCard
                label="Menunggu Approval"
                value={approvals.length}
                sub={rp(pendingOwnerValue)}
                tone="amber"
                icon="shield"
                badge={approvals.length > 0 ? <Badge tone="amber">Butuh keputusan</Badge> : null}
                onClick={() => goTo('persetujuan')}
              />
              <MetricCard
                label="Piutang Mitra"
                value={rp(piutang)}
                sub={`${activeOrders.length} pesanan aktif`}
                tone="red"
                icon="receipt"
                onClick={() => goTo('piutang')}
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card
                title="Menunggu Persetujuan Anda"
                subtitle="Pengajuan dana yang sudah lolos review purchasing"
                action={<Badge tone="amber">{approvals.length}</Badge>}
              >
                <div className="divide-y divide-gray-100">
                  {approvals.slice(0, 5).map((r) => (
                    <div key={r.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-gray-900">
                            {r.code} <span className="font-normal text-gray-500">· {r.purpose}</span>
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {rp(r.amount)} · diajukan {r.createdBy} · {r.bank}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="xs"
                            variant="dangerOutline"
                            onClick={() =>
                              setReasonModal({
                                title: 'Tolak pengajuan',
                                subtitle: `${r.code} · ${rp(r.amount)}`,
                                label: 'Alasan penolakan',
                                confirmLabel: 'Tolak',
                                danger: true,
                                onSubmit: (note) => {
                                  decidePR(r, 'TOLAK', note);
                                  setReasonModal(null);
                                }
                              })
                            }
                          >
                            Tolak
                          </Button>
                          <Button size="xs" variant="gold" onClick={() => approvePR(r)}>
                            Setujui
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {approvals.length === 0 && (
                    <p className="px-4 py-8 text-center text-[11px] text-gray-400">
                      Tidak ada pengajuan yang menunggu persetujuan.
                    </p>
                  )}
                </div>
              </Card>

              <Card
                title="Siap Ditransfer"
                subtitle="Pengajuan yang sudah disetujui, menunggu bukti transfer"
                action={<Badge tone="blue">{readyTransfer.length}</Badge>}
              >
                <div className="divide-y divide-gray-100">
                  {readyTransfer.slice(0, 5).map((r) => (
                    <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-900">
                          {r.code} <span className="font-normal text-gray-500">· {r.purpose}</span>
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {rp(r.amount)} · {r.bank} {r.accountNo} a.n {r.holder}
                        </p>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setTransferModal({ req: r, form: { note: '', ref: '', proof: '', proofFile: null } })}
                      >
                        Tandai Transfer
                      </Button>
                    </div>
                  ))}
                  {readyTransfer.length === 0 && (
                    <p className="px-4 py-8 text-center text-[11px] text-gray-400">
                      Tidak ada dana yang siap ditransfer.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card title="Pipeline Pesanan" subtitle="Posisi seluruh pesanan" className="lg:col-span-2">
                <div className="p-4 grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                  {['baru', 'dp', 'produksi', 'alamat', 'ongkir', 'pelunasan', 'ongkir_bayar', 'kirim', 'dikirim', 'selesai'].map((id) => {
                    const count = stageCounts[id] || 0;
                    const meta = stageMeta(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setStageFilter(id);
                          goTo('pesanan');
                        }}
                        className="w-full flex items-center gap-2 group"
                      >
                        <span className="text-[10px] text-gray-500 w-24 text-left shrink-0">{meta.label}</span>
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
                        <span className="text-[10px] font-bold text-gray-700 w-6 text-right">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card title="Kinerja Brand" subtitle="Kontribusi omzet terbesar">
                <div className="divide-y divide-gray-100">
                  {brandPerf.slice(0, 5).map((b) => (
                    <div key={b.key} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-gray-900">{b.key}</p>
                        <p className="text-[11px] font-bold text-gray-900">{rp(b.nilai)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-[10px] text-gray-400">
                          {b.invoices} invoice · {b.qty} pcs
                        </p>
                        <p className="text-[10px] text-rose-500">Piutang {rp(b.outstanding)}</p>
                      </div>
                    </div>
                  ))}
                  {brandPerf.length === 0 && (
                    <p className="px-4 py-6 text-center text-[11px] text-gray-400">Belum ada data omzet.</p>
                  )}
                </div>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card
                title="Aktivitas Terbaru"
                subtitle="Jejak audit lintas modul"
                action={
                  <button type="button" onClick={() => goTo('audit')} className={`text-[10px] font-bold ${accent.text} hover:underline`}>
                    Lihat semua
                  </button>
                }
              >
                <div className="divide-y divide-gray-100">
                  {auditEvents.slice(0, 6).map((e, i) => (
                    <div key={`${e.ref}-${e.type}-${i}`} className="px-4 py-2.5 flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon name="eye" className="w-3 h-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-gray-900">
                          {e.type} <span className="font-normal text-gray-400">· {e.ref}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {e.actor} · {fmtDate(e.date)} · {e.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card
                title="Piutang Jatuh Tempo"
                subtitle="Fokus penagihan mitra"
                action={<Badge tone="red">{agingRows.filter((o) => o.late > 0).length} terlambat</Badge>}
              >
                <div className="divide-y divide-gray-100">
                  {agingRows.slice(0, 5).map((o) => (
                    <div key={o.invoice} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-gray-900">
                          {o.invoice} <span className="font-normal text-gray-500">· {o.mitraName}</span>
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Jatuh tempo {fmtDate(o.due)} {o.late > 0 ? `· terlambat ${o.late} hari` : ''}
                        </p>
                      </div>
                      <p className="text-[11px] font-bold text-rose-600 shrink-0">{rp(o.outstanding)}</p>
                    </div>
                  ))}
                  {agingRows.length === 0 && (
                    <p className="px-4 py-8 text-center text-[11px] text-gray-400">Semua tagihan lancar.</p>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* ============================ PERSETUJUAN =========================== */}
        {activeMenu === 'persetujuan' && (
          <>
            <PageHead
              title="Persetujuan Pengajuan Pembayaran"
              desc="Pengajuan dana dari Finance yang sudah lolos review Purchasing dan menunggu keputusan Anda."
              badge={<Badge tone="amber">{approvals.length} menunggu</Badge>}
              actions={
                <Button variant="outline" icon="file" onClick={() => goTo('riwayat_pengajuan')}>
                  Riwayat Pengajuan
                </Button>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard
                label="Menunggu Approval"
                value={approvals.length}
                sub="pengajuan"
                tone="amber"
                icon="shield"
              />
              <MetricCard
                label="Nilai Menunggu"
                value={rp(pendingOwnerValue)}
                sub="total dana tertahan"
                tone="orange"
                icon="wallet"
              />
              <MetricCard
                label="Siap Transfer"
                value={readyTransfer.length}
                sub={rp(sumBy(readyTransfer, (r) => r.amount))}
                tone="blue"
                icon="card"
                onClick={() => goTo('transfer')}
              />
              <MetricCard
                label="Sudah Ditransfer"
                value={transferred.length}
                sub={rp(kasKeluar)}
                tone="emerald"
                icon="check"
              />
            </div>

            <Card
              title="Daftar Pengajuan"
              subtitle="Diurutkan dari yang paling lama diajukan"
              action={<SearchBox value={prSearch} onChange={setPrSearch} placeholder="Cari kode / tujuan..." />}
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Kode</th>
                    <th className={TH}>Tujuan</th>
                    <th className={`${TH} text-right`}>Nominal</th>
                    <th className={TH}>Review Purchasing</th>
                    <th className={TH}>Rekening Tujuan</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {approvalFiltered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/70">
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => setPrDetailId(r.id)}
                          className="font-bold text-sky-700 hover:underline"
                        >
                          {r.code}
                        </button>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Diajukan {fmtDate(r.createdAt)}
                        </p>
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-gray-900">{r.purpose}</p>
                        <p className="text-[10px] text-gray-400">
                          Ref: {r.ref || '—'} · {r.createdBy}
                        </p>
                      </td>
                      <td className={`${TD} text-right`}>
                        <p className="font-bold text-gray-900">{rp(r.amount)}</p>
                        <Badge tone={preqTone(r.status)}>{r.status}</Badge>
                      </td>
                      <td className={TD}>
                        {r.marketing ? (
                          <>
                            <p className="font-medium text-emerald-700">✓ {r.marketing.by}</p>
                            <p className="text-[10px] text-gray-400">{fmtDate(r.marketing.at)}</p>
                            {r.marketing.note && (
                              <p className="text-[10px] text-gray-500 max-w-[180px] leading-snug">
                                {r.marketing.note}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-gray-800">{r.bank}</p>
                        <p className="text-[10px] text-gray-400">
                          {r.accountNo} · {r.holder}
                        </p>
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button size="xs" variant="outline" onClick={() => setPrDetailId(r.id)}>
                            Detail
                          </Button>
                          <Button size="xs" variant="dangerOutline" onClick={() => rejectPR(r)}>
                            Tolak
                          </Button>
                          <Button size="xs" variant="gold" onClick={() => approvePR(r)}>
                            Setujui
                          </Button>
                          <Button size="xs" variant="dangerOutline" icon="trash" onClick={() => deletePR(r)} title="Hapus Pengajuan">
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {approvalFiltered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                        Tidak ada pengajuan yang menunggu persetujuan Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </TableWrap>
            </Card>
          </>
        )}

        {/* ============================== TRANSFER ============================ */}
        {activeMenu === 'transfer' && (
          <>
            <PageHead
              title="Transfer Dana"
              desc="Tandai pengajuan yang sudah Anda transfer beserta bukti transfernya agar Finance dapat mencatat kas keluar."
              badge={<Badge tone="blue">{readyTransfer.length} siap transfer</Badge>}
              actions={
                <Button variant="outline" icon="file" onClick={() => goTo('riwayat_pengajuan')}>
                  Riwayat Pengajuan
                </Button>
              }
            />

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <MetricCard
                label="Antrian Transfer"
                value={readyTransfer.length}
                sub="pengajuan disetujui"
                tone="blue"
                icon="wallet"
              />
              <MetricCard
                label="Nominal Antrian"
                value={rp(sumBy(readyTransfer, (r) => r.amount))}
                sub="belum ditransfer"
                tone="orange"
                icon="card"
              />
              <MetricCard
                label="Total Ditransfer"
                value={rp(kasKeluar)}
                sub={`${transferred.length} pengajuan selesai`}
                tone="emerald"
                icon="check"
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card
                title="Daftar Siap Transfer"
                subtitle="Klik tandai transfer setelah dana dikirim"
                className="lg:col-span-2"
              >
                <TableWrap>
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className={TH}>Kode</th>
                      <th className={TH}>Tujuan</th>
                      <th className={TH}>Rekening</th>
                      <th className={`${TH} text-right`}>Nominal</th>
                      <th className={`${TH} text-right`}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {readyTransfer.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/70">
                        <td className={TD}>
                          <button
                            type="button"
                            onClick={() => setPrDetailId(r.id)}
                            className="font-bold text-sky-700 hover:underline"
                          >
                            {r.code}
                          </button>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Disetujui {r.owner ? fmtDate(r.owner.at) : '—'}
                          </p>
                        </td>
                        <td className={TD}>
                          <p className="font-semibold text-gray-900">{r.purpose}</p>
                          <p className="text-[10px] text-gray-400">Ref: {r.ref || '—'}</p>
                        </td>
                        <td className={TD}>
                          <p className="font-semibold text-gray-800">{r.bank}</p>
                          <p className="text-[10px] text-gray-400">
                            {r.accountNo} a.n {r.holder}
                          </p>
                        </td>
                        <td className={`${TD} text-right font-bold text-gray-900`}>{rp(r.amount)}</td>
                        <td className={`${TD} text-right`}>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Button
                              size="xs"
                              variant="gold"
                              icon="wallet"
                              onClick={() =>
                                setTransferModal({ req: r, form: { note: '', ref: '', proof: '', proofFile: null } })
                              }
                            >
                              Tandai Transfer
                            </Button>
                            <Button
                              size="xs"
                              variant="dangerOutline"
                              icon="trash"
                              onClick={() => deletePR(r)}
                              title="Hapus Pengajuan"
                            >
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {readyTransfer.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-xs text-gray-400">
                          Tidak ada dana yang menunggu ditransfer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </TableWrap>
              </Card>

              <Card title="Rekening Vendor Terdaftar" subtitle="Rekening tujuan transfer vendor & operasional">
                <div className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto">
                  {bankAccounts
                    .filter((b) => b.type === 'pengajuan' && b.active)
                    .map((b) => (
                      <div key={b.id} className="px-4 py-3 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-bold text-gray-900">
                            {b.bank} · <span className="text-gray-500 font-normal">{b.purpose || 'Vendor'}</span>
                          </p>
                          <p className="text-[10px] text-gray-700 font-mono mt-0.5">{b.accountNo}</p>
                          <p className="text-[10px] text-gray-400">a.n {b.holder}</p>
                        </div>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            copyText(b.accountNo);
                            toast(`Nomor rekening ${b.bank} disalin.`);
                          }}
                        >
                          Salin
                        </Button>
                      </div>
                    ))}
                  {bankAccounts.filter((b) => b.type === 'pengajuan' && b.active).length === 0 && (
                    <p className="px-4 py-8 text-center text-[11px] text-gray-400">
                      Belum ada rekening vendor aktif.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            <Card title="Riwayat Transfer" subtitle="Pengajuan yang sudah dibayarkan">
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Kode</th>
                    <th className={TH}>Tujuan</th>
                    <th className={`${TH} text-right`}>Nominal</th>
                    <th className={TH}>Ditransfer</th>
                    <th className={TH}>Catatan</th>
                    <th className={TH}>Bukti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transferred
                    .slice()
                    .sort((a, b) => String(b.transfer?.at).localeCompare(String(a.transfer?.at)))
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/70">
                        <td className={TD}>
                          <button
                            type="button"
                            onClick={() => setPrDetailId(r.id)}
                            className="font-bold text-sky-700 hover:underline"
                          >
                            {r.code}
                          </button>
                        </td>
                        <td className={TD}>
                          <p className="font-semibold text-gray-900">{r.purpose}</p>
                          <p className="text-[10px] text-gray-400">{r.bank}</p>
                        </td>
                        <td className={`${TD} text-right font-bold text-gray-900`}>{rp(r.amount)}</td>
                        <td className={TD}>
                          <p className="font-medium text-gray-800">{r.transfer?.by || '—'}</p>
                          <p className="text-[10px] text-gray-400">
                            {r.transfer?.at ? fmtDate(r.transfer.at) : '—'}
                          </p>
                        </td>
                        <td className={TD}>
                          <p className="text-[11px] text-gray-600 max-w-[200px] leading-snug">
                            {r.transfer?.note || '—'}
                          </p>
                        </td>
                        <td className={TD}>
                          <ProofThumb
                            src={r.transfer?.proof}
                            onClick={() =>
                              setProofView({
                                src: r.transfer.proof,
                                title: `Bukti transfer ${r.code}`
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  {transferred.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                        Belum ada transfer yang tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </TableWrap>
            </Card>
          </>
        )}

        {/* ========================= RIWAYAT PENGAJUAN ======================== */}
        {activeMenu === 'riwayat_pengajuan' && (
          <>
            <PageHead
              title="Riwayat Pengajuan Dana"
              desc="Seluruh pengajuan pembayaran lintas status beserta jejak persetujuannya."
              badge={<Badge tone="gray">{paymentRequests.length} pengajuan</Badge>}
              actions={
                <Button
                  variant="outline"
                  icon="download"
                  onClick={() => {
                    downloadCSV(`riwayat_pengajuan_${todayISO()}.csv`, [
                      ['Kode', 'Tanggal', 'Tujuan', 'Nominal', 'Status', 'Diajukan', 'Review Purchasing', 'Approval Owner', 'Transfer'],
                      ...filteredPr.map((r) => [
                        r.code,
                        r.createdAt,
                        r.purpose,
                        r.amount,
                        r.status,
                        r.createdBy,
                        r.marketing ? `${r.marketing.by} (${r.marketing.decision})` : '',
                        r.owner ? `${r.owner.by} (${r.owner.decision})` : '',
                        r.transfer ? `${r.transfer.by} ${r.transfer.at}` : ''
                      ])
                    ]);
                    toast('Riwayat pengajuan diunduh.');
                  }}
                >
                  Ekspor
                </Button>
              }
            />

            <Card
              title="Semua Pengajuan"
              subtitle="Filter berdasarkan status alur approval"
              action={<SearchBox value={prSearch} onChange={setPrSearch} placeholder="Cari kode / tujuan..." />}
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <Segmented
                  value={prFilter}
                  onChange={setPrFilter}
                  options={[
                    { value: 'all', label: 'Semua', count: prCounts.all },
                    { value: PREQ.REVIEW_MKT, label: 'Review Purchasing', count: prCounts[PREQ.REVIEW_MKT] },
                    { value: PREQ.APPROVAL_OWNER, label: 'Approval Owner', count: prCounts[PREQ.APPROVAL_OWNER] },
                    { value: PREQ.APPROVED, label: 'Disetujui', count: prCounts[PREQ.APPROVED] },
                    { value: PREQ.TRANSFERRED, label: 'Ditransfer', count: prCounts[PREQ.TRANSFERRED] },
                    { value: PREQ.REJECTED, label: 'Ditolak', count: prCounts[PREQ.REJECTED] },
                    { value: PREQ.CANCELED, label: 'Dibatalkan', count: prCounts[PREQ.CANCELED] }
                  ]}
                />
              </div>
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Kode</th>
                    <th className={TH}>Tujuan</th>
                    <th className={`${TH} text-right`}>Nominal</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Alur Persetujuan</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPr.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/70">
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => setPrDetailId(r.id)}
                          className="font-bold text-sky-700 hover:underline"
                        >
                          {r.code}
                        </button>
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(r.createdAt)}</p>
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-gray-900">{r.purpose}</p>
                        <p className="text-[10px] text-gray-400">
                          {r.createdBy} · {r.bank}
                        </p>
                      </td>
                      <td className={`${TD} text-right font-bold text-gray-900`}>{rp(r.amount)}</td>
                      <td className={TD}>
                        <Badge tone={preqTone(r.status)}>{r.status}</Badge>
                      </td>
                      <td className={TD}>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              r.createdAt ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'
                            }`}
                          >
                            ✓
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              r.marketing?.decision === 'ACC'
                                ? 'bg-emerald-100 text-emerald-700'
                                : r.marketing?.decision === 'TOLAK'
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {r.marketing?.decision === 'TOLAK' ? '!' : r.marketing ? '✓' : '2'}
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              r.owner?.decision === 'ACC'
                                ? 'bg-emerald-100 text-emerald-700'
                                : r.owner?.decision === 'TOLAK'
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {r.owner?.decision === 'TOLAK' ? '!' : r.owner ? '✓' : '3'}
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              r.transfer ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {r.transfer ? '✓' : '4'}
                          </span>
                        </div>
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button size="xs" variant="outline" onClick={() => setPrDetailId(r.id)}>
                            Detail
                          </Button>
                          <Button
                            size="xs"
                            variant="dangerOutline"
                            icon="trash"
                            onClick={() => deletePR(r)}
                            title="Hapus Pengajuan"
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPr.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                        Tidak ada pengajuan pada filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </TableWrap>
            </Card>
          </>
        )}

        {/* ============================== PESANAN ============================= */}
        {activeMenu === 'pesanan' && (
          <>
            <PageHead
              title="Monitoring Seluruh Pesanan"
              desc="Pantau posisi setiap pesanan PO dari pengajuan mitra sampai diterima. Mode baca-saja untuk owner."
              badge={<Badge tone="gray">{orders.length} pesanan</Badge>}
              actions={
                <Button variant="outline" icon="download" onClick={exportOrders}>
                  Ekspor
                </Button>
              }
            />

            <StageTabs orders={orders} value={stageFilter} onChange={setStageFilter} />

            <Card
              title="Daftar Pesanan"
              subtitle={`${filteredOrders.length} pesanan sesuai filter`}
              action={
                <div className="flex items-center gap-2 flex-wrap">
                  <SearchBox value={listSearch} onChange={setListSearch} placeholder="Cari invoice / mitra..." />
                  <Select value={listBrand} onChange={(e) => setListBrand(e.target.value)} className="w-36">
                    <option value="all">Semua brand</option>
                    {brandOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>
                </div>
              }
            >
              <OrdersTable
                orders={orderPag.rows}
                onOpen={(o) => setDetailInvoice(o)}
                renderActions={(o) => (
                  <>
                    <Button size="xs" variant="outline" onClick={() => setDetailInvoice(o)}>
                      Detail
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      icon="chat"
                      onClick={() => openWA(o, orderOutstanding(o) > 0 ? 'pelunasan' : 'ringkasan')}
                    >
                      WA
                    </Button>
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

        {/* ============================== PIUTANG ============================= */}
        {activeMenu === 'piutang' && (
          <>
            <PageHead
              title="Piutang & Reminder Mitra"
              desc="Sisa tagihan mitra yang belum lunas beserta status jatuh temponya."
              badge={
                <Badge tone="red">
                  {agingRows.filter((o) => o.late > 0).length} terlambat
                </Badge>
              }
              actions={
                <Button variant="outline" icon="download" onClick={exportOrders}>
                  Ekspor
                </Button>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Total Piutang" value={rp(piutang)} sub={`${agingRows.length} invoice`} tone="red" icon="receipt" />
              <MetricCard
                label="Nilai Terlambat"
                value={rp(sumBy(agingRows.filter((o) => o.late > 0), (o) => o.outstanding))}
                sub={`${agingRows.filter((o) => o.late > 0).length} invoice`}
                tone="orange"
                icon="clock"
              />
              <MetricCard
                label="Belum Jatuh Tempo"
                value={rp(sumBy(agingRows.filter((o) => o.late === 0), (o) => o.outstanding))}
                sub={`${agingRows.filter((o) => o.late === 0).length} invoice`}
                tone="amber"
                icon="card"
              />
              <MetricCard
                label="Rata-rata Keterlambatan"
                value={`${Math.round(
                  agingRows.filter((o) => o.late > 0).reduce((n, o) => n + o.late, 0) /
                    Math.max(1, agingRows.filter((o) => o.late > 0).length)
                )} hari`}
                sub="dari invoice terlambat"
                tone="violet"
                icon="clock"
              />
            </div>

            <Card
              title="Daftar Piutang"
              subtitle="Klik WhatsApp untuk mengirim pengingat"
              action={<SearchBox value={agingSearch} onChange={setAgingSearch} placeholder="Cari invoice / mitra..." />}
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Invoice</th>
                    <th className={TH}>Mitra</th>
                    <th className={TH}>Jatuh Tempo</th>
                    <th className={TH}>Keterlambatan</th>
                    <th className={`${TH} text-right`}>Sisa Tagihan</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agingRows.map((o) => (
                    <tr key={o.invoice} className="hover:bg-gray-50/70">
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => setDetailInvoice(o)}
                          className="font-bold text-sky-700 hover:underline"
                        >
                          {o.invoice}
                        </button>
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(o.date)}</p>
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-gray-900">{o.mitraName}</p>
                        <p className="text-[10px] text-gray-400">
                          {o.level} · {o.produk}
                        </p>
                      </td>
                      <td className={TD}>
                        <p className="font-medium text-gray-800">{fmtDate(o.due)}</p>
                        <p className="text-[10px] text-gray-400">{o.brand}</p>
                      </td>
                      <td className={TD}>
                        {o.late > 0 ? (
                          <Badge tone="red">Terlambat {o.late} hari</Badge>
                        ) : (
                          <Badge tone="emerald">Belum jatuh tempo</Badge>
                        )}
                      </td>
                      <td className={`${TD} text-right font-bold text-rose-600`}>{rp(o.outstanding)}</td>
                      <td className={`${TD} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="xs" variant="outline" onClick={() => setDetailInvoice(o)}>
                            Detail
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            icon="chat"
                            onClick={() => openWA(o, 'pelunasan')}
                          >
                            Ingatkan
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {agingRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                        Semua tagihan mitra sudah lunas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </TableWrap>
            </Card>
          </>
        )}

        {/* =============================== REKAP ============================== */}
        {activeMenu === 'rekap' && (
          <>
            <PageHead
              title="Rekap Omzet PO"
              desc="Ringkasan penjualan berdasarkan brand, produk, atau mitra."
              badge={<Badge tone="emerald">{validOrders.length} pesanan valid</Badge>}
              actions={
                <Button variant="outline" icon="download" onClick={exportRekap}>
                  Ekspor Rekap
                </Button>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Total Nilai" value={rp(omzet)} sub={`${validOrders.length} invoice`} tone="emerald" icon="wallet" />
              <MetricCard label="Sudah Dibayar" value={rp(sumBy(validOrders, (o) => orderPaid(o)))} sub="seluruh tahap" tone="blue" icon="check" />
              <MetricCard label="Piutang" value={rp(piutang)} sub="belum dibayar" tone="red" icon="receipt" />
              <MetricCard
                label="Rata-rata Nilai"
                value={rp(Math.round(omzet / Math.max(1, validOrders.length)))}
                sub="per pesanan"
                tone="violet"
                icon="spark"
              />
            </div>

            <Card
              title="Rincian Rekap"
              subtitle="Pilih dimensi rekap yang ingin dilihat"
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
                      <td className={`${TD} font-semibold text-gray-900`}>{g.key}</td>
                      <td className={`${TD} text-right`}>{g.invoices}</td>
                      <td className={`${TD} text-right`}>{g.qty} pcs</td>
                      <td className={`${TD} text-right font-bold text-gray-900`}>{rp(g.nilai)}</td>
                      <td className={`${TD} text-right text-emerald-700`}>{rp(g.paid)}</td>
                      <td className={`${TD} text-right text-rose-600`}>{rp(g.outstanding)}</td>
                      <td className={TD}>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 max-w-[120px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <span
                              className="block h-full bg-amber-400 rounded-full"
                              style={{ width: `${Math.round((g.nilai / Math.max(1, omzet)) * 100)}%` }}
                            />
                          </span>
                          <span className="text-[10px] font-bold text-gray-600 w-8 text-right">
                            {Math.round((g.nilai / Math.max(1, omzet)) * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rekapGroups.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-xs text-gray-400">
                        Belum ada data pada rekap ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </TableWrap>
            </Card>
          </>
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
          <>
            <PageHead
              title="Manajemen Tim & Hak Akses"
              desc="Kelola akun admin Finance dan Purchasing yang membantu operasional PO."
              badge={<Badge tone="gray">{team.length} akun</Badge>}
              actions={
                <Button
                  variant="gold"
                  icon="plus"
                  onClick={() =>
                    setTeamModal({ form: { name: '', email: '', role: 'finance', phone: '' } })
                  }
                >
                  Akun Tim Baru
                </Button>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Total Akun" value={team.length} sub="seluruh peran" tone="gray" icon="users" />
              <MetricCard
                label="Aktif"
                value={team.filter((u) => u.active).length}
                sub="dapat login"
                tone="emerald"
                icon="check"
              />
              <MetricCard
                label="Admin Finance"
                value={team.filter((u) => u.role === 'finance').length}
                sub="verifikasi & kirim"
                tone="blue"
                icon="card"
              />
              <MetricCard
                label="Admin Purchasing"
                value={team.filter((u) => u.role === 'marketing').length}
                sub="ACC & katalog"
                tone="violet"
                icon="spark"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTeamTab('tim')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  teamTab === 'tim'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                Akun Tim Admin ({team.length})
              </button>
              <button
                type="button"
                onClick={() => setTeamTab('mitra')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  teamTab === 'mitra'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                Akun Mitra & Reseller ({mitra.length})
              </button>
            </div>

            {teamTab === 'tim' && (
              <Card title="Akun Tim" subtitle="Nonaktifkan atau hapus akun tim yang sudah tidak bertugas">
                <TableWrap>
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className={TH}>Nama</th>
                      <th className={TH}>Peran</th>
                      <th className={TH}>Kontak</th>
                      <th className={TH}>Dibuat</th>
                      <th className={TH}>Status</th>
                      <th className={`${TH} text-right`}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {team.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/70">
                        <td className={TD}>
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              {u.name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900">{u.name}</p>
                              <p className="text-[10px] text-gray-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className={TD}>
                          <Badge tone={OWNER_ROLE_TONE[u.role] || 'gray'}>{roleLabel(u.role)}</Badge>
                        </td>
                        <td className={TD}>
                          <p className="text-[11px] text-gray-700">{u.phone || '—'}</p>
                          <p className="text-[10px] text-gray-400">oleh {u.createdBy}</p>
                        </td>
                        <td className={TD}>{fmtDate(u.createdAt)}</td>
                        <td className={TD}>
                          <Badge tone={u.active ? 'emerald' : 'gray'} dot>
                            {u.active ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </td>
                        <td className={`${TD} text-right`}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setTeamModal({ mode: 'edit', id: u.id, form: { ...u, password: '' } })}
                            >
                              Edit
                            </Button>
                            <Switch checked={u.active} onChange={() => toggleTeam(u)} disabled={u.id === me.id} />
                            <Button
                              size="xs"
                              variant="danger"
                              disabled={u.id === me.id || u.role === 'owner'}
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
            )}

            {teamTab === 'mitra' && (() => {
              const filteredMitra = mitra.filter((m) => {
                if (!mitraSearch.trim()) return true;
                const q = mitraSearch.toLowerCase();
                return (
                  m.name?.toLowerCase().includes(q) ||
                  m.email?.toLowerCase().includes(q) ||
                  m.phone?.toLowerCase().includes(q) ||
                  m.city?.toLowerCase().includes(q)
                );
              });

              return (
                <Card
                  title="Akun Mitra & Reseller"
                  subtitle="Seluruh mitra pre-order yang terdaftar pada sistem"
                  action={
                    <SearchBox
                      value={mitraSearch}
                      onChange={setMitraSearch}
                      placeholder="Cari nama, email, kota..."
                    />
                  }
                >
                  <TableWrap>
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className={TH}>Mitra</th>
                        <th className={TH}>Level</th>
                        <th className={TH}>No. HP / WA</th>
                        <th className={TH}>Kota / Domisili</th>
                        <th className={`${TH} text-right`}>Saldo Deposit</th>
                        <th className={`${TH} text-right`}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredMitra.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50/70">
                          <td className={TD}>
                            <p className="font-semibold text-gray-900">{m.name}</p>
                            <p className="text-[10px] text-gray-400">{m.email || '—'}</p>
                          </td>
                          <td className={TD}>
                            <Badge tone={levelTone(m.level)}>{normalizeLevel(m.level)}</Badge>
                          </td>
                          <td className={TD}>{m.phone || '—'}</td>
                          <td className={TD}>{m.city || '—'}</td>
                          <td className={`${TD} text-right font-bold text-emerald-700`}>
                            {rp(m.depositBalance || m.balance || 0)}
                          </td>
                          <td className={`${TD} text-right`}>
                            <Button
                              size="xs"
                              variant="dangerOutline"
                              icon="trash"
                              onClick={() => deleteMitra(m)}
                              title="Hapus Akun Mitra"
                            >
                              Hapus Akun
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {filteredMitra.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                            Tidak ada akun mitra pada pencarian ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </TableWrap>
                </Card>
              );
            })()}
          </>
        )}

        {/* ============================== KINERJA ============================= */}
        {activeMenu === 'kinerja' && (
          <>
            <PageHead
              title="Kinerja Tim Admin"
              desc="Rekap kontribusi tiap admin berdasarkan aktivitas yang tercatat pada sistem."
              badge={<Badge tone="gray">{teamPerf.length} anggota</Badge>}
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard
                label="Total Aktivitas"
                value={sumBy(teamPerf, (u) => u.actions)}
                sub="seluruh tim"
                tone="violet"
                icon="spark"
              />
              <MetricCard
                label="ACC Purchasing"
                value={sumBy(teamPerf, (u) => u.marketingAcc)}
                sub="pesanan diproses"
                tone="emerald"
                icon="check"
              />
              <MetricCard
                label="Verifikasi Finance"
                value={sumBy(teamPerf, (u) => u.dpAcc + u.pelunasanAcc + u.ongkirAcc)}
                sub="DP · pelunasan · ongkir"
                tone="blue"
                icon="shield"
              />
              <MetricCard
                label="Pengajuan Direview"
                value={sumBy(teamPerf, (u) => u.prReviewed + u.prApproved)}
                sub="purchasing & owner"
                tone="amber"
                icon="file"
              />
            </div>

            <Card title="Rincian Kinerja" subtitle="Diurutkan dari aktivitas terbanyak">
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Nama</th>
                    <th className={TH}>Peran</th>
                    <th className={`${TH} text-right`}>ACC Pesanan</th>
                    <th className={`${TH} text-right`}>Verif DP</th>
                    <th className={`${TH} text-right`}>Verif Lunas</th>
                    <th className={`${TH} text-right`}>Verif Ongkir</th>
                    <th className={`${TH} text-right`}>Pesanan Dibuat</th>
                    <th className={`${TH} text-right`}>Pengajuan</th>
                    <th className={`${TH} text-right`}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teamPerf
                    .slice()
                    .sort((a, b) => b.actions - a.actions)
                    .map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/70">
                        <td className={TD}>
                          <p className="font-semibold text-gray-900">{u.name}</p>
                          <p className="text-[10px] text-gray-400">{u.email}</p>
                        </td>
                        <td className={TD}>
                          <Badge tone={OWNER_ROLE_TONE[u.role] || 'gray'}>{roleLabel(u.role)}</Badge>
                        </td>
                        <td className={`${TD} text-right`}>{u.marketingAcc}</td>
                        <td className={`${TD} text-right`}>{u.dpAcc}</td>
                        <td className={`${TD} text-right`}>{u.pelunasanAcc}</td>
                        <td className={`${TD} text-right`}>{u.ongkirAcc}</td>
                        <td className={`${TD} text-right`}>{u.ordersCreated}</td>
                        <td className={`${TD} text-right`}>
                          {u.prCreated + u.prReviewed + u.prApproved}
                        </td>
                        <td className={`${TD} text-right`}>
                          <Badge tone="violet">{u.actions}</Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </TableWrap>
            </Card>
          </>
        )}

        {/* ============================== BUKU KAS ============================ */}
        {activeMenu === 'buku_kas' && (
          <>
            <PageHead
              title="Buku Kas Perusahaan"
              desc="Arus kas masuk dari pembayaran mitra dan kas keluar dari transfer pengajuan."
              badge={<Badge tone="emerald">Net {rp(kasMasuk - kasKeluar)}</Badge>}
              actions={
                <Button variant="outline" icon="download" onClick={exportLedger}>
                  Ekspor
                </Button>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Kas Masuk" value={rp(kasMasuk)} sub="pembayaran terverifikasi" tone="emerald" icon="wallet" />
              <MetricCard label="Kas Keluar" value={rp(kasKeluar)} sub="transfer pengajuan" tone="red" icon="card" />
              <MetricCard
                label="Arus Kas Bersih"
                value={rp(kasMasuk - kasKeluar)}
                sub="masuk − keluar"
                tone={kasMasuk - kasKeluar >= 0 ? 'blue' : 'orange'}
                icon="check"
              />
              <MetricCard
                label="Transaksi"
                value={ledgerRows.length}
                sub="baris pada filter"
                tone="gray"
                icon="file"
              />
            </div>

            <Card
              title="Mutasi Kas"
              subtitle="Gabungan pembayaran masuk dan pengajuan keluar"
              action={
                <Select value={ledgerType} onChange={(e) => setLedgerType(e.target.value)} className="w-44">
                  <option value="all">Semua tipe</option>
                  {ledgerTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Pengajuan Owner">Pengajuan Owner</option>
                </Select>
              }
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Tanggal</th>
                    <th className={TH}>Tipe</th>
                    <th className={TH}>Referensi</th>
                    <th className={TH}>Keterangan</th>
                    <th className={`${TH} text-right`}>Nominal</th>
                    <th className={TH}>Bank</th>
                    <th className={TH}>Oleh</th>
                    <th className={TH}>Status</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ledgerRows.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/70">
                      <td className={TD}>{fmtDate(l.date)}</td>
                      <td className={TD}>
                        <Badge tone={l.direction === 'in' ? 'emerald' : 'red'}>{l.type}</Badge>
                      </td>
                      <td className={`${TD} font-semibold text-gray-800`}>{l.ref || '—'}</td>
                      <td className={TD}>
                        <p className="text-[11px] text-gray-700 max-w-[220px] leading-snug">
                          {l.mitraName || '—'}
                        </p>
                      </td>
                      <td
                        className={`${TD} text-right font-bold ${
                          l.direction === 'in' ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {l.direction === 'in' ? '+' : '−'} {rp(l.nominal)}
                      </td>
                      <td className={TD}>{l.bank || '—'}</td>
                      <td className={TD}>{l.by || '—'}</td>
                      <td className={TD}>
                        <Badge
                          tone={
                            l.status === PAY.ACC || l.status === 'Transfer'
                              ? 'emerald'
                              : l.status === PAY.MENUNGGU
                              ? 'amber'
                              : 'gray'
                          }
                        >
                          {l.status || '—'}
                        </Badge>
                      </td>
                      <td className={`${TD} text-right`}>
                        <Button
                          size="xs"
                          variant="dangerOutline"
                          icon="trash"
                          onClick={() => deleteLedgerRow(l)}
                          title="Hapus Transaksi Buku Kas"
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {ledgerRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-xs text-gray-400">
                        Tidak ada transaksi pada filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </TableWrap>
            </Card>
          </>
        )}

        {/* =============================== AUDIT ============================== */}
        {activeMenu === 'audit' && (
          <>
            <PageHead
              title="Jejak Audit Aktivitas"
              desc="Rekam jejak tindakan admin, mitra, dan owner lintas modul PO."
              badge={<Badge tone="gray">{filteredAudit.length} aktivitas</Badge>}
              actions={
                <Button
                  variant="dangerOutline"
                  icon="trash"
                  onClick={handleClearAuditLogs}
                >
                  Bersihkan Riwayat Log
                </Button>
              }
            />

            <Card
              title="Log Aktivitas"
              subtitle="Gunakan filter untuk menelusuri kejadian tertentu"
              action={
                <div className="flex items-center gap-2 flex-wrap">
                  <SearchBox value={auditSearch} onChange={setAuditSearch} placeholder="Cari aktor / referensi..." />
                  <Select value={auditType} onChange={(e) => setAuditType(e.target.value)} className="w-44">
                    <option value="all">Semua tipe</option>
                    {auditTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>
              }
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Tanggal</th>
                    <th className={TH}>Aktor</th>
                    <th className={TH}>Tipe</th>
                    <th className={TH}>Referensi</th>
                    <th className={TH}>Detail</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAudit.slice(0, 200).map((e, i) => (
                    <tr key={`${e.ref}-${e.type}-${i}`} className="hover:bg-gray-50/70">
                      <td className={`${TD} whitespace-nowrap`}>{fmtDate(e.date)}</td>
                      <td className={`${TD} font-semibold text-gray-900`}>{e.actor}</td>
                      <td className={TD}>
                        <Badge tone="violet">{e.type}</Badge>
                      </td>
                      <td className={TD}>
                        <span className="font-semibold text-sky-700">{e.ref}</span>
                      </td>
                      <td className={TD}>
                        <p className="text-[11px] text-gray-600 max-w-[320px] leading-snug">{e.detail}</p>
                      </td>
                      <td className={`${TD} text-right`}>
                        <Button
                          size="xs"
                          variant="dangerOutline"
                          icon="trash"
                          onClick={() => deleteAuditLog(e)}
                          title="Hapus rekaman audit ini"
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredAudit.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                        Tidak ada aktivitas pada filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </TableWrap>
            </Card>
          </>
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
