import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHead,
  TD,
  TH,
  TableWrap
} from '../poCore';

export default function PurchasingCategoriesTab({
  categories = [],
  setCategoryModal = () => {},
  products = [],
  deleteCategory = () => {}
}) {
  return (
    <>
      <PageHead
        title="Kategori Produk"
        desc="Kategori master yang dipublikasikan ke filter katalog toko. Input produk wajib memilih dari daftar ini agar filter toko selalu sinkron."
        badge={<Badge tone="gray">{categories.length} kategori</Badge>}
        actions={
          <Button icon="plus" onClick={() => setCategoryModal({ mode: 'create', form: { name: '' } })}>
            Kategori Baru
          </Button>
        }
      />

      <Card
        title="Daftar Kategori"
        subtitle="Urutan filter di toko mengikuti urutan daftar ini."
        action={<Badge tone="gray">{products.length} produk terhubung</Badge>}
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Kategori</th>
              <th className={`${TH} text-center`}>Jumlah Produk</th>
              <th className={`${TH} text-center`}>Status</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((c) => {
              const count = products.filter((p) => p.category === c).length;
              return (
                <tr key={c} className="hover:bg-gray-50/70">
                  <td className={`${TD} font-semibold text-gray-900`}>{c}</td>
                  <td className={`${TD} text-center`}>{count}</td>
                  <td className={`${TD} text-center`}>
                    <Badge tone={count > 0 ? 'teal' : 'gray'}>{count > 0 ? 'Dipakai' : 'Kosong'}</Badge>
                  </td>
                  <td className={`${TD} text-right`}>
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="xs"
                        variant="outline"
                        icon="edit"
                        onClick={() => setCategoryModal({ mode: 'edit', id: c, form: { name: c } })}
                      >
                        Ubah
                      </Button>
                      <Button size="xs" variant="dangerOutline" icon="trash" onClick={() => deleteCategory(c)}>
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
        {categories.length === 0 && (
          <EmptyState
            title="Belum ada kategori"
            desc="Tambahkan kategori agar produk bisa difilter di katalog toko."
            icon="filter"
          />
        )}
      </Card>
    </>
  );
}
