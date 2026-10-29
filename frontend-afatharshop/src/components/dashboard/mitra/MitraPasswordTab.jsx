import React, { useState } from 'react';
import { KeyIcon, CheckIcon } from '../../Icons';

export default function MitraPasswordTab() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    setError('');
    setSuccess(true);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-6 max-w-xl">
      <div className="border-b border-stone-100 pb-4">
        <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-wide">
          Ubah Password Akun
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Pastikan menggunakan kombinasi password yang kuat untuk mengamankan akun mitra Anda.
        </p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
          <CheckIcon className="w-4 h-4 text-emerald-600" />
          <span>Password berhasil diperbarui!</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-2.5 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-stone-700 mb-1">Password Saat Ini</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20"
            required
          />
        </div>

        <div>
          <label className="block font-semibold text-stone-700 mb-1">Password Baru</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20"
            required
          />
        </div>

        <div>
          <label className="block font-semibold text-stone-700 mb-1">Konfirmasi Password Baru</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20"
            required
          />
        </div>

        <button
          type="submit"
          className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold px-6 py-2.5 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-2"
        >
          <KeyIcon className="w-4 h-4" />
          <span>Simpan Password Baru</span>
        </button>
      </form>
    </div>
  );
}
