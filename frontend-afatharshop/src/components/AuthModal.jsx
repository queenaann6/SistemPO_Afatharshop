import React, { useState } from 'react';
import { XIcon, ShieldCheckIcon, CheckIcon, WhatsAppIcon } from './Icons';
import { ROLES } from '../data/mockData';
import { api } from '../services/api';
import { mapApiUser, roleIdFromApiUser } from '../services/adapters';

export default function AuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
  onLoginSuccess,
  activeRole
}) {
  if (!isOpen) return null;

  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [selectedRoleId, setSelectedRoleId] = useState(activeRole?.id || 'mitra');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');

  const currentRole = ROLES.find((r) => r.id === selectedRoleId) || ROLES[0];

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Email atau Nomor WhatsApp wajib diisi.');
      return;
    }
    if (!password) {
      setErrorMsg('Password wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.login(identifier.trim(), password);
      const apiUser = response?.user || {};
      const roleId = roleIdFromApiUser(apiUser);
      const matchedRole = ROLES.find((r) => r.id === roleId) || {
        id: roleId,
        name: apiUser.role || roleId
      };
      const mappedUser = mapApiUser(apiUser);

      onLoginSuccess &&
        onLoginSuccess(matchedRole, {
          ...mappedUser,
          identifier: identifier.trim(),
          role: matchedRole.name,
          roleId
        });
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Login gagal. Periksa email/no. HP dan password Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setRegSuccessMsg('');

    const fullName = (ownerName || storeName).trim();
    if (!fullName) {
      setErrorMsg('Nama lengkap / nama pengelola wajib diisi.');
      return;
    }
    if (!whatsapp.trim()) {
      setErrorMsg('Nomor WhatsApp wajib diisi.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Alamat email wajib diisi.');
      return;
    }
    if (regPassword.length < 8) {
      setErrorMsg('Password minimal 8 karakter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: fullName,
        nama: fullName,
        email: email.trim(),
        phone: whatsapp.trim(),
        password: regPassword,
        password_confirmation: regPassword
      };

      const res = await api.register(payload);
      setRegSuccessMsg(
        res?.message || 'Pendaftaran kemitraan berhasil! Menunggu verifikasi admin.'
      );
    } catch (err) {
      setErrorMsg(err?.message || 'Pendaftaran gagal. Periksa kembali isian formulir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-[#6B1416] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full border border-[#F0C973] overflow-hidden bg-white shadow-sm shrink-0">
              <img src="/logo.jpg" alt="Afathar Shop Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#F0C973] leading-none">
                AFATHARSHOP
              </h3>
              <p className="text-[10px] text-amber-100/90 mt-0.5 tracking-wider uppercase">
                Moslem Womens Needs • Distributor Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-stone-200 hover:text-white transition cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200 bg-stone-50 text-xs font-semibold">
          <button
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-3 text-center transition cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-[#6B1416] border-b-2 border-[#6B1416] font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Masuk ke Akun
          </button>
          <button
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-3 text-center transition cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-[#6B1416] border-b-2 border-[#6B1416] font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Daftar Mitra Baru
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Email atau No. WhatsApp
                </label>
                <input
                  type="text"
                  required
                  placeholder="nama@email.com atau 0812xxxxxxx"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6B1416]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6B1416]"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Memproses login...' : 'Masuk Sekarang'}
                </button>
              </div>

              <div className="text-center pt-2 border-t border-stone-100">
                <p className="text-xs text-stone-500">
                  Belum terdaftar sebagai mitra?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMsg('');
                    }}
                    className="text-[#6B1416] font-bold hover:underline cursor-pointer"
                  >
                    Daftar di sini
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* REGISTER MODE DIRECT TO ADMIN */}
          {mode === 'register' && (
            <div className="space-y-4 text-center">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5 text-left">
                <ShieldCheckIcon className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Pendaftaran Kemitraan Resmi</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Pendaftaran Mitra / Agen / Sub Distributor diproses langsung melalui Admin Resmi kami via WhatsApp untuk verifikasi wilayah & alokasi harga terbaik.
                  </p>
                </div>
              </div>

              <div className="bg-[#FFFBF7] border border-[#FBEAD6] rounded-xl p-3 text-left space-y-1.5 text-xs">
                <p className="font-bold text-[#8B6A3E] text-[11px] uppercase tracking-wider">
                  Keuntungan Mitra Afathar Shop:
                </p>
                <ul className="space-y-1 text-stone-700 text-[11px]">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Akses Katalog Pre-Order Lebih Awal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Harga Khusus Reseller & Agen Resmi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Foto & Video Promosi Siap Pakai</span>
                  </li>
                </ul>
              </div>

              <div className="pt-1 space-y-2">
                <a
                  href={`https://wa.me/6281219991888?text=${encodeURIComponent(
                    'Halo Admin Afathar Shop, saya tertarik mendaftar sebagai Mitra / Reseller resmi Afathar Shop. Mohon informasi syarat & ketentuannya. Terima kasih! 🙏✨'
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-[#1E7E4E] hover:bg-[#16673F] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-white" />
                  <span>Daftar via WhatsApp Admin</span>
                </a>
                <div className="space-y-0.5 text-center">
                  <p className="text-[10px] text-stone-600 font-medium">
                    Admin Online: Senin - Jumat 09.00-17.00 • Sabtu 09.00-14.00
                  </p>
                  <p className="text-[9.5px] text-stone-500">
                    Hari Libur & Ramadhan akan ada perubahan jam kerja.
                  </p>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-stone-100">
                <p className="text-xs text-stone-500">
                  Sudah memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                    }}
                    className="text-[#6B1416] font-bold hover:underline cursor-pointer"
                  >
                    Masuk ke akun
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
