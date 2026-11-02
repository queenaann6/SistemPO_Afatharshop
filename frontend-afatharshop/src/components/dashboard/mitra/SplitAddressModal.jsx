import React, { useEffect, useMemo, useState } from 'react';
import { XIcon } from '../../Icons';

export default function SplitAddressModal({
  isOpen,
  onClose,
  address,
  items = [],
  onSave
}) {
  const rows = useMemo(
    () =>
      (items || []).map((item) => {
        const splits = item.splits || [];
        const addressId = address?.id;
        const current = splits
          .filter((s) => String(s.address?.id) === String(addressId))
          .reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
        const allocatedElsewhere = splits
          .filter((s) => String(s.address?.id) !== String(addressId))
          .reduce((sum, s) => sum + (Number(s.qty) || 0), 0);
        const max = Math.max(0, (Number(item.qty) || 1) - allocatedElsewhere);
        return { item, current, max };
      }),
    [items, address]
  );

  const [qtyByItem, setQtyByItem] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    const next = {};
    rows.forEach(({ item, current }) => {
      next[item.id] = current;
    });
    setQtyByItem(next);
  }, [isOpen, rows]);

  if (!isOpen || !address) return null;

  const qtyOf = (row) =>
    qtyByItem[row.item.id] === undefined ? row.current : qtyByItem[row.item.id];

  const setQty = (row, raw) => {
    const val = Math.max(0, Math.min(row.max, Number(raw) || 0));
    setQtyByItem((prev) => ({ ...prev, [row.item.id]: val }));
  };

  const configuredCount = rows.filter((row) => qtyOf(row) > 0).length;
  const totalQty = rows.reduce((sum, row) => sum + qtyOf(row), 0);

  const handleSave = () => {
    onSave?.(rows.map((row) => ({ itemId: row.item.id, qty: qtyOf(row) })));
    onClose?.();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-stone-200 animate-in zoom-in-95"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-stone-100 flex items-start justify-between gap-4 z-10">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-stone-900 tracking-wide">
              Pilih Produk &mdash; {address.recipient || address.name}
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
              {address.city}
              {address.subdistrict ? `, ${address.subdistrict}` : ''} &bull; {address.phone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Produk */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="hidden sm:grid grid-cols-[1fr_70px_170px] gap-3 px-3 pb-2 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wide">
            <span>Produk</span>
            <span className="text-center">Total</span>
            <span className="text-center">Qty di Sini</span>
          </div>

          <div className="divide-y divide-stone-100">
            {rows.map((row) => {
              const qty = qtyOf(row);
              const disabled = row.max === 0;
              return (
                <div
                  key={row.item.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_70px_170px] gap-2 sm:gap-3 items-center py-3 px-1 sm:px-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-800 truncate">
                      {row.item.title} &mdash; {row.item.variant}
                    </p>
                    {disabled && (
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        Seluruh qty sudah dialokasikan ke alamat lain
                      </p>
                    )}
                  </div>

                  <div className="text-xs font-bold text-stone-700 sm:text-center">
                    {row.item.qty}x
                  </div>

                  <div className="flex flex-col items-start sm:items-center gap-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={row.max}
                        value={qty}
                        disabled={disabled}
                        onChange={(e) => setQty(row, e.target.value)}
                        className={`w-16 border rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20 ${
                          disabled
                            ? 'bg-stone-100 text-stone-400 border-stone-200'
                            : 'bg-white text-stone-900 border-stone-300'
                        }`}
                      />
                      <span className="text-[11px] text-stone-500 font-semibold">/ {row.max}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        qty > 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {qty > 0 ? `Sudah diatur ${qty}x` : 'Belum diatur'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-[11px] font-semibold flex flex-wrap items-center justify-between gap-2">
            <span>
              {configuredCount} dari {rows.length} produk sudah diatur untuk alamat ini.
            </span>
            <span>Total qty: {totalQty}x</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
