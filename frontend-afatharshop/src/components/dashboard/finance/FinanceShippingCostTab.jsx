import React, { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MetricCard,
  PAY,
  PageHead,
  PayBadge,
  TD,
  TH,
  TableWrap,
  addressText,
  copyText,
  fmtDate,
  payTone,
  rp,
  sumBy
} from '../poCore';
import {
  extractOrderShippingLabels,
  formatAllShippingLabelsText,
  openShippingLabelsPrintTab
} from '../../../utils/printShippingLabel';

export default function FinanceShippingCostTab({
  needOngkir = [],
  orders = [],
  setDetailInvoice = () => {},
  openWA = () => {},
  setOngkirModal = () => {},
  goTo = () => {}
}) {
  const [copiedInv, setCopiedInv] = useState('');
  const handleCopyAddress = async (o) => {
    const text = formatAllShippingLabelsText(o);
    const ok = await copyText(text);
    if (ok) {
      setCopiedInv(o.invoice);
      setTimeout(() => setCopiedInv((prev) => (prev === o.invoice ? '' : prev)), 2000);
    } else if (typeof window !== 'undefined' && window.prompt) {
      window.prompt('Salin teks label pengiriman (Ctrl+C):', text);
    }
  };
  return (
    <>
      <PageHead
        title="Input Ongkir & Ekspedisi"
        desc="Pesanan yang sudah READY dan memiliki alamat lengkap siap dihitung ongkirnya. Mitra akan menerima tagihan otomatis."
        badge={<Badge tone="orange">{needOngkir.length} pesanan menunggu</Badge>}
        actions={
          <Button variant="outline" icon="chat" onClick={() => goTo('pengiriman')}>
            Lihat Pengiriman
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Perlu Input Ongkir" value={needOngkir.length} sub="Ready + alamat lengkap" tone="orange" icon="truck" />
        <MetricCard
          label="Menunggu Bayar Ongkir"
          value={orders.filter((o) => o.ongkirStatus === PAY.BELUM && o.ongkir > 0).length}
          sub={rp(sumBy(orders.filter((o) => o.ongkirStatus === PAY.BELUM), (o) => o.ongkir))}
          tone="amber"
          icon="wallet"
        />
        <MetricCard label="Ongkir Terverifikasi" value={orders.filter((o) => o.ongkirStatus === PAY.ACC).length} sub="Siap masuk pengiriman" tone="emerald" icon="check" />
        <MetricCard
          label="Total Ongkir Ditagihkan"
          value={rp(sumBy(orders.filter((o) => o.ongkir > 0), (o) => o.ongkir))}
          sub={`${orders.filter((o) => o.ongkir > 0).length} pesanan`}
          tone="blue"
          icon="card"
        />
      </div>

      <Card
        title="Perlu Input Ongkir"
        subtitle="Hitung ongkir berdasarkan ekspedisi dan berat"
        action={<Badge tone="orange">{needOngkir.length}</Badge>}
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Invoice</th>
              <th className={TH}>Mitra</th>
              <th className={TH}>Produk</th>
              <th className={TH}>Alamat Pengiriman</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {needOngkir.map((o) => (
              <tr key={o.invoice} className="hover:bg-gray-50/70">
                <td className={TD}>
                  <button
                    type="button"
                    onClick={() => setDetailInvoice(o.invoice)}
                    className="font-bold text-sky-700 hover:underline cursor-pointer"
                  >
                    {o.invoice}
                  </button>
                  <p className="text-[10px] text-gray-400">Ready {o.readyAt ? fmtDate(o.readyAt) : '-'}</p>
                </td>
                <td className={TD}>
                  <p className="font-semibold text-gray-900">{o.mitraName}</p>
                  <p className="text-[10px] text-gray-400">{o.level} · {o.phone}</p>
                </td>
                <td className={TD}>
                  <p className="text-gray-800">{o.produk}</p>
                  <p className="text-[10px] text-gray-400">{o.variant} · {o.qty} pcs</p>
                </td>
                <td className={`${TD} max-w-[260px] text-[11px] text-gray-600`}>
                  <p>{addressText(o) || '—'}</p>
                  {extractOrderShippingLabels(o).length > 1 && (
                    <Badge tone="blue" className="mt-1">
                      {extractOrderShippingLabels(o).length} alamat split
                    </Badge>
                  )}
                </td>
                <td className={`${TD} text-right`}>
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <Button
                      size="xs"
                      variant="outline"
                      icon={copiedInv === o.invoice ? 'check' : 'copy'}
                      onClick={() => handleCopyAddress(o)}
                    >
                      {copiedInv === o.invoice ? 'Tersalin' : 'Salin'}
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      icon="print"
                      onClick={() => openShippingLabelsPrintTab(o)}
                    >
                      Label
                    </Button>
                    <Button size="xs" variant="outline" icon="chat" onClick={() => openWA(o, 'ready')}>
                      WA
                    </Button>
                    <Button
                      size="xs"
                      icon="truck"
                      onClick={() =>
                        setOngkirModal({
                          order: o,
                          form: {
                            ekspedisi: o.ekspedisi || '',
                            ongkir: o.ongkir || '',
                            weight: o.weight || '',
                            note: o.shippingNote || ''
                          }
                        })
                      }
                    >
                      Input Ongkir
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {needOngkir.length === 0 && (
          <EmptyState
            title="Semua ongkir sudah diinput"
            desc="Belum ada pesanan READY yang menunggu perhitungan ongkir."
            icon="truck"
          />
        )}
      </Card>

      <Card
        title="Ongkir Sudah Diinput"
        subtitle="Menunggu pembayaran atau verifikasi mitra"
        action={<Badge tone="gray">{orders.filter((o) => o.ongkir > 0).length} pesanan</Badge>}
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Invoice</th>
              <th className={TH}>Mitra</th>
              <th className={TH}>Ekspedisi</th>
              <th className={`${TH} text-right`}>Berat</th>
              <th className={`${TH} text-right`}>Ongkir</th>
              <th className={TH}>Status</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders
              .filter((o) => o.ongkir > 0)
              .map((o) => (
                <tr key={o.invoice} className="hover:bg-gray-50/70">
                  <td className={TD}>
                    <p className="font-semibold text-gray-900">{o.invoice}</p>
                    <p className="text-[10px] text-gray-400">{o.produk}</p>
                  </td>
                  <td className={TD}>{o.mitraName}</td>
                  <td className={TD}>{o.ekspedisi || ' — '}</td>
                  <td className={`${TD} text-right`}>{o.weight ? `${o.weight} kg` : ' — '}</td>
                  <td className={`${TD} text-right font-bold text-gray-900`}>{rp(o.ongkir)}</td>
                  <td className={TD}>
                    <Badge tone={payTone(o.ongkirStatus)}>{o.ongkirStatus || '—'}</Badge>
                  </td>
                  <td className={`${TD} text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="xs" variant="outline" onClick={() => openWA(o, 'ongkir')}>
                        Tagih WA
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        icon="edit"
                        onClick={() =>
                          setOngkirModal({
                            order: o,
                            form: {
                              ekspedisi: o.ekspedisi || '',
                              ongkir: o.ongkir || '',
                              weight: o.weight || '',
                              note: o.shippingNote || ''
                            }
                          })
                        }
                      >
                        Ubah
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </TableWrap>
        {orders.filter((o) => o.ongkir > 0).length === 0 && (
          <EmptyState title="Belum ada ongkir" desc="Ongkir yang sudah diinput akan tampil di sini." icon="truck" />
        )}
      </Card>
    </>
  );
}
