import React from 'react';
import {
  Badge,
  Button,
  Card,
  MetricCard,
  PageHead,
  SearchBox,
  TD,
  TH,
  TableWrap,
  fmtDate,
  rp,
  sumBy
} from '../poCore';

export default function OwnerReceivablesTab({
  agingRows = [],
  piutang = 0,
  agingSearch = '',
  setAgingSearch = () => {},
  setDetailInvoice = () => {},
  openWA = () => {},
  exportOrders = () => {}
}) {
  return (
    <>
      <PageHead
        title="Piutang & Reminder Mitra"
        desc="Sisa tagihan mitra yang belum lunas beserta status jatuh temponya."
        badge={
          <Badge tone="red">
            {agingRows.filter((o) => o.late > 0).length} terlambat
          </Badge>
        }
        actions={
          <Button variant="outline" icon="download" onClick={exportOrders}>
            Ekspor
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Total Piutang" value={rp(piutang)} sub={`${agingRows.length} invoice`} tone="red" icon="receipt" />
        <MetricCard
          label="Nilai Terlambat"
          value={rp(sumBy(agingRows.filter((o) => o.late > 0), (o) => o.outstanding))}
          sub={`${agingRows.filter((o) => o.late > 0).length} invoice`}
          tone="orange"
          icon="clock"
        />
        <MetricCard
          label="Belum Jatuh Tempo"
          value={rp(sumBy(agingRows.filter((o) => o.late === 0), (o) => o.outstanding))}
          sub={`${agingRows.filter((o) => o.late === 0).length} invoice`}
          tone="amber"
          icon="card"
        />
        <MetricCard
          label="Rata-rata Keterlambatan"
          value={`${Math.round(
            agingRows.filter((o) => o.late > 0).reduce((n, o) => n + o.late, 0) /
              Math.max(1, agingRows.filter((o) => o.late > 0).length)
          )} hari`}
          sub="dari invoice terlambat"
          tone="violet"
          icon="clock"
        />
      </div>

      <Card
        title="Daftar Piutang"
        subtitle="Klik WhatsApp untuk mengirim pengingat"
        action={<SearchBox value={agingSearch} onChange={setAgingSearch} placeholder="Cari invoice / mitra..." />}
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Invoice</th>
              <th className={TH}>Mitra</th>
              <th className={TH}>Jatuh Tempo</th>
              <th className={TH}>Keterlambatan</th>
              <th className={`${TH} text-right`}>Sisa Tagihan</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agingRows.map((o) => (
              <tr key={o.invoice} className="hover:bg-gray-50/70">
                <td className={TD}>
                  <button
                    type="button"
                    onClick={() => setDetailInvoice(o)}
                    className="font-bold text-sky-700 hover:underline cursor-pointer"
                  >
                    {o.invoice}
                  </button>
                  <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(o.date)}</p>
                </td>
                <td className={TD}>
                  <p className="font-semibold text-gray-900">{o.mitraName}</p>
                  <p className="text-[10px] text-gray-400">
                    {o.level} · {o.produk}
                  </p>
                </td>
                <td className={TD}>
                  <p className="font-medium text-gray-800">{fmtDate(o.due)}</p>
                  <p className="text-[10px] text-gray-400">{o.brand}</p>
                </td>
                <td className={TD}>
                  {o.late > 0 ? (
                    <Badge tone="red">Terlambat {o.late} hari</Badge>
                  ) : (
                    <Badge tone="emerald">Belum jatuh tempo</Badge>
                  )}
                </td>
                <td className={`${TD} text-right font-bold text-rose-600`}>{rp(o.outstanding)}</td>
                <td className={`${TD} text-right`}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button size="xs" variant="outline" onClick={() => setDetailInvoice(o)}>
                      Detail
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      icon="chat"
                      onClick={() => openWA(o, 'pelunasan')}
                    >
                      Ingatkan
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {agingRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                  Semua tagihan mitra sudah lunas.
                </td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
