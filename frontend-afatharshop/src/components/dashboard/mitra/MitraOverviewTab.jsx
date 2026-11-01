import React, { useMemo } from 'react';
import {
  UserIcon,
  ClockIcon,
  ReloadIcon,
  CartIcon,
  ChartBarIcon,
  TrendingUpIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  WalletIcon,
  CheckIcon
} from '../../Icons';

export default function MitraOverviewTab({
  currentUser,
  onNavigateCatalog,
  onSelectTab,
  orders = [],
  products = [],
  poBatches = []
}) {
  const closePoCount = useMemo(() => {
    const openBatches = (poBatches || []).filter((b) => b.status === 'open');
    if (openBatches.length > 0) return openBatches.length;
    const closingProducts = (products || []).filter((p) => p.isClosePO || p.status === 'open');
    return closingProducts.length > 0 ? closingProducts.length : 0;
  }, [poBatches, products]);

  const bulanIniPembelian = useMemo(() => {
    return (orders || []).reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [orders]);

  const bulanIniProfit = useMemo(() => {
    return Math.round(bulanIniPembelian * 0.22);
  }, [bulanIniPembelian]);

  const pendingDpOrdersCount = useMemo(() => {
    return (orders || []).filter(
      (o) =>
        o.dpStatus !== 'ACC' &&
        o.dpStatus !== 'acc' &&
        !String(o.status || '').toLowerCase().includes('lunas')
    ).length;
  }, [orders]);

  const inProductionOrdersCount = useMemo(() => {
    return (orders || []).filter(
      (o) =>
        String(o.status || '').toLowerCase().includes('produksi') ||
        (o.dpStatus === 'ACC' && !String(o.status || '').toLowerCase().includes('selesai'))
    ).length;
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Title Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-stone-200/80">
        <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-wide">
          Dashboard Saya
        </h2>
      </div>

      {/* Maroon Welcome Banner (Matches Screenshot 2) */}
      <div className="bg-gradient-to-br from-[#6B1416] via-[#831843] to-[#520C0E] rounded-3xl p-5 sm:p-6 text-white shadow-sm flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
          <UserIcon className="w-5 h-5 text-rose-100" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">
            Halo, {currentUser?.name || 'Mitra'}!
          </h3>
          <p className="text-rose-100/90 text-xs sm:text-sm mt-1">
            Berikut ringkasan performa akun dan sinkronisasi pesanan Pre-Order Anda.
          </p>
        </div>
      </div>

      {/* Quick Summary Cards (Saldo & Tagihan Real-Time) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Aktif */}
        <div
          onClick={() => onSelectTab && onSelectTab('deposit')}
          className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs hover:border-[#6B1416]/40 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Saldo Deposit</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <WalletIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-600 mt-2">
            {currentUser?.balance || 'Rp 0'}
          </p>
          <p className="text-[10px] text-stone-400 mt-1">Klik untuk top up / cek mutasi &rarr;</p>
        </div>

        {/* Total Tagihan */}
        <div
          onClick={() => onSelectTab && onSelectTab('tagihan')}
          className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs hover:border-[#6B1416]/40 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Total Tagihan</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <DocumentTextIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-[#6B1416] mt-2">
            {currentUser?.totalBill || 'Rp 0'}
          </p>
          <p className="text-[10px] text-stone-400 mt-1">
            {pendingDpOrdersCount > 0 ? `${pendingDpOrdersCount} tagihan perlu bayar` : 'Tagihan terpantau lancar'} &rarr;
          </p>
        </div>

        {/* Total Pesanan */}
        <div
          onClick={() => onSelectTab && onSelectTab('pesanan_saya')}
          className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs hover:border-[#6B1416]/40 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Pesanan PO Aktif</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBagIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-stone-900 mt-2">
            {orders.length} Pesanan
          </p>
          <p className="text-[10px] text-stone-400 mt-1">Buka detail pesanan saya &rarr;</p>
        </div>

        {/* Tahap Produksi */}
        <div
          onClick={() => onSelectTab && onSelectTab('pesanan_saya')}
          className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs hover:border-[#6B1416]/40 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Proses Produksi</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ReloadIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-amber-600 mt-2">
            {inProductionOrdersCount} PO
          </p>
          <p className="text-[10px] text-stone-400 mt-1">Pantau progress vendor &rarr;</p>
        </div>
      </div>

      {/* Section 1: Informasi Hari Ini */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-stone-500 font-bold text-xs uppercase tracking-wider">
          <ClockIcon className="w-3.5 h-3.5" />
          <span>INFORMASI HARI INI</span>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-xs border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <ClockIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                PRODUK CLOSE PO HARI INI
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-0.5">
                {closePoCount}
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateCatalog}
            className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer self-start sm:self-center"
          >
            <span>! Segera Pesan &gt;</span>
          </button>
        </div>
      </div>

      {/* Section 2: Laporan Pembelian */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-stone-500 font-bold text-xs uppercase tracking-wider">
          <ShoppingBagIcon className="w-3.5 h-3.5" />
          <span>LAPORAN PEMBELIAN</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card Bulan Sebelumnya */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-stone-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
              <ReloadIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                BULAN SEBELUMNYA
              </p>
              <p className="text-lg sm:text-xl font-bold text-stone-900 mt-0.5">
                Rp 0
              </p>
            </div>
          </div>

          {/* Card Bulan Ini */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-stone-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <CartIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                BULAN INI
              </p>
              <p className="text-lg sm:text-xl font-bold text-emerald-600 mt-0.5">
                Rp {bulanIniPembelian.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Laporan Profit */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-stone-500 font-bold text-xs uppercase tracking-wider">
          <TrendingUpIcon className="w-3.5 h-3.5" />
          <span>LAPORAN PROFIT ESTIMASI</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card Profit Bulan Sebelumnya */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-stone-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                BULAN SEBELUMNYA
              </p>
              <p className="text-lg sm:text-xl font-bold text-stone-900 mt-0.5">
                Rp 0
              </p>
            </div>
          </div>

          {/* Card Profit Bulan Ini */}
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-stone-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center shrink-0">
              <TrendingUpIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                BULAN INI (ESTIMASI MARGIN)
              </p>
              <p className="text-lg sm:text-xl font-bold text-cyan-700 mt-0.5">
                Rp {bulanIniProfit.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
