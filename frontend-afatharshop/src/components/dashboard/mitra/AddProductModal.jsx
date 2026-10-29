import React, { useState } from 'react';
import { XIcon } from '../../Icons';

export default function AddProductModal({
  isOpen,
  onClose,
  onSave,
  initialData = null
}) {
  if (!isOpen) return null;

  const variations = [
    { name: 'SCARF MOM', price: 92000 },
    { name: 'BROOCH LOGO N', price: 65000 },
    { name: 'DAD PANJANG', price: 295000 },
    { name: 'KHIMAR KIDS', price: 145000 },
    { name: 'MOM DRESS B ONLY (REQ BUSUI)', price: 395000 },
    { name: 'GOWN KIDS', price: 245000 },
    { name: 'DAD PENDEK', price: 275000 },
    { name: 'MOM ONESET ROK + VEST', price: 440000 },
    { name: 'GIRL DRESS B ONLY', price: 285000 },
    { name: 'SCARF KIDS', price: 75000 },
    { name: 'MOM ONESET CELANA ONLY', price: 380000 },
    { name: 'GIRL ONESET CELANA + VEST', price: 345000 },
    { name: 'MOM ONESET ROK ONLY', price: 385000 },
    { name: 'MOM ONESET CELANA + VEST', price: 445000 },
    { name: 'BOY PANJANG', price: 220000 },
    { name: 'BOY PENDEK', price: 195000 },
    { name: 'MOM DRESS A ONLY', price: 390000 },
    { name: 'KHIMAR MOM', price: 185000 },
    { name: 'VEST ONLY MOM', price: 165000 },
    { name: 'MOM DRESS B ONLY', price: 390000 },
    { name: 'BROOCH BULAT', price: 70000 },
    { name: 'MOM ONESET LUXURY ONLY', price: 485000 },
    { name: 'TOP ONLY MOM', price: 215000 },
    { name: 'SKIRT LUXURY ONLY', price: 225000 },
    { name: 'GIRL ONESET LUXURY', price: 365000 }
  ];

  const sizes = ['ALL', 'S', 'M', 'L', 'XL', 'XXL', 'KIDS 1', 'KIDS 2'];
  const colors = ['IVORY', 'EBONY', 'MAUVE', 'MAHOGANI', 'SANGRIA', 'NONE'];

  const [selectedVariation, setSelectedVariation] = useState(
    initialData?.variation || variations[0].name
  );
  const [selectedSize, setSelectedSize] = useState(
    initialData?.size || 'ALL'
  );
  const [selectedColor, setSelectedColor] = useState(
    initialData?.color || 'IVORY'
  );
  const [qty, setQty] = useState(initialData?.qty || 1);

  const activeVarObj = variations.find((v) => v.name === selectedVariation) || variations[0];

  const handleSave = () => {
    onSave({
      id: initialData?.id || Date.now(),
      title: 'SARIMBIT KARTIKA RAYA BATCH 2',
      series: 'NARARYA SARIMBIT KARTIKA RAYA BATCH 2',
      variant: `${selectedVariation} ${selectedSize} : ${selectedColor}`,
      variation: selectedVariation,
      size: selectedSize,
      color: selectedColor,
      qty: qty,
      price: activeVarObj.price,
      subtotal: activeVarObj.price * qty,
      dueDate: '20 Jan 2027',
      image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-stone-200 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-stone-100 flex items-center justify-between z-10">
          <h3 className="font-bold text-sm sm:text-base text-stone-900 tracking-wider uppercase">
            {initialData ? 'Ubah Varian Produk' : 'Tambah Produk'}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center transition cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-stone-700">
          
          {/* Product Summary Header Card (Matches Screenshot 4) */}
          <div className="flex items-start gap-4 p-3 bg-stone-50 rounded-2xl border border-stone-200">
            <img
              src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80"
              alt="Sarimbit Kartika Raya"
              className="w-20 h-24 rounded-xl object-cover shrink-0 border border-stone-200 shadow-xs"
            />
            <div className="flex-1 space-y-1">
              <h4 className="font-bold text-stone-900 text-sm leading-tight">
                NARARYA SARIMBIT KARTIKA RAYA BATCH 2
              </h4>
              <p className="font-bold text-base text-[#6B1416]">
                Rp {activeVarObj.price.toLocaleString('id-ID')}
              </p>
              
              <div className="mt-1.5 p-2 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-900">
                <span className="font-bold text-amber-800">Pre Order</span>
                <p className="text-[10px] text-amber-700 mt-0.5">Tutup PO: 25 Oktober 2026</p>
              </div>
            </div>
          </div>

          {/* Option Group 1: Variasi */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-800">
              Variasi:
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 border border-stone-100 rounded-2xl bg-stone-50/40">
              {variations.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => setSelectedVariation(v.name)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition border cursor-pointer ${
                    selectedVariation === v.name
                      ? 'bg-amber-100 text-amber-950 border-amber-300 ring-1 ring-amber-300 font-bold'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          {/* Option Group 2: Ukuran */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-800">
              Ukuran:
            </label>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                    selectedSize === s
                      ? 'bg-amber-100 text-amber-950 border-amber-300 ring-1 ring-amber-300 font-bold'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Option Group 3: Warna */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-800">
              Warna:
            </label>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                    selectedColor === c
                      ? 'bg-amber-100 text-amber-950 border-amber-300 ring-1 ring-amber-300 font-bold'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Option Group 4: Kuantitas Counter */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-800">
              Kuantitas:
            </label>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border border-stone-300 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-stone-100 font-bold cursor-pointer"
                >
                  -
                </button>
                <span className="w-10 text-center font-bold text-stone-800 text-xs">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((prev) => prev + 1)}
                  className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-stone-100 font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
              <span className="text-stone-400 text-xs">
                Subtotal: <strong className="text-stone-800">Rp {(activeVarObj.price * qty).toLocaleString('id-ID')}</strong>
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="w-full bg-[#B68D40] hover:bg-[#9E7730] text-white font-bold py-3 rounded-2xl shadow-sm transition cursor-pointer text-xs"
            >
              Simpan Perubahan
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
