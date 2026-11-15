import React from 'react';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PAY,
  PageHead,
  ProofThumb,
  Select,
  orderOutstanding,
  orderStage,
  rp
} from '../poCore';

import { dbId } from '../../../services/adapters';

export default function FinanceManualProofTab({
  pendingProofList = [],
  proofForm = { mitraId: '', kind: 'DP', invoice: '', nominal: '', date: '', bankId: '', refNo: '', proof: '' },
  setProofForm = () => {},
  submitProofForm = () => {},
  resetProofForm = null,
  isSubmittingProof = false,
  proofInputKey = 0,
  mitra = [],
  orders = [],
  bankAccounts = [],
  handleProofFile = () => {},
  setProofView = () => {},
  copyText = () => {},
  toast = () => {}
}) {
  const statusKey = { DP: 'dpStatus', Pelunasan: 'pelunasanStatus', Ongkir: 'ongkirStatus' }[proofForm.kind];

  return (
    <>
      <PageHead
        title="Input Manual Bukti Transfer"
        desc="Catat pembayaran mitra yang masuk melalui transfer manual atau konfirmasi WhatsApp. Setelah disimpan, bukti masuk antrean verifikasi."
        badge={<Badge tone="blue">{pendingProofList.length} menunggu verifikasi</Badge>}
        actions={
          <Button
            variant="outline"
            icon="refresh"
            onClick={() =>
              resetProofForm
                ? resetProofForm()
                : setProofForm((prev) => ({ ...prev, invoice: '', nominal: '', refNo: '', proof: '', proofFile: null }))
            }
          >
            Reset Form
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Form Bukti Transfer" subtitle="DP, pelunasan, ongkir, atau deposit" className="lg:col-span-2">
          <form onSubmit={submitProofForm} className="p-4 sm:p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Mitra" required>
                <Select
                  value={proofForm.mitraId}
                  onChange={(e) =>
                    setProofForm((prev) => ({ ...prev, mitraId: e.target.value, invoice: '' }))
                  }
                >
                  <option value="">Pilih mitra...</option>
                  {mitra
                    .filter((m) => m.active)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} - {m.level}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Jenis Pembayaran" required>
                <Select
                  value={proofForm.kind}
                  onChange={(e) => {
                    const nextKind = e.target.value;
                    const o = orders.find((x) => x.invoice === proofForm.invoice);
                    const suggested =
                      nextKind === 'DP'
                        ? o?.dpNominal
                        : nextKind === 'Pelunasan'
                        ? o?.pelunasanNominal
                        : nextKind === 'Ongkir'
                        ? o?.ongkir
                        : '';
                    setProofForm((prev) => ({
                      ...prev,
                      kind: nextKind,
                      invoice: nextKind === 'Deposit' ? '' : prev.invoice,
                      nominal: suggested || ''
                    }));
                  }}
                >
                  {['DP', 'Pelunasan', 'Ongkir', 'Deposit'].map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {proofForm.kind !== 'Deposit' && (
              <Field label="Invoice Terkait" required hint="Hanya invoice milik mitra yang dipilih.">
                <Select
                  value={proofForm.invoice}
                  onChange={(e) => {
                    const invoice = e.target.value;
                    const o = orders.find((x) => x.invoice === invoice);
                    const suggested =
                      proofForm.kind === 'DP'
                        ? o?.dpNominal
                        : proofForm.kind === 'Pelunasan'
                        ? o?.pelunasanNominal
                        : o?.ongkir;
                    setProofForm((prev) => ({ ...prev, invoice, nominal: suggested || '' }));
                  }}
                >
                  <option value="">Pilih invoice...</option>
                  {orders
                    .filter((o) => {
                      const selMitra = mitra.find((m) => String(m.id) === String(proofForm.mitraId));
                      const isMitraMatch =
                        String(o.mitraId) === String(proofForm.mitraId) ||
                        (dbId(o.mitraId) && dbId(o.mitraId) === dbId(proofForm.mitraId)) ||
                        (o.mitraName && selMitra?.name && o.mitraName.toLowerCase() === selMitra.name.toLowerCase());
                      return isMitraMatch && orderStage(o) !== 'ditolak';
                    })
                    .filter((o) => !statusKey || o[statusKey] !== PAY.ACC)
                    .map((o) => (
                      <option key={o.invoice} value={o.invoice}>
                        {o.invoice} - {o.produk} - sisa {rp(orderOutstanding(o))}
                        {statusKey && o[statusKey] === PAY.MENUNGGU ? ' (Menunggu Verifikasi)' : ''}
                      </option>
                    ))}
                </Select>
              </Field>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nominal Transfer" required>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={proofForm.nominal}
                  onChange={(e) => setProofForm((prev) => ({ ...prev, nominal: e.target.value }))}
                />
              </Field>
              <Field label="Tanggal Transfer" required>
                <Input
                  type="date"
                  value={proofForm.date}
                  onChange={(e) => setProofForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Rekening Tujuan">
                <Select
                  value={proofForm.bankId}
                  onChange={(e) => setProofForm((prev) => ({ ...prev, bankId: e.target.value }))}
                >
                  <option value="">Pilih rekening tujuan...</option>
                  {bankAccounts
                    .filter((b) => b.active)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bank} - {b.accountNo}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="No. Referensi">
                <Input
                  placeholder="Contoh: TRF-778812"
                  value={proofForm.refNo}
                  onChange={(e) => setProofForm((prev) => ({ ...prev, refNo: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Berkas Bukti" hint="JPG, PNG, atau WEBP, maksimal 2 MB (opsional jika sudah ada No. Referensi).">
              <div className="space-y-2">
                <input
                  key={proofInputKey}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(e) => handleProofFile(e.target.files?.[0])}
                  className="block w-full text-[11px] text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  {proofForm.proof && (
                    <ProofThumb
                      src={proofForm.proof}
                      onClick={() => setProofView({ src: proofForm.proof, title: 'Pratinjau bukti transfer' })}
                      label="Pratinjau"
                    />
                  )}
                </div>
              </div>
            </Field>

            <div className="flex justify-end">
              <Button type="submit" icon="check" disabled={isSubmittingProof}>
                {isSubmittingProof ? 'Menyimpan...' : 'Simpan Bukti'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card title="Rekening Resmi" subtitle="Sumber pencocokan mutasi">
            <div className="divide-y divide-gray-100">
              {bankAccounts
                .filter((b) => b.active)
                .map((b) => (
                  <div key={b.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-gray-900">{b.bank}</p>
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await copyText(b.accountNo);
                          toast(ok ? 'Nomor rekening disalin.' : 'Gagal menyalin.', ok ? 'success' : 'error');
                        }}
                        className="text-[10px] font-semibold text-sky-700 hover:underline cursor-pointer"
                      >
                        Salin
                      </button>
                    </div>
                    <p className="text-[11px] font-mono text-gray-600">{b.accountNo}</p>
                    <p className="text-[10px] text-gray-400">{b.holder}</p>
                  </div>
                ))}
            </div>
          </Card>

          <Card title="Menunggu Verifikasi">
            <div className="divide-y divide-gray-100">
              {pendingProofList.slice(0, 5).map((row) => (
                <div key={row.key} className="px-4 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-900 truncate">
                      {row.invoice} · {row.mitra}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {row.kind} · {rp(row.amount)}
                    </p>
                  </div>
                  <ProofThumb
                    src={row.proof}
                    onClick={() => setProofView({ src: row.proof, title: `Bukti ${row.kind} ${row.invoice}` })}
                    label=""
                  />
                </div>
              ))}
              {pendingProofList.length === 0 && (
                <p className="px-4 py-6 text-center text-[11px] text-gray-400">Semua bukti sudah diverifikasi.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
