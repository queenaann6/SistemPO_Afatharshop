import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  PageHead,
  ProgressBar,
  SearchBox,
  Segmented,
  Select,
  diffDays,
  fmtDate,
  num,
  rp,
  todayISO,
  variantLabel,
  variantPricing
} from '../poCore';

const defaultPriceRangeOf = (product) => {
  const prices = (product?.variants || []).map((v) => variantPricing(product, v).price).filter((p) => p > 0);
  if (!prices.length) return { min: 0, max: 0, label: rp(num(product?.price)) };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, label: min === max ? rp(min) : `${rp(min)} – ${rp(max)}` };
};

export default function PurchasingCatalogTab({
  products = [],
  setProductModal = () => {},
  blankProduct = {},
  catalogStatus = 'all',
  setCatalogStatus = () => {},
  catalogCounts = { all: 0, open: 0, closing: 0, closed: 0 },
  catalogFiltered = [],
  isCatalogFilterActive = false,
  handleResetCatalogFilter = () => {},
  catalogSearch = '',
  setCatalogSearch = () => {},
  catalogBrand = 'all',
  setCatalogBrand = () => {},
  brands = [],
  catalogCategory = 'all',
  setCatalogCategory = () => {},
  catalogCategories = [],
  catalogSort = 'default',
  setCatalogSort = () => {},
  priceRangeOf = defaultPriceRangeOf,
  openEditProduct = () => {},
  openVariantModal = () => {},
  setProductOrderId = () => {},
  toggleProductStatus = () => {},
  deleteProduct = () => {}
}) {
  return (
    <>
      <PageHead
        title="Katalog Produk PO"
        desc="Upload katalog, atur harga jual, kuota varian, dan periode PO. Katalog yang dibuka otomatis tampil di toko mitra."
        badge={<Badge tone="emerald">{products.filter((p) => p.status === 'open').length} PO aktif</Badge>}
        actions={
          <Button icon="plus" onClick={() => setProductModal({ mode: 'create', form: { ...blankProduct } })}>
            Produk Baru
          </Button>
        }
      />

      {/* Filter Bar Katalog Produk PO */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-3.5 sm:p-4 space-y-3">
        {/* Baris 1: Status PO Tabs & Ringkasan Counter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
              Status PO:
            </span>
            <Segmented
              value={catalogStatus}
              onChange={setCatalogStatus}
              options={[
                { value: 'all', label: 'Semua', count: catalogCounts.all },
                { value: 'open', label: 'PO Dibuka', count: catalogCounts.open },
                { value: 'closing', label: 'Tutup Hari Ini', count: catalogCounts.closing },
                { value: 'closed', label: 'Arsip / Ditutup', count: catalogCounts.closed }
              ]}
            />
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Badge tone={catalogFiltered.length > 0 ? 'emerald' : 'gray'}>
              {catalogFiltered.length} produk tampil
            </Badge>
            {isCatalogFilterActive && (
              <button
                type="button"
                onClick={handleResetCatalogFilter}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 transition cursor-pointer px-1.5 py-0.5 rounded"
                title="Reset semua filter"
              >
                <Icon name="x" className="w-3.5 h-3.5" />
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Baris 2: Toolbar Pencarian & Dropdown Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          <div className="lg:col-span-5">
            <SearchBox
              value={catalogSearch}
              onChange={setCatalogSearch}
              placeholder="Cari nama produk, brand, kategori, SKU…"
              className="w-full"
            />
          </div>

          <div className="lg:col-span-3">
            <Select
              value={catalogBrand}
              onChange={(e) => setCatalogBrand(e.target.value)}
              className="w-full text-xs"
            >
              <option value="all">Semua Brand Vendor</option>
              {brands.map((b) => (
                <option key={b.id} value={b.name}>
                  Brand: {b.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select
              value={catalogCategory}
              onChange={(e) => setCatalogCategory(e.target.value)}
              className="w-full text-xs"
            >
              <option value="all">Semua Kategori</option>
              {catalogCategories.map((c) => (
                <option key={c} value={c}>
                  Kategori: {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select
              value={catalogSort}
              onChange={(e) => setCatalogSort(e.target.value)}
              className="w-full text-xs"
            >
              <option value="default">Urutan: Default</option>
              <option value="close_asc">Tutup PO Terdekat</option>
              <option value="sales_desc">Terlaris (Kuota)</option>
              <option value="price_asc">Harga Terendah</option>
              <option value="price_desc">Harga Tertinggi</option>
            </Select>
          </div>
        </div>

        {/* Baris 3: Active Filter Chips */}
        {isCatalogFilterActive && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-gray-500">
            <span className="font-semibold text-gray-400">Filter Aktif:</span>
            {catalogStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                Status: {catalogStatus === 'open' ? 'PO Dibuka' : catalogStatus === 'closing' ? 'Tutup Hari Ini' : 'Arsip'}
                <button type="button" onClick={() => setCatalogStatus('all')} className="hover:text-rose-600 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            {catalogBrand !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-md font-medium">
                Brand: {catalogBrand}
                <button type="button" onClick={() => setCatalogBrand('all')} className="hover:text-rose-600 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            {catalogCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200/80 px-2 py-0.5 rounded-md font-medium">
                Kategori: {catalogCategory}
                <button type="button" onClick={() => setCatalogCategory('all')} className="hover:text-rose-600 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            {catalogSearch.trim() && (
              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200/80 px-2 py-0.5 rounded-md font-medium">
                Pencarian: "{catalogSearch.trim()}"
                <button type="button" onClick={() => setCatalogSearch('')} className="hover:text-rose-600 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
            {catalogSort !== 'default' && (
              <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-medium">
                Urut: {catalogSort === 'close_asc' ? 'Tutup Terdekat' : catalogSort === 'sales_desc' ? 'Terlaris' : catalogSort === 'price_asc' ? 'Harga Terendah' : 'Harga Tertinggi'}
                <button type="button" onClick={() => setCatalogSort('default')} className="hover:text-rose-600 font-bold ml-0.5 cursor-pointer">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {catalogFiltered.map((p) => {
          const d = diffDays(p.closeDate, todayISO());
          const used = p.used;
          const quota = p.quota;
          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
              <div className="h-28 bg-gradient-to-br from-rose-900 via-rose-800 to-amber-700 relative flex items-end p-4 overflow-hidden">
                {p.image ? (
                  <img src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover opacity-60 hover:scale-105 transition duration-300" />
                ) : (
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative z-10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200 drop-shadow-sm">{p.brand}</p>
                  <h3 className="text-base font-bold text-white leading-tight drop-shadow-md">{p.title}</h3>
                </div>
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                  {p.isSale && (
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                      SALE {p.discountPercent || 0}%
                    </span>
                  )}
                  <Badge tone={p.status === 'open' ? 'emerald' : 'gray'}>
                    {p.status === 'open' ? 'PO Dibuka' : 'PO Ditutup'}
                  </Badge>
                </div>
              </div>

              <div className="p-4 flex-1 space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Harga Varian</p>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <p className="text-lg font-bold text-gray-900">{priceRangeOf(p).label}</p>
                      {p.isSale && p.originalPrice > p.price && (
                        <span className="text-xs text-gray-400 line-through">
                          {rp(p.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    {p.openDate && (
                      <>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Buka PO</p>
                        <p className="text-[11px] font-semibold text-gray-700">{fmtDate(p.openDate)}</p>
                      </>
                    )}
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Tutup PO</p>
                    <p className={`text-[11px] font-bold ${d < 0 ? 'text-rose-600' : d <= 3 ? 'text-amber-600' : 'text-gray-700'}`}>
                      {fmtDate(p.closeDate)}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                    <span>Kuota terjual</span>
                    <span className="font-semibold text-gray-600">
                      {used}/{quota} pcs
                    </span>
                  </div>
                  <ProgressBar value={used} max={quota || 1} tone={quota - used <= 10 ? 'red' : 'emerald'} />
                </div>

                <div className="space-y-1">
                  {p.variants.slice(0, 3).map((v) => {
                    const { price: vPrice, addon: vAddon } = variantPricing(p, v);
                    const left = num(v.quota) - num(v.used);
                    return (
                      <div key={v.id} className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-gray-600 truncate">{variantLabel(v)}</span>
                        <span className="shrink-0 flex items-center gap-1.5">
                          <span className="text-gray-800 font-semibold">{rp(vPrice)}</span>
                          {vAddon > 0 && <span className="text-amber-700 font-semibold">+{rp(vAddon)}</span>}
                          <span className={left <= 0 ? 'text-rose-600 font-semibold' : 'text-gray-400'}>
                            sisa {left}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                  {p.variants.length > 3 && (
                    <p className="text-[10px] text-gray-400">+{p.variants.length - 3} varian lain</p>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => openEditProduct(p)}
                >
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => openVariantModal(p)}
                >
                  Varian ({p.variants.length})
                </Button>
                <Button size="xs" variant="outline" icon="receipt" onClick={() => setProductOrderId(p.id)}>
                  Orderan ({p.invoiceCount})
                </Button>
                <Button size="xs" variant={p.status === 'open' ? 'dangerOutline' : 'primary'} onClick={() => toggleProductStatus(p)}>
                  {p.status === 'open' ? 'Tutup PO' : 'Buka PO'}
                </Button>
                <button
                  type="button"
                  onClick={() => deleteProduct(p)}
                  className="ml-auto p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Hapus produk"
                >
                  <Icon name="trash" className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {catalogFiltered.length === 0 && (
        <Card>
          <EmptyState
            title={products.length === 0 ? 'Belum ada produk' : 'Tidak ada produk yang cocok'}
            desc={
              products.length === 0
                ? 'Tambahkan produk baru untuk membuka PO.'
                : 'Ubah kata kunci pencarian atau filter status PO.'
            }
            icon="box"
            action={
              products.length === 0 ? (
                <Button onClick={() => setProductModal({ mode: 'create', form: { ...blankProduct } })}>Produk Baru</Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleResetCatalogFilter}
                >
                  Reset Filter
                </Button>
              )
            }
          />
        </Card>
      )}
    </>
  );
}
