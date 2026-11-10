import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MKT,
  MetricCard,
  OrdersTable,
  PageHead,
  PoClosingReminder,
  ProgressBar,
  TD,
  TH,
  TableWrap,
  TerminDueReminder,
  diffDays,
  fmtDate,
  roleLabel,
  rp,
  sumBy,
  todayISO
} from '../poCore';

export default function PurchasingOverviewTab({
  pageDesc = 'Monitoring pesanan, persetujuan checkout mitra, progres produksi, dan performa katalog pre-order.',
  exportProducts = () => {},
  goTo = () => {},
  products = [],
  pendingAcc = [],
  activeOrders = [],
  orders = [],
  omzet = 0,
  dpCollected = 0,
  mitra = [],
  marketingPR = [],
  setDetailInvoice = () => {},
  setPrDetailId = () => {},
  stageMetaStages = [],
  stageCounts = {},
  setStageFilter = () => {},
  barTone = {},
  stageMeta = () => ({ label: '', tone: 'gray' }),
  productSummary = [],
  approveOrder = () => {},
  accent = { text: 'text-rose-700' }
}) {
  return (
    <>
      <PageHead
        title="Dashboard Purchasing"
        desc={pageDesc}
        badge={<Badge tone="red">{roleLabel('marketing')}</Badge>}
        actions={
          <>
            <Button variant="outline" icon="download" onClick={exportProducts}>
              Rekap Produk
            </Button>
            <Button icon="plus" onClick={() => goTo('tambah_pesanan')}>
              Input Pesanan
            </Button>
          </>
        }
      />

      <div className="space-y-2">
        <PoClosingReminder products={products} onAction={() => goTo('produk')} actionLabel="Kelola Katalog" />
        <TerminDueReminder products={products} onAction={() => goTo('produk')} actionLabel="Kelola Termin" />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Pesanan Masuk"
          value={pendingAcc.length}
          sub="Menunggu ACC purchasing"
          tone="amber"
          icon="clock"
          badge={pendingAcc.length > 0 ? <Badge tone="amber">Perlu ACC</Badge> : null}
          onClick={() => goTo('acc_pesanan')}
        />
        <MetricCard
          label="Pesanan Aktif"
          value={activeOrders.length}
          sub={`${orders.length} total pesanan`}
          tone="blue"
          icon="box"
          hint="Belum selesai / belum ditolak"
        />
        <MetricCard
          label="Omzet PO"
          value={rp(omzet)}
          sub={`DP terkumpul ${rp(dpCollected)}`}
          tone="emerald"
          icon="wallet"
          hint={`${sumBy(orders, (o) => o.qty)} pcs total checkout`}
        />
        <MetricCard
          label="Mitra Aktif"
          value={mitra.filter((m) => m.active).length}
          sub={`${products.filter((p) => p.status === 'open').length} PO sedang dibuka`}
          tone="violet"
          icon="users"
          hint="Mitra dengan akses checkout"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title="Perlu Tindakan"
          subtitle="Antrean yang menunggu admin purchasing"
          className="lg:col-span-2"
          action={<Badge tone="amber">{pendingAcc.length + marketingPR.length} item</Badge>}
        >
          <div className="divide-y divide-gray-100">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-gray-800">Pesanan menunggu ACC</p>
                <button type="button" onClick={() => goTo('acc_pesanan')} className={`text-[10px] font-bold ${accent.text} hover:underline cursor-pointer`}>
                  Lihat semua
                </button>
              </div>
              {pendingAcc.slice(0, 4).map((o) => (
                <div key={o.invoice} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-900">
                      {o.invoice} <span className="font-normal text-gray-500">· {o.mitraName}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {o.produk} {o.variant} · {o.qty} pcs · {rp(o.subtotal)}
                    </p>
                  </div>
                  <Button size="xs" onClick={() => setDetailInvoice(o.invoice)}>
                    Review
                  </Button>
                </div>
              ))}
              {pendingAcc.length === 0 && (
                <p className="text-[11px] text-gray-400 py-2">Tidak ada pesanan menunggu ACC.</p>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-gray-800">Pengajuan pembayaran perlu review</p>
                <button type="button" onClick={() => goTo('pengajuan')} className={`text-[10px] font-bold ${accent.text} hover:underline cursor-pointer`}>
                  Lihat semua
                </button>
              </div>
              {marketingPR.slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-900">
                      {r.code} <span className="font-normal text-gray-500">· {r.purpose}</span>
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {rp(r.amount)} · diajukan {r.createdBy}
                    </p>
                  </div>
                  <Button size="xs" variant="outline" onClick={() => { setPrDetailId(r.id); goTo('pengajuan'); }}>
                    Review
                  </Button>
                </div>
              ))}
              {marketingPR.length === 0 && (
                <p className="text-[11px] text-gray-400 py-2">Tidak ada pengajuan yang perlu direview.</p>
              )}
            </div>
          </div>
        </Card>

        <Card title="Pipeline Pesanan" subtitle="Posisi seluruh pesanan saat ini">
          <div className="p-4 space-y-2.5">
            {stageMetaStages.map((s) => {
              const count = stageCounts[s.id] || 0;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setStageFilter(s.id);
                    goTo('pesanan');
                  }}
                  className="w-full flex items-center gap-2 group cursor-pointer"
                >
                  <span className="text-[10px] text-gray-500 w-24 text-left shrink-0">{s.label}</span>
                  <span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <span
                      className={`block h-full rounded-full ${barTone[stageMeta(s.id).tone] || 'bg-gray-400'}`}
                      style={{ width: `${Math.min(100, (count / Math.max(1, orders.length)) * 100)}%` }}
                    />
                  </span>
                  <span className="text-[10px] font-bold text-gray-700 w-6 text-right">{count}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card
          title="Rekap Checkout Teratas"
          subtitle="Produk dengan kontribusi omzet terbesar"
          action={
            <button type="button" onClick={() => goTo('rekap_produk')} className={`text-[10px] font-bold ${accent.text} hover:underline cursor-pointer`}>
              Rekap lengkap
            </button>
          }
        >
          <TableWrap fluid>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={TH}>Produk</th>
                <th className={`${TH} text-right`}>Qty</th>
                <th className={`${TH} text-right`}>Omzet</th>
                <th className={`${TH} text-right hidden xl:table-cell`}>Sisa Kuota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productSummary
                .slice()
                .sort((a, b) => b.qtySold - a.qtySold)
                .slice(0, 5)
                .map((p) => (
                  <tr key={p.id}>
                    <td className={TD}>
                      <p className="font-semibold text-gray-900">{p.title}</p>
                      <p className="text-[10px] text-gray-400">
                        {p.brand} · {p.invoiceCount} invoice
                      </p>
                    </td>
                    <td className={`${TD} text-right font-semibold`}>{p.qtySold}</td>
                    <td className={`${TD} text-right font-bold text-gray-900 whitespace-nowrap`}>{rp(p.omzet)}</td>
                    <td className={`${TD} text-right hidden xl:table-cell`}>
                      <Badge tone={p.remaining === 0 ? 'red' : p.remaining < 10 ? 'amber' : 'emerald'}>
                        {p.remaining} pcs
                      </Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </TableWrap>
        </Card>

        <Card title="Katalog Segera Tutup" subtitle="PO yang berakhir dalam 10 hari">
          <div className="divide-y divide-gray-100">
            {products
              .filter((p) => p.status === 'open')
              .sort((a, b) => String(a.closeDate).localeCompare(String(b.closeDate)))
              .slice(0, 5)
              .map((p) => {
                const d = diffDays(p.closeDate, todayISO());
                const used = sumBy(p.variants, (v) => v.used);
                const quota = sumBy(p.variants, (v) => v.quota);
                return (
                  <div key={p.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold text-gray-900">{p.title}</p>
                        <p className="text-[10px] text-gray-400">
                          {p.brand} · tutup {fmtDate(p.closeDate)}
                        </p>
                      </div>
                      <Badge tone={d <= 0 ? 'red' : d <= 3 ? 'amber' : 'emerald'}>
                        {d < 0 ? 'Ditutup' : d === 0 ? 'Hari ini' : `${d} hari`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <ProgressBar value={used} max={quota || 1} tone={used / (quota || 1) > 0.85 ? 'red' : 'emerald'} className="flex-1" />
                      <span className="text-[10px] text-gray-400">
                        {used}/{quota} pcs
                      </span>
                    </div>
                  </div>
                );
              })}
            {products.filter((p) => p.status === 'open').length === 0 && (
              <EmptyState title="Tidak ada PO aktif" desc="Buka PO baru dari menu katalog produk." icon="box" />
            )}
          </div>
        </Card>
      </div>

      <Card
        title="Pesanan Terbaru"
        subtitle="6 pesanan terakhir dari tim & checkout mitra"
        action={
          <Button size="xs" variant="outline" onClick={() => goTo('pesanan')}>
            Semua pesanan
          </Button>
        }
      >
        <OrdersTable
          orders={orders.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 6)}
          onOpen={(o) => setDetailInvoice(o.invoice)}
          renderActions={(o) => (
            <>
              {o.marketingStatus === MKT.PENDING ? (
                <Button size="xs" onClick={() => approveOrder(o)}>
                  ACC
                </Button>
              ) : (
                <Button size="xs" variant="outline" onClick={() => setDetailInvoice(o.invoice)}>
                  Detail
                </Button>
              )}
            </>
          )}
        />
      </Card>
    </>
  );
}
