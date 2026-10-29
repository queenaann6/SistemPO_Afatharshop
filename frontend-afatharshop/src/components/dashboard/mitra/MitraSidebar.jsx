import React from 'react';
import {
  HomeIcon,
  UserIcon,
  MapPinIcon,
  DocumentTextIcon,
  ClockIcon,
  CreditCardIcon,
  WalletIcon,
  KeyIcon,
  ShoppingBagIcon,
  LogoutIcon
} from '../../Icons';

export default function MitraSidebar({
  activeTab,
  onSelectTab,
  currentUser,
  onLogout
}) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
    { id: 'profil', label: 'Profil', icon: UserIcon },
    { id: 'alamat', label: 'Alamat', icon: MapPinIcon },
    { id: 'tagihan', label: 'Tagihan', icon: DocumentTextIcon },
    { id: 'riwayat_tagihan', label: 'Riwayat Tagihan', icon: ClockIcon },
    { id: 'riwayat_pembayaran', label: 'Riwayat Pembayaran', icon: CreditCardIcon },
    { id: 'deposit', label: 'Deposit', icon: WalletIcon },
    { id: 'ubah_password', label: 'Ubah Password', icon: KeyIcon },
    { id: 'pesanan_saya', label: 'Pesanan Saya', icon: ShoppingBagIcon }
  ];

  return (
    <aside className="w-full lg:w-64 bg-white rounded-3xl shadow-sm border border-stone-200/80 p-4 shrink-0 flex flex-col justify-between">
      <div>
        {/* User Mini Profile */}
        <div className="flex items-center gap-3 p-2 mb-4 border-b border-stone-100">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 ring-2 ring-emerald-500/30 shrink-0">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80'}
              alt={currentUser?.name || 'HENI'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-stone-900 text-sm tracking-wide truncate uppercase">
              {currentUser?.name || 'HENI'}
            </h4>
            <p className="text-emerald-500 font-semibold text-xs mt-0.5">
              {currentUser?.balance || 'Rp 0'}
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#FFF1F2] text-[#6B1416] font-bold shadow-xs border border-rose-100'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50 font-medium border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#6B1416]' : 'text-stone-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Action at bottom */}
      <div className="pt-4 mt-4 border-t border-stone-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs text-rose-600 hover:bg-rose-50 font-semibold transition cursor-pointer text-left"
        >
          <LogoutIcon className="w-4 h-4 shrink-0 text-rose-500" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
