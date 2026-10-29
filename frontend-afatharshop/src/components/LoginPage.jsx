import React, { useState } from 'react';
import { ROLES } from '../data/mockData';
import { api } from '../services/api';
import { mapApiUser, roleIdFromApiUser } from '../services/adapters';

// Registered Accounts for Role-based Authentication
export const REGISTERED_ACCOUNTS = [
  {
    roleId: 'mitra',
    roleName: 'Mitra Distributor',
    email: 'afatharshop@maknahijab.com',
    phone: '0812-1999-1888',
    username: 'mitra',
    displayName: 'HENI',
    dashboardPage: 'mitra_dashboard',
    dashboardName: 'Dashboard Mitra',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    balance: 'Rp 0',
    totalBill: 'Rp 3.399.145',
    address: 'Perumnas 1 Jl Bungur Raya Rt 12 Rw 7 No 86, Bekasi Barat'
  },
  {
    roleId: 'marketing',
    roleName: 'Admin Purchasing',
    email: 'marketing@afatharshop.com',
    phone: '0812-2222-3333',
    username: 'marketing',
    displayName: 'RINA MARKETING',
    dashboardPage: 'marketing_dashboard',
    dashboardName: 'Dashboard Admin Purchasing',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
    balance: 'Rp 0',
    totalBill: 'Rp 0',
    address: 'Kantor Pusat AfatharShop - Divisi Purchasing, Bekasi'
  },
  {
    roleId: 'finance',
    roleName: 'Admin Finance',
    email: 'finance@afatharshop.com',
    phone: '0812-4444-5555',
    username: 'finance',
    displayName: 'Dewi',
    dashboardPage: 'finance_dashboard',
    dashboardName: 'Dashboard Admin Finance',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
    balance: 'Rp 0',
    totalBill: 'Rp 0',
    address: 'Kantor Pusat AfatharShop - Divisi Keuangan & Validasi, Bogor'
  },
  {
    roleId: 'owner',
    roleName: 'Owner / Direksi',
    email: 'owner@afatharshop.com',
    phone: '0812-8888-9999',
    username: 'owner',
    displayName: 'FATURAHMAN OWNER',
    dashboardPage: 'owner_dashboard',
    dashboardName: 'Dashboard Owner / Direksi',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    balance: 'Rp 0',
    totalBill: 'Rp 0',
    address: 'Kantor Direksi AfatharShop, Bogor'
  }
];

// Helper to determine role and account profile based strictly on credentials entered
export function resolveAccountByCredentials(identifier) {
  if (!identifier) return REGISTERED_ACCOUNTS[0];

  const clean = identifier.trim().toLowerCase();
  const digits = clean.replace(/\D/g, '');

  // 1. Check exact presets first
  const exactMatch = REGISTERED_ACCOUNTS.find(
    (acc) =>
      acc.email.toLowerCase() === clean ||
      acc.username.toLowerCase() === clean ||
      (digits.length >= 8 && acc.phone.replace(/\D/g, '') === digits)
  );
  if (exactMatch) return exactMatch;

  // 2. Check Marketing keywords
  if (
    clean.includes('marketing') ||
    clean.includes('rina') ||
    clean.startsWith('mkt') ||
    clean.includes('sales')
  ) {
    return {
      ...REGISTERED_ACCOUNTS[1],
      email: clean.includes('@') ? clean : 'marketing@afatharshop.com'
    };
  }

  // 3. Check Finance keywords
  if (
    clean.includes('finance') ||
    clean.includes('keuangan') ||
    clean.includes('dewi') ||
    clean.includes('kasir') ||
    clean.includes('akunting')
  ) {
    return {
      ...REGISTERED_ACCOUNTS[2],
      email: clean.includes('@') ? clean : 'finance@afatharshop.com'
    };
  }

  // 4. Check Owner / Direksi keywords
  if (
    clean.includes('owner') ||
    clean.includes('direksi') ||
    clean.includes('Heny') ||
    clean.includes('bos') ||
    clean.includes('pimpinan')
  ) {
    return {
      ...REGISTERED_ACCOUNTS[3],
      email: clean.includes('@') ? clean : 'owner@afatharshop.com'
    };
  }

  // 5. Default: Mitra Distributor (All standard accounts or newly registered members are Mitra)
  const isHeni = clean.includes('@afatharshop.com') || clean.includes('heni');
  const derivedName = isHeni
    ? 'Heny'
    : clean.includes('@')
    ? clean.split('@')[0].toUpperCase()
    : 'MITRA';

  return {
    roleId: 'mitra',
    roleName: 'Mitra',
    email: clean.includes('@') ? clean : '@afatharshop.com',
    phone: digits.length >= 8 ? identifier : '0812-1999-1888',
    username: 'mitra',
    displayName: derivedName,
    dashboardPage: 'mitra_dashboard',
    dashboardName: 'Dashboard Mitra',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
    balance: 'Rp 0',
    totalBill: 'Rp 3.399.145',
    address: 'Perumnas 1 Jl Bungur Raya Rt 12 Rw 7 No 86, Bekasi Barat'
  };
}

