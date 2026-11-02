import React, { useState, useEffect, useMemo } from 'react';

const COMMON_BANKS = [
  'BCA',
  'Bank Mandiri',
  'BNI',
  'BRI',
  'BSI (Bank Syariah Indonesia)',
  'Bank Muamalat',
  'CIMB Niaga',
  'Bank Permata',
  'Bank Danamon',
  'BCA Syariah',
  'Lainnya'
];

export default function BankAccountModal({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialData = null,
  brands = [],
  defaultType = 'public', // 'public' | 'pengajuan'
  onClose,
  onSave
}) {
  if (!isOpen) return null;

  const [type, setType] = useState(defaultType);
  const [bank, setBank] = useState('BCA');
  const [customBank, setCustomBank] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [holder, setHolder] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [brandSearch, setBrandSearch] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Normalisasi data awal saat modal terbuka
  useEffect(() => {
    if (initialData) {
      const initType = initialData.type || defaultType || 'public';
      setType(initType);

      const rawBank = initialData.bank || initialData.bank_name || '';
      if (COMMON_BANKS.includes(rawBank)) {
        setBank(rawBank);
        setCustomBank('');
      } else if (rawBank) {
        setBank('Lainnya');
        setCustomBank(rawBank);
      } else {
        setBank('BCA');
        setCustomBank('');
      }

      setAccountNo(initialData.accountNo || initialData.account_number || '');
      setHolder(initialData.holder || initialData.account_holder || '');
      setPurpose(initialData.purpose || '');

      let bList = [];
      if (Array.isArray(initialData.brands)) {
        bList = initialData.brands;
      } else if (typeof initialData.brands === 'string' && initialData.brands.trim()) {
        try {
          const parsed = JSON.parse(initialData.brands);
          bList = Array.isArray(parsed) ? parsed : [initialData.brands];
        } catch {
          bList = initialData.brands.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }
      setSelectedBrands(bList);
      setIsActive(initialData.active !== false && initialData.is_active !== false);
    } else {
      setType(defaultType || 'public');
      setBank('BCA');
      setCustomBank('');
      setAccountNo('');
      setHolder('');
      setPurpose(defaultType === 'public' ? 'Penerimaan Pembayaran Mitra' : '');
      setSelectedBrands([]);
      setIsActive(true);
    }
  }, [initialData, defaultType, isOpen]);

  // Daftar nama brand unik yang tersedia
  const availableBrandNames = useMemo(() => {
    const names = (brands || []).map((b) => (typeof b === 'object' ? b.name : b)).filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [brands]);

  // Filter daftar brand sesuai kata kunci pencarian
  const filteredBrandNames = useMemo(() => {
    if (!brandSearch.trim()) return availableBrandNames;
    const q = brandSearch.trim().toLowerCase();
    return availableBrandNames.filter((name) => name.toLowerCase().includes(q));
  }, [availableBrandNames, brandSearch]);

  const toggleBrand = (brandName) => {
    setSelectedBrands((prev) => {
      if (prev.includes(brandName)) {
        return prev.filter((b) => b !== brandName);
      }
      return [...prev, brandName];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalBank = bank === 'Lainnya' ? customBank.trim() : bank.trim();
    if (!finalBank) {
      alert('Nama bank wajib diisi.');
      return;
    }
    if (!accountNo.trim()) {
      alert('Nomor rekening wajib diisi.');
      return;
    }
    if (!holder.trim()) {
      alert('Nama pemilik rekening (atas nama) wajib diisi.');
      return;
    }

    let finalPurpose = purpose.trim();
    if (type === 'pengajuan') {
      if (!finalPurpose && selectedBrands.length > 0) {
        finalPurpose = `Brand: ${selectedBrands.join(', ')}`;
      }
    } else if (!finalPurpose) {
      finalPurpose = 'Penerimaan Pembayaran Mitra';
    }

    setIsSubmitting(true);
    try {
      await onSave({
        bank: finalBank,
        accountNo: accountNo.trim(),
        holder: holder.trim(),
        type,
        purpose: finalPurpose,
        brands: type === 'pengajuan' ? selectedBrands : [],
        active: isActive
      });
      onClose();
    } catch (err) {
      console.error('Gagal menyimpan data rekening:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full flex flex-col border border-gray-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal Bersih & Standar */}
        <div className="bg-[#541221] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
          <div>
            <h3 className="text-base font-semibold leading-snug">
              {mode === 'edit' ? 'Ubah Rekening Bank' : 'Tambah Rekening Bank'}
            </h3>
            <p className="text-xs text-rose-100 font-normal mt-0.5">
              {type === 'pengajuan'
                ? 'Rekening vendor / supplier untuk pengajuan dana ke Owner'
                : 'Rekening resmi toko untuk transaksi pembayaran mitra'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-100 hover:text-white hover:bg-white/10 transition text-base"
            title="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Isi Formulir */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-gray-800 text-xs overflow-y-auto max-h-[80vh]">
          {/* Pilihan Jenis Rekening */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Jenis Rekening <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('public');
                  if (!purpose || purpose.startsWith('Brand:')) {
                    setPurpose('Penerimaan Pembayaran Mitra');
                  }
                }}
                className={`py-2 px-3 rounded-lg border text-left transition cursor-pointer ${
                  type === 'public'
                    ? 'border-[#541221] bg-rose-50/50 text-[#541221] font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-xs">Rekening Publik Toko</div>
                <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                  Tampil di checkout mitra, tagihan WA, dan invoice
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('pengajuan');
                  if (purpose === 'Penerimaan Pembayaran Mitra') {
                    setPurpose('');
                  }
                }}
                className={`py-2 px-3 rounded-lg border text-left transition cursor-pointer ${
                  type === 'pengajuan'
                    ? 'border-[#541221] bg-rose-50/50 text-[#541221] font-semibold'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-xs">Rekening Pengajuan Owner</div>
                <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                  Tujuan transfer vendor / supplier (internal rahasia)
                </div>
              </button>
            </div>
          </div>

          {/* Nama Bank & Nomor Rekening */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nama Bank <span className="text-red-500">*</span>
              </label>
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#541221]"
              >
                {COMMON_BANKS.map((bName) => (
                  <option key={bName} value={bName}>
                    {bName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nomor Rekening <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={accountNo}
                placeholder="Contoh: 7390829988"
                onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ''))}
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221]"
              />
            </div>
          </div>

          {/* Input Bank Khusus jika 'Lainnya' dipilih */}
          {bank === 'Lainnya' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tuliskan Nama Bank <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customBank}
                placeholder="Contoh: Bank Jabar Banten (BJB) / Bank DKI"
                onChange={(e) => setCustomBank(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221]"
              />
            </div>
          )}

          {/* Atas Nama Pemilik */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Atas Nama (Pemilik Rekening) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={holder}
              placeholder="Contoh: PT Hana Textile / Budi Santoso"
              onChange={(e) => setHolder(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221]"
            />
          </div>

          {/* Bagian Khusus Rekening Pengajuan: Ambil dari Brand */}
          {type === 'pengajuan' ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-800">
                    Brand Terkait Rekening Ini
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Pilih satu atau beberapa brand yang dipegang oleh pemilik rekening ini.
                  </p>
                </div>
                {selectedBrands.length > 0 && (
                  <span className="text-[11px] font-medium text-[#541221] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {selectedBrands.length} brand dipilih
                  </span>
                )}
              </div>

              {/* Pencarian Brand jika daftar banyak */}
              {availableBrandNames.length > 5 && (
                <input
                  type="text"
                  value={brandSearch}
                  placeholder="Cari nama brand..."
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#541221]"
                />
              )}

              {/* Daftar Brand Pilihan (Bisa Multi-Select) */}
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white border border-gray-200 rounded">
                {filteredBrandNames.length === 0 ? (
                  <span className="text-[11px] text-gray-400 p-2 italic">
                    {availableBrandNames.length === 0
                      ? 'Belum ada data brand di sistem. Tambahkan brand di menu Brand Vendor terlebih dahulu.'
                      : 'Brand tidak ditemukan.'}
                  </span>
                ) : (
                  filteredBrandNames.map((brandName) => {
                    const isSelected = selectedBrands.includes(brandName);
                    return (
                      <button
                        key={brandName}
                        type="button"
                        onClick={() => toggleBrand(brandName)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition cursor-pointer border ${
                          isSelected
                            ? 'bg-[#541221] text-white border-[#541221] font-medium'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-[11px]">{isSelected ? '✓' : '+'}</span>
                        <span>{brandName}</span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Ringkasan Brand Terpilih */}
              {selectedBrands.length > 0 && (
                <div className="pt-1 text-[11px] text-gray-600">
                  <span className="font-medium">Terhubung dengan: </span>
                  <span>{selectedBrands.join(', ')}</span>
                </div>
              )}

              {/* Keterangan Tambahan / Operasional */}
              <div className="pt-2">
                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                  Keterangan Tambahan / Keperluan (Opsional)
                </label>
                <input
                  type="text"
                  value={purpose}
                  placeholder="Contoh: Vendor Kain Ceruty / CMT Jahit Solo"
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#541221]"
                />
              </div>
            </div>
          ) : (
            /* Bagian Khusus Rekening Publik */
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Label / Peruntukan Rekening (Opsional)
              </label>
              <input
                type="text"
                value={purpose}
                placeholder="Contoh: Rekening Utama Penerimaan DP & Pelunasan"
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221]"
              />
            </div>
          )}

          {/* Status Aktif */}
          <div className="pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-gray-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300 text-[#541221] focus:ring-[#541221]"
              />
              <span>
                {type === 'pengajuan'
                  ? 'Rekening aktif (bisa dipilih saat pengajuan dana ke Owner)'
                  : 'Rekening aktif (ditampilkan pada invoice dan form checkout mitra)'}
              </span>
            </label>
          </div>

          {/* Tombol Aksi Bawah */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-[#541221] hover:bg-[#430e1a] text-white text-xs font-medium transition cursor-pointer"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Rekening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
