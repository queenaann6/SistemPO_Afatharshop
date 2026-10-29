import React from 'react';
import {
  UserIcon,
  CheckIcon,
  ShieldCheckIcon,
  MapPinIcon,
  CreditCardIcon,
  WalletIcon,
  ShoppingBagIcon,
  KeyIcon,
  DocumentTextIcon,
  PencilIcon
} from '../../Icons';

export default function MitraAccountOverviewTab({ currentUser, onSelectTab }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#6B1416] bg-rose-50 border border-rose-200 px-3 py-1 rounded-full uppercase tracking-wider">
            Pusat Akun Distributor
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mt-2">
            Akun Saya
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Informasi legalitas kemitraan, ringkasan profil distributor, dan status keanggotaan resmi Afathar Shop.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab && onSelectTab('profil')}
            className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <PencilIcon className="w-3.5 h-3.5" />
            <span>Edit Profil Biodata</span>
          </button>
        </div>
      </div>

      {/* 2. Official Membership Card (ID Card Distributor) */}
      <div className="bg-gradient-to-br from-[#6B1416] via-[#831843] to-[#420C0E] rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-24 bottom-0 -mb-20 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-white/10 ring-4 ring-white/20 shadow-lg shrink-0">
                <img
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80'}
                  alt={currentUser?.name || 'HENI'}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-md" title="Akun Terverifikasi">
                <CheckIcon className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-bold tracking-wide">
                  {currentUser?.name || 'HENI'}
                </h3>
                <span className="bg-amber-400 text-amber-950 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                  Gold Distributor
                </span>
              </div>
              <p className="text-rose-100 text-xs font-mono">
                ID Kemitraan: <strong className="text-white">MTR-2026-08182</strong>
              </p>
              <p className="text-xs text-rose-200">
                Terdaftar Sejak: 18 Oktober 2026 &bull; Kota Bekasi, Jawa Barat
              </p>
              <div className="pt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Status: Mitra Aktif & Terverifikasi
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/15 space-y-2 min-w-[220px]">
            <p className="text-[11px] text-rose-200 font-medium">Batas Plafon Kuota Pre-Order</p>
            <p className="text-xl font-bold text-white font-mono">Rp 50.000.000</p>
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: '12%' }} />
            </div>
            <p className="text-[10px] text-rose-100">Sisa Plafon Aktif: Rp 46.600.855</p>
          </div>
        </div>
      </div>

      {/* 3. Financial & Quota Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Deposit */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-stone-500">Saldo Deposit</p>
              <WalletIcon className="w-4 h-4 text-emerald-600" />
            </div>
            <h4 className="text-2xl font-bold text-emerald-600 mt-1">
              {currentUser?.balance || 'Rp 0'}
            </h4>
            <p className="text-[11px] text-stone-400 mt-0.5">Siap potong DP otomatis</p>
          </div>
          <button
            onClick={() => onSelectTab && onSelectTab('deposit')}
            className="w-full py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition cursor-pointer text-center"
          >
            + Top Up Deposit
          </button>
        </div>

        {/* Card 2: Total Tagihan PO */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-stone-500">Total Tagihan Berjalan</p>
              <DocumentTextIcon className="w-4 h-4 text-rose-600" />
            </div>
            <h4 className="text-2xl font-bold text-stone-900 mt-1">
              {currentUser?.totalBill || 'Rp 3.399.145'}
            </h4>
            <p className="text-[11px] text-stone-400 mt-0.5">Termin DP & Pelunasan</p>
          </div>
          <button
            onClick={() => onSelectTab && onSelectTab('tagihan')}
            className="w-full py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition cursor-pointer text-center"
          >
            Lihat Rincian Tagihan
          </button>
        </div>

        {/* Card 3: Pesanan Aktif */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-stone-500">Pesanan Pre-Order</p>
              <ShoppingBagIcon className="w-4 h-4 text-purple-600" />
            </div>
            <h4 className="text-2xl font-bold text-purple-700 mt-1">
              5 Transaksi
            </h4>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">● 2 Batch dalam antrean produksi</p>
          </div>
          <button
            onClick={() => onSelectTab && onSelectTab('pesanan_saya')}
            className="w-full py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition cursor-pointer text-center"
          >
            Buka Pesanan Saya
          </button>
        </div>

        {/* Card 4: Tingkat Pembayaran */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-stone-500">Kolektibilitas Mitra</p>
              <CheckIcon className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="text-2xl font-bold text-blue-600 mt-1">
              100% Lancar
            </h4>
            <p className="text-[11px] text-stone-400 mt-0.5">Prioritas alokasi barang pabrik</p>
          </div>
          <div className="py-1.5 bg-emerald-50 text-emerald-700 font-bold text-[11px] rounded-xl text-center">
            ✓ Akun Sehat (Bebas Denda)
          </div>
        </div>
      </div>

      {/* 4. Details Information: Data Kontak & Alamat Pengiriman */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Data Identitas & Kontak */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-stone-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[#6B1416]" />
              <span>Identitas & Kontak Terdaftar</span>
            </h4>
            <button
              onClick={() => onSelectTab && onSelectTab('profil')}
              className="text-xs text-[#6B1416] hover:underline font-bold cursor-pointer"
            >
              Ubah Data
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-stone-50">
              <span className="text-stone-500">Nama Lengkap:</span>
              <span className="font-bold text-stone-900">{currentUser?.name || 'HENI'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-stone-50">
              <span className="text-stone-500">Nomor WhatsApp:</span>
              <span className="font-bold text-stone-900 font-mono">
                {currentUser?.phone || '(+62) 0812-1999-1888'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-stone-50">
              <span className="text-stone-500">Email Resmi:</span>
              <span className="font-bold text-stone-900">
                {currentUser?.email || 'afatharshop@maknahijab.com'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-stone-50">
              <span className="text-stone-500">Peran Sistem:</span>
              <span className="font-bold text-emerald-700">Mitra Distributor Resmi</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-stone-500">Rekening Pengembalian Dana:</span>
              <span className="font-bold text-stone-900 font-mono">BCA : 739-082-9988 (HENI)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Alamat Pengiriman Gudang / Ekspedisi */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-stone-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-[#6B1416]" />
              <span>Alamat Gudang & Ekspedisi Kargo</span>
            </h4>
            <button
              onClick={() => onSelectTab && onSelectTab('alamat')}
              className="text-xs text-[#6B1416] hover:underline font-bold cursor-pointer"
            >
              Buku Alamat
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <p className="text-stone-500 text-[11px] font-medium">Alamat Pengiriman Utama:</p>
              <p className="font-semibold text-stone-800 mt-1 leading-relaxed">
                {currentUser?.address || 'Perumnas 1 Jl Bungur Raya Rt 12 Rw 7 No 86 Kelurahan Jakasampurna Kecamatan Bekasi Barat Kota Bekasi 17145'}
              </p>
            </div>

            <div className="pt-2 border-t border-stone-100 space-y-1.5">
              <p className="text-stone-500 text-[11px] font-medium">Layanan Ekspedisi Langganan:</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2.5 py-1 bg-stone-100 rounded-lg text-stone-700 font-bold text-[11px]">
                  JNE Trucking (JTR)
                </span>
                <span className="px-2.5 py-1 bg-stone-100 rounded-lg text-stone-700 font-bold text-[11px]">
                  J&T Cargo
                </span>
                <span className="px-2.5 py-1 bg-stone-100 rounded-lg text-stone-700 font-bold text-[11px]">
                  Dakota Cargo
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-stone-500 text-[11px]">
              <span>Catatan Pengiriman:</span>
              <span className="font-semibold text-stone-700">Wajib Packing Karung & Label Mitra</span>
            </div>
          </div>
        </div>

      </div>

      {/* 5. Quick Shortcut Grid (Akses Seluruh Menu Mitra) */}
      <div className="bg-stone-50/70 rounded-3xl p-6 border border-stone-200/80 space-y-3">
        <h4 className="font-bold text-xs uppercase tracking-wider text-stone-500">
          Pintasan Cepat Menu Distributor
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <button
            onClick={() => onSelectTab && onSelectTab('profil')}
            className="bg-white p-3.5 rounded-2xl border border-stone-200 hover:border-[#6B1416] hover:shadow-xs transition text-left cursor-pointer space-y-1"
          >
            <UserIcon className="w-4 h-4 text-[#6B1416]" />
            <p className="font-bold text-stone-900">Edit Profil Diri</p>
            <p className="text-[10px] text-stone-500">Ubah kontak & foto</p>
          </button>

          <button
            onClick={() => onSelectTab && onSelectTab('alamat')}
            className="bg-white p-3.5 rounded-2xl border border-stone-200 hover:border-[#6B1416] hover:shadow-xs transition text-left cursor-pointer space-y-1"
          >
            <MapPinIcon className="w-4 h-4 text-emerald-600" />
            <p className="font-bold text-stone-900">Buku Alamat</p>
            <p className="text-[10px] text-stone-500">Alamat dropship cabang</p>
          </button>

          <button
            onClick={() => onSelectTab && onSelectTab('deposit')}
            className="bg-white p-3.5 rounded-2xl border border-stone-200 hover:border-[#6B1416] hover:shadow-xs transition text-left cursor-pointer space-y-1"
          >
            <WalletIcon className="w-4 h-4 text-amber-600" />
            <p className="font-bold text-stone-900">Deposit Saldo</p>
            <p className="text-[10px] text-stone-500">Bayar DP praktis</p>
          </button>

          <button
            onClick={() => onSelectTab && onSelectTab('ubah_password')}
            className="bg-white p-3.5 rounded-2xl border border-stone-200 hover:border-[#6B1416] hover:shadow-xs transition text-left cursor-pointer space-y-1"
          >
            <KeyIcon className="w-4 h-4 text-purple-600" />
            <p className="font-bold text-stone-900">Keamanan Sandi</p>
            <p className="text-[10px] text-stone-500">Proteksi akun Anda</p>
          </button>
        </div>
      </div>

    </div>
  );
}
