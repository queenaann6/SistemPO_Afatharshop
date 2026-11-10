import React from 'react';
import {
  Badge,
  Button,
  Card,
  MetricCard,
  PageHead,
  ProofThumb,
  TD,
  TH,
  TableWrap,
  fmtDate,
  rp,
  sumBy
} from '../poCore';

export default function OwnerTransferTab({
  readyTransfer = [],
  transferred = [],
  kasKeluar = 0,
  bankAccounts = [],
  goTo = () => {},
  setPrDetailId = () => {},
  setTransferModal = () => {},
  deletePR = () => {},
  setProofView = () => {},
  copyText = () => {},
  toast = () => {}
}) {
  return (
    <>
      <PageHead
        title="Transfer Dana"
        desc="Tandai pengajuan yang sudah Anda transfer beserta bukti transfernya agar Finance dapat mencatat kas keluar."
        badge={<Badge tone="blue">{readyTransfer.length} siap transfer</Badge>}
        actions={
          <Button variant="outline" icon="file" onClick={() => goTo('riwayat_pengajuan')}>
            Riwayat Pengajuan
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          label="Antrian Transfer"
          value={readyTransfer.length}
          sub="pengajuan disetujui"
          tone="blue"
          icon="wallet"
        />
        <MetricCard
          label="Nominal Antrian"
          value={rp(sumBy(readyTransfer, (r) => r.amount))}
          sub="belum ditransfer"
          tone="orange"
          icon="card"
        />
        <MetricCard
          label="Total Ditransfer"
          value={rp(kasKeluar)}
          sub={`${transferred.length} pengajuan selesai`}
          tone="emerald"
          icon="check"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title="Daftar Siap Transfer"
          subtitle="Klik tandai transfer setelah dana dikirim"
          className="lg:col-span-2"
        >
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={TH}>Kode</th>
                <th className={TH}>Tujuan</th>
                <th className={TH}>Rekening</th>
                <th className={`${TH} text-right`}>Nominal</th>
                <th className={`${TH} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {readyTransfer.map((r) => (
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
                      Disetujui {r.owner ? fmtDate(r.owner.at) : '—'}
                    </p>
                  </td>
                  <td className={TD}>
                    <p className="font-semibold text-gray-900">{r.purpose}</p>
                    <p className="text-[10px] text-gray-400">Ref: {r.ref || '—'}</p>
                  </td>
                  <td className={TD}>
                    <p className="font-semibold text-gray-800">{r.bank}</p>
                    <p className="text-[10px] text-gray-400">
                      {r.accountNo} a.n {r.holder}
                    </p>
                  </td>
                  <td className={`${TD} text-right font-bold text-gray-900`}>{rp(r.amount)}</td>
                  <td className={`${TD} text-right`}>
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <Button
                        size="xs"
                        variant="gold"
                        icon="wallet"
                        onClick={() =>
                          setTransferModal({ req: r, form: { note: '', ref: '', proof: '', proofFile: null } })
                        }
                      >
                        Tandai Transfer
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
              {readyTransfer.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-gray-400">
                    Tidak ada dana yang menunggu ditransfer.
                  </td>
                </tr>
              )}
            </tbody>
          </TableWrap>
        </Card>

        <Card title="Rekening Vendor Terdaftar" subtitle="Rekening tujuan transfer vendor & operasional">
          <div className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto">
            {bankAccounts
              .filter((b) => b.type === 'pengajuan' && b.active)
              .map((b) => (
                <div key={b.id} className="px-4 py-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold text-gray-900">
                      {b.bank} · <span className="text-gray-500 font-normal">{b.purpose || 'Vendor'}</span>
                    </p>
                    <p className="text-[10px] text-gray-700 font-mono mt-0.5">{b.accountNo}</p>
                    <p className="text-[10px] text-gray-400">a.n {b.holder}</p>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      copyText(b.accountNo);
                      toast(`Nomor rekening ${b.bank} disalin.`);
                    }}
                  >
                    Salin
                  </Button>
                </div>
              ))}
            {bankAccounts.filter((b) => b.type === 'pengajuan' && b.active).length === 0 && (
              <p className="px-4 py-8 text-center text-[11px] text-gray-400">
                Belum ada rekening vendor aktif.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card title="Riwayat Transfer" subtitle="Pengajuan yang sudah dibayarkan">
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Kode</th>
              <th className={TH}>Tujuan</th>
              <th className={`${TH} text-right`}>Nominal</th>
              <th className={TH}>Ditransfer</th>
              <th className={TH}>Catatan</th>
              <th className={TH}>Bukti</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transferred
              .slice()
              .sort((a, b) => String(b.transfer?.at || '').localeCompare(String(a.transfer?.at || '')))
              .map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/70">
                  <td className={TD}>
                    <button
                      type="button"
                      onClick={() => setPrDetailId(r.id)}
                      className="font-bold text-sky-700 hover:underline cursor-pointer"
                    >
                      {r.code}
                    </button>
                  </td>
                  <td className={TD}>
                    <p className="font-semibold text-gray-900">{r.purpose}</p>
                    <p className="text-[10px] text-gray-400">{r.bank}</p>
                  </td>
                  <td className={`${TD} text-right font-bold text-gray-900`}>{rp(r.amount)}</td>
                  <td className={TD}>
                    <p className="font-medium text-gray-800">{r.transfer?.by || '—'}</p>
                    <p className="text-[10px] text-gray-400">
                      {r.transfer?.at ? fmtDate(r.transfer.at) : '—'}
                    </p>
                  </td>
                  <td className={TD}>
                    <p className="text-[11px] text-gray-600 max-w-[200px] leading-snug">
                      {r.transfer?.note || '—'}
                    </p>
                  </td>
                  <td className={TD}>
                    <ProofThumb
                      src={r.transfer?.proof}
                      onClick={() =>
                        setProofView({
                          src: r.transfer.proof,
                          title: `Bukti transfer ${r.code}`
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            {transferred.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                  Belum ada transfer yang tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
