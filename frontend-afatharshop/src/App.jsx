import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import FilterSection from './components/FilterSection';
import SaleSection from './components/SaleSection';
import PreOrderSection from './components/PreOrderSection';
import CatalogGrid from './components/CatalogGrid';
import ProductDetailPage from './components/ProductDetailPage';
import CartPage from './components/CartPage';
import CheckoutPage from './components/CheckoutPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import LogoutSuccessPage from './components/LogoutSuccessPage';
import Footer from './components/Footer';
import LoginPromptModal from './components/LoginPromptModal';
import SuccessAddToCartModal from './components/SuccessAddToCartModal';
import ProfileModal from './components/ProfileModal';
import OrdersModal from './components/OrdersModal';
import MitraDashboard from './components/dashboard/mitra/MitraDashboard';
import MarketingDashboard from './components/dashboard/MarketingDashboard';
import FinanceDashboard from './components/dashboard/FinanceDashboard';
import OwnerDashboard from './components/dashboard/OwnerFinanceDashboard';
import { createSeedData, PAY } from './components/dashboard/poCore';
import { openInvoicePrintTab } from './utils/printInvoice';
import { dpPercentFor } from './utils/terminScheme';
import {
  alignCoreOrdersToProducts,
  buildMitraList,
  coreBrandsToProject,
  coreOrdersToProject,
  coreProductsToProject,
  couriersToCore,
  normalizeLevel,
  paymentToDeposit,
  projectBrandsToCore,
  projectOrderToCore,
  projectOrdersToCore,
  projectPaymentToCoreOrder,
  projectProductsToCore
} from './components/dashboard/projectBridge';
import Toast from './components/Toast';
import { BRANDS, CATEGORIES, PRODUCTS, ROLES } from './data/mockData';
import { api, mediaUrl, tokenStore } from './services/api';
import {
  buildOrderPayload,
  mapApiUser,
  mapBankAccount,
  mapBatchToCore,
  mapBrands,
  mapBrandToCore,
  mapCategoryNames,
  mapCourier,
  mapDepositToCore,
  mapNotificationToHeader,
  mapOrderToProjectOrder,
  mapPaymentRequestToCore,
  mapPaymentToLedger,
  mapProducts,
  mapSettings,
  mapSupplier,
  mapUserToMitra,
  mapUserToTeam,
  roleIdFromApiUser
} from './services/adapters';
import { syncAddressBookFromApi } from './components/dashboard/mitra/mitraAddressBook';

const getCleanStoredAvatar = () => {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('afatharshop_user_avatar');
  if (stored && stored.includes('unsplash.com')) {
    localStorage.removeItem('afatharshop_user_avatar');
    return '';
  }
  return stored || '';
};

const DEFAULT_USER = {
  name: 'Mitra',
  role: 'Mitra Distributor',
  roleId: 'mitra',
  avatar: getCleanStoredAvatar(),
  balance: 'Rp 0',
  totalBill: 'Rp 0',
  phone: '',
  email: '',
  address: ''
};

