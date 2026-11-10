import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHead,
  Segmented,
  TD,
  TH,
  TableWrap
} from '../poCore';

export default function PurchasingBankAccountsTab({
  bankAccounts = [],
  bankTab = 'public',
  setBankTab = () => {},
  setBankModal = () => {},
  inlineBankId = null,
  setInlineBankId = () => {},
  inlineBankForm = { bank: '', accountNo: '', holder: '', purpose: '', active: true },
  setInlineBankForm = () => {},
  startInlineEditBank = () => {},
  saveInlineEditBank = () => {},
  toggleBank = () => {},
  deleteBank = () => {}
}) {
  const publicBanks = bankAccounts.filter((b) => (b.type || 'public') === 'public');
  const pengajuanBanks = bankAccounts.filter((b) => b.type === 'pengajuan');
  const currentList = bankTab === 'public' ? publicBanks : pengajuanBanks;

  return (
    <>
      <PageHead
        title="Master Rekening Bank"
        desc={
          bankTab === 'public'
            ? 'Kelola rekening resmi toko untuk pembayaran checkout mitra, DP, pelunasan, dan faktur invoice.'
            : 'Kelola rekening transfer vendor / supplier untuk tujuan pengajuan dana ke Owner.'
        }
        badge={
          <Badge tone={bankTab === 'public' ? 'emerald' : 'amber'}>
            {currentList.filter((b) => b.active).length} aktif / {currentList.length} total
          </Badge>
        }
        actions={
          <Button
            icon="plus"
            variant={bankTab === 'pengajuan' ? 'gold' : 'primary'}
            onClick={() =>
              setBankModal({
                mode: 'create',
                form: {
                  bank: '',
                  accountNo: '',
                  holder: '',
                  type: bankTab,
                  purpose: bankTab === 'public' ? 'Penerimaan Pembayaran Mitra' : '',
                  active: true
                }
              })
            }
          >
            {bankTab === 'pengajuan' ? 'Rekening Pengajuan Baru' : 'Rekening Publik Baru'}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <Segmented
          value={bankTab}
          onChange={setBankTab}
          options={[
            {
              value: 'public',
              label: 'Rekening Publik Toko',
              count: publicBanks.length
            },
            {
              value: 'pengajuan',
              label: 'Rekening Pengajuan Owner',
              count: pengajuanBanks.length
            }
          ]}
        />
      </div>

      <Card>
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Bank</th>
              <th className={TH}>Nomor Rekening</th>
              <th className={TH}>Atas Nama</th>
              <th className={TH}>{bankTab === 'pengajuan' ? 'Brand / Peruntukan Vendor' : 'Label / Kegunaan'}</th>
              <th className={`${TH} text-center`}>Status</th>
              <th className={`${TH} text-right`}>Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentList.map((b) => {
              const isEditing = inlineBankId === b.id;

              if (isEditing) {
                return (
                  <tr key={b.id} className="bg-amber-50/60">
                    <td className={TD}>
                      <input
                        type="text"
                        value={inlineBankForm.bank}
                        onChange={(e) => setInlineBankForm((prev) => ({ ...prev, bank: e.target.value }))}
                        placeholder="Bank"
                        className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#541221] bg-white font-semibold"
                      />
                    </td>
                    <td className={TD}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={inlineBankForm.accountNo}
                        onChange={(e) => setInlineBankForm((prev) => ({ ...prev, accountNo: e.target.value.replace(/\D/g, '') }))}
                        placeholder="No Rekening"
                        className="w-36 font-mono px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#541221] bg-white"
                      />
                    </td>
                    <td className={TD}>
                      <input
                        type="text"
                        value={inlineBankForm.holder}
                        onChange={(e) => setInlineBankForm((prev) => ({ ...prev, holder: e.target.value }))}
                        placeholder="Atas Nama"
                        className="w-full min-w-[140px] px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#541221] bg-white"
                      />
                    </td>
                    <td className={TD}>
                      <input
                        type="text"
                        value={inlineBankForm.purpose}
                        onChange={(e) => setInlineBankForm((prev) => ({ ...prev, purpose: e.target.value }))}
                        placeholder={bankTab === 'pengajuan' ? 'Brand / Peruntukan Vendor' : 'Label / Kegunaan'}
                        className="w-full min-w-[140px] px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#541221] bg-white"
                      />
                    </td>
                    <td className={`${TD} text-center`}>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inlineBankForm.active}
                          onChange={(e) => setInlineBankForm((prev) => ({ ...prev, active: e.target.checked }))}
                          className="rounded border-gray-300 text-[#541221]"
                        />
                        <span className="text-[11px] text-gray-600 font-medium">{inlineBankForm.active ? 'Aktif' : 'Nonaktif'}</span>
                      </label>
                    </td>
                    <td className={`${TD} text-right`}>
                      <div className="inline-flex items-center gap-1">
                        <Button size="xs" variant="primary" onClick={() => saveInlineEditBank(b)}>
                          Simpan
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => setInlineBankId(null)}>
                          Batal
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={b.id} className="hover:bg-gray-50/70">
                  <td className={`${TD} font-semibold text-gray-900`}>{b.bank}</td>
                  <td className={`${TD} font-mono whitespace-nowrap`}>{b.accountNo}</td>
                  <td className={TD}>{b.holder}</td>
                  <td className={`${TD} text-xs text-gray-600`}>
                    {b.type === 'pengajuan' && Array.isArray(b.brands) && b.brands.length > 0 ? (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {b.brands.map((br) => (
                            <span
                              key={br}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-900 border border-rose-200"
                            >
                              {br}
                            </span>
                          ))}
                        </div>
                        {b.purpose && !b.purpose.startsWith('Brand:') && (
                          <p className="text-[11px] text-gray-500">{b.purpose}</p>
                        )}
                      </div>
                    ) : (
                      b.purpose || (b.type === 'pengajuan' ? 'Vendor / Operasional' : 'Penerimaan Mitra')
                    )}
                  </td>
                  <td className={`${TD} text-center`}>
                    <Badge tone={b.active ? (bankTab === 'public' ? 'emerald' : 'amber') : 'gray'}>
                      {b.active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className={`${TD} text-right`}>
                    <div className="inline-flex items-center gap-1">
                      <Button size="xs" variant="outline" onClick={() => startInlineEditBank(b)}>
                        Ubah
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => toggleBank(b)}>
                        {b.active ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      <Button
                        size="xs"
                        variant="danger"
                        icon="trash"
                        onClick={() => deleteBank(b)}
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
        {currentList.length === 0 && (
          <EmptyState
            title={bankTab === 'public' ? 'Belum ada rekening publik' : 'Belum ada rekening pengajuan vendor'}
            desc={
              bankTab === 'public'
                ? 'Tambahkan rekening toko agar mitra dapat melakukan transfer pembayaran pesanan.'
                : 'Tambahkan rekening supplier atau vendor untuk tujuan pengajuan dana ke Owner.'
            }
            icon="card"
          />
        )}
      </Card>
    </>
  );
}
