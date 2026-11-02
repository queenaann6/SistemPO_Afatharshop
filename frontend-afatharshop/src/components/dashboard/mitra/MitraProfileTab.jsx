import React, { useState, useRef } from 'react';
import { CameraIcon, CheckIcon } from '../../Icons';

export default function MitraProfileTab({
  currentUser,
  onUpdateUser,
  onUpdateAvatar
}) {
  const fileInputRef = useRef(null);
  const [name, setName] = useState(currentUser?.name || 'Mitra');
  const [mitraId] = useState(() => currentUser?.id ? `MTR-${currentUser.id}` : 'MTR-001');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [gender, setGender] = useState('Perempuan');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [accountType, setAccountType] = useState('Perorangan');
  const [language, setLanguage] = useState('Bahasa Indonesia');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Handle Photo Upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran gambar maksimal 1 MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        onUpdateAvatar && onUpdateAvatar(dataUrl);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateUser && onUpdateUser({
      name,
      email,
      phone,
      gender,
      accountType,
      language
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-6">
      {/* Title */}
      <div className="border-b border-stone-100 pb-4">
        <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-wide">
          Profil Saya
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Kelola informasi biodata diri, nomor WhatsApp, dan foto profil akun distributor Anda.
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckIcon className="w-4 h-4 text-emerald-600" />
          <span>Perubahan profil berhasil disimpan dan diperbarui!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {/* Photo Upload Arch Section (Matches Screenshot 1) */}
        <div>
          <div className="flex flex-col items-start gap-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-t-full rounded-b-lg bg-[#9CA3AF] hover:bg-stone-500 overflow-hidden relative cursor-pointer group flex items-center justify-center transition shadow-xs border-2 border-dashed border-stone-300"
              title="Unggah Foto Profil"
            >
              {currentUser?.avatar && !currentUser.avatar.includes('unsplash.com') ? (
                <img
                  src={currentUser.avatar}
                  alt={name}
                  className="w-full h-full object-cover group-hover:opacity-75 transition"
                />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition">
                <CameraIcon className="w-6 h-6 text-white drop-shadow" />
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png"
              className="hidden"
            />

            <div className="text-[11px] text-stone-500 space-y-0.5 mt-1">
              <p>Ukuran gambar: maks. 1 MB</p>
              <p>Format gambar: JPEG, .PNG</p>
              {currentUser?.avatar && !currentUser.avatar.includes('unsplash.com') && (
                <button
                  type="button"
                  onClick={() => onUpdateAvatar && onUpdateAvatar('')}
                  className="text-xs text-rose-600 font-semibold hover:underline mt-1.5 inline-block cursor-pointer"
                >
                  Hapus Foto Profil
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Input: Nama */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            Nama
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20 focus:border-[#6B1416]"
            required
          />
        </div>

        {/* Input: ID Mitra */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            ID Mitra
          </label>
          <input
            type="text"
            value={mitraId}
            disabled
            className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-500 cursor-not-allowed font-mono"
          />
        </div>

        {/* Input: Email */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-xs font-semibold text-stone-700">Email</label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Diverifikasi
            </span>
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20 focus:border-[#6B1416]"
            required
          />
        </div>

        {/* Input: Nomor HP */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-xs font-semibold text-stone-700">Nomor HP</label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Diverifikasi
            </span>
          </div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20 focus:border-[#6B1416]"
            required
          />
        </div>

        {/* Radio: Jenis Kelamin */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-2">
            Jenis Kelamin
          </label>
          <div className="flex items-center gap-6 text-xs text-stone-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value="Laki-laki"
                checked={gender === 'Laki-laki'}
                onChange={(e) => setGender(e.target.value)}
                className="text-[#6B1416] focus:ring-[#6B1416]"
              />
              <span>Laki-laki</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value="Perempuan"
                checked={gender === 'Perempuan'}
                onChange={(e) => setGender(e.target.value)}
                className="text-[#6B1416] focus:ring-[#6B1416]"
              />
              <span>Perempuan</span>
            </label>
          </div>
        </div>

        {/* Dropdowns: Tanggal Lahir */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            Tanggal Lahir
          </label>
          <div className="grid grid-cols-3 gap-3">
            <select
              value={birthDay}
              onChange={(e) => setBirthDay(e.target.value)}
              className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20"
            >
              <option value="">Hari</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={birthMonth}
              onChange={(e) => setBirthMonth(e.target.value)}
              className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20"
            >
              <option value="">Bulan</option>
              {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20"
            >
              <option value="">Tahun</option>
              {Array.from({ length: 60 }, (_, i) => 2010 - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Radio: Tipe Akun */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-2">
            Tipe Akun
          </label>
          <div className="flex flex-wrap items-center gap-6 text-xs text-stone-700">
            {['Perorangan', 'Perusahaan', 'Instansi'].map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accountType"
                  value={type}
                  checked={accountType === type}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="text-[#6B1416] focus:ring-[#6B1416]"
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dropdown: Bahasa */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1.5">
            Bahasa
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full max-w-xs bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20"
          >
            <option value="Bahasa Indonesia">Bahasa Indonesia</option>
            <option value="English">English</option>
          </select>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs px-6 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}
