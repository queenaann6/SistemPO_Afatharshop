import React, { useEffect, useMemo, useState } from 'react';
import api, { mediaUrl } from '../../services/api';
import { dbId, mapBrandToCore, mapSupplier } from '../../services/adapters';
import ProductCatalogModal from './ProductCatalogModal';
import BankAccountModal from './BankAccountModal';
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
  ProgressBar,
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
  calcOrderAmount,
  copyText,
  createSeedData,
  daysAgo,
  diffDays,
  downloadCSV,
  feeNominalFor,
  feeTypeFor,
  brandDiscountNominalFor,
  brandDiscountTypeFor,
  brandDiscountValueFor,
  FeeRecapPanel,
  fmtDate,
  hasAddress,
  isPaid,
  levelTone,
  nextAction,
  nowStamp,
  num,
  orderOutstanding,
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
  variantLabel,
  waLink
} from './poCore';

const hasOwnPrice = (v) => v?.price != null && v?.price !== '';
const hasOwnAddon = (v) => v?.addon != null && v?.addon !== '';

const variantPricing = (product, variant) => ({
  price: hasOwnPrice(variant) ? num(variant.price) : 0,
  addon: hasOwnAddon(variant) ? num(variant.addon) : 0
});

const priceRangeOf = (product) => {
  const prices = (product?.variants || []).map((v) => variantPricing(product, v).price).filter((p) => p > 0);
  if (!prices.length) return { min: 0, max: 0, label: rp(num(product?.price)) };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, label: min === max ? rp(min) : `${rp(min)} – ${rp(max)}` };
};

const withVariantPrice = (product) => {
  const prices = (product.variants || []).filter(hasOwnPrice).map((v) => num(v.price));
  return prices.length ? { ...product, price: Math.min(...prices) } : product;
};

const TERMIN_PCTS = { 2: [50, 50], 3: [25, 50, 25] };
const stagePctOf = (stage) => num(stage?.pct ?? stage?.percent);
const isoDateOf = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : '');
const stageLabelOf = (index, total) =>
  index === 0
    ? 'Termin 1 · DP'
    : index === total - 1
      ? `Termin ${index + 1} · Pelunasan`
      : `Termin ${index + 1} · Cicilan`;
const makeStages = (count, baseDate, existing = []) =>
  (TERMIN_PCTS[count] || TERMIN_PCTS[3]).map((pct, index) => ({
    label: stageLabelOf(index, count),
    pct,
    date: isoDateOf(existing[index]?.date) || addDays(baseDate || todayISO(), index * 30)
  }));
const stagesFromProduct = (product) => {
  const plan = Array.isArray(product?.paymentStages) ? product.paymentStages.filter(Boolean) : [];
  if (plan.length >= 2) {
    const sliced = plan.slice(0, 3);
    return sliced.map((stage, index) => ({
      label: stageLabelOf(index, sliced.length),
      pct: stagePctOf(stage),
      date: isoDateOf(stage.date)
    }));
  }
  return makeStages(3, product?.closeDate || todayISO());
};

const DEFAULT_USER = { name: 'Rina Marketing', role: 'marketing', email: 'marketing@afatharshop.com' };
const PAGE_DESC =
  'Kelola katalog PO, ACC pesanan dari tim, harga & diskon brand, kuota varian, serta rekap checkout per produk.';

