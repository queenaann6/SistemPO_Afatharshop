import React, { useState } from 'react';
import {
  AlertTriangleIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  CreditCardIcon,
  PrinterIcon
} from '../../Icons';
import InvoiceModal from '../../InvoiceModal';
import { openInvoicePrintTab } from '../../../utils/printInvoice';

// Helper format Rupiah rapi standar Indonesia
export const formatRp = (val) => {
  const num = Math.round(Number(val) || 0);
  return `Rp ${num.toLocaleString('id-ID')}`;
};

export default function MitraBillsTab({ orders = [], currentUser, adminBankAccounts = [] }) {
  const initialBills = [
    {
      id: 1,
      orderNo: 'INV-20261012-0088',
      title: 'DP ALORA BAG - BATCH 3',
      amount: 82800,
      status: 'Belum Bayar',
      dueDate: '12 Okt 2026',
      notes: '-'
    },
    {
      id: 2,
      orderNo: '6a6846c836e4a',
      title: 'PELUNASAN DAHAYU SARIMBIT',
      amount: 1181250,
      status: 'Belum Bayar',
      dueDate: '30 Okt 2026',
      notes: '-'
    },
    {
      id: 3,
      orderNo: '6a83cae79db8a',
      title: 'PELUNASAN DAHAYU SARIMBIT B2',
      amount: 276750,
      status: 'Belum Bayar',
      dueDate: '14 Nov 2026',
      notes: '-'
    },
    {
      id: 4,
      orderNo: 'INV-20260818-1050',
      title: 'PELUNASAN SARIMBIT LE CLAIRE B2',
      amount: 179400,
      status: 'Belum Bayar',
      dueDate: '24 Nov 2026',
      notes: '-'
    },
    {
      id: 5,
      orderNo: 'INV-20261012-0088',
      title: 'PELUNASAN ALORA BAG - BATCH 3',
      amount: 124200,
      status: 'Belum Bayar',
      dueDate: '30 Nov 2026',
      notes: '-'
    },
    {
      id: 6,
      orderNo: 'INV-20260926-1039',
      title: 'PELUNASAN SARIMBIT SEKAR SASMITA',
      amount: 1149740,
      status: 'Belum Bayar',
      dueDate: '18 Jan 2027',
      notes: '-'
    },
    {
      id: 7,
      orderNo: '6ab7460a30824',
      title: 'PELUNASAN MUKENA SEKAR SASMITA',
      amount: 405000,
      status: 'Belum Bayar',
      dueDate: '18 Jan 2027',
      notes: '-'
    }
  ];

  const [bills, setBills] = useState(initialBills);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedPayBill, setSelectedPayBill] = useState(null);
  const [paySuccess, setPaySuccess] = useState(false);

  const totalBelumBayar = bills.reduce(
    (sum, b) => (b.status === 'Belum Bayar' ? sum + b.amount : sum),
    0
  );

  const handlePayConfirm = (e) => {
    e.preventDefault();
    if (selectedPayBill) {
      setBills((prev) =>
        prev.map((b) =>
          b.id === selectedPayBill.id
            ? { ...b, status: 'Menunggu Verifikasi Finance' }
            : b
        )
      );
      setPaySuccess(true);
      setTimeout(() => {
        setPaySuccess(false);
        setSelectedPayBill(null);
      }, 2500);
    }
  };

  // Cetak invoice spesifik pesanan terkait
  const handlePrintBillInvoice = (bill) => {
    // 1. Cari apakah ada data order riil yang cocok di daftar pesanan mitra
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
        title: bill.title,
        status: bill.status === 'Belum Bayar' ? 'UNPAID' : bill.status,
        paymentStatus: bill.status,
        date: bill.dueDate,
        recipientName: currentUser?.name || matchedOrder.recipientName || 'HENI',
        recipientPhone: currentUser?.phone || matchedOrder.recipientPhone || '(+62) 0812-1999-1888',
        recipientAddress: currentUser?.address || matchedOrder.recipientAddress
      }, adminBankAccounts);
      return;
    }

    // 2. Jika tidak ada di ordersList, cetak invoice resmi yang presisi untuk tagihan terkait ini
    openInvoicePrintTab({
      orderNo: bill.orderNo,
      invoice: bill.orderNo,
      title: bill.title,
      produk: bill.title,
      total: bill.amount,
      price: bill.amount,
      date: bill.dueDate,
      status: bill.status === 'Belum Bayar' ? 'UNPAID' : bill.status,
      paymentStatus: bill.status,
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
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-wide">
          Tagihan
        </h2>
        <span className="text-xs text-stone-500 font-semibold">
          {bills.filter((b) => b.status === 'Belum Bayar').length} tagihan aktif
        </span>
      </div>

      {/* 2 Big Stat Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Maroon Card: Belum Bayar */}
        <div className="bg-[#6B1416] text-white rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-rose-100 font-medium">Total Tagihan Belum Bayar</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight tabular-nums">
              {formatRp(totalBelumBayar)}
            </h3>
            <p className="text-xs text-rose-100/90 mt-1">
              {bills.filter((b) => b.status === 'Belum Bayar').length} tagihan
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-lg">▲</span>
          </div>
        </div>

        {/* Amber Card: Jatuh Tempo */}
        <div className="bg-amber-600 text-white rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-100 font-medium">Total Tagihan Jatuh Tempo</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight tabular-nums">
              {formatRp(0)}
            </h3>
            <p className="text-xs text-amber-100/90 mt-1">
              0 tagihan melewati jatuh tempo
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <AlertTriangleIcon className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
        <div className="flex items-center gap-2">
          <span className="text-stone-600 font-medium">Jatuh Tempo Dari</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-stone-600 font-medium">Sampai</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-700"
          />
        </div>

        <button
          onClick={() => {}}
          className="bg-stone-900 hover:bg-black text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition cursor-pointer"
        >
          <SearchIcon className="w-3.5 h-3.5" />
          <span>Cari</span>
        </button>

        <button
          onClick={() => {
            setFromDate('');
            setToDate('');
          }}
          className="bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
        >
          <XIcon className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500 font-bold bg-stone-50/50">
              <th className="py-3 px-3">No</th>
              <th className="py-3 px-3">Nomor Pesanan</th>
              <th className="py-3 px-3">Tagihan</th>
              <th className="py-3 px-3 text-right">Nominal</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3">Jatuh Tempo</th>
              <th className="py-3 px-3">Catatan</th>
              <th className="py-3 px-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-stone-700">
            {bills.map((bill, index) => (
              <tr key={bill.id} className="hover:bg-stone-50/60 transition">
                <td className="py-3.5 px-3 font-semibold text-stone-400">{index + 1}</td>
                <td className="py-3.5 px-3 font-mono font-medium text-stone-600">{bill.orderNo}</td>
                <td className="py-3.5 px-3 font-semibold text-stone-800">{bill.title}</td>
                <td className="py-3.5 px-3 font-bold text-stone-900 text-right tabular-nums whitespace-nowrap">
                  {formatRp(bill.amount)}
                </td>
                <td className="py-3.5 px-3 text-center">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      bill.status === 'Belum Bayar'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {bill.status}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-stone-600 whitespace-nowrap">{bill.dueDate}</td>
                <td className="py-3.5 px-3 text-stone-400">{bill.notes}</td>
                <td className="py-3.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handlePrintBillInvoice(bill)}
                      title={`Cetak Invoice ${bill.orderNo} (Buka Tab)`}
                      className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
                    >
                      <PrinterIcon className="w-3.5 h-3.5" />
                    </button>
                    {bill.status === 'Belum Bayar' ? (
                      <button
                        onClick={() => setSelectedPayBill(bill)}
                        className="bg-[#6B1416] hover:bg-[#520C0E] text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                      >
                        Bayar / Bukti
                      </button>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-600 whitespace-nowrap">
                        Proses Admin
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-stone-200 font-bold bg-stone-50/80">
              <td colSpan={3} className="py-3 px-3 text-stone-700">
                Total Tagihan (filter)
              </td>
              <td className="py-3 px-3 text-[#2563EB] text-sm text-right tabular-nums whitespace-nowrap">
                {formatRp(totalBelumBayar)}
              </td>
              <td colSpan={4}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pay / Upload Transfer Proof Modal */}
      {selectedPayBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-base text-stone-900">Konfirmasi Pembayaran PO</h3>
              <button
                onClick={() => setSelectedPayBill(null)}
                className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {paySuccess ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckIcon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-stone-900">Bukti Transfer Terkirim!</h4>
                <p className="text-xs text-stone-500">
                  Admin Finance Afathar Shop akan memverifikasi mutasi bank dalam 1x24 jam kerja.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePayConfirm} className="space-y-4 mt-4 text-xs">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1">
                  <p className="text-stone-500 text-[11px]">Rincian Tagihan:</p>
                  <p className="font-bold text-stone-800">{selectedPayBill.title}</p>
                  <p className="text-[#6B1416] font-bold text-base tabular-nums">
                    {formatRp(selectedPayBill.amount)}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Bank Tujuan Transfer</label>
                  <select className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800">
                    <option>BCA — 012-345-6789 (PT Afathar Niaga Indonesia)</option>
                    <option>Mandiri — 133-00-9876543-2 (Afathar Shop)</option>
                    <option>BRI — 0021-01-001234-56-7 (Afathar Official)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Unggah Bukti Transfer</label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    className="w-full text-xs text-stone-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setSelectedPayBill(null)}
                    className="px-4 py-2 border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Kirim Bukti Pembayaran
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
