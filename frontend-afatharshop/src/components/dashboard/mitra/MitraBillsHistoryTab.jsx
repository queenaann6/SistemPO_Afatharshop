import React from 'react';
import { DocumentTextIcon, CheckIcon } from '../../Icons';
import { openInvoicePrintTab } from '../../../utils/printInvoice';

export default function MitraBillsHistoryTab({ orders = [], currentUser, adminBankAccounts = [] }) {
  const settledBills = [
    {
      id: 'settled-1',
      orderNo: 'INV/26/10/MH/HENI/348',
      title: 'PELUNASAN — KARLA',
      amount: 63400,
      settledAt: '07 Okt 2026',
      status: 'Lunas'
    },
    {
      id: 'settled-2',
      orderNo: 'feb3600c8024',
      title: 'DP 1 — MUKENA SEKAR SASMITA',
      amount: 270000,
      settledAt: '06 Okt 2026',
      status: 'Lunas'
    },
    {
      id: 'settled-3',
      orderNo: 'INV/26/10/MH/HENI/319',
      title: 'DP — SARIMBIT SEKAR SASMITA',
      amount: 954000,
      settledAt: '06 Okt 2026',
      status: 'Lunas'
    },
    {
      id: 'settled-4',
      orderNo: 'INV/26/09/MH/HENI/070',
      title: 'Pelunasan — ALDA MINI BAG',
      amount: 39125,
      settledAt: '08 Sep 2026',
      status: 'Lunas'
    }
  ];

  const handleDownloadInvoice = (bill) => {
    // 1. Cari apakah ada data order lengkap yang cocok di daftar pesanan mitra
    const matchedOrder = (orders || []).find(
      (o) =>
        o.orderNo === bill.orderNo ||
        o.invoice === bill.orderNo ||
        (o.title &&
          bill.title &&
          o.title
            .toLowerCase()
            .includes(
              bill.title
                .toLowerCase()
                .replace(/^(dp\s*\d*|pelunasan)\s*[-—]\s*/i, '')
                .trim()
            ))
    );

    if (matchedOrder) {
      openInvoicePrintTab({
        ...matchedOrder,
        orderNo: bill.orderNo,
        invoice: bill.orderNo,
        status: 'Lunas',
        paymentStatus: 'Lunas',
        date: bill.settledAt,
        recipientName: currentUser?.name || matchedOrder.recipientName || 'HENI',
        recipientPhone: currentUser?.phone || matchedOrder.recipientPhone || '(+62) 0812-1999-1888',
        recipientAddress: currentUser?.address || matchedOrder.recipientAddress
      }, adminBankAccounts);
      return;
    }

    // 2. Jika tidak ada di daftar pesanan aktif, generate invoice resmi spesifik tagihan ini
    openInvoicePrintTab({
      orderNo: bill.orderNo,
      invoice: bill.orderNo,
      title: bill.title,
      produk: bill.title,
      total: bill.amount,
      date: bill.settledAt,
      status: 'Lunas',
      paymentStatus: 'Lunas',
      recipientName: currentUser?.name || 'HENI',
      recipientPhone: currentUser?.phone || '(+62) 0812-1999-1888',
      recipientAddress:
        currentUser?.address ||
        'Perumnas 1 Jl Bungur Raya Rt 12 Rw 7 No 86 Kelurahan Jakasampurna Kecamatan Bekasi Barat Kota Bekasi 17145, Jawa Barat',
      items: [
        {
          id: bill.id,
          title: bill.title.replace(/^(dp\s*\d*|pelunasan)\s*[-—]\s*/i, '').trim(),
          variant: bill.title.toUpperCase().includes('DP')
            ? 'Termin DP (Uang Muka Pre-Order)'
            : 'Termin Pelunasan Pre-Order',
          qty: 1,
          price: bill.amount,
          addon: 0,
          subtotal: bill.amount
        }
      ]
    }, adminBankAccounts);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-6">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-wide">
          Riwayat Tagihan Selesai
        </h2>
        <span className="text-xs text-stone-500 font-semibold">{settledBills.length} tagihan lunas</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500 font-bold bg-stone-50/50">
              <th className="py-3 px-3">No</th>
              <th className="py-3 px-3">Nomor Tagihan</th>
              <th className="py-3 px-3">Deskripsi Produk</th>
              <th className="py-3 px-3">Nominal</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Tanggal Lunas</th>
              <th className="py-3 px-3 text-right">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-stone-700">
            {settledBills.map((b, i) => (
              <tr key={b.id} className="hover:bg-stone-50/50 transition">
                <td className="py-3.5 px-3 font-semibold text-stone-400">{i + 1}</td>
                <td className="py-3.5 px-3 font-mono font-medium text-stone-600">{b.orderNo}</td>
                <td className="py-3.5 px-3 font-semibold text-stone-800">{b.title}</td>
                <td className="py-3.5 px-3 font-bold text-stone-900">Rp {b.amount.toLocaleString('id-ID')}</td>
                <td className="py-3.5 px-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <CheckIcon className="w-3 h-3" />
                    <span>{b.status}</span>
                  </span>
                </td>
                <td className="py-3.5 px-3 text-stone-500">{b.settledAt}</td>
                <td className="py-3.5 px-3 text-right">
                  <button
                    onClick={() => handleDownloadInvoice(b)}
                    className="text-[#6B1416] hover:underline font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                    title={`Buka / Unduh Invoice ${b.orderNo}`}
                  >
                    <DocumentTextIcon className="w-3.5 h-3.5" />
                    <span>Unduh PDF</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
