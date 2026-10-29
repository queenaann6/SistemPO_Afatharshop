import React from 'react';

export default function HeroBanner({ onSelectSale, onSelectPreOrder }) {
  return (
    <section className="w-full px-4 pt-6 pb-2">
      <div className="max-w-7xl mx-auto">
        <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#7C181B] via-[#6B1416] to-[#4D0B0D] py-10 sm:py-14 px-6 sm:px-12 text-center text-white shadow-xl border border-amber-600/20 overflow-hidden">
          
          {/* Subtle background glow/luxury aura */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>

          {/* Official Brand Logo */}
          <div className="relative inline-flex items-center justify-center mb-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#F0C973] p-1 bg-white/95 shadow-xl hover:scale-105 transition-transform duration-300">
              <img
                src="/logo.jpg"
                alt="Afathar Shop Official Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>

          {/* Subtitle Header */}
          <p className="text-[#ECC467] text-[11px] sm:text-xs font-semibold tracking-[0.25em] uppercase mb-2">
            MOSLEM WOMENS NEEDS • OFFICIAL STORE
          </p>

          {/* Main Title */}
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-wider text-[#F5DC9F] mb-3 drop-shadow-sm">
            AFATHARSHOP
          </h1>

          {/* Description */}
          <p className="text-amber-100/90 text-xs sm:text-sm lg:text-base max-w-2xl mx-auto font-light leading-relaxed mb-6 sm:mb-8">
            Koleksi busana muslimah syar'i eksklusif dengan keanggunan siluet elegan & material premium.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 relative z-10">
            {/* Button 1: Gold "Lihat Katalog Sale" */}
            <button
              onClick={onSelectSale}
              className="bg-[#F0C973] hover:bg-[#E5BC64] text-[#420C0E] font-bold text-xs sm:text-sm px-6 py-2.5 sm:py-3 rounded-lg shadow-md hover:scale-103 transition-all duration-150 cursor-pointer"
            >
              Lihat Katalog Sale
            </button>

            {/* Button 2: WHITE "Katalog Pre-Order" (Adjusted to White as requested) */}
            <button
              onClick={onSelectPreOrder}
              className="bg-white hover:bg-stone-100 text-[#6B1416] font-bold text-xs sm:text-sm px-6 py-2.5 sm:py-3 rounded-lg shadow-md hover:scale-103 transition-all duration-150 cursor-pointer border border-white"
            >
              Katalog Pre-Order
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
