import React from 'react';
import {
  Badge,
  Button,
  Card,
  Field,
  Icon,
  Input,
  isBrandMatch,
  PageHead,
  Select,
  Textarea,
  num,
  rp,
  variantLabel
} from '../poCore';
import { dpPercentFor } from '../../../utils/terminScheme';

export default function PurchasingManualOrderTab({
  draft = { mitraId: '', produkId: '', variantId: '', qty: 1, dpPct: 30, notes: '' },
  setDraft = () => {},
  mitra = [],
  draftPreview = {},
  brands = [],
  products = [],
  addDraft = () => {},
  draftList = [],
  setDraftList = () => {},
  submitDrafts = () => {}
}) {
  return (
    <>
      <PageHead
        title="Input Pesanan Manual"
        desc="Buat invoice atas nama mitra. Harga dan diskon dihitung otomatis berdasarkan brand dan level mitra."
        badge={<Badge tone="gray">Admin Purchasing</Badge>}
      />

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <Card title="Form Pesanan" className="lg:col-span-2">
          <div className="p-4 sm:p-5 grid sm:grid-cols-2 gap-3">
            <Field label="Mitra" required className="sm:col-span-2">
              <Select
                value={draft.mitraId}
                onChange={(e) => setDraft({ ...draft, mitraId: e.target.value })}
              >
                <option value="">— Pilih mitra —</option>
                {mitra
                  .filter((m) => m.active)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.level} · {m.city}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label="Brand" required>
              <Select
                value={draftPreview.brand?.name || ''}
                onChange={(e) => {
                  const b = brands.find((x) => isBrandMatch(x.name, e.target.value));
                  const first = products.find((p) => isBrandMatch(p.brand, b?.name));
                  setDraft({
                    ...draft,
                    produkId: first?.id || '',
                    variantId: '',
                    dpPct: dpPercentFor(first, draft.dpPct)
                  });
                }}
              >
                <option value="">— Pilih brand —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Produk PO" required>
              <Select
                value={draft.produkId}
                onChange={(e) => {
                  const product = products.find((x) => x.id === e.target.value);
                  setDraft({
                    ...draft,
                    produkId: e.target.value,
                    variantId: '',
                    dpPct: dpPercentFor(product, draft.dpPct)
                  });
                }}
                disabled={!draftPreview.brand}
              >
                <option value="">— Pilih produk —</option>
                {products
                  .filter((p) => isBrandMatch(p.brand, draftPreview.brand?.name))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.status === 'closed' ? '(PO tutup)' : ''}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label="Varian" required className="sm:col-span-2">
              <Select
                value={draft.variantId}
                onChange={(e) => setDraft({ ...draft, variantId: e.target.value })}
                disabled={!draft.produkId}
              >
                <option value="">— Pilih varian —</option>
                {(draftPreview.product?.variants || []).map((v) => {
                  const remaining = num(v.quota) - num(v.used);
                  return (
                    <option key={v.id} value={v.id} disabled={remaining <= 0}>
                      {variantLabel(v)} · sisa {remaining} pcs
                      {remaining <= 0 ? ' (habis)' : ''}
                    </option>
                  );
                })}
              </Select>
            </Field>

            <Field label="Qty (pcs)" required>
              <Input
                type="number"
                min={1}
                value={draft.qty}
                onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
              />
            </Field>

            <Field label="DP (%)" hint="Default mengikuti konfigurasi bisnis">
              <Input
                type="number"
                min={0}
                max={100}
                value={draft.dpPct}
                onChange={(e) => setDraft({ ...draft, dpPct: e.target.value })}
              />
            </Field>

            <Field label="Catatan untuk gudang / mitra" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={draft.notes}
                placeholder="Opsional — mis. minta dikirim setelah tanggal tertentu"
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
            </Field>

            <div className="sm:col-span-2 flex justify-end">
              <Button icon="plus" onClick={addDraft} disabled={!draft.mitraId || !draft.variantId}>
                Tambah ke Daftar
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Ringkasan Perhitungan">
            <div className="p-4 space-y-2 text-[11px]">
              {draftPreview.mitra ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mitra / Level</span>
                    <span className="font-semibold text-gray-800">
                      {draftPreview.mitra.name} · {draftPreview.mitra.level}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fee mitra / pcs</span>
                    <span className="font-semibold text-gray-800">
                      {draftPreview.disc}% · {rp(draftPreview.feeNominal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Harga satuan</span>
                    <span className="font-semibold text-gray-800">{rp(draftPreview.pricing?.price)}</span>
                  </div>
                  <div className="border-t border-dashed border-gray-200 my-2" />
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bruto</span>
                    <span className="text-gray-800">{rp(draftPreview.amounts?.gross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fee mitra dipotong</span>
                    <span className="text-rose-600">-{rp(draftPreview.amounts?.feeMitraNominal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Subtotal</span>
                    <span>{rp(draftPreview.amounts?.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Diskon brand (pabrik)</span>
                    <span>{rp(draftPreview.amounts?.brandDiscountNominal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Fee perusahaan</span>
                    <span>{rp(draftPreview.amounts?.feeCompanyNominal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>DP ({draft.dpPct}%)</span>
                    <span>{rp(draftPreview.amounts?.dpNominal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Pelunasan</span>
                    <span>{rp(draftPreview.amounts?.pelunasanNominal)}</span>
                  </div>
                  {draftPreview.variant && (
                    <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-[10px] text-gray-500">
                      Sisa kuota varian ini:{' '}
                      <b className="text-gray-800">
                        {num(draftPreview.variant.quota) - num(draftPreview.variant.used)} pcs
                      </b>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-400">Pilih mitra & varian untuk melihat perhitungan.</p>
              )}
            </div>
          </Card>

          <Card title="Daftar Pesanan" subtitle={`${draftList.length} item siap diterbitkan`}>
            <div className="divide-y divide-gray-100">
              {draftList.map((item) => {
                const p = products.find((x) => x.id === item.produkId);
                const m = mitra.find((x) => x.id === item.mitraId);
                const v = p?.variants.find((x) => x.id === item.variantId);
                return (
                  <div key={item.key} className="px-3.5 py-2.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-gray-900">
                        {m?.name} · {p?.title}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {variantLabel(v)} · {item.qty} pcs · DP {item.dpPct}%
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDraftList((prev) => prev.filter((x) => x.key !== item.key))}
                      className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Icon name="x" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              {draftList.length === 0 && (
                <p className="px-3.5 py-6 text-center text-[11px] text-gray-400">
                  Belum ada item. Tambahkan dari form di samping.
                </p>
              )}
            </div>
            <div className="p-3.5 border-t border-gray-100">
              <Button className="w-full" disabled={!draftList.length} onClick={submitDrafts}>
                Terbitkan {draftList.length || ''} Pesanan
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
