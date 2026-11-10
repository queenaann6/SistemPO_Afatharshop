import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MetricCard,
  PAY,
  PageHead,
  ProofThumb,
  SearchBox,
  Segmented,
  TD,
  TH,
  TableWrap,
  fmtDate,
  payTone,
  rp,
  sumBy
} from '../poCore';

export default function FinanceVerificationTab({
  verifMeta = {},
  verifCounts = { menunggu: 0, acc: 0, tolak: 0, all: 0 },
  verifRows = [],
  verifTab = 'menunggu',
  setVerifTab = () => {},
  verifSearch = '',
  setVerifSearch = () => {},
  shownVerif = [],
  goTo = () => {},
  setDetailInvoice = () => {},
  setProofView = () => {},
  setReasonModal = () => {},
  setConfirmModal = () => {},
  rejectPayment = () => {},
  approvePayment = () => {}
}) {
  if (!verifMeta) return null;

  return (
    <>
      <PageHead
        title={verifMeta.title}
        desc={verifMeta.desc}
        badge={<Badge tone="blue">{verifCounts.menunggu} menunggu</Badge>}
        actions={
          <Button variant="outline" icon="upload" onClick={() => goTo('input_bukti')}>
            Input Bukti Manual
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Menunggu Verifikasi"
          value={verifCounts.menunggu}
          sub={rp(sumBy(verifRows.filter((r) => r.status === PAY.MENUNGGU), (r) => r.amount))}
          tone="blue"
          icon="clock"
        />
        <MetricCard
          label="Sudah ACC"
          value={verifCounts.acc}
          sub={rp(sumBy(verifRows.filter((r) => r.status === PAY.ACC), (r) => r.amount))}
          tone="emerald"
          icon="check"
        />
        <MetricCard
          label="Ditolak"
          value={verifCounts.tolak}
          sub="Perlu perbaikan bukti"
          tone="red"
          icon="alert"
        />
        <MetricCard
          label="Total Dokumen"
          value={verifCounts.all}
          sub={verifMeta.kind === 'Deposit' ? 'Termasuk saldo deposit' : 'Semua bukti pembayaran'}
          tone="violet"
          icon="file"
        />
      </div>

      <Card
        title={`Dokumen ${verifMeta.kind}`}
        subtitle={
          verifMeta.kind === 'Deposit'
            ? 'Saldo mitra otomatis bertambah setelah deposit di-ACC.'
            : 'Cocokkan nominal, rekening, dan tanggal transfer dengan mutasi bank.'
        }
        action={
          <Segmented
            value={verifTab}
            onChange={setVerifTab}
            options={[
              { value: 'menunggu', label: 'Menunggu', count: verifCounts.menunggu },
              { value: 'acc', label: 'ACC', count: verifCounts.acc },
              { value: 'tolak', label: 'Ditolak', count: verifCounts.tolak },
              { value: 'all', label: 'Semua', count: verifCounts.all }
            ]}
          />
        }
      >
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="w-full sm:w-80">
            <SearchBox
              value={verifSearch}
              onChange={setVerifSearch}
              placeholder="Cari invoice, mitra, produk..."
            />
          </div>
        </div>
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Referensi</th>
              <th className={TH}>Mitra</th>
              <th className={TH}>Produk / Keterangan</th>
              <th className={`${TH} text-right`}>Nominal</th>
              <th className={TH}>Status</th>
              <th className={TH}>Bukti</th>
              <th className={TH}>Verifikasi</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shownVerif.map((row) => (
              <tr key={row.key} className="hover:bg-gray-50/70">
                <td className={TD}>
                  {row.order ? (
                    <button
                      type="button"
                      onClick={() => setDetailInvoice(row.order.invoice)}
                      className="font-bold text-sky-700 hover:underline cursor-pointer"
                    >
                      {row.ref}
                    </button>
                  ) : (
                    <p className="font-bold text-gray-900">{row.ref}</p>
                  )}
                  <p className="text-[10px] text-gray-400">{fmtDate(row.date)}</p>
                </td>
                <td className={TD}>
                  <p className="font-semibold text-gray-900">{row.mitraName}</p>
                  <p className="text-[10px] text-gray-400">{row.level}</p>
                </td>
                <td className={`${TD} max-w-[220px]`}>
                  <p className="text-gray-800">{row.produk}</p>
                  {row.note && <p className="text-[10px] text-rose-600">{row.note}</p>}
                </td>
                <td className={`${TD} text-right font-bold text-gray-900`}>{rp(row.amount)}</td>
                <td className={TD}>
                  <Badge tone={payTone(row.status)}>{row.status || '—'}</Badge>
                </td>
                <td className={TD}>
                  <ProofThumb
                    src={row.proof}
                    onClick={() => setProofView({ src: row.proof, title: `Bukti ${verifMeta.kind} ${row.ref}` })}
                  />
                </td>
                <td className={TD}>
                  {row.verifiedBy ? (
                    <>
                      <p className="text-[11px] font-medium text-gray-800">{row.verifiedBy}</p>
                      <p className="text-[10px] text-gray-400">{fmtDate(row.date)}</p>
                    </>
                  ) : (
                    <span className="text-[11px] text-gray-400"> — </span>
                  )}
                </td>
                <td className={`${TD} text-right`}>
                  {row.status === PAY.MENUNGGU ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="dangerOutline"
                        onClick={() =>
                          setReasonModal({
                            title: `Tolak ${verifMeta.kind}`,
                            subtitle: `${row.ref} · ${row.mitraName} · ${rp(row.amount)}`,
                            label: 'Alasan penolakan',
                            placeholder: 'Contoh: nominal tidak sesuai mutasi / bukti tidak terbaca',
                            confirmLabel: 'Tolak pembayaran',
                            danger: true,
                            onSubmit: (note) => {
                              rejectPayment(row, note);
                              setReasonModal(null);
                            }
                          })
                        }
                      >
                        Tolak
                      </Button>
                      <Button
                        size="xs"
                        icon="check"
                        onClick={() =>
                          setConfirmModal({
                            title: `ACC ${verifMeta.kind}`,
                            message:
                              verifMeta.kind === 'Deposit'
                                ? `Verifikasi deposit ${row.mitraName} sebesar ${rp(row.amount)}? Saldo mitra akan bertambah.`
                                : `Verifikasi ${verifMeta.kind} ${row.ref} sebesar ${rp(row.amount)}? Pastikan dana sudah masuk rekening.`,
                            confirmLabel: 'ACC pembayaran',
                            onConfirm: () => approvePayment(row)
                          })
                        }
                      >
                        ACC
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400">
                      {row.status === PAY.ACC ? 'Terbukti' : 'Ditolak'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {shownVerif.length === 0 && (
          <EmptyState
            title="Tidak ada dokumen"
            desc="Belum ada bukti pembayaran pada filter ini."
            icon={verifMeta.icon || 'card'}
          />
        )}
      </Card>
    </>
  );
}
