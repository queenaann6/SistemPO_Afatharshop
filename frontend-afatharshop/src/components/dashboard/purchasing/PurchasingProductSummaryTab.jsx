import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MetricCard,
  PageHead,
  ProgressBar,
  Select,
  TD,
  TH,
  TableWrap,
  diffDays,
  num,
  rp,
  sumBy,
  todayISO,
  variantPricing
} from '../poCore';

const defaultPriceRangeOf = (product) => {
  const prices = (product?.variants || []).map((v) => variantPricing(product, v).price).filter((p) => p > 0);
  if (!prices.length) return { min: 0, max: 0, label: rp(num(product?.price)) };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, label: min === max ? rp(min) : `${rp(min)} – ${rp(max)}` };
};

export default function PurchasingProductSummaryTab({
  productFiltered = [],
  exportProducts = () => {},
  rekapBrand = 'all',
  setRekapBrand = () => {},
  brands = [],
  priceRangeOf = defaultPriceRangeOf,
  expandedProducts = {},
  setExpandedProducts = () => {}
}) {
  return (
    <>
      <PageHead
        title="Rekap Checkout per Produk"
        desc="Akumulasi pesanan mitra per produk dan varian: qty checkout, omzet, piutang, serta pemakaian kuota."
        badge={<Badge tone="gray">{productFiltered.length} produk</Badge>}
        actions={
          <Button variant="outline" icon="download" onClick={exportProducts}>
            Ekspor CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Total Qty Checkout"
          value={`${sumBy(productFiltered, (p) => p.qtySold)} pcs`}
          sub={`${sumBy(productFiltered, (p) => p.invoiceCount)} invoice`}
          tone="violet"
          icon="box"
        />
        <MetricCard
          label="Omzet Checkout"
          value={rp(sumBy(productFiltered, (p) => p.omzet))}
          sub="Setelah diskon level mitra"
          tone="emerald"
          icon="wallet"
        />
        <MetricCard
          label="Piutang Berjalan"
          value={rp(sumBy(productFiltered, (p) => p.piutang))}
          sub="Belum dibayar / belum diverifikasi"
          tone="red"
          icon="receipt"
        />
        <MetricCard
          label="Varian Hampir Habis"
          value={productFiltered.reduce(
            (n, p) =>
              n +
              p.variants.filter(
                (v) => num(v.used) > 0 && num(v.quota) - num(v.used) <= 10
              ).length,
            0
          )}
          sub="Sisa kuota ≤ 10 pcs pada varian yang sudah ada pesanan"
          tone="amber"
          icon="alert"
        />
      </div>

      <Card
        title="Rekap per Produk"
        action={
          <Select value={rekapBrand} onChange={(e) => setRekapBrand(e.target.value)} className="w-auto">
            <option value="all">Semua Brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </Select>
        }
      >
        <TableWrap minWidth={980}>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Produk</th>
              <th className={`${TH} text-right`}>Harga</th>
              <th className={`${TH} text-right`}>Invoice</th>
              <th className={`${TH} text-right`}>Qty</th>
              <th className={`${TH} text-right`}>Omzet</th>
              <th className={`${TH} text-right`}>Piutang</th>
              <th className={TH}>Kuota</th>
              <th className={TH}>Status PO</th>
              <th className={`${TH} text-right`}>Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {productFiltered.map((p) => {
              const d = diffDays(p.closeDate, todayISO());
              return (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-gray-50/70">
                    <td className={TD}>
                      <p className="font-bold text-gray-900">{p.title}</p>
                      <p className="text-[10px] text-gray-400">
                        {p.brand} · {p.category}
                      </p>
                    </td>
                    <td className={`${TD} text-right`}>{priceRangeOf(p).label}</td>
                    <td className={`${TD} text-right`}>{p.invoiceCount}</td>
                    <td className={`${TD} text-right font-semibold`}>{p.qtySold} pcs</td>
                    <td className={`${TD} text-right font-bold text-gray-900`}>{rp(p.omzet)}</td>
                    <td className={`${TD} text-right ${p.piutang > 0 ? 'text-rose-600 font-semibold' : 'text-gray-400'}`}>
                      {rp(p.piutang)}
                    </td>
                    <td className={TD}>
                      <div className="w-28">
                        <ProgressBar
                          value={p.used}
                          max={p.quota || 1}
                          tone={p.quota - p.used <= 10 ? 'red' : 'emerald'}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                          {p.used}/{p.quota} pcs · sisa {p.remaining}
                        </p>
                      </div>
                    </td>
                    <td className={TD}>
                      <Badge tone={p.status === 'open' ? (d <= 3 ? 'amber' : 'emerald') : 'gray'}>
                        {p.status === 'open' ? (d < 0 ? 'Lewat tenggat' : `${d} hari lagi`) : 'Ditutup'}
                      </Badge>
                    </td>
                    <td className={`${TD} text-right`}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedProducts((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                        }
                        className="text-[11px] font-semibold text-sky-700 hover:underline cursor-pointer"
                      >
                        {expandedProducts[p.id] ? 'Tutup' : 'Varian'}
                      </button>
                    </td>
                  </tr>
                  {expandedProducts[p.id] && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={9} className="px-4 py-3">
                        <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                          <TableWrap>
                            <thead className="bg-white border-b border-gray-100">
                              <tr>
                                <th className={TH}>Warna</th>
                                <th className={TH}>Model</th>
                                <th className={TH}>Ukuran</th>
                                <th className={`${TH} text-right`}>Kuota</th>
                                <th className={`${TH} text-right`}>Terpakai</th>
                                <th className={`${TH} text-right`}>Sisa</th>
                                <th className={TH}>Pemakaian</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {p.variants.map((v) => {
                                const rem = num(v.quota) - num(v.used);
                                return (
                                  <tr key={v.id}>
                                    <td className={TD}>{v.color}</td>
                                    <td className={TD}>{v.model}</td>
                                    <td className={TD}>{v.size}</td>
                                    <td className={`${TD} text-right`}>{v.quota}</td>
                                    <td className={`${TD} text-right`}>{v.used}</td>
                                    <td className={`${TD} text-right font-semibold ${rem <= 0 ? 'text-rose-600' : ''}`}>
                                      {rem}
                                    </td>
                                    <td className={TD}>
                                      <ProgressBar
                                        value={v.used}
                                        max={v.quota || 1}
                                        tone={rem <= 0 ? 'red' : rem <= 10 ? 'amber' : 'emerald'}
                                        className="w-32"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </TableWrap>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </TableWrap>
        {productFiltered.length === 0 && <EmptyState title="Belum ada produk" icon="box" />}
      </Card>
    </>
  );
}
