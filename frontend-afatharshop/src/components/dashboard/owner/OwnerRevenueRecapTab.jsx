import React from 'react';
import {
  Badge,
  Button,
  Card,
  MetricCard,
  PageHead,
  Segmented,
  TD,
  TH,
  TableWrap,
  orderPaid,
  rp,
  sumBy
} from '../poCore';

export default function OwnerRevenueRecapTab({
  validOrders = [],
  omzet = 0,
  piutang = 0,
  rekapTab = 'brand',
  setRekapTab = () => {},
  rekapGroups = [],
  exportRekap = () => {}
}) {
  return (
    <>
      <PageHead
        title="Rekap Omzet PO"
        desc="Ringkasan penjualan berdasarkan brand, produk, atau mitra."
        badge={<Badge tone="emerald">{validOrders.length} pesanan valid</Badge>}
        actions={
          <Button variant="outline" icon="download" onClick={exportRekap}>
            Ekspor Rekap
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Total Nilai" value={rp(omzet)} sub={`${validOrders.length} invoice`} tone="emerald" icon="wallet" />
        <MetricCard label="Sudah Dibayar" value={rp(sumBy(validOrders, (o) => orderPaid(o)))} sub="seluruh tahap" tone="blue" icon="check" />
        <MetricCard label="Piutang" value={rp(piutang)} sub="belum dibayar" tone="red" icon="receipt" />
        <MetricCard
          label="Rata-rata Nilai"
          value={rp(Math.round(omzet / Math.max(1, validOrders.length)))}
          sub="per pesanan"
          tone="violet"
          icon="spark"
        />
      </div>

      <Card
        title="Rincian Rekap"
        subtitle="Pilih dimensi rekap yang ingin dilihat"
        action={
          <Segmented
            value={rekapTab}
            onChange={setRekapTab}
            options={[
              { value: 'brand', label: 'Brand' },
              { value: 'produk', label: 'Produk' },
              { value: 'mitra', label: 'Mitra' }
            ]}
          />
        }
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>{rekapTab === 'brand' ? 'Brand' : rekapTab === 'produk' ? 'Produk' : 'Mitra'}</th>
              <th className={`${TH} text-right`}>Invoice</th>
              <th className={`${TH} text-right`}>Qty</th>
              <th className={`${TH} text-right`}>Nilai</th>
              <th className={`${TH} text-right`}>Dibayar</th>
              <th className={`${TH} text-right`}>Piutang</th>
              <th className={TH}>Kontribusi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rekapGroups.map((g) => (
              <tr key={g.key} className="hover:bg-gray-50/70">
                <td className={`${TD} font-semibold text-gray-900`}>{g.key}</td>
                <td className={`${TD} text-right`}>{g.invoices}</td>
                <td className={`${TD} text-right`}>{g.qty} pcs</td>
                <td className={`${TD} text-right font-bold text-gray-900`}>{rp(g.nilai)}</td>
                <td className={`${TD} text-right text-emerald-700`}>{rp(g.paid)}</td>
                <td className={`${TD} text-right text-rose-600`}>{rp(g.outstanding)}</td>
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 max-w-[120px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <span
                        className="block h-full bg-amber-400 rounded-full"
                        style={{ width: `${Math.round((g.nilai / Math.max(1, omzet)) * 100)}%` }}
                      />
                    </span>
                    <span className="text-[10px] font-bold text-gray-600 w-8 text-right">
                      {Math.round((g.nilai / Math.max(1, omzet)) * 100)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {rekapGroups.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-xs text-gray-400">
                  Belum ada data pada rekap ini.
                </td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
