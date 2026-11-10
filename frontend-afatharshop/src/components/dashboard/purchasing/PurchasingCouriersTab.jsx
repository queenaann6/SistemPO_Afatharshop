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

export default function PurchasingCouriersTab({
  couriers = [],
  setCourierModal = () => {},
  toggleCourier = () => {},
  deleteCourier = () => {}
}) {
  return (
    <>
      <PageHead
        title="Master Ekspedisi Pengiriman"
        desc="Daftar jasa kirim yang bisa dipilih saat admin input ongkir dan dipublikasikan ke halaman checkout mitra."
        badge={<Badge tone="gray">{couriers.filter((c) => c.active).length} aktif</Badge>}
        actions={
          <Button
            icon="plus"
            onClick={() =>
              setCourierModal({ mode: 'create', form: { name: '', code: '', note: '', active: true } })
            }
          >
            Ekspedisi Baru
          </Button>
        }
      />

      <Card title="Daftar Ekspedisi" subtitle="Ekspedisi nonaktif tidak muncul pada pilihan checkout.">
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Ekspedisi</th>
              <th className={TH}>Kode</th>
              <th className={TH}>Catatan</th>
              <th className={`${TH} text-center`}>Status</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {couriers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/70">
                <td className={`${TD} font-semibold text-gray-900`}>{c.name}</td>
                <td className={`${TD} font-mono whitespace-nowrap`}>{c.code || '—'}</td>
                <td className={`${TD} max-w-[260px] text-[11px] text-gray-600`}>{c.note || '—'}</td>
                <td className={`${TD} text-center`}>
                  <Badge tone={c.active ? 'teal' : 'gray'}>{c.active ? 'Aktif' : 'Nonaktif'}</Badge>
                </td>
                <td className={`${TD} text-right`}>
                  <div className="inline-flex items-center gap-1">
                    <Button size="xs" variant="outline" onClick={() => toggleCourier(c)}>
                      {c.active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      icon="edit"
                      onClick={() => setCourierModal({ mode: 'edit', id: c.id, form: { ...c } })}
                    >
                      Ubah
                    </Button>
                    <Button
                      size="xs"
                      variant="danger"
                      icon="trash"
                      onClick={() => deleteCourier(c)}
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {couriers.length === 0 && (
          <EmptyState
            title="Belum ada ekspedisi"
            desc="Tambahkan jasa kirim agar ongkir bisa diinput saat verifikasi pesanan."
            icon="truck"
          />
        )}
      </Card>
    </>
  );
}
