import React from 'react';
import {
  Badge,
  Button,
  Card,
  PREQ,
  PageHead,
  SearchBox,
  Segmented,
  TD,
  TH,
  TableWrap,
  downloadCSV,
  fmtDate,
  preqTone,
  rp,
  todayISO
} from '../poCore';

export default function OwnerRequestHistoryTab({
  paymentRequests = [],
  filteredPr = [],
  prSearch = '',
  setPrSearch = () => {},
  prFilter = 'all',
  setPrFilter = () => {},
  prCounts = {},
  setPrDetailId = () => {},
  deletePR = () => {},
  toast = () => {}
}) {
  return (
    <>
      <PageHead
        title="Riwayat Pengajuan Dana"
        desc="Seluruh pengajuan pembayaran lintas status beserta jejak persetujuannya."
        badge={<Badge tone="gray">{paymentRequests.length} pengajuan</Badge>}
        actions={
          <Button
            variant="outline"
            icon="download"
            onClick={() => {
              downloadCSV(`riwayat_pengajuan_${todayISO()}.csv`, [
                ['Kode', 'Tanggal', 'Tujuan', 'Nominal', 'Status', 'Diajukan', 'Review Purchasing', 'Approval Owner', 'Transfer'],
                ...filteredPr.map((r) => [
                  r.code,
                  r.createdAt,
                  r.purpose,
                  r.amount,
                  r.status,
                  r.createdBy,
                  r.marketing ? `${r.marketing.by} (${r.marketing.decision})` : '',
                  r.owner ? `${r.owner.by} (${r.owner.decision})` : '',
                  r.transfer ? `${r.transfer.by} ${r.transfer.at}` : ''
                ])
              ]);
              toast('Riwayat pengajuan diunduh.');
            }}
          >
            Ekspor
          </Button>
        }
      />

      <Card
        title="Semua Pengajuan"
        subtitle="Filter berdasarkan status alur approval"
        action={<SearchBox value={prSearch} onChange={setPrSearch} placeholder="Cari kode / tujuan..." />}
      >
        <div className="px-4 py-3 border-b border-gray-100">
          <Segmented
            value={prFilter}
            onChange={setPrFilter}
            options={[
              { value: 'all', label: 'Semua', count: prCounts.all },
              { value: PREQ.REVIEW_MKT, label: 'Review Purchasing', count: prCounts[PREQ.REVIEW_MKT] },
              { value: PREQ.APPROVAL_OWNER, label: 'Approval Owner', count: prCounts[PREQ.APPROVAL_OWNER] },
              { value: PREQ.APPROVED, label: 'Disetujui', count: prCounts[PREQ.APPROVED] },
              { value: PREQ.TRANSFERRED, label: 'Ditransfer', count: prCounts[PREQ.TRANSFERRED] },
              { value: PREQ.REJECTED, label: 'Ditolak', count: prCounts[PREQ.REJECTED] },
              { value: PREQ.CANCELED, label: 'Dibatalkan', count: prCounts[PREQ.CANCELED] }
            ]}
          />
        </div>
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Kode</th>
              <th className={TH}>Tujuan</th>
              <th className={`${TH} text-right`}>Nominal</th>
              <th className={TH}>Status</th>
              <th className={TH}>Alur Persetujuan</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPr.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/70">
                <td className={TD}>
                  <button
                    type="button"
                    onClick={() => setPrDetailId(r.id)}
                    className="font-bold text-sky-700 hover:underline cursor-pointer"
                  >
                    {r.code}
                  </button>
                  <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(r.createdAt)}</p>
                </td>
                <td className={TD}>
                  <p className="font-semibold text-gray-900">{r.purpose}</p>
                  <p className="text-[10px] text-gray-400">
                    {r.createdBy} · {r.bank}
                  </p>
                </td>
                <td className={`${TD} text-right font-bold text-gray-900`}>{rp(r.amount)}</td>
                <td className={TD}>
                  <Badge tone={preqTone(r.status)}>{r.status}</Badge>
                </td>
                <td className={TD}>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        r.createdAt ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        r.marketing?.decision === 'ACC'
                          ? 'bg-emerald-100 text-emerald-700'
                          : r.marketing?.decision === 'TOLAK'
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {r.marketing?.decision === 'TOLAK' ? '!' : r.marketing ? '✓' : '2'}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        r.owner?.decision === 'ACC'
                          ? 'bg-emerald-100 text-emerald-700'
                          : r.owner?.decision === 'TOLAK'
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {r.owner?.decision === 'TOLAK' ? '!' : r.owner ? '✓' : '3'}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        r.transfer ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {r.transfer ? '✓' : '4'}
                    </span>
                  </div>
                </td>
                <td className={`${TD} text-right`}>
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <Button size="xs" variant="outline" onClick={() => setPrDetailId(r.id)}>
                      Detail
                    </Button>
                    <Button
                      size="xs"
                      variant="dangerOutline"
                      icon="trash"
                      onClick={() => deletePR(r)}
                      title="Hapus Pengajuan"
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPr.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                  Tidak ada pengajuan pada filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
