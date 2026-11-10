import React from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PAY,
  PageHead,
  ProofThumb,
  Select,
  fmtDate,
  orderOutstanding,
  orderStage,
  rp
} from '../poCore';
import { mediaUrl } from '../../../services/api';
import { dbId } from '../../../services/adapters';

export default function PurchasingManualProofTab({
  pendingProofList = [],
  proofForm = { mitraId: '', kind: 'DP', invoice: '', nominal: '', date: '', bankId: '', refNo: '', proof: '' },
  setProofForm = () => {},
  submitProofForm = () => {},
  mitra = [],
  orders = [],
  bankAccounts = [],
  handleProofFile = () => {},
  setProofView = () => {}
}) {
  return (
    <>
      <PageHead
        title="Input Bukti Transfer"
        desc="Catat bukti transfer DP, pelunasan, ongkir, atau deposit mitra secara manual. Setelah disimpan, status menjadi MENUNGGU VERIFIKASI dan diteruskan ke admin finance."
        badge={<Badge tone="blue">{pendingProofList.length} menunggu verifikasi</Badge>}
        actions={
          <Button
            variant="outline"
            icon="refresh"
            onClick={() =>
              setProofForm((prev) => ({ ...prev, invoice: '', nominal: '', refNo: '', proof: '' }))
            }
          >
            Reset Form
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card
          title="Form Bukti Transfer"
          subtitle="Semua admin dapat menginput bukti TF mitra"
          className="lg:col-span-2"
        >
          <form onSubmit={submitProofForm} className="p-4 sm:p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Mitra" required>
                <Select
                  value={proofForm.mitraId}
                  onChange={(e) =>
                    setProofForm((prev) => ({ ...prev, mitraId: e.target.value, invoice: '' }))
                  }
                >
                  <option value="">Pilih mitra…</option>
                  {mitra
                    .filter((m) => m.active)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} · {m.level}
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
                  <option value="">Pilih invoice…</option>
                  {orders
                    .filter((o) => {
                      const isMitraMatch =
                        String(o.mitraId) === String(proofForm.mitraId) ||
                        (dbId(o.mitraId) && dbId(o.mitraId) === dbId(proofForm.mitraId)) ||
                        (o.mitraName && o.mitraName === mitra.find((m) => String(m.id) === String(proofForm.mitraId))?.name);
                      return isMitraMatch && orderStage(o) !== 'ditolak';
                    })
                    .filter((o) => {
                      const statusKey = { DP: 'dpStatus', Pelunasan: 'pelunasanStatus', Ongkir: 'ongkirStatus' }[
                        proofForm.kind
                      ];
                      return o[statusKey] !== PAY.ACC;
                    })
                    .map((o) => (
                      <option key={o.invoice} value={o.invoice}>
                        {o.invoice} · {o.produk} · sisa {rp(orderOutstanding(o))}
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
                  {bankAccounts
                    .filter((b) => b.active)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bank} · {b.accountNo}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="No. Referensi / Berita Transfer">
                <Input
                  placeholder="Contoh: TRF-778812"
                  value={proofForm.refNo}
                  onChange={(e) => setProofForm((prev) => ({ ...prev, refNo: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Berkas Bukti" hint="JPG atau PNG, maksimal 2 MB.">
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(e) => handleProofFile(e.target.files?.[0])}
                  className="block w-full text-[11px] text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  {proofForm.proof && (
                    <ProofThumb
                      src={mediaUrl(proofForm.proof)}
                      onClick={() =>
                        setProofView({ src: mediaUrl(proofForm.proof), title: 'Pratinjau bukti transfer' })
                      }
                      label="Pratinjau"
                    />
                  )}
                </div>
              </div>
            </Field>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[10px] text-gray-400">
                Bukti akan diverifikasi finance sebelum status pembayaran menjadi ACC.
              </p>
              <Button type="submit" icon="check">
                Simpan Bukti
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card title="Rekening Tujuan" subtitle="Rekening resmi Afatharshop">
            <div className="divide-y divide-gray-100">
              {bankAccounts.map((b) => (
                <div key={b.id} className="px-4 py-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-gray-900">{b.bank}</p>
                    <p className="text-[11px] text-gray-500 font-mono">{b.accountNo}</p>
                    <p className="text-[10px] text-gray-400">{b.holder}</p>
                  </div>
                  <Badge tone={b.active ? 'emerald' : 'gray'}>{b.active ? 'Aktif' : 'Nonaktif'}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Alur Verifikasi">
            <ol className="p-4 space-y-3">
              {[
                'Admin purchasing input bukti transfer mitra.',
                'Status pembayaran menjadi Menunggu Verifikasi.',
                'Finance mencocokkan nominal dengan mutasi rekening.',
                'Finance ACC / tolak dengan catatan.'
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-[11px] text-gray-600 leading-snug">{step}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <Card
        title="Bukti Menunggu Verifikasi"
        subtitle="Input terbaru dari seluruh admin"
        action={<Badge tone="blue">{pendingProofList.length} dokumen</Badge>}
      >
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className={TH}>Tanggal</th>
              <th className={TH}>Invoice / Mitra</th>
              <th className={TH}>Jenis</th>
              <th className={`${TH} text-right`}>Nominal</th>
              <th className={TH}>Bukti</th>
              <th className={TH}>Diinput oleh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pendingProofList.map((row) => (
              <tr key={row.key} className="hover:bg-gray-50/70">
                <td className={TD}>{fmtDate(row.date)}</td>
                <td className={TD}>
                  <p className="font-semibold text-gray-900">{row.invoice}</p>
                  <p className="text-[10px] text-gray-400">{row.mitra}</p>
                </td>
                <td className={TD}>
                  <Badge tone="amber">{row.kind}</Badge>
                </td>
                <td className={`${TD} text-right font-bold text-gray-900`}>{rp(row.amount)}</td>
                <td className={TD}>
                  <ProofThumb
                    src={row.proof}
                    onClick={() => setProofView({ src: row.proof, title: `Bukti ${row.kind} ${row.invoice}` })}
                  />
                </td>
                <td className={TD}>{row.by || '—'}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        {pendingProofList.length === 0 && (
          <EmptyState
            title="Tidak ada bukti menunggu verifikasi"
            desc="Semua bukti transfer yang diinput sudah diverifikasi finance."
            icon="upload"
          />
        )}
      </Card>
    </>
  );
}