export default function App() {
  // Page Navigation: 'home' | 'catalog' | 'product_detail' | 'cart' | 'login' | 'register' | 'logout_success' | 'mitra_dashboard' | 'marketing_dashboard' | 'finance_dashboard' | 'owner_dashboard'
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedPage = localStorage.getItem('afathar_current_page');
      if (savedPage && savedPage !== 'login' && savedPage !== 'logout_success') {
        return savedPage;
      }
    }
    return 'home';
  });

  // Global Catalog Products State (Published & updated strictly by Admin Marketing)
  const [products, setProducts] = useState(PRODUCTS);

  // Master kategori produk — dikelola Admin Purchasing, dipublikasikan ke filter toko
  const [poCategories, setPoCategories] = useState(() =>
    CATEGORIES.filter((c) => c !== 'Semua Kategori')
  );
  const storeCategories = useMemo(
    () => ['Semua Kategori', ...poCategories],
    [poCategories]
  );

  // Active Tab for Mitra Dashboard
  const [mitraActiveTab, setMitraActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('afathar_mitra_active_tab');
      if (savedTab) return savedTab;
    }
    return 'dashboard';
  });

  // Selected Product for Detail Page
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);

  // Auth States with LocalStorage Persistence to make Refresh fully stable & consistent
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window !== 'undefined') {
      const token = tokenStore.get();
      const savedAuth = localStorage.getItem('afathar_is_logged_in');
      if (token) return savedAuth !== 'false';
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const token = tokenStore.get();
      const savedUser = localStorage.getItem('afathar_current_user');
      if (token && savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return null;
  });

  const [activeRole, setActiveRole] = useState(() => {
    if (typeof window !== 'undefined') {
      const token = tokenStore.get();
      const savedRole = localStorage.getItem('afathar_active_role');
      if (token && savedRole) {
        try {
          return JSON.parse(savedRole);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return ROLES[0];
  });

  // Sesi JWT aktif — dipakai untuk memicu sinkronisasi pesanan dari backend
  const [sessionToken, setSessionToken] = useState(() => tokenStore.get());

  // Modal States
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [isSuccessCartOpen, setIsSuccessCartOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);

  // Toast State
  const [toast, setToast] = useState({
    show: false,
    message: '',
    actionLabel: '',
    onAction: null
  });

  // Header Notifications (read/unread + navigation target)
  const [notifications, setNotifications] = useState([]);

  // Filter States
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [brandSearchInput, setBrandSearchInput] = useState('');
  const [activeBrandKeyword, setActiveBrandKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState('Harga Tertinggi');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlySaleFilter, setOnlySaleFilter] = useState(false);

  // Cart Items State
  const [cartItems, setCartItems] = useState([]);

  // Selected items for Checkout Page
  const [checkoutItems, setCheckoutItems] = useState([]);

  // Initial project orders — empty for real data testing
  const [initialMitraOrders] = useState([]);

  // Shared PO model: semua dashboard & tampilan mitra membaca state yang sama
  const poSeed = useMemo(() => createSeedData(), []);
  const [poProducts, setPoProducts] = useState(() => projectProductsToCore(products));
  const [coreOrders, setCoreOrders] = useState(() =>
    alignCoreOrdersToProducts(
      projectOrdersToCore(initialMitraOrders, { currentUser, seedMitra: poSeed.mitra, products }),
      projectProductsToCore(products)
    )
  );
  const [brands, setBrands] = useState(BRANDS);
  const [poBrands, setPoBrands] = useState(() => projectBrandsToCore(BRANDS));
  const [poSuppliers, setPoSuppliers] = useState(poSeed.suppliers);
  const [poMitra, setPoMitra] = useState(() => buildMitraList(coreOrders, poSeed.mitra, currentUser));
  const [poTeam, setPoTeam] = useState(poSeed.team);
  const [poDeposits, setPoDeposits] = useState(poSeed.deposits);
  const [poPaymentRequests, setPoPaymentRequests] = useState(poSeed.paymentRequests);
  const [poLedger, setPoLedger] = useState(poSeed.ledger);
  const [poSettings, setPoSettings] = useState(poSeed.settings);
  const [mitraPayments, setMitraPayments] = useState([]);
  const mitraOrders = useMemo(() => coreOrdersToProject(coreOrders), [coreOrders]);

  // Live synchronous balance & total bill computation for the active user
  const computedUserBalance = useMemo(() => {
    if (!currentUser || (activeRole?.id && activeRole.id !== 'mitra')) return 'Rp 0';
    if (currentUser?.deposit_balance !== undefined && Number(currentUser.deposit_balance) > 0) {
      return `Rp ${Math.round(Number(currentUser.deposit_balance)).toLocaleString('id-ID')}`;
    }
    const m = poMitra.find(
      (x) => x.name.toLowerCase() === (currentUser?.name || 'Mitra').toLowerCase()
    );
    if (m && m.deposit !== undefined && Number(m.deposit) > 0) {
      return `Rp ${Math.round(Number(m.deposit)).toLocaleString('id-ID')}`;
    }
    const userAccDeposits = (poDeposits || [])
      .filter((d) => {
        const dName = String(d.mitraName || '').toLowerCase();
        const uName = String(currentUser?.name || 'Mitra').toLowerCase();
        const isMatch = !dName || dName.includes(uName) || uName.includes(dName);
        const st = String(d.status || '').toLowerCase();
        return isMatch && (st === 'acc' || (PAY && d.status === PAY.ACC) || st.includes('berhasil') || st.includes('terbukti'));
      })
      .reduce((sum, d) => sum + (Number(d.nominal) || 0), 0);
    if (userAccDeposits > 0) {
      return `Rp ${Math.round(userAccDeposits).toLocaleString('id-ID')}`;
    }
    if (currentUser?.deposit_balance !== undefined) {
      return `Rp ${Math.round(Number(currentUser.deposit_balance)).toLocaleString('id-ID')}`;
    }
    return 'Rp 0';
  }, [poMitra, poDeposits, currentUser, activeRole?.id]);

  const computedUserTotalBill = useMemo(() => {
    if (!currentUser || (activeRole?.id && activeRole.id !== 'mitra')) return 'Rp 0';
    const userOrders = mitraOrders.filter(
      (o) =>
        !o.mitraName ||
        o.mitraName.toUpperCase().includes((currentUser?.name || 'Mitra').toUpperCase())
    );
    const sumOutstanding = userOrders.reduce((sum, o) => sum + (Number(o.sisaTagihan) || 0), 0);
    return `Rp ${Math.round(sumOutstanding).toLocaleString('id-ID')}`;
  }, [mitraOrders, currentUser, activeRole?.id]);

  const synchronizedUser = useMemo(() => {
    if (!currentUser) return null;
    return {
      ...currentUser,
      balance: computedUserBalance,
      totalBill: computedUserTotalBill
    };
  }, [currentUser, computedUserBalance, computedUserTotalBill]);

  // Global PO Batches State (Controlled strictly by Admin Marketing - NOT Mitra)
  const [poBatches, setPoBatches] = useState([]);

  // Global Bank Accounts (Rekening Publik Toko & Rekening Pengajuan ke Owner)
  const [adminBankAccounts, setAdminBankAccounts] = useState([
    // Rekening Publik (Resmi Distributor untuk Mitra / Checkout / Deposit / Invoice)
    { id: 'bca', bank: 'BCA', accountNo: '739-082-9988', holder: 'CV AFATHAR SHOP DISTRIBUTOR', active: true, type: 'public', purpose: 'Penerimaan Pembayaran Mitra' },
    { id: 'mandiri', bank: 'MANDIRI', accountNo: '133-00-2998801', holder: 'CV AFATHAR SHOP DISTRIBUTOR', active: true, type: 'public', purpose: 'Penerimaan Pembayaran Mitra' },
    { id: 'bri', bank: 'BRI', accountNo: '0120-01-002998-50-2', holder: 'CV AFATHAR SHOP DISTRIBUTOR', active: true, type: 'public', purpose: 'Penerimaan Pembayaran Mitra' },
    { id: 'bsi', bank: 'BSI Syariah', accountNo: '718-002-9988', holder: 'CV AFATHAR SHOP DISTRIBUTOR', active: true, type: 'public', purpose: 'Penerimaan Pembayaran Mitra' },

    // Rekening Pengajuan ke Owner (Tujuan Transfer Vendor / Supplier / Produksi / Operasional)
    { id: 'pr-1', bank: 'BCA', accountNo: '522-034-1100', holder: 'PT HANA TEXTILE NUSANTARA', active: true, type: 'pengajuan', purpose: 'Supplier Kain & Bahan Baku' },
    { id: 'pr-2', bank: 'MANDIRI', accountNo: '131-00-9821733', holder: 'CV INDAH BORDIR KREASI', active: true, type: 'pengajuan', purpose: 'Vendor Jahit & Bordir Pabrik' },
    { id: 'pr-3', bank: 'BCA', accountNo: '883-019-4421', holder: 'PT LOGISTIK PRIMA CARGO', active: true, type: 'pengajuan', purpose: 'Ekspedisi Kargo Produksi' }
  ]);

  // Hanya rekening publik yang boleh tampil di checkout, cetak invoice, rincian tagihan, dan deposit mitra
  const publicBankAccounts = useMemo(
    () => (adminBankAccounts || []).filter((b) => b.type !== 'pengajuan'),
    [adminBankAccounts]
  );

  // Global Couriers (Updated strictly by Admin Finance)
  const [adminCouriers, setAdminCouriers] = useState([
    { id: 'jne', name: 'JNE Trucking (JTR)', active: true, note: 'Spesialis koli besar (10kg+)' },
    { id: 'jt', name: 'J&T Cargo', active: true, note: 'Door-to-door cargo ekonomis' },
    { id: 'dakota', name: 'Dakota Cargo', active: true, note: 'Rekomendasi luar pulau Jawa' },
    { id: 'wahana', name: 'Wahana Prestasi Logistik', active: true, note: 'Tarif hemat reguler' },
    { id: 'baraka', name: 'Baraka Sarana Tama', active: true, note: 'Rute Jawa - Sumatera' },
    { id: 'indah', name: 'Indah Logistik Cargo', active: true, note: 'Cakupan seluruh Indonesia' }
  ]);

  // Global Payment Proofs now live inside the shared PO model (orders/deposits)

  // Mitra Upload Proof -> masuk ke antrean verifikasi Finance pada order yang sama
  const handleUploadPayment = (paymentData) => {
    setCoreOrders((prev) => projectPaymentToCoreOrder(prev, paymentData));
    setToast({
      show: true,
      message: `Bukti pembayaran ${paymentData.orderNo} berhasil dikirim ke Admin Finance untuk validasi mutasi.`
    });
    if (tokenStore.get()) {
      api.my.payments().then((res) => {
        if (Array.isArray(res?.data)) setMitraPayments(res.data);
      }).catch(() => {});
    }
  };

  const handleDepositSubmit = (depositData) => {
    setPoDeposits((prev) => [paymentToDeposit(depositData), ...prev]);
    setToast({
      show: true,
      message: `Pengajuan deposit Rp ${Number(depositData.nominal || 0).toLocaleString('id-ID')} diteruskan ke antrean Finance.`
    });
    if (tokenStore.get()) {
      api.my.deposits().then((res) => {
        if (Array.isArray(res?.data)) {
          setPoDeposits(res.data.map(mapDepositToCore));
        }
      }).catch(() => {});
    }
  };

  // Mitra Membayar Tagihan menggunakan Saldo Deposit (Potong Saldo & Langsung ACC)
  const handlePayWithDeposit = ({ orderNo, billTitle, amount, billType, depositBalance }) => {
    const uName = String(currentUser?.name || 'Mitra').toLowerCase();
    const currentBalance =
      Number(String(currentUser?.balance || '').replace(/[^0-9]/g, '')) || 0;
    const nextBalance =
      depositBalance !== null && depositBalance !== undefined
        ? Number(depositBalance)
        : Math.max(0, currentBalance - (Number(amount) || 0));
    setPoMitra((prev) =>
      prev.map((m) => {
        if (m.name.toLowerCase().includes(uName) || uName.includes(m.name.toLowerCase())) {
          return { ...m, deposit: nextBalance };
        }
        return m;
      })
    );
    setCoreOrders((prev) =>
      prev.map((order) => {
        if (order.invoice !== orderNo && !orderNo.includes(order.invoice)) return order;
        const patch = {};
        const title = String(billTitle || '').toLowerCase();
        if (title.includes('dp')) {
          patch.dpStatus = 'ACC';
          patch.dpBank = 'Saldo Deposit Mitra';
          patch.dpNote = 'Lunas otomatis via Saldo Deposit';
          patch.dpPaidAt = new Date().toISOString().slice(0, 10);
        } else if (title.includes('pelunasan') || title.includes('lunas')) {
          patch.pelunasanStatus = 'ACC';
          patch.pelunasanBank = 'Saldo Deposit Mitra';
          patch.pelunasanNote = 'Lunas otomatis via Saldo Deposit';
          patch.pelunasanPaidAt = new Date().toISOString().slice(0, 10);
        } else {
          patch.ongkirStatus = 'ACC';
          patch.ongkirBank = 'Saldo Deposit Mitra';
          patch.ongkirNote = 'Lunas otomatis via Saldo Deposit';
          patch.ongkirPaidAt = new Date().toISOString().slice(0, 10);
        }
        return { ...order, ...patch };
      })
    );
    setPoLedger((prev) => [
      {
        id: `l-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        type: 'Pembayaran PO (Deposit)',
        ref: orderNo,
        mitraName: currentUser?.name || 'Mitra',
        nominal: Number(amount) || 0,
        account: 'Deposit Mitra'
      },
      ...prev
    ]);
    setToast({
      show: true,
      message: `Tagihan ${orderNo} berhasil dilunasi via Saldo Deposit!`
    });
  };

  // Sinkronisasi Produk & Brand antara katalog toko dan dashboard Marketing
  const handleChangePoProducts = (nextProducts) => {
    setPoProducts(nextProducts);
    setProducts((prev) => coreProductsToProject(nextProducts, prev));
    setPoBatches((prev) =>
      prev.map((batch) => {
        const matched = nextProducts.find(
          (p) => String(p.title || '').trim().toLowerCase() === String(batch.title || '').trim().toLowerCase()
        );
        return matched ? { ...batch, status: matched.status === 'closed' ? 'closed' : 'open' } : batch;
      })
    );
  };

  const handleChangePoBrands = (nextBrands) => {
    setPoBrands(nextBrands);
    setBrands((prev) => coreBrandsToProject(nextBrands, prev));
  };

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, selectedProduct]);

  // Sync core auth and page state to localStorage for robust refresh resilience
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentPage !== 'login' && currentPage !== 'logout_success') {
        localStorage.setItem('afathar_current_page', currentPage);
      } else {
        localStorage.setItem('afathar_current_page', 'home');
      }
    }
  }, [currentPage]);

  // Clean stale login state on mount so opening link never lands on login card
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('afathar_current_page');
      if (saved === 'login' || saved === 'logout_success') {
        localStorage.setItem('afathar_current_page', 'home');
        setCurrentPage('home');
      }
    }
  }, []);

  // If already logged in, redirect away from login screen to home
  useEffect(() => {
    if (isLoggedIn && (currentPage === 'login' || currentPage === 'logout_success')) {
      setCurrentPage('home');
    }
  }, [isLoggedIn, currentPage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('afathar_is_logged_in', String(isLoggedIn));
      if (currentUser) {
        localStorage.setItem('afathar_current_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('afathar_current_user');
      }
    }
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('afathar_active_role', JSON.stringify(activeRole));
    }
  }, [activeRole]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('afathar_mitra_active_tab', mitraActiveTab);
    }
  }, [mitraActiveTab]);

  // Pulihkan sesi JWT yang masih aktif saat halaman di-refresh
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) return undefined;

    let cancelled = false;

    api
      .me()
      .then((response) => {
        if (cancelled) return;
        const mapped = mapApiUser(response?.data);
        if (!mapped) return;
        const role = ROLES.find((item) => item.id === mapped.roleId) || ROLES[0];

        setSessionToken(token);
        setIsLoggedIn(true);
        setActiveRole(role);
        setCurrentUser((prev) => ({ ...(prev || {}), ...mapped, role: role.name, roleId: role.id }));
      })
      .catch((error) => {
        if (cancelled) return;
        // Hanya hapus token bila server menolak (401); gangguan jaringan sesaat
        // tidak boleh memutus sesi pengguna.
        if (error?.status === 401) {
          tokenStore.clear();
          setSessionToken(null);
          setIsLoggedIn(false);
          setCurrentUser(null);
          if (typeof window !== 'undefined') {
            localStorage.setItem('afathar_is_logged_in', 'false');
            localStorage.removeItem('afathar_current_user');
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Sinkronisasi katalog, brand, kategori, kurir, dan rekening dari backend Laravel
  useEffect(() => {
    let cancelled = false;

    const syncCatalog = async () => {
      try {
        // Satu permintaan snapshot katalog; server dev PHP hanya satu worker.
        const response = await api.catalog();
        const snapshot = response?.data || {};

        if (cancelled) return;

        const remoteProducts = mapProducts({ data: snapshot.products || [] });
        if (remoteProducts.length) {
          setProducts(remoteProducts);
          setPoProducts(projectProductsToCore(remoteProducts));
          setSelectedProduct(
            (prev) => remoteProducts.find((item) => item.id === prev?.id) || remoteProducts[0]
          );
        }

        const rawBrands = snapshot.brands || [];
        if (Array.isArray(rawBrands) && rawBrands.length) {
          const coreBrands = rawBrands.map(mapBrandToCore);
          setPoBrands(coreBrands);
          setBrands(coreBrandsToProject(coreBrands));
        }

        const rawSuppliers = snapshot.suppliers || [];
        if (Array.isArray(rawSuppliers) && rawSuppliers.length) {
          setPoSuppliers(rawSuppliers.map(mapSupplier));
        } else {
          try {
            const supRes = await api.suppliers();
            if (Array.isArray(supRes?.data) && supRes.data.length) {
              setPoSuppliers(supRes.data.map(mapSupplier));
            }
          } catch {
            /* ignore fallback error */
          }
        }

        const remoteCategories = mapCategoryNames(snapshot.categories || []);
        if (remoteCategories.length) setPoCategories(remoteCategories);

        const remoteCouriers = (snapshot.couriers || []).map(mapCourier);
        if (remoteCouriers.length) setAdminCouriers(remoteCouriers);

        const remoteBanks = (snapshot.bank_accounts || []).map(mapBankAccount);
        if (remoteBanks.length) setAdminBankAccounts(remoteBanks);
      } catch (error) {
        if (!cancelled) {
          console.warn('Sinkronisasi katalog backend dilewati:', error?.message || error);
        }
      }
    };

    syncCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  // Tarik riwayat pesanan mitra dari backend setiap sesi JWT aktif
  useEffect(() => {
    // Admin memakai endpoint manajemen; endpoint /orders hanya untuk mitra.
    if (!sessionToken || currentUser?.roleId !== 'mitra') return undefined;

    let cancelled = false;

    const syncOrders = async () => {
      try {
        const response = await api.orders();
        if (cancelled) return;

        const projectOrders = (response?.data || []).map((order) =>
          mapOrderToProjectOrder(order, currentUser || {})
        );

        // Backend tanpa pesanan: pertahankan data demo agar dashboard tetap terisi.
        if (!projectOrders.length) return;

        const mappedCore = alignCoreOrdersToProducts(
          projectOrdersToCore(projectOrders, {
            currentUser,
            seedMitra: poSeed.mitra,
            products
          }),
          projectProductsToCore(products)
        );

        setCoreOrders(mappedCore);
      } catch (error) {
        if (!cancelled && error?.status !== 0) {
          console.warn('Gagal memuat pesanan backend:', error?.message || error);
        }
      }
    };

    syncOrders();

    return () => {
      cancelled = true;
    };
  }, [sessionToken, currentUser?.roleId, activeRole?.id, currentPage]);

  // Seluruh data operasional dashboard admin berasal dari tabel backend
  // (pesanan lintas mitra, pengguna, deposit, pembayaran, supplier, batch,
  // pengajuan, notifikasi, pengaturan). Fallback demo dipakai bila kosong/offline.
  useEffect(() => {
    const rawRole = String(currentUser?.roleId || activeRole?.id || currentUser?.role || '').toLowerCase();
    const isAdminRole =
      ['owner', 'finance', 'marketing'].some((r) => rawRole.includes(r)) ||
      ['marketing_dashboard', 'finance_dashboard', 'owner_dashboard'].includes(currentPage);
    const token = sessionToken || tokenStore.get();
    if (!token || !isAdminRole) return undefined;

    let cancelled = false;
    const options = { timeout: 25000 };

    const syncManagement = async () => {
      let snapshot = null;
      try {
        const response = await api.management.bootstrap(options);
        snapshot = response?.data || null;
      } catch (err) {
        console.warn('Bootstrap API error:', err);
        snapshot = null;
      }

      // Fallback: jika bootstrap gagal atau daftar users kosong, muat langsung dari endpoint users
      if (!snapshot || !Array.isArray(snapshot.users) || snapshot.users.length === 0) {
        try {
          const usersRes = await api.management.users(options);
          if (Array.isArray(usersRes?.data) && usersRes.data.length > 0) {
            snapshot = snapshot || {};
            snapshot.users = usersRes.data;
          }
        } catch (err) {
          console.warn('Direct users fetch error:', err);
        }
      }

      if (cancelled || !snapshot) return;

      const remoteOrders = snapshot.orders || [];
      if (remoteOrders.length) {
        const projectOrders = remoteOrders.map((order) =>
          mapOrderToProjectOrder(order, currentUser || {})
        );
        setCoreOrders(
          alignCoreOrdersToProducts(
            projectOrdersToCore(projectOrders, {
              currentUser,
              seedMitra: poSeed.mitra,
              products
            }),
            projectProductsToCore(products)
          )
        );
      }

      const remoteUsers = snapshot.users || [];
      if (Array.isArray(snapshot.users) && remoteUsers.length > 0) {
        const mitraUsers = remoteUsers
          .filter((user) => roleIdFromApiUser(user) === 'mitra')
          .map(mapUserToMitra);
        const teamUsers = remoteUsers
          .filter((user) => roleIdFromApiUser(user) !== 'mitra')
          .map(mapUserToTeam);
        setPoMitra(mitraUsers);
        setPoTeam(teamUsers);
      }

      const remoteDeposits = snapshot.deposits || [];
      const coreDeposits = remoteDeposits.map(mapDepositToCore);
      if (coreDeposits.length) setPoDeposits(coreDeposits);

      const remotePayments = snapshot.payments || [];
      if (remotePayments.length || coreDeposits.length) {
        // Deposit ACC ikut tercatat sebagai kas masuk di buku kas.
        const depositRows = coreDeposits.map((deposit) => ({
          id: `l-${deposit.id}`,
          backendId: deposit.backendId,
          date: deposit.date,
          type: 'Deposit',
          ref: 'Deposit saldo',
          mitraName: deposit.mitraName,
          nominal: deposit.nominal,
          bank: deposit.bank,
          by: deposit.verifiedBy,
          status: deposit.status,
          note: deposit.note
        }));
        setPoLedger([...remotePayments.map(mapPaymentToLedger), ...depositRows]);
      }

      const remoteSuppliers = snapshot.suppliers || [];
      if (Array.isArray(snapshot.suppliers)) {
        setPoSuppliers(remoteSuppliers.map(mapSupplier));
      }

      const remoteBrands = snapshot.brands || [];
      if (Array.isArray(snapshot.brands) && remoteBrands.length) {
        const coreBrands = remoteBrands.map(mapBrandToCore);
        setPoBrands(coreBrands);
        setBrands(coreBrandsToProject(coreBrands));
      }

      const remoteCategories = snapshot.categories || [];
      if (Array.isArray(snapshot.categories) && remoteCategories.length) {
        setPoCategories(remoteCategories.map((c) => c.name || c));
      }

      const remoteProducts = snapshot.products || [];
      if (Array.isArray(snapshot.products)) {
        const projectProds = mapProducts({ data: remoteProducts });
        setProducts(projectProds);
        setPoProducts(projectProductsToCore(projectProds));
      }

      const remoteBatches = snapshot.batches || [];
      if (remoteBatches.length) setPoBatches(remoteBatches.map(mapBatchToCore));

      const remoteRequests = snapshot.payment_requests || [];
      if (remoteRequests.length) {
        setPoPaymentRequests(remoteRequests.map(mapPaymentRequestToCore));
      }

      const remoteNotifs = snapshot.notifications || [];
      if (remoteNotifs.length) setNotifications(remoteNotifs.map(mapNotificationToHeader));

      if (snapshot.settings) {
        setPoSettings((prev) => ({ ...prev, ...mapSettings(snapshot.settings) }));
      }
    };

    syncManagement();

    return () => {
      cancelled = true;
    };
  }, [sessionToken, currentUser?.roleId, activeRole?.id, currentPage]);

  // Notifikasi, deposit, pembayaran, dan buku alamat mitra mengikuti akun JWT aktif.
  useEffect(() => {
    if (!sessionToken || currentUser?.roleId !== 'mitra') return undefined;

    let cancelled = false;

    const syncMitraProfile = async () => {
      try {
        const [notifResponse, depositsRes, paymentsRes, meRes] = await Promise.all([
          api.my.notifications().catch(() => null),
          api.my.deposits().catch(() => null),
          api.my.payments().catch(() => null),
          api.me().catch(() => null),
          syncAddressBookFromApi()
        ]);
        if (cancelled) return;

        const remoteNotifs = notifResponse?.data || [];
        if (remoteNotifs.length) setNotifications(remoteNotifs.map(mapNotificationToHeader));

        const remoteDeposits = depositsRes?.data || [];
        if (Array.isArray(remoteDeposits) && remoteDeposits.length) {
          const coreDeposits = remoteDeposits.map(mapDepositToCore);
          setPoDeposits(coreDeposits);
        }

        const remotePayments = paymentsRes?.data || [];
        if (Array.isArray(remotePayments) && remotePayments.length) {
          setMitraPayments(remotePayments);
        }

        if (meRes?.data) {
          const fresh = meRes.data;
          setCurrentUser((prev) => ({
            ...prev,
            deposit_balance: fresh.deposit_balance ?? prev?.deposit_balance
          }));
        }
      } catch (err) {
        console.warn('Gagal sinkron data mitra dari server:', err);
      }
    };

    syncMitraProfile();

    return () => {
      cancelled = true;
    };
  }, [sessionToken, currentUser?.roleId, activeRole?.id, currentPage]);

  // Setelah login, muat ulang katalog agar harga sesuai level mitra (token terkirim)
  useEffect(() => {
    if (!sessionToken) return undefined;

    let cancelled = false;

    api
      .products()
      .then((response) => {
        if (cancelled) return;
        const remoteProducts = mapProducts(response);
        if (!remoteProducts.length) return;

        setProducts(remoteProducts);
        setPoProducts(projectProductsToCore(remoteProducts));
        setSelectedProduct(
          (prev) => remoteProducts.find((item) => item.id === prev?.id) || remoteProducts[0]
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  // Filter Apply
  const handleApplyBrandSearch = () => {
    setActiveBrandKeyword(brandSearchInput.trim());
  };

  const handleGlobalSearchSubmit = () => {
    setCurrentPage('catalog');
  };

  const handleResetFilter = () => {
    setSelectedBrand('all');
    setBrandSearchInput('');
    setActiveBrandKeyword('');
    setSearchQuery('');
    setSelectedCategory('');
    setStatusFilter('all');
    setOnlySaleFilter(false);
    setSortBy('Harga Tertinggi');
  };

  const handleNavigateHome = () => {
    setCurrentPage('home');
    setOnlySaleFilter(false);
    setStatusFilter('all');
  };

  const handleNavigateCatalog = () => {
    setCurrentPage('catalog');
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setCurrentPage('catalog');
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setCurrentPage('product_detail');
  };

  // Filter & Sort Products
  const processedProducts = useMemo(() => {
    let list = [...products];

    if (selectedBrand !== 'all') {
      list = list.filter((p) => p.brandId === selectedBrand);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (activeBrandKeyword.trim()) {
      const q = activeBrandKeyword.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (selectedCategory && selectedCategory !== 'Semua Kategori') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (onlySaleFilter) {
      list = list.filter((p) => p.isSale);
    }

    if (sortBy === 'Harga Tertinggi') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'Harga Terendah') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'Diskon Terbesar') {
      list.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
    }

    return list;
  }, [products, selectedBrand, searchQuery, activeBrandKeyword, selectedCategory, onlySaleFilter, sortBy]);

  // Cart & Auth Guard Handlers
  const handleOpenCart = () => {
    if (!isLoggedIn || !tokenStore.get()) {
      setIsLoginPromptOpen(true);
      return;
    }
    setCurrentPage('cart');
  };

  const handleAddToCart = (item) => {
    if (!isLoggedIn || !tokenStore.get()) {
      setIsLoginPromptOpen(true);
      return;
    }
    setCartItems((prev) => [item, ...prev]);
    setIsSuccessCartOpen(true);
  };

  const handleBuyNow = (item) => {
    if (!isLoggedIn || !tokenStore.get()) {
      setIsLoginPromptOpen(true);
      return;
    }
    setCheckoutItems([item]);
    setCurrentPage('checkout');
  };

  const handleRemoveCartItem = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCheckout = (items) => {
    if (!isLoggedIn || !tokenStore.get()) {
      setIsLoginPromptOpen(true);
      return;
    }
    const itemsToProcess = items && items.length > 0 ? items : cartItems;
    setCheckoutItems(itemsToProcess);
    setCurrentPage('checkout');
  };

  const handleCompleteOrder = (newOrder) => {
    // Add new order with full metadata to Global Orders
    const schemeDpPct = dpPercentFor(newOrder);
    const dpNominal = Math.round((newOrder.total || 0) * (schemeDpPct / 100));
    const enrichedOrder = {
      ...newOrder,
      mitraName: currentUser?.name || 'HENI (Bekasi)',
      mitraLevel: currentUser?.role || 'Mitra Distributor',
      mitraCity: newOrder.recipientCity || 'Bekasi',
      mitraAddress: newOrder.recipientAddress || '',
      mitraPhone: currentUser?.phone || '0812-1999-1888',
      dpPct: schemeDpPct,
      dpNominal,
      sisaTagihan: (newOrder.total || 0) - dpNominal
    };
    const coreOrder = projectOrderToCore(enrichedOrder, {
      currentUser,
      seedMitra: poSeed.mitra,
      products
    });
    setCoreOrders((prev) => [coreOrder, ...prev]);

    // Clear checked out items from cart
    setCartItems((prev) =>
      prev.filter(
        (ci) => !checkoutItems.some((coi) => coi.id === ci.id || coi.title === ci.title)
      )
    );

    // Show celebration notification
    setToast({
      show: true,
      message: `Pesanan Pre-Order ${newOrder.orderNo} berhasil dibuat dan diteruskan ke Admin Marketing untuk di-ACC! Setelah di-ACC, pembayaran DP dapat dilakukan.`
    });

    // Kirim pesanan ke backend Laravel bila sesi JWT aktif
    if (tokenStore.get()) {
      api
        .createOrder(buildOrderPayload(enrichedOrder, newOrder.items || []))
        .then((response) => {
          const serverOrder = response?.data;
          if (!serverOrder) return;

          const serverCore = projectOrderToCore(
            mapOrderToProjectOrder(serverOrder, currentUser || {}),
            { currentUser, seedMitra: poSeed.mitra, products }
          );

          setCoreOrders((prev) => [
            serverCore,
            ...prev.filter((order) => order.id !== coreOrder.id)
          ]);
          setToast({
            show: true,
            message: `Pesanan ${serverOrder.order_number} tersimpan permanen di backend.`
          });
        })
        .catch((error) => {
          setToast({
            show: true,
            message: `Pesanan dibuat lokal. Sinkronisasi backend gagal: ${
              error?.message || 'tidak diketahui'
            }.`
          });
        });
    }

    // Navigate to Mitra Dashboard Pesanan Saya
    setMitraActiveTab('pesanan_saya');
    setCurrentPage('mitra_dashboard');
  };

  const handleUpdateMitraOrder = (orderKey, patch) => {
    if (!orderKey) return;
    setCoreOrders((prev) =>
      prev.map((o) => {
        const matches =
          o.invoice === orderKey ||
          o.orderNo === orderKey ||
          String(o.id) === String(orderKey) ||
          (o.invoice && String(orderKey).includes(o.invoice)) ||
          (o.orderNo && String(orderKey).includes(o.orderNo));
        if (!matches) return o;
        let updated = { ...o, ...patch };
        if (patch.items) {
          const items = patch.items;
          const qty = items.reduce((s, it) => s + (Number(it.qty) || 1), 0);
          const subtotal = items.reduce(
            (s, it) => s + (Number(it.subtotal) || (Number(it.price) || 0) * (Number(it.qty) || 1)),
            0
          );
          updated = {
            ...updated,
            qty,
            subtotal,
            pelunasanNominal: Math.max(0, subtotal - (Number(o.dpNominal) || 0)),
            total: subtotal + (Number(o.ongkir) || 0),
            _projectMeta: { ...(o._projectMeta || {}), items }
          };
        }
        if (patch.ekspedisi) updated.ekspedisi = patch.ekspedisi;
        return updated;
      })
    );
  };

  const handleUpdateAvatar = async (newAvatar, fileObj = null) => {
    let savedAvatarUrl = newAvatar || '';

    if (fileObj && tokenStore.get()) {
      try {
        const upRes = await api.uploadFile(fileObj, 'avatar');
        if (upRes?.data?.path) {
          savedAvatarUrl = mediaUrl(upRes.data.path);
        }
      } catch (err) {
        console.warn('Gagal unggah foto ke backend, menggunakan data URL:', err);
      }
    }

    setCurrentUser((prev) => {
      const updated = { ...prev, avatar: savedAvatarUrl };
      try {
        if (savedAvatarUrl) {
          localStorage.setItem('afatharshop_user_avatar', savedAvatarUrl);
        } else {
          localStorage.removeItem('afatharshop_user_avatar');
        }
      } catch (e) {
        console.warn('Gagal menyimpan ke localStorage', e);
      }
      return updated;
    });

    if (tokenStore.get()) {
      try {
        await api.updateProfile({ avatar: savedAvatarUrl });
      } catch (e) {
        console.warn('Gagal sinkron avatar ke backend:', e);
      }
    }

    setToast({
      show: true,
      message: savedAvatarUrl
        ? 'Foto profil akun berhasil diperbarui dan disinkronkan ke seluruh sistem.'
        : 'Foto profil berhasil dihapus.'
    });
  };

  const handleUpdateUser = async (updatedInfo) => {
    setCurrentUser((prev) => ({
      ...prev,
      ...updatedInfo
    }));

    if (tokenStore.get()) {
      try {
        const payload = {
          nama: updatedInfo.name || updatedInfo.nama,
          name: updatedInfo.name || updatedInfo.nama,
          email: updatedInfo.email,
          phone: updatedInfo.phone,
          city: updatedInfo.city,
          avatar: updatedInfo.avatar
        };
        const res = await api.updateProfile(payload);
        if (res?.data || res?.user) {
          const fresh = res.data || res.user;
          setCurrentUser((prev) => ({
            ...prev,
            ...mapApiUser(fresh),
            ...updatedInfo
          }));
        }
        setToast({
          show: true,
          message: 'Informasi profil berhasil disimpan ke database backend.'
        });
        return;
      } catch (err) {
        console.warn('Gagal simpan profil ke backend:', err);
      }
    }

    setToast({
      show: true,
      message: 'Informasi profil berhasil disimpan.'
    });
  };

  const handleNavigateDashboard = (tab = 'dashboard') => {
    if (currentUser?.roleId === 'marketing') {
      setCurrentPage('marketing_dashboard');
    } else if (currentUser?.roleId === 'finance') {
      setCurrentPage('finance_dashboard');
    } else if (currentUser?.roleId === 'owner') {
      setCurrentPage('owner_dashboard');
    } else {
      setMitraActiveTab(tab);
      setCurrentPage('mitra_dashboard');
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (notif.target === 'katalog') {
      setCurrentPage('catalog');
      return;
    }
    if (notif.target && currentUser?.roleId !== 'marketing' && currentUser?.roleId !== 'finance' && currentUser?.roleId !== 'owner') {
      handleNavigateDashboard(notif.target);
      return;
    }
    handleNavigateDashboard('dashboard');
  };

  const handleMarkAllNotifRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleLoginSuccess = (role, userData) => {
    setIsLoggedIn(true);
    setActiveRole(role);
    setSessionToken(tokenStore.get());
    const savedAvatar = getCleanStoredAvatar();
    const roleId = role?.id || 'mitra';
    const roleName = role?.name || 'Mitra Distributor';

    const userObj = {
      name: userData?.name || (roleId === 'mitra' ? 'Mitra' : roleName),
      role: roleName,
      roleId: roleId,
      avatar: (userData?.avatar && !userData.avatar.includes('unsplash.com'))
        ? userData.avatar
        : savedAvatar || '',
      balance: userData?.balance || 'Rp 0',
      totalBill: userData?.totalBill || 'Rp 0',
      phone: userData?.phone || '',
      email: userData?.email || '',
      address: userData?.address || ''
    };

    setCurrentUser(userObj);
    setIsLoginPromptOpen(false);

    let targetPage = 'home';
    if (roleId === 'marketing') {
      targetPage = 'marketing_dashboard';
    } else if (roleId === 'finance') {
      targetPage = 'finance_dashboard';
    } else if (roleId === 'owner') {
      targetPage = 'owner_dashboard';
    } else {
      setMitraActiveTab('dashboard');
      targetPage = 'mitra_dashboard';
    }

    setCurrentPage(targetPage);

    if (typeof window !== 'undefined') {
      localStorage.setItem('afathar_is_logged_in', 'true');
      localStorage.setItem('afathar_current_user', JSON.stringify(userObj));
      localStorage.setItem('afathar_active_role', JSON.stringify(role));
      localStorage.setItem('afathar_current_page', targetPage);
    }

    setToast({
      show: true,
      message: `Selamat datang kembali, ${userObj.name}!`
    });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentPage('logout_success');
    api.logout().catch(() => {});
    tokenStore.clear();
    setSessionToken(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('afathar_is_logged_in', 'false');
      localStorage.removeItem('afathar_current_user');
      localStorage.setItem('afathar_current_page', 'logout_success');
    }
  };

  // FULL-PAGE AUTH VIEWS (LOGIN, REGISTER, LOGOUT SUCCESS)
  if (currentPage === 'logout_success') {
    if (isLoggedIn) {
      return null;
    }
    return (
      <LogoutSuccessPage
        onNavigateLogin={() => setCurrentPage('login')}
        onNavigateHome={handleNavigateHome}
      />
    );
  }

  if (currentPage === 'login') {
    if (isLoggedIn) {
      return null;
    }
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onNavigateRegister={() => setCurrentPage('register')}
        onNavigateHome={handleNavigateHome}
      />
    );
  }

  if (currentPage === 'register') {
    return (
      <RegisterPage
        onNavigateLogin={() => setCurrentPage('login')}
        onNavigateHome={handleNavigateHome}
      />
    );
  }

  // Auth Guard: If trying to access any private dashboard or checkout without an active session, prompt to login
  const isPrivateDashboard = ['mitra_dashboard', 'marketing_dashboard', 'finance_dashboard', 'owner_dashboard'].includes(currentPage);
  const isPortalDashboard = ['marketing_dashboard', 'finance_dashboard', 'owner_dashboard'].includes(currentPage);
  if ((isPrivateDashboard || currentPage === 'checkout') && (!isLoggedIn || !tokenStore.get())) {
    return (
      <LoginPage
        onLoginSuccess={(role, userData) => {
          handleLoginSuccess(role, userData);
          if (currentPage === 'checkout') {
            setCurrentPage('checkout');
          }
        }}
        onNavigateRegister={() => setCurrentPage('register')}
        onNavigateHome={handleNavigateHome}
      />
    );
  }

  // REGULAR STORE VIEWS (HOME, CATALOG, PRODUCT DETAIL, CART)
  return (
    <div
      className={`min-h-screen flex flex-col text-stone-800 antialiased selection:bg-[#F0C973] selection:text-[#6B1416] ${
        isPortalDashboard ? 'bg-[#F5F7F6]' : 'bg-[#FFE5D4]'
      }`}
    >
      
      {/* Toast Alert Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast({ show: false, message: '' })}
        />
      )}

      {/* 1. Header with White Kategori & White Search Bar */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        categories={storeCategories}
        cartCount={cartItems.length}
        onOpenCart={handleOpenCart}
        onOpenAuth={(mode) => {
          if (mode === 'register') {
            setCurrentPage('register');
          } else {
            setCurrentPage('login');
          }
        }}
        onNavigateHome={handleNavigateHome}
        onSearchSubmit={handleGlobalSearchSubmit}
        isLoggedIn={isLoggedIn}
        currentUser={synchronizedUser}
        onLogout={handleLogout}
        onOpenProfile={() => handleNavigateDashboard('profil')}
        onOpenOrderForm={handleNavigateCatalog}
        onOpenOrders={() => handleNavigateDashboard('pesanan_saya')}
        onNavigateDashboard={handleNavigateDashboard}
        currentPage={currentPage}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onMarkAllRead={handleMarkAllNotifRead}
        onOpenWishlist={() => {
          setToast({
            show: true,
            message: 'Daftar Wishlist: 2 produk pre-order telah tersimpan di daftar favorit Anda.'
          });
        }}
      />

      {/* Main Content Area */}
      <main className={`flex-1 ${['marketing_dashboard', 'finance_dashboard', 'owner_dashboard'].includes(currentPage) ? '' : 'pb-8'}`}>
        
        {/* VIEW 1: HOME PAGE (BERANDA) */}
        {currentPage === 'home' && (
          <div className="space-y-2">
            <HeroBanner
              onSelectSale={() => {
                setOnlySaleFilter(true);
                setCurrentPage('catalog');
              }}
              onSelectPreOrder={() => {
                setStatusFilter('pre_order');
                setOnlySaleFilter(false);
                setCurrentPage('catalog');
              }}
            />

            <FilterSection
              brands={brands}
              selectedBrand={selectedBrand}
              onSelectBrand={(id) => {
                setSelectedBrand(id);
                setBrandSearchInput('');
                setActiveBrandKeyword('');
              }}
              brandSearchInput={brandSearchInput}
              setBrandSearchInput={setBrandSearchInput}
              onApplyBrandSearch={handleApplyBrandSearch}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onResetFilter={handleResetFilter}
            />

            <SaleSection
              products={processedProducts}
              selectedBrand={selectedBrand}
              onSelectProduct={handleSelectProduct}
              onViewAllSale={() => {
                setOnlySaleFilter(true);
                setCurrentPage('catalog');
              }}
            />

            <PreOrderSection
              products={processedProducts}
              selectedBrand={selectedBrand}
              onSelectProduct={handleSelectProduct}
              onViewAllPreOrder={() => {
                setStatusFilter('pre_order');
                setOnlySaleFilter(false);
                setCurrentPage('catalog');
              }}
              onLoadMore={() => {
                setStatusFilter('all');
                setOnlySaleFilter(false);
                setCurrentPage('catalog');
              }}
            />
          </div>
        )}

        {/* VIEW 2: DEDICATED CATALOG PAGE (HALAMAN KATALOG) */}
        {currentPage === 'catalog' && (
          <div className="space-y-3">
            <FilterSection
              brands={brands}
              selectedBrand={selectedBrand}
              onSelectBrand={(id) => {
                setSelectedBrand(id);
                setBrandSearchInput('');
                setActiveBrandKeyword('');
              }}
              brandSearchInput={brandSearchInput}
              setBrandSearchInput={setBrandSearchInput}
              onApplyBrandSearch={handleApplyBrandSearch}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onResetFilter={handleResetFilter}
            />

            <CatalogGrid
              products={processedProducts}
              selectedBrand={selectedBrand}
              onSelectProduct={handleSelectProduct}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onlySaleFilter={onlySaleFilter}
              setOnlySaleFilter={setOnlySaleFilter}
              onNavigateHome={handleNavigateHome}
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
              categories={storeCategories}
            />
          </div>
        )}

        {/* VIEW 3: DEDICATED PRODUCT DETAIL PAGE (Matches Screenshot 1 & 2) */}
        {currentPage === 'product_detail' && (
          <ProductDetailPage
            product={selectedProduct}
            onNavigateHome={handleNavigateHome}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            isLoggedIn={isLoggedIn}
            brands={poBrands}
            mitraLevel={normalizeLevel(currentUser?.role || currentUser?.level)}
          />
        )}

        {/* VIEW 4: DEDICATED CART PAGE (Matches Screenshot 4) */}
        {currentPage === 'cart' && (
          <CartPage
            cartItems={cartItems}
            onRemoveItem={handleRemoveCartItem}
            onNavigateHome={handleNavigateHome}
            onNavigateCatalog={handleNavigateCatalog}
            onCheckout={handleCheckout}
          />
        )}

        {/* VIEW 4.5: DEDICATED CHECKOUT PAGE (Matches User Uploaded Screenshots 2, 3, 4, 5) */}
        {currentPage === 'checkout' && (
          <CheckoutPage
            checkoutItems={checkoutItems.length > 0 ? checkoutItems : cartItems}
            currentUser={synchronizedUser}
            onNavigateHome={handleNavigateHome}
            onNavigateCart={() => setCurrentPage('cart')}
            onCompleteOrder={handleCompleteOrder}
            adminCouriers={adminCouriers}
            adminBankAccounts={publicBankAccounts}
          />
        )}

        {/* VIEW 5: MITRA DASHBOARD (Matches User Screenshots 1 - 5) */}
        {currentPage === 'mitra_dashboard' && (
          <MitraDashboard
            activeTab={mitraActiveTab}
            onSelectTab={(tab) => setMitraActiveTab(tab)}
            currentUser={synchronizedUser}
            onUpdateUser={handleUpdateUser}
            onUpdateAvatar={handleUpdateAvatar}
            onLogout={handleLogout}
            onNavigateCatalog={handleNavigateCatalog}
            onNavigateHome={handleNavigateHome}
            poBatches={poBatches}
            products={products}
            deposits={poDeposits}
            payments={mitraPayments}
            onUploadPayment={handleUploadPayment}
            onDepositSubmit={handleDepositSubmit}
            onPayWithDeposit={handlePayWithDeposit}
            orders={mitraOrders.filter(
              (o) =>
                !o.mitraName ||
                o.mitraName.toUpperCase().includes((currentUser?.name || 'Mitra').toUpperCase())
            )}
            adminBankAccounts={publicBankAccounts}
            adminCouriers={adminCouriers}
            onUpdateOrder={handleUpdateMitraOrder}
          />
        )}

        {/* VIEW 6: MARKETING DASHBOARD (ACC pesanan, katalog, brand, supplier, tim) */}
        {currentPage === 'marketing_dashboard' && (
          <MarketingDashboard
            currentUser={{ ...synchronizedUser, role: 'marketing' }}
            onUpdateUser={handleUpdateUser}
            onUpdateAvatar={handleUpdateAvatar}
            onNavigateStore={handleNavigateHome}
            onLogout={handleLogout}
            orders={coreOrders}
            products={poProducts}
            brands={poBrands}
            suppliers={poSuppliers}
            mitra={poMitra}
            team={poTeam}
            poBatches={poBatches}
            onChangeBatches={setPoBatches}
            paymentRequests={poPaymentRequests}
            bankAccounts={adminBankAccounts}
            couriers={couriersToCore(adminCouriers)}
            categories={poCategories}
            deposits={poDeposits}
            settings={poSettings}
            onChangeOrders={setCoreOrders}
            onChangeProducts={handleChangePoProducts}
            onChangeBrands={handleChangePoBrands}
            onChangeSuppliers={setPoSuppliers}
            onChangeMitra={setPoMitra}
            onChangeTeam={setPoTeam}
            onChangePaymentRequests={setPoPaymentRequests}
            onChangeDeposits={setPoDeposits}
            onChangeSettings={setPoSettings}
            onChangeCategories={setPoCategories}
            onChangeBankAccounts={setAdminBankAccounts}
            onChangeCouriers={setAdminCouriers}
            onPrintInvoice={(order) => openInvoicePrintTab(order, publicBankAccounts)}
          />
        )}

        {/* VIEW 7: FINANCE DASHBOARD (verifikasi 3 tahap, ongkir, resi, pengajuan dana) */}
        {currentPage === 'finance_dashboard' && (
          <FinanceDashboard
            currentUser={{ ...synchronizedUser, role: 'finance' }}
            onUpdateUser={handleUpdateUser}
            onUpdateAvatar={handleUpdateAvatar}
            onNavigateStore={handleNavigateHome}
            onLogout={handleLogout}
            orders={coreOrders}
            products={poProducts}
            brands={poBrands}
            mitra={poMitra}
            team={poTeam}
            deposits={poDeposits}
            paymentRequests={poPaymentRequests}
            bankAccounts={adminBankAccounts}
            couriers={couriersToCore(adminCouriers)}
            ledger={poLedger}
            settings={poSettings}
            onChangeOrders={setCoreOrders}
            onChangeMitra={setPoMitra}
            onChangeTeam={setPoTeam}
            onChangeDeposits={setPoDeposits}
            onChangePaymentRequests={setPoPaymentRequests}
            onChangeBankAccounts={setAdminBankAccounts}
            onChangeCouriers={setAdminCouriers}
            onChangeLedger={setPoLedger}
            onChangeSettings={setPoSettings}
            onPrintInvoice={(order) => openInvoicePrintTab(order, publicBankAccounts)}
          />
        )}

        {/* VIEW 8: OWNER DASHBOARD (approval akhir & transfer pengajuan dana) */}
        {currentPage === 'owner_dashboard' && (
          <OwnerDashboard
            currentUser={{ ...synchronizedUser, role: 'owner' }}
            onUpdateUser={handleUpdateUser}
            onUpdateAvatar={handleUpdateAvatar}
            onNavigateStore={handleNavigateHome}
            onLogout={handleLogout}
            orders={coreOrders}
            brands={poBrands}
            mitra={poMitra}
            team={poTeam}
            deposits={poDeposits}
            paymentRequests={poPaymentRequests}
            bankAccounts={adminBankAccounts}
            couriers={couriersToCore(adminCouriers)}
            ledger={poLedger}
            settings={poSettings}
            onChangeOrders={setCoreOrders}
            onChangeMitra={setPoMitra}
            onChangeTeam={setPoTeam}
            onChangePaymentRequests={setPoPaymentRequests}
            onChangeLedger={setPoLedger}
            onChangeSettings={setPoSettings}
            onPrintInvoice={(order) => openInvoicePrintTab(order, publicBankAccounts)}
          />
        )}

      </main>

      {/* Footer matching Maroon Design (hidden on dashboard portals) */}
      {!isPortalDashboard && <Footer />}

      {/* Login Prompt Modal (Matches Screenshot 1) */}
      <LoginPromptModal
        isOpen={isLoginPromptOpen}
        onClose={() => setIsLoginPromptOpen(false)}
        onLogin={() => {
          setIsLoginPromptOpen(false);
          setCurrentPage('login');
        }}
      />

      {/* Success Add To Cart Modal (Matches Screenshot 3) */}
      <SuccessAddToCartModal
        isOpen={isSuccessCartOpen}
        onClose={() => setIsSuccessCartOpen(false)}
        onViewCart={() => {
          setIsSuccessCartOpen(false);
          setCurrentPage('cart');
        }}
      />

      {/* Akun Saya & Upload Foto Profil Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={synchronizedUser}
        onUpdateUser={handleUpdateUser}
        onUpdateAvatar={handleUpdateAvatar}
      />

      {/* Pesanan Pre-Order Modal */}
      <OrdersModal
        isOpen={isOrdersModalOpen}
        onClose={() => setIsOrdersModalOpen(false)}
        onNavigateProduct={handleSelectProduct}
        orders={mitraOrders}
      />

    </div>
  );
}
