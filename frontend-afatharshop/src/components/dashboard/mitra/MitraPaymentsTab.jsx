import React, { useState, useMemo, useEffect } from 'react';
import { SearchIcon, XIcon, EyeIcon } from '../../Icons';
import { api, mediaUrl } from '../../../services/api';

export default function MitraPaymentsTab({ orders = [], payments: paymentsProp = [] }) {
  const [selectedProof, setSelectedProof] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [remotePayments, setRemotePayments] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api.my.payments()
      .then((res) => {
        if (!cancelled && Array.isArray(res?.data)) {
          setRemotePayments(res.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedRemote = useMemo(() => {
    const list = remotePayments.length ? remotePayments : paymentsProp;
    return (list || []).map((p) => {
      const isAcc = p.status === 'disetujui' || p.status === 'ACC' || p.status === 'lunas';
      const isTolak = p.status === 'ditolak';
      return {
        id: `pay-server-${p.id}`,
        inv: p.invoice_number || p.order_number || `PAY-${p.id}`,
        title: `${(p.stage || 'Pembayaran').toUpperCase()} — ${p.order_number || 'Pesanan PO'}`,
        method: 'Transfer Bank',
        amount: Number(p.amount) || 0,
        status: isAcc ? 'Berhasil Diverifikasi' : isTolak ? `Ditolak: ${p.rejection_reason || 'Bukti tidak sesuai'}` : 'Menunggu Validasi',
        proofImage: p.proof_url ? mediaUrl(p.proof_url) : null,
        date: p.uploaded_at ? new Date(p.uploaded_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini',
        rawDate: p.uploaded_at || ''
      };
    });
  }, [remotePayments, paymentsProp]);

  const dynamicOrderPayments = useMemo(() => {
    const items = [];
    (orders || []).forEach((ord) => {
      if (ord.dpProof) {
        items.push({
          id: `pay-dp-${ord.orderNo || ord.id}`,
          inv: ord.orderNo || ord.id,
          title: `DP — ${ord.title}`,
          method: 'Transfer',
          amount: ord.dpNominal || 0,
          status: ord.dpStatus === 'ACC' || ord.dpStatus === 'Lunas' ? 'Berhasil Diverifikasi' : 'Menunggu Validasi',
          proofImage: ord.dpProof,
          date: ord.dpVerifiedAt || ord.date || 'Hari ini',
          rawDate: ord.date || ''
        });
      }
      if (ord.pelunasanProof) {
        items.push({
          id: `pay-pel-${ord.orderNo || ord.id}`,
          inv: ord.orderNo || ord.id,
          title: `Pelunasan — ${ord.title}`,
          method: 'Transfer',
          amount: ord.pelunasanNominal || 0,
          status: ord.pelunasanStatus === 'ACC' || ord.pelunasanStatus === 'Lunas' ? 'Berhasil Diverifikasi' : 'Menunggu Validasi',
          proofImage: ord.pelunasanProof,
          date: ord.pelunasanVerifiedAt || ord.date || 'Hari ini',
          rawDate: ord.date || ''
        });
      }
    });
    return items;
  }, [orders]);

  const combinedPayments = useMemo(() => {
    if (normalizedRemote.length > 0) {
      // Prioritaskan data resmi dari server
      const seen = new Set();
      const list = [];
      normalizedRemote.forEach((p) => {
        seen.add(p.id);
        list.push(p);
      });
      // Masukkan local yang belum tercakup di server jika ada
      dynamicOrderPayments.forEach((p) => {
        if (!seen.has(p.id)) list.push(p);
      });
      return list;
    }
    return dynamicOrderPayments;
  }, [normalizedRemote, dynamicOrderPayments]);

  const paymentGroups = useMemo(() => {
    if (combinedPayments.length > 0) {
      return [{ date: 'Riwayat Transaksi', items: combinedPayments }];
    }
    return [];
  }, [combinedPayments]);

  const allPaymentItems = useMemo(
    () => paymentGroups.flatMap((g) => g.items || []),
    [paymentGroups]
  );
  const totalPaid = useMemo(
    () => allPaymentItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [allPaymentItems]
  );
  const totalCount = allPaymentItems.length;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-wide">
          Riwayat Pembayaran
        </h2>
        <span className="text-xs text-stone-500 font-semibold">{totalCount} pembayaran</span>
      </div>

      {/* Top Maroon Metric Card (Matches Screenshot 5) */}
      <div className="bg-[#6B1416] text-white rounded-3xl p-5 sm:p-6 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs text-rose-100 font-medium">✓ Total Sudah Dibayar</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
            Rp {totalPaid.toLocaleString('id-ID')}
          </h3>
          <p className="text-xs text-rose-100/90 mt-1">{totalCount} pembayaran</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
        <div className="flex items-center gap-2">
          <span className="text-stone-600 font-medium">Tanggal Bayar Dari</span>
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

      {/* Grouped Payments List */}
      {paymentGroups.length === 0 ? (
        <div className="py-12 text-center text-stone-400">
          <p className="text-sm font-medium">Belum ada riwayat pembayaran.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {paymentGroups.map((group) => (
            <div key={group.date} className="space-y-3">
              <h4 className="text-xs font-bold text-stone-500 tracking-wider">
                {group.date}
              </h4>

              <div className="space-y-3">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 border border-stone-200/80 hover:border-[#6B1416]/30 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Left: Icon & Info */}
                    <div className="flex items-center gap-3.5">
                      {/* Maroon target / radio circle */}
                      <div className="w-8 h-8 rounded-full bg-rose-50 text-[#6B1416] border border-rose-200 flex items-center justify-center shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#6B1416]" />
                      </div>

                      <div>
                        <p className="text-[10px] font-mono text-stone-400">
                          {item.inv}
                        </p>
                        <h5 className="font-bold text-xs text-stone-800">
                          {item.title}
                        </h5>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500">
                          <span>{item.method}</span>
                          <span>•</span>
                          <button
                            onClick={() => setSelectedProof(item)}
                            className="text-[#6B1416] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                            <span>Lihat Bukti</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Detail */}
                    <div className="text-right sm:self-center">
                      <p className="font-bold text-stone-900 text-sm">
                        Rp {item.amount.toLocaleString('id-ID')}
                      </p>
                      <button
                        onClick={() => setSelectedProof(item)}
                        className="text-[11px] text-stone-400 hover:text-[#6B1416] transition font-medium cursor-pointer"
                      >
                        Detail &gt;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-100 text-xs text-stone-500">
        <p>Menampilkan {totalCount > 0 ? `1 - ${totalCount}` : '0'} dari {totalCount} pembayaran</p>
        <div className="flex items-center gap-1">
          <button className="px-2.5 py-1 border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer">
            &lt;
          </button>
          <button className="px-2.5 py-1 bg-[#6B1416] text-white font-bold rounded-lg cursor-pointer">
            1
          </button>
          <button className="px-2.5 py-1 border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer">
            &gt;
          </button>
        </div>
      </div>

      {/* Proof Modal */}
      {selectedProof && (
        <div
          onClick={() => setSelectedProof(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in cursor-zoom-out"
        >
          {/* Floating Close Button */}
          <button
            type="button"
            onClick={() => setSelectedProof(null)}
            className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 w-10 h-10 rounded-full bg-white text-stone-900 hover:bg-rose-500 hover:text-white flex items-center justify-center font-bold text-lg shadow-2xl transition cursor-pointer hover:scale-105 border border-stone-200"
            title="Tutup (Esc)"
            aria-label="Tutup"
          >
            ✕
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full max-h-[90vh] flex flex-col p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 cursor-default overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
              <h3 className="font-bold text-sm text-stone-900">Bukti Transfer Valid</h3>
              <button
                onClick={() => setSelectedProof(null)}
                className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center cursor-pointer transition font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs overflow-y-auto max-h-[70vh]">
              <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                <img
                  src={selectedProof.proofImage}
                  alt="Bukti Transfer"
                  className="w-full h-auto object-contain max-h-96 mx-auto"
                />
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1">
                <p className="font-bold text-stone-800">{selectedProof.title}</p>
                <p className="text-[11px] font-mono text-stone-500">{selectedProof.inv}</p>
                <p className="text-emerald-700 font-bold text-sm">
                  Nominal: Rp {selectedProof.amount.toLocaleString('id-ID')}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                  {selectedProof.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
