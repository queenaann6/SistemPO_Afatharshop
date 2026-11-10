import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MetricCard,
  PageHead,
  Segmented,
  TD,
  TH,
  TableWrap,
  downloadCSV,
  rp,
  sumBy,
  todayISO
} from '../poCore';

export default function FinancePoRecapTab({
  rekapGroups = [],
  rekapTab = 'brand',
  setRekapTab = () => {},
  toast = () => {}
}) {
  return (
    <>
      <PageHead
        title="Rekap PO"
        desc="Akumulasi pesanan per brand, produk, atau mitra lengkap dengan nilai dan piutang."
        badge={<Badge tone="gray">{rekapGroups.length} grup</Badge>}
        actions={
          <Button
            variant="outline"
            icon="download"
            onClick={() => {
              downloadCSV(`rekap_po_${rekapTab}_${todayISO()}.csv`, [
                [rekapTab === 'brand' ? 'Brand' : rekapTab === 'produk' ? 'Produk' : 'Mitra', 'Invoice', 'Qty', 'Nilai', 'Dibayar', 'Piutang'],
                ...rekapGroups.map((g) => [g.key, g.invoices, g.qty, g.nilai, g.paid, g.outstanding])
              ]);
              toast('Rekap PO diunduh.');
            }}
          >
            Ekspor Rekap
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Total Invoice" value={sumBy(rekapGroups, (g) => g.invoices)} sub="Seluruh pesanan aktif" tone="blue" icon="receipt" />
        <MetricCard label="Total Qty" value={`${sumBy(rekapGroups, (g) => g.qty)} pcs`} sub="Unit pre-order" tone="violet" icon="box" />
        <MetricCard label="Total Nilai" value={rp(sumBy(rekapGroups, (g) => g.nilai))} sub="Omzet PO" tone="emerald" icon="wallet" />
        <MetricCard label="Total Piutang" value={rp(sumBy(rekapGroups, (g) => g.outstanding))} sub="Belum lunas" tone="red" icon="card" />
      </div>

      <Card
        title={`Rekap per ${rekapTab === 'brand' ? 'Brand' : rekapTab === 'produk' ? 'Produk' : 'Mitra'}`}
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
                <td className={`${TD} font-bold text-gray-900`}>{g.key}</td>
                <td className={`${TD} text-right`}>{g.invoices}</td>
                <td className={`${TD} text-right`}>{g.qty} pcs</td>
                <td className={`${TD} text-right font-semibold`}>{rp(g.nilai)}</td>
                <td className={`${TD} text-right text-emerald-700`}>{rp(g.paid)}</td>
                <td className={`${TD} text-right font-semibold text-rose-600`}>{rp(g.outstanding)}</td>
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <span className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-sky-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (g.nilai / Math.max(1, sumBy(rekapGroups, (x) => x.nilai))) * 100
                          )}%`
                        }}
                      />
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {Math.round((g.nilai / Math.max(1, sumBy(rekapGroups, (x) => x.nilai))) * 100)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {rekapGroups.length === 0 && <EmptyState title="Belum ada data" desc="Rekap muncul setelah ada pesanan." icon="file" />}
      </Card>
    </>
  );
}
