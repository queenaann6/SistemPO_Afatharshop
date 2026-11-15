import React from 'react';
import {
  Badge,
  Button,
  Card,
  OrdersTable,
  PageHead,
  Pagination,
  SearchBox,
  Select,
  StageTabs
} from '../poCore';

export default function OwnerOrdersTab({
  orders = [],
  stageFilter = 'all',
  setStageFilter = () => {},
  filteredOrders = [],
  listSearch = '',
  setListSearch = () => {},
  listBrand = 'all',
  setListBrand = () => {},
  brandOptions = [],
  orderPag = { rows: [], page: 1, pageSize: 20, total: 0, setPage: () => {}, setPageSize: () => {} },
  setDetailInvoice = () => {},
  openWA = () => {},
  orderOutstanding = () => 0
}) {
  return (
    <>
      <PageHead
        title="Monitoring Seluruh Pesanan"
        desc="Pantau posisi setiap pesanan PO dari pengajuan mitra sampai diterima. Mode baca-saja untuk owner."
        badge={<Badge tone="gray">{orders.length} pesanan</Badge>}
      />

      <StageTabs orders={orders} value={stageFilter} onChange={setStageFilter} />

      <Card
        title="Daftar Pesanan"
        subtitle={`${filteredOrders.length} pesanan sesuai filter`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <SearchBox value={listSearch} onChange={setListSearch} placeholder="Cari invoice / mitra..." />
            <Select value={listBrand} onChange={(e) => setListBrand(e.target.value)} className="w-36">
              <option value="all">Semua brand</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        <OrdersTable
          orders={orderPag.rows}
          onOpen={(o) => setDetailInvoice(o)}
          renderActions={(o) => (
            <>
              <Button size="xs" variant="outline" onClick={() => setDetailInvoice(o)}>
                Detail
              </Button>
              <Button
                size="xs"
                variant="ghost"
                icon="chat"
                onClick={() => openWA(o, orderOutstanding(o) > 0 ? 'pelunasan' : 'ringkasan')}
              >
                WA
              </Button>
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
