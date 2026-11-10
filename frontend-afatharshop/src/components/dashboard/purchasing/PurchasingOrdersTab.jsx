import React from 'react';
import {
  Badge,
  Button,
  Card,
  Icon,
  LEVELS,
  MKT,
  OrdersTable,
  PROD,
  PageHead,
  Pagination,
  SearchBox,
  Select,
  StageTabs,
  orderStage
} from '../poCore';

export default function PurchasingOrdersTab({
  filteredOrders = [],
  exportOrders = () => {},
  goTo = () => {},
  orders = [],
  stageFilter = 'all',
  setStageFilter = () => {},
  listSearch = '',
  setListSearch = () => {},
  listBrand = 'all',
  setListBrand = () => {},
  brands = [],
  listLevel = 'all',
  setListLevel = () => {},
  levels = LEVELS,
  listPag = { rows: [], page: 1, pageSize: 20, total: 0, setPage: () => {}, setPageSize: () => {} },
  setDetailInvoice = () => {},
  approveOrder = () => {},
  setReasonModal = () => {},
  rejectOrder = () => {},
  reopenOrder = () => {},
  setProduction = () => {},
  openWA = () => {},
  askDelete = () => {}
}) {
  return (
    <>
      <PageHead
        title="List Pesanan PO"
        desc="Pantau seluruh pesanan lintas tahap. Purchasing mengelola ACC pesanan, update produksi, dan notifikasi Ready."
        badge={<Badge tone="gray">{filteredOrders.length} pesanan</Badge>}
        actions={
          <>
            <Button variant="outline" icon="download" onClick={exportOrders}>
              Ekspor CSV
            </Button>
            <Button icon="plus" onClick={() => goTo('tambah_pesanan')}>
              Input Pesanan
            </Button>
          </>
        }
      />

      <StageTabs orders={orders} value={stageFilter} onChange={setStageFilter} />

      <Card>
        <div className="p-3.5 border-b border-gray-100 flex flex-wrap items-center gap-2">
          <SearchBox
            value={listSearch}
            onChange={setListSearch}
            placeholder="Cari invoice, mitra, produk..."
            className="w-full sm:w-64"
          />
          <Select value={listBrand} onChange={(e) => setListBrand(e.target.value)} className="w-auto">
            <option value="all">Semua Brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select value={listLevel} onChange={(e) => setListLevel(e.target.value)} className="w-auto">
            <option value="all">Semua Level</option>
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
          <span className="text-[11px] text-gray-400 ml-auto">
            {listPag.total} data ditemukan
          </span>
        </div>

        <OrdersTable
          orders={listPag.rows}
          onOpen={(o) => setDetailInvoice(o.invoice)}
          renderActions={(o) => {
            const st = orderStage(o);
            return (
              <>
                {o.marketingStatus === MKT.PENDING && (
                  <>
                    <Button size="xs" onClick={() => approveOrder(o)}>
                      ACC
                    </Button>
                    <Button
                      size="xs"
                      variant="dangerOutline"
                      onClick={() => {
                        setReasonModal({
                          title: 'Tolak pesanan',
                          subtitle: `${o.invoice} · ${o.mitraName}`,
                          label: 'Alasan penolakan',
                          confirmLabel: 'Tolak pesanan',
                          danger: true,
                          onSubmit: (reason) => {
                            rejectOrder(o, reason);
                            setReasonModal(null);
                          }
                        });
                      }}
                    >
                      Tolak
                    </Button>
                  </>
                )}
                {o.marketingStatus === MKT.TOLAK && (
                  <Button size="xs" variant="outline" onClick={() => reopenOrder(o)}>
                    Buka lagi
                  </Button>
                )}
                {o.marketingStatus !== MKT.TOLAK && st === 'produksi' && (
                  <Button
                    size="xs"
                    variant="soft"
                    onClick={() =>
                      setProduction(o, o.productionStatus === PROD.QUEUE ? PROD.RUN : PROD.READY)
                    }
                  >
                    {o.productionStatus === PROD.QUEUE ? 'Mulai Produksi' : 'Set Ready'}
                  </Button>
                )}
                {st === 'alamat' && (
                  <Button size="xs" variant="outline" icon="chat" onClick={() => openWA(o, 'ready')}>
                    Notif Ready
                  </Button>
                )}
                <Button size="xs" variant="outline" onClick={() => setDetailInvoice(o.invoice)}>
                  Detail
                </Button>
                <button
                  type="button"
                  onClick={() => askDelete(o)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Hapus pesanan"
                >
                  <Icon name="trash" className="w-3.5 h-3.5" />
                </button>
              </>
            );
          }}
        />
        <Pagination
          page={listPag.page}
          pageSize={listPag.pageSize}
          total={listPag.total}
          onPageChange={listPag.setPage}
          onPageSizeChange={listPag.setPageSize}
        />
      </Card>
    </>
  );
}
