import React from 'react';
import { XIcon, PrinterIcon } from './Icons';
import { openInvoicePrintTab } from '../utils/printInvoice';

export default function InvoiceModal({
  isOpen,
  onClose,
  order,
  bankAccounts = []
}) {
  if (!isOpen || !order) return null;

  const clean = (v) => String(v == null ? '' : v).trim();
  const withoutSuffix = (s) => clean(s).replace(/\s*\(.*\)\s*$/, '');
  const formatOrderDate = (raw) => {
    const val = clean(raw);
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      const [y, m, d] = val.slice(0, 10).split('-');
      return `${d}-${m}-${y}`;
    }
    return val || '18-10-2026';
  };

  const formatRupiah = (val) => {
    const num = Math.round(Number(val) || 0);
    return `Rp ${num.toLocaleString('id-ID')}`;
  };

  const orderNo = clean(order.orderNo) || clean(order.invoice) || '#INV-20261018-0146';
  const orderDate = formatOrderDate(order.date || order.checkoutDate || order.settledAt || order.created_at);

  const addressObj = order.address && typeof order.address === 'object' ? order.address : null;
  const recipientName =
    clean(order.recipientName) ||
    withoutSuffix(order.mitraName) ||
    clean(addressObj && addressObj.recipient) ||
    'HENI';
  const recipientPhone =
    clean(order.recipientPhone) ||
    clean(order.phone) ||
    clean(addressObj && addressObj.phone) ||
    '+6281219991888';
  const recipientAddress =
    clean(order.recipientAddress) ||
    (typeof order.address === 'string' ? clean(order.address) : '') ||
    (addressObj
      ? [
          addressObj.street,
          addressObj.kelurahan,
          addressObj.kecamatan,
          addressObj.city,
          addressObj.province,
          addressObj.postalCode,
          addressObj.note
        ]
          .map(clean)
          .filter(Boolean)
          .join(', ')
      : '') ||
    'Perumnas 1 Jl Bungur Raya Rt 12 Rw 7 No 86 Kelurahan Jakasampurna Kecamatan Bekasi Barat Kota Bekasi 17145, Jawa Barat';

  // Helper untuk membersihkan dan memperjelas varian, warna, dan ukuran
  const parseSpecs = (it) => {
    const title = clean(it.title) || clean(it.produk) || 'HESEA HERA BAG';
    let rawVariant = clean(it.variant) || clean(it.variation) || '';
    let color = clean(it.color) || clean(it.warna) || clean(it.selectedColor) || '';
    let size = clean(it.size) || clean(it.ukuran) || clean(it.selectedSize) || '';

    // Handle format "SCARF MOM ALL : IVORY"
    if (rawVariant.includes(' : ')) {
      const parts = rawVariant.split(' : ');
      if (parts[1] && !color) color = parts[1].trim();
      rawVariant = parts[0].trim();
    }

    let variant = rawVariant;
    const lowerVar = rawVariant.toLowerCase();
    const lowerTitle = title.toLowerCase();

    if (lowerVar === 'hera bag all' || lowerVar === 'all' || lowerVar === 'all varian') {
      variant = 'All Size';
    } else if (lowerVar.startsWith(lowerTitle) && lowerVar.length > lowerTitle.length) {
      variant = rawVariant.slice(lowerTitle.length).replace(/^[\s-:–]+/, '').trim() || 'All Size';
    } else if (!variant) {
      variant = 'All Size';
    }

    return { title, variant, color, size };
  };

  const rawItems =
    (Array.isArray(order.items) && order.items.length && order.items) ||
    (Array.isArray(order._projectMeta?.items) && order._projectMeta.items.length && order._projectMeta.items) ||
    null;

  let items;
  if (rawItems) {
    items = rawItems.map((it, index) => {
      const qty = Number(it.qty) || 1;
      const basePrice = Number(it.basePrice) || Number(it.retailPrice) || Number(it.hargaEcer) || 0;
      let price = Number(it.price) || 0;
      let discountPct = Number(it.discountPct) || 0;

      if (basePrice > price && discountPct === 0) {
        discountPct = Math.round(((basePrice - price) / basePrice) * 100);
      }
      if (price === 0 && basePrice > 0) {
        price = Math.round(basePrice * (1 - discountPct / 100));
      }

      const retailPrice = basePrice > 0 ? basePrice : (discountPct > 0 ? Math.round(price / (1 - discountPct / 100)) : price);
      const netMitraPrice = price > 0 ? price : Math.round(retailPrice * (1 - discountPct / 100));
      const addon = Number(it.addon) || 0;
      const subtotal = Number(it.subtotal) || (netMitraPrice + addon) * qty;
      const specs = parseSpecs(it);

      return {
        id: it.id ?? index + 1,
        title: specs.title,
        variant: specs.variant,
        color: specs.color,
        size: specs.size,
        retailPrice,
        netMitraPrice,
        qty,
        discountPct,
        addon,
        subtotal
      };
    });
  } else {
    const qty = Number(order.qty) || 1;
    const price = Number(order.price) || Number(order.nominal) || Number(order.total) || 71200;
    const addon = Number(order.addonNominal) ? Math.round(Number(order.addonNominal) / qty) : 0;
    const discountPct = Number(order.discountPct) || 0;
    const retailPrice = discountPct > 0 ? Math.round(price / (1 - discountPct / 100)) : price;
    const netMitraPrice = price;
    const specs = parseSpecs(order);

    items = [
      {
        id: 1,
        title: specs.title,
        variant: specs.variant || 'All Size',
        color: specs.color || 'Americano',
        size: specs.size || '',
        retailPrice,
        netMitraPrice,
        qty,
        discountPct,
        addon,
        subtotal: Number(order.subtotal) || (netMitraPrice + addon) * qty
      }
    ];
  }

  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + (Number(item.subtotal) || 0),
    0
  );
  const ongkir = Number(order.ongkir) || 0;
  const totalDue = totalPrice + ongkir;

  const rawStatus = clean(order.status || order.paymentStatus || '');
  const cleanStatus = rawStatus.toLowerCase();
  const isPaid =
    cleanStatus === 'selesai' ||
    cleanStatus === 'lunas' ||
    cleanStatus === 'paid' ||
    order.pelunasanStatus === 'ACC';
  const isWaitingVerification =
    cleanStatus.includes('menunggu') ||
    cleanStatus.includes('verifikasi') ||
    order.pelunasanStatus === 'Menunggu ACC';

  const statusText = isPaid ? 'PAID' : (isWaitingVerification ? 'MENUNGGU VERIFIKASI' : 'UNPAID');

  const paidAmount = Number(order.paidAmount) || (isPaid ? totalDue : (Number(order.dpNominal) || 0));
  const remainingAmount = Math.max(0, totalDue - paidAmount);

  const handlePrint = () => {
    openInvoicePrintTab({
      ...order,
      orderNo,
      date: orderDate,
      items,
      totalPrice,
      ongkir,
      totalDue,
      paidAmount,
      remainingAmount,
      recipientName,
      recipientPhone,
      recipientAddress,
      status: isPaid ? 'Lunas' : order.status
    }, bankAccounts);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      
      {/* Outer Modal Container */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in zoom-in-95">
        
        {/* Modal Top Control Bar */}
        <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between gap-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <PrinterIcon className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-xs sm:text-sm tracking-wide">
              Invoice <span className="font-mono text-amber-300">{orderNo}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
              title="Buka di tab baru"
            >
              Tab Baru
            </button>
            <button
              onClick={handlePrint}
              className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs px-4 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Cetak faktur / simpan PDF"
            >
              <PrinterIcon className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Tutup"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ON-SCREEN INVOICE DOCUMENT PREVIEW (Pure white background matching media_1793209247887_679a2d4b.png) */}
        <div className="p-6 sm:p-8 bg-white text-stone-900 font-sans space-y-3 max-h-[82vh] overflow-y-auto">
          
          {/* Top Row: Title & Status Box */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight leading-tight">
                Invoice
              </h1>

              {/* Official Afatharshop Logo from Index (Transparent Background) */}
              <div className="flex items-center gap-2.5 mt-1.5">
                <img
                  src="/logo-nobg.png"
                  alt="Afathar Shop"
                  className="w-10 h-10 object-contain bg-transparent"
                />
                <div className="flex flex-col">
                  <span className="font-serif font-bold text-sm text-[#92400e] tracking-wider leading-none">
                    AFATHAR SHOP
                  </span>
                  <span className="text-[8px] text-[#b45309] font-bold tracking-[1.8px] uppercase mt-0.5">
                    MOSLEM WOMENS NEEDS
                  </span>
                </div>
              </div>
            </div>

            {/* Status Box */}
            <div className={`px-4 py-1 text-xs font-extrabold tracking-wider border rounded-xs uppercase bg-transparent ${
              isPaid
                ? 'border-emerald-600 text-emerald-600'
                : isWaitingVerification
                ? 'border-amber-600 text-amber-600'
                : 'border-rose-600 text-rose-600'
            }`}>
              {statusText}
            </div>
          </div>

          {/* DITERBITKAN OLEH */}
          <div className="pt-1">
            <p className="text-[9.5px] text-stone-500 font-semibold uppercase tracking-wider">
              DITERBITKAN OLEH :
            </p>
            <p className="text-xs font-bold text-stone-900 mt-0.5">
              Afatharshop official
            </p>
          </div>

          {/* 2-Column Table for Nomor Invoice & Tanggal Order */}
          <table className="w-full border-collapse border border-stone-300 text-center text-xs">
            <tbody>
              <tr>
                <td className="w-1/2 py-2 px-3 border border-stone-300 bg-transparent">
                  <div className="text-[9.5px] text-stone-500 font-medium">Nomor Invoice</div>
                  <div className="font-mono font-bold text-stone-900 mt-0.5 text-xs">{orderNo}</div>
                </td>
                <td className="w-1/2 py-2 px-3 border border-stone-300 bg-transparent">
                  <div className="text-[9.5px] text-stone-500 font-medium">Tanggal Order</div>
                  <div className="font-bold text-stone-900 mt-0.5 text-xs">{orderDate}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TUJUAN PENGIRIMAN */}
          <div className="pt-0.5">
            <p className="text-[9.5px] font-bold text-stone-700 uppercase tracking-wider">
              TUJUAN PENGIRIMAN
            </p>
            <div className="mt-1 text-xs text-stone-800 leading-relaxed bg-transparent">
              <p>
                <strong className="text-stone-900">{recipientName}</strong>{' '}
                {recipientPhone && <span className="font-mono text-stone-600">({recipientPhone})</span>}
              </p>
              <p className="text-stone-600 text-[10.5px] mt-0.5">{recipientAddress}</p>
            </div>
          </div>

          {/* TABLE PRODUK */}
          <div className="overflow-x-auto pt-1">
            <table className="w-full text-left text-[10.5px] border-collapse border border-stone-300">
              <thead>
                <tr className="border-b border-stone-300 text-stone-700 font-bold text-[9.5px] bg-transparent">
                  <th className="py-2 px-2 border border-stone-300 text-center w-8">No</th>
                  <th className="py-2 px-2.5 border border-stone-300">Nama Produk</th>
                  <th className="py-2 px-2 border border-stone-300 text-center w-10">Qty</th>
                  <th className="py-2 px-2 border border-stone-300 text-right">Harga Ecer</th>
                  <th className="py-2 px-2 border border-stone-300 text-center w-12">Diskon</th>
                  <th className="py-2 px-2 border border-stone-300 text-right">Harga Mitra</th>
                  <th className="py-2 px-2 border border-stone-300 text-right">Tambahan Harga</th>
                  <th className="py-2 px-2.5 border border-stone-300 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const disc = Number(item.discountPct) || 0;
                  const netPrice = Number(item.netMitraPrice) || Math.round((Number(item.retailPrice) || 0) * (1 - disc / 100));
                  const addon = Number(item.addon) || 0;
                  const qtyItem = Number(item.qty) || 1;
                  const itemSubtotal = Number(item.subtotal) || (netPrice + addon) * qtyItem;

                  return (
                    <tr key={item.id || index}>
                      <td className="py-2 px-2 border border-stone-300 text-center">
                        {index + 1}
                      </td>
                      <td className="py-2 px-2.5 border border-stone-300">
                        <p className="font-bold text-stone-900 uppercase">
                          {item.title}
                        </p>
                        <div className="text-[10px] text-stone-800 mt-0.5 leading-snug">
                          <strong>Varian:</strong> <span className="font-medium text-stone-900">{item.variant}</span>
                          {item.color && (
                            <span> &bull; <strong>Warna:</strong> <span className="font-medium text-stone-900">{item.color}</span></span>
                          )}
                          {item.size && (
                            <span> &bull; <strong>Ukuran:</strong> <span className="font-medium text-stone-900">{item.size}</span></span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 border border-stone-300 text-center font-bold">
                        {qtyItem}
                      </td>
                      <td className="py-2 px-2 border border-stone-300 text-right tabular-nums whitespace-nowrap">
                        {formatRupiah(item.retailPrice)}
                      </td>
                      <td className="py-2 px-2 border border-stone-300 text-center">
                        {disc} %
                      </td>
                      <td className="py-2 px-2 border border-stone-300 text-right tabular-nums whitespace-nowrap">
                        {formatRupiah(netPrice)}
                      </td>
                      <td className="py-2 px-2 border border-stone-300 text-right tabular-nums whitespace-nowrap">
                        {addon > 0 ? formatRupiah(addon * qtyItem) : 'Rp 0'}
                      </td>
                      <td className="py-2 px-2.5 border border-stone-300 text-right font-bold text-stone-900 tabular-nums whitespace-nowrap">
                        {formatRupiah(itemSubtotal)}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Row */}
                <tr className="font-bold border-t-2 border-stone-300 text-[10.5px]">
                  <td colSpan={2} className="py-2 px-2.5 border border-stone-300 text-center uppercase tracking-wider">
                    TOTAL
                  </td>
                  <td className="py-2 px-2 border border-stone-300 text-center font-bold">
                    {totalQty}
                  </td>
                  <td colSpan={4} className="border border-stone-300"></td>
                  <td className="py-2 px-2.5 border border-stone-300 text-right font-bold text-stone-900 tabular-nums whitespace-nowrap">
                    {formatRupiah(totalPrice)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* FINANCIAL SUMMARY (Right aligned matching media_1793209247887_679a2d4b.png) */}
          <div className="flex justify-end pt-1">
            <div className="w-80 space-y-1 text-xs text-stone-800">
              <div className="flex justify-between items-center">
                <span className="text-stone-700">Total Pesanan</span>
                <span className="font-bold text-stone-900 tabular-nums">
                  {formatRupiah(totalPrice)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-stone-600">
                <span>Biaya Pengiriman</span>
                <span className="tabular-nums">
                  {ongkir > 0 ? formatRupiah(ongkir) : 'Rp 0 (Dihitung Sebelum Pengiriman)'}
                </span>
              </div>
              <div className="flex justify-between items-center font-bold text-stone-900">
                <span>Total Pembayaran</span>
                <span className="tabular-nums">
                  {formatRupiah(totalDue)}
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-700">
                <span>Sudah DP</span>
                <span className="tabular-nums">
                  {formatRupiah(paidAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center font-bold text-stone-900">
                <span>Sisa Pembayaran</span>
                <span className="tabular-nums font-extrabold">
                  {formatRupiah(remainingAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Page Number */}
          <div className="pt-2 flex justify-between items-center text-[9.5px] text-stone-400 border-t border-stone-100">
            <span>Afatharshop official store &bull; Faktur Pre-Order</span>
            <span>1/1</span>
          </div>

        </div>

      </div>

    </div>
  );
}
