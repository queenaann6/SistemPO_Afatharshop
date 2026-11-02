import React, { useState, useMemo, useEffect } from 'react';
import OrderDetailView from './OrderDetailView';
import { SearchIcon, DocumentTextIcon } from '../../Icons';

export default function MitraOrdersTab({
  onNavigateCatalog,
  onSelectTab,
  onUploadPayment,
  onPayWithDeposit,
  currentUser,
  poBatches = [],
  orders: customOrders,
  adminBankAccounts = [],
  adminCouriers = [],
  onUpdateOrder
}) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Terbaru');

  // Pre-order list — empty for real data testing
  const initialOrdersList = [];

  // Gunakan pesanan aktual mitra (customOrders)
  const combinedOrders = useMemo(() => customOrders || [], [customOrders]);

  // Helper untuk menentukan apakah pesanan sudah Close PO
  const isOrderClosed = (ord) => {
    if (!ord) return false;
    if (ord.isClosedPO) return true;
    const s = String(ord.status || '').toLowerCase();
    if (
      s.includes('siap kirim') ||
      s.includes('dikirim') ||
      s.includes('selesai') ||
      s.includes('batal') ||
      s.includes('closed') ||
      s.includes('ditutup')
    ) {
      return true;
    }
    const matchedBatch = poBatches?.find(
      (b) => b.orderNo === ord.orderNo || b.title === ord.title
    );
    if (matchedBatch && matchedBatch.status === 'closed') {
      return true;
    }
    return false;
  };

  // Pagination "Lihat lainnya" state (mulai dari 2 pesanan, klik bertambah)
  const [visibleCount, setVisibleCount] = useState(2);

  // Reset pagination saat filter, search, atau sort berubah
  useEffect(() => {
    setVisibleCount(2);
  }, [activeFilter, searchQuery, sortBy]);

  // If an order is selected, show its full detail view!
  if (selectedOrder) {
    // Ambil versi terbaru dari shared state agar perubahan Admin Finance langsung terlihat
    const liveOrder =
      combinedOrders.find((o) => o.orderNo === selectedOrder.orderNo) || selectedOrder;
    // Check if this order's batch has been closed
    const isClosedPO = isOrderClosed(liveOrder);

    return (
      <OrderDetailView
        order={{
          ...liveOrder,
          isClosedPO,
          closeDate: liveOrder.closeDate
        }}
        onBack={() => setSelectedOrder(null)}
        onSelectTab={onSelectTab}
        onUploadPayment={onUploadPayment}
        onPayWithDeposit={onPayWithDeposit}
        currentUser={currentUser}
        isClosedPOProp={isClosedPO}
        adminBankAccounts={adminBankAccounts}
        adminCouriers={adminCouriers}
        orderInvoice={liveOrder.orderNo || liveOrder.id}
        onUpdateOrder={(patch) => {
          setSelectedOrder((prev) => (prev ? { ...prev, ...patch } : prev));
          onUpdateOrder?.(liveOrder.orderNo || liveOrder.id, patch);
        }}
      />
    );
  }

  // Filter orders (Strictly Pre-Order Distributor System - No Ready Stock)
  const filteredOrders = combinedOrders.filter((ord) => {
    if (activeFilter === 'Preorder') return ord.status !== 'Selesai' && ord.status !== 'Batal';
    if (activeFilter === 'Selesai') return ord.status === 'Selesai';
    if (activeFilter === 'Batal') return ord.status === 'Batal';
    return true;
  }).filter((ord) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return ord.title.toLowerCase().includes(q) || ord.orderNo.toLowerCase().includes(q);
  });

  // Sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'Nominal Tertinggi') {
      return (b.total || 0) - (a.total || 0);
    }
    if (sortBy === 'Terlama') {
      return (a.id || 0) - (b.id || 0);
    }
    return (b.id || 0) - (a.id || 0); // Default Terbaru
  });

  // Tampilkan pesanan sesuai pagination "Lihat lainnya"
  const displayedOrders = sortedOrders.slice(0, visibleCount);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-6">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-wide">
          Pesanan Saya
        </h2>
        <span className="text-xs text-stone-500 font-semibold">
          {displayedOrders.length === sortedOrders.length
            ? `${sortedOrders.length} pesanan pre-order`
            : `Menampilkan ${displayedOrders.length} dari ${sortedOrders.length} pesanan pre-order`}
        </span>
      </div>

      {/* Filter Tabs (Pre-Order Only: Semua, Preorder, Selesai, Batal) */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {['Semua', 'Preorder', 'Selesai', 'Batal'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-4 py-1.5 rounded-full font-bold transition cursor-pointer ${
              activeFilter === tab
                ? 'bg-black text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 bg-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search & Sort Bar (Matches Screenshot 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari pesanan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl pl-3.5 pr-10 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer">
            <SearchIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-stone-600">
          <span>Urutkan:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800 cursor-pointer focus:outline-none"
          >
            <option value="Terbaru">Terbaru</option>
            <option value="Terlama">Terlama</option>
            <option value="Nominal Tertinggi">Nominal Tertinggi</option>
          </select>
        </div>
      </div>

      {/* Order Cards List (Matches Screenshot 1) */}
      <div className="space-y-4">
        {displayedOrders.map((ord) => {
          const closed = isOrderClosed(ord);

          return (
            <div
              key={ord.id}
              onClick={() => setSelectedOrder(ord)}
              className="group rounded-2xl p-4 sm:p-5 border border-stone-200 hover:border-[#6B1416]/50 hover:shadow-md transition cursor-pointer space-y-3 bg-white"
            >
              {/* Top Row: Order No & Status Badge */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="w-3.5 h-3.5 text-stone-400" />
                  <span className="font-mono text-xs font-semibold text-stone-600">
                    {ord.orderNo}
                  </span>
                  {/* PO Status Indicator: Jika Close PO maka tampil 'PO Ditutup', jika open maka 'Bisa Tambah/Edit Produk' */}
                  {!closed ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Bisa Tambah/Edit Produk
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">
                      PO Ditutup
                    </span>
                  )}
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${ord.statusColor}`}>
                  {ord.status}
                </span>
              </div>

              {/* Thumbnail, Title, Date */}
              <div className="flex items-center gap-4">
                <img
                  src={ord.image}
                  alt={ord.title}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl object-cover shrink-0 border border-stone-200 group-hover:scale-102 transition"
                />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <h4 className="font-bold text-stone-900 text-xs sm:text-sm truncate group-hover:text-[#6B1416] transition">
                    {ord.title}
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    {ord.date}
                  </p>
                  <p className="text-[10px] text-stone-500">
                    Batas PO: {ord.closeDate || '-'}
                  </p>
                </div>
              </div>

              {/* Bottom Row: Total Pembayaran & Detail Link */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500 text-[11px]">Total Pembayaran</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-900 text-sm">
                    Rp {(ord.total || 0).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[11px] font-semibold text-[#6B1416] group-hover:underline">
                    Lihat Detail &gt;
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Button: Lihat Lainnya (Aktif & Berfungsi) */}
      <div className="pt-2">
        {visibleCount < sortedOrders.length ? (
          <button
            onClick={() => setVisibleCount((prev) => prev + 2)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50 hover:border-stone-400 transition cursor-pointer shadow-2xs flex items-center justify-center gap-2"
          >
            <span>Lihat lainnya</span>
            <span className="text-[10px] font-normal text-stone-500">
              ({sortedOrders.length - visibleCount} pesanan lagi)
            </span>
          </button>
        ) : (
          <div className="text-xs text-stone-400 font-semibold py-1">
            ✓ Semua {sortedOrders.length} pesanan telah ditampilkan.
          </div>
        )}
      </div>

    </div>
  );
}
