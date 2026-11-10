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
  fmtDate,
  rp
} from '../poCore';

export default function PurchasingDeletedOrdersTab({
  deletedOrders = [],
  trashSelected = [],
  setTrashSelected = () => {},
  restoreSelectedTrash = () => {},
  askDeleteSelectedTrash = () => {},
  askEmptyTrash = () => {},
  trashSearch = '',
  setTrashSearch = () => {},
  filteredTrash = [],
  setDetailInvoice = () => {},
  restoreOrder = () => {},
  askPermanentDelete = () => {}
}) {
  return (
    <>
      <PageHead
        title="Penjualan Terhapus"
        desc="Pesanan yang dipindahkan ke sini tidak dihitung pada omzet. Pulihkan jika pesanan ternyata masih berjalan, atau hapus permanen jika data tidak lagi dibutuhkan."
        badge={<Badge tone="gray">{deletedOrders.length} pesanan</Badge>}
        actions={
          <div className="flex items-center gap-2">
            {trashSelected.length > 0 ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  icon="refresh"
                  onClick={restoreSelectedTrash}
                >
                  Pulihkan Terpilih ({trashSelected.length})
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon="trash"
                  onClick={askDeleteSelectedTrash}
                >
                  Hapus Permanen Terpilih ({trashSelected.length})
                </Button>
              </>
            ) : (
              deletedOrders.length > 0 && (
                <Button
                  size="sm"
                  variant="dangerOutline"
                  icon="trash"
                  onClick={askEmptyTrash}
                >
                  Kosongkan Arsip
                </Button>
              )
            )}
          </div>
        }
      />

      <Card
        title="Arsip Pesanan"
        action={
          <div className="w-full sm:w-64">
            <SearchBox
              value={trashSearch}
              onChange={setTrashSearch}
              placeholder="Cari invoice, mitra, produk…"
            />
          </div>
        }
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={`${TH} w-10 text-center`}>
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  checked={filteredTrash.length > 0 && filteredTrash.every((o) => trashSelected.includes(o.invoice))}
                  onChange={(e) =>
                    setTrashSelected(e.target.checked ? filteredTrash.map((o) => o.invoice) : [])
                  }
                />
              </th>
              <th className={TH}>Invoice</th>
              <th className={TH}>Mitra</th>
              <th className={TH}>Produk</th>
              <th className={`${TH} text-right`}>Nilai</th>
              <th className={TH}>Dihapus</th>
              <th className={TH}>Alasan</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTrash.map((o) => {
              const isSelected = trashSelected.includes(o.invoice);
              return (
                <tr key={o.invoice} className={`hover:bg-gray-50/70 ${isSelected ? 'bg-rose-50/30' : ''}`}>
                  <td className={`${TD} text-center`}>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      checked={isSelected}
                      onChange={() =>
                        setTrashSelected((prev) =>
                          isSelected ? prev.filter((x) => x !== o.invoice) : [...prev, o.invoice]
                        )
                      }
                    />
                  </td>
                  <td className={TD}>
                    <button
                      type="button"
                      className="font-bold text-gray-900 hover:text-emerald-700 hover:underline text-left cursor-pointer"
                      onClick={() => setDetailInvoice(o.invoice)}
                    >
                      {o.invoice}
                    </button>
                    <p className="text-[10px] text-gray-400">{fmtDate(o.date)}</p>
                  </td>
                  <td className={TD}>
                    <p className="font-medium text-gray-800">{o.mitraName}</p>
                    <p className="text-[10px] text-gray-400">{o.level}</p>
                  </td>
                  <td className={TD}>
                    <p className="text-gray-800">{o.produk}</p>
                    <p className="text-[10px] text-gray-400">{o.variant} · {o.qty} pcs</p>
                  </td>
                  <td className={`${TD} text-right font-semibold`}>{rp(o.subtotal)}</td>
                  <td className={TD}>
                    <p>{fmtDate(o.deletedAt)}</p>
                    <p className="text-[10px] text-gray-400">oleh {o.deletedBy || '—'}</p>
                  </td>
                  <td className={`${TD} max-w-[200px] text-[11px] text-gray-600`}>{o.deleteReason || '—'}</td>
                  <td className={`${TD} text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="xs" variant="outline" icon="refresh" onClick={() => restoreOrder(o)}>
                        Pulihkan
                      </Button>
                      <Button
                        size="xs"
                        variant="dangerOutline"
                        icon="trash"
                        onClick={() => askPermanentDelete(o)}
                      >
                        Hapus Permanen
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
        {filteredTrash.length === 0 && (
          <EmptyState
            title="Arsip kosong"
            desc="Tidak ada pesanan terhapus yang cocok dengan pencarian."
            icon="trash"
          />
        )}
      </Card>
    </>
  );
}
