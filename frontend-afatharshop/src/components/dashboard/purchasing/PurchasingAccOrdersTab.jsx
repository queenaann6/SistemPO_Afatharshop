import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  PageHead,
  SearchBox,
  TD,
  TH,
  TableWrap,
  fmtDate,
  levelTone,
  rp
} from '../poCore';

export default function PurchasingAccOrdersTab({
  pendingAcc = [],
  accSelected = [],
  setAccSelected = () => {},
  approveMany = () => {},
  filteredAcc = [],
  accSearch = '',
  setAccSearch = () => {},
  setDetailInvoice = () => {},
  setReasonModal = () => {},
  rejectOrder = () => {},
  approveOrder = () => {}
}) {
  return (
    <>
      <PageHead
        title="ACC Pesanan Masuk"
        desc="Pesanan dari tim maupun checkout mitra harus di-ACC sebelum mitra dapat membayar DP. Periksa varian, kuota, harga, dan catatan revisi."
        badge={<Badge tone="amber">{pendingAcc.length} menunggu</Badge>}
        actions={
          <Button
            icon="check"
            disabled={accSelected.length === 0}
            onClick={approveMany}
          >
            ACC terpilih ({accSelected.length})
          </Button>
        }
      />

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px] text-amber-900 flex items-start gap-2">
        <Icon name="alert" className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Menolak pesanan akan mengembalikan kuota varian. Setelah ACC, pesanan masuk tahap pembayaran DP dan
          diproses oleh admin finance.
        </p>
      </div>

      <Card
        title={`Antrean Persetujuan (${filteredAcc.length})`}
        action={
          <SearchBox
            value={accSearch}
            onChange={setAccSearch}
            placeholder="Cari invoice / mitra / produk..."
            className="w-64"
          />
        }
      >
        <TableWrap fluid>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-2.5 w-8">
                <input
                  type="checkbox"
                  aria-label="Pilih semua"
                  checked={filteredAcc.length > 0 && filteredAcc.every((o) => accSelected.includes(o.invoice))}
                  onChange={(e) =>
                    setAccSelected(e.target.checked ? filteredAcc.map((o) => o.invoice) : [])
                  }
                  className="accent-[#6B1416]"
                />
              </th>
              <th className={TH}>Invoice / Tanggal</th>
              <th className={TH}>Mitra</th>
              <th className={TH}>Item & Varian</th>
              <th className={`${TH} text-right hidden xl:table-cell`}>Qty</th>
              <th className={`${TH} text-right`}>Nilai</th>
              <th className={`${TH} hidden xl:table-cell`}>Catatan</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAcc.map((o) => (
              <tr key={o.invoice} className="hover:bg-gray-50/70">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Pilih ${o.invoice}`}
                    checked={accSelected.includes(o.invoice)}
                    onChange={(e) =>
                      setAccSelected((prev) =>
                        e.target.checked ? [...prev, o.invoice] : prev.filter((x) => x !== o.invoice)
                      )
                    }
                    className="accent-[#6B1416]"
                  />
                </td>
                <td className={TD}>
                  <button
                    type="button"
                    onClick={() => setDetailInvoice(o.invoice)}
                    className="font-bold text-sky-700 hover:underline whitespace-nowrap cursor-pointer"
                  >
                    {o.invoice}
                  </button>
                  <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(o.date)}</p>
                </td>
                <td className={TD}>
                  <p className="font-semibold text-gray-900">{o.mitraName}</p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <Badge tone={levelTone(o.level)}>{o.level}</Badge>
                    <span className="text-[10px] text-gray-400">{o.phone}</span>
                  </div>
                </td>
                <td className={TD}>
                  <p className="font-medium text-gray-800">{o.produk}</p>
                  <p className="text-[10px] text-gray-400">
                    {o.variant} · {o.brand}
                  </p>
                  {o.revisionNote && (
                    <span className="inline-flex mt-1">
                      <Badge tone="amber">Revisi</Badge>
                    </span>
                  )}
                </td>
                <td className={`${TD} text-right font-semibold hidden xl:table-cell`}>{o.qty}</td>
                <td className={`${TD} text-right whitespace-nowrap`}>
                  <p className="font-bold text-gray-900">{rp(o.subtotal)}</p>
                  <p className="text-[10px] text-gray-400">DP {rp(o.dpNominal)}</p>
                </td>
                <td className={`${TD} max-w-[180px] hidden xl:table-cell`}>
                  {o.revisionNote ? (
                    <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 leading-snug">
                      {o.revisionNote}
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400">{o.notes || '—'}</p>
                  )}
                </td>
                <td className={`${TD} text-right`}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button size="xs" variant="outline" onClick={() => setDetailInvoice(o.invoice)}>
                      Detail
                    </Button>
                    <Button
                      size="xs"
                      variant="dangerOutline"
                      onClick={() =>
                        setReasonModal({
                          title: 'Tolak pesanan',
                          subtitle: `${o.invoice} · ${o.mitraName}`,
                          label: 'Alasan penolakan',
                          placeholder: 'Contoh: kuota varian habis / harga tidak sesuai',
                          confirmLabel: 'Tolak pesanan',
                          danger: true,
                          onSubmit: (reason) => {
                            rejectOrder(o, reason);
                            setReasonModal(null);
                          }
                        })
                      }
                    >
                      Tolak
                    </Button>
                    <Button size="xs" onClick={() => approveOrder(o)}>
                      ACC
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredAcc.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    title="Tidak ada pesanan menunggu ACC"
                    desc="Semua pesanan masuk sudah diproses. Antrean baru akan muncul di sini."
                    icon="check"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </Card>
    </>
  );
}
