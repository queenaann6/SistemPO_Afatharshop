import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MetricCard,
  PageHead,
  SHIP,
  Segmented,
  TD,
  TH,
  TableWrap,
  addressText,
  fmtDate,
  rp,
  sumBy
} from '../poCore';

const DEFAULT_SHIP_TABS = [
  { value: 'siap', label: 'Siap Kirim' },
  { value: 'dikirim', label: 'Dikirim' },
  { value: 'selesai', label: 'Selesai' }
];

export default function FinanceShippingResiTab({
  readyToShip = [],
  shippedOrders = [],
  doneOrders = [],
  shipTab = 'siap',
  setShipTab = () => {},
  shipTabs = DEFAULT_SHIP_TABS,
  setDetailInvoice = () => {},
  openWA = () => {},
  setResiModal = () => {},
  markReceived = () => {}
}) {
  return (
    <>
      <PageHead
        title="Pengiriman & Input Resi"
        desc="Input nomor resi setelah pembayaran lunas, pantau paket yang dikirim, dan tandai pesanan diterima."
        badge={<Badge tone="teal">{readyToShip.length} siap kirim</Badge>}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Siap Kirim" value={readyToShip.length} sub="Lunas & menunggu resi" tone="teal" icon="box" />
        <MetricCard label="Dikirim" value={shippedOrders.length} sub="Dalam perjalanan" tone="blue" icon="truck" />
        <MetricCard label="Selesai" value={doneOrders.length} sub="Dikonfirmasi diterima" tone="emerald" icon="check" />
        <MetricCard
          label="Total Nilai Dikirim"
          value={rp(sumBy([...shippedOrders, ...doneOrders], (o) => o.subtotal))}
          sub={`${shippedOrders.length + doneOrders.length} pesanan`}
          tone="violet"
          icon="receipt"
        />
      </div>

      <Card
        title="Daftar Pengiriman"
        subtitle="Kelola resi dan status paket"
        action={<Segmented value={shipTab} onChange={setShipTab} options={shipTabs} />}
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Invoice</th>
              <th className={TH}>Mitra</th>
              <th className={TH}>Alamat</th>
              <th className={TH}>Ekspedisi / Ongkir</th>
              <th className={TH}>Resi</th>
              <th className={TH}>Status</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(shipTab === 'siap' ? readyToShip : shipTab === 'dikirim' ? shippedOrders : doneOrders).map((o) => (
              <tr key={o.invoice} className="hover:bg-gray-50/70">
                <td className={TD}>
                  <button
                    type="button"
                    onClick={() => setDetailInvoice(o.invoice)}
                    className="font-bold text-sky-700 hover:underline cursor-pointer"
                  >
                    {o.invoice}
                  </button>
                  <p className="text-[10px] text-gray-400">{o.produk} · {o.qty} pcs</p>
                </td>
                <td className={TD}>
                  <p className="font-semibold text-gray-900">{o.mitraName}</p>
                  <p className="text-[10px] text-gray-400">{o.phone}</p>
                </td>
                <td className={`${TD} max-w-[240px] text-[11px] text-gray-600`}>{addressText(o)}</td>
                <td className={TD}>
                  <p className="text-gray-800">{o.ekspedisi || ' — '}</p>
                  <p className="text-[10px] text-gray-400">{o.ongkir ? rp(o.ongkir) : ' — '} · {o.weight ? `${o.weight} kg` : ' — '}</p>
                </td>
                <td className={TD}>
                  {o.resi ? (
                    <>
                      <p className="font-mono text-[11px] font-semibold text-gray-900">{o.resi}</p>
                      <p className="text-[10px] text-gray-400">{o.shippedAt ? fmtDate(o.shippedAt) : ''}</p>
                    </>
                  ) : (
                    <span className="text-[11px] text-gray-400">Belum ada resi</span>
                  )}
                </td>
                <td className={TD}>
                  <Badge
                    tone={
                      o.shipStatus === SHIP.DITERIMA
                        ? 'emerald'
                        : o.shipStatus === SHIP.DIKIRIM
                        ? 'blue'
                        : o.shipStatus === SHIP.SIAP
                        ? 'teal'
                        : 'gray'
                    }
                  >
                    {o.shipStatus}
                  </Badge>
                </td>
                <td className={`${TD} text-right`}>
                  <div className="flex items-center justify-end gap-1.5">
                    {shipTab === 'siap' && (
                      <Button
                        size="xs"
                        icon="truck"
                        onClick={() =>
                          setResiModal({
                            order: o,
                            form: { resi: '', notify: true }
                          })
                        }
                      >
                        Input Resi
                      </Button>
                    )}
                    {shipTab === 'dikirim' && (
                      <>
                        <Button size="xs" variant="outline" icon="chat" onClick={() => openWA(o, 'shipped')}>
                          WA
                        </Button>
                        <Button size="xs" icon="check" onClick={() => markReceived(o)}>
                          Diterima
                        </Button>
                      </>
                    )}
                    {shipTab === 'selesai' && o.receivedAt && (
                      <span className="text-[10px] text-gray-400">{fmtDate(o.receivedAt)}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {((shipTab === 'siap' && readyToShip.length === 0) ||
          (shipTab === 'dikirim' && shippedOrders.length === 0) ||
          (shipTab === 'selesai' && doneOrders.length === 0)) && (
          <EmptyState
            title="Tidak ada pesanan"
            desc="Belum ada pesanan pada tahap ini."
            icon="truck"
          />
        )}
      </Card>
    </>
  );
}
