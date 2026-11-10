import React from 'react';
import ProductCard from './ProductCard';

export default function PreOrderSection({
  products,
  selectedBrand,
  onSelectProduct,
  onViewAllPreOrder,
  onLoadMore,
  wishlistProductIds = [],
  onToggleWishlist
}) {
  const isFiltered = selectedBrand !== 'all';
  const brandName = products[0]?.brand || 'Coverme Hijab';

  return (
    <section className="w-full px-4 py-4">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-base sm:text-lg lg:text-xl text-stone-900 tracking-tight">
              {isFiltered ? `Koleksi Brand: ${brandName}` : 'Pre Order'}
            </h2>
            {isFiltered && (
              <span className="bg-[#F0C973] text-[#4A1012] text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">
                (Ditemukan {products.length} Produk)
              </span>
            )}
          </div>

          <button
            onClick={onViewAllPreOrder}
            className="text-stone-700 hover:text-[#6B1416] text-xs sm:text-sm font-medium flex items-center gap-1 cursor-pointer transition hover:translate-x-0.5"
          >
            <span>Lihat Semua</span>
            <span>&gt;</span>
          </button>
        </div>

        {/* 5 Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {products.slice(0, 5).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelectProduct={onSelectProduct}
              isWishlisted={wishlistProductIds.includes(Number(product.id))}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>

        {/* Produk Lainnya Button (WHITE as instructed) */}
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            className="bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs sm:text-sm px-8 py-2.5 rounded-lg border border-stone-200 shadow-xs hover:shadow transition duration-150 cursor-pointer"
          >
            Produk Lainnya
          </button>
        </div>

      </div>
    </section>
  );
}
