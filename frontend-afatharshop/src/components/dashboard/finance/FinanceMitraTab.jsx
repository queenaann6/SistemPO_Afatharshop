import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MetricCard,
  PageHead,
  SearchBox,
  TD,
  TH,
  TableWrap,
  levelTone,
  rp,
  sumBy
} from '../poCore';

export default function FinanceMitraTab({
  mitra = [],
  mitraRows = [],
  mitraSearch = '',
  setMitraSearch = () => {},
  filteredMitra = [],
  setMitraModal = () => {},
  setMitraDetailId = () => {},
  toggleMitra = () => {},
  deleteMitra = () => {},
  blankMitra = { name: '', email: '', phone: '', address: '', city: '', level: 'Mitra', active: true, deposit: 0 }
}) {
  const pendingMitra = mitraRows.filter((m) => !m.active);
  const sortedFiltered = [...filteredMitra].sort((a, b) => Number(a.active) - Number(b.active));

  return (
    <>
      <PageHead
        title="Mitra & Piutang"
        desc="Kelola akun mitra, ACC pendaftaran baru, pantau piutang, dan buat kredensial akses katalog."
        badge={<Badge tone="gray">{mitra.length} mitra</Badge>}
        actions={
          <Button icon="plus" onClick={() => setMitraModal({ mode: 'create', form: { ...blankMitra } })}>
            Mitra Baru
          </Button>
        }
      />

      {pendingMitra.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
          <div>
            <p className="font-bold">
              {pendingMitra.length} akun mitra menunggu ACC / aktivasi
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Pendaftar baru belum bisa login sebelum Anda klik tombol <strong>ACC / Aktifkan</strong>.
            </p>
          </div>
          <Badge tone="amber">{pendingMitra.length} Menunggu ACC</Badge>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard label="Total Mitra" value={mitra.length} sub={`${mitra.filter((m) => m.active).length} aktif`} tone="blue" icon="users" />
        <MetricCard label="Total Omzet" value={rp(sumBy(mitraRows, (m) => m.omzet))} sub="Seluruh pesanan" tone="emerald" icon="wallet" />
        <MetricCard label="Piutang" value={rp(sumBy(mitraRows, (m) => m.outstanding))} sub="Belum lunas" tone="red" icon="receipt" />
        <MetricCard label="Saldo Deposit" value={rp(sumBy(mitra, (m) => m.deposit))} sub="Saldo tersimpan" tone="violet" icon="card" />
      </div>

      <Card
        title="Daftar Mitra"
        action={
          <div className="w-full sm:w-64">
            <SearchBox value={mitraSearch} onChange={setMitraSearch} placeholder="Cari nama / email / WhatsApp..." />
          </div>
        }
      >
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
            {sortedFiltered.map((m) => (
              <tr key={m.id} className={!m.active ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-gray-50/70'}>
                <td className={TD}>
                  <button
                    type="button"
                    onClick={() => setMitraDetailId(m.id)}
                    className="font-bold text-sky-700 hover:underline cursor-pointer"
                  >
                    {m.name}
                  </button>
                  <p className="text-[10px] text-gray-400">{m.email || ' — '}</p>
                  <p className="text-[10px] text-gray-400">{m.phone}</p>
                </td>
                <td className={TD}>
                  <Badge tone={levelTone(m.level)}>{m.level}</Badge>
                </td>
                <td className={TD}>{m.city || ' — '}</td>
                <td className={`${TD} text-right`}>{m.invoiceCount}</td>
                <td className={`${TD} text-right font-semibold`}>{rp(m.omzet)}</td>
                <td className={`${TD} text-right ${m.outstanding > 0 ? 'text-rose-600 font-semibold' : 'text-gray-400'}`}>
                  {rp(m.outstanding)}
                </td>
                <td className={`${TD} text-right`}>{rp(m.deposit)}</td>
                <td className={TD}>
                  <Badge tone={m.active ? 'emerald' : 'amber'}>
                    {m.active ? 'Aktif' : 'Menunggu ACC'}
                  </Badge>
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
                      {m.active ? 'Nonaktifkan' : 'ACC / Aktifkan'}
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
        {filteredMitra.length === 0 && <EmptyState title="Mitra tidak ditemukan" desc="Coba kata kunci lain." icon="users" />}
      </Card>
    </>
  );
}
