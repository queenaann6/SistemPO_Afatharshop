import React from 'react';
import MitraSidebar from './MitraSidebar';
import MitraOverviewTab from './MitraOverviewTab';
import MitraProfileTab from './MitraProfileTab';
import MitraAddressTab from './MitraAddressTab';
import MitraBillsTab from './MitraBillsTab';
import MitraPaymentsTab from './MitraPaymentsTab';
import MitraBillsHistoryTab from './MitraBillsHistoryTab';
import MitraDepositTab from './MitraDepositTab';
import MitraPasswordTab from './MitraPasswordTab';
import MitraOrdersTab from './MitraOrdersTab';
import { ChevronRightIcon } from '../../Icons';

export default function MitraDashboard({
  activeTab = 'dashboard',
  onSelectTab,
  currentUser,
  onUpdateUser,
  onUpdateAvatar,
  onLogout,
  onNavigateCatalog,
  onNavigateHome,
  poBatches = [],
  onUploadPayment,
  onDepositSubmit,
  onPayWithDeposit,
  orders = [],
  adminBankAccounts = [],
  adminCouriers = [],
  onUpdateOrder,
  deposits = [],
  payments = [],
  products = []
}) {
  return (
    <div className="min-h-screen bg-[#FFE5D4] py-6 sm:py-8 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        
        {/* Navigation Breadcrumb & Quick Switch */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 bg-white/70 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-orange-100">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onNavigateHome}
              className="text-stone-500 hover:text-[#6B1416] transition cursor-pointer"
            >
              Beranda Toko
            </button>
            <ChevronRightIcon className="w-3 h-3 text-stone-400" />
            <span className="font-semibold text-[#6B1416]">Dashboard Khusus Mitra</span>
            <ChevronRightIcon className="w-3 h-3 text-stone-400" />
            <span className="capitalize font-medium text-stone-800">
              {activeTab.replace('_', ' ')}
            </span>
          </div>

          <button
            onClick={onNavigateCatalog}
            className="text-xs font-bold text-[#6B1416] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Belanja Katalog Pre-Order &rarr;</span>
          </button>
        </div>

        {/* 2-Column Dashboard Layout (Matches All 5 Uploaded Mockups) */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left: Sticky Sidebar */}
          <MitraSidebar
            activeTab={activeTab}
            onSelectTab={onSelectTab}
            currentUser={currentUser}
            onLogout={onLogout}
          />

          {/* Right: Dynamic Main Content Tab */}
          <main className="flex-1 w-full min-w-0">
            {(activeTab === 'dashboard' || activeTab === 'akun_saya') && (
              <MitraOverviewTab
                currentUser={currentUser}
                onNavigateCatalog={onNavigateCatalog}
                onSelectTab={onSelectTab}
                orders={orders}
                products={products}
                poBatches={poBatches}
              />
            )}

            {activeTab === 'profil' && (
              <MitraProfileTab
                currentUser={currentUser}
                onUpdateUser={onUpdateUser}
                onUpdateAvatar={onUpdateAvatar}
              />
            )}

            {activeTab === 'alamat' && (
              <MitraAddressTab />
            )}

            {activeTab === 'tagihan' && (
              <MitraBillsTab
                orders={orders}
                currentUser={currentUser}
                adminBankAccounts={adminBankAccounts}
                onUploadPayment={onUploadPayment}
                onPayWithDeposit={onPayWithDeposit}
              />
            )}

            {activeTab === 'riwayat_tagihan' && (
              <MitraBillsHistoryTab
                orders={orders}
                currentUser={currentUser}
                adminBankAccounts={adminBankAccounts}
              />
            )}

            {activeTab === 'riwayat_pembayaran' && (
              <MitraPaymentsTab orders={orders} currentUser={currentUser} payments={payments} />
            )}

            {activeTab === 'deposit' && (
              <MitraDepositTab
                currentUser={currentUser}
                onDepositSubmit={onDepositSubmit}
                adminBankAccounts={adminBankAccounts}
                deposits={deposits}
              />
            )}

            {activeTab === 'ubah_password' && (
              <MitraPasswordTab />
            )}

            {activeTab === 'pesanan_saya' && (
              <MitraOrdersTab
                onNavigateCatalog={onNavigateCatalog}
                onSelectTab={onSelectTab}
                onUploadPayment={onUploadPayment}
                onPayWithDeposit={onPayWithDeposit}
                currentUser={currentUser}
                poBatches={poBatches}
                orders={orders}
                adminBankAccounts={adminBankAccounts}
                adminCouriers={adminCouriers}
                onUpdateOrder={onUpdateOrder}
              />
            )}
          </main>
        </div>

      </div>
    </div>
  );
}
