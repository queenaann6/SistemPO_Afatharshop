import React, { useState, useMemo } from 'react';
import { XIcon, ClockIcon, ShieldCheckIcon, CheckIcon } from './Icons';
import { dpPercentFor } from '../utils/terminScheme';

export default function ProductDetailModal({ product, onClose, onAddToCart }) {
  if (!product) return null;

  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || 'M');
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || 'Default');
  const [qty, setQty] = useState(1);
  const [orderType, setOrderType] = useState('dp'); // 'dp' or 'full'

  const activeVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    return (
      product.variants.find(
        (v) =>
          (!selectedColor || String(v.color || '').toLowerCase() === String(selectedColor).toLowerCase()) &&
          (!selectedSize || String(v.size || '').toLowerCase() === String(selectedSize).toLowerCase())
      ) || product.variants[0]
    );
  }, [product, selectedColor, selectedSize]);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val).replace('IDR', 'Rp');
  };

  const totalPrice = product.price * qty;
  const dpPct = dpPercentFor(product);
  const minDp = Math.round((totalPrice * dpPct) / 100);
  const remainingBill = totalPrice - minDp;

  const handleBooking = () => {
    onAddToCart({
      ...product,
      variantId: activeVariant?.id ?? product.variants?.[0]?.id ?? null,
      selectedSize,
      selectedColor,
      selectedModel: activeVariant?.model || product.models?.[0]?.name || 'Reguler',
      qty,
      orderType,
      bookingAmount: orderType === 'dp' ? minDp : totalPrice,
      remainingAmount: orderType === 'dp' ? remainingBill : 0
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#6B1416] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-white shrink-0 border border-[#F0C973]">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-bold text-[#F0C973]">AFATHAR SHOP</span>
            <span className="text-amber-200 text-xs hidden sm:inline">• Detail Katalog Distributor</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-stone-200 hover:text-white transition cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Image Column */}
            <div className="space-y-3">
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-stone-100 border border-stone-200 relative">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                  <span className="bg-white/95 text-stone-900 text-xs font-bold px-2.5 py-1 rounded shadow">
                    {product.statusLabel}
                  </span>
                  {product.isSale && (
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow">
                      SALE {product.discountPercent}%
                    </span>
                  )}
                </div>
              </div>

              {/* Distributor Guarantee Note */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Distributor Resmi:</strong> Garansi original brand 100%, jaminan alokasi kuota PO pabrik, dan invoice resmi terverifikasi.
                </span>
              </div>
            </div>

            {/* Product Details & PO Calculator */}
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold tracking-wider text-amber-800 uppercase">
                  {product.brand} • {product.category}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 mt-0.5">
                  {product.title}
                </h2>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Pricing Box */}
              <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-3.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-red-600">
                    {formatRupiah(product.price)}
                  </span>
                  {product.isSale && product.originalPrice > product.price && (
                    <span className="text-xs text-stone-400 line-through">
                      {formatRupiah(product.originalPrice)}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
                  <ClockIcon className="w-3.5 h-3.5 text-amber-700" />
                  <span>
                    Batas Tutup PO: <strong>{product.tutupPO}</strong> | Estimasi Kirim: <strong>{product.estimatedShipment}</strong>
                  </span>
                </div>
              </div>

              {/* Material Info */}
              {product.material && (
                <div className="text-xs text-stone-700">
                  <span className="font-semibold text-stone-900">Bahan / Material: </span>
                  {product.material}
                </div>
              )}

              {/* Color Selector */}
              {product.colors && product.colors.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-800">
                    Pilihan Warna: <span className="font-normal text-stone-600">{selectedColor}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                          selectedColor === color
                            ? 'bg-[#6B1416] text-white border-[#6B1416] font-medium'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-800">
                    Pilihan Ukuran: <span className="font-normal text-stone-600">{selectedSize}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                          selectedSize === size
                            ? 'bg-[#6B1416] text-white border-[#6B1416] font-medium'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-stone-800">Jumlah Order:</span>
                <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="px-4 py-1 text-xs font-bold text-stone-900 min-w-[36px] text-center">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* PO Payment Option (DP vs Full Payment) */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2">
                <span className="text-xs font-bold text-stone-900">Skema Pembayaran PO Distributor:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('dp')}
                    className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                      orderType === 'dp'
                        ? 'bg-white border-[#6B1416] ring-1 ring-[#6B1416]'
                        : 'bg-stone-100 border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">Bayar DP {dpPct}%</span>
                      {orderType === 'dp' && <CheckIcon className="w-3.5 h-3.5 text-[#6B1416]" />}
                    </div>
                    <p className="text-[11px] font-bold text-amber-800 mt-0.5">{formatRupiah(minDp)}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">Sisa pelunasan saat barang siap kirim</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderType('full')}
                    className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                      orderType === 'full'
                        ? 'bg-white border-[#6B1416] ring-1 ring-[#6B1416]'
                        : 'bg-stone-100 border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">Bayar Lunas</span>
                      {orderType === 'full' && <CheckIcon className="w-3.5 h-3.5 text-[#6B1416]" />}
                    </div>
                    <p className="text-[11px] font-bold text-stone-900 mt-0.5">{formatRupiah(totalPrice)}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">Prioritas packing ekspedisi utama</p>
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                onClick={handleBooking}
                disabled={product.status === 'closed_po'}
                className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 ${
                  product.status === 'closed_po'
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : 'bg-[#6B1416] hover:bg-[#520C0E] text-white cursor-pointer hover:shadow-lg'
                }`}
              >
                <span>
                  {product.status === 'closed_po'
                    ? 'PO Sudah Ditutup'
                    : `Booking PO Sekarang (${formatRupiah(orderType === 'dp' ? minDp : totalPrice)})`}
                </span>
              </button>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
