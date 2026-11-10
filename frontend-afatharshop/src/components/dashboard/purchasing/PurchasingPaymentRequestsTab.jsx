import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MetricCard,
  PREQ,
  PageHead,
  Segmented,
  TD,
  TH,
  TableWrap,
  fmtDate,
  prSteps,
  preqTone,
  rp,
  sumBy
} from '../poCore';

export default function PurchasingPaymentRequestsTab({
  prCounts = {},
  paymentRequests = [],
  prFilter = 'all',
  setPrFilter = () => {},
  filteredPr = [],
  setPrDetailId = () => {}
}) {
  return (
    <>
      <PageHead
        title="Review Pengajuan Pembayaran"
        desc="Finance mengajukan dana ke owner melalui portal ini. Persetujuan berjenjang: Purchasing → Owner → Transfer."
        badge={<Badge tone="amber">{prCounts[PREQ.REVIEW_MKT] || 0} perlu review</Badge>}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Perlu Review"
          value={prCounts[PREQ.REVIEW_MKT] || 0}
          sub="Menunggu keputusan purchasing"
          tone="amber"
          icon="clock"
          onClick={() => setPrFilter(PREQ.REVIEW_MKT)}
        />
        <MetricCard
          label="Menunggu Owner"
          value={prCounts[PREQ.APPROVAL_OWNER] || 0}
          sub="Sudah disetujui purchasing"
          tone="violet"
          icon="shield"
          onClick={() => setPrFilter(PREQ.APPROVAL_OWNER)}
        />
        <MetricCard
          label="Siap Ditransfer"
          value={prCounts[PREQ.APPROVED] || 0}
          sub={rp(sumBy(paymentRequests.filter((r) => r.status === PREQ.APPROVED), (r) => r.amount))}
          tone="blue"
          icon="wallet"
          onClick={() => setPrFilter(PREQ.APPROVED)}
        />
        <MetricCard
          label="Total Ditransfer"
          value={rp(sumBy(paymentRequests.filter((r) => r.status === PREQ.TRANSFERRED), (r) => r.amount))}
          sub={`${prCounts[PREQ.TRANSFERRED] || 0} pengajuan selesai`}
          tone="emerald"
          icon="check"
        />
      </div>

      <Card
        title="Daftar Pengajuan"
        subtitle="Pantau posisi setiap pengajuan pembayaran"
        action={
          <Segmented
            value={prFilter}
            onChange={setPrFilter}
            options={[
              { value: 'all', label: 'Semua', count: prCounts.all },
              { value: PREQ.REVIEW_MKT, label: 'Review', count: prCounts[PREQ.REVIEW_MKT] || 0 },
              { value: PREQ.APPROVAL_OWNER, label: 'Owner', count: prCounts[PREQ.APPROVAL_OWNER] || 0 },
              { value: PREQ.APPROVED, label: 'Disetujui', count: prCounts[PREQ.APPROVED] || 0 },
              { value: PREQ.TRANSFERRED, label: 'Transfer', count: prCounts[PREQ.TRANSFERRED] || 0 },
              { value: PREQ.REJECTED, label: 'Ditolak', count: prCounts[PREQ.REJECTED] || 0 }
            ]}
          />
        }
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Kode / Tanggal</th>
              <th className={TH}>Tujuan Pembayaran</th>
              <th className={TH}>Referensi</th>
              <th className={`${TH} text-right`}>Nominal</th>
              <th className={TH}>Diajukan</th>
              <th className={TH}>Progres</th>
              <th className={TH}>Status</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPr.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/70">
                <td className={TD}>
                  <p className="font-bold text-gray-900">{r.code}</p>
                  <p className="text-[10px] text-gray-400">{fmtDate(r.createdAt)}</p>
                </td>
                <td className={`${TD} max-w-[220px]`}>
                  <p className="font-medium text-gray-800">{r.purpose}</p>
                  <p className="text-[10px] text-gray-400 truncate">{r.note}</p>
                </td>
                <td className={TD}>{r.ref}</td>
                <td className={`${TD} text-right font-bold text-gray-900`}>{rp(r.amount)}</td>
                <td className={TD}>{r.createdBy}</td>
                <td className={TD}>
                  <div className="flex items-center gap-1">
                    {prSteps(r).map((s) => (
                      <span
                        key={s.label}
                        title={`${s.label}: ${s.state}`}
                        className={`w-2 h-2 rounded-full ${
                          s.state === 'done'
                            ? 'bg-emerald-500'
                            : s.state === 'active'
                            ? 'bg-amber-400'
                            : s.state === 'reject'
                            ? 'bg-rose-500'
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">
                    {r.bank} <span className="font-mono">· {r.accountNo}</span>
                  </p>
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <Badge tone={preqTone(r.status)}>{r.status}</Badge>
                </td>
                <td className={`${TD} text-right`}>
                  <Button
                    size="xs"
                    variant={r.status === PREQ.REVIEW_MKT ? 'primary' : 'outline'}
                    className="min-w-[64px] justify-center"
                    onClick={() => setPrDetailId(r.id)}
                  >
                    {r.status === PREQ.REVIEW_MKT ? 'Review' : 'Detail'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {filteredPr.length === 0 && (
          <EmptyState title="Tidak ada pengajuan" desc="Belum ada pengajuan pada filter ini." icon="wallet" />
        )}
      </Card>
    </>
  );
}
