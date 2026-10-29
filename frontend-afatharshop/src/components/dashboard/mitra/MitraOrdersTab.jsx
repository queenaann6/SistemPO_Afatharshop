import React, { useState } from 'react';
import OrderDetailView from './OrderDetailView';
import { SearchIcon, DocumentTextIcon } from '../../Icons';

export default function MitraOrdersTab({
  onNavigateCatalog,
  onSelectTab,
  onUploadPayment,
  poBatches = [],
  orders: customOrders,
  adminBankAccounts = [],
  onUpdateOrder
}) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Terbaru');

  // Pre-order list matching Screenshot 1 & 2
  const initialOrdersList = [
    {
      id: 1,
      orderNo: 'INV-20261018-0146',
      title: 'NARARYA SARIMBIT KARTIKA RAYA BATCH 2',
      date: '18 Oct 2026',
      status: 'Pesanan Dibuat',
      statusColor: 'bg-amber-100 text-amber-800',
      total: 482000,
      isClosedPO: false, // Belum Close PO -> Tombol + Tambah Produk ADA, bisa edit & hapus!
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
      title: 'NAKKA ALORA BAG - BATCH 3',
      date: '29 Sep 2026',
      status: 'Pesanan Dibuat',
      statusColor: 'bg-amber-100 text-amber-800',
      total: 207000,
      isClosedPO: false, // Belum Close PO -> Tombol + Tambah Produk ADA!
      closeDate: '28 November 2026',
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80',
      items: [
        {
          id: 201,
          title: 'NAKKA ALORA BAG - BATCH 3',
          variant: 'ALORA SHOULDER BAG : CARAMEL',
          variation: 'SHOULDER BAG',
          size: 'REGULAR',
          color: 'CARAMEL',
          price: 207000,
          qty: 1,
          subtotal: 207000,
          dueDate: '15 Des 2026',
          image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80'
        }
      ]
    },
    {
      id: 3,
      orderNo: 'INV-20260926-0248',
      title: 'NARARYA MUKENA SEKAR SASMITA',
      date: '26 Sep 2026',
      status: 'Pesanan Diproses',
      statusColor: 'bg-amber-100 text-amber-800',
      total: 675000,
      isClosedPO: true, // SUDAH Close PO -> Tombol + Tambah Produk HILANG!
      closeDate: '30 September 2026 (Telah Ditutup)',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80',
      items: [
        {
          id: 301,
          title: 'NARARYA MUKENA SEKAR SASMITA',
          variant: 'PRAYER SET PREMIUM : EMERALD GREEN',
          variation: 'PRAYER SET',
          size: 'ALL',
          color: 'EMERALD GREEN',
          price: 675000,
          qty: 1,
          subtotal: 675000,
          dueDate: '18 Jan 2027',
          image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80'
        }
      ]
    },
    {
      id: 4,
      orderNo: 'INV-20260926-1039',
      title: 'NARARYA SARIMBIT SEKAR SASMITA',
      date: '26 Sep 2026',
      status: 'Pesanan Diproses',
      statusColor: 'bg-amber-100 text-amber-800',
      total: 2103750,
      isClosedPO: true, // SUDAH Close PO -> Tombol + Tambah Produk HILANG!
      closeDate: '30 September 2026 (Telah Ditutup)',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      items: [
        {
          id: 401,
          title: 'NARARYA SARIMBIT SEKAR SASMITA',
          variant: 'FAMILY PACK (4 PCS) : ROYAL NAVY',
          variation: 'FAMILY PACK',
          size: 'M, L, KIDS',
          color: 'ROYAL NAVY',
          price: 2103750,
          qty: 1,
          subtotal: 2103750,
          dueDate: '18 Jan 2027',
          image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
        }
      ]
    },
    {
      id: 5,
      orderNo: 'INV-20260818-1050',
      title: 'NARARYA SARIMBIT LE CLAIRE B2',
      date: '18 Aug 2026',
      status: 'Pesanan Diproses',
      statusColor: 'bg-amber-100 text-amber-800',
      total: 299000,
      isClosedPO: true, // SUDAH Close PO -> Tombol + Tambah Produk HILANG!
      closeDate: '25 Agustus 2026 (Telah Ditutup)',
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80',
      items: [
        {
          id: 501,
          title: 'NARARYA SARIMBIT LE CLAIRE B2',
          variant: 'DRESS STYLE 1 : SAGE GREEN',
          variation: 'DRESS STYLE 1',
          size: 'M',
          color: 'SAGE GREEN',
          price: 299000,
          qty: 1,
          subtotal: 299000,
          dueDate: '24 Nov 2026',
          image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80'
        }
      ]
    }
  ];

  const ordersList = customOrders && customOrders.length > 0 ? customOrders : initialOrdersList;

  // If an order is selected, show its full detail view!
  if (selectedOrder) {
    // Ambil versi terbaru dari shared state agar perubahan Admin Finance langsung terlihat
    const liveOrder =
      ordersList.find((o) => o.orderNo === selectedOrder.orderNo) || selectedOrder;
    // Check if this order's batch has been closed by Admin Marketing
    const matchedBatch = poBatches.find(
      (b) => b.orderNo === liveOrder.orderNo || b.title === liveOrder.title
    );
    const isClosedPO = matchedBatch ? matchedBatch.status === 'closed' : liveOrder.isClosedPO;

    return (
      <OrderDetailView
        order={{
          ...liveOrder,
          isClosedPO,
          closeDate: matchedBatch ? matchedBatch.closeDate : liveOrder.closeDate
        }}
        onBack={() => setSelectedOrder(null)}
        onSelectTab={onSelectTab}
        onUploadPayment={onUploadPayment}
        isClosedPOProp={isClosedPO}
        adminBankAccounts={adminBankAccounts}
        orderInvoice={liveOrder.orderNo || liveOrder.id}
        onUpdateOrder={(patch) => onUpdateOrder?.(liveOrder.orderNo || liveOrder.id, patch)}
      />
    );
  }

  // Filter orders (Strictly Pre-Order Distributor System - No Ready Stock)
  const filteredOrders = ordersList.filter((ord) => {
    if (activeFilter === 'Preorder') return ord.status !== 'Selesai' && ord.status !== 'Batal';
    if (activeFilter === 'Selesai') return ord.status === 'Selesai';
    if (activeFilter === 'Batal') return ord.status === 'Batal';
    return true;
  }).filter((ord) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return ord.title.toLowerCase().includes(q) || ord.orderNo.toLowerCase().includes(q);
  });

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-6">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-wide">
          Pesanan Saya
        </h2>
        <span className="text-xs text-stone-500 font-semibold">
          {ordersList.length} pesanan pre-order
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
        {filteredOrders.map((ord) => (
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
                {/* PO Status Indicator */}
                {!ord.isClosedPO ? (
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
                  Batas PO: {ord.closeDate}
                </p>
              </div>
            </div>

            {/* Bottom Row: Total Pembayaran & Detail Link */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-500 text-[11px]">Total Pembayaran</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 text-sm">
                  Rp {ord.total.toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] font-semibold text-[#6B1416] group-hover:underline">
                  Lihat Detail &gt;
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Button: Lihat Lainnya (Matches Screenshot 1) */}
      <div className="pt-2">
        <button
          onClick={() => alert('Semua pesanan telah ditampilkan.')}
          className="w-full sm:w-auto px-6 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition cursor-pointer"
        >
          Lihat lainnya
        </button>
      </div>

    </div>
  );
}
