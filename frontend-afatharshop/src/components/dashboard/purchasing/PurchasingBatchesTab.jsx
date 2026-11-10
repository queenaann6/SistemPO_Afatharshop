import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHead,
  SearchBox,
  TD,
  TH,
  TableWrap,
  fmtDate
} from '../poCore';

export default function PurchasingBatchesTab({
  poBatches = [],
  refreshBatches = () => {},
  openCreateBatchModal = () => {},
  batchSearch = '',
  setBatchSearch = () => {},
  batchStatusFilter = 'all',
  setBatchStatusFilter = () => {},
  batchBrandFilter = 'all',
  setBatchBrandFilter = () => {},
  brands = [],
  filteredBatches = [],
  products = [],
  toggleBatchStatus = () => {},
  openEditBatchModal = () => {},
  deleteBatch = () => {}
}) {
  return (
    <>
      <PageHead
        title="Batch Pre-Order"
        desc="Kelola batch periode buka dan tutup PO. Menutup batch (Closed) akan otomatis menutup pemesanan pada seluruh produk yang terhubung ke batch tersebut di toko dan dashboard mitra."
        badge={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge tone="gray">{poBatches.length} batch</Badge>
            <Badge tone="emerald">
              {poBatches.filter((b) => b.status === 'open').length} Open
            </Badge>
            <Badge tone="rose">
              {poBatches.filter((b) => b.status === 'closed').length} Closed
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" icon="refresh" onClick={refreshBatches}>
              Sinkron
            </Button>
            <Button icon="plus" onClick={openCreateBatchModal}>
              Batch Baru
            </Button>
          </div>
        }
      />

      <Card
        title="Daftar Batch Pre-Order"
        subtitle="Jadwal buka-tutup PO dan status batch otomatis mengontrol status pre-order produk."
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-56">
              <SearchBox
                value={batchSearch}
                onChange={setBatchSearch}
                placeholder="Cari nama batch, brand…"
              />
            </div>
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none cursor-pointer"
              value={batchStatusFilter}
              onChange={(e) => setBatchStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="open">Open (Buka PO)</option>
              <option value="closed">Closed (Tutup PO)</option>
            </select>
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none cursor-pointer"
              value={batchBrandFilter}
              onChange={(e) => setBatchBrandFilter(e.target.value)}
            >
              <option value="all">Semua Brand</option>
              {brands.map((br) => (
                <option key={br.id || br.name} value={br.name}>
                  {br.name}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Batch PO</th>
              <th className={TH}>Brand</th>
              <th className={TH}>Jadwal PO</th>
              <th className={TH}>Estimasi Kirim</th>
              <th className={`${TH} text-center`}>Produk Terhubung</th>
              <th className={`${TH} text-center`}>Status Batch</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredBatches.map((b) => {
              const linkedCount =
                b.products_count ??
                products.filter((p) => p.po_batch_id === b.id || p.batch === b.name).length;
              const isOpen = b.status === 'open';

              let closeText = '—';
              if (b.close_date) {
                const datePart = b.close_date.slice(0, 10);
                const timePart = b.close_date.includes(' ')
                  ? b.close_date.split(' ')[1]?.slice(0, 5)
                  : b.close_date.includes('T')
                  ? b.close_date.split('T')[1]?.slice(0, 5)
                  : '';
                closeText = `${fmtDate(datePart)}${timePart ? ` (${timePart} WIB)` : ''}`;
              }

              return (
                <tr key={b.id || b.name} className="hover:bg-gray-50/70">
                  <td className={TD}>
                    <p className="font-bold text-gray-900">{b.name}</p>
                    <p className="text-[10px] text-gray-400">ID: #{b.id || '—'}</p>
                  </td>
                  <td className={TD}>
                    <span className="font-medium text-gray-800">{b.brand || 'Semua Brand'}</span>
                  </td>
                  <td className={TD}>
                    <p className="text-xs text-gray-800">
                      <span className="text-[10px] text-gray-400">Buka:</span> {b.start_date ? fmtDate(b.start_date) : '—'}
                    </p>
                    <p className="text-xs text-gray-800">
                      <span className="text-[10px] text-gray-400">Tutup:</span> {closeText}
                    </p>
                  </td>
                  <td className={TD}>
                    <span className="text-xs text-gray-700">
                      {b.estimated_shipment ? fmtDate(b.estimated_shipment) : '—'}
                    </span>
                  </td>
                  <td className={`${TD} text-center`}>
                    <Badge tone={linkedCount > 0 ? 'teal' : 'gray'}>
                      {linkedCount} produk
                    </Badge>
                  </td>
                  <td className={`${TD} text-center`}>
                    <Badge tone={isOpen ? 'emerald' : 'rose'}>
                      {isOpen ? 'OPEN' : 'CLOSED'}
                    </Badge>
                  </td>
                  <td className={`${TD} text-right`}>
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        size="xs"
                        variant={isOpen ? 'outline' : 'soft'}
                        icon={isOpen ? 'x' : 'check'}
                        onClick={() => toggleBatchStatus(b)}
                        title={isOpen ? 'Tutup Pre-Order Batch ini' : 'Buka Pre-Order Batch ini'}
                      >
                        {isOpen ? 'Tutup PO' : 'Buka PO'}
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        icon="edit"
                        onClick={() => openEditBatchModal(b)}
                      >
                        Ubah
                      </Button>
                      <Button
                        size="xs"
                        variant="dangerOutline"
                        icon="trash"
                        onClick={() => deleteBatch(b)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
        {filteredBatches.length === 0 && (
          <EmptyState
            title="Belum ada batch PO"
            desc="Belum ada batch yang cocok dengan pencarian / filter."
            icon="clock"
          />
        )}
      </Card>
    </>
  );
}
