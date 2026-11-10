import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MetricCard,
  PageHead,
  SearchBox,
  Segmented,
  TD,
  TH,
  TableWrap,
  diffDays,
  fmtDate,
  orderOutstanding,
  orderPaid,
  orderStage,
  rp,
  sumBy,
  todayISO
} from '../poCore';

export default function FinanceReminderTab({
  agingRows = [],
  orders = [],
  closingPo = [],
  closingFiltered = [],
  closingSearch = '',
  setClosingSearch = () => {},
  closingUrgency = 'all',
  setClosingUrgency = () => {},
  reminderSearch = '',
  setReminderSearch = () => {},
  setDetailInvoice = () => {},
  openWA = () => {}
}) {
  return (
    <>
      <PageHead
        title="Tagihan & Reminder WhatsApp"
        desc="Pantau piutang mitra dan kirim pengingat pembayaran melalui WhatsApp."
        badge={<Badge tone="red">{agingRows.filter((o) => o.late > 0).length} terlambat</Badge>}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Total Piutang" value={rp(sumBy(agingRows, (o) => o.outstanding))} sub={`${agingRows.length} pesanan`} tone="red" icon="receipt" />
        <MetricCard
          label="Terlambat"
          value={agingRows.filter((o) => o.late > 0).length}
          sub={rp(sumBy(agingRows.filter((o) => o.late > 0), (o) => o.outstanding))}
          tone="orange"
          icon="alert"
        />
        <MetricCard
          label="Jatuh Tempo ≤ 3 Hari"
          value={agingRows.filter((o) => o.late === 0 && diffDays(o.due, todayISO()) <= 3).length}
          sub="Segera ditagihkan"
          tone="amber"
          icon="clock"
        />
        <MetricCard
          label="Sudah Lunas"
          value={orders.filter((o) => orderOutstanding(o) === 0 && orderStage(o) === 'selesai').length}
          sub="Pesanan selesai"
          tone="emerald"
          icon="check"
        />
      </div>

      <Card
        title="PO Tutup Hari Ini"
        subtitle="Produk yang jadwal tutup PO-nya hari ini atau sudah lewat"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-56">
              <SearchBox
                value={closingSearch}
                onChange={setClosingSearch}
                placeholder="Cari produk / brand..."
              />
            </div>
            <Segmented
              value={closingUrgency}
              onChange={setClosingUrgency}
              options={[
                { value: 'all', label: 'Semua', count: closingPo.length },
                { value: 'today', label: 'Hari ini', count: closingPo.filter((p) => p.daysLeft === 0).length },
                { value: 'overdue', label: 'Lewat', count: closingPo.filter((p) => p.daysLeft < 0).length }
              ]}
            />
            <Badge tone={closingPo.length ? 'red' : 'gray'}>{closingFiltered.length} produk</Badge>
          </div>
        }
      >
        {closingPo.length === 0 ? (
          <EmptyState
            title="Tidak ada PO yang tutup hari ini"
            desc="Semua jadwal PO masih dalam batas waktu."
            icon="check"
          />
        ) : closingFiltered.length === 0 ? (
          <EmptyState
            title="Tidak ada produk yang cocok"
            desc="Ubah kata kunci pencarian atau filter tenggat."
            icon="search"
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setClosingSearch('');
                  setClosingUrgency('all');
                }}
              >
                Reset Filter
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={TH}>Produk</th>
                <th className={TH}>Brand</th>
                <th className={TH}>Tutup PO</th>
                <th className={`${TH} text-right`}>Varian</th>
                <th className={`${TH} text-right`}>Sisa Kuota</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {closingFiltered.map((p) => {
                const quota = sumBy(p.variants || [], (v) => v.quota);
                const used = sumBy(p.variants || [], (v) => v.used);
                return (
                  <tr key={p.id} className="hover:bg-gray-50/70">
                    <td className={TD}>
                      <p className="font-semibold text-gray-900">{p.title}</p>
                      <p className="text-[10px] text-gray-400">{p.category}</p>
                    </td>
                    <td className={TD}>{p.brand}</td>
                    <td className={TD}>{fmtDate(p.closeDate)}</td>
                    <td className={`${TD} text-right`}>{(p.variants || []).length}</td>
                    <td className={`${TD} text-right`}>{Math.max(0, quota - used)}/{quota}</td>
                    <td className={TD}>
                      <Badge tone={p.daysLeft === 0 ? 'red' : 'amber'}>
                        {p.daysLeft === 0 ? 'Hari ini' : `Lewat ${Math.abs(p.daysLeft)} hari`}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <Card
        title="Daftar Piutang"
        action={
          <div className="w-full sm:w-64">
            <SearchBox value={reminderSearch} onChange={setReminderSearch} placeholder="Cari invoice / mitra..." />
          </div>
        }
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Invoice</th>
              <th className={TH}>Mitra</th>
              <th className={`${TH} text-right`}>Nilai</th>
              <th className={`${TH} text-right`}>Dibayar</th>
              <th className={`${TH} text-right`}>Sisa</th>
              <th className={TH}>Jatuh Tempo</th>
              <th className={TH}>Keterlambatan</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agingRows.map((o) => (
              <tr key={o.invoice} className="hover:bg-gray-50/70">
                <td className={TD}>
                  <button
                    type="button"
                    onClick={() => setDetailInvoice(o.invoice)}
                    className="font-bold text-sky-700 hover:underline cursor-pointer"
                  >
                    {o.invoice}
                  </button>
                  <p className="text-[10px] text-gray-400">{o.produk}</p>
                </td>
                <td className={TD}>
                  <p className="font-semibold text-gray-900">{o.mitraName}</p>
                  <p className="text-[10px] text-gray-400">{o.level}</p>
                </td>
                <td className={`${TD} text-right`}>{rp(o.subtotal)}</td>
                <td className={`${TD} text-right text-emerald-700`}>{rp(orderPaid(o))}</td>
                <td className={`${TD} text-right font-bold text-rose-600`}>{rp(o.outstanding)}</td>
                <td className={TD}>{fmtDate(o.due)}</td>
                <td className={TD}>
                  {o.late > 0 ? (
                    <Badge tone="red">Terlambat {o.late} hari</Badge>
                  ) : (
                    <Badge tone="gray">Belum jatuh tempo</Badge>
                  )}
                </td>
                <td className={`${TD} text-right`}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button size="xs" variant="outline" icon="chat" onClick={() => openWA(o, 'ringkasan')}>
                      Reminder
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setDetailInvoice(o.invoice)}>
                      Detail
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {agingRows.length === 0 && (
          <EmptyState title="Tidak ada piutang" desc="Semua tagihan mitra sudah lunas." icon="check" />
        )}
      </Card>
    </>
  );
}
