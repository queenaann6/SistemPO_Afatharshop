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
  preqTone,
  rp,
  sumBy
} from '../poCore';

export default function OwnerApprovalTab({
  approvals = [],
  pendingOwnerValue = 0,
  readyTransfer = [],
  transferred = [],
  kasKeluar = 0,
  prSearch = '',
  setPrSearch = () => {},
  approvalFiltered = [],
  setPrDetailId = () => {},
  rejectPR = () => {},
  approvePR = () => {},
  deletePR = () => {},
  goTo = () => {}
}) {
  return (
    <>
      <PageHead
        title="Persetujuan Pengajuan Pembayaran"
        desc="Pengajuan dana dari Finance yang sudah lolos review Purchasing dan menunggu keputusan Anda."
        badge={<Badge tone="amber">{approvals.length} menunggu</Badge>}
        actions={
          <Button variant="outline" icon="file" onClick={() => goTo('riwayat_pengajuan')}>
            Riwayat Pengajuan
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Menunggu Approval"
          value={approvals.length}
          sub="pengajuan"
          tone="amber"
          icon="shield"
        />
        <MetricCard
          label="Nilai Menunggu"
          value={rp(pendingOwnerValue)}
          sub="total dana tertahan"
          tone="orange"
          icon="wallet"
        />
        <MetricCard
          label="Siap Transfer"
          value={readyTransfer.length}
          sub={rp(sumBy(readyTransfer, (r) => r.amount))}
          tone="blue"
          icon="card"
          onClick={() => goTo('transfer')}
        />
        <MetricCard
          label="Sudah Ditransfer"
          value={transferred.length}
          sub={rp(kasKeluar)}
          tone="emerald"
          icon="check"
        />
      </div>

      <Card
        title="Daftar Pengajuan"
        subtitle="Diurutkan dari yang paling lama diajukan"
        action={<SearchBox value={prSearch} onChange={setPrSearch} placeholder="Cari kode / tujuan..." />}
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Kode</th>
              <th className={TH}>Tujuan</th>
              <th className={`${TH} text-right`}>Nominal</th>
              <th className={TH}>Review Purchasing</th>
              <th className={TH}>Rekening Tujuan</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {approvalFiltered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/70">
                <td className={TD}>
                  <button
                    type="button"
                    onClick={() => setPrDetailId(r.id)}
                    className="font-bold text-sky-700 hover:underline cursor-pointer"
                  >
                    {r.code}
                  </button>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Diajukan {fmtDate(r.createdAt)}
                  </p>
                </td>
                <td className={TD}>
                  <p className="font-semibold text-gray-900">{r.purpose}</p>
                  <p className="text-[10px] text-gray-400">
                    Ref: {r.ref || '—'} · {r.createdBy}
                  </p>
                </td>
                <td className={`${TD} text-right`}>
                  <p className="font-bold text-gray-900">{rp(r.amount)}</p>
                  <Badge tone={preqTone(r.status)}>{r.status}</Badge>
                </td>
                <td className={TD}>
                  {r.marketing ? (
                    <>
                      <p className="font-medium text-emerald-700">✓ {r.marketing.by}</p>
                      <p className="text-[10px] text-gray-400">{fmtDate(r.marketing.at)}</p>
                      {r.marketing.note && (
                        <p className="text-[10px] text-gray-500 max-w-[180px] leading-snug">
                          {r.marketing.note}
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className={TD}>
                  <p className="font-semibold text-gray-800">{r.bank}</p>
                  <p className="text-[10px] text-gray-400">
                    {r.accountNo} · {r.holder}
                  </p>
                </td>
                <td className={`${TD} text-right`}>
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <Button size="xs" variant="outline" onClick={() => setPrDetailId(r.id)}>
                      Detail
                    </Button>
                    <Button size="xs" variant="dangerOutline" onClick={() => rejectPR(r)}>
                      Tolak
                    </Button>
                    <Button size="xs" variant="gold" onClick={() => approvePR(r)}>
                      Setujui
                    </Button>
                    <Button size="xs" variant="dangerOutline" icon="trash" onClick={() => deletePR(r)} title="Hapus Pengajuan">
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {approvalFiltered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                  Tidak ada pengajuan yang menunggu persetujuan Anda.
                </td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
