import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MetricCard,
  PAY,
  PREQ,
  PageHead,
  Segmented,
  TD,
  TH,
  TableWrap,
  fmtDate,
  isPaid,
  rp,
  sumBy
} from '../poCore';

export default function FinanceLedgerTab({
  ledgerRows = [],
  kasMasuk = 0,
  kasKeluar = 0,
  orders = [],
  ledgerType = 'all',
  setLedgerType = () => {},
  exportLedger = () => {}
}) {
  return (
    <>
      <PageHead
        title="Buku Kas Masuk & Keluar"
        desc="Rekap seluruh aliran dana: pembayaran mitra, deposit, dan pengajuan yang ditransfer owner."
        badge={<Badge tone="gray">{ledgerRows.length} baris</Badge>}
        actions={
          <Button variant="outline" icon="download" onClick={exportLedger}>
            Ekspor Buku Kas
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Kas Masuk" value={rp(kasMasuk)} sub="Pembayaran & deposit ACC" tone="emerald" icon="card" />
        <MetricCard label="Dana Keluar" value={rp(kasKeluar)} sub="Pengajuan ditransfer owner" tone="red" icon="wallet" />
        <MetricCard
          label="Arus Kas Bersih"
          value={rp(kasMasuk - kasKeluar)}
          sub="Masuk - keluar"
          tone={kasMasuk - kasKeluar >= 0 ? 'blue' : 'red'}
          icon="file"
        />
        <MetricCard
          label="DP Terkumpul"
          value={rp(sumBy(orders.filter((o) => isPaid(o.dpStatus)), (o) => o.dpNominal))}
          sub={`${orders.filter((o) => isPaid(o.dpStatus)).length} pesanan`}
          tone="violet"
          icon="receipt"
        />
      </div>

      <Card
        title="Mutasi Kas"
        subtitle="Diurutkan dari transaksi terbaru"
        action={
          <Segmented
            value={ledgerType}
            onChange={setLedgerType}
            options={[
              { value: 'all', label: 'Semua' },
              { value: 'DP', label: 'DP' },
              { value: 'Pelunasan', label: 'Pelunasan' },
              { value: 'Ongkir', label: 'Ongkir' },
              { value: 'Deposit', label: 'Deposit' },
              { value: 'Pengajuan Owner', label: 'Keluar' }
            ]}
          />
        }
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Tanggal</th>
              <th className={TH}>Tipe</th>
              <th className={TH}>Referensi</th>
              <th className={TH}>Mitra / Tujuan</th>
              <th className={`${TH} text-right`}>Nominal</th>
              <th className={TH}>Bank</th>
              <th className={TH}>Oleh</th>
              <th className={TH}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ledgerRows.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50/70">
                <td className={TD}>{fmtDate(l.date)}</td>
                <td className={TD}>
                  <Badge tone={l.direction === 'out' ? 'red' : l.type === 'Deposit' ? 'violet' : 'blue'}>
                    {l.direction === 'out' ? 'Keluar' : l.type}
                  </Badge>
                </td>
                <td className={TD}>
                  <p className="font-semibold text-gray-900">{l.ref}</p>
                  {l.note && <p className="text-[10px] text-gray-400">{l.note}</p>}
                </td>
                <td className={TD}>{l.mitraName}</td>
                <td className={`${TD} text-right font-bold ${l.direction === 'out' ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {l.direction === 'out' ? ' - ' : '+'}
                  {rp(l.nominal)}
                </td>
                <td className={TD}>{l.bank || ' — '}</td>
                <td className={TD}>{l.by || ' — '}</td>
                <td className={TD}>
                  <Badge tone={l.status === PREQ.TRANSFERRED || l.status === 'Transfer' ? 'teal' : l.status === PAY.ACC ? 'emerald' : 'amber'}>
                    {l.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {ledgerRows.length === 0 && (
          <EmptyState title="Belum ada mutasi" desc="Transaksi kas akan tampil di sini setelah pembayaran diverifikasi." icon="file" />
        )}
      </Card>
    </>
  );
}
