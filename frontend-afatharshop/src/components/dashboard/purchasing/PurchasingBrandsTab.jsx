import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  PageHead,
  TD,
  TH,
  TableWrap,
  brandDiscountTypeFor,
  brandDiscountValueFor,
  feeTypeFor,
  isBrandMatch,
  num,
  rp,
  sumBy
} from '../poCore';

export default function PurchasingBrandsTab({
  brands = [],
  setBrandModal = () => {},
  blankBrand = {},
  productSummary = [],
  feeBadges = { values: [0, 0, 0, 0], mixed: false },
  brandSearch = '',
  setBrandSearch = () => {},
  distinctBrandCities = [],
  brandCityFilter = 'all',
  setBrandCityFilter = () => {},
  brandSort = 'name',
  setBrandSort = () => {},
  filteredBrands = [],
  brandFormFrom = (b) => b,
  deleteBrand = () => {}
}) {
  return (
    <div className="space-y-4">
      <PageHead
        title="Brand Vendor"
        desc="Atur brand vendor resmi, supplier pabrik, diskon pabrik, dan fee mitra per level (persen atau Rupiah). Fee mitra otomatis terpotong saat mitra checkout."
        badge={<Badge tone="gray">{brands.length} brand</Badge>}
        actions={
          <Button icon="plus" onClick={() => setBrandModal({ mode: 'create', form: { ...blankBrand } })}>
            Brand Baru
          </Button>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Total Brand</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-[#6B1416]">
              <Icon name="shield" className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-stone-900">{brands.length} Brand</div>
          <p className="text-[11px] text-stone-500">Vendor aktif terdaftar</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Total Katalog PO</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Icon name="box" className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-stone-900">{productSummary.length} Produk</div>
          <p className="text-[11px] text-stone-500">Katalog pre-order aktif</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Total Omzet Vendor</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Icon name="wallet" className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-stone-900">
            {rp(sumBy(productSummary, (p) => p.omzet))}
          </div>
          <p className="text-[11px] text-emerald-600 font-medium">Akumulasi penjualan PO</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-semibold">Fee Mitra (rata-rata)</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Icon name="spark" className="w-4 h-4" />
            </span>
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-100">
              DB: {feeBadges.values?.[0] || 0}%
            </span>
            <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-bold text-[10px] border border-sky-100">
              Sub: {feeBadges.values?.[1] || 0}%
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100">
              Agen: {feeBadges.values?.[2] || 0}%
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-100">
              Res: {feeBadges.values?.[3] || 0}%
            </span>
            {feeBadges.mixed && (
              <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-bold text-[10px] border border-stone-200">
                sebagian Rp
              </span>
            )}
          </div>
          <p className="text-[10px] text-stone-400">Potongan otomatis per level</p>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Icon name="search" className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            placeholder="Cari nama brand, supplier pabrik, atau kota asal..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-stone-50 hover:bg-white focus:bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6B1416] transition"
          />
          {brandSearch && (
            <button
              type="button"
              onClick={() => setBrandSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
            >
              <Icon name="x" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {distinctBrandCities.length > 0 && (
            <select
              value={brandCityFilter}
              onChange={(e) => setBrandCityFilter(e.target.value)}
              className="text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6B1416] cursor-pointer"
            >
              <option value="all">Semua Kota Asal</option>
              {distinctBrandCities.map((c) => (
                <option key={c} value={c}>
                  Kota {c}
                </option>
              ))}
            </select>
          )}

          <select
            value={brandSort}
            onChange={(e) => setBrandSort(e.target.value)}
            className="text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#6B1416] cursor-pointer"
          >
            <option value="name">Urut: Nama (A-Z)</option>
            <option value="omzet">Urut: Omzet Tertinggi</option>
            <option value="products">Urut: Produk Terbanyak</option>
          </select>

          {(brandSearch || brandCityFilter !== 'all' || brandSort !== 'name') && (
            <button
              type="button"
              onClick={() => {
                setBrandSearch('');
                setBrandCityFilter('all');
                setBrandSort('name');
              }}
              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <TableWrap>
          <thead className="bg-stone-50/90 border-b border-stone-200/80">
            <tr>
              <th className={`${TH} text-center w-12`}>No</th>
              <th className={TH}>Brand Vendor & Pabrik</th>
              <th className={TH}>Kota Asal</th>
              <th className={`${TH} text-center`}>Diskon Pabrik</th>
              <th className={`${TH} text-center`}>Fee DB All</th>
              <th className={`${TH} text-center`}>Fee Sub DB</th>
              <th className={`${TH} text-center`}>Fee Agen</th>
              <th className={`${TH} text-center`}>Fee Reseller</th>
              <th className={`${TH} text-center`}>Produk PO</th>
              <th className={`${TH} text-right`}>Total Omzet</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredBrands.map((b, index) => {
              const brandProducts = productSummary.filter((p) => isBrandMatch(p, b));
              const brandInitials = b.name
                ? b.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'B';
              const brandOmzet = sumBy(brandProducts, (p) => p.omzet);

              return (
                <tr key={b.id} className="hover:bg-stone-50/60 transition">
                  <td className={`${TD} text-center text-stone-400 font-mono text-[11px] font-semibold`}>
                    {index + 1}
                  </td>
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-amber-100 border border-orange-200 flex items-center justify-center font-bold text-xs text-[#6B1416] shrink-0 shadow-2xs">
                        {brandInitials}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 text-xs sm:text-sm">{b.name}</p>
                        <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <Icon name="truck" className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>{b.supplier || 'Pabrik Rekanan'}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={TD}>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-stone-100/70 text-stone-700 font-medium border border-stone-200/60">
                      <span>📍</span>
                      <span>{b.address || 'Bandung'}</span>
                    </span>
                  </td>
                  <td className={`${TD} text-center`}>
                    <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-stone-100 text-stone-700 border border-stone-200/80">
                      {brandDiscountTypeFor(b) === 'nominal'
                        ? rp(brandDiscountValueFor(b))
                        : `${brandDiscountValueFor(b)}%`}
                    </span>
                  </td>
                  <td className={`${TD} text-center`}>
                    <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                      {feeTypeFor(b) === 'nominal' ? rp(b.discountDBAll) : `${num(b.discountDBAll)}%`}
                    </span>
                  </td>
                  <td className={`${TD} text-center`}>
                    <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-sky-50 text-sky-700 border border-sky-200/80">
                      {feeTypeFor(b) === 'nominal' ? rp(b.discountSubDB) : `${num(b.discountSubDB)}%`}
                    </span>
                  </td>
                  <td className={`${TD} text-center`}>
                    <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      {feeTypeFor(b) === 'nominal' ? rp(b.discountAgen) : `${num(b.discountAgen)}%`}
                    </span>
                  </td>
                  <td className={`${TD} text-center`}>
                    <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200/80">
                      {feeTypeFor(b) === 'nominal' ? rp(b.discountReseller) : `${num(b.discountReseller)}%`}
                    </span>
                  </td>
                  <td className={`${TD} text-center`}>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200/70">
                      <Icon name="box" className="w-3 h-3 text-stone-500" />
                      <span>{brandProducts.length > 0 ? brandProducts.length : (b.products_count || 0)} Produk</span>
                    </span>
                  </td>
                  <td className={`${TD} text-right`}>
                    <p className="font-bold text-stone-900 text-xs sm:text-sm">
                      {rp(brandOmzet)}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-medium">Omzet PO</p>
                  </td>
                  <td className={`${TD} text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBrandModal({ mode: 'edit', id: b.id, form: brandFormFrom(b) })}
                        className="px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      >
                        <Icon name="edit" className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBrand(b)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                        title="Hapus brand vendor"
                      >
                        <Icon name="trash" className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>

        {filteredBrands.length === 0 && (
          <EmptyState
            title={brandSearch ? 'Tidak ada brand vendor yang sesuai' : 'Belum ada brand vendor'}
            desc={brandSearch ? `Pencarian "${brandSearch}" tidak menemukan brand vendor apapun.` : undefined}
            icon="shield"
            action={
              brandSearch ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setBrandSearch('');
                    setBrandCityFilter('all');
                  }}
                >
                  Reset Pencarian
                </Button>
              ) : (
                <Button onClick={() => setBrandModal({ mode: 'create', form: { ...blankBrand } })}>
                  Tambah Brand Baru
                </Button>
              )
            }
          />
        )}

        {/* Table Footer */}
        <div className="px-4 py-3 bg-stone-50/70 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
          <span>
            Menampilkan <strong>{filteredBrands.length}</strong> dari <strong>{brands.length}</strong> brand vendor
          </span>
          <span className="text-[11px] text-stone-400">
            Fee mitra otomatis terpotong saat mitra checkout; diskon pabrik dipakai untuk fee perusahaan
          </span>
        </div>
      </Card>
    </div>
  );
}
