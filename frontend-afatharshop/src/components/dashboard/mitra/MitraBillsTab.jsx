import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangleIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  CreditCardIcon,
  PrinterIcon,
  EyeIcon
} from '../../Icons';
import InvoiceModal from '../../InvoiceModal';
import { openInvoicePrintTab } from '../../../utils/printInvoice';

// Helper format Rupiah rapi standar Indonesia
export const formatRp = (val) => {
  const num = Math.round(Number(val) || 0);
  return `Rp ${num.toLocaleString('id-ID')}`;
};

export default function MitraBillsTab({ orders = [], currentUser, adminBankAccounts = [], onUploadPayment, onPayWithDeposit }) {
  const initialBills = [];

  const buildBillsFromOrders = (ordersList, fallbackBills = []) => {
    if (!Array.isArray(ordersList) || ordersList.length === 0) {
      return [];
    }

    const derived = [];
    const handledOrderNos = new Set();

    ordersList.forEach((order) => {
      const orderNo = order.orderNo || order.id || order.invoice;
      if (!orderNo) return;
      handledOrderNos.add(orderNo);

      const isCancelled =
        String(order.status || '').toLowerCase().includes('batal') ||
        String(order.marketingStatus || '').toLowerCase().includes('tolak');
      if (isCancelled) return;

      const isFullySettled =
        String(order.status || '').toLowerCase().includes('lunas') &&
        Number(order.sisaTagihan || 0) <= 0;

      // 1. Tagihan Termin 1: DP
      const dpNominal = Number(order.dpNominal || 0);
      const dpIsAcc =
        order.dpStatus === 'ACC' ||
        order.dpStatus === 'acc' ||
        order.dpStatus === 'Terbukti' ||
        isFullySettled;
      const isPendingAcc =
        order.marketingStatus === 'PENDING' ||
        order.stage === 'baru' ||
        String(order.status || '').toLowerCase().includes('menunggu acc');
      if (dpNominal > 0 && !dpIsAcc) {
        let status = 'Belum Bayar';
        if (isPendingAcc) {
          status = 'Menunggu ACC Admin';
        } else if (
          order.dpStatus === 'MENUNGGU' ||
          order.dpStatus === 'menunggu' ||
          order.dpStatus === 'Menunggu Verifikasi' ||
          order.dpProof
        ) {
          status = 'Menunggu Verifikasi Finance';
        } else if (order.dpStatus === 'TOLAK' || order.dpStatus === 'tolak') {
          status = 'Ditolak Finance (Upload Ulang)';
        }
        derived.push({
          id: `bill-dp-${orderNo}`,
          orderNo,
          title: `DP — ${order.title || orderNo}`,
          amount: dpNominal,
          status,
          dueDate: order.closeDate || order.date || '3 Hari Setelah Order',
          notes: isPendingAcc
            ? 'Menunggu persetujuan Admin Marketing sebelum pembayaran DP dibuka.'
            : order.dpNote || '-',
          proof: order.dpProof || null,
          bank: order.dpBank || '',
          paidDate: order.dpDate || '',
          billType: 'dp',
          isPendingAcc,
          order
        });
      }

      // 2. Tagihan Termin 2: Pelunasan
      const pelunasanNominal = Number(
        order.pelunasanNominal || Math.max(0, Number(order.total || 0) - dpNominal)
      );
      const pelunasanIsAcc =
        order.pelunasanStatus === 'ACC' ||
        order.pelunasanStatus === 'acc' ||
        order.pelunasanStatus === 'Terbukti' ||
        isFullySettled;
      if (pelunasanNominal > 0 && !pelunasanIsAcc) {
        let status = 'Belum Bayar';
        if (
          order.pelunasanStatus === 'MENUNGGU' ||
          order.pelunasanStatus === 'menunggu' ||
          order.pelunasanStatus === 'Menunggu Verifikasi' ||
          order.pelunasanProof
        ) {
          status = 'Menunggu Verifikasi Finance';
        } else if (order.pelunasanStatus === 'TOLAK' || order.pelunasanStatus === 'tolak') {
          status = 'Ditolak Finance (Upload Ulang)';
        }
        derived.push({
          id: `bill-pelunasan-${orderNo}`,
          orderNo,
          title: `PELUNASAN — ${order.title || orderNo}`,
          amount: pelunasanNominal,
          status,
          dueDate: order.pelunasanDueDate || '30 Hari Setelah DP',
          notes: order.pelunasanNote || '-',
          proof: order.pelunasanProof || null,
          bank: order.pelunasanBank || '',
          paidDate: order.pelunasanDate || '',
          billType: 'pelunasan',
          order
        });
      }

      // 3. Tagihan Ongkir (jika ada ongkir tersendiri belum lunas)
      const ongkirNominal = Number(order.ongkir || 0);
      const ongkirIsAcc =
        order.ongkirStatus === 'ACC' ||
        order.ongkirStatus === 'acc' ||
        order.ongkirStatus === 'Terbukti' ||
        isFullySettled;
      if (ongkirNominal > 0 && !ongkirIsAcc) {
        let status = 'Belum Bayar';
        if (
          order.ongkirStatus === 'MENUNGGU' ||
          order.ongkirStatus === 'menunggu' ||
          order.ongkirProof
        ) {
          status = 'Menunggu Verifikasi Finance';
        }
        derived.push({
          id: `bill-ongkir-${orderNo}`,
          orderNo,
          title: `ONGKIR — ${order.title || orderNo}`,
          amount: ongkirNominal,
          status,
          dueDate: order.date || '-',
          notes: order.shippingNote || '-',
          proof: order.ongkirProof || null,
          bank: order.ongkirBank || '',
          paidDate: order.ongkirDate || '',
          billType: 'ongkir',
          order
        });
      }
    });

    return derived;
  };

  const [bills, setBills] = useState(() => buildBillsFromOrders(orders, initialBills));

  useEffect(() => {
    setBills(buildBillsFromOrders(orders, initialBills));
  }, [orders]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedPayBill, setSelectedPayBill] = useState(null);
  const [payMethod, setPayMethod] = useState('deposit');
  const [paySuccess, setPaySuccess] = useState(false);
  const [payBank, setPayBank] = useState('BCA — 012-345-6789 (PT Afathar Niaga Indonesia)');
  const [payProofImage, setPayProofImage] = useState(null);
  const [payProofFileName, setPayProofFileName] = useState('');
  const [previewProof, setPreviewProof] = useState(null);

  const userBalance = Number(String(currentUser?.balance || '').replace(/[^0-9]/g, '')) || 0;

  const totalBelumBayar = bills.reduce(
    (sum, b) => (b.status === 'Belum Bayar' ? sum + b.amount : sum),
    0
  );

  const handlePayWithDepositSubmit = () => {
    if (!selectedPayBill) return;
    if (userBalance < selectedPayBill.amount) {
      alert('Saldo deposit Anda tidak mencukupi untuk melunasi tagihan ini.');
      return;
    }
    const todayDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const updatedBill = {
      ...selectedPayBill,
      status: 'Lunas (Dipotong Deposit)',
      bank: 'Saldo Deposit Mitra',
      paidDate: todayDate
    };

    setBills((prev) =>
      prev.map((b) => (b.id === selectedPayBill.id ? updatedBill : b))
    );

    if (onPayWithDeposit) {
      onPayWithDeposit({
        orderNo: selectedPayBill.orderNo,
        billTitle: selectedPayBill.title,
        amount: selectedPayBill.amount,
        billType: selectedPayBill.billType
      });
    }

    setPaySuccess(true);
    setTimeout(() => {
      setPaySuccess(false);
      setSelectedPayBill(null);
    }, 2000);
  };

  const handlePayConfirm = (e) => {
    e.preventDefault();
    if (!payProofImage) {
      alert('Silakan upload file foto/bukti transfer terlebih dahulu.');
      return;
    }
    if (selectedPayBill) {
      const todayDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      const updatedBill = {
        ...selectedPayBill,
        status: 'Menunggu Verifikasi Finance',
        proof: payProofImage,
        bank: payBank,
        paidDate: todayDate
      };

      setBills((prev) =>
        prev.map((b) => (b.id === selectedPayBill.id ? updatedBill : b))
      );

      if (onUploadPayment) {
        onUploadPayment({
          id: Date.now(),
          orderNo: selectedPayBill.orderNo,
          mitraName: currentUser?.name || 'Mitra',
          title: selectedPayBill.title,
          nominal: selectedPayBill.amount,
          bank: payBank,
          note: selectedPayBill.notes || 'Pembayaran Tagihan',
          image: payProofImage,
          date: todayDate,
          status: 'Menunggu Validasi'
        });
      }

      setPaySuccess(true);
      setTimeout(() => {
        setPaySuccess(false);
        setSelectedPayBill(null);
        setPayProofImage(null);
        setPayProofFileName('');
      }, 2000);
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
        recipientName: currentUser?.name || matchedOrder.recipientName || 'Mitra',
        recipientPhone: currentUser?.phone || matchedOrder.recipientPhone || '-',
        recipientAddress: currentUser?.address || matchedOrder.recipientAddress || '-'
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
      recipientName: currentUser?.name || 'Mitra',
      recipientPhone: currentUser?.phone || '-',
      recipientAddress: currentUser?.address || '-',
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
                        type="button"
                        onClick={() => {
                          setPayProofImage(null);
                          setPayProofFileName('');
                          setSelectedPayBill(bill);
                        }}
                        className="bg-[#6B1416] hover:bg-[#520C0E] text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                      >
                        Bayar / Bukti
                      </button>
                    ) : bill.status === 'Menunggu ACC Admin' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg whitespace-nowrap">
                        ⏳ Menunggu ACC
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewProof({
                            title: bill.title,
                            status: bill.status,
                            amount: bill.amount,
                            bank: bill.bank || 'BCA (PT Afathar Niaga Indonesia)',
                            date: bill.paidDate || bill.dueDate,
                            proof: bill.proof || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'
                          })
                        }
                        className="bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-[10px] px-2.5 py-1 rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
                        title="Lihat Bukti Transfer"
                      >
                        <EyeIcon className="w-3.5 h-3.5 text-[#6B1416]" />
                        <span>Lihat Bukti</span>
                      </button>
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
                type="button"
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
                <h4 className="font-bold text-stone-900">Pembayaran Berhasil Diproses!</h4>
                <p className="text-xs text-stone-500">
                  {payMethod === 'deposit'
                    ? 'Tagihan telah dipotong langsung dari Saldo Deposit dan status langsung diperbarui.'
                    : 'Admin Finance Afathar Shop akan memverifikasi mutasi bank dalam 1x24 jam kerja.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4 mt-4 text-xs">
                {/* Rincian Tagihan */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-1">
                  <p className="text-stone-500 text-[11px]">Rincian Tagihan:</p>
                  <p className="font-bold text-stone-800 text-sm">{selectedPayBill.title}</p>
                  <p className="text-[#6B1416] font-extrabold text-lg tabular-nums">
                    {formatRp(selectedPayBill.amount)}
                  </p>
                </div>

                {/* Metode Pembayaran: Pilihan Saldo Deposit vs Transfer Bank */}
                <div className="space-y-2">
                  <p className="font-semibold text-stone-700">Pilih Metode Pembayaran:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayMethod('deposit')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        payMethod === 'deposit'
                          ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-stone-900">💰 Saldo Deposit</span>
                        {payMethod === 'deposit' && <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                        Sisa: {formatRp(userBalance)}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayMethod('transfer')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        payMethod === 'transfer'
                          ? 'border-[#6B1416] bg-rose-50/70 ring-1 ring-[#6B1416]'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-stone-900">🏦 Transfer Bank</span>
                        {payMethod === 'transfer' && <CheckIcon className="w-3.5 h-3.5 text-[#6B1416]" />}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">Upload bukti transfer</p>
                    </button>
                  </div>
                </div>

                {/* Opsi 1: Bayar dengan Saldo Deposit */}
                {payMethod === 'deposit' && (
                  <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-base">⚡</span>
                      <div>
                        <p className="font-bold text-emerald-900 text-xs">Pelunasan Instan & Otomatis</p>
                        <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                          Tidak perlu transfer manual dan tidak perlu upload bukti transfer. Tagihan langsung berstatus <b>Lunas</b> saat dikonfirmasi.
                        </p>
                      </div>
                    </div>

                    {userBalance >= selectedPayBill.amount ? (
                      <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-emerald-800">Sisa saldo setelah bayar:</p>
                          <p className="font-bold text-xs text-emerald-900">{formatRp(userBalance - selectedPayBill.amount)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={handlePayWithDepositSubmit}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                        >
                          Bayar via Deposit
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                        ⚠️ Saldo deposit Anda ({formatRp(userBalance)}) tidak mencukupi untuk tagihan ini ({formatRp(selectedPayBill.amount)}). Silakan gunakan metode <b>Transfer Bank</b> atau top-up saldo deposit Anda terlebih dahulu.
                      </div>
                    )}
                  </div>
                )}

                {/* Opsi 2: Transfer Bank Manual */}
                {payMethod === 'transfer' && (
                  <form onSubmit={handlePayConfirm} className="space-y-4">
                    <div className="space-y-1">
                      <label className="font-medium text-stone-700">Bank Tujuan Transfer</label>
                      <select
                        value={payBank}
                        onChange={(e) => setPayBank(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800"
                      >
                        {adminBankAccounts && adminBankAccounts.length > 0 ? (
                          adminBankAccounts.map((b) => (
                            <option key={b.id || b.accountNo} value={`${b.bank} — ${b.accountNo} (a.n ${b.holder})`}>
                              {b.bank} — {b.accountNo} (a.n {b.holder})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="BCA — 012-345-6789 (PT Afathar Niaga Indonesia)">
                              BCA — 012-345-6789 (PT Afathar Niaga Indonesia)
                            </option>
                            <option value="Mandiri — 133-00-9876543-2 (Afathar Shop)">
                              Mandiri — 133-00-9876543-2 (Afathar Shop)
                            </option>
                            <option value="BRI — 0021-01-001234-56-7 (Afathar Official)">
                              BRI — 0021-01-001234-56-7 (Afathar Official)
                            </option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-stone-700">Unggah Bukti Transfer</label>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPayProofFileName(file.name);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setPayProofImage(reader.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-xs text-stone-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer"
                      />
                      {payProofFileName && (
                        <p className="text-[11px] text-emerald-600 font-medium">✓ File terpilih: {payProofFileName}</p>
                      )}
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
            )}
          </div>
        </div>
      )}

      {/* Preview Modal for Uploaded Proof in Bills */}
      {previewProof && (
        <div
          onClick={() => setPreviewProof(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    previewProof.status === 'Lunas' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <h3 className="font-bold text-sm text-stone-900">
                  {previewProof.status === 'Lunas'
                    ? 'Bukti Transfer Valid (ACC Admin)'
                    : 'Bukti Transfer Terkirim'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewProof(null)}
                className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center cursor-pointer transition font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="w-full h-56 bg-stone-100 rounded-xl overflow-hidden border border-stone-200 flex items-center justify-center">
                {previewProof.proof ? (
                  <img
                    src={previewProof.proof}
                    alt="Bukti Transfer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-stone-400">Tidak ada gambar</span>
                )}
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500">Tagihan:</span>
                  <span className="font-bold text-stone-800">{previewProof.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Nominal:</span>
                  <span className="font-bold text-[#6B1416]">
                    {formatRp(previewProof.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Bank Tujuan:</span>
                  <span className="text-stone-700">
                    {previewProof.bank || 'BCA (PT Afathar Niaga Indonesia)'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-stone-200/60">
                  <span className="text-stone-500">Status Validasi:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      previewProof.status === 'Lunas'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {previewProof.status === 'Lunas'
                      ? '✓ Disetujui Admin Finance'
                      : '⏳ Menunggu Verifikasi Finance'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPreviewProof(null)}
              className="w-full py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Tutup Preview Bukti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
