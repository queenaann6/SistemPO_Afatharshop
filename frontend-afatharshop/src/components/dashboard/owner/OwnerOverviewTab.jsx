import React from 'react';
import {
  Badge,
  Button,
  Card,
  Icon,
  MetricCard,
  PageHead,
  fmtDate,
  roleLabel,
  rp
} from '../poCore';

export default function OwnerOverviewTab({
  omzet = 0,
  validOrders = [],
  dpCollected = 0,
  kasMasuk = 0,
  kasKeluar = 0,
  approvals = [],
  pendingOwnerValue = 0,
  piutang = 0,
  activeOrders = [],
  readyTransfer = [],
  stageCounts = {},
  stageMeta = () => ({ label: '', tone: 'gray' }),
  orders = [],
  brandPerf = [],
  auditEvents = [],
  agingRows = [],
  goTo = () => {},
  setStageFilter = () => {},
  setReasonModal = () => {},
  approvePR = () => {},
  decidePR = () => {},
  setTransferModal = () => {},
  accent = { text: 'text-amber-700' }
}) {
  return (
    <>
      <PageHead
        title="Ringkasan Eksekutif"
        desc="Pantau omzet, arus kas, persetujuan dana, dan kesehatan operasional PO dalam satu tampilan."
        badge={<Badge tone="amber">{roleLabel('owner')}</Badge>}
        actions={
          <>
            <Button variant="outline" icon="eye" onClick={() => goTo('audit')}>
              Audit Trail
            </Button>
            <Button variant="gold" icon="wallet" onClick={() => goTo('persetujuan')}>
              Persetujuan Dana
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Omzet PO"
          value={rp(omzet)}
          sub={`${validOrders.length} pesanan valid`}
          tone="emerald"
          icon="wallet"
          hint={`DP terkumpul ${rp(dpCollected)}`}
        />
        <MetricCard
          label="Arus Kas Bersih"
          value={rp(kasMasuk - kasKeluar)}
          sub={`Masuk ${rp(kasMasuk)} · Keluar ${rp(kasKeluar)}`}
          tone={kasMasuk - kasKeluar >= 0 ? 'blue' : 'red'}
          icon="card"
          onClick={() => goTo('buku_kas')}
        />
        <MetricCard
          label="Menunggu Approval"
          value={approvals.length}
          sub={rp(pendingOwnerValue)}
          tone="amber"
          icon="shield"
          badge={approvals.length > 0 ? <Badge tone="amber">Butuh keputusan</Badge> : null}
          onClick={() => goTo('persetujuan')}
        />
        <MetricCard
          label="Piutang Mitra"
          value={rp(piutang)}
          sub={`${activeOrders.length} pesanan aktif`}
          tone="red"
          icon="receipt"
          onClick={() => goTo('piutang')}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card
          title="Menunggu Persetujuan Anda"
          subtitle="Pengajuan dana yang sudah lolos review purchasing"
          action={<Badge tone="amber">{approvals.length}</Badge>}
        >
          <div className="divide-y divide-gray-100">
            {approvals.slice(0, 5).map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-gray-900">
                      {r.code} <span className="font-normal text-gray-500">· {r.purpose}</span>
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {rp(r.amount)} · diajukan {r.createdBy} · {r.bank}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="xs"
                      variant="dangerOutline"
                      onClick={() =>
                        setReasonModal({
                          title: 'Tolak pengajuan',
                          subtitle: `${r.code} · ${rp(r.amount)}`,
                          label: 'Alasan penolakan',
                          confirmLabel: 'Tolak',
                          danger: true,
                          onSubmit: (note) => {
                            decidePR(r, 'TOLAK', note);
                            setReasonModal(null);
                          }
                        })
                      }
                    >
                      Tolak
                    </Button>
                    <Button size="xs" variant="gold" onClick={() => approvePR(r)}>
                      Setujui
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {approvals.length === 0 && (
              <p className="px-4 py-8 text-center text-[11px] text-gray-400">
                Tidak ada pengajuan yang menunggu persetujuan.
              </p>
            )}
          </div>
        </Card>

        <Card
          title="Siap Ditransfer"
          subtitle="Pengajuan yang sudah disetujui, menunggu bukti transfer"
          action={<Badge tone="blue">{readyTransfer.length}</Badge>}
        >
          <div className="divide-y divide-gray-100">
            {readyTransfer.slice(0, 5).map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-900">
                    {r.code} <span className="font-normal text-gray-500">· {r.purpose}</span>
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {rp(r.amount)} · {r.bank} {r.accountNo} a.n {r.holder}
                  </p>
                </div>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setTransferModal({ req: r, form: { note: '', ref: '', proof: '', proofFile: null } })}
                >
                  Tandai Transfer
                </Button>
              </div>
            ))}
            {readyTransfer.length === 0 && (
              <p className="px-4 py-8 text-center text-[11px] text-gray-400">
                Tidak ada dana yang siap ditransfer.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Pipeline Pesanan" subtitle="Posisi seluruh pesanan" className="lg:col-span-2">
          <div className="p-4 grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {['baru', 'dp', 'produksi', 'alamat', 'ongkir', 'pelunasan', 'ongkir_bayar', 'kirim', 'dikirim', 'selesai'].map((id) => {
              const count = stageCounts[id] || 0;
              const meta = stageMeta(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setStageFilter(id);
                    goTo('pesanan');
                  }}
                  className="w-full flex items-center gap-2 group cursor-pointer"
                >
                  <span className="text-[10px] text-gray-500 w-24 text-left shrink-0">{meta.label}</span>
                  <span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <span
                      className={`block h-full rounded-full ${
                        meta.tone === 'amber'
                          ? 'bg-amber-400'
                          : meta.tone === 'blue'
                          ? 'bg-sky-500'
                          : meta.tone === 'violet'
                          ? 'bg-violet-500'
                          : meta.tone === 'cyan'
                          ? 'bg-cyan-500'
                          : meta.tone === 'orange'
                          ? 'bg-orange-400'
                          : meta.tone === 'indigo'
                          ? 'bg-indigo-500'
                          : meta.tone === 'teal'
                          ? 'bg-teal-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (count / Math.max(1, orders.length)) * 100)}%` }}
                    />
                  </span>
                  <span className="text-[10px] font-bold text-gray-700 w-6 text-right">{count}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Kinerja Brand" subtitle="Kontribusi omzet terbesar">
          <div className="divide-y divide-gray-100">
            {brandPerf.slice(0, 5).map((b) => (
              <div key={b.key} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-gray-900">{b.key}</p>
                  <p className="text-[11px] font-bold text-gray-900">{rp(b.nilai)}</p>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-[10px] text-gray-400">
                    {b.invoices} invoice · {b.qty} pcs
                  </p>
                  <p className="text-[10px] text-rose-500">Piutang {rp(b.outstanding)}</p>
                </div>
              </div>
            ))}
            {brandPerf.length === 0 && (
              <p className="px-4 py-6 text-center text-[11px] text-gray-400">Belum ada data omzet.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card
          title="Aktivitas Terbaru"
          subtitle="Jejak audit lintas modul"
          action={
            <button type="button" onClick={() => goTo('audit')} className={`text-[10px] font-bold ${accent.text} hover:underline cursor-pointer`}>
              Lihat semua
            </button>
          }
        >
          <div className="divide-y divide-gray-100">
            {auditEvents.slice(0, 6).map((e, i) => (
              <div key={`${e.ref}-${e.type}-${i}`} className="px-4 py-2.5 flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="eye" className="w-3 h-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-gray-900">
                    {e.type} <span className="font-normal text-gray-400">· {e.ref}</span>
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {e.actor} · {fmtDate(e.date)} · {e.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Piutang Jatuh Tempo"
          subtitle="Fokus penagihan mitra"
          action={<Badge tone="red">{agingRows.filter((o) => o.late > 0).length} terlambat</Badge>}
        >
          <div className="divide-y divide-gray-100">
            {agingRows.slice(0, 5).map((o) => (
              <div key={o.invoice} className="px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-gray-900">
                    {o.invoice} <span className="font-normal text-gray-500">· {o.mitraName}</span>
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Jatuh tempo {fmtDate(o.due)} {o.late > 0 ? `· terlambat ${o.late} hari` : ''}
                  </p>
                </div>
                <p className="text-[11px] font-bold text-rose-600 shrink-0">{rp(o.outstanding)}</p>
              </div>
            ))}
            {agingRows.length === 0 && (
              <p className="px-4 py-8 text-center text-[11px] text-gray-400">Semua tagihan lancar.</p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
