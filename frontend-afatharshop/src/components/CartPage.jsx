import React, { useState } from 'react';
import { ChevronRightIcon, XIcon, CartIcon, CheckIcon } from './Icons';

export default function CartPage({
  cartItems,
  onRemoveItem,
  onUpdateQty,
  onNavigateHome,
  onNavigateCatalog,
  onCheckout
}) {
  const [selectedItems, setSelectedItems] = useState(
    cartItems.map((_, idx) => idx)
  );

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    })
      .format(val)
      .replace('IDR', 'Rp');
  };

  const toggleSelect = (idx) => {
    if (selectedItems.includes(idx)) {
      setSelectedItems(selectedItems.filter((i) => i !== idx));
    } else {
      setSelectedItems([...selectedItems, idx]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map((_, idx) => idx));
    }
  };

  const activeCartItems = cartItems.filter((_, idx) =>
    selectedItems.includes(idx)
  );
  const totalPrice = activeCartItems.reduce(
    (sum, item) => sum + (item.price * item.qty),
    0
  );

  return (
    <div className="w-full px-4 py-4 space-y-5">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <button
            onClick={onNavigateHome}
            className="hover:text-[#6B1416] font-medium transition cursor-pointer"
          >
            Beranda
          </button>
          <ChevronRightIcon className="w-3 h-3 text-stone-400" />
          <span className="text-stone-800 font-bold">Keranjang Pre Order</span>
        </div>

        {/* Page Title (Matches Screenshot 4) */}
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
          Keranjang Pre Order
        </h1>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 shadow-xs space-y-3">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <CartIcon className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-stone-800 text-base">Keranjang Pre Order Kosong</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Anda belum menambahkan produk pre-order ke keranjang. Silakan jelajahi katalog busana muslimah syar'i kami.
            </p>
            <button
              onClick={onNavigateCatalog}
              className="mt-2 bg-[#6B1416] hover:bg-[#520C0E] text-white text-xs font-bold py-2.5 px-6 rounded-xl transition cursor-pointer"
            >
              Lihat Katalog Pre-Order
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Cart Items Table/List (8 Cols) */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* Select All Bar */}
              <div className="bg-white rounded-xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-stone-800">
                  <input
                    type="checkbox"
                    checked={
                      selectedItems.length === cartItems.length &&
                      cartItems.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-[#6B1416] focus:ring-[#6B1416] cursor-pointer"
                  />
                  <span>Pilih Semua ({cartItems.length} Produk)</span>
                </label>

                {selectedItems.length > 0 && (
                  <button
                    onClick={() => {
                      selectedItems
                        .sort((a, b) => b - a)
                        .forEach((i) => onRemoveItem(i));
                      setSelectedItems([]);
                    }}
                    className="text-stone-500 hover:text-red-600 font-medium transition cursor-pointer"
                  >
                    Hapus Pilihan
                  </button>
                )}
              </div>

              {/* Items Card List (Matches Screenshot 4) */}
              <div className="space-y-3">
                {cartItems.map((item, idx) => {
                  const isChecked = selectedItems.includes(idx);
                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      className="bg-white rounded-xl border border-stone-200/90 shadow-xs overflow-hidden transition"
                    >
                      {/* Store / Brand Header Bar */}
                      <div className="bg-stone-50 px-4 py-2 border-b border-stone-200 flex items-center gap-2 text-xs font-bold text-stone-800">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(idx)}
                          className="w-4 h-4 rounded text-[#6B1416] focus:ring-[#6B1416] cursor-pointer"
                        />
                        <span>🏪</span>
                        <span>{item.brand || 'AFATHAR SHOP'}</span>
                        <span className="text-stone-400 font-normal">•</span>
                        <span className="text-stone-600 font-medium truncate">
                          {item.title}
                        </span>
                      </div>

                      {/* Item Body Row */}
                      <div className="p-4 flex gap-4 items-center">
                        {/* Custom Checkbox on side */}
                        <div className="shrink-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(idx)}
                            className="w-4 h-4 rounded text-[#581C87] focus:ring-[#581C87] cursor-pointer"
                          />
                        </div>

                        {/* Image */}
                        <div className="w-20 h-24 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-1">
                          <h3 className="font-bold text-xs sm:text-sm text-stone-900 leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-xs sm:text-sm font-bold text-blue-700">
                            {formatRupiah(item.price)}
                          </p>
                          <p className="text-[11px] text-stone-500">
                            Variasi: <strong className="text-stone-700">{item.selectedModel || 'Standar'}</strong>, Warna: <strong className="text-stone-700">{item.selectedColor || 'Default'}</strong>
                            {item.selectedSize && `, Size: ${item.selectedSize}`}
                          </p>
                        </div>

                        {/* Quantity & Delete */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <button
                            onClick={() => onRemoveItem(idx)}
                            className="text-stone-400 hover:text-red-600 p-1 cursor-pointer transition"
                            title="Hapus dari keranjang"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-semibold text-stone-700">
                            Qty: {item.qty}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* RIGHT COLUMN: Order Summary (4 Cols) - Matches Screenshot 4 */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 space-y-4 sticky top-24">
                
                <div className="flex items-center justify-between text-sm sm:text-base font-bold text-stone-900">
                  <span>Total Harga</span>
                  <span className="text-base sm:text-lg font-bold text-stone-900">
                    {formatRupiah(totalPrice)}
                  </span>
                </div>

                <button
                  onClick={() => onCheckout(activeCartItems)}
                  disabled={selectedItems.length === 0}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold border transition cursor-pointer ${
                    selectedItems.length > 0
                      ? 'border-stone-800 text-stone-900 hover:bg-stone-50 shadow-xs'
                      : 'border-stone-200 text-stone-400 cursor-not-allowed bg-stone-50'
                  }`}
                >
                  Checkout ({selectedItems.length})
                </button>

                <div className="text-[11px] text-stone-500 space-y-1 pt-1 border-t border-stone-100">
                  <p>✓ Garansi alokasi kuota pre-order pabrik resmi</p>
                  <p>✓ Invoice resmi otomatis diteruskan ke Admin Finance</p>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
