import React from 'react';
import { StarIcon } from './Icons';
import ProductCard from './ProductCard';

export default function SaleSection({
  products,
  selectedBrand,
  onSelectProduct,
  onViewAllSale
}) {
  const saleProducts = products.filter((p) => p.isSale);

  if (saleProducts.length === 0) return null;

  const isFiltered = selectedBrand !== 'all';
  const brandName = saleProducts[0]?.brand || 'Coverme Hijab';

  return (
    <section className="w-full px-4 py-4">
      <div className="max-w-7xl mx-auto space-y-3.5">
        
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-red-600 flex items-center">
              <StarIcon className="w-5 h-5 text-red-600 fill-red-600" />
            </span>
            <h2 className="font-bold text-base sm:text-lg lg:text-xl text-stone-900 tracking-tight">
              {isFiltered ? `Sale Brand: ${brandName}` : 'Sale'}
            </h2>
            {isFiltered && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase">
                Diskon s/d 15%
              </span>
            )}
          </div>

          <button
            onClick={onViewAllSale}
            className="text-stone-700 hover:text-[#6B1416] text-xs sm:text-sm font-medium flex items-center gap-1 cursor-pointer transition hover:translate-x-0.5"
          >
            <span>Lihat Semua</span>
            <span>&gt;</span>
          </button>
        </div>

        {/* 4 Cards Grid (Matches Reference Layout) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {saleProducts.slice(0, 4).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
