import React, { useState } from 'react';
import { CheckIcon, WhatsAppIcon } from './Icons';
import { api } from '../services/api';

const LEVEL_OPTIONS = [
  { value: 'reseller', label: 'Reseller' },
  { value: 'agen', label: 'Agen' },
  { value: 'sub db', label: 'Sub Distributor (Sub DB)' },
  { value: 'db all', label: 'Distributor (DB All)' }
];

export default function RegisterPage({
  onNavigateLogin,
  onNavigateHome
}) {
  const adminNumber = '6281311495285'; // Admin WhatsApp number for registration confirmation

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [level, setLevel] = useState('reseller');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [registeredData, setRegisteredData] = useState(null);

  const defaultWaMessage =
    'Halo Admin Afatharshop, saya tertarik untuk mendaftar sebagai Mitra / Reseller resmi Afatharshop. Mohon informasi syarat & langkah pendaftarannya. Terima kasih!';
  const confirmWaMessage = registeredData
    ? `Halo Admin Afatharshop, saya baru saja mendaftar akun Mitra melalui web:\n- Nama: ${registeredData.name}\n- Email: ${registeredData.email}\n- No. WA: ${registeredData.phone}\n- Kota: ${registeredData.city}\n\nMohon bantuannya untuk ACC/aktivasi akun saya. Terima kasih!`
    : defaultWaMessage;

  const waUrl = `https://wa.me/${adminNumber}?text=${encodeURIComponent(
    registeredData ? confirmWaMessage : defaultWaMessage
  )}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanCity = city.trim();

    if (!cleanName) {
      setErrorMsg('Nama lengkap wajib diisi.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Format email tidak valid.');
      return;
    }
    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 9) {
      setErrorMsg('Nomor WhatsApp aktif wajib diisi dengan benar.');
      return;
    }
    if (!cleanCity) {
      setErrorMsg('Kota / wilayah domisili wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }
    if (password !== passwordConfirmation) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.register({
        name: cleanName,
        nama: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        city: cleanCity,
        level,
        password,
        password_confirmation: passwordConfirmation
      });

      setRegisteredData({
        name: response?.data?.name || cleanName,
        email: response?.data?.email || cleanEmail,
        phone: response?.data?.phone || cleanPhone,
        city: response?.data?.city || cleanCity,
        level: response?.data?.level || level,
        message:
          response?.message ||
          'Pendaftaran berhasil dikirim! Akun Anda sedang menunggu ACC Admin sebelum dapat digunakan untuk login.'
      });
    } catch (error) {
      setErrorMsg(
        error?.status === 0
          ? 'Server tidak dapat dihubungi. Pastikan backend Laravel berjalan agar pendaftaran dapat diproses.'
          : error?.message || 'Pendaftaran gagal. Periksa kembali data yang Anda masukkan.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFE5D4] flex flex-col justify-center items-center px-4 py-10 relative">
      {/* Main Registration Card */}
      <div className="w-full max-w-[540px] bg-white rounded-3xl shadow-xl border border-orange-100/60 p-7 sm:p-10 space-y-5">
        {/* Brand Header Logo */}
        <div className="flex flex-col items-center justify-center">
          <img
            src="/logo-nobg.png"
            alt="Afatharshop Official"
            className="h-16 sm:h-20 w-auto object-contain mx-auto mb-1"
          />
          <span className="inline-block bg-[#FFF8EE] text-[#936E39] border border-[#F6E1C4] text-[10px] sm:text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider mt-2">
            PROGRAM KEMITRAAN @AFATHARSHOP
          </span>
        </div>

        {registeredData ? (
          /* SUCCESS / PENDING APPROVAL STATE */
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckIcon className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Menunggu ACC Admin
              </span>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                Pendaftaran Berhasil Dikirim!
              </h1>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {registeredData.message}
              </p>
            </div>

            <div className="bg-[#FFFBF7] border border-[#FBEAD6] rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Nama / Toko</span>
                <span className="font-semibold text-stone-900 text-right">{registeredData.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Email Login</span>
                <span className="font-semibold text-stone-900 text-right">{registeredData.email}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">No. WhatsApp</span>
                <span className="font-semibold text-stone-900 text-right">{registeredData.phone}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-stone-500">Kota / Wilayah</span>
                <span className="font-semibold text-stone-900 text-right">{registeredData.city}</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={onNavigateLogin}
                className="w-full py-3 px-6 rounded-xl bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
              >
                Ke Halaman Masuk
              </button>

              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-6 rounded-xl bg-[#1E7E4E] hover:bg-[#16673F] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white shrink-0" />
                <span>Konfirmasi Pendaftaran ke WA Admin</span>
              </a>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM STATE */
          <>
            <div className="text-center space-y-1.5">
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight leading-snug">
                Daftar Akun Mitra Afatharshop
              </h1>
              <p className="text-xs text-stone-600 leading-relaxed">
                Lengkapi data di bawah ini. Setelah mendaftar, Admin akan meninjau dan mengaktifkan (ACC) akun Anda agar dapat mengakses katalog & harga mitra.
              </p>
            </div>

            {/* Compact Benefits Callout */}
            <div className="bg-[#FFFBF7] border border-[#FBEAD6] rounded-2xl p-3.5 text-left">
              <ul className="grid sm:grid-cols-2 gap-1.5 text-[11px] text-stone-700">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <CheckIcon className="w-2.5 h-2.5" />
                  </span>
                  <span>Akses Produk Katalog Pre-Order</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <CheckIcon className="w-2.5 h-2.5" />
                  </span>
                  <span>Harga Khusus Mitra</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <CheckIcon className="w-2.5 h-2.5" />
                  </span>
                  <span>Sistem DP & Cicilan PO</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <CheckIcon className="w-2.5 h-2.5" />
                  </span>
                  <span>Verifikasi Akun oleh Admin</span>
                </li>
              </ul>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-left">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B6A3E]/30 focus:border-[#8B6A3E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="mitra@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B6A3E]/30 focus:border-[#8B6A3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    No. WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0812xxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B6A3E]/30 focus:border-[#8B6A3E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kota / Wilayah <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kota Bogor"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B6A3E]/30 focus:border-[#8B6A3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Pengajuan Level Mitra
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-stone-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#8B6A3E]/30 focus:border-[#8B6A3E]"
                  >
                    {LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Min. 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B6A3E]/30 focus:border-[#8B6A3E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ulangi Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Ulangi kata sandi"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B6A3E]/30 focus:border-[#8B6A3E]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-[11px] text-stone-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded border-stone-300 accent-[#6B1416]"
                />
                <span>Tampilkan kata sandi</span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Mengirim Pendaftaran...' : 'Daftar Sekarang'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center pt-1">
              <div className="border-t border-stone-200 w-full"></div>
              <span className="bg-white px-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest absolute">
                ATAU
              </span>
            </div>

            {/* Secondary WhatsApp Consultation Option */}
            <div className="space-y-1.5">
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-5 rounded-xl bg-[#1E7E4E]/10 hover:bg-[#1E7E4E]/15 text-[#1E7E4E] border border-[#1E7E4E]/30 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4 fill-[#1E7E4E] shrink-0" />
                <span>Tanya Syarat Kemitraan via WhatsApp Admin</span>
              </a>
              <p className="text-[10px] text-stone-500 text-center">
                Admin Online: Senin - Jumat 09.00-17.00 • Sabtu 09.00-14.00
              </p>
            </div>
          </>
        )}

        {/* Footer Navigation Links */}
        <div className="space-y-2 pt-2 border-t border-stone-100 text-center">
          <p className="text-xs text-stone-600">
            Sudah punya akun resmi?{' '}
            <button
              type="button"
              onClick={onNavigateLogin}
              className="font-bold text-[#8B6A3E] hover:underline cursor-pointer"
            >
              Masuk Sekarang
            </button>
          </p>

          <div>
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-xs text-stone-500 hover:text-stone-800 font-medium transition cursor-pointer flex items-center justify-center gap-1 mx-auto"
            >
              <span>←</span>
              <span>Kembali ke Beranda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-footer copyright */}
      <div className="mt-8 text-center text-[11px] text-stone-500">
        © 2025 Afatharshop Official. Hak Cipta Dilindungi Undang-Undang.
      </div>
    </div>
  );
}
