import React, { useState, useRef, useEffect, useMemo } from 'react';
import api, { mediaUrl } from '../../../services/api';
import { WalletIcon, PlusIcon, CheckIcon, EyeIcon, CameraIcon, XIcon } from '../../Icons';

export default function MitraDepositTab({ currentUser, onDepositSubmit, adminBankAccounts = [], deposits = [] }) {
  const fileInputRef = useRef(null);

  // Form States
  const [nominal, setNominal] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState(null);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPreviewModalImg(null);
      }
    };
    if (previewModalImg) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewModalImg]);

  // Rekening resmi dari database (dikelola admin finance); tanpa daftar bawaan.
  const bankOptions = (adminBankAccounts || [])
    .filter((b) => b.active !== false)
    .map((b) => ({
      id: b.backendId ?? b.id,
      clientId: b.id,
      name: `Bank ${b.bank}`,
      accountNumber: b.accountNo,
      holder: b.holder,
      logo: b.bank
    }));

  // Deposit Submissions History
  const [depositHistory, setDepositHistory] = useState([]);

  const activeDepositHistory = useMemo(() => {
    const userDeposits = (deposits || []).filter((d) => {
      const dName = String(d.mitraName || '').toLowerCase();
      const uName = String(currentUser?.name || 'Mitra').toLowerCase();
      return !dName || dName.includes(uName) || uName.includes(dName);
    });

    if (userDeposits.length === 0) {
      return depositHistory;
    }

    const mapped = userDeposits.map((d) => {
      const st = String(d.status || '').toLowerCase();
      const isAcc = st === 'acc' || st.includes('berhasil') || st.includes('terbukti');
      const isTolak = st === 'tolak' || st.includes('tolak') || st.includes('batal');
      return {
        id: String(d.id || '').toUpperCase().startsWith('DEP') ? d.id : `DEP-${d.id}`,
        date: d.date || 'Hari ini',
        nominal: Number(d.nominal || 0),
        bank: d.bank || '-',
        status: isAcc ? 'Berhasil Masuk Saldo' : isTolak ? 'Ditolak Finance' : 'Menunggu Validasi Admin Finance',
        statusColor: isAcc
          ? 'bg-emerald-100 text-emerald-800'
          : isTolak
          ? 'bg-rose-100 text-rose-800'
          : 'bg-amber-100 text-amber-800',
        proof: mediaUrl(d.proof || ''),
        note: d.note || ''
      };
    });

    const existingIds = new Set(mapped.map((m) => m.id));
    const localNew = depositHistory.filter((lh) => !existingIds.has(lh.id));
    return [...localNew, ...mapped];
  }, [deposits, currentUser?.name, depositHistory]);

  // Handle Image File Selection
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setFormError('Ukuran gambar maksimal 3 MB.');
      return;
    }
    setFormError('');
    setProofFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setProofImage(reader.result);
    reader.readAsDataURL(file);
  };

  // Submit Handler
  const handleSubmitDeposit = async (e) => {
    e.preventDefault();
    setFormError('');
    const amount = parseInt(nominal, 10);
    if (!amount || amount < 50000) {
      setFormError('Minimal pengajuan deposit adalah Rp 50.000.');
      return;
    }
    if (!proofFile) {
      setFormError('Silakan upload foto/gambar bukti transfer terlebih dahulu.');
      return;
    }
    if (!bankOptions.length) {
      setFormError('Rekening tujuan belum dikonfigurasi admin. Hubungi admin finance.');
      return;
    }

    const currentBankObj =
      bankOptions.find((b) => String(b.id) === chosenBankId) || bankOptions[0];

    setIsSubmitting(true);
    try {
      const uploaded = await api.management.uploadFile(proofFile, 'proof');
      const proofPath = uploaded?.data?.path;
      if (!proofPath) throw new Error('Bukti transfer tidak tersimpan di server.');

      const created = await api.my.createDeposit({
        bank_account_id: currentBankObj.id,
        amount,
        proof_url: proofPath,
        description: notes || 'Pengajuan deposit saldo reseller'
      });
      const row = created?.data;

      setDepositHistory([
        {
          id: row?.id != null ? `DEP-${row.id}` : `DEP-${Date.now().toString().slice(-6)}`,
          date: 'Hari ini',
          nominal: amount,
          bank: `${currentBankObj.name} (${currentBankObj.accountNumber})`,
          status: 'Menunggu Validasi Admin Finance',
          statusColor: 'bg-amber-100 text-amber-800',
          proof: mediaUrl(row?.proof || proofPath)
        },
        ...depositHistory
      ]);

      if (onDepositSubmit) {
        onDepositSubmit({
          ...(row || {}),
          id: row?.id ?? Date.now(),
          orderNo: row?.code || `DEP-${row?.id ?? Date.now()}`,
          mitraName: currentUser?.name || 'Mitra',
          title: 'Top Up Deposit Saldo Mitra',
          nominal: amount,
          bank: `${currentBankObj.name} (${currentBankObj.accountNumber})`,
          note: row?.note || notes || 'Pengajuan deposit saldo reseller',
          image: mediaUrl(row?.proof || proofPath),
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          status: 'Menunggu Validasi'
        });
      }

      setShowSuccess(true);
      setNominal('');
      setProofImage(null);
      setProofFile(null);
      setNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      setFormError(err?.message || 'Pengajuan deposit gagal dikirim ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBankObj =
    bankOptions.find((b) => String(b.id) === String(selectedBank)) || bankOptions[0];
  const chosenBankId = selectedBank ? String(selectedBank) : String(bankOptions[0]?.id ?? '');

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-wide">
            Saldo & Deposit Reseller
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manajemen saldo deposit untuk pembayaran DP otomatis tanpa transfer berulang
          </p>
        </div>
      </div>

      {/* Saldo Metric Banner */}
      <div className="bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#6B1416] text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
            <WalletIcon className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <p className="text-xs text-amber-200/90 font-medium">Saldo Deposit Aktif Anda</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold mt-0.5 tracking-tight">
              {currentUser?.balance || 'Rp 0'}
            </h3>
          </div>
        </div>

        <div className="text-right text-[11px] text-stone-300 sm:max-w-xs leading-relaxed">
          <span>
            Verifikasi transfer deposit diproses langsung oleh tim <strong>Admin Finance</strong>.
          </span>
        </div>
      </div>

      {/* FORM: Input Nominal, Pilihan Bank, Upload Gambar (Matches User Request) */}
      <div className="p-6 bg-stone-50/70 rounded-3xl border border-stone-200 space-y-6">
        
        <div className="border-b border-stone-200 pb-3">
          <h3 className="font-bold text-sm text-stone-900 tracking-wide">
            Form Pengajuan Deposit / Transfer
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Masukkan nominal transfer, pilih rekening bank distributor tujuan, dan lampirkan bukti transfer.
          </p>
        </div>

        {showSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Pengajuan Deposit Berhasil Dikirim!</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Admin Finance Afathar Shop akan mencocokkan mutasi bank Anda dalam waktu maksimal 1x24 jam kerja.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitDeposit} className="space-y-5 text-xs text-stone-700">
          
          {/* 1. Input Nominal (Rp) */}
          <div className="space-y-2">
            <label className="block font-bold text-stone-800">
              1. Nominal Deposit (Rp):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400">
                Rp
              </span>
              <input
                type="number"
                placeholder="Contoh: 500000"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20"
                required
              />
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[100000, 250000, 500000, 1000000, 2500000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setNominal(amt.toString())}
                  className="px-3 py-1 rounded-lg border border-stone-200 bg-white hover:border-[#6B1416] hover:text-[#6B1416] text-[11px] font-semibold transition cursor-pointer"
                >
                  +{amt.toLocaleString('id-ID')}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Pilihan Bank Tujuan Transfer (Updated by Admin) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-stone-800">
                2. Pilih Bank Tujuan Distributor:
              </label>
              <span className="text-[10px] text-stone-400 font-semibold">
                (Rekening resmi di-update oleh Admin)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bankOptions.map((bank) => (
                <label
                  key={bank.id}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                    chosenBankId === String(bank.id)
                      ? 'bg-white border-[#6B1416] ring-2 ring-[#6B1416]/30 shadow-xs'
                      : 'bg-white/70 border-stone-200 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="bankChoice"
                    value={bank.id}
                    checked={chosenBankId === String(bank.id)}
                    onChange={() => setSelectedBank(bank.id)}
                    className="mt-1 text-[#6B1416] focus:ring-[#6B1416]"
                  />
                  <div className="space-y-0.5 flex-1">
                    <span className="font-bold text-stone-900 text-xs">
                      {bank.name}
                    </span>
                    <p className="font-mono font-bold text-[#6B1416] text-xs">
                      {bank.accountNumber}
                    </p>
                    <p className="text-[10px] text-stone-500 uppercase">
                      A.N. {bank.holder}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 3. Upload Gambar (Bukti Transfer) */}
          <div className="space-y-2">
            <label className="block font-bold text-stone-800">
              3. Unggah Gambar / Foto Bukti Transfer:
            </label>

            {proofImage ? (
              <div className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-stone-200">
                <img
                  src={proofImage}
                  alt="Preview Bukti Transfer"
                  className="w-20 h-20 rounded-xl object-cover border border-stone-200 shadow-2xs"
                />
                <div className="space-y-1">
                  <p className="font-bold text-stone-800 text-xs">Gambar Bukti Siap Dikirim</p>
                  <p className="text-[11px] text-stone-400">Format gambar JPG / PNG</p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewModalImg(proofImage)}
                      className="text-sky-600 hover:underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      <span>Lihat Ukuran Penuh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProofImage(null)}
                      className="text-rose-600 hover:underline text-[11px] font-semibold cursor-pointer"
                    >
                      Hapus / Ganti
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-300 hover:border-[#6B1416] bg-white rounded-2xl p-6 text-center cursor-pointer transition space-y-2 group"
              >
                <div className="w-10 h-10 rounded-full bg-stone-100 group-hover:bg-rose-50 text-stone-500 group-hover:text-[#6B1416] flex items-center justify-center mx-auto transition">
                  <CameraIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-stone-800 text-xs">
                    Klik di sini untuk memilih foto bukti transfer
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Mendukung JPG, JPEG, PNG (Maksimal 5 MB)
                  </p>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* 4. Catatan Tambahan (Opsional) */}
          <div>
            <label className="block font-bold text-stone-800 mb-1">
              Catatan / Berita Transfer <span className="font-normal text-stone-400">(opsional)</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Deposit reseller atas nama Mitra"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-2 space-y-3">
            {formError && (
              <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {formError}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-[#6B1416] hover:bg-[#520C0E] disabled:opacity-60 text-white font-bold text-xs px-8 py-3 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>{isSubmitting ? 'Mengirim ke server...' : 'Kirim Konfirmasi Deposit'}</span>
            </button>
          </div>

        </form>

      </div>

      {/* Riwayat Pengajuan Deposit */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-stone-900 tracking-wide border-b border-stone-100 pb-3">
          Riwayat Pengajuan Deposit
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-bold bg-stone-50/50">
                <th className="py-2.5 px-3">ID Tiket</th>
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">Nominal</th>
                <th className="py-2.5 px-3">Rekening Tujuan</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Bukti Transfer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {activeDepositHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-stone-400">
                    Belum ada riwayat pengajuan deposit.
                  </td>
                </tr>
              ) : (
                activeDepositHistory.map((dep) => (
                  <tr key={dep.id} className="hover:bg-stone-50/50 transition">
                    <td className="py-3 px-3 font-mono font-bold text-stone-800">{dep.id}</td>
                    <td className="py-3 px-3 text-stone-500">{dep.date}</td>
                    <td className="py-3 px-3 font-bold text-[#6B1416]">
                      Rp {dep.nominal.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-3 text-stone-600 font-medium">{dep.bank}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${dep.statusColor}`}>
                        {dep.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setPreviewModalImg(dep.proof)}
                        className="text-sky-600 hover:underline font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        <span>Lihat Bukti</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Preview Image Modal with Floating Close Button & Scrollable Canvas */}
      {previewModalImg && (
        <div
          onClick={() => setPreviewModalImg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in cursor-zoom-out"
        >
          {/* Floating Close Button (Selalu tampak di kanan atas layar) */}
          <button
            type="button"
            onClick={() => setPreviewModalImg(null)}
            className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50 w-11 h-11 rounded-full bg-white text-stone-900 hover:bg-rose-500 hover:text-white flex items-center justify-center font-bold text-xl shadow-2xl transition cursor-pointer hover:scale-105 border-2 border-stone-200"
            title="Tutup Bukti Transfer (Esc)"
            aria-label="Tutup"
          >
            ✕
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-in zoom-in-95 overflow-hidden cursor-default"
          >
            {/* Header Sticky */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="font-bold text-xs sm:text-sm text-stone-800">Lampiran Bukti Transfer</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center font-bold text-base transition cursor-pointer"
                title="Tutup (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Scrollable image area untuk gambar struk yang panjang */}
            <div className="p-3 sm:p-4 overflow-y-auto max-h-[72vh] bg-stone-100/70 flex items-center justify-center">
              <img
                src={previewModalImg}
                alt="Bukti Transfer"
                className="w-full h-auto rounded-xl border border-stone-200 object-contain shadow-sm bg-white"
              />
            </div>

            {/* Footer with Close Button */}
            <div className="p-3 sm:p-4 bg-white border-t border-stone-100 shrink-0 flex items-center justify-between gap-2">
              <span className="text-[11px] text-stone-400">Tekan Esc atau klik luar untuk menutup</span>
              <button
                type="button"
                onClick={() => setPreviewModalImg(null)}
                className="px-4 py-2 bg-stone-900 hover:bg-[#6B1416] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                Tutup Preview Bukti
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
