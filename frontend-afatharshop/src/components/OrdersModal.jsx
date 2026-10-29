import React from 'react';
import { XIcon, ShieldCheckIcon } from './Icons';

export default function OrdersModal({ isOpen, onClose, onNavigateProduct }) {
  if (!isOpen) return null;

  const sampleOrders = [
    {
      id: 'PO-2026-0891',
      title: 'SAFIYYA PREMIUM ABAYA SET',
      brand: 'COVERME HIJAB',
      model: 'MOM DRESS ONLY STYLE 1',
      size: 'M',
      color: 'NOIR MATTE',
      qty: 12,
      total: 1080000,
      paidDP: 270000,
      remainingBill: 810000,
      status: 'DP 1 Terverifikasi',
      statusColor: 'bg-emerald-100 text-emerald-800',
      eta: 'Desember 2026',
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'PO-2026-0742',
      title: 'Sarimbit Royal Blue Elegance Edition',
      brand: 'ISA LUXURY',
      model: 'FAMILY SET COMPLETE (4 PCS)',
      size: 'L, M, Kids S, Kids M',
      color: 'ROYAL SAPPHIRE',
      qty: 4,
      total: 1580000,
      paidDP: 395000,
      remainingBill: 1185000,
      status: 'Menunggu Cicilan Tahap 2',
      statusColor: 'bg-amber-100 text-amber-800',
      eta: 'Januari 2027',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-orange-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#6B1416] text-white px-6 py-4 flex items-center justify-between border-b border-[#520C0E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#F0C973] text-[#6B1416] flex items-center justify-center font-bold text-sm">
              PO
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Pesanan Pre-Order Saya</h2>
              <p className="text-[11px] text-amber-100/80">Pantau status kuota produksi dan termin pembayaran</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Total Tagihan Berjalan</span>
              <p className="text-xl font-bold text-rose-700">Rp 3.399.145</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-stone-500">Total PO Aktif</span>
              <p className="text-xl font-bold text-stone-800">2 Batch</p>
            </div>
          </div>

          <div className="space-y-3">
            {sampleOrders.map((order) => (
              <div key={order.id} className="bg-stone-50 rounded-2xl p-4 border border-stone-200 hover:border-stone-300 transition">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#6B1416]">{order.id}</span>
                    <span className="text-stone-300">•</span>
                    <span className="text-xs font-semibold text-stone-600">{order.brand}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${order.statusColor}`}>
                    {order.status}
                  </span>
                </div>

                <div className="flex gap-3">
                  <img src={order.image} alt={order.title} className="w-16 h-20 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 text-xs">
                    <h4 className="font-bold text-stone-800 leading-snug">{order.title}</h4>
                    <p className="text-stone-500 text-[11px] mt-0.5">Varian: {order.model} ({order.color})</p>
                    <p className="text-stone-500 text-[11px]">Jumlah: {order.qty} pcs | Estimasi Siap: {order.eta}</p>
                    
                    <div className="mt-2.5 pt-2 border-t border-stone-200/70 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-500">Sisa Tagihan:</span>
                        <p className="font-bold text-rose-600">Rp {order.remainingBill.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-stone-500">DP Terbayar:</span>
                        <p className="font-bold text-emerald-600">Rp {order.paidDP.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-6 py-3.5 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs px-5 py-2 rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
