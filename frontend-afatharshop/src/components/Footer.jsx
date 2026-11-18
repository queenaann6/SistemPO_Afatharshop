import React from 'react';
import { PhoneIcon, MapPinIcon, MailIcon, InstagramIcon, TiktokIcon } from './Icons';

export default function Footer() {
  return (
    <footer className="w-full bg-[#6B1416] text-white mt-12 border-t border-[#540D0F]">

      {/* Main Footer Info */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 lg:gap-12">
          
          {/* Column 1: Social Media */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm sm:text-base text-white tracking-wide">
              Social Media
            </h3>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-amber-100/90 font-medium">Ikuti Kami</span>
              <a
                href="https://www.instagram.com/afatharshop"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white hover:scale-110 transition shadow-sm"
                title="Instagram Afatharshop"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href="https://www.tiktok.com/@afatharshop192"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white hover:scale-110 transition shadow-sm"
                title="TikTok Afatharshop"
              >
                <TiktokIcon className="w-4 h-4" />
              </a>
            </div>
            <p className="text-[11px] text-amber-100/70 pt-2 leading-relaxed">
              ikuti kami di social media @afatharshop untuk mendapatkan update terbaru tentang produk, promo, dan informasi menarik lainnya.
            </p>
          </div>

          {/* Column 2: Customer Care */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm sm:text-base text-white tracking-wide">
              Customer Care
            </h3>
            <div className="space-y-2 text-xs text-amber-100/90">
              <a
                href="https://wa.me/6281311495285"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-[#F0C973] transition"
              >
                <PhoneIcon className="w-4 h-4 text-[#F0C973] shrink-0" />
                <span> Admin 3 @afatharshop - Purchasing </span>
              </a>
              <a
                href="https://wa.me/6281537425493"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-[#F0C973] transition"
              >
                <PhoneIcon className="w-4 h-4 text-[#F0C973] shrink-0" />
                <span> Admin 2 @afatharshop - Finance </span>
              </a>
            </div>
            <p className="text-[11px] text-amber-100/70 pt-1">
              Jam Operasional: 
            </p>
            <p className="text-[11px] text-amber-100/70 pt-1">
                - Senin - Jumat (09:00 - 17:00 WIB) & Sabtu (09:00 - 14:00 WIB)
            </p>
            <p className="text-[11px] text-amber-100/70 leading-relaxed">
              Ada perubahan jam operasional saat Ramadhan. Silakan hubungi Admin untuk info lebih lanjut.
            </p>
          </div>
    
          {/* Column 3: Office */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm sm:text-base text-white tracking-wide">
              Office
            </h3>
            <div className="space-y-2 text-xs text-amber-100/90 leading-relaxed">
              <div className="flex items-start gap-2">
                <MapPinIcon className="w-4 h-4 text-[#F0C973] shrink-0 mt-0.5" />
                <span>
                  Jl. Bungur Raya Rt 12 Rw 08 Kel. Jakasampurna Kec. Bekasi Barat Kota Bekasi 17144, Jawa Barat, Indonesia
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MailIcon className="w-4 h-4 text-[#F0C973] shrink-0" />
                <a
                  href="mailto:cs4.afatharshop.com"
                  className="hover:text-[#F0C973] transition"
                >
                  cs4.afatharshop.com
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sub-footer Copyright */}
      <div className="border-t border-[#540D0F] bg-[#4D0B0D] py-4 px-4 text-[11px] text-amber-100/70">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p>
            © 2026 Afatharshop x Asaindo. Hak Cipta & Hak Merek Terdaftar. Semua Hak Dilindungi Undang-Undang.
          </p>
        </div>
      </div>
    </footer>
  );
}
