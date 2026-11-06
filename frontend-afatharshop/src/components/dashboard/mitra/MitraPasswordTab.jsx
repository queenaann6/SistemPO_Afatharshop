import React, { useState } from 'react';
import { KeyIcon, CheckIcon, EyeIcon } from '../../Icons';
import { api } from '../../../services/api';

export default function MitraPasswordTab() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await api.changePassword({
        current_password: oldPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword
      });

      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err?.message || 'Gagal mengubah password. Pastikan password saat ini sudah benar.');
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-2xl flex items-center gap-2.5">
          <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Password berhasil diperbarui di database! Gunakan password baru untuk login berikutnya.</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-4 py-2.5 rounded-2xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            Password Saat Ini <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showOld ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Masukkan password yang saat ini digunakan"
              className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 pr-10 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowOld(!showOld)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
              title={showOld ? 'Sembunyikan password' : 'Lihat password'}
            >
              <EyeIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            Password Baru <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 pr-10 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
              title={showNew ? 'Sembunyikan password' : 'Lihat password'}
            >
              <EyeIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            Konfirmasi Password Baru <span className="text-rose-500">*</span>
          </label>
          <input
            type={showNew ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ulangi password baru persis sama"
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]/20"
            required
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold px-6 py-2.5 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            <KeyIcon className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan ke Server...' : 'Simpan Password Baru'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
