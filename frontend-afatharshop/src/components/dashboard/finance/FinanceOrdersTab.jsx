import React from 'react';
import {
  Badge,
  Button,
  Card,
  OrdersTable,
  PAY,
  PageHead,
  Pagination,
  SearchBox,
  Select,
  StageTabs,
  orderStage
} from '../poCore';

export default function FinanceOrdersTab({
  orders = [],
  stageFilter = 'all',
  setStageFilter = () => {},
  listSearch = '',
  setListSearch = () => {},
  listBrand = 'all',
  setListBrand = () => {},
  filteredOrders = [],
  orderPag = { rows: [], page: 1, pageSize: 20, total: 0, setPage: () => {}, setPageSize: () => {} },
  setDetailInvoice = () => {},
  goTo = () => {},
  setOngkirModal = () => {},
  setResiModal = () => {},
  markReceived = () => {}
}) {
  return (
    <>
      <PageHead
        title="Monitoring Pesanan PO"
        desc="Pantau seluruh pesanan di setiap tahap, verifikasi pembayaran, dan update status operasional."
        badge={<Badge tone="gray">{orders.length} pesanan</Badge>}
      />

      <StageTabs orders={orders} value={stageFilter} onChange={setStageFilter} />

      <Card>
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-72">
            <SearchBox value={listSearch} onChange={setListSearch} placeholder="Cari invoice, mitra, produk..." />
          </div>
          <Select value={listBrand} onChange={(e) => setListBrand(e.target.value)} className="w-36">
            <option value="all">Semua brand</option>
            {[...new Set(orders.map((o) => o.brand))].map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </Select>
          <span className="text-[11px] text-gray-400 ml-auto">{filteredOrders.length} hasil</span>
        </div>
        <OrdersTable
          orders={orderPag.rows}
          onOpen={(o) => setDetailInvoice(o.invoice)}
          renderActions={(o) => (
            <>
              <Button size="xs" variant="outline" onClick={() => setDetailInvoice(o.invoice)}>
                Detail
              </Button>
              {o.dpStatus === PAY.MENUNGGU && (
                <Button size="xs" onClick={() => goTo('verif_dp')}>
                  Verif DP
                </Button>
              )}
              {o.pelunasanStatus === PAY.MENUNGGU && (
                <Button size="xs" onClick={() => goTo('verif_pelunasan')}>
                  Verif Lunas
                </Button>
              )}
              {o.ongkirStatus === PAY.MENUNGGU && (
                <Button size="xs" onClick={() => goTo('verif_ongkir')}>
                  Verif Ongkir
                </Button>
              )}
              {orderStage(o) === 'ongkir' && (
                <Button
                  size="xs"
                  variant="soft"
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
              )}
              {orderStage(o) === 'kirim' && (
                <Button
                  size="xs"
                  variant="soft"
                  onClick={() => setResiModal({ order: o, form: { resi: '', notify: true } })}
                >
                  Input Resi
                </Button>
              )}
              {orderStage(o) === 'dikirim' && (
                <Button size="xs" variant="soft" onClick={() => markReceived(o)}>
                  Diterima
                </Button>
              )}
            </>
          )}
        />
        <Pagination
          page={orderPag.page}
          pageSize={orderPag.pageSize}
          total={orderPag.total}
          onPageChange={orderPag.setPage}
          onPageSizeChange={orderPag.setPageSize}
        />
      </Card>
    </>
  );
}
