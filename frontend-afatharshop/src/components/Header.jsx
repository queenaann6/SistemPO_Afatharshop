import React, { useState, useEffect, useRef } from 'react';
import {
  SearchIcon,
  GridIcon,
  CartIcon,
  ChevronDownIcon,
  CheckIcon,
  UserIcon,
  DocumentTextIcon,
  ListIcon,
  HeartIcon,
  LogoutIcon,
  HomeIcon,
  PencilIcon,
  BellIcon
} from './Icons';

export default function Header({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  onSelectCategory,
  categories,
  cartCount,
  onOpenCart,
  onOpenAuth,
  onNavigateHome,
  onSearchSubmit,
  isLoggedIn = false,
  currentUser = null,
  onLogout,
  onOpenProfile,
  onOpenOrderForm,
  onOpenOrders,
  onOpenWishlist,
  onNavigateDashboard,
  currentPage,
  onQuickSwitchRole,
  notifications = [],
  onNotificationClick,
  onMarkAllRead
}) {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const userMenuRef = useRef(null);
  const notifMenuRef = useRef(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    if (isUserMenuOpen || isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen, isNotifOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearchSubmit && onSearchSubmit();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full shadow-md">
      {/* Main Navbar */}
      <div className="h-16 sm:h-[72px] bg-[#6B1416] px-3 sm:px-4 text-white border-b border-[#520C0E] flex items-center">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 lg:gap-6 w-full">
          
          {/* Left: Brand Logo & Monogram */}
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 sm:gap-3 shrink-0 group text-left cursor-pointer bg-transparent border-0 p-0"
            title="Kembali ke Beranda"
          >
            {/* Official Afathar Shop Logo */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-[#F0C973] overflow-hidden bg-white shadow-md group-hover:scale-105 transition-transform shrink-0">
              <img
                src="/logo.jpg"
                alt="Afathar Shop Logo"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Brand Text */}
            <div className="hidden sm:flex flex-col">
              <span className="font-display text-base sm:text-lg lg:text-xl font-bold tracking-wider text-[#F0C973] leading-none">
                AFATHAR SHOP
              </span>
              <span className="text-[9px] sm:text-[10px] font-medium tracking-[0.22em] text-amber-100/90 leading-tight mt-0.5 uppercase">
                Moslem Womens Needs
              </span>
            </div>
          </button>

          {/* Center-Left: Kategori Button (WHITE as instructed) */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="bg-white text-[#6B1416] hover:bg-stone-50 font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-full shadow-sm flex items-center gap-2 transition duration-150 cursor-pointer border border-rose-100"
              title="Pilih Kategori Produk"
            >
              <GridIcon className="w-4 h-4 text-[#6B1416]" />
              <span className="truncate max-w-[110px]">{selectedCategory || 'Kategori'}</span>
              <ChevronDownIcon className={`w-3.5 h-3.5 text-[#6B1416] transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Kategori Dropdown */}
            {isCategoryOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-[60] animate-in fade-in zoom-in-95 duration-150 text-stone-800">
                <div className="px-3 py-1.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                  Kategori Busana & Aksesoris
                </div>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      onSelectCategory(cat === 'Semua Kategori' ? '' : cat);
                      setIsCategoryOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-orange-50/80 transition cursor-pointer ${
                      (selectedCategory === cat || (!selectedCategory && cat === 'Semua Kategori'))
                        ? 'text-[#6B1416] font-bold bg-orange-50/50'
                        : 'text-stone-700'
                    }`}
                  >
                    <span>{cat}</span>
                    {(selectedCategory === cat || (!selectedCategory && cat === 'Semua Kategori')) && (
                      <CheckIcon className="w-3.5 h-3.5 text-[#6B1416]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center: Search Bar (WHITE as instructed) */}
          <div className="hidden lg:block flex-1 min-w-0 max-w-xl mx-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Cari produk sarimbit, abaya, khimar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white text-stone-800 placeholder-stone-400 text-xs sm:text-sm pl-3 sm:pl-4 pr-9 sm:pr-10 py-2 sm:py-2.5 rounded-full shadow-inner border border-rose-100 focus:outline-none focus:ring-2 focus:ring-[#F0C973] transition duration-150"
              />
              <button
                onClick={onSearchSubmit}
                className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#6B1416] transition cursor-pointer p-0.5"
                title="Cari"
              >
                <SearchIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Cart & Auth Buttons */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Cart Icon with Badge */}
            <button
              onClick={onOpenCart}
              className="relative p-1.5 sm:p-2 text-white hover:text-[#F0C973] transition rounded-full hover:bg-white/10 cursor-pointer"
              title="Keranjang Pemesanan PO"
            >
              <CartIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 sm:w-4.5 sm:h-4.5 flex items-center justify-center border-2 border-[#6B1416]">
                {cartCount}
              </span>
            </button>

            {/* Notification Bell Button (Tampil di samping Keranjang setelah Login) */}
            {isLoggedIn && (
              <div className="relative" ref={notifMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="relative p-1.5 sm:p-2 text-white hover:text-[#F0C973] transition rounded-full hover:bg-white/10 cursor-pointer"
                  title="Pemberitahuan & Notifikasi"
                >
                  <BellIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 sm:min-w-4.5 sm:h-4.5 px-0.5 bg-[#F0C973] text-[#420C0E] text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-[#6B1416] shadow-xs">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Notifikasi */}
                {isNotifOpen && (
                  <div className="fixed left-3 right-3 top-16 mt-2 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2.5 sm:w-80 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden z-[60] text-stone-800 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-3 bg-[#6B1416] text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BellIcon className="w-4 h-4 text-[#F0C973]" />
                        <span className="font-bold text-xs tracking-wide">Pemberitahuan</span>
                      </div>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                        {unreadCount > 0 ? `${unreadCount} Baru` : 'Semua terbaca'}
                      </span>
                    </div>

                    <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto text-xs">
                      {notifications.length === 0 && (
                        <p className="p-6 text-center text-[11px] text-stone-400 italic">
                          Tidak ada pemberitahuan.
                        </p>
                      )}
                      {notifications.map((notif) => {
                        const dotTone =
                          notif.tone === 'amber'
                            ? 'bg-amber-500'
                            : notif.tone === 'blue'
                            ? 'bg-blue-500'
                            : 'bg-emerald-500';
                        return (
                          <button
                            key={notif.id}
                            type="button"
                            onClick={() => {
                              setIsNotifOpen(false);
                              onNotificationClick && onNotificationClick(notif);
                            }}
                            className={`w-full text-left p-3.5 flex items-start gap-3 transition cursor-pointer ${
                              notif.read
                                ? 'bg-white hover:bg-stone-50'
                                : 'bg-amber-50/40 hover:bg-amber-50/70'
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                notif.read ? 'bg-stone-300' : dotTone
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p
                                  className={`text-[11px] ${
                                    notif.read ? 'font-semibold text-stone-600' : 'font-bold text-stone-900'
                                  }`}
                                >
                                  {notif.title}
                                </p>
                                {!notif.read && (
                                  <span className="text-[8px] font-extrabold uppercase tracking-wide text-[#6B1416] bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full shrink-0">
                                    Baru
                                  </span>
                                )}
                              </div>
                              <p className="text-stone-500 text-[11px] mt-0.5 leading-relaxed">
                                {notif.sub}
                              </p>
                              <div className="flex items-center justify-between mt-1 gap-2">
                                <p className="text-[9px] text-stone-400">{notif.time}</p>
                                <span className="text-[9px] font-semibold text-[#6B1416]">
                                  {notif.read ? '✓ Terbaca' : 'Klik untuk buka ›'}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
                      {unreadCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => onMarkAllRead && onMarkAllRead()}
                          className="text-[11px] font-bold text-[#6B1416] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                          Tandai semua dibaca
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400">Semua pemberitahuan terbaca</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsNotifOpen(false)}
                        className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Authenticated State */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <div className="relative" ref={userMenuRef}>
                  {/* User Pill Button (Black pill with avatar, name, chevron) */}
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="bg-[#0B0F19] hover:bg-[#181F30] border border-white/10 hover:border-white/25 text-white p-0.5 sm:pl-1.5 sm:pr-3 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition shadow-md"
                    title="Menu Akun Saya"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-stone-700 shrink-0 border border-emerald-400/40">
                      <img
                        src={currentUser?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80'}
                        alt={currentUser?.name || 'HENI'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="hidden sm:inline uppercase tracking-wide text-white text-xs sm:text-sm font-bold">{currentUser?.name || 'HENI'}</span>
                    <ChevronDownIcon className={`hidden sm:block w-3.5 h-3.5 text-stone-300 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Card (Matches Uploaded Mockup Exactly) */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2.5 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden z-[60] text-stone-800 animate-in fade-in zoom-in-95 duration-150">
                      {/* 1. Dark Profile Header */}
                      <div className="bg-[#111827] text-white p-3.5 sm:p-4 flex items-center gap-3.5">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-stone-700 shrink-0 ring-2 ring-emerald-500/40">
                          <img
                            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80'}
                            alt={currentUser?.name || 'HENI'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm sm:text-base tracking-wide leading-tight truncate uppercase">
                            {currentUser?.name || 'HENI'}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {currentUser?.role || 'Mitra Distributor'}
                            </span>
                          </div>
                          {currentUser?.roleId === 'mitra' && (
                            <p className="text-emerald-400 font-semibold text-xs mt-1">
                              Saldo: {currentUser?.balance || 'Rp 0'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 2. Total Tagihan Ribbon (Soft pink / light red background) - Khusus Mitra */}
                      {currentUser?.roleId === 'mitra' && (
                        <div className="bg-[#FFF1F2] border-y border-rose-100/80 py-2.5 px-4 text-center">
                          <p className="text-rose-600 font-semibold text-xs tracking-wide">
                            Total Tagihan: {currentUser?.totalBill || 'Rp 3.399.145'}
                          </p>
                        </div>
                      )}

                      {/* 3. Navigation List Items */}
                      <div className="py-1.5 text-xs text-stone-700 font-medium">
                        {/* Dashboard Saya */}
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onNavigateDashboard && onNavigateDashboard('dashboard');
                          }}
                          className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-stone-50 transition cursor-pointer"
                        >
                          <HomeIcon className="w-4 h-4 text-[#6B1416] shrink-0" />
                          <span className="text-[#6B1416] font-bold">
                            Dashboard {currentUser?.roleId === 'marketing' ? 'Purchasing' : currentUser?.roleId === 'finance' ? 'Finance' : currentUser?.roleId === 'owner' ? 'Owner' : 'Mitra'}
                          </span>
                        </button>

                        {/* Additional options based on role */}
                        {currentUser?.roleId === 'mitra' ? (
                          <>
                            {/* Profil Saya (Edit Biodata & Foto) */}
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onNavigateDashboard && onNavigateDashboard('profil');
                              }}
                              className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-stone-50 transition cursor-pointer"
                            >
                              <PencilIcon className="w-4 h-4 text-stone-500 shrink-0" />
                              <span className="text-stone-800">Profil Saya</span>
                            </button>

                            {/* Order Form */}
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onOpenOrderForm && onOpenOrderForm();
                              }}
                              className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-stone-50 transition cursor-pointer"
                            >
                              <DocumentTextIcon className="w-4 h-4 text-stone-500 shrink-0" />
                              <span className="text-stone-800">Order Form</span>
                            </button>

                            {/* Pesanan Saya */}
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onNavigateDashboard && onNavigateDashboard('pesanan_saya');
                              }}
                              className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-stone-50 transition cursor-pointer"
                            >
                              <ListIcon className="w-4 h-4 text-stone-500 shrink-0" />
                              <span className="text-stone-800">Pesanan Saya</span>
                            </button>

                            {/* Wishlist */}
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onOpenWishlist && onOpenWishlist();
                              }}
                              className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-stone-50 transition cursor-pointer"
                            >
                              <HeartIcon className="w-4 h-4 text-stone-500 shrink-0" />
                              <span className="text-stone-800">Wishlist</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Toko Publik */}
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                onNavigateHome && onNavigateHome();
                              }}
                              className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-stone-50 transition cursor-pointer"
                            >
                              <DocumentTextIcon className="w-4 h-4 text-stone-500 shrink-0" />
                              <span className="text-stone-800">Lihat Toko Publik</span>
                            </button>
                          </>
                        )}

                        {/* Divider */}
                        <div className="border-t border-stone-100 my-1 mx-3"></div>

                        {/* Keluar (Logout) */}
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogout && onLogout();
                          }}
                          className="w-full text-left px-4 py-2.5 flex items-center gap-3 text-rose-600 hover:bg-rose-50 font-semibold transition cursor-pointer"
                        >
                          <LogoutIcon className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>Keluar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Daftar Button */}
                <button
                  onClick={() => onOpenAuth('register')}
                  className="bg-[#F0C973] hover:bg-[#E5BC64] text-[#420C0E] font-bold text-xs sm:text-sm px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-sm transition hover:scale-102 cursor-pointer whitespace-nowrap"
                >
                  Daftar
                </button>

                {/* Masuk Button */}
                <button
                  onClick={() => onOpenAuth('login')}
                  className="bg-[#F0C973] hover:bg-[#E5BC64] text-[#420C0E] font-bold text-xs sm:text-sm px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-sm transition hover:scale-102 cursor-pointer whitespace-nowrap"
                >
                  Masuk
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
