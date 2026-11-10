import React from 'react';
import {
  Badge,
  Button,
  Card,
  MetricCard,
  PageHead,
  TD,
  TH,
  TableWrap,
  levelTone,
  rp,
  sumBy
} from '../poCore';

export default function PurchasingMitraTab({
  mitra = [],
  setMitraModal = () => {},
  blankMitra = {},
  mitraRows = [],
  setMitraDetailId = () => {},
  toggleMitra = () => {},
  deleteMitra = () => {}
}) {
  return (
    <>
      <PageHead
        title="Mitra & User"
        desc="Buat akun mitra, atur level harga, dan pantau omzet serta piutang masing-masing mitra."
        badge={<Badge tone="gray">{mitra.length} mitra</Badge>}
        actions={
          <Button icon="plus" onClick={() => setMitraModal({ mode: 'create', form: { ...blankMitra } })}>
            Mitra Baru
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Total Mitra" value={mitra.length} sub={`${mitra.filter((m) => m.active).length} aktif`} tone="blue" icon="users" />
        <MetricCard label="Total Omzet" value={rp(sumBy(mitraRows, (m) => m.omzet))} sub="Seluruh pesanan mitra" tone="emerald" icon="wallet" />
        <MetricCard label="Piutang Mitra" value={rp(sumBy(mitraRows, (m) => m.outstanding))} sub="Belum lunas" tone="red" icon="receipt" />
        <MetricCard label="Saldo Deposit" value={rp(sumBy(mitra, (m) => m.deposit))} sub="Saldo aktif mitra" tone="violet" icon="card" />
      </div>

      <Card>
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Nama / Kontak</th>
              <th className={TH}>Level</th>
              <th className={TH}>Kota</th>
              <th className={`${TH} text-right`}>Invoice</th>
              <th className={`${TH} text-right`}>Omzet</th>
              <th className={`${TH} text-right`}>Piutang</th>
              <th className={`${TH} text-right`}>Deposit</th>
              <th className={TH}>Status</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mitraRows.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50/70">
                <td className={TD}>
                  <button
                    type="button"
                    onClick={() => setMitraDetailId(m.id)}
                    className="font-bold text-sky-700 hover:underline cursor-pointer"
                  >
                    {m.name}
                  </button>
                  <p className="text-[10px] text-gray-400">{m.email || '—'}</p>
                  <p className="text-[10px] text-gray-400">{m.phone}</p>
                </td>
                <td className={TD}>
                  <Badge tone={levelTone(m.level)}>{m.level}</Badge>
                </td>
                <td className={TD}>{m.city || '—'}</td>
                <td className={`${TD} text-right`}>{m.invoiceCount}</td>
                <td className={`${TD} text-right font-semibold`}>{rp(m.omzet)}</td>
                <td className={`${TD} text-right ${m.outstanding > 0 ? 'text-rose-600 font-semibold' : 'text-gray-400'}`}>
                  {rp(m.outstanding)}
                </td>
                <td className={`${TD} text-right`}>{rp(m.deposit)}</td>
                <td className={TD}>
                  <Badge tone={m.active ? 'emerald' : 'gray'}>{m.active ? 'Aktif' : 'Nonaktif'}</Badge>
                </td>
                <td className={`${TD} text-right`}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setMitraModal({ mode: 'edit', id: m.id, form: { ...m } })}
                    >
                      Edit
                    </Button>
                    <Button
                      size="xs"
                      variant={m.active ? 'dangerOutline' : 'primary'}
                      onClick={() => toggleMitra(m)}
                    >
                      {m.active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                    <Button
                      size="xs"
                      variant="danger"
                      onClick={() => deleteMitra(m)}
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
