import React, { useEffect, useMemo, useState } from 'react';
import api, { mediaUrl } from '../../../services/api';
import { dbId, mapBrandToCore, mapOrderToProjectOrder, mapSupplier, normalizeLevel } from '../../../services/adapters';
import { projectOrderToCore } from '../projectBridge';
import { DEFAULT_DP_PCT, defaultStagePcts, dpPercentFor } from '../../../utils/terminScheme';
import ProductCatalogModal from '../ProductCatalogModal';
import BankAccountModal from '../BankAccountModal';
import AccountSettingsPanel from '../AccountSettingsPanel';
import PurchasingOverviewTab from './PurchasingOverviewTab';
import PurchasingAccOrdersTab from './PurchasingAccOrdersTab';
import PurchasingOrdersTab from './PurchasingOrdersTab';
import PurchasingManualOrderTab from './PurchasingManualOrderTab';
import PurchasingProductSummaryTab from './PurchasingProductSummaryTab';
import PurchasingCatalogTab from './PurchasingCatalogTab';
import PurchasingBrandsTab from './PurchasingBrandsTab';
import PurchasingSuppliersTab from './PurchasingSuppliersTab';
import PurchasingMitraTab from './PurchasingMitraTab';
import PurchasingTeamTab from './PurchasingTeamTab';
import PurchasingManualProofTab from './PurchasingManualProofTab';
import PurchasingPaymentRequestsTab from './PurchasingPaymentRequestsTab';
import PurchasingDeletedOrdersTab from './PurchasingDeletedOrdersTab';
import PurchasingBatchesTab from './PurchasingBatchesTab';
import PurchasingCategoriesTab from './PurchasingCategoriesTab';
import PurchasingBankAccountsTab from './PurchasingBankAccountsTab';
import PurchasingCouriersTab from './PurchasingCouriersTab';
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
} from '../poCore';

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

const stagePctOf = (stage) => num(stage?.pct ?? stage?.percent);
const isoDateOf = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : '');
const stageLabelOf = (index, total) =>
  index === 0
    ? 'Termin 1 · DP'
    : index === total - 1
      ? `Termin ${index + 1} · Pelunasan`
      : `Termin ${index + 1} · Cicilan`;
const makeStages = (count, baseDate, existing = []) => {
  // Persen bawaan ikut aturan termin sistem (DP default + termin terakhir 25%),
  // tidak lagi angka lokal 50/50.
  const pcts = defaultStagePcts(count, DEFAULT_DP_PCT);
  return pcts.map((pct, index) => ({
    label: stageLabelOf(index, pcts.length),
    pct,
    date: isoDateOf(existing[index]?.date) || addDays(baseDate || todayISO(), index * 30)
  }));
};
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

const DEFAULT_USER = { name: 'Rindu', role: 'purchasing', email: 'purchasing@afatharshop.com' };
const normalizeBatch = (b) => {
  if (!b) return null;
  return {
    id: b.id,
    name: b.name || b.title || '',
    title: b.name || b.title || '',
    brand_id: b.brand_id || b.brand?.id || null,
    brand: typeof b.brand === 'object' ? (b.brand?.name || '') : (b.brand || ''),
    start_date: b.start_date ? String(b.start_date).slice(0, 10) : '',
    close_date: b.close_date ? String(b.close_date) : '',
    estimated_shipment: b.estimated_shipment ? String(b.estimated_shipment).slice(0, 10) : '',
    status: b.status === 'closed' ? 'closed' : 'open',
    products_count: num(b.products_count),
  };
};

const PAGE_DESC =
  'Kelola katalog PO, ACC pesanan dari tim, harga & diskon brand, kuota varian, serta rekap checkout per produk.';

