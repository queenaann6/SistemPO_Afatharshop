import React from 'react';
import { CheckIcon, XIcon } from './Icons';

export default function SuccessAddToCartModal({ isOpen, onClose, onViewCart }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center border border-stone-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-stone-400 hover:text-stone-700 p-1 rounded-full cursor-pointer"
        >
          <XIcon className="w-4 h-4" />
        </button>

        {/* Green Checkmark Circle Icon (Matches Screenshot 3) */}
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center text-white mb-3 shadow-md">
          <CheckIcon className="w-7 h-7 stroke-[3]" />
        </div>

        {/* Title */}
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">
          BERHASIL DITAMBAHKAN!
        </h3>

        {/* Main Text */}
        <p className="text-sm font-bold text-stone-900 mb-1">
          Produk Anda sudah masuk keranjang
        </p>

        {/* Subtext */}
        <p className="text-xs text-stone-500 leading-relaxed mb-6 max-w-xs mx-auto">
          Pemesanan Anda telah tersimpan rapi di keranjang belanja
        </p>

        {/* CTA Button */}
        <button
          onClick={onViewCart}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#6B1416] hover:bg-[#520C0E] text-white shadow-md transition cursor-pointer"
        >
          Lihat Keranjang
        </button>

      </div>
    </div>
  );
}
