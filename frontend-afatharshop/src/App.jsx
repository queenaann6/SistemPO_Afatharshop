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
import { createSeedData } from './components/dashboard/poCore';
import { openInvoicePrintTab } from './utils/printInvoice';
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
import { api, tokenStore } from './services/api';
import {
  buildOrderPayload,
  mapApiUser,
  mapBankAccount,
  mapBrands,
  mapCategoryNames,
  mapCourier,
  mapOrderToProjectOrder,
  mapProducts
} from './services/adapters';

const DEFAULT_USER = {
  name: 'HENI',
  role: 'Mitra Distributor',
  roleId: 'mitra',
  avatar: (typeof window !== 'undefined' && localStorage.getItem('afatharshop_user_avatar')) ||
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
  balance: 'Rp 0',
  totalBill: 'Rp 3.399.145',
  phone: '(+62) 0812-1999-1888',
  email: 'afatharshop@maknahijab.com',
  address: 'Perumnas 1 Jl Bungur Raya Rt 12 Rw 7 No 86 Kelurahan Jakasampurna Kecamatan Bekasi Barat Kota Bekasi 17145'
};

export default function App() {
  // Page Navigation: 'home' | 'catalog' | 'product_detail' | 'cart' | 'login' | 'register' | 'logout_success' | 'mitra_dashboard' | 'marketing_dashboard' | 'finance_dashboard' | 'owner_dashboard'
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedPage = localStorage.getItem('afathar_current_page');
      if (savedPage) return savedPage;
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
      const savedAuth = localStorage.getItem('afathar_is_logged_in');
      if (savedAuth !== null) return savedAuth === 'true';
    }
    return true;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('afathar_current_user');
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return DEFAULT_USER;
  });

  const [activeRole, setActiveRole] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedRole = localStorage.getItem('afathar_active_role');
      if (savedRole) {
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
  const [notifications, setNotifications] = useState([
    {
      id: 'dp',
      title: 'Validasi DP Berhasil',
      sub: 'DP pesanan PO Anda telah berhasil di-ACC oleh Admin Finance.',
      time: '10 menit yang lalu',
      tone: 'emerald',
      read: false,
      target: 'tagihan'
    },
    {
      id: 'katalog',
      title: 'Katalog Pre-Order Dibuka',
      sub: 'Batch Sarimbit Kartika Raya telah dibuka untuk pemesanan kuota mitra.',
      time: '1 jam yang lalu',
      tone: 'amber',
      read: false,
      target: 'katalog'
    },
    {
      id: 'ekspedisi',
      title: 'Update Ekspedisi Kargo',
      sub: 'JNE Trucking dan J&T Cargo kini aktif untuk rute pengiriman pesanan Anda.',
      time: 'Kemarin',
      tone: 'blue',
      read: true,
      target: 'alamat'
    }
  ]);

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
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      title: 'SAFIYYA PREMIUM ABAYA SET',
      brand: 'COVERME HIJAB',
      price: 90000,
      qty: 1,
      selectedModel: 'MOM DRESS ONLY STYLE 1',
      selectedSize: 'M',
      selectedColor: 'NOIR MATTE',
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80'
    }
  ]);

  // Selected items for Checkout Page
  const [checkoutItems, setCheckoutItems] = useState([]);

  // Initial project orders — converted once into the shared PO model below
  const [initialMitraOrders] = useState([
    {
      id: 1,
      orderNo: 'INV-20261018-0146',
      mitraName: 'HENI (Bekasi)',
      mitraLevel: 'DB All',
      title: 'NARARYA SARIMBIT KARTIKA RAYA BATCH 2',
      brand: 'Coverme Hijab',
      date: '18 Oct 2026',
      status: 'Pesanan Dibuat',
      statusColor: 'bg-amber-100 text-amber-800',
      total: 482000,
      dpNominal: 192800,
      sisaTagihan: 289200,
      courier: 'JNE Trucking',
      isClosedPO: false,
      closeDate: '25 Oktober 2026',
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80',
      items: [
        {
          id: 101,
          title: 'SARIMBIT KARTIKA RAYA BATCH 2',
          variant: 'SCARF MOM ALL : IVORY',
          variation: 'SCARF MOM',
          size: 'ALL',
          color: 'IVORY',
          price: 92000,
          qty: 1,
          subtotal: 92000,
          dueDate: '20 Jan 2027',
          image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80'
        },
        {
          id: 102,
          title: 'SARIMBIT KARTIKA RAYA BATCH 2',
          variant: 'MOM DRESS B ONLY L : SANGRIA',
          variation: 'MOM DRESS B ONLY',
          size: 'L',
          color: 'SANGRIA',
          price: 390000,
          qty: 1,
          subtotal: 390000,
          dueDate: '20 Jan 2027',
          image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80'
        }
      ]
    },
    {
      id: 2,
      orderNo: 'INV-20261012-0088',
      mitraName: 'HENI (Bekasi)',
      mitraLevel: 'DB All',
      title: 'NAKKA ALORA BAG - BATCH 3',
      brand: 'Coverme Hijab',
      date: '12 Oct 2026',
      status: 'Pesanan Dibuat',
      statusColor: 'bg-amber-100 text-amber-800',
      total: 82800,
      dpNominal: 33120,
      sisaTagihan: 49680,
      courier: 'J&T Cargo',
      isClosedPO: false,
      closeDate: '28 November 2026',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=400&q=80',
      items: [
        {
          id: 201,
          title: 'NAKKA ALORA BAG',
          variant: 'ALL VARIAN',
          variation: 'ALORA BAG',
          size: 'ALL',
          color: 'MOCCA',
          price: 82800,
          qty: 1,
          subtotal: 82800,
          dueDate: '10 Feb 2027',
          image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=400&q=80'
        }
      ]
    },
    {
      id: 3,
      orderNo: 'INV-20261020-0001',
      mitraName: 'Budi Santoso (Bandung)',
      mitraLevel: 'DB All',
      title: 'NARARYA MUKENA SEKAR SASMITA',
      brand: 'Isa Luxury',
      date: '20 Oct 2026',
      status: 'DP Terbayar (Validasi Selesai)',
      statusColor: 'bg-emerald-100 text-emerald-800',
      total: 875000,
      dpNominal: 437500,
      sisaTagihan: 437500,
      courier: 'JNE Trucking',
      isClosedPO: true,
      closeDate: '30 September 2026 (Telah Ditutup)',
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80',
      items: [
        {
          id: 301,
          title: 'Gamis Almira Dusty Pink/Syari/M',
          variant: 'Dusty Pink / M',
          variation: 'Syari',
          size: 'M',
          color: 'Dusty Pink',
          price: 175000,
          qty: 5,
          subtotal: 875000,
          dueDate: '15 Des 2026',
          image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80'
        }
      ]
    },
    {
      id: 4,
      orderNo: 'INV-20261022-0002',
      mitraName: 'Siti Rahma (Surabaya)',
      mitraLevel: 'Agen',
      title: 'COVERME SARIMBIT SAFIYYA 2027',
      brand: 'Coverme Hijab',
      date: '22 Oct 2026',
      status: 'Pesanan Dibuat',
      statusColor: 'bg-amber-100 text-amber-800',
      total: 400000,
      dpNominal: 200000,
      sisaTagihan: 200000,
      courier: 'J&T Cargo',
      isClosedPO: false,
      closeDate: '02 November 2026',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80',
      items: [
        {
          id: 401,
          title: 'Gamis Almira Navy/Syari/L',
          variant: 'Navy / L',
          variation: 'Syari',
          size: 'L',
          color: 'Navy',
          price: 200000,
          qty: 2,
          subtotal: 400000,
          dueDate: '15 Des 2026',
          image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80'
        }
      ]
    },
    {
      id: 5,
      orderNo: 'INV-20261018-0003',
      mitraName: 'Dewi Lestari (Medan)',
      mitraLevel: 'Reseller',
      title: 'KAEN BOUTIQUE PRAYER SET MEWAH',
      brand: 'Kaen Boutique',
      date: '18 Oct 2026',
      status: 'Lunas (Siap Kirim)',
      statusColor: 'bg-green-100 text-green-800',
      total: 5737500,
      dpNominal: 2868750,
      sisaTagihan: 0,
      courier: 'Dakota Cargo',
      isClosedPO: true,
      closeDate: '15 Oktober 2026 (Telah Ditutup)',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      items: [
        {
          id: 501,
          title: 'Tunik Alma Sage Green/Casual/All',
          variant: 'Sage Green / All Size',
          variation: 'Casual',
          size: 'ALL',
          color: 'Sage Green',
          price: 114750,
          qty: 50,
          subtotal: 5737500,
          dueDate: '20 Des 2026',
          image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
        }
      ]
    }
  ]);

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
  const mitraOrders = useMemo(() => coreOrdersToProject(coreOrders), [coreOrders]);

  // Global PO Batches State (Controlled strictly by Admin Marketing - NOT Mitra)
  const [poBatches, setPoBatches] = useState([
    {
      id: 1,
      orderNo: 'INV-20261018-0146',
      title: 'NARARYA SARIMBIT KARTIKA RAYA BATCH 2',
      brand: 'Coverme Hijab',
      status: 'open',
      closeDate: '25 Oktober 2026',
      closeTime: '23:59 WIB',
      quotaTarget: 1500,
      quotaFilled: 1120
    },
    {
      id: 2,
      orderNo: 'INV-20261012-0088',
      title: 'NAKKA ALORA BAG - BATCH 3',
      brand: 'Coverme Hijab',
      status: 'open',
      closeDate: '28 November 2026',
      closeTime: '20:00 WIB',
      quotaTarget: 800,
      quotaFilled: 450
    },
    {
      id: 3,
      orderNo: 'INV-20260926-0248',
      title: 'NARARYA MUKENA SEKAR SASMITA',
      brand: 'Isa Luxury',
      status: 'closed',
      closeDate: '30 September 2026 (Telah Ditutup)',
      closeTime: '18:00 WIB',
      quotaTarget: 1000,
      quotaFilled: 1000
    },
    {
      id: 4,
      orderNo: 'INV-20260926-1039',
      title: 'COVERME SARIMBIT SAFIYYA 2027',
      brand: 'Coverme Hijab',
      status: 'open',
      closeDate: '02 November 2026',
      closeTime: '23:59 WIB',
      quotaTarget: 2500,
      quotaFilled: 1840
    }
  ]);

  // Global Bank Accounts (Updated strictly by Admin Finance)
  const [adminBankAccounts, setAdminBankAccounts] = useState([
    { id: 'mandiri', bank: 'MANDIRI', accountNo: '1234567890123', holder: 'Erna Susiyanti', active: true },
    { id: 'bca', bank: 'BCA', accountNo: '87654321', holder: 'Erna Susiyanti', active: true },
    { id: 'bri', bank: 'BRI', accountNo: '987654312156', holder: 'Erna Susiyanti', active: true },
    { id: 'bsi', bank: 'BSI Syariah', accountNo: '7149021821', holder: 'Erna Susiyanti', active: true }
  ]);

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
  };

  const handleDepositSubmit = (depositData) => {
    setPoDeposits((prev) => [paymentToDeposit(depositData), ...prev]);
    setToast({
      show: true,
      message: `Pengajuan deposit Rp ${Number(depositData.nominal || 0).toLocaleString('id-ID')} diteruskan ke antrean Finance.`
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
      localStorage.setItem('afathar_current_page', currentPage);
    }
  }, [currentPage]);

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
        const [productResponse, brandResponse, categoryResponse, courierResponse, bankResponse] =
          await Promise.all([
            api.products(),
            api.brands(),
            api.categories(),
            api.couriers(),
            api.bankAccounts()
          ]);

        if (cancelled) return;

        const remoteProducts = mapProducts(productResponse);
        if (remoteProducts.length) {
          setProducts(remoteProducts);
          setPoProducts(projectProductsToCore(remoteProducts));
          setSelectedProduct(
            (prev) => remoteProducts.find((item) => item.id === prev?.id) || remoteProducts[0]
          );
        }

        const remoteBrands = mapBrands(brandResponse?.data || []);
        if (remoteBrands.length > 1) {
          setBrands(remoteBrands);
          setPoBrands(projectBrandsToCore(remoteBrands));
        }

        const remoteCategories = mapCategoryNames(categoryResponse?.data || []);
        if (remoteCategories.length) setPoCategories(remoteCategories);

        const remoteCouriers = (courierResponse?.data || []).map(mapCourier);
        if (remoteCouriers.length) setAdminCouriers(remoteCouriers);

        const remoteBanks = (bankResponse?.data || []).map(mapBankAccount);
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
    if (!sessionToken) return undefined;

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
  }, [sessionToken]);

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
    if (!isLoggedIn) {
      setIsLoginPromptOpen(true);
      return;
    }
    setCurrentPage('cart');
  };

  const handleAddToCart = (item) => {
    if (!isLoggedIn) {
      setIsLoginPromptOpen(true);
      return;
    }
    setCartItems((prev) => [item, ...prev]);
    setIsSuccessCartOpen(true);
  };

  const handleBuyNow = (item) => {
    if (!isLoggedIn) {
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
    if (!isLoggedIn) {
      setIsLoginPromptOpen(true);
      return;
    }
    const itemsToProcess = items && items.length > 0 ? items : cartItems;
    setCheckoutItems(itemsToProcess);
    setCurrentPage('checkout');
  };

  const handleCompleteOrder = (newOrder) => {
    // Add new order with full metadata to Global Orders
    const schemeDpPct = Math.min(100, Math.max(0, Number(newOrder.dpPct ?? 50)));
    const dpNominal = Math.round((newOrder.total || 0) * (schemeDpPct / 100));
    const enrichedOrder = {
      ...newOrder,
      mitraName: currentUser?.name || 'HENI (Bekasi)',
      mitraLevel: currentUser?.role || 'Mitra Distributor',
      mitraCity: 'Bekasi',
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
      message: `Pesanan Pre-Order ${newOrder.orderNo} berhasil dibuat! Faktur invoice siap dicetak di dashboard mitra.`
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

  const handleUpdateMitraOrder = (invoice, patch) => {
    if (!invoice) return;
    setCoreOrders((prev) =>
      prev.map((o) => {
        if (o.invoice !== invoice) return o;
        if (patch.items) {
          const items = patch.items;
          const qty = items.reduce((s, it) => s + (Number(it.qty) || 1), 0);
          const subtotal = items.reduce(
            (s, it) => s + (Number(it.subtotal) || (Number(it.price) || 0) * (Number(it.qty) || 1)),
            0
          );
          return {
            ...o,
            qty,
            subtotal,
            pelunasanNominal: Math.max(0, subtotal - (Number(o.dpNominal) || 0)),
            total: subtotal + (Number(o.ongkir) || 0),
            _projectMeta: { ...(o._projectMeta || {}), items }
          };
        }
        if (patch.ekspedisi) return { ...o, ekspedisi: patch.ekspedisi };
        return o;
      })
    );
  };

  const handleUpdateAvatar = (newAvatar) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, avatar: newAvatar };
      try {
        localStorage.setItem('afatharshop_user_avatar', newAvatar);
      } catch (e) {
        console.warn('Gagal menyimpan ke localStorage', e);
      }
      return updated;
    });
    setToast({
      show: true,
      message: 'Foto profil akun berhasil diperbarui dan disinkronkan ke seluruh sistem.'
    });
  };

  const handleUpdateUser = (updatedInfo) => {
    setCurrentUser((prev) => ({
      ...prev,
      ...updatedInfo
    }));
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
    const savedAvatar = typeof window !== 'undefined' ? localStorage.getItem('afatharshop_user_avatar') : null;
    const roleId = role?.id || 'mitra';
    const roleName = role?.name || 'Mitra Distributor';

    const userObj = {
      name: userData?.name || (roleId === 'mitra' ? 'HENI' : roleName),
      role: roleName,
      roleId: roleId,
      avatar: savedAvatar || userData?.avatar || DEFAULT_USER.avatar,
      balance: userData?.balance || 'Rp 0',
      totalBill: userData?.totalBill || (roleId === 'mitra' ? 'Rp 3.399.145' : 'Rp 0'),
      phone: userData?.phone || '(+62) 0812-1999-1888',
      email: userData?.email || 'afatharshop@maknahijab.com',
      address: userData?.address || DEFAULT_USER.address
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

  const handleQuickSwitchRole = (roleId) => {
    const matchedRole = ROLES.find((r) => r.id === roleId) || ROLES[0];
    handleLoginSuccess(matchedRole, {
      name:
        roleId === 'marketing'
          ? 'ADMIN PURCHASING'
          : roleId === 'finance'
          ? 'DEWI FINANCE'
          : roleId === 'owner'
          ? 'OWNER AFATHAR'
          : 'HENI'
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
    return (
      <LogoutSuccessPage
        onNavigateLogin={() => setCurrentPage('login')}
        onNavigateHome={handleNavigateHome}
      />
    );
  }

  if (currentPage === 'login') {
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

  // Auth Guard: If trying to access any private dashboard without an active session, prompt to login
  const isPrivateDashboard = ['mitra_dashboard', 'marketing_dashboard', 'finance_dashboard', 'owner_dashboard'].includes(currentPage);
  const isPortalDashboard = ['marketing_dashboard', 'finance_dashboard', 'owner_dashboard'].includes(currentPage);
  if (isPrivateDashboard && !isLoggedIn) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
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
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => handleNavigateDashboard('profil')}
        onOpenOrderForm={handleNavigateCatalog}
        onOpenOrders={() => handleNavigateDashboard('pesanan_saya')}
        onNavigateDashboard={handleNavigateDashboard}
        currentPage={currentPage}
        onQuickSwitchRole={handleQuickSwitchRole}
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
            currentUser={currentUser}
            onNavigateHome={handleNavigateHome}
            onNavigateCart={() => setCurrentPage('cart')}
            onCompleteOrder={handleCompleteOrder}
            adminCouriers={adminCouriers}
            adminBankAccounts={adminBankAccounts}
          />
        )}

        {/* VIEW 5: MITRA DASHBOARD (Matches User Screenshots 1 - 5) */}
        {currentPage === 'mitra_dashboard' && (
          <MitraDashboard
            activeTab={mitraActiveTab}
            onSelectTab={(tab) => setMitraActiveTab(tab)}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onUpdateAvatar={handleUpdateAvatar}
            onLogout={handleLogout}
            onNavigateCatalog={handleNavigateCatalog}
            onNavigateHome={handleNavigateHome}
            poBatches={poBatches}
            onUploadPayment={handleUploadPayment}
            onDepositSubmit={handleDepositSubmit}
            orders={mitraOrders.filter(
              (o) =>
                !o.mitraName ||
                o.mitraName.toUpperCase().includes((currentUser?.name || 'HENI').toUpperCase())
            )}
            adminBankAccounts={adminBankAccounts}
            adminCouriers={adminCouriers}
            onUpdateOrder={handleUpdateMitraOrder}
          />
        )}

        {/* VIEW 6: MARKETING DASHBOARD (ACC pesanan, katalog, brand, supplier, tim) */}
        {currentPage === 'marketing_dashboard' && (
          <MarketingDashboard
            currentUser={{ ...currentUser, role: 'marketing' }}
            onNavigateStore={handleNavigateHome}
            onLogout={handleLogout}
            orders={coreOrders}
            products={poProducts}
            brands={poBrands}
            suppliers={poSuppliers}
            mitra={poMitra}
            team={poTeam}
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
            onPrintInvoice={(order) => openInvoicePrintTab(order, adminBankAccounts)}
          />
        )}

        {/* VIEW 7: FINANCE DASHBOARD (verifikasi 3 tahap, ongkir, resi, pengajuan dana) */}
        {currentPage === 'finance_dashboard' && (
          <FinanceDashboard
            currentUser={{ ...currentUser, role: 'finance' }}
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
            onPrintInvoice={(order) => openInvoicePrintTab(order, adminBankAccounts)}
          />
        )}

        {/* VIEW 8: OWNER DASHBOARD (approval akhir & transfer pengajuan dana) */}
        {currentPage === 'owner_dashboard' && (
          <OwnerDashboard
            currentUser={{ ...currentUser, role: 'owner' }}
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
            onChangeTeam={setPoTeam}
            onChangePaymentRequests={setPoPaymentRequests}
            onChangeSettings={setPoSettings}
            onPrintInvoice={(order) => openInvoicePrintTab(order, adminBankAccounts)}
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
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        onUpdateAvatar={handleUpdateAvatar}
      />

      {/* Pesanan Pre-Order Modal */}
      <OrdersModal
        isOpen={isOrdersModalOpen}
        onClose={() => setIsOrdersModalOpen(false)}
        onNavigateProduct={handleSelectProduct}
      />

    </div>
  );
}