export default function PurchasingDashboard({
  currentUser,
  onUpdateUser,
  onUpdateAvatar,
  onNavigateStore,
  onLogout,
  initialMenu = 'dashboard',
  orders: ordersProp,
  products: productsProp,
  brands: brandsProp,
  suppliers: suppliersProp,
  mitra: mitraProp,
  team: teamProp,
  poBatches: poBatchesProp,
  onChangeBatches,
  paymentRequests: paymentRequestsProp,
  bankAccounts: bankAccountsProp,
  couriers: couriersProp,
  categories: categoriesProp,
  deposits: depositsProp,
  settings: settingsProp,
  deletedOrders: deletedOrdersProp,
  onChangeOrders,
  onChangeProducts,
  onChangeBrands,
  onChangeSuppliers,
  onChangeMitra,
  onChangeTeam,
  onChangePaymentRequests,
  onChangeDeposits,
  onChangeSettings,
  onChangeDeletedOrders,
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
  const [activeMenu, setActiveMenu] = useState(initialMenu || 'dashboard');
  useEffect(() => {
    if (initialMenu) setActiveMenu(initialMenu);
  }, [initialMenu]);
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
  const [deletedOrders, commitDeletedOrders] = useDataState(
    deletedOrdersProp,
    [],
    onChangeDeletedOrders
  );

  useEffect(() => {
    if (deletedOrdersProp !== undefined) return;
    try {
      const saved = localStorage.getItem('afathar_deleted_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) commitDeletedOrders(parsed);
      }
    } catch (e) {
      console.warn('Gagal memuat arsip penjualan terhapus dari storage:', e);
    }
  }, []);

  useEffect(() => {
    if (deletedOrdersProp !== undefined) return;
    try {
      localStorage.setItem('afathar_deleted_orders', JSON.stringify(deletedOrders));
    } catch (e) {
      console.warn('Gagal menyimpan arsip penjualan terhapus ke storage:', e);
    }
  }, [deletedOrders, deletedOrdersProp]);

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
    dpPct: num(seed.settings.dpPct) || DEFAULT_DP_PCT,
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

  // Pengajuan pembayaran
  const [prFilter, setPrFilter] = useState('all');
  const [prDetailId, setPrDetailId] = useState(null);

  // Rekap & penjualan terhapus
  const [rekapBrand, setRekapBrand] = useState('all');
  const [trashSearch, setTrashSearch] = useState('');
  const [trashSelected, setTrashSelected] = useState([]);

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

  // Batch PO Master
  const [poBatches, setPoBatches] = useState(() => {
    if (Array.isArray(poBatchesProp) && poBatchesProp.length > 0) {
      return poBatchesProp.map(normalizeBatch).filter(Boolean);
    }
    return [];
  });

  const commitBatches = (updater) => {
    setPoBatches((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (typeof onChangeBatches === 'function') {
        onChangeBatches(next);
      }
      return next;
    });
  };

  useEffect(() => {
    if (Array.isArray(poBatchesProp) && poBatchesProp.length > 0) {
      setPoBatches(poBatchesProp.map(normalizeBatch).filter(Boolean));
    }
  }, [poBatchesProp]);

  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState('all');
  const [batchBrandFilter, setBatchBrandFilter] = useState('all');
  const [batchModal, setBatchModal] = useState(null);

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
          commitBatches(batchesRes.value.data.map(normalizeBatch).filter(Boolean));
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
        const list = orders.filter(
          (o) =>
            String(o.mitraId) === String(m.id) ||
            (dbId(o.mitraId) && dbId(o.mitraId) === dbId(m)) ||
            (o.mitraName && o.mitraName === m.name)
        );
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
    () =>
      orders.find((o) => o.invoice === detailInvoice) ||
      deletedOrders.find((o) => o.invoice === detailInvoice) ||
      null,
    [orders, deletedOrders, detailInvoice]
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
  const mitraDetail = useMemo(
    () =>
      mitraRows.find(
        (m) =>
          String(m.id) === String(mitraDetailId) ||
          (dbId(m) && dbId(m) === dbId(mitraDetailId))
      ) || null,
    [mitraRows, mitraDetailId]
  );
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
          { id: 'batch', label: 'Batch PO', title: 'Manajemen Batch Pre-Order', icon: 'clock' },
          { id: 'kategori', label: 'Kategori Produk', title: 'Master Kategori Produk', icon: 'filter' },
          { id: 'brand', label: 'Brand Vendor', title: 'Master Brand & Diskon Mitra', icon: 'shield' },
          { id: 'supplier', label: 'Supplier Pabrik', title: 'Master Supplier Pabrik', icon: 'truck' }
        ]
      },
      {
        group: 'sdm',
        label: 'Mitra & Tim',
        children: [
          {
            id: 'mitra',
            label: 'Mitra & User',
            title: 'Data Mitra & User',
            icon: 'users',
            badge: mitra.filter((m) => !m.active).length || null
          },
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
      { id: 'terhapus', label: 'Penjualan Terhapus', title: 'Penjualan Terhapus', icon: 'trash' },
      { id: 'pengaturan_akun', label: 'Pengaturan Akun', title: 'Pengaturan Profil & Keamanan', icon: 'settings' }
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
    const ok = await patchOrder(o.invoice, {
      marketingStatus: MKT.PENDING,
      marketingNote: '',
      status: 'Menunggu ACC Marketing'
    });
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
      onSubmit: async (reason) => {
        const targetId = dbId(o) || (num(o.id) > 0 ? num(o.id) : null) || o.invoice;
        if (targetId) {
          try {
            await api.management.trashOrder(targetId, { reason, deleted_by: me.name });
          } catch (err) {
            return serverFail(err, `Menghapus pesanan ${o.invoice}`);
          }
        }
        commitOrders((prev) => prev.filter((x) => x.invoice !== o.invoice));
        commitDeletedOrders((prev) => [
          { ...o, deletedAt: todayISO(), deletedBy: me.name, deleteReason: reason },
          ...prev
        ]);
        if (o.marketingStatus !== MKT.TOLAK) adjustQuota(o, -num(o.qty));
        setReasonModal(null);
        setDetailInvoice(null);
        toast(`${o.invoice} dipindahkan ke Penjualan Terhapus.`, 'warning');
      }
    });

  const restoreOrder = async (o) => {
    const targetId = dbId(o) || (num(o.id) > 0 ? num(o.id) : null) || o.invoice;
    let restoredServerOrder = null;
    if (targetId) {
      try {
        const res = await api.management.restoreOrder(targetId);
        restoredServerOrder = res?.data || null;
      } catch (err) {
        return serverFail(err, `Memulihkan pesanan ${o.invoice}`);
      }
    }
    commitDeletedOrders((prev) => prev.filter((x) => x.invoice !== o.invoice));
    setTrashSelected((prev) => prev.filter((inv) => inv !== o.invoice));
    commitOrders((prev) => [
      {
        ...o,
        deletedAt: '',
        deletedBy: '',
        deleteReason: '',
        ...(restoredServerOrder ? { backendId: restoredServerOrder.id, id: restoredServerOrder.id } : {})
      },
      ...prev
    ]);
    if (o.marketingStatus !== MKT.TOLAK) adjustQuota(o, num(o.qty));
    toast(`${o.invoice} berhasil dipulihkan.`);
  };

  const handlePermanentDelete = async (o) => {
    const targetId = dbId(o) || (num(o.id) > 0 ? num(o.id) : null) || o.invoice;
    if (targetId) {
      try {
        await api.management.deleteOrder(targetId);
      } catch (err) {
        return serverFail(err, `Menghapus permanen ${o.invoice}`);
      }
    }
    commitDeletedOrders((prev) => prev.filter((x) => x.invoice !== o.invoice));
    setTrashSelected((prev) => prev.filter((inv) => inv !== o.invoice));
    if (detailInvoice === o.invoice) setDetailInvoice(null);
    toast(`Pesanan ${o.invoice} berhasil dihapus permanen.`, 'warning');
  };

  const askPermanentDelete = (o) =>
    setConfirmModal({
      title: 'Hapus Permanen Pesanan',
      message: `Hapus pesanan "${o.invoice}" (${o.mitraName || 'Mitra'}) secara permanen? Data pesanan ini akan dihapus selamanya dari arsip dan tidak dapat dipulihkan kembali.`,
      confirmLabel: 'Hapus Permanen',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        await handlePermanentDelete(o);
      }
    });

  const askEmptyTrash = () => {
    if (deletedOrders.length === 0) return;
    setConfirmModal({
      title: 'Kosongkan Seluruh Arsip Terhapus',
      message: `Hapus seluruh (${deletedOrders.length}) pesanan di arsip penjualan terhapus secara permanen? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Kosongkan Arsip',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        await Promise.allSettled(
          deletedOrders.map((o) => {
            const targetId = dbId(o) || (num(o.id) > 0 ? num(o.id) : null) || o.invoice;
            return targetId ? api.management.deleteOrder(targetId) : Promise.resolve();
          })
        );
        commitDeletedOrders([]);
        setTrashSelected([]);
        setDetailInvoice(null);
        toast('Seluruh pesanan di arsip terhapus berhasil dihapus permanen.', 'warning');
      }
    });
  };

  const askDeleteSelectedTrash = () => {
    if (trashSelected.length === 0) return;
    const targets = deletedOrders.filter((o) => trashSelected.includes(o.invoice));
    setConfirmModal({
      title: 'Hapus Permanen Pesanan Terpilih',
      message: `Hapus permanen ${targets.length} pesanan yang dipilih dari arsip? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: `Hapus Permanen (${targets.length})`,
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        await Promise.allSettled(
          targets.map((o) => {
            const targetId = dbId(o) || (num(o.id) > 0 ? num(o.id) : null) || o.invoice;
            return targetId ? api.management.deleteOrder(targetId) : Promise.resolve();
          })
        );
        commitDeletedOrders((prev) => prev.filter((o) => !trashSelected.includes(o.invoice)));
        setTrashSelected([]);
        if (trashSelected.includes(detailInvoice)) setDetailInvoice(null);
        toast(`${targets.length} pesanan berhasil dihapus permanen.`, 'warning');
      }
    });
  };

  const restoreSelectedTrash = async () => {
    if (trashSelected.length === 0) return;
    const targets = deletedOrders.filter((o) => trashSelected.includes(o.invoice));
    const settled = await Promise.allSettled(
      targets.map((o) => {
        const targetId = dbId(o) || (num(o.id) > 0 ? num(o.id) : null) || o.invoice;
        return targetId ? api.management.restoreOrder(targetId) : Promise.resolve();
      })
    );
    const restoredInvoices = new Set();
    targets.forEach((o, idx) => {
      if (settled[idx]?.status === 'fulfilled') restoredInvoices.add(o.invoice);
    });
    if (!restoredInvoices.size) {
      return toast('Gagal memulihkan pesanan terpilih dari server.', 'error');
    }
    const restoredTargets = targets.filter((o) => restoredInvoices.has(o.invoice));
    commitDeletedOrders((prev) => prev.filter((o) => !restoredInvoices.has(o.invoice)));
    commitOrders((prev) => [
      ...restoredTargets.map((o) => ({ ...o, deletedAt: '', deletedBy: '', deleteReason: '' })),
      ...prev
    ]);
    restoredTargets.forEach((o) => {
      if (o.marketingStatus !== MKT.TOLAK) adjustQuota(o, num(o.qty));
    });
    setTrashSelected([]);
    toast(`${restoredTargets.length} pesanan berhasil dipulihkan.`);
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

    // Sinkronkan ke API backend secara asinkron
    Promise.allSettled(
      created.map(async (item) => {
        const addonTotal = (item.addon || 0) * item.qty;
        const netFee = addonTotal - (item.discountNominal || 0);
        const payload = {
          user_id: dbId(item.mitraId) || (typeof item.mitraId === 'number' ? item.mitraId : null),
          order_number: item.invoice,
          invoice: item.invoice,
          subtotal: item.subtotal,
          shipping_cost: item.ongkir || 0,
          total_amount: (item.subtotal || 0) + (item.ongkir || 0),
          notes: item.notes,
          status: 'Menunggu DP',
          marketing_status: 'ACC',
          marketing_by: me.name,
          items: [{
            product_id: dbId(item.produkId) || item.produkId,
            product_variant_id: dbId(item.variantId) || (typeof item.variantId === 'number' ? item.variantId : null),
            quantity: item.qty,
            unit_price: item.price,
            addon_nominal: addonTotal,
            fee: netFee,
            discount_nominal: item.discountNominal || 0,
            subtotal: item.subtotal
          }]
        };
        const res = await api.management.createOrder(payload);
        const srv = res?.data;
        if (srv?.id) {
          const srvInv = srv.invoice || {};
          const insts = Array.isArray(srvInv.installments) ? srvInv.installments : [];
          const dpInst = insts.find((x) => x.sequence === 1 || String(x.type || '').toLowerCase().includes('dp'));
          const pelInst = insts.slice().reverse().find((x) => x.sequence > 1 || String(x.type || '').toLowerCase().includes('lunas'));
          const instMap = {};
          insts.forEach((x) => {
            if (x.id && x.type) instMap[String(x.type).toLowerCase()] = x.id;
            if (x.id && x.sequence) instMap[`stage-${x.sequence}`] = x.id;
          });
          commitOrders((prev) =>
            prev.map((o) =>
              o.invoice === item.invoice
                ? {
                    ...o,
                    id: srv.id,
                    backendId: srv.id,
                    invoice: srv.order_number || o.invoice,
                    orderNo: srv.order_number || o.invoice,
                    invoiceId: srv.invoice_id ?? srvInv.id ?? null,
                    invoiceNumber: srv.invoice_number || srvInv.invoice_number || '',
                    dpInstallmentId: dpInst?.id ?? null,
                    pelunasanInstallmentId: pelInst?.id ?? null,
                    installmentIds: instMap
                  }
                : o
            )
          );
        }
      })
    ).then((results) => {
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length) {
        toast(`${failed.length} pesanan manual gagal tersimpan ke server.`, 'error');
      }
    });
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

    const seenSkus = new Set();
    const variants = (f.variants || []).map((v) => {
      let candidate = String(v.sku || '').trim() || `${v.color} (${v.size})`;
      let counter = 1;
      const base = candidate;
      while (seenSkus.has(candidate.toUpperCase())) {
        counter++;
        candidate = `${base}-${counter}`;
      }
      seenSkus.add(candidate.toUpperCase());

      return {
        ...v,
        id: v.id || uid('v'),
        color: v.color || 'Standard',
        size: String(v.size || 'All'),
        model: v.model || 'Standard',
        sku: candidate,
        hpp: num(v.hpp) || 0,
        price: num(v.price) || 0,
        addon: num(v.addon) || 0,
        quota: num(v.quota ?? v.stock) || 10,
        stock: num(v.quota ?? v.stock) || 10,
        is_active: v.is_active !== undefined ? !!v.is_active : true
      };
    });

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
      image2: f.image2 || undefined,
      image3: f.image3 || undefined,
      image4: f.image4 || undefined,
      image5: f.image5 || undefined,
      image6: f.image6 || undefined,
      thumbnails: f.thumbnails || [f.image, f.image2, f.image3, f.image4, f.image5, f.image6].filter(Boolean),
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
      image2: f.image2 || undefined,
      image3: f.image3 || undefined,
      image4: f.image4 || undefined,
      image5: f.image5 || undefined,
      image6: f.image6 || undefined,
      reel_url: f.reelUrl || f.reel_url || undefined,
      thumbnails: f.thumbnails || [f.image, f.image2, f.image3, f.image4, f.image5, f.image6].filter(Boolean),
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
      image2: f.image2 || undefined,
      image3: f.image3 || undefined,
      image4: f.image4 || undefined,
      image5: f.image5 || undefined,
      image6: f.image6 || undefined,
      reel_url: f.reelUrl || f.reel_url || undefined,
      thumbnails: f.thumbnails || [f.image, f.image2, f.image3, f.image4, f.image5, f.image6].filter(Boolean),
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
    const matchedSup = f.supplier ? suppliers.find((s) => s.name === f.supplier) : null;
    const resolvedSupplierId = f.supplier
      ? (dbId(matchedSup) || dbId({ id: f.supplier_id }) || null)
      : null;
    const payload = {
      ...f,
      name: f.name.trim(),
      supplier: f.supplier || matchedSup?.name || '',
      supplier_id: resolvedSupplierId || null,
      address: f.address || matchedSup?.city || '',
      discountType: f.discountType === 'nominal' ? 'nominal' : 'pct',
      discount_type: f.discountType === 'nominal' ? 'nominal' : 'pct',
      discountValue: num(f.discountValue),
      discount_value: num(f.discountValue),
      feeType: f.feeType === 'nominal' ? 'nominal' : 'pct',
      fee_type: f.feeType === 'nominal' ? 'nominal' : 'pct',
      discountDBAll: num(f.discountDBAll),
      discount_db_all: num(f.discountDBAll),
      discountSubDB: num(f.discountSubDB),
      discount_sub_db: num(f.discountSubDB),
      discountAgen: num(f.discountAgen),
      discount_agen: num(f.discountAgen),
      discountReseller: num(f.discountReseller),
      discount_reseller: num(f.discountReseller)
    };

    if (brandModal.mode === 'edit') {
      const targetBrand = brands.find(
        (b) =>
          b.id === brandModal.id ||
          String(b.id) === String(brandModal.id) ||
          (dbId(b) && (dbId(b) === dbId(brandModal) || dbId(b) === dbId(brandModal.id))) ||
          (b.name && brandModal.form?.oldName && b.name.trim().toLowerCase() === brandModal.form.oldName.trim().toLowerCase()) ||
          (b.name && b.name.trim().toLowerCase() === payload.name.toLowerCase())
      );
      const oldName = targetBrand?.name || brandModal.form?.oldName || '';
      let targetBrandId = dbId(targetBrand) || dbId(brandModal) || dbId(brandModal.id) || targetBrand?.backendId;

      if (!targetBrandId) {
        try {
          const remoteRes = await api.management.brands();
          const list = Array.isArray(remoteRes?.data) ? remoteRes.data : [];
          const found = list.find(
            (rb) =>
              (oldName && String(rb.name).trim().toLowerCase() === oldName.trim().toLowerCase()) ||
              String(rb.name).trim().toLowerCase() === payload.name.trim().toLowerCase()
          );
          if (found?.id) targetBrandId = found.id;
        } catch (_) {}
      }

      let updatedData = null;
      if (targetBrandId) {
        try {
          const res = await api.management.updateBrand(targetBrandId, payload);
          updatedData = res?.data;
        } catch (err) {
          return serverFail(err, `Menyimpan brand ${payload.name}`);
        }
      } else {
        try {
          const res = await api.management.createBrand(payload);
          updatedData = res?.data;
          targetBrandId = updatedData?.id || null;
        } catch (err) {
          return serverFail(err, `Menyimpan brand ${payload.name}`);
        }
      }

      commitBrands((prev) =>
        prev.map((b) => {
          const isTarget =
            b.id === brandModal.id ||
            String(b.id) === String(brandModal.id) ||
            (targetBrand?.id && (b.id === targetBrand.id || String(b.id) === String(targetBrand.id))) ||
            (dbId(b) && targetBrandId && dbId(b) === targetBrandId) ||
            (oldName && b.name.trim().toLowerCase() === oldName.trim().toLowerCase()) ||
            (b.name && b.name.trim().toLowerCase() === payload.name.toLowerCase());
          return isTarget
            ? {
                ...b,
                ...(updatedData ? mapBrandToCore(updatedData) : {}),
                ...payload,
                id: b.id || (targetBrandId ? `b-${targetBrandId}` : uid('b')),
                backendId: targetBrandId || b.backendId,
                oldName: oldName || b.name
              }
            : b;
        })
      );

      // Sinkronkan nama brand pada produk-produk yang terasosiasi di dashboard
      if (oldName && oldName !== payload.name) {
        commitProducts((prev) =>
          prev.map((p) => {
            const matchesOld =
              String(p.brand || '').trim().toLowerCase() === oldName.trim().toLowerCase() ||
              p.brand_id === targetBrandId ||
              p.brandId === targetBrand?.id;
            if (matchesOld) {
              return {
                ...p,
                brand: payload.name,
                brand_id: targetBrandId
              };
            }
            return p;
          })
        );
      }
      toast(`Brand ${payload.name} diperbarui.`);
    } else {
      let created;
      try {
        created = await api.management.createBrand(payload);
      } catch (err) {
        return serverFail(err, `Menambahkan brand ${payload.name}`);
      }
      const serverBrand = created?.data;
      const newB = {
        ...mapBrandToCore({
          ...payload,
          ...(serverBrand || {}),
          id: serverBrand?.id ?? null,
          supplier: serverBrand?.supplier?.name || payload.supplier
        }),
        ...payload
      };
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
        let targetBrandId = dbId(b) || b.backendId;
        if (!targetBrandId) {
          try {
            const remoteRes = await api.management.brands();
            const list = Array.isArray(remoteRes?.data) ? remoteRes.data : [];
            const found = list.find((rb) => String(rb.name).trim().toLowerCase() === String(b.name).trim().toLowerCase());
            if (found?.id) targetBrandId = found.id;
          } catch (_) {}
        }
        if (!targetBrandId) {
          commitBrands((prev) => prev.filter((x) => x.id !== b.id));
          setConfirmModal(null);
          return toast(`Brand ${b.name} dihapus (lokal).`, 'warning');
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

  /* ------------------------------------------------------------- batch PO */
  const refreshBatches = async () => {
    try {
      const res = await api.management.batches();
      if (Array.isArray(res?.data)) {
        const normalized = res.data.map(normalizeBatch).filter(Boolean);
        commitBatches(normalized);
        toast('Data Batch PO berhasil disinkronkan.');
      }
    } catch (err) {
      serverFail(err, 'Sinkronisasi Batch PO');
    }
  };

  const openCreateBatchModal = () => {
    const defaultBrand = brands[0] ? (dbId(brands[0]) || brands[0].id) : '';
    setBatchModal({
      mode: 'create',
      form: {
        name: '',
        brand_id: defaultBrand,
        status: 'open',
        start_date: todayISO(),
        close_date: addDays(todayISO(), 14),
        close_time: '23:59',
        estimated_shipment: addDays(todayISO(), 45)
      }
    });
  };

  const openEditBatchModal = (b) => {
    const targetBrand = brands.find((br) => br.name === b.brand || dbId(br) === b.brand_id);
    const brandId = targetBrand ? (dbId(targetBrand) || targetBrand.id) : (b.brand_id || '');

    let cDate = '';
    let cTime = '23:59';
    if (b.close_date) {
      if (b.close_date.includes('T')) {
        const parts = b.close_date.split('T');
        cDate = parts[0];
        cTime = parts[1]?.slice(0, 5) || '23:59';
      } else if (b.close_date.includes(' ')) {
        const parts = b.close_date.split(' ');
        cDate = parts[0];
        cTime = parts[1]?.slice(0, 5) || '23:59';
      } else {
        cDate = b.close_date.slice(0, 10);
      }
    }

    setBatchModal({
      mode: 'edit',
      id: b.id,
      batch: b,
      form: {
        name: b.name || b.title,
        brand_id: brandId,
        status: b.status || 'open',
        start_date: b.start_date ? b.start_date.slice(0, 10) : todayISO(),
        close_date: cDate || todayISO(),
        close_time: cTime,
        estimated_shipment: b.estimated_shipment ? b.estimated_shipment.slice(0, 10) : ''
      }
    });
  };

  const saveBatch = async (e) => {
    e?.preventDefault();
    if (!batchModal?.form) return;
    const { name, brand_id, status, start_date, close_date, close_time, estimated_shipment } = batchModal.form;
    const cleanName = String(name || '').trim();
    if (!cleanName) return toast('Nama Batch PO wajib diisi.', 'error');
    if (!brand_id) return toast('Pilih Brand pemilik Batch PO.', 'error');

    const fullCloseDate = close_date ? `${close_date} ${close_time || '23:59'}:00` : null;

    const payload = {
      name: cleanName,
      brand_id: Number(brand_id) || brand_id,
      status: status || 'open',
      start_date: start_date || null,
      close_date: fullCloseDate,
      estimated_shipment: estimated_shipment || null
    };

    if (batchModal.mode === 'edit') {
      const targetId = batchModal.id;
      try {
        const res = await api.management.updateBatch(targetId, payload);
        const updated = normalizeBatch(res?.data || { ...batchModal.batch, ...payload, id: targetId });
        commitBatches((prev) => prev.map((b) => (b.id === targetId ? updated : b)));
        toast(`Batch PO "${cleanName}" berhasil diperbarui.`);
        setBatchModal(null);
      } catch (err) {
        serverFail(err, `Memperbarui Batch PO ${cleanName}`);
      }
    } else {
      try {
        const res = await api.management.createBatch(payload);
        const created = normalizeBatch(res?.data || { ...payload, id: Date.now() });
        commitBatches((prev) => [...prev, created]);
        toast(`Batch PO "${cleanName}" berhasil dibuat.`);
        setBatchModal(null);
      } catch (err) {
        serverFail(err, `Membuat Batch PO ${cleanName}`);
      }
    }
  };

  const toggleBatchStatus = async (b) => {
    const nextStatus = b.status === 'closed' ? 'open' : 'closed';
    const labelAction = nextStatus === 'open' ? 'Membuka' : 'Menutup';
    try {
      const res = await api.management.updateBatch(b.id, { status: nextStatus });
      const updated = normalizeBatch(res?.data || { ...b, status: nextStatus });
      commitBatches((prev) => prev.map((item) => (item.id === b.id ? updated : item)));
      if (nextStatus === 'closed') {
        commitProducts((prev) =>
          prev.map((p) =>
            p.po_batch_id === b.id || p.batch === b.name
              ? { ...p, status: 'closed', statusLabel: 'PO Ditutup' }
              : p
          )
        );
      } else {
        commitProducts((prev) =>
          prev.map((p) =>
            p.po_batch_id === b.id || p.batch === b.name
              ? { ...p, status: 'open', statusLabel: 'Open Pre-Order' }
              : p
          )
        );
      }
      toast(`Batch PO "${b.name}" sekarang ${nextStatus === 'open' ? 'DIBUKA (Open)' : 'DITUTUP (Closed)'}. Seluruh produk terhubung telah disinkronkan.`);
    } catch (err) {
      serverFail(err, `${labelAction} Batch PO ${b.name}`);
    }
  };

  const deleteBatch = (b) => {
    const linkedCount =
      b.products_count ??
      products.filter((p) => p.po_batch_id === b.id || p.batch === b.name).length;
    if (linkedCount > 0) {
      return toast(
        `Batch PO "${b.name}" masih terhubung dengan ${linkedCount} produk. Pindahkan produk terlebih dahulu.`,
        'error'
      );
    }

    setConfirmModal({
      title: 'Hapus Batch PO',
      message: `Hapus batch "${b.name}"? Batch ini akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Hapus Batch',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await api.management.deleteBatch(b.id);
          commitBatches((prev) => prev.filter((item) => item.id !== b.id));
          toast(`Batch PO "${b.name}" berhasil dihapus.`, 'warning');
        } catch (err) {
          serverFail(err, `Menghapus Batch PO ${b.name}`);
        }
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
    toast(`${m.name} ${m.active ? 'dinonaktifkan' : 'di-ACC dan diaktifkan'}.`);
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

  const resetProofForm = () => {
    setProofForm((prev) => ({
      ...prev,
      nominal: '',
      invoice: '',
      refNo: '',
      proof: '',
      proofFile: null
    }));
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

    const m = mitra.find((x) => String(x.id) === String(f.mitraId));
    if (!m) return toast('Mitra tidak ditemukan.', 'error');
    const mitraDbId = dbId(m);
    if (!mitraDbId) return notOnServer(`Mitra ${m.name}`);

    const activeBanks = (bankAccounts || []).filter((b) => b.active !== false);
    const bank =
      bankAccounts.find((b) => String(b.id) === String(f.bankId)) ||
      activeBanks[0] ||
      null;

    setIsSubmittingProof(true);
    try {
      let proofPath = '';
      if (f.proofFile) {
        try {
          const uploaded = await api.management.uploadFile(f.proofFile, 'proof');
          proofPath = uploaded?.data?.path || '';
        } catch (err) {
          return serverFail(err, 'Mengunggah bukti transfer');
        }
        if (!proofPath) return toast('Bukti transfer tidak tersimpan di server.', 'error');
      }

      if (f.kind === 'Deposit') {
        let created;
        try {
          created = await api.management.createDeposit({
            user_id: mitraDbId,
            bank_account_id: dbId(bank) || bank?.backendId || null,
            amount: nominal,
            date: f.date || undefined,
            proof_url: proofPath || '',
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
            date: f.date || todayISO(),
            nominal,
            bank: row?.bank || bank?.bank || '-',
            accountNo: row?.bank_account || '',
            proof: row?.proof_url || proofPath ? mediaUrl(row?.proof_url || proofPath) : '',
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
      const paymentIdKey = { DP: 'dpPaymentId', Pelunasan: 'pelunasanPaymentId', Ongkir: 'ongkirPaymentId' }[f.kind];
      const bankKey = { DP: 'dpBank', Pelunasan: 'pelunasanBank', Ongkir: 'ongkirBank' }[f.kind];
      const noteKey = { DP: 'dpNote', Pelunasan: 'pelunasanNote', Ongkir: 'ongkirNote' }[f.kind];

      const orderNumericId = dbId(o) || (Number.isInteger(o.backendId) ? o.backendId : null);
      let payRes = null;
      try {
        payRes = await api.management.createPayment({
          ...(orderNumericId ? { order_id: orderNumericId } : {}),
          invoice_number: o.invoiceNumber || '',
          order_number: o.invoice,
          installment_id:
            f.kind === 'DP' ? o.dpInstallmentId || null : f.kind === 'Pelunasan' ? o.pelunasanInstallmentId || null : null,
          stage: f.kind.toLowerCase(),
          amount: nominal,
          bank_account_id: dbId(bank) || bank?.backendId || null,
          bank_name: bank?.bank || '',
          account_number: bank?.accountNo || '',
          date: f.date || undefined,
          note: f.refNo || 'Input manual admin purchasing',
          proof_url: proofPath || ''
        });
      } catch (err) {
        return serverFail(err, `Bukti ${f.kind} ${o.invoice}`);
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
        const createdPayId = payRes?.data?.payment?.id ?? payRes?.data?.id ?? null;
        commitOrders((prev) =>
          prev.map((x) =>
            x.invoice === o.invoice
              ? {
                  ...x,
                  [statusKey]: PAY.MENUNGGU,
                  [proofKey]: proofPath ? mediaUrl(proofPath) : '',
                  [bankKey]: bank?.bank || x[bankKey] || '',
                  [noteKey]: f.refNo || x[noteKey] || '',
                  ...(createdPayId ? { [paymentIdKey]: createdPayId } : {})
                }
              : x
          )
        );
      }
      toast(`Bukti ${f.kind} ${o.invoice} tersimpan. Menunggu verifikasi finance.`);
      resetProofForm();
    } finally {
      setIsSubmittingProof(false);
    }
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
    name: b?.name || '',
    oldName: b?.name || '',
    supplier: b?.supplier || '',
    supplier_id: b?.supplier_id || null,
    address: b?.address || '',
    discountType: b?.discountType || 'pct',
    discountValue: b?.discountValue ?? b?.discountDBAll ?? 0,
    feeType: b?.feeType || 'pct',
    discountDBAll: b?.discountDBAll ?? 30,
    discountSubDB: b?.discountSubDB ?? 25,
    discountAgen: b?.discountAgen ?? 20,
    discountReseller: b?.discountReseller ?? 15
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
        image2: p.image2 || p.thumbnails?.[1] || '',
        image3: p.image3 || p.thumbnails?.[2] || '',
        image4: p.image4 || p.thumbnails?.[3] || '',
        image5: p.image5 || p.thumbnails?.[4] || '',
        image6: p.image6 || p.thumbnails?.[5] || '',
        thumbnails: p.thumbnails || [p.image, p.image2, p.image3, p.image4, p.image5, p.image6].filter(Boolean),
        reelUrl: p.reelUrl || p.reel_url || p.videoUrl || '',
        videoUrl: p.videoUrl || p.reelUrl || p.reel_url || '',
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
      if (!prev || !prev.form) return prev;
      const kept = prev.form.stages || [];
      const base = isoDateOf(kept[0]?.date) || prev.form.closeDate || todayISO();
      const pcts = defaultStagePcts(count, DEFAULT_DP_PCT);
      return {
        ...prev,
        form: {
          ...prev.form,
          terminCount: count,
          stages: pcts.map((pct, index) => ({
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
      if (!prev || !prev.form) return prev;
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

  const filteredBatches = useMemo(() => {
    return poBatches.filter((b) => {
      const q = batchSearch.trim().toLowerCase();
      const matchQuery = !q || `${b.name} ${b.brand}`.toLowerCase().includes(q);
      const matchStatus = batchStatusFilter === 'all' || b.status === batchStatusFilter;
      const matchBrand =
        batchBrandFilter === 'all' ||
        String(b.brand_id) === String(batchBrandFilter) ||
        b.brand === batchBrandFilter;
      return matchQuery && matchStatus && matchBrand;
    });
  }, [poBatches, batchSearch, batchStatusFilter, batchBrandFilter]);

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
        const isClosed = p.status === 'closed' || p.status === 'closed_po' || p.isClosedPO === true;
        acc.all += 1;
        if (p.isSale) acc.sale += 1;
        if (isClosed) acc.closed += 1;
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
        const isClosed = p.status === 'closed' || p.status === 'closed_po' || p.isClosedPO === true;
        if (catalogBrand !== 'all' && p.brand !== catalogBrand) return false;
        if (catalogCategory !== 'all' && p.category !== catalogCategory) return false;
        if (catalogStatus === 'open' && isClosed) return false;
        if (catalogStatus === 'closed' && !isClosed) return false;
        if (catalogStatus === 'closing' && (isClosed || diffDays(p.closeDate, todayISO()) > 0)) return false;
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

  const productFormStages = productModal?.form
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
        portalSub="Afatharshop · Katalog & Penjualan PO"
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
          <PurchasingOverviewTab
            pageDesc={PAGE_DESC}
            exportProducts={exportProducts}
            goTo={goTo}
            products={products}
            pendingAcc={pendingAcc}
            activeOrders={activeOrders}
            orders={orders}
            omzet={omzet}
            dpCollected={dpCollected}
            mitra={mitra}
            marketingPR={marketingPR}
            setDetailInvoice={setDetailInvoice}
            setPrDetailId={setPrDetailId}
            stageMetaStages={stageMetaStages}
            stageCounts={stageCounts}
            setStageFilter={setStageFilter}
            barTone={barTone}
            stageMeta={stageMeta}
            productSummary={productSummary}
            approveOrder={approveOrder}
            accent={accent}
          />
        )}

        {/* ========================== ACC PESANAN =========================== */}
        {activeMenu === 'acc_pesanan' && (
          <PurchasingAccOrdersTab
            pendingAcc={pendingAcc}
            accSelected={accSelected}
            setAccSelected={setAccSelected}
            approveMany={approveMany}
            filteredAcc={filteredAcc}
            accSearch={accSearch}
            setAccSearch={setAccSearch}
            setDetailInvoice={setDetailInvoice}
            setReasonModal={setReasonModal}
            rejectOrder={rejectOrder}
            approveOrder={approveOrder}
          />
        )}

        {/* ============================ LIST PESANAN ========================= */}
        {activeMenu === 'pesanan' && (
          <PurchasingOrdersTab
            filteredOrders={filteredOrders}
            exportOrders={exportOrders}
            goTo={goTo}
            orders={orders}
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            listSearch={listSearch}
            setListSearch={setListSearch}
            listBrand={listBrand}
            setListBrand={setListBrand}
            brands={brands}
            listLevel={listLevel}
            setListLevel={setListLevel}
            levels={LEVELS}
            listPag={listPag}
            setDetailInvoice={setDetailInvoice}
            approveOrder={approveOrder}
            setReasonModal={setReasonModal}
            rejectOrder={rejectOrder}
            reopenOrder={reopenOrder}
            setProduction={setProduction}
            openWA={openWA}
            askDelete={askDelete}
          />
        )}

        {/* =========================== TAMBAH PESANAN ======================= */}
        {activeMenu === 'tambah_pesanan' && (
          <PurchasingManualOrderTab
            draft={draft}
            setDraft={setDraft}
            mitra={mitra}
            draftPreview={draftPreview}
            brands={brands}
            products={products}
            addDraft={addDraft}
            draftList={draftList}
            setDraftList={setDraftList}
            submitDrafts={submitDrafts}
          />
        )}

        {/* =========================== REKAP CHECKOUT ======================= */}
        {activeMenu === 'rekap_produk' && (
          <PurchasingProductSummaryTab
            productFiltered={productFiltered}
            exportProducts={exportProducts}
            rekapBrand={rekapBrand}
            setRekapBrand={setRekapBrand}
            brands={brands}
            priceRangeOf={priceRangeOf}
            expandedProducts={expandedProducts}
            setExpandedProducts={setExpandedProducts}
          />
        )}

        {/* ============================== KATALOG =========================== */}
        {activeMenu === 'produk' && (
          <PurchasingCatalogTab
            products={products}
            setProductModal={setProductModal}
            blankProduct={blankProduct}
            catalogStatus={catalogStatus}
            setCatalogStatus={setCatalogStatus}
            catalogCounts={catalogCounts}
            catalogFiltered={catalogFiltered}
            isCatalogFilterActive={isCatalogFilterActive}
            handleResetCatalogFilter={handleResetCatalogFilter}
            catalogSearch={catalogSearch}
            setCatalogSearch={setCatalogSearch}
            catalogBrand={catalogBrand}
            setCatalogBrand={setCatalogBrand}
            brands={brands}
            catalogCategory={catalogCategory}
            setCatalogCategory={setCatalogCategory}
            catalogCategories={catalogCategories}
            catalogSort={catalogSort}
            setCatalogSort={setCatalogSort}
            priceRangeOf={priceRangeOf}
            openEditProduct={openEditProduct}
            openVariantModal={openVariantModal}
            setProductOrderId={setProductOrderId}
            toggleProductStatus={toggleProductStatus}
            deleteProduct={deleteProduct}
          />
        )}

        {/* =============================== BRAND ============================ */}
        {activeMenu === 'brand' && (
          <PurchasingBrandsTab
            brands={brands}
            setBrandModal={setBrandModal}
            blankBrand={blankBrand}
            productSummary={productSummary}
            feeBadges={feeBadges}
            brandSearch={brandSearch}
            setBrandSearch={setBrandSearch}
            distinctBrandCities={distinctBrandCities}
            brandCityFilter={brandCityFilter}
            setBrandCityFilter={setBrandCityFilter}
            brandSort={brandSort}
            setBrandSort={setBrandSort}
            filteredBrands={filteredBrands}
            brandFormFrom={brandFormFrom}
            deleteBrand={deleteBrand}
          />
        )}

        {/* ============================= SUPPLIER =========================== */}
        {activeMenu === 'supplier' && (
          <PurchasingSuppliersTab
            suppliers={suppliers}
            setSupplierModal={setSupplierModal}
            blankSupplier={blankSupplier}
            brands={brands}
            deleteSupplier={deleteSupplier}
          />
        )}

        {/* ============================= MITRA ============================== */}
        {activeMenu === 'mitra' && (
          <PurchasingMitraTab
            mitra={mitra}
            setMitraModal={setMitraModal}
            blankMitra={blankMitra}
            mitraRows={mitraRows}
            setMitraDetailId={setMitraDetailId}
            toggleMitra={toggleMitra}
            deleteMitra={deleteMitra}
          />
        )}

        {/* ============================ TIM ADMIN =========================== */}
        {activeMenu === 'tim' && (
          <PurchasingTeamTab
            team={team}
            setTeamModal={setTeamModal}
            toggleTeam={toggleTeam}
            deleteTeam={deleteTeam}
          />
        )}

        {/* ========================= INPUT BUKTI TRANSFER ==================== */}
        {activeMenu === 'input_bukti' && (
          <PurchasingManualProofTab
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
          />
        )}

        {/* ============================ PENGAJUAN =========================== */}
        {activeMenu === 'pengajuan' && (
          <PurchasingPaymentRequestsTab
            prCounts={prCounts}
            paymentRequests={paymentRequests}
            prFilter={prFilter}
            setPrFilter={setPrFilter}
            filteredPr={filteredPr}
            setPrDetailId={setPrDetailId}
          />
        )}

        {/* ============================ REKAP FEE =========================== */}
        {activeMenu === 'rekap_fee' && (
          <FeeRecapPanel
            orders={orders}
            brands={brands}
            subtitle="Rekap fee mitra yang dipotong saat checkout dan diskon brand dari pabrik yang menjadi fee perusahaan."
          />
        )}

        {/* ========================== TERHAPUS / TRASH ====================== */}
        {activeMenu === 'terhapus' && (
          <PurchasingDeletedOrdersTab
            deletedOrders={deletedOrders}
            trashSelected={trashSelected}
            setTrashSelected={setTrashSelected}
            restoreSelectedTrash={restoreSelectedTrash}
            askDeleteSelectedTrash={askDeleteSelectedTrash}
            askEmptyTrash={askEmptyTrash}
            trashSearch={trashSearch}
            setTrashSearch={setTrashSearch}
            filteredTrash={filteredTrash}
            setDetailInvoice={setDetailInvoice}
            restoreOrder={restoreOrder}
            askPermanentDelete={askPermanentDelete}
          />
        )}

        {/* ============================ BATCH PO ============================ */}
        {activeMenu === 'batch' && (
          <PurchasingBatchesTab
            poBatches={poBatches}
            refreshBatches={refreshBatches}
            openCreateBatchModal={openCreateBatchModal}
            batchSearch={batchSearch}
            setBatchSearch={setBatchSearch}
            batchStatusFilter={batchStatusFilter}
            setBatchStatusFilter={setBatchStatusFilter}
            batchBrandFilter={batchBrandFilter}
            setBatchBrandFilter={setBatchBrandFilter}
            brands={brands}
            filteredBatches={filteredBatches}
            products={products}
            toggleBatchStatus={toggleBatchStatus}
            openEditBatchModal={openEditBatchModal}
            deleteBatch={deleteBatch}
          />
        )}

        {/* ============================ KATEGORI ============================ */}
        {activeMenu === 'kategori' && (
          <PurchasingCategoriesTab
            categories={categories}
            setCategoryModal={setCategoryModal}
            products={products}
            deleteCategory={deleteCategory}
          />
        )}

        {/* ============================ REKENING ============================ */}
        {activeMenu === 'rekening' && (
          <PurchasingBankAccountsTab
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
          <PurchasingCouriersTab
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
            role="marketing"
          />
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
              {detailOrder.deletedAt ? (
                <>
                  <Button
                    variant="outline"
                    icon="refresh"
                    onClick={() => {
                      restoreOrder(detailOrder);
                      setDetailInvoice(null);
                    }}
                  >
                    Pulihkan
                  </Button>
                  <Button
                    variant="dangerOutline"
                    icon="trash"
                    onClick={() => {
                      setDetailInvoice(null);
                      askPermanentDelete(detailOrder);
                    }}
                  >
                    Hapus Permanen
                  </Button>
                </>
              ) : (
                <>
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
          onCreateBrand={async (brandPayload) => {
            try {
              let cleanPayload = { ...brandPayload };
              const res = await api.management.createBrand(cleanPayload);
              if (res?.data) {
                const serverBrand = res.data;
                const newB = mapBrandToCore({
                  ...cleanPayload,
                  ...(serverBrand || {}),
                  id: serverBrand?.id ?? null,
                  supplier: serverBrand?.supplier?.name || cleanPayload.supplier
                });
                commitBrands((prev) => [newB, ...prev]);
                return serverBrand;
              }
            } catch (err) {
              console.error('Gagal membuat brand baru:', err);
              throw err;
            }
            return null;
          }}
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
                const normalized = normalizeBatch(res.data);
                commitBatches((prev) => [...prev, normalized]);
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
                  onChange={(e) => {
                    const supName = e.target.value;
                    const matched = suppliers.find((s) => s.name === supName);
                    setBrandModal((prev) => ({
                      ...prev,
                      form: {
                        ...prev.form,
                        supplier: supName,
                        supplier_id: matched ? (dbId(matched) || matched.id) : null,
                        address: matched?.city || prev.form.address || ''
                      }
                    }));
                  }}
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
                  onChange={(next) =>
                    setMitraModal((prev) => ({ ...prev, form: { ...prev.form, active: next } }))
                  }
                />
              </>
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
          title={teamModal.mode === 'edit' ? 'Edit Akun Tim' : 'Akun Tim Baru'}
          subtitle={teamModal.mode === 'edit' ? 'Perbarui data akun admin finance atau purchasing.' : 'Akun finance dapat verifikasi pembayaran; akun purchasing mengelola pesanan & katalog.'}
          onClose={() => setTeamModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setTeamModal(null)}>
                Batal
              </Button>
              <Button type="submit" form="team-form" icon="check">
                {teamModal.mode === 'edit' ? 'Simpan Perubahan' : 'Buat Akun Tim'}
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
            {teamModal.mode === 'edit' && (
              <>
                <Field label="Reset Password (Opsional)" hint="Kosongkan bila tidak ingin mengubah password. Minimal 6 karakter.">
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

      {/* ======================= MODAL BATCH PO ======================= */}
      {batchModal && (
        <Modal
          title={batchModal.mode === 'edit' ? 'Ubah Batch Pre-Order' : 'Batch Pre-Order Baru'}
          subtitle="Batch PO mengatur periode buka-tutup PO yang dipakai oleh produk-produk di dalamnya."
          onClose={() => setBatchModal(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setBatchModal(null)}>
                Batal
              </Button>
              <Button type="submit" form="batch-form" icon="check">
                {batchModal.mode === 'edit' ? 'Simpan Perubahan' : 'Buat Batch'}
              </Button>
            </>
          }
        >
          <form id="batch-form" onSubmit={saveBatch} className="space-y-3.5">
            <Field label="Nama Batch PO" required hint="Contoh: Batch 1 - Sarimbit Raya, Batch Oktober">
              <Input
                placeholder="Nama Batch PO"
                value={batchModal.form.name || ''}
                onChange={(e) =>
                  setBatchModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, name: e.target.value }
                  }))
                }
              />
            </Field>

            <Field label="Brand Vendor" required hint="Batch PO wajib terhubung ke salah satu brand">
              <Select
                value={batchModal.form.brand_id || ''}
                onChange={(e) =>
                  setBatchModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, brand_id: e.target.value }
                  }))
                }
              >
                <option value="">-- Pilih Brand --</option>
                {brands.map((br) => (
                  <option key={br.id || br.name} value={dbId(br) || br.id}>
                    {br.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tanggal Buka PO" hint="Tanggal awal pemesanan">
                <Input
                  type="date"
                  value={batchModal.form.start_date || ''}
                  onChange={(e) =>
                    setBatchModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, start_date: e.target.value }
                    }))
                  }
                />
              </Field>

              <Field label="Status Batch PO">
                <Select
                  value={batchModal.form.status || 'open'}
                  onChange={(e) =>
                    setBatchModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, status: e.target.value }
                    }))
                  }
                >
                  <option value="open">OPEN (Buka PO)</option>
                  <option value="closed">CLOSED (Tutup PO)</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tanggal Tutup PO" hint="Batas akhir pesanan">
                <Input
                  type="date"
                  value={batchModal.form.close_date || ''}
                  onChange={(e) =>
                    setBatchModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, close_date: e.target.value }
                    }))
                  }
                />
              </Field>

              <Field label="Jam Tutup PO" hint="Waktu tutup (default 23:59)">
                <Input
                  type="time"
                  value={batchModal.form.close_time || '23:59'}
                  onChange={(e) =>
                    setBatchModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, close_time: e.target.value }
                    }))
                  }
                />
              </Field>
            </div>

            <Field label="Estimasi Pengiriman (Ready)" hint="Perkiraan barang siap dikirim ke mitra">
              <Input
                type="date"
                value={batchModal.form.estimated_shipment || ''}
                onChange={(e) =>
                  setBatchModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, estimated_shipment: e.target.value }
                  }))
                }
              />
            </Field>

            {batchModal.mode === 'edit' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Mengubah status menjadi Closed atau melewati tanggal tutup PO akan otomatis mengunci pesanan produk dalam batch ini di toko & dashboard mitra.
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
                onClick={() => window.open(waLink(mitraDetail.phone, `Halo ${mitraDetail.name}, kami dari Afatharshop.`), '_blank')}
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
              orders={orders.filter(
                (o) =>
                  String(o.mitraId) === String(mitraDetail.id) ||
                  (dbId(o.mitraId) && dbId(o.mitraId) === dbId(mitraDetail.id)) ||
                  (o.mitraName && o.mitraName === mitraDetail.name)
              )}
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
