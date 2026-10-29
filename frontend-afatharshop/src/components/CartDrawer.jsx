import React from 'react';
import { XIcon, CartIcon, ShieldCheckIcon } from './Icons';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onUpdateQty,
  onCheckout
}) {
  if (!isOpen) return null;

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val).replace('IDR', 'Rp');
  };

  const totalBookingDP = cartItems.reduce((acc, item) => acc + (item.bookingAmount || 0), 0);
  const totalRemaining = cartItems.reduce((acc, item) => acc + (item.remainingAmount || 0), 0);
  const grandTotal = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="px-5 py-4 bg-[#6B1416] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white shrink-0 border border-[#F0C973]">
                <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-[#F0C973]">
                Daftar Pemesanan PO ({cartItems.length})
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/10 text-stone-200 hover:text-white transition cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <CartIcon className="w-12 h-12 stroke-1 mb-2 text-stone-300" />
                <p className="text-sm font-medium text-stone-600">Keranjang PO masih kosong</p>
                <p className="text-xs text-stone-400 mt-1 max-w-xs">
                  Pilih produk pre-order dari katalog untuk melakukan booking kuota distributor resmi.
                </p>
              </div>
            ) : (
              cartItems.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex gap-3 relative"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-20 object-cover rounded-lg bg-stone-200 shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between text-xs">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-stone-400 uppercase">
                          {item.brand}
                        </span>
                        <button
                          onClick={() => onRemoveItem(idx)}
                          className="text-stone-400 hover:text-red-600 p-0.5 cursor-pointer"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="font-semibold text-stone-900 line-clamp-1">{item.title}</h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Warna: {item.selectedColor} | Size: {item.selectedSize}
                      </p>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-semibold inline-block mt-1">
                        {item.orderType === 'dp' ? 'Skema DP 30%' : 'Lunas'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-200">
                      <span className="font-bold text-red-600">
                        {formatRupiah(item.bookingAmount)}
                      </span>
                      <span className="text-stone-500 font-medium">Qty: {item.qty}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary */}
          {cartItems.length > 0 && (
            <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3">
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Total Nilai Pesanan PO:</span>
                  <span className="font-semibold text-stone-900">{formatRupiah(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-amber-900 font-semibold">
                  <span>Total Tagihan DP Sekarang:</span>
                  <span className="text-sm font-bold text-red-600">{formatRupiah(totalBookingDP)}</span>
                </div>
                {totalRemaining > 0 && (
                  <div className="flex justify-between text-[11px] text-stone-500">
                    <span>Sisa Pelunasan (Saat Siap Kirim):</span>
                    <span>{formatRupiah(totalRemaining)}</span>
                  </div>
                )}
              </div>

              <button
                onClick={onCheckout}
                className="w-full bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs sm:text-sm py-3 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Proses Pemesanan PO ({formatRupiah(totalBookingDP)})</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-500">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Invoice diteruskan otomatis ke Admin Finance & Purchasing</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