export default function MarketingDashboard({
  currentUser,
  onNavigateStore,
  onLogout,
  orders: ordersProp,
  products: productsProp,
  brands: brandsProp,
  suppliers: suppliersProp,
  mitra: mitraProp,
  team: teamProp,
  paymentRequests: paymentRequestsProp,
  bankAccounts: bankAccountsProp,
  couriers: couriersProp,
  categories: categoriesProp,
  deposits: depositsProp,
  settings: settingsProp,
  onChangeOrders,
  onChangeProducts,
  onChangeBrands,
  onChangeSuppliers,
  onChangeMitra,
  onChangeTeam,
  onChangePaymentRequests,
  onChangeDeposits,
  onChangeSettings,
  onChangeCategories,
  onChangeBankAccounts,
  onChangeCouriers,
  onPrintInvoice
}) {
  const me = currentUser || DEFAULT_USER;
  const seed = useMemo(() => createSeedData(), []);
  const accent = ACCENTS.marketing;
  const { show: toast, toast: toastData, close: closeToast } = useToast();

  /* ------------------------------------------------------------------ state */
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [orders, commitOrders] = useDataState(ordersProp, seed.orders, onChangeOrders);
  const [products, commitProducts] = useDataState(productsProp, seed.products, onChangeProducts);
  const [brands, commitBrands] = useDataState(brandsProp, seed.brands, onChangeBrands);
  const [suppliers, commitSuppliers] = useDataState(suppliersProp, seed.suppliers, onChangeSuppliers);
  const [mitra, commitMitra] = useDataState(mitraProp, seed.mitra, onChangeMitra);
  const [team, commitTeam] = useDataState(teamProp, seed.team, onChangeTeam);
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
  const [categories, commitCategories] = useDataState(
    categoriesProp,
    seed.categories,
    onChangeCategories
  );
  const [deposits, commitDeposits] = useDataState(depositsProp, seed.deposits, onChangeDeposits);
  const [settings, commitSettings] = useDataState(settingsProp, seed.settings, onChangeSettings);
  const [deletedOrders, setDeletedOrders] = useState(seed.deletedOrders);

  const [detailInvoice, setDetailInvoice] = useState(null);
  const [productOrderId, setProductOrderId] = useState(null);
  const [proofView, setProofView] = useState(null);
  const [reasonModal, setReasonModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // ACC pesanan
  const [accSearch, setAccSearch] = useState('');
  const [accSelected, setAccSelected] = useState([]);

  // List pesanan
  const [stageFilter, setStageFilter] = useState('all');
  const [listSearch, setListSearch] = useState('');
  const [listBrand, setListBrand] = useState('all');
  const [listLevel, setListLevel] = useState('all');

  // Input pesanan
  const [draft, setDraft] = useState({
    mitraId: '',
    produkId: '',
    variantId: '',
    qty: 1,
    dpPct: seed.settings.dpPct || 50,
    notes: ''
  });
  const [draftList, setDraftList] = useState([]);

  // Master data modals
  const [productModal, setProductModal] = useState(null);
  const [variantModal, setVariantModal] = useState(null);
  const [brandModal, setBrandModal] = useState(null);
  const [supplierModal, setSupplierModal] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);
  const [bankModal, setBankModal] = useState(null);
  const [bankTab, setBankTab] = useState('public'); // 'public' | 'pengajuan'
  const [inlineBankId, setInlineBankId] = useState(null);
  const [inlineBankForm, setInlineBankForm] = useState({ bank: '', accountNo: '', holder: '', purpose: '', brands: [], active: true });
  const [courierModal, setCourierModal] = useState(null);
  const [mitraModal, setMitraModal] = useState(null);
  const [mitraDetailId, setMitraDetailId] = useState(null);
  const [teamModal, setTeamModal] = useState(null);
  const [credential, setCredential] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState({});

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

  // Pengajuan pembayaran
  const [prFilter, setPrFilter] = useState('all');
  const [prDetailId, setPrDetailId] = useState(null);

  // Rekap & penjualan terhapus
  const [rekapBrand, setRekapBrand] = useState('all');
  const [trashSearch, setTrashSearch] = useState('');

  // Katalog produk: pencarian & filter status PO, brand, kategori, dan sortir
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogStatus, setCatalogStatus] = useState('all');
  const [catalogBrand, setCatalogBrand] = useState('all');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogSort, setCatalogSort] = useState('default');

  // Brand Vendor filters
  const [brandSearch, setBrandSearch] = useState('');
  const [brandCityFilter, setBrandCityFilter] = useState('all');
  const [brandSort, setBrandSort] = useState('name');

  // Pengaturan
  const [settingsForm, setSettingsForm] = useState({ ...seed.settings });
  const [poBatches, setPoBatches] = useState([]);

  useEffect(() => {
    setSettingsForm({ ...settings });
  }, [settings]);

  // Sinkronisasi otomatis Brand, Supplier & Batches langsung dari database backend
  useEffect(() => {
    let cancelled = false;
    const syncBrandsAndSuppliers = async () => {
      try {
        const [brandsRes, suppliersRes, batchesRes] = await Promise.allSettled([
          api.management.brands().catch(() => api.brands()),
          api.management.suppliers().catch(() => api.suppliers()),
          api.management.batches().catch(() => ({ data: [] }))
        ]);
        if (cancelled) return;
        if (brandsRes.status === 'fulfilled' && Array.isArray(brandsRes.value?.data) && brandsRes.value.data.length > 0) {
          commitBrands(brandsRes.value.data.map(mapBrandToCore));
        }
        if (suppliersRes.status === 'fulfilled' && Array.isArray(suppliersRes.value?.data) && suppliersRes.value.data.length > 0) {
          commitSuppliers(suppliersRes.value.data.map(mapSupplier));
        }
        if (batchesRes.status === 'fulfilled' && Array.isArray(batchesRes.value?.data)) {
          setPoBatches(batchesRes.value.data);
        }
      } catch (e) {
        console.warn('Gagal sinkronisasi data master brand/supplier/batches:', e);
      }
    };
    syncBrandsAndSuppliers();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------------- derived */
  const pendingAcc = useMemo(() => orders.filter((o) => o.marketingStatus === MKT.PENDING), [orders]);
  const marketingPR = useMemo(
    () => paymentRequests.filter((r) => r.status === PREQ.REVIEW_MKT),
    [paymentRequests]
  );
  const activeOrders = useMemo(
    () => orders.filter((o) => !['selesai', 'ditolak'].includes(orderStage(o))),
    [orders]
  );
  const omzet = useMemo(
    () => sumBy(orders.filter((o) => o.marketingStatus !== MKT.TOLAK), (o) => o.subtotal),
    [orders]
  );
  const dpCollected = useMemo(
    () => sumBy(orders.filter((o) => isPaid(o.dpStatus)), (o) => o.dpNominal),
    [orders]
  );
  const stageCounts = useMemo(() => {
    const c = {};
    orders.forEach((o) => {
      const s = orderStage(o);
      c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [orders]);

  const productSummary = useMemo(
    () =>
      products.map((p) => {
        const list = orders.filter((o) => o.produkId === p.id && o.marketingStatus !== MKT.TOLAK);
        const quota = sumBy(p.variants, (v) => v.quota);
        const used = sumBy(p.variants, (v) => v.used);
        return {
          ...p,
          invoiceCount: list.length,
          qtySold: sumBy(list, (o) => o.qty),
          omzet: sumBy(list, (o) => o.subtotal),
          piutang: sumBy(list, (o) => orderOutstanding(o)),
          quota,
          used,
          remaining: Math.max(0, quota - used)
        };
      }),
    [products, orders]
  );

  const filteredBrands = useMemo(() => {
    const q = brandSearch.toLowerCase().trim();
    const list = brands.filter((b) => {
      const matchesSearch =
        !q ||
        (b.name || '').toLowerCase().includes(q) ||
        (b.supplier || '').toLowerCase().includes(q) ||
        (b.address || '').toLowerCase().includes(q);
      const matchesCity = brandCityFilter === 'all' || b.address === brandCityFilter;
      return matchesSearch && matchesCity;
    });

    const sorted = [...list];
    if (brandSort === 'omzet') {
      sorted.sort((a, b) => {
        const omzetA = sumBy(productSummary.filter((p) => p.brand === a.name), (p) => p.omzet);
        const omzetB = sumBy(productSummary.filter((p) => p.brand === b.name), (p) => p.omzet);
        return omzetB - omzetA;
      });
    } else if (brandSort === 'products') {
      sorted.sort((a, b) => {
        const countA = productSummary.filter((p) => p.brand === a.name).length;
        const countB = productSummary.filter((p) => p.brand === b.name).length;
        return countB - countA;
      });
    } else {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return sorted;
  }, [brands, brandSearch, brandCityFilter, brandSort, productSummary]);

  const distinctBrandCities = useMemo(() => {
    return Array.from(new Set(brands.map((b) => b.address).filter(Boolean)));
  }, [brands]);

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

  const filteredOrders = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (stageFilter !== 'all' && orderStage(o) !== stageFilter) return false;
        if (listBrand !== 'all' && o.brand !== listBrand) return false;
        if (listLevel !== 'all' && o.level !== listLevel) return false;
        if (!q) return true;
        return `${o.invoice} ${o.mitraName} ${o.produk} ${o.variant} ${o.brand}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [orders, stageFilter, listBrand, listLevel, listSearch]);
  const listPag = usePagination(filteredOrders, 10);

  const filteredAcc = useMemo(() => {
    const q = accSearch.trim().toLowerCase();
    return pendingAcc.filter(
      (o) =>
        !q ||
        `${o.invoice} ${o.mitraName} ${o.produk} ${o.variant} ${o.brand}`.toLowerCase().includes(q)
    );
  }, [pendingAcc, accSearch]);

  const detailOrder = useMemo(
    () => orders.find((o) => o.invoice === detailInvoice) || null,
    [orders, detailInvoice]
  );

  const productOrderProduct = useMemo(
    () => products.find((p) => p.id === productOrderId) || null,
    [products, productOrderId]
  );
  const productOrderRows = useMemo(() => {
    if (!productOrderProduct) return [];
    return orders
      .filter((o) => o.produkId === productOrderProduct.id && o.marketingStatus !== MKT.TOLAK)
      .map((o) => ({ ...o, inPeriod: diffDays(o.date, productOrderProduct.closeDate) <= 0 }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [orders, productOrderProduct]);
  const productOrderStats = useMemo(() => {
    const inRows = productOrderRows.filter((o) => o.inPeriod);
    return {
      inCount: inRows.length,
      inQty: sumBy(inRows, (o) => o.qty),
      inOmzet: sumBy(inRows, (o) => o.subtotal),
      lateCount: productOrderRows.length - inRows.length
    };
  }, [productOrderRows]);
  const mitraDetail = useMemo(() => mitraRows.find((m) => m.id === mitraDetailId) || null, [mitraRows, mitraDetailId]);
  const prDetail = useMemo(
    () => paymentRequests.find((r) => r.id === prDetailId) || null,
    [paymentRequests, prDetailId]
  );
  const draftPreview = useMemo(() => {
    const p = products.find((x) => x.id === draft.produkId);
    const m = mitra.find((x) => x.id === draft.mitraId);
    const b = brands.find((x) => x.name === p?.brand);
    const v = p?.variants.find((x) => x.id === draft.variantId);
    const pricing = variantPricing(p, v);
    const feeNominal = feeNominalFor(b, m?.level, pricing.price);
    const brandDiscountNominal = brandDiscountNominalFor(b, pricing.price);
    const disc = pricing.price ? Math.round((feeNominal / pricing.price) * 10000) / 100 : 0;
    return {
      product: p,
      mitra: m,
      brand: b,
      variant: v,
      disc,
      pricing,
      feeNominal,
      brandDiscountNominal,
      amounts: calcOrderAmount({
        price: pricing.price,
        qty: draft.qty || 0,
        feeNominal,
        brandDiscountNominal,
        dpPct: draft.dpPct
      })
    };
  }, [products, mitra, brands, draft]);

  const closingPo = useMemo(() => poClosingToday(products), [products]);

  const notifications = useMemo(
    () => [
      ...closingPo.map((p) => ({
        id: `po-close-${p.id}`,
        title: `${p.title} ${p.daysLeft === 0 ? 'tutup PO hari ini' : `lewat jadwal ${Math.abs(p.daysLeft)} hari`}`,
        sub: `${p.brand} · ${fmtDate(p.closeDate)}`,
        tone: 'red',
        onClick: () => setActiveMenu('produk')
      })),
      ...pendingAcc.slice(0, 6).map((o) => ({
        id: `acc-${o.invoice}`,
        title: `${o.invoice} menunggu ACC`,
        sub: `${o.mitraName} · ${o.produk} · ${rp(o.subtotal)}`,
        tone: 'amber',
        onClick: () => setActiveMenu('acc_pesanan')
      })),
      ...marketingPR.slice(0, 4).map((r) => ({
        id: `pr-${r.id}`,
        title: `${r.code} perlu review purchasing`,
        sub: `${rp(r.amount)} · ${r.purpose}`,
        tone: 'blue',
        onClick: () => {
          setPrDetailId(r.id);
          setActiveMenu('pengajuan');
        }
      }))
    ],
    [closingPo, pendingAcc, marketingPR]
  );

  const menus = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', title: 'Ringkasan Kinerja Purchasing', icon: 'grid' },
      {
        group: 'pesanan',
        label: 'Pesanan',
        children: [
          {
            id: 'acc_pesanan',
            label: 'ACC Pesanan Masuk',
            title: 'Persetujuan Pesanan Masuk',
            icon: 'check',
            badge: pendingAcc.length || null
          },
          { id: 'pesanan', label: 'List Pesanan PO', title: 'Daftar Pesanan Pre-Order', icon: 'receipt' },
          { id: 'tambah_pesanan', label: 'Input Pesanan', title: 'Input Pesanan Manual', icon: 'plus' },
          { id: 'rekap_produk', label: 'Rekap Checkout', title: 'Rekap Checkout per Produk', icon: 'file' }
        ]
      },
      {
        group: 'katalog',
        label: 'Katalog & Vendor',
        children: [
          { id: 'produk', label: 'Katalog Produk PO', title: 'Katalog Produk Pre-Order', icon: 'box' },
          { id: 'kategori', label: 'Kategori Produk', title: 'Master Kategori Produk', icon: 'filter' },
          { id: 'brand', label: 'Brand Vendor', title: 'Master Brand & Diskon Mitra', icon: 'shield' },
          { id: 'supplier', label: 'Supplier Pabrik', title: 'Master Supplier Pabrik', icon: 'truck' }
        ]
      },
      {
        group: 'sdm',
        label: 'Mitra & Tim',
        children: [
          { id: 'mitra', label: 'Mitra & User', title: 'Data Mitra & User', icon: 'users' },
          { id: 'tim', label: 'Tim Admin', title: 'Manajemen Tim Admin', icon: 'shield' }
        ]
      },
      {
        group: 'keuangan',
        label: 'Pembayaran',
        children: [
          { id: 'input_bukti', label: 'Input Bukti TF', title: 'Input Manual Bukti Transfer', icon: 'upload' },
          {
            id: 'pengajuan',
            label: 'Review Pengajuan',
            title: 'Review Pengajuan Pembayaran',
            icon: 'wallet',
            badge: marketingPR.length || null
          },
          { id: 'rekap_fee', label: 'Rekap Fee', title: 'Rekap Fee & Diskon Brand', icon: 'wallet' }
        ]
      },
      {
        group: 'publikasi',
        label: 'Publikasi Toko',
        children: [
          { id: 'rekening', label: 'Rekening Bank', title: 'Master Rekening Bank', icon: 'card' },
          { id: 'ekspedisi', label: 'Ekspedisi', title: 'Master Ekspedisi Pengiriman', icon: 'truck' }
        ]
      },
      { id: 'terhapus', label: 'Penjualan Terhapus', title: 'Penjualan Terhapus', icon: 'trash' }
    ],
    [pendingAcc.length, marketingPR.length]
  );

  /* --------------------------------------------------------------- handlers */
  const serverFail = (err, action) =>
    toast(`${action} gagal: ${err?.message || 'server tidak merespons.'}`, 'error');

  const notOnServer = (label) =>
    toast(`${label} ini belum tersimpan di server. Tambahkan lewat portal lebih dulu.`, 'error');

  // Produk dashboard memakai id "p-<id database>", jadi id numeriknya ada di projectId.
  const productDbId = (p) => dbId(p) || (num(p?.projectId) > 0 ? num(p.projectId) : null);

  const patchOrder = async (invoice, patch) => {
    const matched = orders.find((o) => o.invoice === invoice);
    if (!matched) return false;

    // Status pesanan hanya berubah untuk keputusan purchasing; patch lain (produksi, resi)
    // tidak boleh menimpa status yang sudah berjalan.
    const nextStatus =
      patch.marketingStatus === MKT.ACC
        ? 'Menunggu DP'
        : patch.marketingStatus === MKT.TOLAK
          ? 'Batal'
          : patch.status;

    // Backend menerima id angka atau nomor pesanan (PO-YYYYMMDD-XXXXX).
    const targetId = dbId(matched) || matched.invoice;
    const body = orderPatchToServer({ ...patch, status: nextStatus });

    try {
      if (Object.keys(body).length) await api.management.updateOrderStatus(targetId, body);
      commitOrders((prev) => prev.map((o) => (o.invoice === invoice ? { ...o, ...patch } : o)));
      return true;
    } catch (err) {
      serverFail(err, `Perubahan status ${invoice}`);
      return false;
    }
  };

  const adjustQuota = (order, delta) => {
    if (!order?.produkId || !order?.variantId) return;
    commitProducts((prev) =>
      prev.map((p) =>
        p.id === order.produkId
          ? {
              ...p,
              variants: p.variants.map((v) =>
                v.id === order.variantId ? { ...v, used: Math.max(0, num(v.used) + delta) } : v
              )
            }
          : p
      )
    );
  };

  const approveOrder = async (o, silent) => {
    const ok = await patchOrder(o.invoice, {
      marketingStatus: MKT.ACC,
      marketingBy: me.name,
      marketingAt: todayISO(),
      marketingNote: ''
    });
    if (ok && !silent) toast(`${o.invoice} di-ACC. Mitra dapat melanjutkan pembayaran DP.`);
  };

  const approveMany = async () => {
    const targets = accSelected
      .map((inv) => orders.find((o) => o.invoice === inv))
      .filter((o) => o && pendingAcc.some((p) => p.invoice === o.invoice));
    if (!targets.length) return;

    const done = [];
    for (const order of targets) {
      const ok = await patchOrder(order.invoice, {
        marketingStatus: MKT.ACC,
        marketingBy: me.name,
        marketingAt: todayISO(),
        marketingNote: ''
      });
      if (ok) done.push(order.invoice);
    }

    setAccSelected([]);
    if (done.length) toast(`${done.length} pesanan berhasil di-ACC.`);
    if (done.length < targets.length) {
      toast(`${targets.length - done.length} pesanan gagal di-ACC dan tetap berstatus menunggu.`, 'warning');
    }
  };

  const rejectOrder = async (o, reason) => {
    const wasActive = o.marketingStatus !== MKT.TOLAK;
    const ok = await patchOrder(o.invoice, {
      marketingStatus: MKT.TOLAK,
      marketingNote: reason,
      marketingBy: me.name,
      marketingAt: todayISO()
    });
    if (!ok) return;
    if (wasActive) adjustQuota(o, -num(o.qty));
    toast(`Pesanan ${o.invoice} ditolak dan kuota varian dikembalikan.`, 'warning');
  };

  const reopenOrder = async (o) => {
    const ok = await patchOrder(o.invoice, { marketingStatus: MKT.PENDING, marketingNote: '' });
    if (!ok) return;
    adjustQuota(o, num(o.qty));
    toast(`${o.invoice} dibuka kembali untuk direview.`);
  };

  const setProduction = async (o, status) => {
    const patch = { productionStatus: status };
    if (status === PROD.READY) {
      patch.readyAt = todayISO();
      patch.status = 'Menunggu Alamat Mitra';
    }
    const ok = await patchOrder(o.invoice, patch);
    if (!ok) return;
    if (status === PROD.READY) {
      toast(`${o.invoice} ditandai READY. Mitra sudah bisa mengisi alamat & menerima tagihan ongkir.`);
    } else {
      toast(`${o.invoice} masuk tahap ${status}.`);
    }
  };

  const openWA = (o, kind) => {
    const text = buildWA(kind, o, { ...settings, banks: bankAccounts });
    window.open(waLink(o.phone, text), '_blank');
  };

  const askDelete = (o) =>
    setReasonModal({
      title: 'Pindahkan ke Penjualan Terhapus',
      subtitle: `${o.invoice} · ${o.mitraName}`,
      label: 'Alasan penghapusan',
      placeholder: 'Contoh: duplikat pesanan / dibatalkan mitra',
      confirmLabel: 'Hapus pesanan',
      danger: true,
      onSubmit: (reason) => {
        commitOrders((prev) => prev.filter((x) => x.invoice !== o.invoice));
        setDeletedOrders((prev) => [
          { ...o, deletedAt: todayISO(), deletedBy: me.name, deleteReason: reason },
          ...prev
        ]);
        if (o.marketingStatus !== MKT.TOLAK) adjustQuota(o, -num(o.qty));
        setReasonModal(null);
        setDetailInvoice(null);
        toast(`${o.invoice} dipindahkan ke Penjualan Terhapus.`, 'warning');
      }
    });

  const restoreOrder = (o) => {
    setDeletedOrders((prev) => prev.filter((x) => x.invoice !== o.invoice));
    commitOrders((prev) => [{ ...o, deletedAt: '', deletedBy: '', deleteReason: '' }, ...prev]);
    if (o.marketingStatus !== MKT.TOLAK) adjustQuota(o, num(o.qty));
    toast(`${o.invoice} berhasil dipulihkan.`);
  };

  const addDraft = () => {
    if (!draft.mitraId) return toast('Pilih mitra terlebih dahulu.', 'error');
    if (!draft.produkId) return toast('Pilih produk PO.', 'error');
    if (!draft.variantId) return toast('Pilih varian produk.', 'error');
    const p = products.find((x) => x.id === draft.produkId);
    const v = p?.variants.find((x) => x.id === draft.variantId);
    const qty = num(draft.qty);
    if (!qty || qty < 1) return toast('Qty minimal 1 pcs.', 'error');
    const stagedQty = sumBy(
      draftList.filter((d) => d.variantId === draft.variantId),
      (d) => d.qty
    );
    const remaining = num(v?.quota) - num(v?.used) - stagedQty;
    if (qty > remaining) return toast(`Sisa kuota varian ini hanya ${remaining} pcs.`, 'error');
    setDraftList((prev) => [...prev, { key: uid('draft'), ...draft, qty }]);
    setDraft((prev) => ({ ...prev, variantId: '', qty: 1, notes: '' }));
    toast('Item ditambahkan ke daftar pesanan.');
  };

  const submitDrafts = () => {
    if (!draftList.length) return toast('Daftar item masih kosong.', 'error');
    const maxInv = orders.reduce(
      (max, o) => Math.max(max, Number(String(o.invoice).replace(/\D/g, '')) || 0),
      1000
    );
    const created = draftList.map((item, i) => {
      const p = products.find((x) => x.id === item.produkId);
      const m = mitra.find((x) => x.id === item.mitraId);
      const b = brands.find((x) => x.name === p?.brand);
      const v = p?.variants.find((x) => x.id === item.variantId);
      const pricing = variantPricing(p, v);
      const feeNominal = feeNominalFor(b, m?.level, pricing.price);
      const brandDiscountNominal = brandDiscountNominalFor(b, pricing.price);
      const disc = pricing.price ? Math.round((feeNominal / pricing.price) * 10000) / 100 : 0;
      const amounts = calcOrderAmount({
        price: pricing.price,
        qty: item.qty,
        feeNominal,
        brandDiscountNominal,
        dpPct: item.dpPct
      });
      const invoice = `INV-${maxInv + 1 + i}`;
      return {
        id: invoice,
        invoice,
        date: todayISO(),
        mitraId: m?.id,
        mitraName: m?.name,
        level: m?.level,
        phone: m?.phone,
        brand: p?.brand,
        produkId: p?.id,
        produk: p?.title,
        variantId: v?.id,
        variant: variantLabel(v),
        qty: item.qty,
        price: pricing.price,
        addon: pricing.addon,
        discountPct: disc,
        discountNominal: amounts.discountNominal,
        feeMitraNominal: amounts.feeMitraNominal,
        brandDiscountNominal: amounts.brandDiscountNominal,
        feeCompanyNominal: amounts.feeCompanyNominal,
        subtotal: amounts.subtotal,
        dpPct: item.dpPct,
        dpNominal: amounts.dpNominal,
        pelunasanNominal: amounts.pelunasanNominal,
        paymentStages: Array.isArray(p?.paymentStages) ? p.paymentStages : [],
        dpStatus: PAY.BELUM,
        dpProof: '',
        dpVerifiedBy: '',
        dpVerifiedAt: '',
        pelunasanStatus: PAY.BELUM,
        pelunasanProof: '',
        pelunasanVerifiedBy: '',
        pelunasanVerifiedAt: '',
        ongkir: 0,
        ongkirAt: '',
        ekspedisi: '',
        weight: '',
        shippingNote: '',
        ongkirStatus: PAY.BELUM,
        ongkirProof: '',
        ongkirVerifiedBy: '',
        ongkirVerifiedAt: '',
        resi: '',
        shippedAt: '',
        receivedAt: '',
        shipStatus: SHIP.BELUM,
        marketingStatus: MKT.ACC,
        marketingNote: '',
        marketingBy: me.name,
        marketingAt: todayISO(),
        productionStatus: PROD.QUEUE,
        readyAt: '',
        address: null,
        createdBy: me.name,
        notes: item.notes,
        revisionNote: '',
        cancelReason: ''
      };
    });

    commitOrders((prev) => [...created, ...prev]);
    commitProducts((prev) =>
      prev.map((p) => {
        const items = created.filter((c) => c.produkId === p.id);
        if (!items.length) return p;
        return {
          ...p,
          variants: p.variants.map((v) => {
            const qty = sumBy(items.filter((c) => c.variantId === v.id), (c) => c.qty);
            return qty ? { ...v, used: num(v.used) + qty } : v;
          })
        };
      })
    );
    setDraftList([]);
    toast(`${created.length} pesanan berhasil diterbitkan.`);
    setActiveMenu('pesanan');
  };

  const buildProductOptions = (form, baseOptions) => {
    const models = String(form.modelsText || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ name: line.split('|')[0].trim() }));
    const sizes = String(form.sizesText || '')
      .split(',')
      .map((size) => size.trim())
      .filter(Boolean);
    const hexByName = new Map((baseOptions?.colors || []).map((c) => [String(c.name).toLowerCase(), c.hex]));
    const colors = String(form.colorsText || '')
      .split(',')
      .map((color) => color.trim())
      .filter(Boolean)
      .map((name) => ({ name, hex: hexByName.get(name.toLowerCase()) || '#CBD5E1' }));
    return { models, sizes, colors };
  };

  const completeVariants = (options, existing = []) => {
    if (!options.models.length || !options.sizes.length || !options.colors.length) return existing;
    const known = new Set(existing.map((v) => `${v.color}|${v.model}|${v.size}`));
    const priceForModel = (modelName) => {
      const pool = existing.filter((v) => v.model === modelName && hasOwnPrice(v));
      const base = pool.length ? pool : existing.filter(hasOwnPrice);
      return base.length ? num(base[0].price) : 0;
    };
    const next = [...existing];
    options.models.forEach((model) => {
      options.colors.forEach((color) => {
        options.sizes.forEach((size) => {
          const key = `${color.name}|${model.name}|${String(size)}`;
          if (known.has(key)) return;
          next.push({
            id: uid('v'),
            color: color.name,
            model: model.name,
            size: String(size),
            price: priceForModel(model.name),
            addon: 0,
            quota: 10,
            used: 0
          });
        });
      });
    });
    return next;
  };

  const variantKey = (v) => `${String(v?.color || '').toLowerCase()}|${String(v?.model || '').toLowerCase()}|${String(v?.size ?? '')}`;

  const handleSaveProductFromModal = async (f, actionType = 'open') => {
    const current = productModal?.mode === 'edit' ? products.find((p) => p.id === productModal.id) : null;
    const stages = (f.stages || [])
      .slice(0, f.terminCount === 2 ? 2 : 3)
      .map((stage, index, arr) => ({
        label: stageLabelOf(index, arr.length),
        pct: Math.min(100, Math.max(0, num(stage.pct))),
        date: stage.date || ''
      }));
    const pctSum = stages.reduce((sum, stage) => sum + stage.pct, 0);
    if (stages.length < 2 || pctSum !== 100) {
      return toast('Total porsi termin pembayaran harus 100%.', 'error');
    }

    const variants = (f.variants || []).map((v) => ({
      ...v,
      id: v.id || uid('v'),
      color: v.color || 'Standard',
      size: String(v.size || 'All'),
      model: v.model || 'Standard',
      sku: v.sku || `${v.color} (${v.size})`,
      hpp: num(v.hpp) || 0,
      price: num(v.price) || 0,
      addon: num(v.addon) || 0,
      quota: num(v.quota ?? v.stock) || 10,
      stock: num(v.quota ?? v.stock) || 10,
      is_active: v.is_active !== undefined ? !!v.is_active : true
    }));

    const variantPrices = variants.filter(hasOwnPrice).map((v) => num(v.price));
    const basePrice = variantPrices.length ? Math.min(...variantPrices) : (num(f.price) || num(current?.price) || 295000);
    const isSale = !!f.isSale;
    const discountPercent = isSale ? (num(f.discountPercent) || 0) : 0;
    const originalPrice = isSale
      ? (num(f.originalPrice) || (discountPercent > 0 ? Math.round(basePrice / (1 - discountPercent / 100)) : Math.round(basePrice * 1.2)))
      : basePrice;

    const computedStatus = actionType === 'open' ? 'open' : actionType === 'scheduled' ? 'upcoming' : 'draft';

    const payload = {
      title: f.title,
      name: f.title,
      brand: f.brand,
      brand_id: f.brand_id || undefined,
      category: f.category,
      category_id: f.category_id || undefined,
      series: f.series || '',
      batch: f.batch || '',
      po_batch_id: f.po_batch_id || undefined,
      price: basePrice,
      image: f.image || current?.image || '',
      thumbnails: f.thumbnails || [f.image, f.image2, f.image3, f.image4].filter(Boolean),
      reelUrl: f.reelUrl || '',
      isSale,
      is_sale: isSale,
      discountPercent,
      discount_percent: discountPercent,
      originalPrice,
      original_price: originalPrice,
      saleQuota: f.saleQuota,
      saleBadgeText: f.saleBadgeText,
      openDate: f.openDate || '',
      closeDate: f.closeDate,
      closeTime: f.closeTime || '',
      readyEstimate: f.readyEstimate,
      description: f.description,
      material_detail: f.material_detail || f.materialDetail || '',
      dpPct: stages[0].pct,
      pelunasanDueDate: stages[stages.length - 1].date || '',
      paymentStages: stages,
      terminCount: f.terminCount,
      status: computedStatus,
      options: f.options || {
        colors: f.colors || [],
        sizes: f.sizes || [],
        models: [{ name: 'Standard' }]
      }
    };

    const serverPayload = {
      title: f.title.trim(),
      name: f.title.trim(),
      brand: f.brand,
      brand_id: f.brand_id || undefined,
      category: f.category,
      category_id: f.category_id || undefined,
      batch: f.batch || undefined,
      po_batch_id: f.po_batch_id || undefined,
      series: f.series || undefined,
      price: basePrice,
      image: f.image || current?.image || '',
      is_sale: isSale,
      discount_percent: discountPercent,
      original_price: originalPrice,
      status: computedStatus === 'open' ? 'pre_order' : computedStatus,
      tutup_po: f.closeDate ? `${f.closeDate} ${f.closeTime || '23:59'}` : null,
      estimated_shipment: f.readyEstimate,
      description: f.description,
      material_detail: f.material_detail || f.materialDetail || '',
      min_dp_percent: stages[0].pct,
      payment_stages: stages,
      paymentStages: stages,
      termin_count: stages.length,
      terminCount: stages.length,
      stock_quota: variants.reduce((sum, v) => sum + Math.max(0, num(v.quota ?? v.stock)), 0),
      variants: variants.map((v) => ({
        id: typeof v.id === 'number' ? v.id : undefined,
        model: v.model || 'Standard',
        size: v.size,
        color: v.color,
        sku: v.sku,
        stock: num(v.quota ?? v.stock) || 10,
        price: num(v.price) || basePrice,
        addon: num(v.addon) || 0,
        hpp: num(v.hpp) || 0,
        is_active: v.is_active !== undefined ? !!v.is_active : true
      }))
    };

    if (current) {
      const targetId = productDbId(current);
      if (!targetId) return notOnServer(`Produk ${current.title}`);
      let updatedRes;
      try {
        updatedRes = await api.management.updateProduct(targetId, serverPayload);
      } catch (err) {
        return serverFail(err, `Menyimpan produk ${f.title}`);
      }
      const updatedData = updatedRes?.data;
      const updatedVariants = Array.isArray(updatedData?.variants) ? updatedData.variants : variants;
      commitProducts((prev) => prev.map((p) => (p.id === current.id ? { ...p, ...payload, variants: updatedVariants } : p)));
      toast(`Produk ${f.title} berhasil diperbarui.`);
      setProductModal(null);
      return;
    }

    let created;
    try {
      created = await api.management.createProduct(serverPayload);
    } catch (err) {
      return serverFail(err, `Membuat produk ${f.title}`);
    }

    const serverProduct = created?.data;
    const serverVariants = Array.isArray(serverProduct?.variants) ? serverProduct.variants : [];
    const withServerIds = variants.map((v) => {
      const match = serverVariants.find((sv) => variantKey(sv) === variantKey(v));
      return match ? { ...v, id: match.id } : v;
    });

    const newId = serverProduct?.id ? `P-${serverProduct.id}` : uid('p');
    const newP = {
      id: newId,
      ...payload,
      backendId: serverProduct?.id ?? null,
      status: computedStatus,
      createdAt: todayISO(),
      variants: withServerIds
    };
    commitProducts((prev) => [newP, ...prev]);
    toast(`Produk PO ${f.title} berhasil disimpan ${actionType === 'open' ? 'dan dibuka.' : '.'}`);
    setProductModal(null);
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    const f = productModal.form;
    if (!f.title?.trim()) return toast('Nama produk wajib diisi.', 'error');
    if (!f.category?.trim()) return toast('Kategori produk wajib dipilih.', 'error');
    const current = productModal.mode === 'edit' ? products.find((p) => p.id === productModal.id) : null;
    const stages = (f.stages || [])
      .slice(0, f.terminCount === 2 ? 2 : 3)
      .map((stage, index, arr) => ({
        label: stageLabelOf(index, arr.length),
        pct: Math.min(100, Math.max(0, num(stage.pct))),
        date: stage.date || ''
      }));
    const pctSum = stages.reduce((sum, stage) => sum + stage.pct, 0);
    if (stages.length < 2 || pctSum !== 100) {
      return toast('Total porsi termin pembayaran harus 100%.', 'error');
    }
    const options = buildProductOptions(f, current?.options);
    const variants = completeVariants(options, current?.variants || []);
    const variantPrices = variants.filter(hasOwnPrice).map((v) => num(v.price));
    const basePrice = variantPrices.length ? Math.min(...variantPrices) : num(current?.price);
    const isSale = !!f.isSale;
    const discountPercent = isSale ? (num(f.discountPercent) || 0) : 0;
    const originalPrice = isSale
      ? (num(f.originalPrice) || (discountPercent > 0 ? Math.round(basePrice / (1 - discountPercent / 100)) : Math.round(basePrice * 1.2)))
      : basePrice;
    const payload = {
      title: f.title,
      brand: f.brand,
      category: f.category,
      price: basePrice,
      image: f.image || current?.image || '',
      isSale,
      discountPercent,
      originalPrice,
      openDate: f.openDate || '',
      closeDate: f.closeDate,
      closeTime: f.closeTime || '',
      readyEstimate: f.readyEstimate,
      description: f.description,
      dpPct: stages[0].pct,
      pelunasanDueDate: stages[stages.length - 1].date || '',
      paymentStages: stages,
      options
    };

    const serverPayload = {
      title: f.title.trim(),
      brand: f.brand,
      category: f.category,
      price: basePrice,
      image: f.image || current?.image || '',
      is_sale: isSale,
      discount_percent: discountPercent,
      original_price: originalPrice,
      tutup_po: f.closeDate ? `${f.closeDate} ${f.closeTime || '23:59'}` : null,
      estimated_shipment: f.readyEstimate,
      description: f.description,
      min_dp_percent: stages[0].pct,
      payment_stages: stages,
      paymentStages: stages,
      termin_count: stages.length,
      terminCount: stages.length,
      stock_quota: variants.reduce((sum, v) => sum + Math.max(0, num(v.quota)), 0),
      variants: variants.map((v) => ({
        id: typeof v.id === 'number' ? v.id : undefined,
        model: v.model,
        size: v.size,
        color: v.color,
        sku: v.sku,
        stock: num(v.quota) || 10,
        price: num(v.price) || basePrice
      }))
    };

    if (current) {
      const targetId = productDbId(current);
      if (!targetId) return notOnServer(`Produk ${current.title}`);
      try {
        await api.management.updateProduct(targetId, serverPayload);
      } catch (err) {
        return serverFail(err, `Menyimpan produk ${f.title}`);
      }
      commitProducts((prev) => prev.map((p) => (p.id === current.id ? { ...p, ...payload, variants } : p)));
      toast(`Produk ${f.title} berhasil diperbarui.`);
      setProductModal(null);
      return;
    }

    let created;
    try {
      created = await api.management.createProduct(serverPayload);
    } catch (err) {
      return serverFail(err, `Membuat produk ${f.title}`);
    }

    const serverProduct = created?.data;
    const serverVariants = Array.isArray(serverProduct?.variants) ? serverProduct.variants : [];
    const withServerIds = variants.map((v) => {
      const match = serverVariants.find((sv) => variantKey(sv) === variantKey(v));
      return match ? { ...v, id: match.id } : v;
    });

    const newId = uid('p');
    const newP = {
      id: newId,
      ...payload,
      backendId: serverProduct?.id ?? null,
      status: 'open',
      image: f.image || '',
      isSale,
      discountPercent,
      originalPrice,
      createdAt: todayISO(),
      variants: withServerIds
    };
    commitProducts((prev) => [newP, ...prev]);
    setProductModal(null);
    setVariantModal({ productId: newId, form: { ...blankVariantForm } });
    toast(
      withServerIds.length
        ? `Produk ${f.title} dibuat dengan ${withServerIds.length} varian dan tersimpan di database.`
        : `Produk ${f.title} dibuat dan tersimpan di database.`
    );
  };

  const saveVariant = (e) => {
    e.preventDefault();
    const f = variantModal.form;
    if (!f.color?.trim()) return toast('Warna varian wajib diisi.', 'error');
    if (f.price === '' || f.price == null) return toast('Harga varian wajib diisi.', 'error');
    const product = products.find((p) => p.id === variantModal.productId);
    const modelName = f.model?.trim() || 'Reguler';
    const price = num(f.price);
    const addon = num(f.addon);
    commitProducts((prev) =>
      prev.map((p) =>
        p.id === variantModal.productId
          ? withVariantPrice({
              ...p,
              variants: [
                ...p.variants,
                {
                  id: uid('v'),
                  color: f.color.trim(),
                  model: modelName,
                  size: f.size?.trim() || 'All Size',
                  price,
                  addon,
                  quota: num(f.quota),
                  used: 0
                }
              ]
            })
          : p
      )
    );
    setVariantModal((prev) => ({
      ...prev,
      form: { color: '', model: '', size: '', quota: '', price: '', addon: '' }
    }));
    toast('Varian baru ditambahkan.');
  };

  const updateVariantField = (productId, variantId, field, value) => {
    commitProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return withVariantPrice({
          ...p,
          variants: p.variants.map((v) => (v.id === variantId ? { ...v, [field]: num(value) } : v))
        });
      })
    );
  };

  const syncVariantsFromOptions = (product) => {
    const options = product?.options;
    if (!options?.models?.length || !options?.sizes?.length || !options?.colors?.length) {
      return toast('Opsi katalog (model/ukuran/warna) belum tersedia untuk produk ini.', 'error');
    }
    const existing = new Set(product.variants.map((v) => `${v.color}|${v.model}|${v.size}`));
    const priceForModel = (modelName) => {
      const pool = product.variants.filter((v) => v.model === modelName && hasOwnPrice(v));
      const base = pool.length ? pool : product.variants.filter(hasOwnPrice);
      return base.length ? num(base[0].price) : 0;
    };
    const generated = [];
    options.models.forEach((model) => {
      options.colors.forEach((color) => {
        options.sizes.forEach((size) => {
          const key = `${color.name}|${model.name}|${size}`;
          if (existing.has(key)) return;
          generated.push({
            id: uid('v'),
            color: color.name,
            model: model.name,
            size: String(size),
            price: priceForModel(model.name),
            addon: 0,
            quota: 10,
            used: 0
          });
        });
      });
    });
    if (!generated.length) return toast('Semua varian dari opsi katalog sudah lengkap.');
    commitProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? withVariantPrice({ ...p, variants: [...p.variants, ...generated] }) : p
      )
    );
    toast(`${generated.length} varian dilengkapi. Lengkapi harga tiap varian.`);
  };

  const pushProductVariants = async (product, nextVariants) => {
    const targetId = productDbId(product);
    if (!targetId) return notOnServer(`Produk ${product.title}`);
    try {
      await api.management.updateProduct(targetId, {
        variants: nextVariants.map((v) => ({
          id: typeof v.id === 'number' ? v.id : undefined,
          model: v.model,
          size: v.size,
          color: v.color,
          sku: v.sku,
          stock: num(v.quota) || 10,
          price: num(v.price) || num(product.price)
        }))
      });
      return true;
    } catch (err) {
      serverFail(err, `Menyimpan varian ${product.title}`);
      return false;
    }
  };

  const deleteVariant = async (productId, variantId) => {
    const p = products.find((x) => x.id === productId);
    const v = p?.variants.find((x) => x.id === variantId);
    if (num(v?.used) > 0) return toast('Varian sudah memiliki pesanan, tidak bisa dihapus.', 'error');
    const nextVariants = p.variants.filter((v2) => v2.id !== variantId);
    const ok = await pushProductVariants(p, nextVariants);
    if (!ok) return;
    commitProducts((prev) =>
      prev.map((x) => (x.id === productId ? withVariantPrice({ ...x, variants: nextVariants }) : x))
    );
    toast('Varian dihapus.');
  };

  const toggleProductStatus = async (p) => {
    const next = p.status === 'open' ? 'closed' : 'open';
    const targetId = productDbId(p);
    if (!targetId) return notOnServer(`Produk ${p.title}`);
    try {
      await api.management.updateProduct(targetId, {
        status: next === 'closed' ? 'closed_po' : 'pre_order'
      });
    } catch (err) {
      return serverFail(err, `Mengubah status ${p.title}`);
    }
    commitProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
    toast(`${p.title}: ${next === 'closed' ? 'PO ditutup.' : 'PO dibuka kembali.'}`);
  };

  const deleteProduct = (p) => {
    if (orders.some((o) => o.produkId === p.id)) {
      return toast('Produk sudah memiliki pesanan, tidak bisa dihapus. Tutup PO saja.', 'error');
    }
    setConfirmModal({
      title: 'Hapus produk',
      message: `Hapus produk "${p.title}" dari katalog? Tindakan ini tidak bisa dibatalkan.`,
      confirmLabel: 'Hapus produk',
      danger: true,
      onConfirm: async () => {
        const targetId = productDbId(p);
        if (!targetId) {
          setConfirmModal(null);
          return notOnServer(`Produk ${p.title}`);
        }
        try {
          await api.management.deleteProduct(targetId);
        } catch (err) {
          setConfirmModal(null);
          return serverFail(err, `Menghapus produk ${p.title}`);
        }
        commitProducts((prev) => prev.filter((x) => x.id !== p.id));
        setConfirmModal(null);
        toast(`Produk ${p.title} dihapus.`, 'warning');
      }
    });
  };

  const saveBrand = async (e) => {
    e.preventDefault();
    const f = brandModal.form;
    if (!f.name?.trim()) return toast('Nama brand wajib diisi.', 'error');
    const matchedSup = suppliers.find((s) => s.name === f.supplier);
    const resolvedSupplierId = dbId({ id: f.supplier_id }) || dbId(matchedSup);
    const payload = {
      ...f,
      name: f.name.trim(),
      supplier: f.supplier || matchedSup?.name || '',
      supplier_id: resolvedSupplierId || null,
      address: f.address || matchedSup?.city || '',
      discountType: f.discountType === 'nominal' ? 'nominal' : 'pct',
      discountValue: num(f.discountValue),
      feeType: f.feeType === 'nominal' ? 'nominal' : 'pct',
      discountDBAll: num(f.discountDBAll),
      discountSubDB: num(f.discountSubDB),
      discountAgen: num(f.discountAgen),
      discountReseller: num(f.discountReseller)
    };

    if (brandModal.mode === 'edit') {
      const targetBrandId = dbId(brands.find((b) => b.id === brandModal.id)) || dbId(brandModal);
      if (!targetBrandId) return notOnServer(`Brand ${payload.name}`);
      try {
        await api.management.updateBrand(targetBrandId, payload);
      } catch (err) {
        return serverFail(err, `Menyimpan brand ${payload.name}`);
      }
      commitBrands((prev) => prev.map((b) => (b.id === brandModal.id ? { ...b, ...payload } : b)));
      toast(`Brand ${payload.name} diperbarui.`);
    } else {
      let created;
      try {
        created = await api.management.createBrand(payload);
      } catch (err) {
        return serverFail(err, `Menambahkan brand ${payload.name}`);
      }
      const serverBrand = created?.data;
      const newB = mapBrandToCore({
        ...payload,
        ...(serverBrand || {}),
        id: serverBrand?.id ?? null,
        supplier: serverBrand?.supplier?.name || payload.supplier
      });
      commitBrands((prev) => [newB, ...prev]);
      toast(`Brand ${payload.name} ditambahkan.`);
    }
    setBrandModal(null);
  };

  const deleteBrand = (b) => {
    if (products.some((p) => p.brand === b.name)) {
      return toast('Brand masih dipakai produk. Pindahkan produk terlebih dahulu.', 'error');
    }
    setConfirmModal({
      title: 'Hapus brand',
      message: `Hapus brand "${b.name}"? Data akan dihapus dari server dan database.`,
      confirmLabel: 'Hapus brand',
      danger: true,
      onConfirm: async () => {
        const targetBrandId = dbId(b);
        if (!targetBrandId) {
          setConfirmModal(null);
          return notOnServer(`Brand ${b.name}`);
        }
        try {
          await api.management.deleteBrand(targetBrandId);
        } catch (err) {
          setConfirmModal(null);
          return serverFail(err, `Menghapus brand ${b.name}`);
        }
        commitBrands((prev) => prev.filter((x) => x.id !== b.id));
        setConfirmModal(null);
        toast(`Brand ${b.name} dihapus.`, 'warning');
      }
    });
  };

  const saveSupplier = async (e) => {
    e.preventDefault();
    const f = supplierModal.form;
    if (!f.name?.trim()) return toast('Nama supplier wajib diisi.', 'error');

    if (supplierModal.mode === 'edit') {
      const targetSupId = dbId(suppliers.find((s) => s.id === supplierModal.id)) || dbId(supplierModal);
      if (!targetSupId) return notOnServer(`Supplier ${f.name}`);
      try {
        await api.management.updateSupplier(targetSupId, f);
      } catch (err) {
        return serverFail(err, `Menyimpan supplier ${f.name}`);
      }
      commitSuppliers((prev) => prev.map((s) => (s.id === supplierModal.id ? { ...s, ...f } : s)));
      toast(`Supplier ${f.name} diperbarui.`);
    } else {
      let created;
      try {
        created = await api.management.createSupplier(f);
      } catch (err) {
        return serverFail(err, `Menambahkan supplier ${f.name}`);
      }
      const serverSup = created?.data;
      const newS = {
        ...mapSupplier({ ...serverSup, ...f }),
        id: serverSup?.id ? `s-${serverSup.id}` : uid('s'),
        backendId: serverSup?.id ?? null,
        createdAt: todayISO()
      };
      commitSuppliers((prev) => [newS, ...prev]);
      toast(`Supplier ${f.name} ditambahkan.`);
    }
    setSupplierModal(null);
  };

  const deleteSupplier = (s) => {
    if (brands.some((b) => b.supplier === s.name)) {
      return toast('Supplier masih terkait brand. Ubah brand terlebih dahulu.', 'error');
    }
    setConfirmModal({
      title: 'Hapus supplier',
      message: `Hapus supplier "${s.name}"? Data akan dihapus dari server dan database.`,
      confirmLabel: 'Hapus supplier',
      danger: true,
      onConfirm: async () => {
        const targetSupId = dbId(s);
        if (!targetSupId) {
          setConfirmModal(null);
          return notOnServer(`Supplier ${s.name}`);
        }
        try {
          await api.management.deleteSupplier(targetSupId);
        } catch (err) {
          setConfirmModal(null);
          return serverFail(err, `Menghapus supplier ${s.name}`);
        }
        commitSuppliers((prev) => prev.filter((x) => x.id !== s.id));
        setConfirmModal(null);
        toast(`Supplier ${s.name} dihapus.`, 'warning');
      }
    });
  };

  /* --------------------------------------- master publikasi kategori/rekening */
  // Dashboard menyimpan kategori sebagai nama, sedangkan API memakai id numerik.
  const categoryIdByName = async (name) => {
    try {
      const res = await api.management.categories();
      const row = (res?.data || []).find(
        (c) => String(c.name).toLowerCase() === String(name).toLowerCase()
      );
      return row?.id ?? null;
    } catch (err) {
      serverFail(err, 'Memuat daftar kategori');
      return null;
    }
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    const name = String(categoryModal.form.name || '').trim();
    if (!name) return toast('Nama kategori wajib diisi.', 'error');
    const duplicate = categories.some(
      (c) => c.toLowerCase() === name.toLowerCase() && (categoryModal.mode === 'create' || c !== categoryModal.id)
    );
    if (duplicate) return toast('Kategori tersebut sudah ada.', 'error');

    if (categoryModal.mode === 'edit') {
      const oldName = categoryModal.id;
      const targetId = await categoryIdByName(oldName);
      if (!targetId) return notOnServer(`Kategori ${oldName}`);
      try {
        await api.management.updateCategory(targetId, { name });
      } catch (err) {
        return serverFail(err, `Menyimpan kategori ${name}`);
      }
      commitCategories((prev) => prev.map((c) => (c === oldName ? name : c)));
      commitProducts((prev) => prev.map((p) => (p.category === oldName ? { ...p, category: name } : p)));
      toast(`Kategori diganti menjadi ${name}.`);
    } else {
      try {
        await api.management.createCategory({ name });
      } catch (err) {
        return serverFail(err, `Menambahkan kategori ${name}`);
      }
      commitCategories((prev) => [...prev, name]);
      toast(`Kategori ${name} ditambahkan.`);
    }
    setCategoryModal(null);
  };

  const deleteCategory = (name) => {
    if (products.some((p) => p.category === name)) {
      return toast('Kategori masih dipakai produk. Pindahkan produk terlebih dahulu.', 'error');
    }
    setConfirmModal({
      title: 'Hapus kategori',
      message: `Hapus kategori "${name}"? Kategori akan hilang dari filter toko.`,
      confirmLabel: 'Hapus kategori',
      danger: true,
      onConfirm: async () => {
        const targetId = await categoryIdByName(name);
        if (!targetId) {
          setConfirmModal(null);
          return notOnServer(`Kategori ${name}`);
        }
        try {
          await api.management.deleteCategory(targetId);
        } catch (err) {
          setConfirmModal(null);
          return serverFail(err, `Menghapus kategori ${name}`);
        }
        commitCategories((prev) => prev.filter((c) => c !== name));
        setConfirmModal(null);
        toast(`Kategori ${name} dihapus.`, 'warning');
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
      commitBankAccounts((prev) => [
        ...prev,
        {
          ...f,
          type,
          purpose,
          brands: brandsList,
          id: row?.id != null ? String(row.id) : uid('bk'),
          backendId: row?.id ?? null,
          active: f.active !== false
        }
      ]);
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
      const targetId = dbId(couriers.find((c) => c.id === courierModal.id)) || dbId(courierModal);
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
      const targetId = dbId(current) || dbId(mitraModal);
      if (!targetId) return notOnServer(`Mitra ${current?.name || f.name}`);
      try {
        await api.management.updateUser(targetId, {
          nama: f.name.trim(),
          phone: f.phone,
          city: f.city,
          level: f.level || 'reseller'
        });
      } catch (err) {
        return serverFail(err, `Memperbarui mitra ${f.name}`);
      }
      commitMitra((prev) => prev.map((m) => (m.id === mitraModal.id ? { ...m, ...f } : m)));
      toast(`Mitra ${f.name} diperbarui.`);
      setMitraModal(null);
      return;
    }

    const tempPassword = `Mitra#${Math.floor(1000 + Math.random() * 9000)}`;
    let created;
    try {
      created = await api.management.createUser({
        nama: f.name.trim(),
        email: String(f.email || '').trim(),
        role: 'mitra',
        level: String(f.level || 'reseller').toLowerCase(),
        phone: f.phone,
        city: f.city,
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
    toast(`Akun mitra ${f.name} tersimpan di database.`);
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
    toast(`${m.name} ${m.active ? 'dinonaktifkan' : 'diaktifkan'}.`);
  };

  const deleteMitra = (m) => {
    setConfirmModal({
      title: 'Hapus Akun Mitra',
      message: `Hapus mitra "${m.name}"? Akses login dan data akun akan dihapus dari sistem dan database.`,
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
    const tempPassword = `Tim#${Math.floor(1000 + Math.random() * 9000)}`;
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
    toast(`Akun tim ${f.name} tersimpan di database.`);
  };

  const toggleTeam = async (u) => {
    if (u.role === 'owner') return toast('Akun owner tidak dapat dinonaktifkan dari portal purchasing.', 'error');
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

  const handleProofFile = (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast('Ukuran berkas maksimal 2 MB.', 'error');
    const reader = new FileReader();
    reader.onload = () =>
      setProofForm((prev) => ({ ...prev, proof: String(reader.result), proofFile: file }));
    reader.readAsDataURL(file);
  };

  const resetProofForm = () =>
    setProofForm((prev) => ({
      ...prev,
      nominal: '',
      invoice: '',
      refNo: '',
      proof: '',
      proofFile: null
    }));

  const submitProofForm = async (e) => {
    e.preventDefault();
    const f = proofForm;
    const nominal = num(f.nominal);
    if (!f.mitraId) return toast('Pilih mitra.', 'error');
    if (!nominal) return toast('Nominal harus lebih dari 0.', 'error');
    if (f.kind !== 'Deposit' && !f.invoice) return toast('Pilih invoice terkait.', 'error');
    if (!f.proofFile) return toast('Berkas bukti transfer wajib dipilih.', 'error');

    const m = mitra.find((x) => x.id === f.mitraId);
    if (!m) return toast('Mitra tidak ditemukan.', 'error');
    const mitraDbId = dbId(m);
    if (!mitraDbId) return notOnServer(`Mitra ${m.name}`);
    const bank = bankAccounts.find((b) => b.id === f.bankId);

    let proofPath = '';
    try {
      const uploaded = await api.management.uploadFile(f.proofFile, 'proof');
      proofPath = uploaded?.data?.path || '';
    } catch (err) {
      return serverFail(err, 'Mengunggah bukti transfer');
    }
    if (!proofPath) return toast('Bukti transfer tidak tersimpan di server.', 'error');

    if (f.kind === 'Deposit') {
      let created;
      try {
        created = await api.management.createDeposit({
          user_id: mitraDbId,
          bank_account_id: dbId(bank) || null,
          amount: nominal,
          proof_url: proofPath,
          description: f.refNo ? `Ref ${f.refNo} — input purchasing` : 'Input manual admin purchasing'
        });
      } catch (err) {
        return serverFail(err, `Deposit ${m.name}`);
      }
      const row = created?.data;
      commitDeposits((prev) => [
        {
          id: row?.id != null ? `dep-${row.id}` : uid('dep'),
          backendId: row?.id ?? null,
          mitraId: m.id,
          mitraName: m.name,
          date: f.date,
          nominal,
          bank: row?.bank || bank?.bank || '-',
          accountNo: row?.bank_account || '',
          proof: mediaUrl(row?.proof_url || proofPath),
          status: PAY.MENUNGGU,
          verifiedBy: '',
          note: row?.description || f.refNo || 'Input manual admin purchasing'
        },
        ...prev
      ]);
      toast(`Deposit ${rp(nominal)} ${m.name} tersimpan dan menunggu verifikasi finance.`);
      resetProofForm();
      return;
    }

    const o = orders.find((x) => x.invoice === f.invoice);
    if (!o) return toast('Invoice tidak ditemukan.', 'error');
    const statusKey = { DP: 'dpStatus', Pelunasan: 'pelunasanStatus', Ongkir: 'ongkirStatus' }[f.kind];
    const proofKey = { DP: 'dpProof', Pelunasan: 'pelunasanProof', Ongkir: 'ongkirProof' }[f.kind];

    try {
      await api.management.createPayment({
        invoice_number: o.invoiceNumber || '',
        order_number: o.invoice,
        installment_id:
          f.kind === 'DP' ? o.dpInstallmentId || null : f.kind === 'Pelunasan' ? o.pelunasanInstallmentId || null : null,
        stage: f.kind,
        amount: nominal,
        proof_url: proofPath
      });
    } catch (err) {
      return serverFail(err, `Bukti ${f.kind} ${o.invoice}`);
    }

    commitOrders((prev) =>
      prev.map((x) =>
        x.invoice === o.invoice ? { ...x, [statusKey]: PAY.MENUNGGU, [proofKey]: mediaUrl(proofPath) } : x
      )
    );
    toast(`Bukti ${f.kind} ${o.invoice} tersimpan. Menunggu verifikasi finance.`);
    resetProofForm();
  };

  const reviewPR = async (req, decision, note) => {
    const targetId = dbId(req);
    if (!targetId) return notOnServer(`Pengajuan bayar ${req.code}`);
    try {
      await api.management.updatePaymentRequest(targetId, {
        marketing_decision: decision,
        marketing_note: note || null
      });
    } catch (err) {
      return serverFail(err, `Review pengajuan ${req.code}`);
    }
    commitPaymentRequests((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? {
              ...r,
              status: decision === 'ACC' ? PREQ.APPROVAL_OWNER : PREQ.REJECTED,
              marketing: { by: me.name, at: todayISO(), note, decision }
            }
          : r
      )
    );
    setPrDetailId(null);
    toast(
      decision === 'ACC'
        ? `${req.code} disetujui purchasing dan diteruskan ke owner.`
        : `${req.code} ditolak.`,
      decision === 'ACC' ? 'success' : 'warning'
    );
  };

  const saveSettingsForm = async (e) => {
    e.preventDefault();
    let saved;
    try {
      saved = await api.management.updateSettings(settingsForm);
    } catch (err) {
      return serverFail(err, 'Menyimpan pengaturan toko');
    }
    commitSettings((prev) => ({ ...prev, ...(saved?.data || {}), ...settingsForm }));
    toast('Pengaturan purchasing tersimpan di database.');
  };

  const exportOrders = () => {
    downloadCSV(`rekap_pesanan_${todayISO()}.csv`, [
      ['Invoice', 'Tanggal', 'Mitra', 'Level', 'Brand', 'Produk', 'Varian', 'Qty', 'Subtotal', 'DP', 'Status DP', 'Pelunasan', 'Status Pelunasan', 'Ongkir', 'Status Ongkir', 'Tahap'],
      ...filteredOrders.map((o) => [
        o.invoice,
        o.date,
        o.mitraName,
        o.level,
        o.brand,
        o.produk,
        o.variant,
        o.qty,
        o.subtotal,
        o.dpNominal,
        o.dpStatus,
        o.pelunasanNominal,
        o.pelunasanStatus,
        o.ongkir,
        o.ongkirStatus,
        stageMeta(orderStage(o)).label
      ])
    ]);
    toast('Rekap pesanan diunduh.');
  };

  const exportProducts = () => {
    downloadCSV(`rekap_checkout_produk_${todayISO()}.csv`, [
      ['Produk', 'Brand', 'Harga', 'Invoice', 'Qty Checkout', 'Omzet', 'Piutang', 'Kuota', 'Terpakai', 'Sisa', 'Status PO'],
      ...productSummary.map((p) => [
        p.title,
        p.brand,
        p.price,
        p.invoiceCount,
        p.qtySold,
        p.omzet,
        p.piutang,
        p.quota,
        p.used,
        p.remaining,
        p.status
      ])
    ]);
    toast('Rekap checkout produk diunduh.');
  };

  const goTo = (menu) => setActiveMenu(menu);

  const defaultCloseDate = addDays(todayISO(), 14);
  const blankProduct = {
    title: '',
    brand: brands[0]?.name || '',
    category: categories[0] || '',
    openDate: todayISO(),
    closeDate: defaultCloseDate,
    closeTime: '23:59',
    readyEstimate: '45 hari setelah PO tutup',
    description: '',
    image: '',
    isSale: false,
    discountPercent: 15,
    originalPrice: '',
    terminCount: 3,
    stages: makeStages(3, defaultCloseDate),
    modelsText: '',
    sizesText: 'XS, S, M, L, XL, XXL, 3L',
    colorsText: ''
  };
  const blankBrand = {
    name: '',
    supplier: suppliers[0]?.name || '',
    address: '',
    discountType: 'pct',
    discountValue: 30,
    feeType: 'pct',
    discountDBAll: 30,
    discountSubDB: 25,
    discountAgen: 20,
    discountReseller: 15
  };
  const blankSupplier = { name: '', city: '', contact: '', phone: '', note: '' };  const blankMitra = { name: '', email: '', level: 'Agen', phone: '', city: '', address: '', active: true };

  const brandFormFrom = (b) => ({
    ...b,
    discountType: b.discountType || 'pct',
    discountValue: b.discountValue ?? b.discountDBAll ?? 0,
    feeType: b.feeType || 'pct'
  });

  const feeBadges = useMemo(() => {
    const keys = ['discountDBAll', 'discountSubDB', 'discountAgen', 'discountReseller'];
    const pctBrands = brands.filter((b) => feeTypeFor(b) !== 'nominal');
    return {
      mixed: brands.some((b) => feeTypeFor(b) === 'nominal'),
      values: keys.map((key) =>
        pctBrands.length
          ? Math.round(pctBrands.reduce((sum, b) => sum + num(b[key]), 0) / pctBrands.length)
          : 0
      )
    };
  }, [brands]);

  const blankVariantForm = { color: '', model: '', size: '', quota: '', price: '', addon: '' };

  const openVariantModal = (product) =>
    setVariantModal({ productId: product.id, form: { ...blankVariantForm } });

  const openEditProduct = (p) => {
    const stages = stagesFromProduct(p);
    setProductModal({
      mode: 'edit',
      id: p.id,
      product: p,
      form: {
        title: p.title,
        brand: p.brand,
        category: p.category,
        openDate: p.openDate || '',
        closeDate: p.closeDate,
        closeTime: p.closeTime || '',
        readyEstimate: p.readyEstimate,
        description: p.description,
        image: p.image || '',
        isSale: !!p.isSale,
        discountPercent: p.discountPercent || 0,
        originalPrice: p.originalPrice || '',
        terminCount: stages.length === 2 ? 2 : 3,
        stages,
        paymentStages: stages,
        variants: p.variants || [],
        options: p.options,
        modelsText: (p.options?.models || []).map((m) => m.name).join('\n'),
        sizesText: (p.options?.sizes || []).join(', '),
        colorsText: (p.options?.colors || []).map((c) => c.name).join(', ')
      }
    });
  };

  const setTerminCount = (count) => {
    setProductModal((prev) => {
      if (!prev) return prev;
      const kept = prev.form.stages || [];
      const base = isoDateOf(kept[0]?.date) || prev.form.closeDate || todayISO();
      return {
        ...prev,
        form: {
          ...prev.form,
          terminCount: count,
          stages: (TERMIN_PCTS[count] || TERMIN_PCTS[3]).map((pct, index) => ({
            label: stageLabelOf(index, count),
            pct,
            date: isoDateOf(kept[index]?.date) || addDays(base, index * 30)
          }))
        }
      };
    });
  };

  const changeStage = (index, patch) => {
    setProductModal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        form: {
          ...prev.form,
          stages: (prev.form.stages || []).map((stage, i) => (i === index ? { ...stage, ...patch } : stage))
        }
      };
    });
  };

  const filteredPr = paymentRequests
    .filter((r) => prFilter === 'all' || r.status === prFilter)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const filteredTrash = deletedOrders.filter((o) => {
    const q = trashSearch.trim().toLowerCase();
    return !q || `${o.invoice} ${o.mitraName} ${o.produk}`.toLowerCase().includes(q);
  });

  const pendingProofList = useMemo(() => {
    const rows = [];
    orders.forEach((o) => {
      if (o.dpStatus === PAY.MENUNGGU) {
        rows.push({ key: `${o.invoice}-DP`, invoice: o.invoice, mitra: o.mitraName, kind: 'DP', amount: o.dpNominal, proof: o.dpProof, date: o.date, by: o.createdBy });
      }
      if (o.pelunasanStatus === PAY.MENUNGGU) {
        rows.push({ key: `${o.invoice}-Pelunasan`, invoice: o.invoice, mitra: o.mitraName, kind: 'Pelunasan', amount: o.pelunasanNominal, proof: o.pelunasanProof, date: o.date, by: o.createdBy });
      }
      if (o.ongkirStatus === PAY.MENUNGGU) {
        rows.push({ key: `${o.invoice}-Ongkir`, invoice: o.invoice, mitra: o.mitraName, kind: 'Ongkir', amount: o.ongkir, proof: o.ongkirProof, date: o.date, by: o.createdBy });
      }
    });
    deposits
      .filter((d) => d.status === PAY.MENUNGGU)
      .forEach((d) => rows.push({ key: d.id, invoice: 'Deposit', mitra: d.mitraName, kind: 'Deposit', amount: d.nominal, proof: d.proof, date: d.date, by: 'Input admin' }));
    return rows;
  }, [orders, deposits]);

  const prCounts = useMemo(() => {
    const counts = { all: paymentRequests.length };
    Object.values(PREQ).forEach((status) => {
      counts[status] = paymentRequests.filter((r) => r.status === status).length;
    });
    return counts;
  }, [paymentRequests]);

  const productFiltered = productSummary.filter((p) => rekapBrand === 'all' || p.brand === rekapBrand);

  const catalogCategories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  const catalogCounts = useMemo(() => {
    const list = productSummary.filter((p) => {
      if (catalogBrand !== 'all' && p.brand !== catalogBrand) return false;
      if (catalogCategory !== 'all' && p.category !== catalogCategory) return false;
      return true;
    });
    return list.reduce(
      (acc, p) => {
        acc.all += 1;
        if (p.isSale) acc.sale += 1;
        if (p.status === 'closed') acc.closed += 1;
        else {
          acc.open += 1;
          if (diffDays(p.closeDate, todayISO()) <= 0) acc.closing += 1;
        }
        return acc;
      },
      { all: 0, open: 0, closing: 0, closed: 0, sale: 0 }
    );
  }, [productSummary, catalogBrand, catalogCategory]);

  const catalogFiltered = useMemo(() => {
    return productSummary
      .filter((p) => {
        if (catalogBrand !== 'all' && p.brand !== catalogBrand) return false;
        if (catalogCategory !== 'all' && p.category !== catalogCategory) return false;
        if (catalogStatus === 'open' && p.status !== 'open') return false;
        if (catalogStatus === 'closed' && p.status !== 'closed') return false;
        if (catalogStatus === 'closing' && (p.status !== 'open' || diffDays(p.closeDate, todayISO()) > 0)) return false;
        if (catalogStatus === 'sale' && !p.isSale) return false;
        const q = catalogSearch.trim().toLowerCase();
        if (!q) return true;
        return [p.title, p.brand, p.category, p.sku].filter(Boolean).join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (catalogSort === 'close_asc') {
          return String(a.closeDate || '').localeCompare(String(b.closeDate || ''));
        }
        if (catalogSort === 'sales_desc') {
          return num(b.used) - num(a.used);
        }
        if (catalogSort === 'price_asc') {
          return num(a.price) - num(b.price);
        }
        if (catalogSort === 'price_desc') {
          return num(b.price) - num(a.price);
        }
        return 0;
      });
  }, [productSummary, catalogBrand, catalogCategory, catalogStatus, catalogSearch, catalogSort]);

  const isCatalogFilterActive = Boolean(
    catalogBrand !== 'all' ||
    catalogCategory !== 'all' ||
    catalogStatus !== 'all' ||
    catalogSearch.trim() ||
    catalogSort !== 'default'
  );

  const handleResetCatalogFilter = () => {
    setCatalogSearch('');
    setCatalogStatus('all');
    setCatalogBrand('all');
    setCatalogCategory('all');
    setCatalogSort('default');
  };

  const productFormStages = productModal
    ? (productModal.form.stages || []).slice(0, productModal.form.terminCount === 2 ? 2 : 3)
    : [];
  const productFormPct = productFormStages.reduce((sum, stage) => sum + num(stage.pct), 0);

  /* ------------------------------------------------------------------ render */
  return (
    <>
      <DashboardShell
        accent={accent}
        menus={menus}
        activeMenu={activeMenu}
        onNavigate={setActiveMenu}
        portalLabel="Admin Purchasing"
        portalSub="AfatharShop · Katalog & Penjualan PO"
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
              title="Dashboard Purchasing"
              desc={PAGE_DESC}
              badge={<Badge tone="red">{roleLabel('marketing')}</Badge>}
              actions={
                <>
                  <Button variant="outline" icon="download" onClick={exportProducts}>
                    Rekap Produk
                  </Button>
                  <Button icon="plus" onClick={() => goTo('tambah_pesanan')}>
                    Input Pesanan
                  </Button>
                </>
              }
            />

            <div className="space-y-2">
              <PoClosingReminder products={products} onAction={() => goTo('produk')} actionLabel="Kelola Katalog" />
              <TerminDueReminder products={products} onAction={() => goTo('produk')} actionLabel="Kelola Termin" />
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard
                label="Pesanan Masuk"
                value={pendingAcc.length}
                sub="Menunggu ACC purchasing"
                tone="amber"
                icon="clock"
                badge={pendingAcc.length > 0 ? <Badge tone="amber">Perlu ACC</Badge> : null}
                onClick={() => goTo('acc_pesanan')}
              />
              <MetricCard
                label="Pesanan Aktif"
                value={activeOrders.length}
                sub={`${orders.length} total pesanan`}
                tone="blue"
                icon="box"
                hint="Belum selesai / belum ditolak"
              />
              <MetricCard
                label="Omzet PO"
                value={rp(omzet)}
                sub={`DP terkumpul ${rp(dpCollected)}`}
                tone="emerald"
                icon="wallet"
                hint={`${sumBy(orders, (o) => o.qty)} pcs total checkout`}
              />
              <MetricCard
                label="Mitra Aktif"
                value={mitra.filter((m) => m.active).length}
                sub={`${products.filter((p) => p.status === 'open').length} PO sedang dibuka`}
                tone="violet"
                icon="users"
                hint="Mitra dengan akses checkout"
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card
                title="Perlu Tindakan"
                subtitle="Antrean yang menunggu admin purchasing"
                className="lg:col-span-2"
                action={<Badge tone="amber">{pendingAcc.length + marketingPR.length} item</Badge>}
              >
                <div className="divide-y divide-gray-100">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-gray-800">Pesanan menunggu ACC</p>
                      <button type="button" onClick={() => goTo('acc_pesanan')} className={`text-[10px] font-bold ${accent.text} hover:underline`}>
                        Lihat semua
                      </button>
                    </div>
                    {pendingAcc.slice(0, 4).map((o) => (
                      <div key={o.invoice} className="flex items-center justify-between gap-2 py-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-gray-900">
                            {o.invoice} <span className="font-normal text-gray-500">· {o.mitraName}</span>
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {o.produk} {o.variant} · {o.qty} pcs · {rp(o.subtotal)}
                          </p>
                        </div>
                        <Button size="xs" onClick={() => setDetailInvoice(o.invoice)}>
                          Review
                        </Button>
                      </div>
                    ))}
                    {pendingAcc.length === 0 && (
                      <p className="text-[11px] text-gray-400 py-2">Tidak ada pesanan menunggu ACC.</p>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-gray-800">Pengajuan pembayaran perlu review</p>
                      <button type="button" onClick={() => goTo('pengajuan')} className={`text-[10px] font-bold ${accent.text} hover:underline`}>
                        Lihat semua
                      </button>
                    </div>
                    {marketingPR.slice(0, 3).map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 py-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-gray-900">
                            {r.code} <span className="font-normal text-gray-500">· {r.purpose}</span>
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {rp(r.amount)} · diajukan {r.createdBy}
                          </p>
                        </div>
                        <Button size="xs" variant="outline" onClick={() => { setPrDetailId(r.id); goTo('pengajuan'); }}>
                          Review
                        </Button>
                      </div>
                    ))}
                    {marketingPR.length === 0 && (
                      <p className="text-[11px] text-gray-400 py-2">Tidak ada pengajuan yang perlu direview.</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card title="Pipeline Pesanan" subtitle="Posisi seluruh pesanan saat ini">
                <div className="p-4 space-y-2.5">
                  {stageMetaStages.map((s) => {
                    const count = stageCounts[s.id] || 0;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setStageFilter(s.id);
                          goTo('pesanan');
                        }}
                        className="w-full flex items-center gap-2 group"
                      >
                        <span className="text-[10px] text-gray-500 w-24 text-left shrink-0">{s.label}</span>
                        <span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <span
                            className={`block h-full rounded-full ${barTone[stageMeta(s.id).tone] || 'bg-gray-400'}`}
                            style={{ width: `${Math.min(100, (count / Math.max(1, orders.length)) * 100)}%` }}
                          />
                        </span>
                        <span className="text-[10px] font-bold text-gray-700 w-6 text-right">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card
                title="Rekap Checkout Teratas"
                subtitle="Produk dengan kontribusi omzet terbesar"
                action={
                  <button type="button" onClick={() => goTo('rekap_produk')} className={`text-[10px] font-bold ${accent.text} hover:underline`}>
                    Rekap lengkap
                  </button>
                }
              >
                <TableWrap fluid>
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className={TH}>Produk</th>
                      <th className={`${TH} text-right`}>Qty</th>
                      <th className={`${TH} text-right`}>Omzet</th>
                      <th className={`${TH} text-right hidden xl:table-cell`}>Sisa Kuota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productSummary
                      .slice()
                      .sort((a, b) => b.qtySold - a.qtySold)
                      .slice(0, 5)
                      .map((p) => (
                        <tr key={p.id}>
                          <td className={TD}>
                            <p className="font-semibold text-gray-900">{p.title}</p>
                            <p className="text-[10px] text-gray-400">
                              {p.brand} · {p.invoiceCount} invoice
                            </p>
                          </td>
                          <td className={`${TD} text-right font-semibold`}>{p.qtySold}</td>
                          <td className={`${TD} text-right font-bold text-gray-900 whitespace-nowrap`}>{rp(p.omzet)}</td>
                          <td className={`${TD} text-right hidden xl:table-cell`}>
                            <Badge tone={p.remaining === 0 ? 'red' : p.remaining < 10 ? 'amber' : 'emerald'}>
                              {p.remaining} pcs
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </TableWrap>
              </Card>

              <Card title="Katalog Segera Tutup" subtitle="PO yang berakhir dalam 10 hari">
                <div className="divide-y divide-gray-100">
                  {products
                    .filter((p) => p.status === 'open')
                    .sort((a, b) => String(a.closeDate).localeCompare(String(b.closeDate)))
                    .slice(0, 5)
                    .map((p) => {
                      const d = diffDays(p.closeDate, todayISO());
                      const used = sumBy(p.variants, (v) => v.used);
                      const quota = sumBy(p.variants, (v) => v.quota);
                      return (
                        <div key={p.id} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-semibold text-gray-900">{p.title}</p>
                              <p className="text-[10px] text-gray-400">
                                {p.brand} · tutup {fmtDate(p.closeDate)}
                              </p>
                            </div>
                            <Badge tone={d <= 0 ? 'red' : d <= 3 ? 'amber' : 'emerald'}>
                              {d < 0 ? 'Ditutup' : d === 0 ? 'Hari ini' : `${d} hari`}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <ProgressBar value={used} max={quota || 1} tone={used / (quota || 1) > 0.85 ? 'red' : 'emerald'} className="flex-1" />
                            <span className="text-[10px] text-gray-400">
                              {used}/{quota} pcs
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {products.filter((p) => p.status === 'open').length === 0 && (
                    <EmptyState title="Tidak ada PO aktif" desc="Buka PO baru dari menu katalog produk." icon="box" />
                  )}
                </div>
              </Card>
            </div>

            <Card
              title="Pesanan Terbaru"
              subtitle="6 pesanan terakhir dari tim & checkout mitra"
              action={
                <Button size="xs" variant="outline" onClick={() => goTo('pesanan')}>
                  Semua pesanan
                </Button>
              }
            >
              <OrdersTable
                orders={orders.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6)}
                onOpen={(o) => setDetailInvoice(o.invoice)}
                renderActions={(o) => (
                  <>
                    {o.marketingStatus === MKT.PENDING ? (
                      <Button size="xs" onClick={() => approveOrder(o)}>
                        ACC
                      </Button>
                    ) : (
                      <Button size="xs" variant="outline" onClick={() => setDetailInvoice(o.invoice)}>
                        Detail
                      </Button>
                    )}
                  </>
                )}
              />
            </Card>
          </>
        )}

        {/* ========================== ACC PESANAN =========================== */}
        {activeMenu === 'acc_pesanan' && (
          <>
            <PageHead
              title="ACC Pesanan Masuk"
              desc="Pesanan dari tim maupun checkout mitra harus di-ACC sebelum mitra dapat membayar DP. Periksa varian, kuota, harga, dan catatan revisi."
              badge={<Badge tone="amber">{pendingAcc.length} menunggu</Badge>}
              actions={
                <Button
                  icon="check"
                  disabled={accSelected.length === 0}
                  onClick={approveMany}
                >
                  ACC terpilih ({accSelected.length})
                </Button>
              }
            />

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px] text-amber-900 flex items-start gap-2">
              <Icon name="alert" className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                Menolak pesanan akan mengembalikan kuota varian. Setelah ACC, pesanan masuk tahap pembayaran DP dan
                diproses oleh admin finance.
              </p>
            </div>

            <Card
              title={`Antrean Persetujuan (${filteredAcc.length})`}
              action={
                <SearchBox
                  value={accSearch}
                  onChange={setAccSearch}
                  placeholder="Cari invoice / mitra / produk..."
                  className="w-64"
                />
              }
            >
              <TableWrap fluid>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 w-8">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua"
                        checked={filteredAcc.length > 0 && filteredAcc.every((o) => accSelected.includes(o.invoice))}
                        onChange={(e) =>
                          setAccSelected(e.target.checked ? filteredAcc.map((o) => o.invoice) : [])
                        }
                        className="accent-[#6B1416]"
                      />
                    </th>
                    <th className={TH}>Invoice / Tanggal</th>
                    <th className={TH}>Mitra</th>
                    <th className={TH}>Item & Varian</th>
                    <th className={`${TH} text-right hidden xl:table-cell`}>Qty</th>
                    <th className={`${TH} text-right`}>Nilai</th>
                    <th className={`${TH} hidden xl:table-cell`}>Catatan</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAcc.map((o) => (
                    <tr key={o.invoice} className="hover:bg-gray-50/70">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${o.invoice}`}
                          checked={accSelected.includes(o.invoice)}
                          onChange={(e) =>
                            setAccSelected((prev) =>
                              e.target.checked ? [...prev, o.invoice] : prev.filter((x) => x !== o.invoice)
                            )
                          }
                          className="accent-[#6B1416]"
                        />
                      </td>
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => setDetailInvoice(o.invoice)}
                          className="font-bold text-sky-700 hover:underline whitespace-nowrap"
                        >
                          {o.invoice}
                        </button>
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(o.date)}</p>
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-gray-900">{o.mitraName}</p>
                        <div className="mt-0.5 flex items-center gap-1">
                          <Badge tone={levelTone(o.level)}>{o.level}</Badge>
                          <span className="text-[10px] text-gray-400">{o.phone}</span>
                        </div>
                      </td>
                      <td className={TD}>
                        <p className="font-medium text-gray-800">{o.produk}</p>
                        <p className="text-[10px] text-gray-400">
                          {o.variant} · {o.brand}
                        </p>
                        {o.revisionNote && (
                          <span className="inline-flex mt-1">
                            <Badge tone="amber">Revisi</Badge>
                          </span>
                        )}
                      </td>
                      <td className={`${TD} text-right font-semibold hidden xl:table-cell`}>{o.qty}</td>
                      <td className={`${TD} text-right whitespace-nowrap`}>
                        <p className="font-bold text-gray-900">{rp(o.subtotal)}</p>
                        <p className="text-[10px] text-gray-400">DP {rp(o.dpNominal)}</p>
                      </td>
                      <td className={`${TD} max-w-[180px] hidden xl:table-cell`}>
                        {o.revisionNote ? (
                          <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 leading-snug">
                            {o.revisionNote}
                          </p>
                        ) : (
                          <p className="text-[10px] text-gray-400">{o.notes || '—'}</p>
                        )}
                      </td>
                      <td className={`${TD} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="xs" variant="outline" onClick={() => setDetailInvoice(o.invoice)}>
                            Detail
                          </Button>
                          <Button
                            size="xs"
                            variant="dangerOutline"
                            onClick={() =>
                              setReasonModal({
                                title: 'Tolak pesanan',
                                subtitle: `${o.invoice} · ${o.mitraName}`,
                                label: 'Alasan penolakan',
                                placeholder: 'Contoh: kuota varian habis / harga tidak sesuai',
                                confirmLabel: 'Tolak pesanan',
                                danger: true,
                                onSubmit: (reason) => {
                                  rejectOrder(o, reason);
                                  setReasonModal(null);
                                }
                              })
                            }
                          >
                            Tolak
                          </Button>
                          <Button size="xs" onClick={() => approveOrder(o)}>
                            ACC
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAcc.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState
                          title="Tidak ada pesanan menunggu ACC"
                          desc="Semua pesanan masuk sudah diproses. Antrean baru akan muncul di sini."
                          icon="check"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </TableWrap>
            </Card>
          </>
        )}

        {/* ============================ LIST PESANAN ========================= */}
        {activeMenu === 'pesanan' && (
          <>
            <PageHead
              title="List Pesanan PO"
              desc="Pantau seluruh pesanan lintas tahap. Purchasing mengelola ACC pesanan, update produksi, dan notifikasi Ready."
              badge={<Badge tone="gray">{filteredOrders.length} pesanan</Badge>}
              actions={
                <>
                  <Button variant="outline" icon="download" onClick={exportOrders}>
                    Ekspor CSV
                  </Button>
                  <Button icon="plus" onClick={() => goTo('tambah_pesanan')}>
                    Input Pesanan
                  </Button>
                </>
              }
            />

            <StageTabs orders={orders} value={stageFilter} onChange={setStageFilter} />

            <Card>
              <div className="p-3.5 border-b border-gray-100 flex flex-wrap items-center gap-2">
                <SearchBox
                  value={listSearch}
                  onChange={setListSearch}
                  placeholder="Cari invoice, mitra, produk..."
                  className="w-full sm:w-64"
                />
                <Select value={listBrand} onChange={(e) => setListBrand(e.target.value)} className="w-auto">
                  <option value="all">Semua Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </Select>
                <Select value={listLevel} onChange={(e) => setListLevel(e.target.value)} className="w-auto">
                  <option value="all">Semua Level</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
                <span className="text-[11px] text-gray-400 ml-auto">
                  {listPag.total} data ditemukan
                </span>
              </div>

              <OrdersTable
                orders={listPag.rows}
                onOpen={(o) => setDetailInvoice(o.invoice)}
                renderActions={(o) => {
                  const st = orderStage(o);
                  return (
                    <>
                      {o.marketingStatus === MKT.PENDING && (
                        <>
                          <Button size="xs" onClick={() => approveOrder(o)}>
                            ACC
                          </Button>
                          <Button size="xs" variant="dangerOutline" onClick={() => {
                            setReasonModal({
                              title: 'Tolak pesanan',
                              subtitle: `${o.invoice} · ${o.mitraName}`,
                              label: 'Alasan penolakan',
                              confirmLabel: 'Tolak pesanan',
                              danger: true,
                              onSubmit: (reason) => {
                                rejectOrder(o, reason);
                                setReasonModal(null);
                              }
                            });
                          }}>
                            Tolak
                          </Button>
                        </>
                      )}
                      {o.marketingStatus === MKT.TOLAK && (
                        <Button size="xs" variant="outline" onClick={() => reopenOrder(o)}>
                          Buka lagi
                        </Button>
                      )}
                      {o.marketingStatus !== MKT.TOLAK && st === 'produksi' && (
                        <Button
                          size="xs"
                          variant="soft"
                          onClick={() =>
                            setProduction(o, o.productionStatus === PROD.QUEUE ? PROD.RUN : PROD.READY)
                          }
                        >
                          {o.productionStatus === PROD.QUEUE ? 'Mulai Produksi' : 'Set Ready'}
                        </Button>
                      )}
                      {st === 'alamat' && (
                        <Button size="xs" variant="outline" icon="chat" onClick={() => openWA(o, 'ready')}>
                          Notif Ready
                        </Button>
                      )}
                      <Button size="xs" variant="outline" onClick={() => setDetailInvoice(o.invoice)}>
                        Detail
                      </Button>
                      <button
                        type="button"
                        onClick={() => askDelete(o)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Hapus pesanan"
                      >
                        <Icon name="trash" className="w-3.5 h-3.5" />
                      </button>
                    </>
                  );
                }}
              />
              <Pagination
                page={listPag.page}
                pageSize={listPag.pageSize}
                total={listPag.total}
                onPageChange={listPag.setPage}
                onPageSizeChange={listPag.setPageSize}
              />
            </Card>
          </>
        )}

        {/* =========================== TAMBAH PESANAN ======================= */}
        {activeMenu === 'tambah_pesanan' && (
          <>
            <PageHead
              title="Input Pesanan Manual"
              desc="Buat invoice atas nama mitra. Harga dan diskon dihitung otomatis berdasarkan brand dan level mitra."
              badge={<Badge tone="gray">Admin Purchasing</Badge>}
            />

            <div className="grid lg:grid-cols-3 gap-4 items-start">
              <Card title="Form Pesanan" className="lg:col-span-2">
                <div className="p-4 sm:p-5 grid sm:grid-cols-2 gap-3">
                  <Field label="Mitra" required className="sm:col-span-2">
                    <Select
                      value={draft.mitraId}
                      onChange={(e) => setDraft({ ...draft, mitraId: e.target.value })}
                    >
                      <option value="">— Pilih mitra —</option>
                      {mitra
                        .filter((m) => m.active)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} · {m.level} · {m.city}
                          </option>
                        ))}
                    </Select>
                  </Field>

                  <Field label="Brand" required>
                    <Select
                      value={draftPreview.brand?.name || ''}
                      onChange={(e) => {
                        const b = brands.find((x) => x.name === e.target.value);
                        const first = products.find((p) => p.brand === b?.name);
                        const firstStage = Array.isArray(first?.paymentStages) ? first.paymentStages[0] : null;
                        setDraft({
                          ...draft,
                          produkId: first?.id || '',
                          variantId: '',
                          dpPct: firstStage ? num(firstStage.pct ?? firstStage.percent) : draft.dpPct
                        });
                      }}
                    >
                      <option value="">— Pilih brand —</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Produk PO" required>
                    <Select
                      value={draft.produkId}
                      onChange={(e) => {
                        const product = products.find((x) => x.id === e.target.value);
                        const firstStage = Array.isArray(product?.paymentStages)
                          ? product.paymentStages[0]
                          : null;
                        setDraft({
                          ...draft,
                          produkId: e.target.value,
                          variantId: '',
                          dpPct: firstStage ? num(firstStage.pct ?? firstStage.percent) : draft.dpPct
                        });
                      }}
                      disabled={!draftPreview.brand}
                    >
                      <option value="">— Pilih produk —</option>
                      {products
                        .filter((p) => p.brand === draftPreview.brand?.name)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} {p.status === 'closed' ? '(PO tutup)' : ''}
                          </option>
                        ))}
                    </Select>
                  </Field>

                  <Field label="Varian" required className="sm:col-span-2">
                    <Select
                      value={draft.variantId}
                      onChange={(e) => setDraft({ ...draft, variantId: e.target.value })}
                      disabled={!draft.produkId}
                    >
                      <option value="">— Pilih varian —</option>
                      {(draftPreview.product?.variants || []).map((v) => {
                        const remaining = num(v.quota) - num(v.used);
                        return (
                          <option key={v.id} value={v.id} disabled={remaining <= 0}>
                            {variantLabel(v)} · sisa {remaining} pcs
                            {remaining <= 0 ? ' (habis)' : ''}
                          </option>
                        );
                      })}
                    </Select>
                  </Field>

                  <Field label="Qty (pcs)" required>
                    <Input
                      type="number"
                      min={1}
                      value={draft.qty}
                      onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
                    />
                  </Field>

                  <Field label="DP (%)" hint="Default mengikuti konfigurasi bisnis">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={draft.dpPct}
                      onChange={(e) => setDraft({ ...draft, dpPct: e.target.value })}
                    />
                  </Field>

                  <Field label="Catatan untuk gudang / mitra" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      value={draft.notes}
                      placeholder="Opsional — mis. minta dikirim setelah tanggal tertentu"
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    />
                  </Field>

                  <div className="sm:col-span-2 flex justify-end">
                    <Button icon="plus" onClick={addDraft} disabled={!draft.mitraId || !draft.variantId}>
                      Tambah ke Daftar
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="space-y-4">
                <Card title="Ringkasan Perhitungan">
                  <div className="p-4 space-y-2 text-[11px]">
                    {draftPreview.mitra ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Mitra / Level</span>
                          <span className="font-semibold text-gray-800">
                            {draftPreview.mitra.name} · {draftPreview.mitra.level}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Fee mitra / pcs</span>
                          <span className="font-semibold text-gray-800">
                            {draftPreview.disc}% · {rp(draftPreview.feeNominal)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Harga satuan</span>
                          <span className="font-semibold text-gray-800">{rp(draftPreview.pricing.price)}</span>
                        </div>
                        <div className="border-t border-dashed border-gray-200 my-2" />
                        <div className="flex justify-between">
                          <span className="text-gray-500">Bruto</span>
                          <span className="text-gray-800">{rp(draftPreview.amounts.gross)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Fee mitra dipotong</span>
                          <span className="text-rose-600">-{rp(draftPreview.amounts.feeMitraNominal)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-gray-900">
                          <span>Subtotal</span>
                          <span>{rp(draftPreview.amounts.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>Diskon brand (pabrik)</span>
                          <span>{rp(draftPreview.amounts.brandDiscountNominal)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>Fee perusahaan</span>
                          <span>{rp(draftPreview.amounts.feeCompanyNominal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>DP ({draft.dpPct}%)</span>
                          <span>{rp(draftPreview.amounts.dpNominal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Pelunasan</span>
                          <span>{rp(draftPreview.amounts.pelunasanNominal)}</span>
                        </div>
                        {draftPreview.variant && (
                          <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-[10px] text-gray-500">
                            Sisa kuota varian ini:{' '}
                            <b className="text-gray-800">
                              {num(draftPreview.variant.quota) - num(draftPreview.variant.used)} pcs
                            </b>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-400">Pilih mitra & varian untuk melihat perhitungan.</p>
                    )}
                  </div>
                </Card>

                <Card title="Daftar Pesanan" subtitle={`${draftList.length} item siap diterbitkan`}>
                  <div className="divide-y divide-gray-100">
                    {draftList.map((item) => {
                      const p = products.find((x) => x.id === item.produkId);
                      const m = mitra.find((x) => x.id === item.mitraId);
                      const v = p?.variants.find((x) => x.id === item.variantId);
                      return (
                        <div key={item.key} className="px-3.5 py-2.5 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-gray-900">
                              {m?.name} · {p?.title}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {variantLabel(v)} · {item.qty} pcs · DP {item.dpPct}%
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDraftList((prev) => prev.filter((x) => x.key !== item.key))}
                            className="p-1 text-gray-400 hover:text-rose-600"
                          >
                            <Icon name="x" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {draftList.length === 0 && (
                      <p className="px-3.5 py-6 text-center text-[11px] text-gray-400">
                        Belum ada item. Tambahkan dari form di samping.
                      </p>
                    )}
                  </div>
                  <div className="p-3.5 border-t border-gray-100">
                    <Button className="w-full" disabled={!draftList.length} onClick={submitDrafts}>
                      Terbitkan {draftList.length || ''} Pesanan
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* =========================== REKAP CHECKOUT ======================= */}
        {activeMenu === 'rekap_produk' && (
          <>
            <PageHead
              title="Rekap Checkout per Produk"
              desc="Akumulasi pesanan mitra per produk dan varian: qty checkout, omzet, piutang, serta pemakaian kuota."
              badge={<Badge tone="gray">{productFiltered.length} produk</Badge>}
              actions={
                <Button variant="outline" icon="download" onClick={exportProducts}>
                  Ekspor CSV
                </Button>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard
                label="Total Qty Checkout"
                value={`${sumBy(productFiltered, (p) => p.qtySold)} pcs`}
                sub={`${sumBy(productFiltered, (p) => p.invoiceCount)} invoice`}
                tone="violet"
                icon="box"
              />
              <MetricCard
                label="Omzet Checkout"
                value={rp(sumBy(productFiltered, (p) => p.omzet))}
                sub="Setelah diskon level mitra"
                tone="emerald"
                icon="wallet"
              />
              <MetricCard
                label="Piutang Berjalan"
                value={rp(sumBy(productFiltered, (p) => p.piutang))}
                sub="Belum dibayar / belum diverifikasi"
                tone="red"
                icon="receipt"
              />
              <MetricCard
                label="Varian Hampir Habis"
                value={productFiltered.reduce(
                  (n, p) =>
                    n +
                    p.variants.filter(
                      (v) => num(v.used) > 0 && num(v.quota) - num(v.used) <= 10
                    ).length,
                  0
                )}
                sub="Sisa kuota ≤ 10 pcs pada varian yang sudah ada pesanan"
                tone="amber"
                icon="alert"
              />
            </div>

            <Card
              title="Rekap per Produk"
              action={
                <Select value={rekapBrand} onChange={(e) => setRekapBrand(e.target.value)} className="w-auto">
                  <option value="all">Semua Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              }
            >
              <TableWrap minWidth={980}>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Produk</th>
                    <th className={`${TH} text-right`}>Harga</th>
                    <th className={`${TH} text-right`}>Invoice</th>
                    <th className={`${TH} text-right`}>Qty</th>
                    <th className={`${TH} text-right`}>Omzet</th>
                    <th className={`${TH} text-right`}>Piutang</th>
                    <th className={TH}>Kuota</th>
                    <th className={TH}>Status PO</th>
                    <th className={`${TH} text-right`}>Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productFiltered.map((p) => {
                    const d = diffDays(p.closeDate, todayISO());
                    return (
                      <React.Fragment key={p.id}>
                        <tr className="hover:bg-gray-50/70">
                          <td className={TD}>
                            <p className="font-bold text-gray-900">{p.title}</p>
                            <p className="text-[10px] text-gray-400">
                              {p.brand} · {p.category}
                            </p>
                          </td>
                          <td className={`${TD} text-right`}>{priceRangeOf(p).label}</td>
                          <td className={`${TD} text-right`}>{p.invoiceCount}</td>
                          <td className={`${TD} text-right font-semibold`}>{p.qtySold} pcs</td>
                          <td className={`${TD} text-right font-bold text-gray-900`}>{rp(p.omzet)}</td>
                          <td className={`${TD} text-right ${p.piutang > 0 ? 'text-rose-600 font-semibold' : 'text-gray-400'}`}>
                            {rp(p.piutang)}
                          </td>
                          <td className={TD}>
                            <div className="w-28">
                              <ProgressBar
                                value={p.used}
                                max={p.quota || 1}
                                tone={p.quota - p.used <= 10 ? 'red' : 'emerald'}
                              />
                              <p className="text-[10px] text-gray-400 mt-1">
                                {p.used}/{p.quota} pcs · sisa {p.remaining}
                              </p>
                            </div>
                          </td>
                          <td className={TD}>
                            <Badge tone={p.status === 'open' ? (d <= 3 ? 'amber' : 'emerald') : 'gray'}>
                              {p.status === 'open' ? (d < 0 ? 'Lewat tenggat' : `${d} hari lagi`) : 'Ditutup'}
                            </Badge>
                          </td>
                          <td className={`${TD} text-right`}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedProducts((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                              }
                              className="text-[11px] font-semibold text-sky-700 hover:underline"
                            >
                              {expandedProducts[p.id] ? 'Tutup' : 'Varian'}
                            </button>
                          </td>
                        </tr>
                        {expandedProducts[p.id] && (
                          <tr className="bg-gray-50/60">
                            <td colSpan={9} className="px-4 py-3">
                              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                                <TableWrap>
                                  <thead className="bg-white border-b border-gray-100">
                                    <tr>
                                      <th className={TH}>Warna</th>
                                      <th className={TH}>Model</th>
                                      <th className={TH}>Ukuran</th>
                                      <th className={`${TH} text-right`}>Kuota</th>
                                      <th className={`${TH} text-right`}>Terpakai</th>
                                      <th className={`${TH} text-right`}>Sisa</th>
                                      <th className={TH}>Pemakaian</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {p.variants.map((v) => {
                                      const rem = num(v.quota) - num(v.used);
                                      return (
                                        <tr key={v.id}>
                                          <td className={TD}>{v.color}</td>
                                          <td className={TD}>{v.model}</td>
                                          <td className={TD}>{v.size}</td>
                                          <td className={`${TD} text-right`}>{v.quota}</td>
                                          <td className={`${TD} text-right`}>{v.used}</td>
                                          <td className={`${TD} text-right font-semibold ${rem <= 0 ? 'text-rose-600' : ''}`}>
                                            {rem}
                                          </td>
                                          <td className={TD}>
                                            <ProgressBar
                                              value={v.used}
                                              max={v.quota || 1}
                                              tone={rem <= 0 ? 'red' : rem <= 10 ? 'amber' : 'emerald'}
                                              className="w-32"
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </TableWrap>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </TableWrap>
              {productFiltered.length === 0 && <EmptyState title="Belum ada produk" icon="box" />}
            </Card>
          </>
        )}

        {/* ============================== KATALOG =========================== */}
        {activeMenu === 'produk' && (
          <>
            <PageHead
              title="Katalog Produk PO"
              desc="Upload katalog, atur harga jual, kuota varian, dan periode PO. Katalog yang dibuka otomatis tampil di toko mitra."
              badge={<Badge tone="emerald">{products.filter((p) => p.status === 'open').length} PO aktif</Badge>}
              actions={
                <Button icon="plus" onClick={() => setProductModal({ mode: 'create', form: { ...blankProduct } })}>
                  Produk Baru
                </Button>
              }
            />

            {/* Filter Bar Katalog Produk PO yang Rapi & Terstruktur */}
            <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-3.5 sm:p-4 space-y-3">
              {/* Baris 1: Status PO Tabs & Ringkasan Counter */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
                    Status PO:
                  </span>
                  <Segmented
                    value={catalogStatus}
                    onChange={setCatalogStatus}
                    options={[
                      { value: 'all', label: 'Semua', count: catalogCounts.all },
                      { value: 'open', label: 'PO Dibuka', count: catalogCounts.open },
                      { value: 'closing', label: 'Tutup Hari Ini', count: catalogCounts.closing },
                      { value: 'closed', label: 'Arsip / Ditutup', count: catalogCounts.closed }
                    ]}
                  />
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <Badge tone={catalogFiltered.length > 0 ? 'emerald' : 'gray'}>
                    {catalogFiltered.length} produk tampil
                  </Badge>
                  {isCatalogFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetCatalogFilter}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 transition cursor-pointer px-1.5 py-0.5 rounded"
                      title="Reset semua filter"
                    >
                      <Icon name="x" className="w-3.5 h-3.5" />
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>

              {/* Baris 2: Toolbar Pencarian & Dropdown Filter (Brand, Kategori, Urutkan) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
                {/* Search Box */}
                <div className="lg:col-span-5">
                  <SearchBox
                    value={catalogSearch}
                    onChange={setCatalogSearch}
                    placeholder="Cari nama produk, brand, kategori, SKU…"
                    className="w-full"
                  />
                </div>

                {/* Filter Brand */}
                <div className="lg:col-span-3">
                  <Select
                    value={catalogBrand}
                    onChange={(e) => setCatalogBrand(e.target.value)}
                    className="w-full text-xs"
                  >
                    <option value="all">Semua Brand Vendor</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.name}>
                        Brand: {b.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Filter Kategori */}
                <div className="lg:col-span-2">
                  <Select
                    value={catalogCategory}
                    onChange={(e) => setCatalogCategory(e.target.value)}
                    className="w-full text-xs"
                  >
                    <option value="all">Semua Kategori</option>
                    {catalogCategories.map((c) => (
                      <option key={c} value={c}>
                        Kategori: {c}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Urutkan / Sortir */}
                <div className="lg:col-span-2">
                  <Select
                    value={catalogSort}
                    onChange={(e) => setCatalogSort(e.target.value)}
                    className="w-full text-xs"
                  >
                    <option value="default">Urutan: Default</option>
                    <option value="close_asc">Tutup PO Terdekat</option>
                    <option value="sales_desc">Terlaris (Kuota)</option>
                    <option value="price_asc">Harga Terendah</option>
                    <option value="price_desc">Harga Tertinggi</option>
                  </Select>
                </div>
              </div>

              {/* Baris 3: Active Filter Chips */}
              {isCatalogFilterActive && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-400">Filter Aktif:</span>
                  {catalogStatus !== 'all' && (
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                      Status: {catalogStatus === 'open' ? 'PO Dibuka' : catalogStatus === 'closing' ? 'Tutup Hari Ini' : 'Arsip'}
                      <button onClick={() => setCatalogStatus('all')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                    </span>
                  )}
                  {catalogBrand !== 'all' && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-md font-medium">
                      Brand: {catalogBrand}
                      <button onClick={() => setCatalogBrand('all')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                    </span>
                  )}
                  {catalogCategory !== 'all' && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200/80 px-2 py-0.5 rounded-md font-medium">
                      Kategori: {catalogCategory}
                      <button onClick={() => setCatalogCategory('all')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                    </span>
                  )}
                  {catalogSearch.trim() && (
                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200/80 px-2 py-0.5 rounded-md font-medium">
                      Pencarian: "{catalogSearch.trim()}"
                      <button onClick={() => setCatalogSearch('')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                    </span>
                  )}
                  {catalogSort !== 'default' && (
                    <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-medium">
                      Urut: {catalogSort === 'close_asc' ? 'Tutup Terdekat' : catalogSort === 'sales_desc' ? 'Terlaris' : catalogSort === 'price_asc' ? 'Harga Terendah' : 'Harga Tertinggi'}
                      <button onClick={() => setCatalogSort('default')} className="hover:text-rose-600 font-bold ml-0.5">×</button>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {catalogFiltered.map((p) => {
                const d = diffDays(p.closeDate, todayISO());
                const used = p.used;
                const quota = p.quota;
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
                    <div className="h-28 bg-gradient-to-br from-rose-900 via-rose-800 to-amber-700 relative flex items-end p-4 overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover opacity-60 hover:scale-105 transition duration-300" />
                      ) : (
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200 drop-shadow-sm">{p.brand}</p>
                        <h3 className="text-base font-bold text-white leading-tight drop-shadow-md">{p.title}</h3>
                      </div>
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                        {p.isSale && (
                          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                            SALE {p.discountPercent || 0}%
                          </span>
                        )}
                        <Badge tone={p.status === 'open' ? 'emerald' : 'gray'}>
                          {p.status === 'open' ? 'PO Dibuka' : 'PO Ditutup'}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 flex-1 space-y-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Harga Varian</p>
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <p className="text-lg font-bold text-gray-900">{priceRangeOf(p).label}</p>
                            {p.isSale && p.originalPrice > p.price && (
                              <span className="text-xs text-gray-400 line-through">
                                {rp(p.originalPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-0.5">
                          {p.openDate && (
                            <>
                              <p className="text-[10px] text-gray-400 uppercase font-semibold">Buka PO</p>
                              <p className="text-[11px] font-semibold text-gray-700">{fmtDate(p.openDate)}</p>
                            </>
                          )}
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Tutup PO</p>
                          <p className={`text-[11px] font-bold ${d < 0 ? 'text-rose-600' : d <= 3 ? 'text-amber-600' : 'text-gray-700'}`}>
                            {fmtDate(p.closeDate)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                          <span>Kuota terjual</span>
                          <span className="font-semibold text-gray-600">
                            {used}/{quota} pcs
                          </span>
                        </div>
                        <ProgressBar value={used} max={quota || 1} tone={quota - used <= 10 ? 'red' : 'emerald'} />
                      </div>

                      <div className="space-y-1">
                        {p.variants.slice(0, 3).map((v) => {
                          const { price: vPrice, addon: vAddon } = variantPricing(p, v);
                          const left = num(v.quota) - num(v.used);
                          return (
                            <div key={v.id} className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="text-gray-600 truncate">{variantLabel(v)}</span>
                              <span className="shrink-0 flex items-center gap-1.5">
                                <span className="text-gray-800 font-semibold">{rp(vPrice)}</span>
                                {vAddon > 0 && <span className="text-amber-700 font-semibold">+{rp(vAddon)}</span>}
                                <span className={left <= 0 ? 'text-rose-600 font-semibold' : 'text-gray-400'}>
                                  sisa {left}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                        {p.variants.length > 3 && (
                          <p className="text-[10px] text-gray-400">+{p.variants.length - 3} varian lain</p>
                        )}
                      </div>
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => openEditProduct(p)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => openVariantModal(p)}
                      >
                        Varian ({p.variants.length})
                      </Button>
                      <Button size="xs" variant="outline" icon="receipt" onClick={() => setProductOrderId(p.id)}>
                        Orderan ({p.invoiceCount})
                      </Button>
                      <Button size="xs" variant={p.status === 'open' ? 'dangerOutline' : 'primary'} onClick={() => toggleProductStatus(p)}>
                        {p.status === 'open' ? 'Tutup PO' : 'Buka PO'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(p)}
                        className="ml-auto p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Hapus produk"
                      >
                        <Icon name="trash" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {catalogFiltered.length === 0 && (
              <Card>
                <EmptyState
                  title={products.length === 0 ? 'Belum ada produk' : 'Tidak ada produk yang cocok'}
                  desc={
                    products.length === 0
                      ? 'Tambahkan produk baru untuk membuka PO.'
                      : 'Ubah kata kunci pencarian atau filter status PO.'
                  }
                  icon="box"
                  action={
                    products.length === 0 ? (
                      <Button onClick={() => setProductModal({ mode: 'create', form: { ...blankProduct } })}>Produk Baru</Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleResetCatalogFilter}
                      >
                        Reset Filter
                      </Button>
                    )
                  }
                />
              </Card>
            )}
          </>
        )}

        {/* =============================== BRAND ============================ */}
        {activeMenu === 'brand' && (
          <div className="space-y-4">
            <PageHead
              title="Brand Vendor"
              desc="Atur brand vendor resmi, supplier pabrik, diskon pabrik, dan fee mitra per level (persen atau Rupiah). Fee mitra otomatis terpotong saat mitra checkout."
              badge={<Badge tone="gray">{brands.length} brand</Badge>}
              actions={
                <Button icon="plus" onClick={() => setBrandModal({ mode: 'create', form: { ...blankBrand } })}>
                  Brand Baru
                </Button>
              }
            />

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-stone-500">
                  <span className="text-xs font-semibold">Total Brand</span>
                  <span className="p-1.5 rounded-lg bg-rose-50 text-[#6B1416]">
                    <Icon name="shield" className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-xl font-bold text-stone-900">{brands.length} Brand</div>
                <p className="text-[11px] text-stone-500">Vendor aktif terdaftar</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-stone-500">
                  <span className="text-xs font-semibold">Total Katalog PO</span>
                  <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                    <Icon name="box" className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-xl font-bold text-stone-900">{productSummary.length} Produk</div>
                <p className="text-[11px] text-stone-500">Katalog pre-order aktif</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-stone-500">
                  <span className="text-xs font-semibold">Total Omzet Vendor</span>
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Icon name="wallet" className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-xl font-bold text-stone-900">
                  {rp(sumBy(productSummary, (p) => p.omzet))}
                </div>
                <p className="text-[11px] text-emerald-600 font-medium">Akumulasi penjualan PO</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-stone-500">
                  <span className="text-xs font-semibold">Fee Mitra (rata-rata)</span>
                  <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <Icon name="spark" className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100">
                    DB: {feeBadges.values[0]}%
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-bold text-[10px] border border-sky-100">
                    Sub: {feeBadges.values[1]}%
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100">
                    Agen: {feeBadges.values[2]}%
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-100">
                    Res: {feeBadges.values[3]}%
                  </span>
                  {feeBadges.mixed && (
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-bold text-[10px] border border-stone-200">
                      sebagian Rp
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-stone-400">Potongan otomatis per level</p>
              </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Icon name="search" className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="Cari nama brand, supplier pabrik, atau kota asal..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-stone-50 hover:bg-white focus:bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6B1416] transition"
                />
                {brandSearch && (
                  <button
                    type="button"
                    onClick={() => setBrandSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <Icon name="x" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {distinctBrandCities.length > 0 && (
                  <select
                    value={brandCityFilter}
                    onChange={(e) => setBrandCityFilter(e.target.value)}
                    className="text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6B1416] cursor-pointer"
                  >
                    <option value="all">Semua Kota Asal</option>
                    {distinctBrandCities.map((c) => (
                      <option key={c} value={c}>
                        Kota {c}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={brandSort}
                  onChange={(e) => setBrandSort(e.target.value)}
                  className="text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6B1416] cursor-pointer"
                >
                  <option value="name">Urut: Nama (A-Z)</option>
                  <option value="omzet">Urut: Omzet Tertinggi</option>
                  <option value="products">Urut: Produk Terbanyak</option>
                </select>

                {(brandSearch || brandCityFilter !== 'all' || brandSort !== 'name') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBrandSearch('');
                      setBrandCityFilter('all');
                      setBrandSort('name');
                    }}
                    className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Table Card */}
            <Card>
              <TableWrap>
                <thead className="bg-stone-50/90 border-b border-stone-200/80">
                  <tr>
                    <th className={`${TH} text-center w-12`}>No</th>
                    <th className={TH}>Brand Vendor & Pabrik</th>
                    <th className={TH}>Kota Asal</th>
                    <th className={`${TH} text-center`}>Diskon Pabrik</th>
                    <th className={`${TH} text-center`}>Fee DB All</th>
                    <th className={`${TH} text-center`}>Fee Sub DB</th>
                    <th className={`${TH} text-center`}>Fee Agen</th>
                    <th className={`${TH} text-center`}>Fee Reseller</th>
                    <th className={`${TH} text-center`}>Produk PO</th>
                    <th className={`${TH} text-right`}>Total Omzet</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredBrands.map((b, index) => {
                    const brandProducts = productSummary.filter((p) => p.brand === b.name);
                    const brandInitials = b.name
                      ? b.name
                          .split(' ')
                          .map((w) => w[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()
                      : 'B';
                    const brandOmzet = sumBy(brandProducts, (p) => p.omzet);

                    return (
                      <tr key={b.id} className="hover:bg-stone-50/60 transition">
                        <td className={`${TD} text-center text-stone-400 font-mono text-[11px] font-semibold`}>
                          {index + 1}
                        </td>
                        <td className={TD}>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 border border-orange-200 flex items-center justify-center font-bold text-xs text-[#6B1416] shrink-0 shadow-2xs">
                              {brandInitials}
                            </div>
                            <div>
                              <p className="font-bold text-stone-900 text-xs sm:text-sm">{b.name}</p>
                              <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                                <Icon name="truck" className="w-3 h-3 text-stone-400 shrink-0" />
                                <span>{b.supplier || 'Pabrik Rekanan'}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={TD}>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-stone-100/70 text-stone-700 font-medium border border-stone-200/60">
                            <span>📍</span>
                            <span>{b.address || 'Bandung'}</span>
                          </span>
                        </td>
                        <td className={`${TD} text-center`}>
                          <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-stone-100 text-stone-700 border border-stone-200/80">
                            {brandDiscountTypeFor(b) === 'nominal'
                              ? rp(brandDiscountValueFor(b))
                              : `${brandDiscountValueFor(b)}%`}
                          </span>
                        </td>
                        <td className={`${TD} text-center`}>
                          <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                            {feeTypeFor(b) === 'nominal' ? rp(b.discountDBAll) : `${num(b.discountDBAll)}%`}
                          </span>
                        </td>
                        <td className={`${TD} text-center`}>
                          <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-sky-50 text-sky-700 border border-sky-200/80">
                            {feeTypeFor(b) === 'nominal' ? rp(b.discountSubDB) : `${num(b.discountSubDB)}%`}
                          </span>
                        </td>
                        <td className={`${TD} text-center`}>
                          <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            {feeTypeFor(b) === 'nominal' ? rp(b.discountAgen) : `${num(b.discountAgen)}%`}
                          </span>
                        </td>
                        <td className={`${TD} text-center`}>
                          <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200/80">
                            {feeTypeFor(b) === 'nominal' ? rp(b.discountReseller) : `${num(b.discountReseller)}%`}
                          </span>
                        </td>
                        <td className={`${TD} text-center`}>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200/70">
                            <Icon name="box" className="w-3 h-3 text-stone-500" />
                            <span>{brandProducts.length} Produk</span>
                          </span>
                        </td>
                        <td className={`${TD} text-right`}>
                          <p className="font-bold text-stone-900 text-xs sm:text-sm">
                            {rp(brandOmzet)}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-medium">Omzet PO</p>
                        </td>
                        <td className={`${TD} text-right`}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setBrandModal({ mode: 'edit', id: b.id, form: brandFormFrom(b) })}
                              className="px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                            >
                              <Icon name="edit" className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteBrand(b)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                              title="Hapus brand vendor"
                            >
                              <Icon name="trash" className="w-3 h-3" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>

              {filteredBrands.length === 0 && (
                <EmptyState
                  title={brandSearch ? 'Tidak ada brand vendor yang sesuai' : 'Belum ada brand vendor'}
                  desc={brandSearch ? `Pencarian "${brandSearch}" tidak menemukan brand vendor apapun.` : undefined}
                  icon="shield"
                  action={
                    brandSearch ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setBrandSearch('');
                          setBrandCityFilter('all');
                        }}
                      >
                        Reset Pencarian
                      </Button>
                    ) : (
                      <Button onClick={() => setBrandModal({ mode: 'create', form: { ...blankBrand } })}>
                        Tambah Brand Baru
                      </Button>
                    )
                  }
                />
              )}

              {/* Table Footer */}
              <div className="px-4 py-3 bg-stone-50/70 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                <span>
                  Menampilkan <strong>{filteredBrands.length}</strong> dari <strong>{brands.length}</strong> brand vendor
                </span>
                <span className="text-[11px] text-stone-400">
                  Fee mitra otomatis terpotong saat mitra checkout; diskon pabrik dipakai untuk fee perusahaan
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* ============================= SUPPLIER =========================== */}
        {activeMenu === 'supplier' && (
          <>
            <PageHead
              title="Supplier Pabrik"
              desc="Data vendor produksi beserta kontak dan brand yang dipasok."
              badge={<Badge tone="gray">{suppliers.length} supplier</Badge>}
              actions={
                <Button icon="plus" onClick={() => setSupplierModal({ mode: 'create', form: { ...blankSupplier } })}>
                  Supplier Baru
                </Button>
              }
            />

            <Card>
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Supplier</th>
                    <th className={TH}>Kota</th>
                    <th className={TH}>Kontak</th>
                    <th className={TH}>Telepon</th>
                    <th className={TH}>Brand Dipasok</th>
                    <th className={TH}>Catatan</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {suppliers.map((s) => {
                    const supplied = brands.filter((b) => b.supplier === s.name);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/70">
                        <td className={`${TD} font-bold text-gray-900`}>{s.name}</td>
                        <td className={TD}>{s.city || '—'}</td>
                        <td className={TD}>{s.contact || '—'}</td>
                        <td className={TD}>{s.phone || '—'}</td>
                        <td className={TD}>
                          <div className="flex flex-wrap gap-1">
                            {supplied.map((b) => (
                              <Badge key={b.id} tone="teal">
                                {b.name}
                              </Badge>
                            ))}
                            {supplied.length === 0 && <span className="text-[10px] text-gray-400">—</span>}
                          </div>
                        </td>
                        <td className={`${TD} max-w-[180px] text-[10px] text-gray-500`}>{s.note || '—'}</td>
                        <td className={`${TD} text-right`}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSupplierModal({ mode: 'edit', id: s.id, form: { ...s } })}
                              className="px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                            >
                              <Icon name="edit" className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSupplier(s)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                              title="Hapus supplier"
                            >
                              <Icon name="trash" className="w-3 h-3" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
              {suppliers.length === 0 && <EmptyState title="Belum ada supplier" icon="truck" />}
            </Card>
          </>
        )}

        {/* ============================= MITRA ============================== */}
        {activeMenu === 'mitra' && (
          <>
            <PageHead
              title="Mitra & User"
              desc="Buat akun mitra, atur level harga, dan pantau omzet serta piutang masing-masing mitra."
              badge={<Badge tone="gray">{mitra.length} mitra</Badge>}
              actions={
                <Button icon="plus" onClick={() => setMitraModal({ mode: 'create', form: { ...blankMitra } })}>
                  Mitra Baru
                </Button>
              }
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Total Mitra" value={mitra.length} sub={`${mitra.filter((m) => m.active).length} aktif`} tone="blue" icon="users" />
              <MetricCard label="Total Omzet" value={rp(sumBy(mitraRows, (m) => m.omzet))} sub="Seluruh pesanan mitra" tone="emerald" icon="wallet" />
              <MetricCard label="Piutang Mitra" value={rp(sumBy(mitraRows, (m) => m.outstanding))} sub="Belum lunas" tone="red" icon="receipt" />
              <MetricCard label="Saldo Deposit" value={rp(sumBy(mitra, (m) => m.deposit))} sub="Saldo aktif mitra" tone="violet" icon="card" />
            </div>

            <Card>
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
                  {mitraRows.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/70">
                      <td className={TD}>
                        <button
                          type="button"
                          onClick={() => setMitraDetailId(m.id)}
                          className="font-bold text-sky-700 hover:underline"
                        >
                          {m.name}
                        </button>
                        <p className="text-[10px] text-gray-400">{m.email || '—'}</p>
                        <p className="text-[10px] text-gray-400">{m.phone}</p>
                      </td>
                      <td className={TD}>
                        <Badge tone={levelTone(m.level)}>{m.level}</Badge>
                      </td>
                      <td className={TD}>{m.city || '—'}</td>
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
            </Card>
          </>
        )}

        {/* ============================ TIM ADMIN =========================== */}
        {activeMenu === 'tim' && (
          <>
            <PageHead
              title="Tim Admin"
              desc="Buat akun tim finance & purchasing. Setiap akun hanya dapat mengakses menu sesuai perannya."
              badge={<Badge tone="gray">{team.length} akun</Badge>}
              actions={
                <Button
                  icon="plus"
                  onClick={() =>
                    setTeamModal({
                      form: { name: '', email: '', phone: '', role: 'marketing' }
                    })
                  }
                >
                  Akun Tim Baru
                </Button>
              }
            />

            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[11px] text-gray-600 flex items-start gap-2">
              <Icon name="shield" className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
              <p>
                Admin purchasing dapat membuat akun finance dan purchasing. Akun <b>owner</b> hanya dapat dibuat dari
                portal owner untuk menjaga pemisahan hak akses.
              </p>
            </div>

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
                      <td className={TD}>{u.phone || '—'}</td>
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

        {/* ========================= INPUT BUKTI TRANSFER ==================== */}
        {activeMenu === 'input_bukti' && (
          <>
            <PageHead
              title="Input Bukti Transfer"
              desc="Catat bukti transfer DP, pelunasan, ongkir, atau deposit mitra secara manual. Setelah disimpan, status menjadi MENUNGGU VERIFIKASI dan diteruskan ke admin finance."
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
              <Card
                title="Form Bukti Transfer"
                subtitle="Semua admin dapat menginput bukti TF mitra"
                className="lg:col-span-2"
              >
                <form onSubmit={submitProofForm} className="p-4 sm:p-5 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Mitra" required>
                      <Select
                        value={proofForm.mitraId}
                        onChange={(e) =>
                          setProofForm((prev) => ({ ...prev, mitraId: e.target.value, invoice: '' }))
                        }
                      >
                        <option value="">Pilih mitra…</option>
                        {mitra
                          .filter((m) => m.active)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} · {m.level}
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
                        <option value="">Pilih invoice…</option>
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
                              {o.invoice} · {o.produk} · sisa {rp(orderOutstanding(o))}
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
                              {b.bank} · {b.accountNo}
                            </option>
                          ))}
                      </Select>
                    </Field>
                    <Field label="No. Referensi / Berita Transfer">
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
                        accept="image/*"
                        onChange={(e) => handleProofFile(e.target.files?.[0])}
                        className="block w-full text-[11px] text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                      />
                      <div className="flex items-center gap-3 flex-wrap">
                        {proofForm.proof && (
                          <ProofThumb
                            src={mediaUrl(proofForm.proof)}
                            onClick={() =>
                              setProofView({ src: mediaUrl(proofForm.proof), title: 'Pratinjau bukti transfer' })
                            }
                            label="Pratinjau"
                          />
                        )}
                      </div>
                    </div>
                  </Field>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-[10px] text-gray-400">
                      Bukti akan diverifikasi finance sebelum status pembayaran menjadi ACC.
                    </p>
                    <Button type="submit" icon="check">
                      Simpan Bukti
                    </Button>
                  </div>
                </form>
              </Card>

              <div className="space-y-4">
                <Card title="Rekening Tujuan" subtitle="Rekening resmi AfatharShop">
                  <div className="divide-y divide-gray-100">
                    {bankAccounts.map((b) => (
                      <div key={b.id} className="px-4 py-3 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-gray-900">{b.bank}</p>
                          <p className="text-[11px] text-gray-500 font-mono">{b.accountNo}</p>
                          <p className="text-[10px] text-gray-400">{b.holder}</p>
                        </div>
                        <Badge tone={b.active ? 'emerald' : 'gray'}>{b.active ? 'Aktif' : 'Nonaktif'}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Alur Verifikasi">
                  <ol className="p-4 space-y-3">
                    {[
                      'Admin purchasing input bukti transfer mitra.',
                      'Status pembayaran menjadi Menunggu Verifikasi.',
                      'Finance mencocokkan nominal dengan mutasi rekening.',
                      'Finance ACC / tolak dengan catatan.'
                    ].map((step, i) => (
                      <li key={step} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-[11px] text-gray-600 leading-snug">{step}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              </div>
            </div>

            <Card
              title="Bukti Menunggu Verifikasi"
              subtitle="Input terbaru dari seluruh admin"
              action={<Badge tone="blue">{pendingProofList.length} dokumen</Badge>}
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Tanggal</th>
                    <th className={TH}>Invoice / Mitra</th>
                    <th className={TH}>Jenis</th>
                    <th className={`${TH} text-right`}>Nominal</th>
                    <th className={TH}>Bukti</th>
                    <th className={TH}>Diinput oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingProofList.map((row) => (
                    <tr key={row.key} className="hover:bg-gray-50/70">
                      <td className={TD}>{fmtDate(row.date)}</td>
                      <td className={TD}>
                        <p className="font-semibold text-gray-900">{row.invoice}</p>
                        <p className="text-[10px] text-gray-400">{row.mitra}</p>
                      </td>
                      <td className={TD}>
                        <Badge tone="amber">{row.kind}</Badge>
                      </td>
                      <td className={`${TD} text-right font-bold text-gray-900`}>{rp(row.amount)}</td>
                      <td className={TD}>
                        <ProofThumb
                          src={row.proof}
                          onClick={() => setProofView({ src: row.proof, title: `Bukti ${row.kind} ${row.invoice}` })}
                        />
                      </td>
                      <td className={TD}>{row.by || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {pendingProofList.length === 0 && (
                <EmptyState
                  title="Tidak ada bukti menunggu verifikasi"
                  desc="Semua bukti transfer yang diinput sudah diverifikasi finance."
                  icon="upload"
                />
              )}
            </Card>
          </>
        )}

        {/* ============================ PENGAJUAN =========================== */}
        {activeMenu === 'pengajuan' && (
          <>
            <PageHead
              title="Review Pengajuan Pembayaran"
              desc="Finance mengajukan dana ke owner melalui portal ini. Persetujuan berjenjang: Purchasing → Owner → Transfer."
              badge={<Badge tone="amber">{prCounts[PREQ.REVIEW_MKT] || 0} perlu review</Badge>}
            />

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard
                label="Perlu Review"
                value={prCounts[PREQ.REVIEW_MKT] || 0}
                sub="Menunggu keputusan purchasing"
                tone="amber"
                icon="clock"
                onClick={() => setPrFilter(PREQ.REVIEW_MKT)}
              />
              <MetricCard
                label="Menunggu Owner"
                value={prCounts[PREQ.APPROVAL_OWNER] || 0}
                sub="Sudah disetujui purchasing"
                tone="violet"
                icon="shield"
                onClick={() => setPrFilter(PREQ.APPROVAL_OWNER)}
              />
              <MetricCard
                label="Siap Ditransfer"
                value={prCounts[PREQ.APPROVED] || 0}
                sub={rp(sumBy(paymentRequests.filter((r) => r.status === PREQ.APPROVED), (r) => r.amount))}
                tone="blue"
                icon="wallet"
                onClick={() => setPrFilter(PREQ.APPROVED)}
              />
              <MetricCard
                label="Total Ditransfer"
                value={rp(sumBy(paymentRequests.filter((r) => r.status === PREQ.TRANSFERRED), (r) => r.amount))}
                sub={`${prCounts[PREQ.TRANSFERRED] || 0} pengajuan selesai`}
                tone="emerald"
                icon="check"
              />
            </div>

            <Card
              title="Daftar Pengajuan"
              subtitle="Pantau posisi setiap pengajuan pembayaran"
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
                    <th className={TH}>Kode / Tanggal</th>
                    <th className={TH}>Tujuan Pembayaran</th>
                    <th className={TH}>Referensi</th>
                    <th className={`${TH} text-right`}>Nominal</th>
                    <th className={TH}>Diajukan</th>
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
                        <p className="text-[10px] text-gray-400 truncate">{r.note}</p>
                      </td>
                      <td className={TD}>{r.ref}</td>
                      <td className={`${TD} text-right font-bold text-gray-900`}>{rp(r.amount)}</td>
                      <td className={TD}>{r.createdBy}</td>
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
                        <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">
                          {r.bank} <span className="font-mono">· {r.accountNo}</span>
                        </p>
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>
                        <Badge tone={preqTone(r.status)}>{r.status}</Badge>
                      </td>
                      <td className={`${TD} text-right`}>
                        <Button
                          size="xs"
                          variant={r.status === PREQ.REVIEW_MKT ? 'primary' : 'outline'}
                          className="min-w-[64px] justify-center"
                          onClick={() => setPrDetailId(r.id)}
                        >
                          {r.status === PREQ.REVIEW_MKT ? 'Review' : 'Detail'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {filteredPr.length === 0 && (
                <EmptyState title="Tidak ada pengajuan" desc="Belum ada pengajuan pada filter ini." icon="wallet" />
              )}
            </Card>
          </>
        )}

        {activeMenu === 'rekap_fee' && (
          <FeeRecapPanel
            orders={orders}
            brands={brands}
            subtitle="Fee mitra dipotong otomatis dari harga varian saat mitra checkout. Diskon pabrik dicatat sebagai pendapatan perusahaan."
          />
        )}

        {/* ========================= PENJUALAN TERHAPUS ===================== */}
        {activeMenu === 'terhapus' && (
          <>
            <PageHead
              title="Penjualan Terhapus"
              desc="Pesanan yang dipindahkan ke sini tidak dihitung pada omzet. Pulihkan jika pesanan ternyata masih berjalan."
              badge={<Badge tone="gray">{deletedOrders.length} pesanan</Badge>}
            />

            <Card
              title="Arsip Pesanan"
              action={
                <div className="w-full sm:w-64">
                  <SearchBox
                    value={trashSearch}
                    onChange={setTrashSearch}
                    placeholder="Cari invoice, mitra, produk…"
                  />
                </div>
              }
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Invoice</th>
                    <th className={TH}>Mitra</th>
                    <th className={TH}>Produk</th>
                    <th className={`${TH} text-right`}>Nilai</th>
                    <th className={TH}>Dihapus</th>
                    <th className={TH}>Alasan</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTrash.map((o) => (
                    <tr key={o.invoice} className="hover:bg-gray-50/70">
                      <td className={TD}>
                        <p className="font-bold text-gray-900">{o.invoice}</p>
                        <p className="text-[10px] text-gray-400">{fmtDate(o.date)}</p>
                      </td>
                      <td className={TD}>
                        <p className="font-medium text-gray-800">{o.mitraName}</p>
                        <p className="text-[10px] text-gray-400">{o.level}</p>
                      </td>
                      <td className={TD}>
                        <p className="text-gray-800">{o.produk}</p>
                        <p className="text-[10px] text-gray-400">{o.variant} · {o.qty} pcs</p>
                      </td>
                      <td className={`${TD} text-right font-semibold`}>{rp(o.subtotal)}</td>
                      <td className={TD}>
                        <p>{fmtDate(o.deletedAt)}</p>
                        <p className="text-[10px] text-gray-400">oleh {o.deletedBy || '—'}</p>
                      </td>
                      <td className={`${TD} max-w-[200px] text-[11px] text-gray-600`}>{o.deleteReason || '—'}</td>
                      <td className={`${TD} text-right`}>
                        <Button size="xs" variant="outline" icon="refresh" onClick={() => restoreOrder(o)}>
                          Pulihkan
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {filteredTrash.length === 0 && (
                <EmptyState
                  title="Arsip kosong"
                  desc="Tidak ada pesanan terhapus yang cocok dengan pencarian."
                  icon="trash"
                />
              )}
            </Card>
          </>
        )}

        {/* ============================ KATEGORI ============================ */}
        {activeMenu === 'kategori' && (
          <>
            <PageHead
              title="Kategori Produk"
              desc="Kategori master yang dipublikasikan ke filter katalog toko. Input produk wajib memilih dari daftar ini agar filter toko selalu sinkron."
              badge={<Badge tone="gray">{categories.length} kategori</Badge>}
              actions={
                <Button icon="plus" onClick={() => setCategoryModal({ mode: 'create', form: { name: '' } })}>
                  Kategori Baru
                </Button>
              }
            />

            <Card
              title="Daftar Kategori"
              subtitle="Urutan filter di toko mengikuti urutan daftar ini."
              action={<Badge tone="gray">{products.length} produk terhubung</Badge>}
            >
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Kategori</th>
                    <th className={`${TH} text-center`}>Jumlah Produk</th>
                    <th className={`${TH} text-center`}>Status</th>
                    <th className={`${TH} text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((c) => {
                    const count = products.filter((p) => p.category === c).length;
                    return (
                      <tr key={c} className="hover:bg-gray-50/70">
                        <td className={`${TD} font-semibold text-gray-900`}>{c}</td>
                        <td className={`${TD} text-center`}>{count}</td>
                        <td className={`${TD} text-center`}>
                          <Badge tone={count > 0 ? 'teal' : 'gray'}>{count > 0 ? 'Dipakai' : 'Kosong'}</Badge>
                        </td>
                        <td className={`${TD} text-right`}>
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="xs"
                              variant="outline"
                              icon="edit"
                              onClick={() => setCategoryModal({ mode: 'edit', id: c, form: { name: c } })}
                            >
                              Ubah
                            </Button>
                            <Button size="xs" variant="dangerOutline" icon="trash" onClick={() => deleteCategory(c)}>
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
              {categories.length === 0 && (
                <EmptyState
                  title="Belum ada kategori"
                  desc="Tambahkan kategori agar produk bisa difilter di katalog toko."
                  icon="filter"
                />
              )}
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
                                className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#541221] bg-white font-semibold"
                              />
                            </td>
                            <td className={TD}>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={inlineBankForm.accountNo}
                                onChange={(e) => setInlineBankForm((prev) => ({ ...prev, accountNo: e.target.value.replace(/\D/g, '') }))}
                                placeholder="No Rekening"
                                className="w-36 font-mono px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#541221] bg-white"
                              />
                            </td>
                            <td className={TD}>
                              <input
                                type="text"
                                value={inlineBankForm.holder}
                                onChange={(e) => setInlineBankForm((prev) => ({ ...prev, holder: e.target.value }))}
                                placeholder="Atas Nama"
                                className="w-full min-w-[140px] px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#541221] bg-white"
                              />
                            </td>
                            <td className={TD}>
                              <input
                                type="text"
                                value={inlineBankForm.purpose}
                                onChange={(e) => setInlineBankForm((prev) => ({ ...prev, purpose: e.target.value }))}
                                placeholder={bankTab === 'pengajuan' ? 'Brand / Peruntukan Vendor' : 'Label / Kegunaan'}
                                className="w-full min-w-[140px] px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#541221] bg-white"
                              />
                            </td>
                            <td className={`${TD} text-center`}>
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={inlineBankForm.active}
                                  onChange={(e) => setInlineBankForm((prev) => ({ ...prev, active: e.target.checked }))}
                                  className="rounded border-gray-300 text-[#541221]"
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
              desc="Daftar jasa kirim yang bisa dipilih saat admin input ongkir dan dipublikasikan ke halaman checkout mitra."
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

            <Card title="Daftar Ekspedisi" subtitle="Ekspedisi nonaktif tidak muncul pada pilihan checkout.">
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
                  desc="Tambahkan jasa kirim agar ongkir bisa diinput saat verifikasi pesanan."
                  icon="truck"
                />
              )}
            </Card>
          </>
        )}
      </DashboardShell>

      {/* Modals & overlays */}
      {productOrderProduct && (
        <Modal
          title={`Orderan ${productOrderProduct.title}`}
          subtitle={`${productOrderProduct.brand} · Tutup PO ${fmtDate(productOrderProduct.closeDate)}${
            productOrderProduct.closeTime ? ` pukul ${productOrderProduct.closeTime} WIB` : ''
          }`}
          onClose={() => setProductOrderId(null)}
          size="xl"
          footer={
            <Button variant="outline" onClick={() => setProductOrderId(null)}>
              Tutup
            </Button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Order s/d tutup PO</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{productOrderStats.inCount} invoice</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Qty s/d tutup PO</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{productOrderStats.inQty} pcs</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Omzet s/d tutup PO</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{rp(productOrderStats.inOmzet)}</p>
            </div>
          </div>

          {productOrderStats.lateCount > 0 && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
              {productOrderStats.lateCount} order masuk setelah tanggal tutup PO dan tidak dihitung pada ringkasan di atas.
            </p>
          )}

          <div className="mt-3">
            {productOrderRows.length === 0 ? (
              <EmptyState
                title="Belum ada orderan"
                desc="Belum ada pesanan masuk untuk produk ini."
                icon="receipt"
              />
            ) : (
              <TableWrap>
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>Invoice</th>
                    <th className={TH}>Tanggal</th>
                    <th className={TH}>Mitra</th>
                    <th className={TH}>Varian</th>
                    <th className={`${TH} text-right`}>Qty</th>
                    <th className={`${TH} text-right`}>Subtotal</th>
                    <th className={TH}>Periode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productOrderRows.map((o) => (
                    <tr key={o.invoice} className="hover:bg-gray-50/70">
                      <td className={`${TD} font-semibold text-gray-900`}>{o.invoice}</td>
                      <td className={TD}>{fmtDate(o.date)}</td>
                      <td className={TD}>
                        {o.mitraName}
                        <span className="block text-[10px] text-gray-400">{o.level}</span>
                      </td>
                      <td className={TD}>{o.variant}</td>
                      <td className={`${TD} text-right`}>{o.qty} pcs</td>
                      <td className={`${TD} text-right`}>{rp(o.subtotal)}</td>
                      <td className={TD}>
                        <Badge tone={o.inPeriod ? 'emerald' : 'amber'}>
                          {o.inPeriod ? 'Dalam PO' : 'Setelah tutup'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </div>
        </Modal>
      )}

      {detailOrder && (
        <OrderDrawer
          order={detailOrder}
          onClose={() => setDetailInvoice(null)}
          onProof={(src, title) => setProofView({ src, title })}
          printInvoice={onPrintInvoice}
          actions={
            <>
              <Button variant="outline" icon="chat" onClick={() => openWA(detailOrder, 'ringkasan')}>
                WhatsApp
              </Button>
              {detailOrder.marketingStatus === MKT.PENDING && (
                <>
                  <Button
                    variant="dangerOutline"
                    onClick={() =>
                      setReasonModal({
                        title: 'Tolak pesanan',
                        subtitle: `${detailOrder.invoice} · ${detailOrder.mitraName}`,
                        label: 'Alasan penolakan',
                        confirmLabel: 'Tolak pesanan',
                        danger: true,
                        onSubmit: (reason) => {
                          rejectOrder(detailOrder, reason);
                          setReasonModal(null);
                          setDetailInvoice(null);
                        }
                      })
                    }
                  >
                    Tolak
                  </Button>
                  <Button
                    onClick={() => {
                      approveOrder(detailOrder);
                      setDetailInvoice(null);
                    }}
                  >
                    ACC Pesanan
                  </Button>
                </>
              )}
              {detailOrder.marketingStatus === MKT.ACC &&
                !['selesai', 'ditolak'].includes(orderStage(detailOrder)) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDetailInvoice(null);
                      askDelete(detailOrder);
                    }}
                  >
                    Hapus
                  </Button>
                )}
            </>
          }
        />
      )}

      {/* ============================= MODALS ============================= */}
      {productModal && (
        <ProductCatalogModal
          isOpen={!!productModal}
          mode={productModal.mode}
          initialData={productModal.product || productModal.form}
          brands={brands}
          categories={categories}
          poBatches={poBatches}
          onCreateBatch={async (batchPayload) => {
            try {
              let cleanPayload = { ...batchPayload };
              if (cleanPayload.brand_id && typeof cleanPayload.brand_id === 'string') {
                const match = cleanPayload.brand_id.match(/\d+/);
                if (match) {
                  cleanPayload.brand_id = Number(match[0]);
                }
              }
              const res = await api.management.createBatch(cleanPayload);
              if (res?.data) {
                setPoBatches((prev) => [...prev, res.data]);
                return res.data;
              }
            } catch (err) {
              console.error('Gagal membuat batch baru:', err);
              throw err;
            }
            return null;
          }}
          onClose={() => setProductModal(null)}
          onSave={handleSaveProductFromModal}
          uploadFile={(file, type) => api.management.uploadFile(file, type)}
          mediaUrl={mediaUrl}
        />
      )}

      {variantModal &&
        (() => {
          const product = products.find((p) => p.id === variantModal.productId);
          if (!product) return null;
          return (
            <Modal
              title={`Varian · ${product.title}`}
              subtitle="Atur warna, model, ukuran, harga, harga tambahan, dan kuota produksi."
              size="lg"
              onClose={() => setVariantModal(null)}
              footer={
                <Button variant="outline" onClick={() => setVariantModal(null)}>
                  Selesai
                </Button>
              }
            >
              <div className="space-y-4">
                {product.options && (
                  <p className="text-[10px] text-gray-500">
                    Opsi katalog: {(product.options.models || []).length} model ·{' '}
                    {(product.options.colors || []).length} warna · {(product.options.sizes || []).length} ukuran
                  </p>
                )}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <TableWrap>
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className={TH}>Warna / Model</th>
                        <th className={TH}>Ukuran</th>
                        <th className={`${TH} text-right`}>Harga</th>
                        <th className={`${TH} text-right`}>Harga Tambahan</th>
                        <th className={`${TH} text-right`}>Kuota</th>
                        <th className={`${TH} text-right`}>Terpakai</th>
                        <th className={`${TH} text-right`}>Sisa</th>
                        <th className={`${TH} text-right`}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {product.variants.map((v) => {
                        const left = num(v.quota) - num(v.used);
                        return (
                          <tr key={v.id}>
                            <td className={TD}>
                              <p className="font-semibold text-gray-900">{v.color}</p>
                              <p className="text-[10px] text-gray-400">{v.model}</p>
                            </td>
                            <td className={TD}>{v.size}</td>
                            <td className={`${TD} text-right`}>
                              <input
                                type="number"
                                min="0"
                                value={v.price ?? ''}
                                placeholder="Harga"
                                onChange={(e) => updateVariantField(product.id, v.id, 'price', e.target.value)}
                                className="w-24 ml-auto h-8 rounded-md border border-gray-200 px-2 text-[11px] text-right focus:outline-none focus:ring-2 focus:ring-rose-200"
                              />
                            </td>
                            <td className={`${TD} text-right`}>
                              <input
                                type="number"
                                min="0"
                                value={v.addon ?? ''}
                                placeholder="0"
                                onChange={(e) => updateVariantField(product.id, v.id, 'addon', e.target.value)}
                                className="w-20 ml-auto h-8 rounded-md border border-gray-200 px-2 text-[11px] text-right focus:outline-none focus:ring-2 focus:ring-rose-200"
                              />
                            </td>
                            <td className={`${TD} text-right`}>
                              <input
                                type="number"
                                min="0"
                                value={v.quota ?? ''}
                                placeholder="0"
                                onChange={(e) => updateVariantField(product.id, v.id, 'quota', e.target.value)}
                                className="w-16 ml-auto h-8 rounded-md border border-gray-200 px-2 text-[11px] text-right focus:outline-none focus:ring-2 focus:ring-rose-200"
                              />
                            </td>
                            <td className={`${TD} text-right`}>{v.used}</td>
                            <td className={`${TD} text-right font-semibold`}>{Math.max(0, left)}</td>
                            <td className={`${TD} text-right`}>
                              <button
                                type="button"
                                disabled={num(v.used) > 0}
                                onClick={() => deleteVariant(product.id, v.id)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                title={num(v.used) > 0 ? 'Varian sudah dipakai pesanan' : 'Hapus varian'}
                              >
                                <Icon name="trash" className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </TableWrap>
                  {product.variants.length === 0 && (
                    <EmptyState title="Belum ada varian" desc="Tambahkan minimal satu varian agar mitra bisa checkout." icon="box" />
                  )}
                </div>

                <form id="variant-form" onSubmit={saveVariant} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-[11px] font-bold text-gray-800">Tambah Varian</p>
                  <div className="grid sm:grid-cols-3 gap-2">
                    <Field label="Warna" required>
                      <Input
                        value={variantModal.form.color || ''}
                        placeholder="Navy"
                        onChange={(e) =>
                          setVariantModal((prev) => ({ ...prev, form: { ...prev.form, color: e.target.value } }))
                        }
                      />
                    </Field>
                    <Field label="Model">
                      <Input
                        value={variantModal.form.model || ''}
                        placeholder="Syari"
                        onChange={(e) =>
                          setVariantModal((prev) => ({ ...prev, form: { ...prev.form, model: e.target.value } }))
                        }
                      />
                    </Field>
                    <Field label="Ukuran">
                      <Input
                        value={variantModal.form.size || ''}
                        placeholder="M"
                        onChange={(e) =>
                          setVariantModal((prev) => ({ ...prev, form: { ...prev.form, size: e.target.value } }))
                        }
                      />
                    </Field>
                    <Field label="Harga" required hint="Harga jual varian, sebelum fee mitra.">
                      <Input
                        type="number"
                        min="0"
                        value={variantModal.form.price ?? ''}
                        placeholder="195000"
                        onChange={(e) =>
                          setVariantModal((prev) => ({ ...prev, form: { ...prev.form, price: e.target.value } }))
                        }
                      />
                    </Field>
                    <Field label="Harga Tambahan" hint="Ditambahkan setelah fee mitra.">
                      <Input
                        type="number"
                        min="0"
                        value={variantModal.form.addon ?? ''}
                        placeholder="0"
                        onChange={(e) =>
                          setVariantModal((prev) => ({ ...prev, form: { ...prev.form, addon: e.target.value } }))
                        }
                      />
                    </Field>
                    <Field label="Kuota" required>
                      <Input
                        type="number"
                        min="1"
                        value={variantModal.form.quota || ''}
                        onChange={(e) =>
                          setVariantModal((prev) => ({ ...prev, form: { ...prev.form, quota: e.target.value } }))
                        }
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="xs" icon="plus">
                      Tambah Varian
                    </Button>
                  </div>
                </form>
              </div>
            </Modal>
          );
        })()}

      {brandModal && (
        <Modal
          title={brandModal.mode === 'edit' ? 'Edit Brand' : 'Brand Vendor Baru'}
          subtitle="Diskon pabrik & fee mitra bisa persen atau Rupiah. Fee mitra memotong harga varian saat checkout."
          size="lg"
          onClose={() => setBrandModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setBrandModal(null)}>
                Batal
              </Button>
              <Button type="submit" form="brand-form" icon="check">
                Simpan Brand
              </Button>
            </>
          }
        >
          <form id="brand-form" onSubmit={saveBrand} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nama Brand" required>
                <Input
                  value={brandModal.form.name || ''}
                  placeholder="Hanara"
                  onChange={(e) =>
                    setBrandModal((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Supplier Pabrik">
                <Select
                  value={brandModal.form.supplier || ''}
                  onChange={(e) =>
                    setBrandModal((prev) => ({ ...prev, form: { ...prev.form, supplier: e.target.value } }))
                  }
                >
                  <option value="">— Pilih supplier —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Kota / Alamat Produksi">
              <Input
                value={brandModal.form.address || ''}
                onChange={(e) =>
                  setBrandModal((prev) => ({ ...prev, form: { ...prev.form, address: e.target.value } }))
                }
              />
            </Field>
            <div className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold text-gray-800">Diskon Brand dari Pabrik</p>
                  <p className="text-[10px] text-gray-400">
                    Total diskon yang Afathar terima dari pabrik. Tidak memotong harga mitra.
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
                  {['pct', 'nominal'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setBrandModal((prev) => ({ ...prev, form: { ...prev.form, discountType: t } }))
                      }
                      className={`px-2.5 py-1 text-[11px] font-bold ${
                        (brandModal.form.discountType || 'pct') === t
                          ? 'bg-gray-900 text-white'
                          : 'bg-white text-gray-500'
                      }`}
                    >
                      {t === 'pct' ? '%' : 'Rp'}
                    </button>
                  ))}
                </div>
              </div>
              <Field label={(brandModal.form.discountType || 'pct') === 'nominal' ? 'Diskon (Rp / pcs)' : 'Diskon (%)'}>
                <Input
                  type="number"
                  min="0"
                  value={brandModal.form.discountValue ?? ''}
                  onChange={(e) =>
                    setBrandModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, discountValue: e.target.value }
                    }))
                  }
                />
              </Field>
            </div>

            <div className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold text-gray-800">Fee Mitra per Level</p>
                  <p className="text-[10px] text-gray-400">
                    Dipotong otomatis saat mitra checkout. Bisa persen atau Rupiah.
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
                  {['pct', 'nominal'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setBrandModal((prev) => ({ ...prev, form: { ...prev.form, feeType: t } }))}
                      className={`px-2.5 py-1 text-[11px] font-bold ${
                        (brandModal.form.feeType || 'pct') === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-500'
                      }`}
                    >
                      {t === 'pct' ? '%' : 'Rp'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['discountDBAll', 'DB All'],
                  ['discountSubDB', 'Sub DB'],
                  ['discountAgen', 'Agen'],
                  ['discountReseller', 'Reseller']
                ].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Input
                      type="number"
                      min="0"
                      value={brandModal.form[key] ?? ''}
                      onChange={(e) =>
                        setBrandModal((prev) => ({
                          ...prev,
                          form: { ...prev.form, [key]: e.target.value }
                        }))
                      }
                    />
                  </Field>
                ))}
              </div>
              <p className="text-[10px] text-gray-400">
                Fee perusahaan = diskon brand − fee mitra per pcs. Nilai minus otomatis ditampilkan di Rekap Fee.
              </p>
            </div>
          </form>
        </Modal>
      )}

      {supplierModal && (
        <Modal
          title={supplierModal.mode === 'edit' ? 'Edit Supplier' : 'Supplier Baru'}
          subtitle="Data supplier dipakai sebagai asal produksi brand."
          onClose={() => setSupplierModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setSupplierModal(null)}>
                Batal
              </Button>
              <Button type="submit" form="supplier-form" icon="check">
                Simpan Supplier
              </Button>
            </>
          }
        >
          <form id="supplier-form" onSubmit={saveSupplier} className="space-y-3">
            <Field label="Nama Supplier" required>
              <Input
                value={supplierModal.form.name || ''}
                onChange={(e) =>
                  setSupplierModal((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))
                }
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Kota">
                <Input
                  value={supplierModal.form.city || ''}
                  onChange={(e) =>
                    setSupplierModal((prev) => ({ ...prev, form: { ...prev.form, city: e.target.value } }))
                  }
                />
              </Field>
              <Field label="Nama Kontak">
                <Input
                  value={supplierModal.form.contact || ''}
                  onChange={(e) =>
                    setSupplierModal((prev) => ({ ...prev, form: { ...prev.form, contact: e.target.value } }))
                  }
                />
              </Field>
            </div>
            <Field label="Telepon">
              <Input
                value={supplierModal.form.phone || ''}
                onChange={(e) =>
                  setSupplierModal((prev) => ({ ...prev, form: { ...prev.form, phone: e.target.value } }))
                }
              />
            </Field>
            <Field label="Catatan">
              <Textarea
                rows={2}
                value={supplierModal.form.note || ''}
                onChange={(e) =>
                  setSupplierModal((prev) => ({ ...prev, form: { ...prev.form, note: e.target.value } }))
                }
              />
            </Field>
          </form>
        </Modal>
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
              <Button type="submit" form="mitra-form" icon="check">
                {mitraModal.mode === 'edit' ? 'Simpan Mitra' : 'Buat Akun Mitra'}
              </Button>
            </>
          }
        >
          <form id="mitra-form" onSubmit={saveMitra} className="space-y-3">
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
                  placeholder="0812…"
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
                onChange={(next) =>
                  setMitraModal((prev) => ({ ...prev, form: { ...prev.form, active: next } }))
                }
              />
            )}
            <p className="text-[10px] text-gray-400">
              Email dipakai sebagai ID login mitra. WhatsApp tetap dipakai untuk reminder & konfirmasi. Password
              akan ditampilkan setelah akun dibuat.
            </p>
          </form>
        </Modal>
      )}

      {teamModal && (
        <Modal
          title="Akun Tim Baru"
          subtitle="Akun finance dapat verifikasi pembayaran; akun purchasing mengelola pesanan & katalog."
          onClose={() => setTeamModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setTeamModal(null)}>
                Batal
              </Button>
              <Button type="submit" form="team-form" icon="check">
                Buat Akun Tim
              </Button>
            </>
          }
        >
          <form id="team-form" onSubmit={saveTeam} className="space-y-3">
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
                  value={teamModal.form.role || 'marketing'}
                  onChange={(e) =>
                    setTeamModal((prev) => ({ ...prev, form: { ...prev.form, role: e.target.value } }))
                  }
                >
                  <option value="marketing">Purchasing</option>
                  <option value="finance">Finance</option>
                </Select>
              </Field>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[11px] text-amber-800 flex items-start gap-2">
              <Icon name="shield" className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Akun <b>owner</b> tidak dapat dibuat dari portal purchasing. Password sementara akan ditampilkan
                sekali setelah akun berhasil dibuat.
              </p>
            </div>
          </form>
        </Modal>
      )}

      {categoryModal && (
        <Modal
          title={categoryModal.mode === 'edit' ? 'Ubah Kategori' : 'Kategori Baru'}
          subtitle="Kategori ini langsung tersedia di filter katalog toko dan pilihan input produk."
          onClose={() => setCategoryModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setCategoryModal(null)}>
                Batal
              </Button>
              <Button type="submit" form="category-form" icon="check">
                Simpan Kategori
              </Button>
            </>
          }
        >
          <form id="category-form" onSubmit={saveCategory} className="space-y-3">
            <Field label="Nama Kategori" required hint="Contoh: Gamis & Abaya, Tas Kulit & Aksesoris">
              <Input
                placeholder="Nama kategori"
                value={categoryModal.form.name || ''}
                onChange={(e) =>
                  setCategoryModal((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))
                }
              />
            </Field>
            {categoryModal.mode === 'edit' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Mengubah nama kategori otomatis memperbarui kategori pada semua produk yang memakainya.
              </p>
            )}
          </form>
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
          title={courierModal.mode === 'edit' ? 'Ubah Ekspedisi' : 'Ekspedisi Baru'}
          subtitle="Ekspedisi aktif dipublikasikan ke pilihan pengiriman saat checkout mitra."
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
            <div className="grid sm:grid-cols-2 gap-3">
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
            </div>
            <Field label="Catatan">
              <Textarea
                rows={2}
                placeholder="Minimal 10 kg, asuransi opsional…"
                value={courierModal.form.note || ''}
                onChange={(e) =>
                  setCourierModal((prev) => ({ ...prev, form: { ...prev.form, note: e.target.value } }))
                }
              />
            </Field>
            <Switch
              checked={courierModal.form.active !== false}
              label="Ekspedisi aktif"
              onChange={(next) => setCourierModal((prev) => ({ ...prev, form: { ...prev.form, active: next } }))}
            />
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

      {mitraDetail && (
        <Drawer
          title={mitraDetail.name}
          subtitle={`${mitraDetail.level} · ${mitraDetail.city || 'Kota belum diisi'}`}
          width="max-w-3xl"
          onClose={() => setMitraDetailId(null)}
          footer={
            <>
              <Button
                variant="outline"
                icon="chat"
                onClick={() => window.open(waLink(mitraDetail.phone, `Halo ${mitraDetail.name}, kami dari AfatharShop.`), '_blank')}
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
              <span className="text-gray-400">Alamat:</span> {mitraDetail.address || '—'}
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

      {prDetail && (
        <Modal
          title={prDetail.code}
          subtitle={prDetail.purpose}
          size="lg"
          onClose={() => setPrDetailId(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setPrDetailId(null)}>
                Tutup
              </Button>
              {prDetail.status === PREQ.REVIEW_MKT && (
                <>
                  <Button
                    variant="dangerOutline"
                    onClick={() => {
                      const req = prDetail;
                      setPrDetailId(null);
                      setReasonModal({
                        title: 'Tolak pengajuan',
                        subtitle: `${req.code} · ${rp(req.amount)}`,
                        label: 'Alasan penolakan',
                        placeholder: 'Contoh: nota supplier belum dilampirkan',
                        confirmLabel: 'Tolak pengajuan',
                        danger: true,
                        onSubmit: (note) => {
                          reviewPR(req, 'TOLAK', note);
                          setReasonModal(null);
                        }
                      });
                    }}
                  >
                    Tolak
                  </Button>
                  <Button icon="check" onClick={() => reviewPR(prDetail, 'ACC', 'Dokumen sesuai, diteruskan ke owner.')}>
                    Setujui & Teruskan
                  </Button>
                </>
              )}
            </>
          }
        >
          <div className="space-y-4">
            <Stepper steps={prSteps(prDetail)} />

            <div className="grid sm:grid-cols-2 gap-2">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase text-gray-400">Nominal Pengajuan</p>
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
                <p className="text-xs font-semibold text-gray-800 mt-1">{prDetail.bank} · {prDetail.accountNo}</p>
                <p className="text-[10px] text-gray-500">{prDetail.holder}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase text-gray-400">Referensi</p>
                <p className="text-xs font-semibold text-gray-800 mt-1">{prDetail.ref}</p>
                <p className="text-[10px] text-gray-500">Diajukan {prDetail.createdBy} · {fmtDate(prDetail.createdAt)}</p>
              </div>
            </div>

            {prDetail.note && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Catatan Finance</p>
                <p className="text-xs text-gray-700 leading-relaxed">{prDetail.note}</p>
              </div>
            )}

            {(prDetail.marketing || prDetail.owner || prDetail.transfer) && (
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
                        {entry.by} · {fmtDate(entry.at)}
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
            )}

            {prDetail.status === PREQ.APPROVAL_OWNER && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2.5 text-[11px] text-violet-800">
                Pengajuan sudah Anda setujui dan sedang menunggu approval owner. Owner akan menandai transfer
                setelah dana dikirim.
              </div>
            )}
            {prDetail.status === PREQ.REJECTED && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 text-[11px] text-rose-800">
                Pengajuan ditolak. Finance dapat memperbaiki dokumen lalu mengajukan ulang.
              </div>
            )}
          </div>
        </Modal>
      )}

      {proofView && <ProofModal src={proofView.src} title={proofView.title} onClose={() => setProofView(null)} />}

      {reasonModal && <ReasonModal {...reasonModal} onClose={() => setReasonModal(null)} />}

      {confirmModal && <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />}

      <Toast toast={toastData} onClose={closeToast} />
    </>
  );
}

const stageMetaStages = [
  { id: 'baru', label: 'Pesanan Baru' },
  { id: 'dp', label: 'Pembayaran DP' },
  { id: 'produksi', label: 'Produksi' },
  { id: 'alamat', label: 'Input Alamat' },
  { id: 'ongkir', label: 'Input Ongkir' },
  { id: 'pelunasan', label: 'Pelunasan' },
  { id: 'ongkir_bayar', label: 'Bayar Ongkir' },
  { id: 'kirim', label: 'Siap Kirim' },
  { id: 'dikirim', label: 'Dikirim' },
  { id: 'selesai', label: 'Selesai' }
];

const barTone = {
  amber: 'bg-amber-400',
  blue: 'bg-sky-500',
  violet: 'bg-violet-500',
  cyan: 'bg-cyan-500',
  orange: 'bg-orange-400',
  indigo: 'bg-indigo-500',
  teal: 'bg-teal-500',
  emerald: 'bg-emerald-500',
  red: 'bg-rose-500',
  gray: 'bg-gray-400'
};
