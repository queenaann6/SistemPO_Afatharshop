import React, { useState } from 'react';
import { XIcon, ShieldCheckIcon } from './Icons';
import { ROLES } from '../data/mockData';

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

  const currentRole = ROLES.find((r) => r.id === selectedRoleId) || ROLES[0];

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const displayName = identifier ? identifier.split('@')[0] : currentRole.name;
    onLoginSuccess && onLoginSuccess(currentRole, { identifier, name: displayName });
    onClose();
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    const mitraRole = ROLES.find((r) => r.id === 'mitra');
    onLoginSuccess && onLoginSuccess(mitraRole, { storeName, whatsapp, name: storeName || 'Mitra Baru' });
    onClose();
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
            onClick={() => setMode('login')}
            className={`flex-1 py-3 text-center transition cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-[#6B1416] border-b-2 border-[#6B1416] font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Masuk ke Akun
          </button>
          <button
            onClick={() => setMode('register')}
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
          
          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Pilih Akses Pengguna
                </label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#6B1416] font-medium"
                >
                  <option value="mitra">Mitra / Agen Distributor (Pemesanan & PO)</option>
                  <option value="marketing">Admin Purchasing (Katalog & Jadwal PO)</option>
                  <option value="finance">Admin Finance (Verifikasi DP & Invoice)</option>
                  <option value="owner">Owner / Direksi (Executive Summary)</option>
                </select>
              </div>

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
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-stone-700">
                    Kata Sandi
                  </label>
                  <a href="#" className="text-[11px] text-[#6B1416] hover:underline font-medium">
                    Lupa sandi?
                  </a>
                </div>
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
                  className="w-full bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl shadow-md transition cursor-pointer"
                >
                  Masuk Sekarang
                </button>
              </div>

              <div className="text-center pt-2 border-t border-stone-100">
                <p className="text-xs text-stone-500">
                  Belum terdaftar sebagai mitra?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-[#6B1416] font-bold hover:underline cursor-pointer"
                  >
                    Daftar di sini
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Khusus pendaftaran <strong>Mitra & Agen Resmi</strong> untuk mendapatkan harga distributor, sistem booking kuota PO, dan fasilitas katalog.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Nama Butik / Toko Anda
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Butik Hijab Zahra"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6B1416]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Nama Pemilik / Pengelola
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6B1416]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0812xxxxxxxx"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6B1416]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Kota / Wilayah
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Kota Bogor"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6B1416]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#F0C973] hover:bg-[#E5BC64] text-[#420C0E] font-bold text-xs sm:text-sm py-2.5 rounded-xl shadow-md transition cursor-pointer"
                >
                  Ajukan Kemitraan
                </button>
              </div>

              <div className="text-center pt-1">
                <p className="text-xs text-stone-500">
                  Sudah memiliki akun?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-[#6B1416] font-bold hover:underline cursor-pointer"
                  >
                    Masuk ke akun
                  </button>
                </p>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
