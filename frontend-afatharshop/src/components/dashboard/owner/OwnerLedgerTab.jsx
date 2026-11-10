import React from 'react';
import {
  Badge,
  Button,
  Card,
  MetricCard,
  PAY,
  PageHead,
  Select,
  TD,
  TH,
  TableWrap,
  fmtDate,
  rp
} from '../poCore';

export default function OwnerLedgerTab({
  kasMasuk = 0,
  kasKeluar = 0,
  ledgerRows = [],
  ledgerType = 'all',
  setLedgerType = () => {},
  ledgerTypes = [],
  deleteLedgerRow = () => {},
  exportLedger = () => {}
}) {
  return (
    <>
      <PageHead
        title="Buku Kas Perusahaan"
        desc="Arus kas masuk dari pembayaran mitra dan kas keluar dari transfer pengajuan."
        badge={<Badge tone="emerald">Net {rp(kasMasuk - kasKeluar)}</Badge>}
        actions={
          <Button variant="outline" icon="download" onClick={exportLedger}>
            Ekspor
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Kas Masuk" value={rp(kasMasuk)} sub="pembayaran terverifikasi" tone="emerald" icon="wallet" />
        <MetricCard label="Kas Keluar" value={rp(kasKeluar)} sub="transfer pengajuan" tone="red" icon="card" />
        <MetricCard
          label="Arus Kas Bersih"
          value={rp(kasMasuk - kasKeluar)}
          sub="masuk − keluar"
          tone={kasMasuk - kasKeluar >= 0 ? 'blue' : 'orange'}
          icon="check"
        />
        <MetricCard
          label="Transaksi"
          value={ledgerRows.length}
          sub="baris pada filter"
          tone="gray"
          icon="file"
        />
      </div>

      <Card
        title="Mutasi Kas"
        subtitle="Gabungan pembayaran masuk dan pengajuan keluar"
        action={
          <Select value={ledgerType} onChange={(e) => setLedgerType(e.target.value)} className="w-44">
            <option value="all">Semua tipe</option>
            {ledgerTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="Pengajuan Owner">Pengajuan Owner</option>
          </Select>
        }
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Tanggal</th>
              <th className={TH}>Tipe</th>
              <th className={TH}>Referensi</th>
              <th className={TH}>Keterangan</th>
              <th className={`${TH} text-right`}>Nominal</th>
              <th className={TH}>Bank</th>
              <th className={TH}>Oleh</th>
              <th className={TH}>Status</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ledgerRows.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50/70">
                <td className={TD}>{fmtDate(l.date)}</td>
                <td className={TD}>
                  <Badge tone={l.direction === 'in' ? 'emerald' : 'red'}>{l.type}</Badge>
                </td>
                <td className={`${TD} font-semibold text-gray-800`}>{l.ref || '—'}</td>
                <td className={TD}>
                  <p className="text-[11px] text-gray-700 max-w-[220px] leading-snug">
                    {l.mitraName || '—'}
                  </p>
                </td>
                <td
                  className={`${TD} text-right font-bold ${
                    l.direction === 'in' ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {l.direction === 'in' ? '+' : '−'} {rp(l.nominal)}
                </td>
                <td className={TD}>{l.bank || '—'}</td>
                <td className={TD}>{l.by || '—'}</td>
                <td className={TD}>
                  <Badge
                    tone={
                      l.status === PAY.ACC || l.status === 'Transfer'
                        ? 'emerald'
                        : l.status === PAY.MENUNGGU
                        ? 'amber'
                        : 'gray'
                    }
                  >
                    {l.status || '—'}
                  </Badge>
                </td>
                <td className={`${TD} text-right`}>
                  <Button
                    size="xs"
                    variant="dangerOutline"
                    icon="trash"
                    onClick={() => deleteLedgerRow(l)}
                    title="Hapus Transaksi Buku Kas"
                  >
                    Hapus
                  </Button>
                </td>
              </tr>
            ))}
            {ledgerRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-xs text-gray-400">
                  Tidak ada transaksi pada filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
