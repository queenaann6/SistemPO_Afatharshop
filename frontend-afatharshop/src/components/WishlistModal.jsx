import React from 'react';
import { XIcon, HeartIcon, ChevronRightIcon } from './Icons';

export default function WishlistModal({
  isOpen,
  onClose,
  wishlistItems = [],
  onSelectProduct,
  onRemoveWishlist,
  onNavigateCatalog
}) {
  if (!isOpen) return null;

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    })
      .format(val)
      .replace('IDR', 'Rp');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="px-5 py-4 bg-[#6B1416] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#F0C973]">
                <HeartIcon className="w-4 h-4 fill-[#F0C973]" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Wishlist Favorit
                </h3>
                <p className="text-[11px] text-[#F0C973]">
                  {wishlistItems.length} produk tersimpan
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-stone-200 hover:text-white transition cursor-pointer"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {wishlistItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center text-rose-300 mb-3">
                  <HeartIcon className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-stone-700">Wishlist Masih Kosong</p>
                <p className="text-xs text-stone-400 mt-1 max-w-xs leading-relaxed">
                  Belum ada produk favorit tersimpan. Tekan ikon hati (♥) pada katalog produk untuk menyimpannya di sini.
                </p>
                {onNavigateCatalog && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateCatalog();
                    }}
                    className="mt-4 px-4 py-2 bg-[#6B1416] hover:bg-[#520C0E] text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs"
                  >
                    Jelajahi Katalog
                  </button>
                )}
              </div>
            ) : (
              wishlistItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex gap-3 relative hover:border-[#6B1416]/30 transition"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-20 object-cover rounded-lg bg-stone-200 shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between text-xs">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-bold text-stone-400 uppercase">
                          {item.brand}
                        </span>
                        <button
                          onClick={() => onRemoveWishlist && onRemoveWishlist(item.id)}
                          className="text-stone-400 hover:text-red-600 p-0.5 cursor-pointer"
                          title="Hapus dari Wishlist"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="font-semibold text-stone-900 line-clamp-1 mt-0.5">
                        {item.title}
                      </h4>
                      <p className="text-xs font-bold text-[#6B1416] mt-1">
                        {formatRupiah(item.price)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-stone-200/80">
                      <span className="text-[10px] text-stone-500 bg-stone-200/60 px-1.5 py-0.5 rounded">
                        {item.category || 'Pre-Order'}
                      </span>
                      <button
                        onClick={() => {
                          onClose();
                          if (onSelectProduct) onSelectProduct(item);
                        }}
                        className="text-xs font-semibold text-[#6B1416] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Lihat Detail</span>
                        <ChevronRightIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {wishlistItems.length > 0 && (
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-between items-center text-xs">
              <span className="text-stone-500">
                Total: <strong className="text-stone-800">{wishlistItems.length} produk</strong>
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold rounded-lg transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
