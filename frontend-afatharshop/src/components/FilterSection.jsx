import React, { useState } from 'react';
import { FilterIcon, SearchIcon, ChevronDownIcon, CheckIcon, XIcon, ReloadIcon } from './Icons';

export default function FilterSection({
  brands,
  selectedBrand,
  onSelectBrand,
  brandSearchInput,
  setBrandSearchInput,
  onApplyBrandSearch,
  itemsPerPage,
  setItemsPerPage,
  sortBy,
  setSortBy,
  onResetFilter
}) {
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isItemsPerPageOpen, setIsItemsPerPageOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const selectedBrandObj = brands.find((b) => b.id === selectedBrand) || brands[0];
  const isFiltered = selectedBrand !== 'all';

  return (
    <section className="w-full px-4 pt-4 pb-2">
      <div className="max-w-7xl mx-auto space-y-3">
        
        {/* Main Filter Bar Card */}
        <div className="bg-white rounded-xl shadow-xs border border-orange-100/70 p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Filter Brand Label & Dropdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-stone-700 font-medium text-xs sm:text-sm">
              <FilterIcon className="w-4 h-4 text-[#C27E43]" />
              <span>Filter Brand:</span>
            </div>

            {/* Brand Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                className="bg-white hover:bg-stone-50 border border-stone-200/80 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium text-stone-800 flex items-center gap-2 shadow-xs cursor-pointer transition min-w-[150px] sm:min-w-[180px] justify-between"
              >
                <span className="truncate">
                  {selectedBrand === 'all' ? 'Semua Brand' : `${selectedBrandObj.name} 1 Terpilih`}
                </span>
                <ChevronDownIcon className={`w-3.5 h-3.5 text-stone-500 transition-transform ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Brand Options Dropdown Menu (Matches Screenshot 2) */}
              {isBrandDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {brands.map((brand) => {
                    const isSelected = selectedBrand === brand.id;
                    return (
                      <button
                        key={brand.id}
                        onClick={() => {
                          onSelectBrand(brand.id);
                          setIsBrandDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 text-xs flex items-center justify-between hover:bg-orange-50/70 transition text-left cursor-pointer ${
                          isSelected ? 'font-semibold text-[#6B1416] bg-orange-50/40' : 'text-stone-700'
                        }`}
                      >
                        <span className="truncate">{brand.name}</span>
                        <div className="flex items-center gap-1.5">
                          {brand.id !== 'all' && (
                            <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                              {brand.count} Produk
                            </span>
                          )}
                          {isSelected && <CheckIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                  <div className="border-t border-stone-100 mt-1 pt-1.5 px-3.5 pb-1">
                    <button
                      onClick={() => {
                        onSelectBrand('all');
                        setIsBrandDropdownOpen(false);
                      }}
                      className="text-stone-600 hover:text-[#6B1416] text-[11px] font-medium flex items-center justify-between w-full cursor-pointer"
                    >
                      <span>Lihat Semua Katalog Brand</span>
                      <span>&gt;</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Brand Search & Terapkan Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60 md:w-72">
              <input
                type="text"
                placeholder={isFiltered ? `Cari di ${selectedBrandObj.name}...` : "Cari brand..."}
                value={brandSearchInput}
                onChange={(e) => setBrandSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onApplyBrandSearch()}
                className="w-full bg-stone-50/70 border border-stone-200 text-stone-800 placeholder-stone-400 text-xs px-3 py-1.5 pl-8 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#F0C973] focus:bg-white transition"
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                <SearchIcon className="w-3.5 h-3.5" />
              </div>
            </div>

            <button
              onClick={onApplyBrandSearch}
              className="bg-[#F0C973] hover:bg-[#E5BC64] text-[#420C0E] font-bold text-xs px-4 py-1.5 rounded-lg shadow-xs transition cursor-pointer shrink-0"
            >
              Terapkan
            </button>
          </div>

        </div>

        {/* Sub-bar: Active Tag & Sorting (Matches Screenshot 3) */}
        {isFiltered && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            
            {/* Left: Reset and Active Brand Tag (WHITE badge as instructed!) */}
            <div className="flex items-center gap-2">
              <button
                onClick={onResetFilter}
                className="flex items-center gap-1.5 text-stone-600 hover:text-[#6B1416] text-xs font-semibold px-2 py-1 cursor-pointer transition"
                title="Reset Filter"
              >
                <ReloadIcon className="w-3.5 h-3.5 text-stone-500" />
                <span>Reset</span>
              </button>

              {/* Active Filter Tag - Converted from Black to WHITE with clean border */}
              <div className="inline-flex items-center gap-2 bg-white text-stone-800 border border-stone-300/80 shadow-xs px-3 py-1 rounded-md text-xs font-medium">
                <span>Brand: <strong className="font-semibold text-[#6B1416]">{selectedBrandObj.name}</strong></span>
                <button
                  onClick={onResetFilter}
                  className="hover:text-red-600 text-stone-400 p-0.5 rounded cursor-pointer transition"
                  title="Hapus filter"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right: Jumlah Produk & Urutan Dropdowns */}
            <div className="flex items-center gap-3 text-xs">
              
              {/* Jumlah Produk */}
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 hidden sm:inline">Jumlah Produk:</span>
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsItemsPerPageOpen(!isItemsPerPageOpen);
                      setIsSortOpen(false);
                    }}
                    className="bg-white hover:bg-stone-50 border border-stone-200/90 rounded-md px-2.5 py-1 text-xs font-medium text-stone-800 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>{itemsPerPage}</span>
                    <ChevronDownIcon className="w-3 h-3 text-stone-500" />
                  </button>

                  {isItemsPerPageOpen && (
                    <div className="absolute right-0 mt-1 w-24 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-50">
                      {[20, 40, 60].map((num) => (
                        <button
                          key={num}
                          onClick={() => {
                            setItemsPerPage(num);
                            setIsItemsPerPageOpen(false);
                          }}
                          className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-orange-50 cursor-pointer ${
                            itemsPerPage === num ? 'font-bold text-[#6B1416] bg-amber-50/60' : 'text-stone-700'
                          }`}
                        >
                          <span>{num}</span>
                          {itemsPerPage === num && <CheckIcon className="w-3 h-3 text-amber-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Urutan Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 hidden sm:inline">Urutan:</span>
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsSortOpen(!isSortOpen);
                      setIsItemsPerPageOpen(false);
                    }}
                    className="bg-white hover:bg-stone-50 border border-stone-200/90 rounded-md px-3 py-1 text-xs font-medium text-stone-800 flex items-center gap-1.5 shadow-xs cursor-pointer min-w-[130px] justify-between"
                  >
                    <span className="truncate">{sortBy}</span>
                    <ChevronDownIcon className="w-3 h-3 text-stone-500 shrink-0" />
                  </button>

                  {isSortOpen && (
                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-50">
                      {['Harga Tertinggi', 'Harga Terendah', 'Tutup PO Terdekat', 'Diskon Terbesar'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setSortBy(opt);
                            setIsSortOpen(false);
                          }}
                          className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-orange-50 cursor-pointer ${
                            sortBy === opt ? 'font-bold text-[#6B1416] bg-amber-50/60' : 'text-stone-700'
                          }`}
                        >
                          <span>{opt}</span>
                          {sortBy === opt && <CheckIcon className="w-3 h-3 text-amber-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </section>
  );
}