export default function LoginPage({
  onLoginSuccess,
  onNavigateRegister,
  onNavigateHome
}) {
  const [identifier, setIdentifier] = useState('afatharshop@maknahijab.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loginResult, setLoginResult] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Quick Fill for test credentials
  const handleQuickFill = (accEmail, accPass = 'password123') => {
    setIdentifier(accEmail);
    setPassword(accPass);
    setValidationError('');
  };

  const finishLogin = (matchedRole, userData, account, offline) => {
    setLoginResult({ role: matchedRole, user: userData, account, offline: Boolean(offline) });
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

    const savedAvatar =
      typeof window !== 'undefined'
        ? localStorage.getItem('afatharshop_user_avatar')
        : null;

    setIsSubmitting(true);

    try {
      const response = await api.login(identifier.trim(), password);
      const apiUser = response?.user || {};
      const roleId = roleIdFromApiUser(apiUser);
      const matchedRole = ROLES.find((r) => r.id === roleId) || {
        id: roleId,
        name: apiUser.role || roleId
      };
      const demoAccount =
        REGISTERED_ACCOUNTS.find((account) => account.roleId === roleId) ||
        REGISTERED_ACCOUNTS[0];
      const mappedUser = mapApiUser(apiUser, demoAccount);

      finishLogin(
        matchedRole,
        {
          ...mappedUser,
          identifier: identifier.trim(),
          role: matchedRole.name,
          roleId,
          avatar: savedAvatar || mappedUser.avatar,
          totalBill: demoAccount.totalBill || 'Rp 0',
          address: demoAccount.address || mappedUser.address
        },
        demoAccount,
        false
      );
    } catch (error) {
      if (error?.status === 0) {
        // Backend belum berjalan: tetap izinkan demo lokal agar UI bisa diuji.
        const detectedAccount = resolveAccountByCredentials(identifier);
        const roleId =
          detectedAccount.roleId === 'purchasing' ? 'marketing' : detectedAccount.roleId;
        const matchedRole = ROLES.find((r) => r.id === roleId) || {
          id: roleId,
          name: detectedAccount.roleName
        };

        finishLogin(
          matchedRole,
          {
            name: detectedAccount.displayName,
            identifier: identifier.trim(),
            role: matchedRole.name,
            roleId,
            avatar: savedAvatar || detectedAccount.avatar,
            balance: detectedAccount.balance || 'Rp 0',
            totalBill: detectedAccount.totalBill || 'Rp 0',
            phone: detectedAccount.phone,
            email: detectedAccount.email,
            address: detectedAccount.address
          },
          detectedAccount,
          true
        );
      } else {
        setValidationError(error?.message || 'Login gagal. Silakan coba lagi.');
      }
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
              {loginResult.offline && (
                <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  Backend tidak terdeteksi — masuk dengan akun demo lokal.
                </p>
              )}
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
