import React from 'react';
import {
  Badge,
  Button,
  Card,
  Icon,
  MetricCard,
  PAY,
  PageHead,
  PoClosingReminder,
  TerminDueReminder,
  fmtDate,
  orderStage,
  roleLabel,
  rp,
  sumBy
} from '../poCore';

export default function FinanceOverviewTab({
  role = 'finance',
  products = [],
  orders = [],
  ledger = [],
  bankAccounts = [],
  totalPendingDocs = 0,
  totalPendingValue = 0,
  pendingDp = [],
  pendingPelunasan = [],
  pendingOngkir = [],
  pendingDeposit = [],
  kasMasuk = 0,
  kasKeluar = 0,
  piutang = 0,
  activeOrders = [],
  readyToShip = [],
  needOngkir = [],
  shippedOrders = [],
  agingRows = [],
  pendingPr = [],
  approvedPr = [],
  stageMeta = () => ({ label: '', tone: 'gray' }),
  goTo = () => {},
  openWA = () => {},
  VERIF_META = {},
  DEP_META = {},
  accent = { text: 'text-emerald-700' }
}) {
  return (
    <>
      <PageHead
        title="Dashboard Finance"
        desc="Pantau verifikasi pembayaran, input ongkir, pengiriman, dan arus kas PO dalam satu tempat."
        badge={<Badge tone="emerald">{roleLabel(role)}</Badge>}
        actions={
          <>
            <Button variant="outline" icon="upload" onClick={() => goTo('input_bukti')}>
              Input Bukti TF
            </Button>
            <Button icon="plus" onClick={() => goTo('pengajuan')}>
              Ajukan Pembayaran
            </Button>
          </>
        }
      />

      <div className="space-y-2">
        <PoClosingReminder products={products} onAction={() => goTo('reminder')} actionLabel="Buka Reminder" />
        <TerminDueReminder products={products} onAction={() => goTo('reminder')} actionLabel="Buka Reminder" />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Menunggu Verifikasi"
          value={totalPendingDocs}
          sub={rp(totalPendingValue)}
          tone="blue"
          icon="wallet"
          badge={totalPendingDocs > 0 ? <Badge tone="blue">Perlu tindakan</Badge> : null}
          hint={`${pendingDp.length} DP · ${pendingPelunasan.length} pelunasan · ${pendingOngkir.length} ongkir · ${pendingDeposit.length} deposit`}
        />
        <MetricCard
          label="Kas Masuk"
          value={rp(kasMasuk)}
          sub={`${ledger.filter((l) => l.status === PAY.ACC).length} transaksi ACC`}
          tone="emerald"
          icon="card"
          hint="Pembayaran mitra & deposit yang sudah ACC"
          onClick={() => goTo('buku_kas')}
        />
        <MetricCard
          label="Piutang Berjalan"
          value={rp(piutang)}
          sub={`${activeOrders.length} pesanan aktif`}
          tone="red"
          icon="receipt"
          hint="Sisa tagihan mitra yang belum lunas"
          onClick={() => goTo('reminder')}
        />
        <MetricCard
          label="Siap Dikirim"
          value={readyToShip.length}
          sub={`${needOngkir.length} pesanan perlu input ongkir`}
          tone="orange"
          icon="truck"
          hint={`${shippedOrders.length} sedang dalam pengiriman`}
          onClick={() => goTo('pengiriman')}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title="Antrean Verifikasi"
          subtitle="Pembayaran menunggu pengecekan mutasi"
          className="lg:col-span-2"
          action={<Badge tone="blue">{totalPendingDocs} dokumen</Badge>}
        >
          <div className="divide-y divide-gray-100">
            {[
              { meta: VERIF_META?.verif_dp || {}, rows: pendingDp, amount: sumBy(pendingDp, (o) => o.dpNominal), menu: 'verif_dp' },
              { meta: VERIF_META?.verif_pelunasan || {}, rows: pendingPelunasan, amount: sumBy(pendingPelunasan, (o) => o.pelunasanNominal), menu: 'verif_pelunasan' },
              { meta: VERIF_META?.verif_ongkir || {}, rows: pendingOngkir, amount: sumBy(pendingOngkir, (o) => o.ongkir), menu: 'verif_ongkir' },
              { meta: DEP_META || {}, rows: pendingDeposit, amount: sumBy(pendingDeposit, (d) => d.nominal), menu: 'verif_deposit' }
            ].map(({ meta, rows, amount, menu }) => (
              <button
                key={menu}
                type="button"
                onClick={() => goTo(menu)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    meta.tone === 'blue'
                      ? 'bg-sky-50 text-sky-700'
                      : meta.tone === 'indigo'
                      ? 'bg-indigo-50 text-indigo-700'
                      : meta.tone === 'orange'
                      ? 'bg-orange-50 text-orange-600'
                      : 'bg-violet-50 text-violet-700'
                  }`}>
                    <Icon name={meta.icon || 'card'} className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900">{meta.title}</p>
                    <p className="text-[10px] text-gray-400">{rows.length} dokumen menunggu</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-gray-900">{rp(amount)}</p>
                  <p className="text-[10px] text-sky-700 font-semibold">Periksa → </p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Operasional Hari Ini" subtitle="Pekerjaan lapangan yang menunggu">
          <div className="p-4 space-y-3">
            <button
              type="button"
              onClick={() => goTo('ongkir')}
              className="w-full flex items-center justify-between gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 text-left hover:bg-orange-100/70 cursor-pointer"
            >
              <div>
                <p className="text-[11px] font-bold text-orange-800">Input ongkir</p>
                <p className="text-[10px] text-orange-700/70">Pesanan ready dengan alamat lengkap</p>
              </div>
              <span className="text-lg font-bold text-orange-700">{needOngkir.length}</span>
            </button>
            <button
              type="button"
              onClick={() => goTo('pengiriman')}
              className="w-full flex items-center justify-between gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2.5 text-left hover:bg-teal-100/70 cursor-pointer"
            >
              <div>
                <p className="text-[11px] font-bold text-teal-800">Input resi</p>
                <p className="text-[10px] text-teal-700/70">Sudah lunas & siap dikirim</p>
              </div>
              <span className="text-lg font-bold text-teal-700">{readyToShip.length}</span>
            </button>
            <button
              type="button"
              onClick={() => goTo('pengajuan')}
              className="w-full flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-left hover:bg-amber-100/70 cursor-pointer"
            >
              <div>
                <p className="text-[11px] font-bold text-amber-800">Pengajuan aktif</p>
                <p className="text-[10px] text-amber-700/70">
                  {approvedPr.length} disetujui owner · menunggu transfer
                </p>
              </div>
              <span className="text-lg font-bold text-amber-700">{pendingPr.length}</span>
            </button>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[10px] font-semibold uppercase text-gray-400 mb-1">Dana keluar</p>
              <p className="text-sm font-bold text-rose-600">{rp(kasKeluar)}</p>
              <p className="text-[10px] text-gray-400">Pengajuan yang sudah ditransfer owner</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card
          title="Tagihan Jatuh Tempo"
          subtitle="Prioritas penagihan mitra"
          action={
            <button type="button" onClick={() => goTo('reminder')} className={`text-[10px] font-bold ${accent.text} hover:underline cursor-pointer`}>
              Lihat semua
            </button>
          }
        >
          <div className="divide-y divide-gray-100">
            {agingRows.slice(0, 5).map((o) => (
              <div key={o.invoice} className="px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-gray-900">
                    {o.invoice} <span className="font-normal text-gray-500"> · {o.mitraName}</span>
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Jatuh tempo {fmtDate(o.due)} {o.late > 0 ? ` · terlambat ${o.late} hari` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-bold text-rose-600">{rp(o.outstanding)}</p>
                  <button
                    type="button"
                    onClick={() => openWA(o, 'ringkasan')}
                    className="text-[10px] font-bold text-sky-700 hover:underline cursor-pointer"
                  >
                    Reminder WA
                  </button>
                </div>
              </div>
            ))}
            {agingRows.length === 0 && (
              <p className="px-4 py-6 text-center text-[11px] text-gray-400">Tidak ada piutang berjalan.</p>
            )}
          </div>
        </Card>

        <Card
          title="Posisi Tahap Pesanan"
          subtitle="Distribusi seluruh pesanan PO"
          action={<Badge tone="gray">{orders.length} pesanan</Badge>}
        >
          <div className="p-4 space-y-2">
            {['dp', 'produksi', 'alamat', 'ongkir', 'pelunasan', 'ongkir_bayar', 'kirim', 'dikirim', 'selesai'].map((id) => {
              const count = orders.filter((o) => orderStage(o) === id).length;
              const meta = stageMeta(id);
              return (
                <div key={id} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-24 shrink-0">{meta.label}</span>
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
                  <span className="text-[10px] font-bold text-gray-700 w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
