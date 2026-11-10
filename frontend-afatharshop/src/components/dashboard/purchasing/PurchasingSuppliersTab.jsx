import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  PageHead,
  TD,
  TH,
  TableWrap
} from '../poCore';

export default function PurchasingSuppliersTab({
  suppliers = [],
  setSupplierModal = () => {},
  blankSupplier = {},
  brands = [],
  deleteSupplier = () => {}
}) {
  return (
    <>
      <PageHead
        title="Supplier Pabrik"
        desc="Data vendor produksi beserta kontak dan brand yang dipasok."
        badge={<Badge tone="gray">{suppliers.length} supplier</Badge>}
        actions={
          <Button icon="plus" onClick={() => setSupplierModal({ mode: 'create', form: { ...blankSupplier } })}>
            Supplier Baru
          </Button>
        }
      />

      <Card>
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Supplier</th>
              <th className={TH}>Kota</th>
              <th className={TH}>Kontak</th>
              <th className={TH}>Telepon</th>
              <th className={TH}>Brand Dipasok</th>
              <th className={TH}>Catatan</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {suppliers.map((s) => {
              const supplied = brands.filter((b) => b.supplier === s.name);
              return (
                <tr key={s.id} className="hover:bg-gray-50/70">
                  <td className={`${TD} font-bold text-gray-900`}>{s.name}</td>
                  <td className={TD}>{s.city || '—'}</td>
                  <td className={TD}>{s.contact || '—'}</td>
                  <td className={TD}>{s.phone || '—'}</td>
                  <td className={TD}>
                    <div className="flex flex-wrap gap-1">
                      {supplied.map((b) => (
                        <Badge key={b.id} tone="teal">
                          {b.name}
                        </Badge>
                      ))}
                      {supplied.length === 0 && <span className="text-[10px] text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className={`${TD} max-w-[180px] text-[10px] text-gray-500`}>{s.note || '—'}</td>
                  <td className={`${TD} text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSupplierModal({ mode: 'edit', id: s.id, form: { ...s } })}
                        className="px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      >
                        <Icon name="edit" className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSupplier(s)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                        title="Hapus supplier"
                      >
                        <Icon name="trash" className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
        {suppliers.length === 0 && <EmptyState title="Belum ada supplier" icon="truck" />}
      </Card>
    </>
  );
}
