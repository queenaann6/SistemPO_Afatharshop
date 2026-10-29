import React, { useState } from 'react';
import {
  ChevronRightIcon,
  ClockIcon,
  ShieldCheckIcon,
  CartIcon
} from './Icons';
import { brandDiscountNominalFor, feeNominalFor, num } from './dashboard/poCore';

export default function ProductDetailPage({
  product,
  onNavigateHome,
  onAddToCart,
  onBuyNow,
  isLoggedIn,
  brands = [],
  mitraLevel = 'DB All'
}) {
  if (!product) return null;

  // Selected variations
  const [selectedImage, setSelectedImage] = useState(
    product.thumbnails?.[0] || product.image
  );
  const [selectedModel, setSelectedModel] = useState(
    product.models?.[0]?.name || 'MOM DRESS ONLY STYLE 1'
  );
  const [selectedSize, setSelectedSize] = useState(
    product.sizes?.[2] || product.sizes?.[0] || 'M'
  );
  const [selectedColor, setSelectedColor] = useState(
    product.colors?.[0]?.name || 'NOIR MATTE'
  );
  const [qty, setQty] = useState(1);
  const [isWishlist, setIsWishlist] = useState(false);

  // Formatting helpers
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    })
      .format(val)
      .replace('IDR', 'Rp');
  };

  // Variant (warna/model/size) dapat membawa harga & harga tambahan sendiri dari katalog
  const activeModelObj = product.models?.find((m) => m.name === selectedModel);
  const activeVariant = (product.variants || []).find(
    (v) =>
      v.model === selectedModel &&
      String(v.size ?? '') === String(selectedSize) &&
      (!v.color || v.color === selectedColor)
  );
  const variantPrice = activeVariant?.price;
  const currentPrice =
    variantPrice != null && variantPrice !== '' && Number.isFinite(Number(variantPrice))
      ? Number(variantPrice)
      : activeModelObj
        ? activeModelObj.price
        : product.price;
  const currentAddon = activeVariant
    ? Number(activeVariant.addon || 0)
    : activeModelObj
      ? Number(activeModelObj.addon || 0)
      : 0;
  const dpPct = Math.min(100, Math.max(0, Number(product.dpPct ?? product.minDpPercent ?? 50)));
  const brand = (brands || []).find(
    (b) => String(b.name || '').toLowerCase() === String(product.brand || '').toLowerCase()
  );
  const feeNominal = feeNominalFor(brand, mitraLevel, currentPrice);
  const brandDiscountNominal = brandDiscountNominalFor(brand, currentPrice);
  const feeCompanyNominal = Math.max(0, brandDiscountNominal - feeNominal);
  const netPrice = Math.max(0, num(currentPrice) - feeNominal);

  const handleActionClick = (actionType) => {
    const itemData = {
      id: product.id,
      variantId: activeVariant?.id ?? null,
      title: product.title,
      brand: product.brand,
      image: selectedImage,
      selectedModel,
      selectedSize,
      selectedColor,
      qty,
      price: netPrice,
      basePrice: num(currentPrice),
      discountPct: 0,
      discountNominal: feeNominal,
      feeNominal,
      feeMitraNominal: feeNominal * qty,
      brandDiscountNominal: brandDiscountNominal * qty,
      feeCompanyNominal: feeCompanyNominal * qty,
      addon: currentAddon,
      addonTotal: currentAddon * qty,
      totalPrice: netPrice * qty,
      dpPct,
      pelunasanDueDate: product.pelunasanDueDate || '',
      closeDate: product.tutupPO || '',
      tutupPO: product.tutupPO,
      estimatedShipment: product.estimatedShipment
    };

    if (actionType === 'cart') {
      onAddToCart(itemData);
    } else {
      onBuyNow(itemData);
    }
  };

  const descriptionText = product.description || product.descriptionDetailed?.summary || '';

  const store = product.store || {
    name: 'afatharshop',
    badge: 'Official',
    city: 'KOTA BOGOR',
    productsCount: 1203,
    processTime: '± 1-2 hari'
  };

  return (
    <div className="w-full px-4 py-4 space-y-5">
      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* Breadcrumb Navigation (Matches Screenshot 1) */}
        <div className="flex items-center gap-1.5 text-xs text-stone-500 flex-wrap">
          <button
            onClick={onNavigateHome}
            className="hover:text-[#6B1416] font-medium transition cursor-pointer"
          >
            Beranda
          </button>
          <ChevronRightIcon className="w-3 h-3 text-stone-400" />
          <span className="hover:text-[#6B1416] cursor-pointer">
            {product.category || 'Koleksi Sarimbit'}
          </span>
          <ChevronRightIcon className="w-3 h-3 text-stone-400" />
          <span className="text-stone-800 font-bold uppercase truncate max-w-xs">
            {product.title}
          </span>
        </div>

        {/* Main Product Card Container */}
        <div className="bg-white rounded-2xl shadow-xs border border-orange-100/70 p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: Gallery & Store Card (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Main Image View */}
              <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-xs">
                <img
                  src={selectedImage}
                  alt={product.title}
                  className="w-full h-full object-cover object-top transition duration-300"
                />

                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10">
                  <span className="bg-[#1C3D26] text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    OPEN PRE-ORDER
                  </span>
                  {product.isSale && (
                    <span className="bg-[#8B1E21] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                      SALE PO {product.discountPercent}%
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails Row */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {(product.thumbnails || [product.image]).map((thumb, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(thumb)}
                    className={`w-16 h-20 rounded-xl overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                      selectedImage === thumb
                        ? 'border-[#C27E43] ring-1 ring-[#C27E43]'
                        : 'border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <img
                      src={thumb}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Download Catalog PDF Button (Matches Screenshot 1) */}
              <button
                onClick={() =>
                  alert('Mempersiapkan materi promosi HD dan panduan PO untuk mitra...')
                }
                className="w-full py-2.5 px-4 rounded-xl bg-[#2D1B36] hover:bg-[#3E244B] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <span>☁</span>
                <span>Download Gambar Katalog & Panduan PO</span>
              </button>

              {/* Store Profile Card (Matches Screenshot 1) */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-white border border-[#F0C973] flex items-center justify-center shadow-xs shrink-0">
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs text-stone-900">{store.name}</h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                        {store.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                      <span>📍</span>
                      <span>{store.city}</span>
                    </p>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      Produk: <strong>{store.productsCount}</strong> • Proses: <strong>{store.processTime}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={onNavigateHome}
                  className="text-[11px] font-semibold text-amber-900 border border-amber-300 bg-white hover:bg-amber-50 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap shadow-xs"
                >
                  🏪 Kunjungi Toko
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: Product Info & Order Panel (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Header Titles */}
              <div>
                <p className="text-[#C27E43] text-[11px] font-bold tracking-wider uppercase mb-1">
                  {product.series || 'OFFICIAL EXCLUSIVE COLLECTION • 2027 SERIES'}
                </p>
                <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-stone-900 tracking-tight leading-snug">
                  {product.title}
                </h1>
                <p className="text-xs text-stone-500 mt-1">
                  SKU: <span className="font-medium text-stone-700">{product.sku || product.title}</span>
                </p>
              </div>

              {/* Pricing Box: harga mengikuti model/warna/ukuran & qty terpilih */}
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-bold text-red-600">{formatRupiah(netPrice)}</span>
                  {feeNominal > 0 && (
                    <span className="text-sm text-stone-400 line-through">
                      {formatRupiah(num(currentPrice))}
                    </span>
                  )}
                  {currentAddon > 0 && (
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      + Tambahan {formatRupiah(currentAddon)} / pcs
                    </span>
                  )}
                  {product.originalPrice && (
                    <span className="text-sm text-stone-400 line-through">
                      {formatRupiah(product.originalPrice)}
                    </span>
                  )}
                  {product.discountPercent > 0 && (
                    <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-md">
                      Hemat s/d {product.discountPercent}%
                    </span>
                  )}
                </div>
                {feeNominal > 0 && (
                  <p className="text-[11px] font-semibold text-emerald-700">
                    Fee mitra {mitraLevel} −{formatRupiah(feeNominal)} / pcs sudah dipotong
                  </p>
                )}
                <p className="text-[11px] text-stone-500">
                  Harga {activeVariant ? 'varian' : 'model'} terpilih
                  {qty > 1 && (
                    <>
                      {' · '}
                      {qty} pcs ={' '}
                      <strong className="text-stone-800">
                        {formatRupiah((netPrice + currentAddon) * qty)}
                      </strong>
                    </>
                  )}
                </p>
              </div>

              {/* Informasi Pemesanan Card (Matches Screenshot 1) */}
              <div className="bg-[#FFF8F3] border border-[#FBE5D8] rounded-xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-800">
                    <span className="text-amber-700">🕒</span>
                    <span>
                      Tutup PO : <strong className="text-red-700">{product.tutupPODetail || product.tutupPO}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-800">
                    <span className="text-amber-700">📅</span>
                    <span>
                      ESTIMASI SIAP KIRIM : <strong className="text-stone-900">{product.estimatedShipment}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Variasi Model Busana (Matches Screenshot 1 & 2) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800">
                    PILIH VARIASI MODEL
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Tersedia {product.models?.length || 10} Model Busana
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(product.models || []).map((m) => (
                    <button
                      key={m.name}
                      onClick={() => setSelectedModel(m.name)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer font-medium text-left ${
                        selectedModel === m.name
                          ? 'bg-white border-stone-800 ring-2 ring-stone-800 text-stone-900 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      <span className="block">{m.name}</span>
                      {m.price != null && (
                        <span className="block text-[10px] font-semibold text-stone-500 mt-0.5">
                          {formatRupiah(m.price)}
                          {Number(m.addon) > 0 ? ` · +${formatRupiah(Number(m.addon))}` : ''}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ukuran (Size) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-800">
                  UKURAN (SIZE)
                </label>
                <div className="flex flex-wrap gap-2">
                  {(product.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3L']).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`text-xs w-11 h-9 rounded-lg border flex items-center justify-center transition cursor-pointer font-bold ${
                        selectedSize === s
                          ? 'bg-white border-stone-800 ring-2 ring-stone-800 text-stone-900 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warna Pilihan (With Color Dots) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-800">
                  WARNA PILIHAN: <span className="font-normal text-stone-600">{selectedColor}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(product.colors || []).map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-2 transition cursor-pointer font-medium ${
                        selectedColor === c.name
                          ? 'bg-white border-stone-800 ring-2 ring-stone-800 text-stone-900 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Kuantitas & Sisa Kuota */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-stone-800">KUANTITAS</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-white shadow-xs">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 text-xs font-bold text-stone-900 min-w-[40px] text-center">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700">
                    Sisa Kuota PO: Tersedia {product.stockQuota || 48} pcs lagi
                  </span>
                </div>
              </div>

              {/* Action Buttons: Beli Sekarang & + Keranjang (Matches Screenshot 1 & 2) */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  onClick={() => handleActionClick('buy_now')}
                  className="flex-1 py-3 px-6 rounded-xl bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <span>⚡</span>
                  <span>Beli Sekarang</span>
                </button>

                <button
                  onClick={() => handleActionClick('cart')}
                  className="flex-1 py-3 px-6 rounded-xl bg-white hover:bg-stone-50 border border-[#6B1416] text-[#6B1416] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <CartIcon className="w-4 h-4 text-[#6B1416]" />
                  <span>+ Keranjang</span>
                </button>

                <button
                  onClick={() => setIsWishlist(!isWishlist)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    isWishlist
                      ? 'bg-rose-50 border-rose-300 text-rose-600'
                      : 'bg-white border-stone-300 text-stone-400 hover:text-stone-700'
                  }`}
                  title="Simpan ke Wishlist"
                >
                  <span className="text-base">{isWishlist ? '♥' : '♡'}</span>
                </button>
              </div>

              {/* Value Propositions Strip */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-stone-100 text-[11px] text-stone-600 text-center">
                <div className="flex items-center justify-center gap-1">
                  <span>🛡️</span>
                  <span>100% Produk Original</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span>🚚</span>
                  <span>Ekspedisi Resmi & Aman</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span>💎</span>
                  <span>Material Premium Silk</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* BOTTOM SECTION: Deskripsi Produk (Matches Screenshot 1 & 2) */}
        <div className="bg-white rounded-2xl shadow-xs border border-orange-100/70 p-5 sm:p-7 space-y-5">
          
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <span className="text-[#6B1416] font-bold text-base">📑</span>
            <h2 className="font-bold text-base sm:text-lg text-stone-900">
              Deskripsi Produk
            </h2>
          </div>

          {/* Deskripsi dari admin */}
          <div className="bg-[#FFF8F3] border border-[#FBE5D8] rounded-xl p-4 flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-[#6B1416] text-[#F0C973] flex items-center justify-center text-xs shrink-0 mt-0.5">
              ✦
            </span>
            <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-medium whitespace-pre-line">
              {descriptionText}
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
