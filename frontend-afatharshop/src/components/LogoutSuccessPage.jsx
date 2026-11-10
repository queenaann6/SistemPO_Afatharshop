import React from 'react';

export default function LogoutSuccessPage({ onNavigateLogin, onNavigateHome }) {
  return (
    <div className="min-h-screen bg-[#FFE5D4] flex flex-col justify-center items-center px-4 py-8 relative antialiased">
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl border border-orange-100/60 p-8 sm:p-10 text-center space-y-6 animate-in fade-in duration-200">
        
        {/* Brand Header Logo */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border border-[#D4AF37] overflow-hidden bg-white shadow-xs mb-1.5 flex items-center justify-center">
            <img src="/logo.jpg" alt="AfatharShop Official" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h2 className="font-serif text-lg font-bold text-[#8B6A3E] tracking-wider leading-none">
              Afatharshop
            </h2>
            <p className="text-[10px] text-[#A6804A] tracking-widest uppercase mt-0.5 font-medium">
              OFFICIAL
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
            Selamat! Kamu berhasil keluar
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 leading-relaxed max-w-xs mx-auto">
            Terima kasih telah berbelanja di Afatharshop. Sampai jumpa kembali!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onNavigateLogin}
            className="w-full py-2.5 px-4 rounded-lg bg-white border border-stone-800 hover:bg-stone-50 text-stone-900 font-semibold text-xs sm:text-sm shadow-xs transition duration-150 cursor-pointer"
          >
            Masuk Kembali
          </button>

          <div>
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-xs text-stone-500 hover:text-stone-800 font-medium transition cursor-pointer"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>

      </div>

      {/* Footer copyright */}
      <div className="mt-8 text-center text-[11px] text-stone-500">
        © 2025 Afatharshop Official. Hak Cipta Dilindungi Undang-Undang.
      </div>
    </div>
  );
}
