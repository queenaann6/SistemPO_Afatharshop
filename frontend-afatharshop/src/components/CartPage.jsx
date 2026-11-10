import React, { useMemo, useState } from 'react';
import { ChevronRightIcon, XIcon, CartIcon, CheckIcon } from './Icons';

export default function CartPage({
  cartItems,
  onRemoveItem,
  onUpdateQty,
  onNavigateHome,
  onNavigateCatalog,
  onCheckout,
  currentUser = null,
  activeRole = null,
  onNavigateDashboard = null
}) {
  const isAdmin = useMemo(() => {
    const r = String(currentUser?.roleId || currentUser?.role || activeRole?.id || '').toLowerCase();
    return ['marketing', 'purchasing', 'finance', 'owner', 'admin', 'superadmin'].includes(r);
  }, [currentUser, activeRole]);

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

  const toggleGroupSelect = (groupIndices) => {
    const allChecked = groupIndices.length > 0 && groupIndices.every((i) => selectedItems.includes(i));
    if (allChecked) {
      setSelectedItems((prev) => prev.filter((i) => !groupIndices.includes(i)));
    } else {
      setSelectedItems((prev) => [...new Set([...prev, ...groupIndices])]);
    }
  };

  const handleRemove = (originalIndex) => {
    setSelectedItems((prev) =>
      prev
        .filter((i) => i !== originalIndex)
        .map((i) => (i > originalIndex ? i - 1 : i))
    );
    if (onRemoveItem) onRemoveItem(originalIndex);
  };

  const handleRemoveSelected = () => {
    const sorted = [...selectedItems].sort((a, b) => b - a);
    sorted.forEach((i) => {
      if (onRemoveItem) onRemoveItem(i);
    });
    setSelectedItems([]);
  };

  // Mengelompokkan item keranjang berdasarkan Brand dan Artikel Produk
  const groups = useMemo(() => {
    const map = new Map();

    cartItems.forEach((item, originalIndex) => {
      const brandName = String(item.brand || 'AFATHARSHOP').trim();
      const articleTitle = String(item.title || item.name || 'Produk Pre-Order').trim();
      const groupKey = `${brandName.toLowerCase()}:::${articleTitle.toLowerCase()}`;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          brand: brandName,
          title: articleTitle,
          items: []
        });
      }

      map.get(groupKey).items.push({ item, originalIndex });
    });

    return Array.from(map.values());
  }, [cartItems]);

  const activeCartItems = cartItems.filter((_, idx) =>
    selectedItems.includes(idx)
  );
  const totalPrice = activeCartItems.reduce(
    (sum, item) => sum + (item.price * item.qty),
    0
  );

  const isAllChecked = selectedItems.length === cartItems.length && cartItems.length > 0;
  const isAllIndeterminate = selectedItems.length > 0 && selectedItems.length < cartItems.length;

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

        {/* Page Title */}
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
              Anda belum menambahkan produk pre-order ke keranjang. Silakan jelajahi katalog lebih lanjut.
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
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-stone-800 select-none">
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = isAllIndeterminate;
                    }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-[#6B1416] focus:ring-[#6B1416] cursor-pointer"
                  />
                  <span>Pilih Semua ({cartItems.length} Produk)</span>
                </label>

                {selectedItems.length > 0 && (
                  <button
                    onClick={handleRemoveSelected}
                    className="text-stone-500 hover:text-red-600 font-medium transition cursor-pointer"
                  >
                    Hapus Pilihan
                  </button>
                )}
              </div>

              {/* Items Card List (Grouped by Brand & Article) */}
              <div className="space-y-3">
                {groups.map((group) => {
                  const groupIndices = group.items.map((entry) => entry.originalIndex);
                  const selectedInGroup = groupIndices.filter((idx) => selectedItems.includes(idx));
                  const allGroupChecked = groupIndices.length > 0 && selectedInGroup.length === groupIndices.length;
                  const isGroupIndeterminate = selectedInGroup.length > 0 && selectedInGroup.length < groupIndices.length;

                  return (
                    <div
                      key={group.key}
                      className="bg-white rounded-xl border border-stone-200/90 shadow-xs overflow-hidden transition"
                    >
                      {/* Store / Brand Header Bar */}
                      <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200 flex items-center justify-between text-xs font-bold text-stone-800">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={allGroupChecked}
                            ref={(el) => {
                              if (el) el.indeterminate = isGroupIndeterminate;
                            }}
                            onChange={() => toggleGroupSelect(groupIndices)}
                            className="w-4 h-4 rounded text-[#6B1416] focus:ring-[#6B1416] cursor-pointer"
                          />
                          <span>🏪</span>
                          <span className="text-stone-900 font-bold">{group.brand}</span>
                          <span className="text-stone-400 font-normal">•</span>
                          <span className="text-stone-700 font-semibold truncate">
                            {group.title}
                          </span>
                          <span className="text-[11px] font-normal text-stone-500">
                            ({group.items.length} varian)
                          </span>
                        </label>
                      </div>

                      {/* Item Body Rows inside group */}
                      <div className="divide-y divide-stone-100">
                        {group.items.map(({ item, originalIndex }) => {
                          const isChecked = selectedItems.includes(originalIndex);
                          return (
                            <div
                              key={`${item.id || originalIndex}-${originalIndex}`}
                              className="p-4 flex gap-4 items-center hover:bg-stone-50/40 transition"
                            >
                              {/* Custom Checkbox on side */}
                              <div className="shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelect(originalIndex)}
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
                                  onClick={() => handleRemove(originalIndex)}
                                  className="text-stone-400 hover:text-red-600 p-1 cursor-pointer transition"
                                  title="Hapus dari keranjang"
                                >
                                  <XIcon className="w-4 h-4" />
                                </button>
                                <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => onUpdateQty && onUpdateQty(originalIndex, Math.max(1, (item.qty || 1) - 1))}
                                    className="px-2 py-0.5 text-stone-600 hover:bg-stone-100 text-xs font-bold transition cursor-pointer disabled:opacity-40"
                                    disabled={(item.qty || 1) <= 1}
                                    title="Kurangi jumlah"
                                  >
                                    -
                                  </button>
                                  <span className="px-2.5 py-0.5 text-xs font-semibold text-stone-800 bg-stone-50 select-none">
                                    {item.qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateQty && onUpdateQty(originalIndex, (item.qty || 1) + 1)}
                                    className="px-2 py-0.5 text-stone-600 hover:bg-stone-100 text-xs font-bold transition cursor-pointer"
                                    title="Tambah jumlah"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* RIGHT COLUMN: Order Summary (4 Cols) */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 space-y-4 sticky top-24">
                
                <div className="flex items-center justify-between text-sm sm:text-base font-bold text-stone-900">
                  <span>Total Harga</span>
                  <span className="text-base sm:text-lg font-bold text-stone-900">
                    {formatRupiah(totalPrice)}
                  </span>
                </div>

                {isAdmin ? (
                  <div className="space-y-3 pt-1">
                    <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-900 space-y-1.5 shadow-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-950">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-black shrink-0">
                          !
                        </span>
                        <span>Akun Staf / Admin Internal</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Akun Admin tidak melakukan checkout langsung di etalase toko. Untuk membuatkan pesanan atas nama mitra, silakan gunakan menu <strong>Input Pesanan Manual</strong> di Dashboard Purchasing.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateDashboard ? onNavigateDashboard('tambah_pesanan') : onNavigateHome()}
                      className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#6B1416] hover:bg-[#520C0E] text-white transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Ke Input Pesanan Manual</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                ) : (
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
                )}

                <div className="text-[11px] text-stone-500 space-y-1 pt-1 border-t border-stone-100">
                  <p>✓ Pengiriman Barang sesuai Estimasi</p>
                  <p>✓ Harap melakukan Pembayaran DP H-1 Close PO</p>
                  <p>✓ Orderan & Invoice otomatis diteruskan ke Admin</p>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
