import React from 'react';

const INDO_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const cleanOverlayText = (text) => {
  if (!text) return '';
  const str = String(text);
  const match = str.match(/(\d{4})-(\d{2})-(\d{2})(?:[T\s]([\d:]+))?/);
  if (match) {
    const [, y, m, d] = match;
    const mIdx = Number(m) - 1;
    const dateFormatted = `${Number(d)} ${INDO_MONTH_NAMES[mIdx] || m} ${y}`;
    return str.replace(/(\d{4})-(\d{2})-(\d{2})(?:[T\s][\d:+]+)?/, dateFormatted);
  }
  return str;
};

export default function ProductCard({
  product,
  onSelectProduct,
  onQuickAdd,
  isWishlisted = false,
  onToggleWishlist
}) {
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val).replace('IDR', 'Rp');
  };

  const overlay = cleanOverlayText(product.overlayText);
  const isClosed = product.status === 'closed_po' || product.status === 'closed' || product.isClosedPO === true;

  return (
    <div
      onClick={() => onSelectProduct(product)}
      className="group bg-white rounded-xl overflow-hidden shadow-xs hover:shadow-lg border border-orange-100/60 transition-all duration-200 flex flex-col cursor-pointer hover:-translate-y-0.5 relative"
    >
      {/* Product Image & Badges Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Wishlist Heart Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleWishlist) onToggleWishlist(product);
          }}
          className={`absolute top-2 right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center transition shadow-xs cursor-pointer ${
            isWishlisted
              ? 'bg-rose-50 text-rose-600'
              : 'bg-white/80 hover:bg-white text-stone-400 hover:text-stone-700'
          }`}
          title={isWishlisted ? 'Hapus dari Wishlist' : 'Simpan ke Wishlist'}
        >
          <span className="text-xs leading-none">{isWishlisted ? '♥' : '♡'}</span>
        </button>

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10">
          {/* Status Badge */}
          {!isClosed && product.status === 'pre_order' && (
            <span className="bg-white/95 text-stone-800 text-[10px] font-semibold px-2 py-0.5 rounded shadow-xs border border-stone-200/50 backdrop-blur-xs">
              Pre Order
            </span>
          )}
          {isClosed && (
            <span className="bg-slate-700/95 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-xs backdrop-blur-xs">
              Closed PO
            </span>
          )}

          {/* Sale Badge */}
          {product.isSale && (
            <span className="ml-auto bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
              SALE {product.discountPercent}%
            </span>
          )}
        </div>

        {/* Bottom Image Overlay Banner */}
        {overlay && (
          <div className="absolute bottom-0 inset-x-0 z-10">
            {isClosed ? (
              <div className="bg-white/95 text-stone-700 border-t border-stone-200 text-[10px] font-bold py-1 px-2 text-center backdrop-blur-xs">
                {overlay}
              </div>
            ) : (
              <div className="bg-white/95 text-[#6B1416] border-t border-stone-200 text-[10px] font-semibold py-1 px-2 text-center backdrop-blur-xs shadow-xs">
                {overlay}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Info Body */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand Name */}
          <p className="text-[10px] font-bold tracking-wider text-stone-400 uppercase truncate">
            {product.brand}
          </p>

          {/* Title */}
          <h3 className="text-xs sm:text-sm font-semibold text-stone-900 group-hover:text-[#6B1416] transition line-clamp-2 mt-0.5 leading-snug">
            {product.title}
          </h3>

          {/* Subtitle / Spec Note if available */}
          {product.subtitle && (
            <p className="text-[11px] text-stone-500 font-medium mt-1 truncate">
              {product.subtitle}
            </p>
          )}
        </div>

        {/* Pricing */}
        <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-red-600 font-bold text-xs sm:text-sm">
            {formatRupiah(product.price)}
          </span>
          {(() => {
            const strikethroughPrice = product.originalPrice && product.originalPrice > product.price
              ? product.originalPrice
              : (product.sellingPrice && product.sellingPrice > product.price ? product.sellingPrice : null);
            if (!strikethroughPrice) return null;
            return (
              <span className="text-stone-400 line-through text-[10px] sm:text-[11px]">
                {formatRupiah(strikethroughPrice)}
              </span>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
