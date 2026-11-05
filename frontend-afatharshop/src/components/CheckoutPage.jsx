import React, { useState } from 'react';
import {
  HomeIcon,
  ChevronRightIcon,
  XIcon,
  CheckIcon,
  TruckIcon,
  PencilIcon,
  PlusIcon
} from './Icons';
import AddressFormModal from './AddressFormModal';
import { getStoredAddresses, pushAddressBookItem, saveStoredAddresses } from './dashboard/mitra/mitraAddressBook';
import { dpPercentFor } from '../utils/terminScheme';

export default function CheckoutPage({
  checkoutItems = [],
  currentUser,
  onNavigateHome,
  onNavigateCart,
  onCompleteOrder,
  adminCouriers = []
}) {
  // Fallback items if cart was empty or directly checked out (Matches Screenshot 4)
  const items =
    checkoutItems && checkoutItems.length > 0
      ? checkoutItems
      : [
          {
            id: 'po-hera-bag',
            title: 'HESEA HERA BAG',
            variant: 'HERA BAG all',
            color: 'AMERICANO',
            price: 71200,
            qty: 1,
            weight: 0.999,
            image:
              'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80',
            store: 'Afathar Shop',
            storeCity: 'KOTA BOGOR'
          }
        ];

  // Address List (Matches Screenshot 2 & synchronizes with Mitra Address Book)
  const [addresses, setAddresses] = useState(() => getStoredAddresses());

  // Selected address
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    const list = getStoredAddresses();
    const primary = list.find((a) => a.isPrimary || a.isDefault);
    return primary ? primary.id : (list[0]?.id || 1);
  });
  const activeAddress =
    addresses.find((a) => a.id === selectedAddressId) || addresses[0] || {};

  // Options & Forms States
  const [aturSebelumKirim, setAturSebelumKirim] = useState(true);
  const [notes, setNotes] = useState('');
  const [selectedCourier, setSelectedCourier] = useState('Reguler');

  // Dropship Info State
  const [isDropshipActive, setIsDropshipActive] = useState(false);
  const [dropshipInfo, setDropshipInfo] = useState({
    senderName: '',
    senderPhone: ''
  });
  const [isDropshipModalOpen, setIsDropshipModalOpen] = useState(false);
  const [tempDropship, setTempDropship] = useState({
    senderName: '',
    senderPhone: ''
  });

  // Modal Controls
  const [isSelectAddressOpen, setIsSelectAddressOpen] = useState(false);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Calculations
  const totalItemsPrice = items.reduce(
    (sum, item) =>
      sum + ((Number(item.price) || 0) + (Number(item.addon) || 0)) * (Number(item.qty) || 1),
    0
  );
  const totalWeight = items.reduce(
    (sum, item) => sum + (Number(item.weight) || 0.5) * (Number(item.qty) || 1),
    0
  );
  const platformFee = 0;
  const shippingFee = 0; // Pre-Order: shipping calculated before dispatch
  const grandTotal = totalItemsPrice + platformFee + shippingFee;

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    })
      .format(val)
      .replace('IDR', 'Rp');
  };

  // Open Add Address Modal
  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setIsAddressFormOpen(true);
  };

  // Open Edit Address Modal
  const handleOpenEditAddress = (addr) => {
    setEditingAddress(addr);
    setIsAddressFormOpen(true);
  };

  // Save Address Handler (Saves & Persists)
  const handleSaveAddressItem = (savedAddr) => {
    if (editingAddress) {
      setAddresses((prev) => {
        const next = prev.map((item) =>
          item.id === editingAddress.id ? { ...item, ...savedAddr } : item
        );
        saveStoredAddresses(next);
        return next;
      });
    } else {
      const isFirst = addresses.length === 0;
      const newAddress = {
        ...savedAddr,
        isPrimary: isFirst,
        isDefault: isFirst
      };
      setAddresses((prev) => {
        const next = [newAddress, ...prev];
        saveStoredAddresses(next);
        return next;
      });
      setSelectedAddressId(newAddress.id);
    }
    pushAddressBookItem(savedAddr, editingAddress?.id).then((book) => {
      if (Array.isArray(book) && book.length) setAddresses(book);
    });
    setIsAddressFormOpen(false);
  };

  // Open Dropship Modal
  const handleOpenDropshipModal = () => {
    setTempDropship(dropshipInfo);
    setIsDropshipModalOpen(true);
  };

  // Save Dropship
  const handleSaveDropship = () => {
    if (tempDropship.senderName) {
      setIsDropshipActive(true);
      setDropshipInfo(tempDropship);
    } else {
      setIsDropshipActive(false);
    }
    setIsDropshipModalOpen(false);
  };

  // Confirm and Create Order
  const handleConfirmOrder = () => {
    setIsSummaryModalOpen(false);

    const firstItem = items[0] || {};
    const schemeDpPct = dpPercentFor(firstItem);
    const addonNominal = items.reduce(
      (sum, it) => sum + (Number(it.addon) || 0) * (Number(it.qty) || 1),
      0
    );
    const feeMitraNominal = items.reduce(
      (sum, it) => sum + (Number(it.feeNominal) || 0) * (Number(it.qty) || 1),
      0
    );
    const brandDiscountNominal = items.reduce(
      (sum, it) => sum + (Number(it.brandDiscountNominal) || 0),
      0
    );
    const feeCompanyNominal = Math.max(0, brandDiscountNominal - feeMitraNominal);

    const now = new Date();
    const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const newOrderData = {
      orderNo: `INV-${stamp}-${String(Date.now()).slice(-6)}`,
      brand: items[0]?.brand || '',
      date: new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      status: 'Menunggu ACC Admin',
      marketingStatus: 'PENDING',
      statusColor: 'bg-amber-100 text-amber-800',
      total: grandTotal,
      isClosedPO: false,
      closeDate: firstItem.closeDate || firstItem.tutupPO || '-',
      dpPct: schemeDpPct,
      paymentStages: firstItem.paymentStages || null,
      pelunasanDueDate: firstItem.pelunasanDueDate || '',
      addonNominal,
      feeMitraNominal,
      brandDiscountNominal,
      feeCompanyNominal,
      recipientName: activeAddress.name,
      recipientPhone: activeAddress.phoneDisplay || `(+62) ${activeAddress.phone}`,
      recipientAddress: activeAddress.address,
      recipientCity: activeAddress.city || '',
      addressId: activeAddress.backendId || activeAddress.id || null,
      courier: selectedCourier,
      aturSebelumKirim,
      notes,
      isDropshipActive,
      dropshipInfo,
      items: items.map((it, idx) => {
        const qtyItem = Number(it.qty) || 1;
        const priceItem = Number(it.price) || 0;
        const addonItem = Number(it.addon) || 0;
        const feeItem = Number(it.feeNominal) || 0;
        const brandDiscItem = Number(it.brandDiscountNominal) || 0;
        return {
          id: it.id || idx + 1,
          productId: it.backendId || it.id || null,
          variantId:
            it.variantId ??
            it.variants?.find(
              (v) =>
                (!it.selectedColor || String(v.color || '').toLowerCase() === String(it.selectedColor || '').toLowerCase()) &&
                (!it.selectedSize || String(v.size || '').toLowerCase() === String(it.selectedSize || '').toLowerCase())
            )?.id ??
            it.variants?.[0]?.id ??
            (Number.isInteger(Number(it.id)) ? Number(it.id) : null),
          title: it.title || 'PRE-ORDER ITEM',
          brand: it.brand || '',
          variant: it.variant || [it.selectedColor, it.selectedModel, it.selectedSize].filter(Boolean).join('/') || 'All Varian',
          color: it.color || it.selectedColor || 'Default',
          model: it.selectedModel || '',
          size: it.selectedSize || '',
          price: priceItem,
          basePrice: Number(it.basePrice) || priceItem + feeItem,
          qty: qtyItem,
          discountPct: 0,
          discountNominal: feeItem * qtyItem,
          feeNominal: feeItem,
          feeMitraNominal: feeItem * qtyItem,
          brandDiscountNominal: brandDiscItem,
          feeCompanyNominal: Math.max(0, brandDiscItem - feeItem * qtyItem),
          addon: addonItem,
          addonTotal: addonItem * qtyItem,
          subtotal: (priceItem + addonItem) * qtyItem,
          dueDate: it.pelunasanDueDate || '',
          image: it.image
        };
      })
    };

    if (onCompleteOrder) {
      onCompleteOrder(newOrderData);
    }
  };

  return (
    <div className="min-h-screen bg-[#faeae5] py-6 sm:py-8 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-xs text-stone-600">
          <button
            onClick={onNavigateHome}
            className="hover:text-[#6B1416] transition cursor-pointer"
          >
            Beranda
          </button>
          <ChevronRightIcon className="w-3 h-3 text-stone-400" />
          <button
            onClick={onNavigateCart}
            className="hover:text-[#6B1416] transition cursor-pointer"
          >
            Keranjang
          </button>
          <ChevronRightIcon className="w-3 h-3 text-stone-400" />
          <span className="font-semibold text-stone-900">Checkout Pre-Order</span>
        </div>

        {/* 2-Column Checkout Layout (Matches Screenshot 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Shipping Address & Products (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* CARD 1: Alamat Pengiriman */}
            <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-4">
              
              {/* Header */}
              <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                <HomeIcon className="w-4 h-4 text-stone-800" />
                <h2 className="text-sm font-bold text-stone-900">Alamat Pengiriman</h2>
              </div>

              {/* Active Address Display */}
              <div
                onClick={() => setIsSelectAddressOpen(true)}
                className="group p-3 rounded-lg border border-transparent hover:border-stone-200 hover:bg-stone-50/60 transition cursor-pointer flex items-start justify-between gap-3"
              >
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">
                      {activeAddress.name}
                    </span>
                    <span className="text-stone-500 font-medium">
                      {activeAddress.phoneDisplay}
                    </span>
                    {activeAddress.isPrimary && (
                      <span className="bg-stone-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Utama
                      </span>
                    )}
                  </div>
                  <p className="text-stone-600 leading-relaxed text-[11.5px]">
                    {activeAddress.address}
                  </p>
                </div>

                <div className="text-stone-400 group-hover:text-stone-800 transition pt-1">
                  <ChevronRightIcon className="w-4 h-4" />
                </div>
              </div>

              {/* Dropship Notice if Active */}
              {isDropshipActive && dropshipInfo.senderName && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-xs text-purple-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Pengirim Dropship:</span>{' '}
                    {dropshipInfo.senderName} ({dropshipInfo.senderPhone})
                  </div>
                  <button
                    onClick={handleOpenDropshipModal}
                    className="text-[11px] font-bold underline hover:text-purple-950 cursor-pointer"
                  >
                    Ubah
                  </button>
                </div>
              )}

              {/* Action Buttons: Dropship & Ubah Alamat */}
              <div className="space-y-2 pt-1">
                <div>
                  <button
                    type="button"
                    onClick={handleOpenDropshipModal}
                    className="bg-[#1c1917] hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer shadow-xs"
                  >
                    {isDropshipActive
                      ? '✓ Edit Informasi Pengirim (Dropship)'
                      : 'Tambah Informasi Pengirim (Dropship)'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSelectAddressOpen(true)}
                  className="w-full py-2.5 px-4 rounded-lg border border-stone-300 hover:bg-stone-50 text-xs font-semibold text-stone-700 transition cursor-pointer text-center"
                >
                  + Ubah Alamat Pengiriman
                </button>
              </div>

              {/* Checkbox: Atur Sebelum Pengiriman (Exact styling from Screenshot 4) */}
              <div className="bg-[#fefcf8] border border-amber-200/80 rounded-lg p-3.5 space-y-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-900 text-xs">
                  <input
                    type="checkbox"
                    checked={aturSebelumKirim}
                    onChange={(e) => setAturSebelumKirim(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-300 text-stone-900 focus:ring-stone-800"
                  />
                  <span>Atur Sebelum Pengiriman</span>
                </label>
                <p className="text-[11px] text-stone-500 pl-6 leading-relaxed">
                  Centang jika alamat & ongkos kirim ingin diatur nanti sebelum barang dikirim. Ongkir tidak dihitung sekarang (ditagih menyusul).
                </p>
              </div>

            </div>

            {/* CARD 2: Store & Product Item (Matches Screenshot 4) */}
            <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-4">
              
              {/* Store Identity */}
              <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                <span className="text-base">🏪</span>
                <span className="text-xs font-bold text-stone-900">Afathar Shop</span>
                <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider ml-1">
                  DISTRIBUTOR RESMI
                </span>
              </div>

              {/* Product Rows */}
              <div className="divide-y divide-stone-100">
                {items.map((item, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex items-start gap-3.5">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border border-stone-200 overflow-hidden bg-stone-50 shrink-0">
                        <img
                          src={
                            item.image ||
                            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80'
                          }
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <h3 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-stone-500">
                          Variasi: {item.variant || item.selectedModel || 'All'}
                        </p>
                        {item.color && (
                          <p className="text-[11px] text-stone-500">
                            Warna: {item.color || item.selectedColor}
                          </p>
                        )}
                        <p className="text-xs font-bold text-stone-900 pt-1">
                          {formatRupiah(item.price)}
                          {Number(item.addon) > 0 && (
                            <span className="ml-1 text-[10px] font-semibold text-amber-700">
                              + {formatRupiah(Number(item.addon))} tambahan
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-stone-500 font-medium">
                      Total: {item.qty || 1} ({((item.qty || 1) * 0.999).toFixed(3)} kg)
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Notes Field (Matches Screenshot 4) */}
              <div className="pt-2">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan"
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder:text-stone-400"
                />
              </div>

              {/* Courier Selection (Matches Screenshot 4) */}
              <div className="pt-3 border-t border-stone-100 space-y-2">
                <label className="text-xs font-bold text-stone-900">
                  Jasa Pengiriman
                </label>

                <div className="border border-stone-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-stone-900">{selectedCourier}</p>
                    <p className="text-[11px] text-stone-500">
                      Hitung Sebelum Pengiriman -
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] text-stone-400">Biaya</p>
                      <p className="text-xs font-bold text-stone-900">Rp 0</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCourierModalOpen(true)}
                      className="px-3 py-1 border border-stone-300 hover:bg-stone-50 text-xs font-semibold text-stone-700 rounded-md transition cursor-pointer"
                    >
                      Ubah
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: Order Summary (4 Cols) - Matches Screenshot 4 */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-xl border border-stone-200/90 shadow-xs p-5 sm:p-6 space-y-4 sticky top-24">
              
              <h2 className="text-sm font-bold text-stone-900 pb-2 border-b border-stone-100">
                Detail Pesanan
              </h2>

              <div className="space-y-2.5 text-xs text-stone-600">
                <div className="flex justify-between items-center">
                  <span>Total Harga Barang</span>
                  <span className="font-semibold text-stone-900">
                    {formatRupiah(totalItemsPrice)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Biaya Platform</span>
                  <span className="font-semibold text-stone-900">Rp 0</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Total Ongkos Kirim</span>
                  <span className="font-semibold text-stone-900">Rp 0</span>
                </div>

                <div className="flex justify-between items-center text-stone-400">
                  <span>Voucher</span>
                  <span>-</span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
                <span className="font-bold text-stone-900 text-xs sm:text-sm">Total</span>
                <span className="font-bold text-base text-stone-900">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              {/* Buat Pesanan Button (Exact Black Button from Screenshot 4) */}
              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(true)}
                className="w-full bg-[#1c1917] hover:bg-black text-white text-xs font-bold py-3 rounded-lg uppercase tracking-wider transition shadow-sm cursor-pointer"
              >
                Buat Pesanan
              </button>

              <div className="text-[10px] text-stone-400 text-center pt-1 leading-relaxed">
                Pre-Order distributor resmi • Invoice dan verifikasi otomatis diteruskan ke Admin Finance.
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ============================================================ */}
      {/* MODAL 1: PILIH ALAMAT (Exact Match to Screenshot 2)         */}
      {/* ============================================================ */}
      {isSelectAddressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HomeIcon className="w-4 h-4 text-stone-800" />
                <h3 className="text-sm font-bold text-stone-900">Pilih Alamat</h3>
              </div>
              <button
                onClick={() => setIsSelectAddressOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 transition cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Tambah Alamat Baru Button */}
              <button
                type="button"
                onClick={handleOpenAddAddress}
                className="w-full py-2.5 px-4 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 hover:bg-stone-50 transition cursor-pointer text-center"
              >
                Tambah Alamat Baru
              </button>

              {/* Address Radio Items */}
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                      selectedAddressId === addr.id
                        ? 'border-stone-800 bg-stone-50/50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {/* Radio Button */}
                    <div className="pt-0.5">
                      <input
                        type="radio"
                        name="selectedAddress"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="w-4 h-4 text-stone-900 focus:ring-stone-800"
                      />
                    </div>

                    {/* Address Content */}
                    <div className="flex-1 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{addr.name}</span>
                        <span className="text-stone-500 font-medium">
                          {addr.phoneDisplay}
                        </span>
                        {addr.isPrimary && (
                          <span className="border border-stone-400 text-stone-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                            Utama
                          </span>
                        )}
                      </div>

                      <p className="text-stone-600 text-[11px] leading-relaxed">
                        {addr.address}
                      </p>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditAddress(addr);
                          }}
                          className="px-3 py-1 border border-stone-300 rounded text-[11px] font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                        >
                          Ubah
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-100 bg-stone-50/60 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSelectAddressOpen(false)}
                className="w-full py-2.5 px-6 border border-stone-300 rounded-lg text-xs font-bold text-stone-800 hover:bg-stone-100 transition cursor-pointer text-center"
              >
                Simpan
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: TAMBAH / UBAH ALAMAT BARU (Screenshot 3)           */}
      {/* ============================================================ */}
      <AddressFormModal
        isOpen={isAddressFormOpen}
        onClose={() => setIsAddressFormOpen(false)}
        onSave={handleSaveAddressItem}
        editingAddress={editingAddress}
        currentUser={currentUser}
      />

      {/* ============================================================ */}
      {/* MODAL 3: DROPSHIP INFO MODAL                                */}
      {/* ============================================================ */}
      {isDropshipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95">
            
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">
                Informasi Pengirim (Dropship)
              </h3>
              <button
                onClick={() => setIsDropshipModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 transition cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-stone-700 font-medium">Nama Pengirim (Dropshipper)</label>
                <input
                  type="text"
                  value={tempDropship.senderName}
                  onChange={(e) =>
                    setTempDropship({ ...tempDropship, senderName: e.target.value })
                  }
                  placeholder="Contoh: Toko Berkah Hijab"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-500 text-stone-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-700 font-medium">Nomor Telepon Pengirim</label>
                <input
                  type="text"
                  value={tempDropship.senderPhone}
                  onChange={(e) =>
                    setTempDropship({ ...tempDropship, senderPhone: e.target.value })
                  }
                  placeholder="Contoh: 0812-3456-7890"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-500 text-stone-900"
                />
              </div>
            </div>

            <div className="p-4 border-t border-stone-100 bg-stone-50/60 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDropshipInfo({ senderName: '', senderPhone: '' });
                  setIsDropshipActive(false);
                  setIsDropshipModalOpen(false);
                }}
                className="flex-1 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
              >
                Hapus Dropship
              </button>
              <button
                type="button"
                onClick={handleSaveDropship}
                className="flex-1 py-2 bg-[#1c1917] hover:bg-black text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Simpan
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: PILIH EKSPEDISI / KURIR                            */}
      {/* ============================================================ */}
      {isCourierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-4 h-4 text-stone-800" />
                <h3 className="text-sm font-bold text-stone-900">Pilih Jasa Pengiriman</h3>
              </div>
              <button
                onClick={() => setIsCourierModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 transition cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-2.5 text-xs">
              {(adminCouriers && adminCouriers.length > 0
                ? adminCouriers
                    .filter((c) => c.active !== false)
                    .map((c) => ({
                      name: c.name,
                      desc: c.note || 'Hitung Sebelum Pengiriman - Rp 0'
                    }))
                : [
                    { name: 'Reguler', desc: 'Hitung Sebelum Pengiriman - Rp 0' },
                    { name: 'JNE Trucking (JTR)', desc: 'Spesialis koli besar (10kg+)' },
                    { name: 'J&T Cargo', desc: 'Door-to-door cargo ekonomis' },
                    { name: 'Dakota Cargo', desc: 'Rekomendasi luar pulau Jawa' },
                    { name: 'Ambil Sendiri di Gudang Pusat', desc: 'Gratis ongkir gudang' }
                  ]
              ).map((courier) => (
                <div
                  key={courier.name}
                  onClick={() => {
                    setSelectedCourier(courier.name);
                    setIsCourierModalOpen(false);
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    selectedCourier === courier.name
                      ? 'border-stone-800 bg-stone-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div>
                    <p className="font-bold text-stone-900">{courier.name}</p>
                    <p className="text-[11px] text-stone-500">{courier.desc}</p>
                  </div>
                  {selectedCourier === courier.name && (
                    <span className="text-stone-900 font-bold">✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: RINGKASAN PEMBAYARAN (Exact Match to Screenshot 5)  */}
      {/* ============================================================ */}
      {isSummaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">Ringkasan Pembayaran</h3>
              <button
                onClick={() => setIsSummaryModalOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 transition cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <h4 className="text-xs font-bold text-stone-800">Detail Pesanan</h4>

              <div className="space-y-2.5 text-xs text-stone-600">
                <div className="flex justify-between items-center">
                  <span>Total Harga Barang</span>
                  <span className="font-semibold text-stone-900">
                    {formatRupiah(totalItemsPrice)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Biaya Platform</span>
                  <span className="font-semibold text-stone-900">Rp 0</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Total Ongkos Kirim</span>
                  <span className="font-semibold text-stone-900">Rp 0</span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
                <span className="font-bold text-stone-900 text-xs sm:text-sm">Total</span>
                <span className="font-bold text-base text-stone-900">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              {/* Buat Pesanan Outline Button (Exact Match to Screenshot 5) */}
              <button
                type="button"
                onClick={handleConfirmOrder}
                className="w-full py-2.5 px-4 rounded-lg border border-stone-800 text-stone-900 hover:bg-stone-50 font-bold text-xs uppercase tracking-wider transition cursor-pointer mt-2"
              >
                Buat Pesanan
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
