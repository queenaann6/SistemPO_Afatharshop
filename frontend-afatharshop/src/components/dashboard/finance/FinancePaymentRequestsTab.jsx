import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  MetricCard,
  PREQ,
  PageHead,
  Segmented,
  Select,
  TD,
  TH,
  TableWrap,
  Textarea,
  fmtDate,
  prSteps,
  preqTone,
  rp,
  sumBy
} from '../poCore';

export default function FinancePaymentRequestsTab({
  pendingPr = [],
  prCounts = {},
  approvedPr = [],
  transferredPr = [],
  savePR = () => {},
  prForm = { purpose: '', amount: '', bankId: '', ref: '', note: '', brand: '' },
  setPrForm = () => {},
  brands = [],
  bankAccounts = [],
  setBankModal = () => {},
  prFilter = 'all',
  setPrFilter = () => {},
  filteredPr = [],
  cancelPR = () => {},
  setPrDetailId = () => {}
}) {
  return (
    <>
      <PageHead
        title="Pengajuan Pembayaran ke Owner"
        desc="Ajukan kebutuhan dana produksi, ongkir, atau operasional. Alur approval: Purchasing → Owner → Transfer."
        badge={<Badge tone="amber">{pendingPr.length} pengajuan aktif</Badge>}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          label="Review Purchasing"
          value={prCounts[PREQ.REVIEW_MKT] || 0}
          sub="Menunggu persetujuan purchasing"
          tone="amber"
          icon="clock"
          onClick={() => setPrFilter(PREQ.REVIEW_MKT)}
        />
        <MetricCard
          label="Approval Owner"
          value={prCounts[PREQ.APPROVAL_OWNER] || 0}
          sub="Menunggu keputusan owner"
          tone="violet"
          icon="shield"
          onClick={() => setPrFilter(PREQ.APPROVAL_OWNER)}
        />
        <MetricCard
          label="Siap Ditransfer"
          value={approvedPr.length}
          sub={rp(sumBy(approvedPr, (r) => r.amount))}
          tone="blue"
          icon="wallet"
        />
        <MetricCard
          label="Sudah Ditransfer"
          value={transferredPr.length}
          sub={rp(sumBy(transferredPr, (r) => r.amount))}
          tone="emerald"
          icon="check"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Buat Pengajuan" subtitle="Dana akan ditransfer owner ke rekening tujuan">
          <form onSubmit={savePR} className="p-4 space-y-3">
            <Field label="Pilih Brand Terkait (Ambil dari Brand)" hint="Otomatis menyaring rekening bank vendor terkait">
              <Select
                value={prForm.brand || ''}
                onChange={(e) => {
                  const selectedBrandName = e.target.value;
                  setPrForm((prev) => {
                    const next = { ...prev, brand: selectedBrandName };
                    if (selectedBrandName) {
                      const matchedBank = bankAccounts.find(
                        (b) =>
                          b.type === 'pengajuan' &&
                          b.active &&
                          Array.isArray(b.brands) &&
                          b.brands.includes(selectedBrandName)
                      );
                      if (matchedBank) {
                        next.bankId = matchedBank.id;
                      }
                      if (!prev.purpose) {
                        next.purpose = `Pembayaran produksi brand ${selectedBrandName}`;
                      }
                    }
                    return next;
                  });
                }}
              >
                <option value="">-- Pilih Brand (Semua) --</option>
                {brands.map((br) => {
                  const bName = typeof br === 'object' ? br.name : br;
                  return (
                    <option key={bName} value={bName}>
                      {bName}
                    </option>
                  );
                })}
              </Select>
            </Field>

            <Field label="Tujuan Pembayaran" required>
              <Input
                placeholder="Contoh: DP produksi supplier / konveksi"
                value={prForm.purpose}
                onChange={(e) => setPrForm((prev) => ({ ...prev, purpose: e.target.value }))}
              />
            </Field>
            <Field label="Nominal" required>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={prForm.amount}
                onChange={(e) => setPrForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </Field>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">
                  Rekening Tujuan (Vendor) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setBankModal({
                      mode: 'create',
                      form: {
                        bank: '',
                        accountNo: '',
                        holder: '',
                        type: 'pengajuan',
                        brands: prForm.brand ? [prForm.brand] : [],
                        purpose: prForm.brand ? `Brand: ${prForm.brand}` : '',
                        active: true
                      }
                    })
                  }
                  className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  + Rekening Baru
                </button>
              </div>

              {bankAccounts.filter((b) => b.type === 'pengajuan' && b.active).length > 0 ? (
                <Select
                  value={prForm.bankId}
                  onChange={(e) => setPrForm((prev) => ({ ...prev, bankId: e.target.value }))}
                >
                  {bankAccounts
                    .filter((b) => b.type === 'pengajuan' && b.active)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bank} · {b.accountNo} · {b.holder}{' '}
                        {b.brands?.length ? `[Brand: ${b.brands.join(', ')}]` : b.purpose ? `(${b.purpose})` : ''}
                      </option>
                    ))}
                </Select>
              ) : (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900">
                  <p className="font-semibold">Belum Ada Rekening Pengajuan</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Rekening untuk pengajuan dana ke Owner dipisahkan dari rekening toko.
                  </p>
                  <Button
                    size="xs"
                    variant="outline"
                    className="mt-2 w-full"
                    icon="plus"
                    onClick={() =>
                      setBankModal({
                        mode: 'create',
                        form: { bank: '', accountNo: '', holder: '', type: 'pengajuan', purpose: '', active: true }
                      })
                    }
                  >
                    Daftarkan Rekening Vendor Sekarang
                  </Button>
                </div>
              )}
            </div>
            <Field label="Referensi / Terkait">
              <Input
                placeholder="PO Gamis Almira / Batch Oktober"
                value={prForm.ref}
                onChange={(e) => setPrForm((prev) => ({ ...prev, ref: e.target.value }))}
              />
            </Field>
            <Field label="Catatan untuk Owner">
              <Textarea
                rows={2}
                placeholder="Rincian singkat penggunaan dana"
                value={prForm.note}
                onChange={(e) => setPrForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </Field>
            <Button type="submit" icon="plus" className="w-full">
              Ajukan ke Owner
            </Button>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Alur Approval</p>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-600 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">Finance</span>
                <span className="text-gray-300"> → </span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">Purchasing</span>
                <span className="text-gray-300"> → </span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">Owner</span>
                <span className="text-gray-300"> → </span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-200">Transfer</span>
              </div>
            </div>
          </form>
        </Card>

        <Card
          title="Riwayat Pengajuan"
          subtitle="Semua pengajuan pembayaran"
          className="lg:col-span-2"
          action={
            <Segmented
              value={prFilter}
              onChange={setPrFilter}
              options={[
                { value: 'all', label: 'Semua', count: prCounts.all },
                { value: PREQ.REVIEW_MKT, label: 'Review', count: prCounts[PREQ.REVIEW_MKT] || 0 },
                { value: PREQ.APPROVAL_OWNER, label: 'Owner', count: prCounts[PREQ.APPROVAL_OWNER] || 0 },
                { value: PREQ.APPROVED, label: 'Disetujui', count: prCounts[PREQ.APPROVED] || 0 },
                { value: PREQ.TRANSFERRED, label: 'Transfer', count: prCounts[PREQ.TRANSFERRED] || 0 },
                { value: PREQ.REJECTED, label: 'Ditolak', count: prCounts[PREQ.REJECTED] || 0 }
              ]}
            />
          }
        >
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={TH}>Kode</th>
                <th className={TH}>Tujuan</th>
                <th className={`${TH} text-right`}>Nominal</th>
                <th className={TH}>Progres</th>
                <th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPr.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/70">
                  <td className={TD}>
                    <p className="font-bold text-gray-900">{r.code}</p>
                    <p className="text-[10px] text-gray-400">{fmtDate(r.createdAt)}</p>
                  </td>
                  <td className={`${TD} max-w-[220px]`}>
                    <p className="font-medium text-gray-800">{r.purpose}</p>
                    <p className="text-[10px] text-gray-400 truncate">Ref: {r.ref}</p>
                  </td>
                  <td className={`${TD} text-right font-bold text-gray-900`}>{rp(r.amount)}</td>
                  <td className={TD}>
                    <div className="flex items-center gap-1">
                      {prSteps(r).map((s) => (
                        <span
                          key={s.label}
                          title={`${s.label}: ${s.state}`}
                          className={`w-2 h-2 rounded-full ${
                            s.state === 'done'
                              ? 'bg-emerald-500'
                              : s.state === 'active'
                              ? 'bg-amber-400'
                              : s.state === 'reject'
                              ? 'bg-rose-500'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{r.bank} · {r.accountNo}</p>
                  </td>
                  <td className={TD}>
                    <Badge tone={preqTone(r.status)}>{r.status}</Badge>
                  </td>
                  <td className={`${TD} text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      {r.status === PREQ.REVIEW_MKT && (
                        <Button size="xs" variant="dangerOutline" onClick={() => cancelPR(r)}>
                          Batalkan
                        </Button>
                      )}
                      <Button size="xs" variant="outline" onClick={() => setPrDetailId(r.id)}>
                        Detail
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {filteredPr.length === 0 && (
            <EmptyState title="Belum ada pengajuan" desc="Buat pengajuan baru di form sebelah kiri." icon="wallet" />
          )}
        </Card>
      </div>
    </>
  );
}
