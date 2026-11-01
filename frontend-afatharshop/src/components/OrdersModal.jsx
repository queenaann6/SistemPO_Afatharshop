import React from 'react';
import { XIcon, ShieldCheckIcon } from './Icons';

export default function OrdersModal({ isOpen, onClose, onNavigateProduct, orders = [] }) {
  if (!isOpen) return null;

  const totalOutstanding = orders.reduce((sum, o) => sum + (Number(o.sisaTagihan || o.remainingBill) || 0), 0);
  const activeCount = orders.length;

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
              <p className="text-xl font-bold text-rose-700">Rp {Math.round(totalOutstanding).toLocaleString('id-ID')}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-stone-500">Total PO Aktif</span>
              <p className="text-xl font-bold text-stone-800">{activeCount} Pesanan</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-sm">
              Belum ada pesanan pre-order aktif.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-stone-50 rounded-2xl p-4 border border-stone-200 hover:border-stone-300 transition">
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#6B1416]">{order.invoice || order.id}</span>
                      <span className="text-stone-300">•</span>
                      <span className="text-xs font-semibold text-stone-600">{order.brand || 'Afathar'}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {order.status || 'Aktif'}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    {order.image && <img src={order.image} alt={order.title || order.produk} className="w-16 h-20 rounded-xl object-cover shrink-0" />}
                    <div className="flex-1 text-xs">
                      <h4 className="font-bold text-stone-800 leading-snug">{order.title || order.produk}</h4>
                      <p className="text-stone-500 text-[11px] mt-0.5">Varian: {order.variant || order.model || '—'}</p>
                      <p className="text-stone-500 text-[11px]">Jumlah: {order.qty || 1} pcs</p>
                      
                      <div className="mt-2.5 pt-2 border-t border-stone-200/70 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-stone-500">Sisa Tagihan:</span>
                          <p className="font-bold text-rose-600">Rp {Math.round(Number(order.sisaTagihan || order.remainingBill || 0)).toLocaleString('id-ID')}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-stone-500">DP Terbayar:</span>
                          <p className="font-bold text-emerald-600">Rp {Math.round(Number(order.paidDP || order.dpNominal || 0)).toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
