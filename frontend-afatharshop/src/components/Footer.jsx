import React from 'react';
import { PhoneIcon, MapPinIcon, MailIcon, InstagramIcon, TiktokIcon } from './Icons';

export default function Footer() {
  return (
    <footer className="w-full bg-[#6B1416] text-white mt-12 border-t border-[#540D0F]">
      
      {/* Brand Logo Header Strip */}
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-6 border-b border-[#540D0F]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-full border-2 border-[#F0C973] overflow-hidden bg-white shadow-lg shrink-0">
            <img src="/logo.jpg" alt="Afathar Shop Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-[#F0C973] tracking-wide">
              AFATHAR SHOP
            </h3>
            <p className="text-xs sm:text-sm text-amber-200/90 font-medium tracking-widest uppercase mt-0.5">
              Moslem Womens Needs • Official Store & Distributor
            </p>
            <p className="text-xs text-amber-100/70 max-w-xl mt-1.5 leading-relaxed">
              Distributor resmi busana muslimah syar'i terpercaya. Menghadirkan brand-brand premium muslimah pilihan dengan sistem Pre-Order (PO) terintegrasi.
            </p>
          </div>
        </div>
      </div>

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
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white hover:scale-110 transition shadow-sm"
                title="Instagram Afathar Shop"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white hover:scale-110 transition shadow-sm"
                title="TikTok Afathar Shop"
              >
                <TiktokIcon className="w-4 h-4" />
              </a>
            </div>
            <p className="text-[11px] text-amber-100/70 pt-2 leading-relaxed">
              Dapatkan update katalog live, jadwal launching PO brand, dan video tutorial produk syar'i setiap hari di Instagram & TikTok <strong className="text-amber-200">@afatharshop</strong>.
            </p>
          </div>

          {/* Column 2: Customer Care */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm sm:text-base text-white tracking-wide">
              Customer Care
            </h3>
            <div className="space-y-2 text-xs text-amber-100/90">
              <a
                href="https://wa.me/6281219842339"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-[#F0C973] transition"
              >
                <PhoneIcon className="w-4 h-4 text-[#F0C973] shrink-0" />
                <span>+6281219842339 (Helpdesk Mitra & PO)</span>
              </a>
              <a
                href="https://wa.me/6281219842338"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-[#F0C973] transition"
              >
                <PhoneIcon className="w-4 h-4 text-[#F0C973] shrink-0" />
                <span>+6281219842338 (Konfirmasi Keuangan / Finance)</span>
              </a>
            </div>
            <p className="text-[11px] text-amber-100/70 pt-1">
              Jam Operasional: Senin - Sabtu (08:00 - 17:00 WIB)
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
                  Jl. Surajim no 2B, Atang Sanjaya Bogor Barat, Kota Bogor
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MailIcon className="w-4 h-4 text-[#F0C973] shrink-0" />
                <a
                  href="mailto:info@afatharshop.com"
                  className="hover:text-[#F0C973] transition"
                >
                  info@afatharshop.com
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
            © 2026 Afathar Shop Official (afatharshop.com). Seluruh hak cipta dilindungi.
          </p>
          <div className="flex items-center gap-2">
            <a href="#" className="hover:text-[#F0C973] transition">Kebijakan Privasi</a>
            <span>•</span>
            <a href="#" className="hover:text-[#F0C973] transition">Syarat & Ketentuan</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
