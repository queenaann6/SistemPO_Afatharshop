import React from 'react';
import { CheckIcon, WhatsAppIcon } from './Icons';

export default function RegisterPage({
  onNavigateLogin,
  onNavigateHome
}) {
  const adminNumber = '6281219991888';
  const defaultMessage =
    'Halo Admin Afathar Shop, saya tertarik untuk mendaftar sebagai Mitra / Reseller resmi Afathar Shop. Mohon informasi syarat & langkah pendaftarannya. Terima kasih! 🙏✨';
  const waUrl = `https://wa.me/${adminNumber}?text=${encodeURIComponent(
    defaultMessage
  )}`;

  return (
    <div className="min-h-screen bg-[#FFE5D4] flex flex-col justify-center items-center px-4 py-10 relative">
      
      {/* Main Registration Card */}
      <div className="w-full max-w-[520px] bg-white rounded-3xl shadow-xl border border-orange-100/60 p-8 sm:p-10 space-y-6 text-center">
        
        {/* Brand Header Logo */}
        <div className="flex flex-col items-center justify-center">
          <img
            src="/logo-nobg.png"
            alt="AfatharShop Official"
            className="h-16 sm:h-20 w-auto object-contain mx-auto mb-1"
          />
        </div>

        {/* Program Badge */}
        <div>
          <span className="inline-block bg-[#FFF8EE] text-[#936E39] border border-[#F6E1C4] text-[10px] sm:text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
            PROGRAM KEMITRAAN & RESELLER
          </span>
        </div>

        {/* Heading */}
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight leading-snug">
          Tertarik Bergabung Menjadi Mitra Afathar Shop?
        </h1>

        {/* Description */}
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-normal">
          Dapatkan akses katalog pre-order sarimbit, abaya, dan khimar eksklusif, serta keuntungan komisi mitra hingga harga reseller spesial. Terhubung langsung dengan Admin WhatsApp kami untuk aktivasi akun pendaftaran Anda.
        </p>

        {/* Benefits Callout Box */}
        <div className="bg-[#FFFBF7] border border-[#FBEAD6] rounded-2xl p-4 sm:p-5 text-left space-y-2.5">
          <p className="text-[11px] font-bold text-[#8B6A3E] tracking-wider uppercase">
            KEUNTUNGAN EKSKLUSIF MITRA:
          </p>
          <ul className="space-y-2 text-xs text-stone-700">
            <li className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <CheckIcon className="w-3 h-3" />
              </span>
              <span>Akses Katalog Pre-Order Lebih Awal</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <CheckIcon className="w-3 h-3" />
              </span>
              <span>Harga Khusus</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <CheckIcon className="w-3 h-3" />
              </span>
              <span>Bimbingan & Materi Promosi Lengkap dari Admin</span>
            </li>
          </ul>
        </div>

        {/* Green WhatsApp Action Button */}
        <div className="space-y-2 pt-1">
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3.5 px-6 rounded-xl bg-[#1E7E4E] hover:bg-[#16673F] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md transition duration-150 cursor-pointer"
          >
            <WhatsAppIcon className="w-5 h-5 fill-white shrink-0" />
            <span>Lanjut Daftar via WhatsApp Admin</span>
          </a>
          
          {/* Admin Operating Hours */}
          <div className="space-y-0.5 text-center pt-0.5">
            <p className="text-[10px] sm:text-[11px] text-stone-600 font-medium">
              Admin Online: Senin - Jumat 09.00-17.00 • Sabtu 09.00-14.00
            </p>
            <p className="text-[9.5px] sm:text-[10px] text-stone-500">
              Hari Libur & Ramadhan akan ada perubahan jam kerja.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center pt-2">
          <div className="border-t border-stone-200 w-full"></div>
          <span className="bg-white px-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest absolute">
            ATAU
          </span>
        </div>

        {/* Footer Navigation Links */}
        <div className="space-y-2 pt-2">
          <p className="text-xs text-stone-600">
            Sudah punya akun resmi?{' '}
            <button
              type="button"
              onClick={onNavigateLogin}
              className="font-bold text-[#8B6A3E] hover:underline cursor-pointer"
            >
              Masuk Sekarang
            </button>
          </p>

          <div>
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-xs text-stone-500 hover:text-stone-800 font-medium transition cursor-pointer flex items-center justify-center gap-1 mx-auto"
            >
              <span>←</span>
              <span>Kembali ke Beranda</span>
            </button>
          </div>
        </div>

      </div>

      {/* Sub-footer copyright */}
      <div className="mt-8 text-center text-[11px] text-stone-500">
        © 2025 Afatharshop Official. Hak Cipta Dilindungi Undang-Undang.
      </div>

    </div>
  );
}
