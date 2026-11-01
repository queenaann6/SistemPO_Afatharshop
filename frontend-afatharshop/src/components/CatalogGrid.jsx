import React from 'react';
import ProductCard from './ProductCard';
import { ChevronRightIcon } from './Icons';

export default function CatalogGrid({
  products,
  selectedBrand,
  onSelectProduct,
  statusFilter,
  setStatusFilter,
  onNavigateHome,
  selectedCategory,
  onSelectCategory,
  categories
}) {
  const brandName = selectedBrand !== 'all' ? (products[0]?.brand || 'Brand Pilihan') : 'Afathar Shop';

  const filteredProducts = products.filter((p) => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  return (
    <div className="w-full px-4 py-4 space-y-4" id="katalog-page">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <button
            onClick={onNavigateHome}
            className="hover:text-[#6B1416] font-medium transition cursor-pointer flex items-center gap-1"
          >
            Beranda
          </button>
          <ChevronRightIcon className="w-3 h-3 text-stone-400" />
          <span className="text-stone-800 font-semibold">Katalog Produk</span>
          {selectedCategory && (
            <>
              <ChevronRightIcon className="w-3 h-3 text-stone-400" />
              <span className="text-[#6B1416] font-bold">{selectedCategory}</span>
            </>
          )}
        </div>

        {/* Catalog Header Bar (Matches Screenshot 4) */}
        <div className="bg-white rounded-xl shadow-xs border border-orange-100/70 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          
          {/* Title & Count Badge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h2 className="font-bold text-sm sm:text-base text-stone-900">
              Katalog Produk {brandName}
            </h2>
            <span className="text-[11px] bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-full font-medium">
              Menampilkan {filteredProducts.length} Produk
            </span>
          </div>

          {/* Quick Status Filter Tabs */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Semua PO
              </button>
              <button
                onClick={() => setStatusFilter('pre_order')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  statusFilter === 'pre_order' ? 'bg-[#F0C973] text-[#4A1012] font-bold shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                • PO Aktif
              </button>
              <button
                onClick={() => setStatusFilter('closed_po')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  statusFilter === 'closed_po' ? 'bg-slate-700 text-white font-semibold shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                PO Ditutup
              </button>
            </div>
          </div>

        </div>

        {/* 5-Column Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-stone-200">
            <p className="text-stone-500 text-sm">Tidak ada produk yang sesuai dengan filter ini.</p>
            <button
              onClick={() => {
                setStatusFilter('all');
              }}
              className="mt-3 text-xs font-semibold text-[#6B1416] underline cursor-pointer"
            >
              Lihat semua status produk & reset filter
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
