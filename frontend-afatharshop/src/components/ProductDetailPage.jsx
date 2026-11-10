import React, { useState } from 'react';
import {
  ChevronRightIcon,
  ClockIcon,
  ShieldCheckIcon,
  CartIcon
} from './Icons';
import { brandDiscountNominalFor, feeNominalFor, num } from './dashboard/poCore';
import { dpPercentFor } from '../utils/terminScheme';

export default function ProductDetailPage({
  product,
  onNavigateHome,
  onAddToCart,
  onBuyNow,
  isLoggedIn,
  brands = [],
  mitraLevel = '',
  isWishlist: isWishlistProp,
  onToggleWishlist
}) {
  if (!product) return null;

  // Selected variations
  const [selectedImage, setSelectedImage] = useState(
    product.thumbnails?.[0] || product.image
  );
  const [isVideoActive, setIsVideoActive] = useState(false);
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

  const isItemWishlisted = typeof isWishlistProp === 'boolean' ? isWishlistProp : isWishlist;

  const isProductClosedPO =
    product.status === 'closed_po' ||
    product.status === 'closed' ||
    product.isClosedPO === true;

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
  const variantSellingPrice =
    activeVariant?.sellingPrice ||
    activeVariant?.selling_price ||
    activeVariant?.originalPrice ||
    activeVariant?.original_price ||
    activeVariant?.price;
  const sellingPrice =
    variantSellingPrice != null && variantSellingPrice !== '' && Number.isFinite(Number(variantSellingPrice))
      ? Number(variantSellingPrice)
      : activeModelObj
        ? activeModelObj.price
        : (product.sellingPrice || product.originalPrice || product.price);
  const currentPrice = sellingPrice;

  // 1. Cek apakah ada Promo Sale (admin upload)
  const isSaleActive = Boolean(product.isSale || (product.discountPercent && num(product.discountPercent) > 0));
  const saleDiscountPct = isSaleActive ? num(product.discountPercent) : 0;
  const saleDiscountNominal = saleDiscountPct > 0 ? Math.round((num(sellingPrice) * saleDiscountPct) / 100) : 0;
  const priceAfterSale = Math.max(0, num(sellingPrice) - saleDiscountNominal);

  // 2. Lalu dikurangi kembali Fee mitra per Level
  // Gunakan userPrice dari server jika ada agar 100% sinkron dengan kartu etalase/katalog
  const currentAddon = activeVariant
    ? Number(activeVariant.addon || 0)
    : activeModelObj
      ? Number(activeModelObj.addon || 0)
      : 0;
  const dpPct = dpPercentFor(product);
  const brand = (brands || []).find(
    (b) => String(b.name || '').toLowerCase() === String(product.brand || '').toLowerCase()
  );

  let netPrice = 0;
  let feeNominal = 0;

  if (!isLoggedIn) {
    // Publik / sebelum login: harga normal, atau harga sale (jika promo aktif), TANPA potongan fee mitra
    netPrice = priceAfterSale;
    feeNominal = 0;
  } else if (activeVariant?.userPrice != null && Number.isFinite(Number(activeVariant.userPrice))) {
    netPrice = Number(activeVariant.userPrice);
    feeNominal = Math.max(0, priceAfterSale - netPrice);
  } else if (product.userPrice != null && Number.isFinite(Number(product.userPrice)) && !activeVariant) {
    netPrice = Number(product.userPrice);
    feeNominal = Math.max(0, priceAfterSale - netPrice);
  } else {
    feeNominal = feeNominalFor(brand, mitraLevel, priceAfterSale > 0 ? priceAfterSale : sellingPrice);
    netPrice = Math.max(0, priceAfterSale - feeNominal);
  }

  const brandDiscountNominal = brandDiscountNominalFor(brand, priceAfterSale > 0 ? priceAfterSale : sellingPrice);
  const feeCompanyNominal = Math.max(0, brandDiscountNominal - feeNominal);

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
      basePrice: num(sellingPrice),
      discountPct: saleDiscountPct,
      discountNominal: (num(sellingPrice) - netPrice),
      feeNominal,
      feeMitraNominal: feeNominal * qty,
      brandDiscountNominal: brandDiscountNominal * qty,
      feeCompanyNominal: feeCompanyNominal * qty,
      addon: currentAddon,
      addonTotal: currentAddon * qty,
      totalPrice: (netPrice + currentAddon) * qty,
      dpPct,
      paymentStages: product.paymentStages || null,
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
    name: 'Afatharshop',
    badge: 'Official',
    city: 'Bekasi, Jawa Barat',
    processTime: 'Sesuai Timeline PO',
  };

  return (
    <div className="w-full px-4 py-4 space-y-5">
      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* Breadcrumb Navigation */}
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
              
              {/* Main Image / Video View */}
              <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-xs">
                {isVideoActive && (product.videoUrl || product.reelUrl) ? (
                  <video
                    src={product.videoUrl || product.reelUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <img
                    src={selectedImage}
                    alt={product.title}
                    className="w-full h-full object-cover object-top transition duration-300"
                  />
                )}

                {/* Top Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10">
                  <span className={`${isProductClosedPO ? 'bg-stone-700' : 'bg-[#1C3D26]'} text-white text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md`}>
                    {!isProductClosedPO && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
                    {isProductClosedPO ? 'PRE-ORDER DITUTUP' : 'OPEN PRE-ORDER'}
                  </span>
                  {product.isSale && !isProductClosedPO && (
                    <span className="bg-[#8B1E21] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                      SALE PO {product.discountPercent}%
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails & Video Row */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {/* Tombol Video jika ada */}
                {(product.videoUrl || product.reelUrl) && (
                  <button
                    type="button"
                    onClick={() => setIsVideoActive(true)}
                    className={`w-16 h-20 rounded-xl overflow-hidden border-2 transition shrink-0 cursor-pointer flex flex-col items-center justify-center bg-stone-900 text-white relative ${
                      isVideoActive
                        ? 'border-amber-500 ring-2 ring-amber-400'
                        : 'border-stone-300 hover:border-amber-400'
                    }`}
                    title="Tonton Video Produk"
                  >
                    <span className="text-xl">▶</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider mt-1 text-amber-300">Video</span>
                  </button>
                )}

                {/* Foto Thumbnails */}
                {(product.thumbnails || [product.image]).map((thumb, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsVideoActive(false);
                      setSelectedImage(thumb);
                    }}
                    className={`w-16 h-20 rounded-xl overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                      !isVideoActive && selectedImage === thumb
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

              {/* Download Catalog PDF Button */}
              <button
                onClick={() =>
                  alert('Mempersiapkan materi promosi HD dan panduan PO untuk mitra...')
                }
                className="w-full py-2.5 px-4 rounded-xl bg-[#2D1B36] hover:bg-[#3E244B] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <span>☁</span>
                <span>Download Gambar Katalog & Panduan PO</span>
              </button>

              {/* Store Profile Card */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-white border border-[#F0C973] flex items-center justify-center shadow-xs shrink-0">
                    <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs text-stone-900">{store.name || 'Afatharshop'}</h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                        Distributor Resmi
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-600 flex items-center gap-1 mt-0.5 font-medium">
                      <span>Distributor Resmi & Kota Bekasi</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={onNavigateHome}
                  className="text-[11px] font-semibold text-amber-900 border border-amber-300 bg-white hover:bg-amber-50 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap shadow-xs"
                >
                  🛍️ Katalog Lain
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
                  
                  {/* Harga di coret seharusnya harga jual perproduk yang dipilih */}
                  {num(sellingPrice) > netPrice && (
                    <span className="text-sm text-stone-400 line-through">
                      {formatRupiah(sellingPrice)}
                    </span>
                  )}

                  {/* Jika ada sale, tampilkan hemat 5/10% tergantung yang admin upload */}
                  {isSaleActive && saleDiscountPct > 0 && (
                    <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-md">
                      Hemat {saleDiscountPct}%
                    </span>
                  )}

                  {currentAddon > 0 && (
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      + Tambahan {formatRupiah(currentAddon)} / pcs
                    </span>
                  )}
                </div>

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

              {/* Informasi Pemesanan Card */}
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
                      ESTIMASI SIAP KIRIM : <strong className="text-stone-900">
                        {product.estimatedShipment && !product.estimatedShipment.includes('1970') && product.estimatedShipment !== '-'
                          ? product.estimatedShipment
                          : '14 Hari setelah Tutup PO'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Variasi Model Busana */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800">
                    PILIH VARIASI MODEL
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Tersedia {product.models?.length || 1} Model Busana
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(product.models || []).map((m) => (
                    <button
                      key={m.name}
                      onClick={() => setSelectedModel(m.name)}
                      className={`text-xs px-3.5 py-2 rounded-lg border transition cursor-pointer font-medium text-left ${
                        selectedModel === m.name
                          ? 'bg-white border-stone-800 ring-2 ring-stone-800 text-stone-900 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      <span>{m.name}</span>
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
                  PILIHAN WARNA : <span className="font-normal text-stone-600">{selectedColor}</span>
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

              {/* Action Buttons: Beli Sekarang & + Keranjang (Jika PO ditutup, tombol pesan dinonaktifkan) */}
              {isProductClosedPO ? (
                <div className="pt-3">
                  <div className="p-4 bg-stone-100 border border-stone-300 rounded-2xl text-center text-xs text-stone-600 font-bold flex items-center justify-center gap-2">
                    <span>🔒</span>
                    <span>Pre-Order Telah Ditutup &mdash; Batch PO ini tidak lagi menerima pesanan baru.</span>
                  </div>
                </div>
              ) : (
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
                    type="button"
                    onClick={() => {
                      if (onToggleWishlist) {
                        onToggleWishlist(product);
                      } else {
                        setIsWishlist(!isWishlist);
                      }
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isItemWishlisted
                        ? 'bg-rose-50 border-rose-300 text-rose-600'
                        : 'bg-white border-stone-300 text-stone-400 hover:text-stone-700'
                    }`}
                    title={isItemWishlisted ? 'Hapus dari Wishlist' : 'Simpan ke Wishlist'}
                  >
                    <span className="text-base">{isItemWishlisted ? '♥' : '♡'}</span>
                  </button>
                </div>
              )}

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
                  <span>Kualitas Terjamin</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* BOTTOM SECTION: Deskripsi & Bahan Produk */}
        <div className="bg-white rounded-2xl shadow-xs border border-orange-100/70 p-5 sm:p-7 space-y-5">
          
          {/* Bahan / Material (Sinkron dari Admin Katalog Produk) */}
          {(product.material || product.materialDetail || product.material_detail || product.descriptionDetailed?.materialGamis) && (
            <div className="bg-[#FFF8F3] border border-[#FBE5D8] rounded-xl p-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#6B1416] text-[#F0C973] flex items-center justify-center text-sm shrink-0 font-bold">
                🧵
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                  Bahan / Material
                </span>
                <p className="text-xs sm:text-sm font-semibold text-stone-900 mt-0.5">
                  {product.material || product.materialDetail || product.material_detail || product.descriptionDetailed?.materialGamis}
                </p>
              </div>
            </div>
          )}

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
