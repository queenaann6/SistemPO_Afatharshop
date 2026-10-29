import React from 'react';

export default function ProductCard({ product, onSelectProduct, onQuickAdd }) {
  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val).replace('IDR', 'Rp');
  };

  return (
    <div
      onClick={() => onSelectProduct(product)}
      className="group bg-white rounded-xl overflow-hidden shadow-xs hover:shadow-lg border border-orange-100/60 transition-all duration-200 flex flex-col cursor-pointer hover:-translate-y-0.5"
    >
      {/* Product Image & Badges Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none z-10">
          {/* Status Badge */}
          {product.status === 'pre_order' && (
            <span className="bg-white/95 text-stone-800 text-[10px] font-semibold px-2 py-0.5 rounded shadow-xs border border-stone-200/50 backdrop-blur-xs">
              Pre Order
            </span>
          )}
          {product.status === 'closed_po' && (
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
        {product.overlayText && (
          <div className="absolute bottom-0 inset-x-0 z-10">
            {product.status === 'closed_po' ? (
              <div className="bg-white/95 text-stone-700 border-t border-stone-200 text-[10px] font-bold py-1 px-2 text-center backdrop-blur-xs">
                {product.overlayText}
              </div>
            ) : (
              <div className="bg-white/95 text-[#6B1416] border-t border-stone-200 text-[10px] font-semibold py-1 px-2 text-center backdrop-blur-xs shadow-xs">
                {product.overlayText}
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
          {product.isSale && product.originalPrice > product.price && (
            <span className="text-stone-400 line-through text-[10px] sm:text-[11px]">
              {formatRupiah(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
