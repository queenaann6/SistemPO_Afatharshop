import React, { useMemo } from 'react';
import { DocumentTextIcon, CheckIcon } from '../../Icons';
import { openInvoicePrintTab } from '../../../utils/printInvoice';

export default function MitraBillsHistoryTab({ orders = [], currentUser, adminBankAccounts = [] }) {
  const initialSettledBills = [];

  const settledBills = useMemo(() => {
    const derived = [];
    const handledKeys = new Set();

    (orders || []).forEach((order) => {
      const orderNo = order.orderNo || order.id || order.invoice;
      if (!orderNo) return;

      const isFullyLunas =
        String(order.status || '').toLowerCase().includes('lunas') ||
        Number(order.sisaTagihan || 0) <= 0;

      // 1. DP yang sudah ACC
      const dpIsAcc =
        order.dpStatus === 'ACC' ||
        order.dpStatus === 'acc' ||
        order.dpStatus === 'Terbukti';
      if (dpIsAcc && Number(order.dpNominal || 0) > 0) {
        const key = `dp-${orderNo}`;
        handledKeys.add(key);
        derived.push({
          id: key,
          orderNo,
          title: `DP — ${order.title || orderNo}`,
          amount: Number(order.dpNominal || 0),
          settledAt: order.dpVerifiedAt || order.date || 'Hari ini',
          status: 'Lunas',
          order
        });
      }

      // 2. Pelunasan yang sudah ACC
      const pelunasanIsAcc =
        order.pelunasanStatus === 'ACC' ||
        order.pelunasanStatus === 'acc' ||
        order.pelunasanStatus === 'Terbukti';
      if (pelunasanIsAcc && Number(order.pelunasanNominal || 0) > 0) {
        const key = `pelunasan-${orderNo}`;
        handledKeys.add(key);
        derived.push({
          id: key,
          orderNo,
          title: `PELUNASAN — ${order.title || orderNo}`,
          amount: Number(order.pelunasanNominal || 0),
          settledAt: order.pelunasanVerifiedAt || order.date || 'Hari ini',
          status: 'Lunas',
          order
        });
      }

      // 3. Ongkir yang sudah ACC
      const ongkirIsAcc =
        order.ongkirStatus === 'ACC' ||
        order.ongkirStatus === 'acc' ||
        order.ongkirStatus === 'Terbukti';
      if (ongkirIsAcc && Number(order.ongkir || 0) > 0) {
        const key = `ongkir-${orderNo}`;
        handledKeys.add(key);
        derived.push({
          id: key,
          orderNo,
          title: `ONGKIR — ${order.title || orderNo}`,
          amount: Number(order.ongkir || 0),
          settledAt: order.ongkirVerifiedAt || order.date || 'Hari ini',
          status: 'Lunas',
          order
        });
      }

      // 4. Jika order berstatus Lunas tapi individual DP/pelunasan belum spesifik di-ACC
      if (isFullyLunas && !dpIsAcc && !pelunasanIsAcc) {
        const key = `full-${orderNo}`;
        if (!handledKeys.has(key)) {
          handledKeys.add(key);
          derived.push({
            id: key,
            orderNo,
            title: `LUNAS — ${order.title || orderNo}`,
            amount: Number(order.total || 0),
            settledAt: order.date || 'Hari ini',
            status: 'Lunas',
            order
          });
        }
      }
    });

    return derived;
  }, [orders]);

  const totalSettledAmount = useMemo(
    () => settledBills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
    [settledBills]
  );

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
        recipientName: currentUser?.name || matchedOrder.recipientName || 'Mitra',
        recipientPhone: currentUser?.phone || matchedOrder.recipientPhone || '-',
        recipientAddress: currentUser?.address || matchedOrder.recipientAddress || '-'
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
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-wide">
          Riwayat Tagihan Selesai
        </h2>
        <span className="text-xs text-stone-500 font-semibold">{settledBills.length} tagihan lunas</span>
      </div>

      {/* Metric Summary Card */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white rounded-2xl p-5 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs text-emerald-100 font-medium">Total Pembayaran Terverifikasi (Lunas)</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight tabular-nums">
            Rp {Number(totalSettledAmount || 0).toLocaleString('id-ID')}
          </h3>
          <p className="text-xs text-emerald-100/90 mt-1">
            {settledBills.length} transaksi telah diverifikasi Admin Finance
          </p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
          <CheckIcon className="w-6 h-6 text-white" />
        </div>
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
                <td className="py-3.5 px-3 font-bold text-stone-900">Rp {Number(b.amount || 0).toLocaleString('id-ID')}</td>
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
