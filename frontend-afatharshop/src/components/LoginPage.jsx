import React, { useState } from 'react';
import { ROLES } from '../data/mockData';
import { api } from '../services/api';
import { mapApiUser, roleIdFromApiUser } from '../services/adapters';

export default function LoginPage({
  onLoginSuccess,
  onNavigateRegister,
  onNavigateHome
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loginResult, setLoginResult] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finishLogin = (matchedRole, userData) => {
    setLoginResult({ role: matchedRole, user: userData });
    setShowSuccessModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!identifier.trim()) {
      setValidationError('Silakan masukkan Nomor HP atau Email akun Anda.');
      return;
    }

    if (!password.trim()) {
      setValidationError('Silakan masukkan password akun Anda.');
      return;
    }

    const rawSaved =
      typeof window !== 'undefined'
        ? localStorage.getItem('afatharshop_user_avatar')
        : null;
    const savedAvatar = rawSaved && !rawSaved.includes('unsplash.com') ? rawSaved : '';

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

      finishLogin(matchedRole, {
        ...mappedUser,
        identifier: identifier.trim(),
        role: matchedRole.name,
        roleId,
        avatar: (mappedUser.avatar && !mappedUser.avatar.includes('unsplash.com'))
          ? mappedUser.avatar
          : (savedAvatar || '')
      });
    } catch (error) {
      setValidationError(
        error?.status === 0
          ? 'Server tidak dapat dihubungi. Pastikan backend berjalan agar data asli bisa dipakai.'
          : error?.message || 'Login gagal. Periksa email dan password Anda.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceed = () => {
    setShowSuccessModal(false);
    if (loginResult) {
      onLoginSuccess && onLoginSuccess(loginResult.role, loginResult.user);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFE5D4] flex flex-col justify-center items-center px-4 py-8 relative">
      
      {/* Main Login Card - Clean form WITHOUT any role switching tabs */}
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl border border-orange-100/60 p-8 sm:p-10 space-y-6">
        
        {/* Brand Header Logo */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full border border-[#D4AF37] overflow-hidden bg-white shadow-xs mb-1.5 flex items-center justify-center">
            <img src="/logo.jpg" alt="AfatharShop Official" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h2 className="font-serif text-lg font-bold text-[#8B6A3E] tracking-wider leading-none">
              AfatharShop
            </h2>
            <p className="text-[10px] text-[#A6804A] tracking-widest uppercase mt-0.5 font-medium">
              Official
            </p>
          </div>
        </div>

        {/* Heading */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#7A562B]">
            Masuk
          </h1>
          <span className="text-[11px] font-semibold text-stone-500">
            Sistem Distributor PO
          </span>
        </div>

        {/* Validation Error Alert if any */}
        {validationError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {validationError}
          </div>
        )}

        {/* Login Form: Pure credentials input without role switcher */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Field 1: Nomor HP atau Email */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-stone-700">
              Email
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setValidationError('');
              }}
              className="w-full text-xs px-3.5 py-3 rounded-lg bg-[#EEF4FF] border border-blue-100 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-blue-300 transition"
              placeholder="Misal: 08123456789, atau nama@email.com"
            />
            <p className="text-[10px] text-stone-400 pt-0.5">
              Masukkan email terdaftar Anda
            </p>
          </div>

          {/* Field 2: Password */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-stone-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setValidationError('');
                }}
                className="w-full text-xs px-3.5 py-3 pr-10 rounded-lg bg-[#EEF4FF] border border-blue-100 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-blue-300 transition"
                placeholder="Masukkan kata sandi akun"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? '👁' : '👁‍🗨'}
              </button>
            </div>
          </div>

          {/* Lupa Password Link */}
          <div>
            <button
              type="button"
              onClick={() =>
                alert('Silakan hubungi Admin WhatsApp Afathar Shop untuk reset password akun Anda.')
              }
              className="text-xs text-stone-600 hover:text-[#8B6A3E] font-medium transition cursor-pointer"
            >
              Lupa Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-lg bg-white border border-stone-800 hover:bg-stone-50 text-stone-800 font-semibold text-xs sm:text-sm shadow-xs transition duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Memeriksa akun...' : 'Masuk'}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center pt-2">
            <div className="border-t border-stone-200 w-full"></div>
            <span className="bg-white px-3 text-[10px] font-bold text-stone-400 uppercase tracking-widest absolute">
              ATAU
            </span>
          </div>

          {/* Footer Navigation Links */}
          <div className="text-center pt-3 space-y-2">
            <p className="text-xs text-stone-600">
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={onNavigateRegister}
                className="font-bold text-stone-900 hover:underline cursor-pointer"
              >
                Daftar Sekarang
              </button>
            </p>

            <div>
              <button
                type="button"
                onClick={onNavigateHome}
                className="text-xs text-stone-500 hover:text-stone-800 font-medium transition cursor-pointer"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>

        </form>

      </div>

      {/* SUCCESS MODAL DIALOG - Clean without exposing internal roles or dashboards */}
      {showSuccessModal && loginResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-2xl p-7 text-center space-y-5 border border-stone-100">
            
            {/* Logo */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full border border-[#D4AF37] overflow-hidden bg-white shadow-xs mb-1.5 flex items-center justify-center">
                <img src="/logo.jpg" alt="Afatharshop Official" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <h2 className="font-serif text-base font-bold text-[#8B6A3E] tracking-wider leading-none">
                  Afatharshop
                </h2>
                <p className="text-[9px] text-[#A6804A] tracking-widest uppercase mt-0.5 font-medium">
                  Official
                </p>
              </div>
            </div>

            {/* Clean Message without Role / Dashboard leaks */}
            <div className="space-y-1.5">
              <p className="text-base font-bold text-stone-800">
                Selamat! Kamu berhasil masuk
              </p>
              <p className="text-xs text-stone-600">
                Sebagai <span className="font-bold text-stone-900">{loginResult.user.name}</span>
              </p>
            </div>

            {/* Clean Proceed Button */}
            <button
              onClick={handleProceed}
              className="w-full py-2.5 px-4 rounded-lg bg-white border border-stone-800 hover:bg-stone-50 text-stone-900 font-bold text-xs sm:text-sm shadow-xs transition duration-150 cursor-pointer"
            >
              Lanjutkan
            </button>

          </div>
        </div>
      )}

      {/* Sub-footer copyright */}
      <div className="mt-8 text-center text-[11px] text-stone-500">
        © 2025 Afatharshop Official. Hak Cipta Dilindungi Undang-Undang.
      </div>

    </div>
  );
}
