import React, { useState, useEffect } from 'react';
import { PlusIcon } from '../../Icons';
import AddressFormModal from '../../AddressFormModal';
import {
  deleteAddressBookItem,
  getStoredAddresses,
  pushAddressBookItem,
  saveStoredAddresses,
  setDefaultAddressItem,
  syncAddressBookFromApi
} from './mitraAddressBook';

export default function MitraAddressTab() {
  const [addresses, setAddresses] = useState(() => getStoredAddresses());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  // Hasil sinkronisasi backend menggantikan cache lokal; null berarti offline.
  const applyServerBook = (book) => {
    if (Array.isArray(book) && book.length) setAddresses(book);
  };

  useEffect(() => {
    let cancelled = false;
    syncAddressBookFromApi().then((book) => {
      if (!cancelled && Array.isArray(book)) {
        applyServerBook(book);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSetDefault = (id) => {
    setAddresses((prev) => {
      const next = prev.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
        isPrimary: addr.id === id
      }));
      saveStoredAddresses(next);
      return next;
    });
    setDefaultAddressItem(id).then(applyServerBook);
  };

  const handleDelete = (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus alamat ini?')) {
      setAddresses((prev) => {
        const next = prev.filter((addr) => addr.id !== id);
        saveStoredAddresses(next);
        return next;
      });
      deleteAddressBookItem(id).then(applyServerBook);
    }
  };

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingAddress(addr);
    setIsModalOpen(true);
  };

  const handleSaveModal = (savedAddr) => {
    if (editingAddress) {
      setAddresses((prev) => {
        const next = prev.map((a) =>
          a.id === editingAddress.id ? { ...a, ...savedAddr } : a
        );
        saveStoredAddresses(next);
        return next;
      });
    } else {
      const isFirst = addresses.length === 0;
      const newAddress = {
        ...savedAddr,
        isDefault: isFirst,
        isPrimary: isFirst
      };
      setAddresses((prev) => {
        const next = [newAddress, ...prev];
        saveStoredAddresses(next);
        return next;
      });
    }
    pushAddressBookItem(savedAddr, editingAddress?.id).then(applyServerBook);
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-wide">
          Alamat
        </h2>
        <button
          onClick={handleOpenAdd}
          className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Tambah Alamat Baru</span>
        </button>
      </div>

      {/* Address List Table/Cards */}
      <div className="divide-y divide-stone-100">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-start justify-between gap-4"
          >
            {/* Left: Contact & Badge */}
            <div className="w-full md:w-44 shrink-0">
              <h4 className="font-bold text-xs text-stone-900 uppercase">
                {addr.recipient || addr.name}
              </h4>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {addr.phoneDisplay || `(+62) ${addr.phone}`}
              </p>
              {(addr.isDefault || addr.isPrimary) && (
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-bold border border-stone-200">
                  Utama
                </span>
              )}
            </div>

            {/* Center: Full Address text */}
            <div className="flex-1 text-xs text-stone-600 leading-relaxed pr-2">
              {addr.address}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0 self-start">
              {!(addr.isDefault || addr.isPrimary) && (
                <button
                  onClick={() => handleSetDefault(addr.id)}
                  className="px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 border border-stone-200 rounded-lg transition cursor-pointer"
                >
                  Atur Sebagai Utama
                </button>
              )}
              <button
                onClick={() => handleOpenEdit(addr)}
                className="px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 border border-stone-200 rounded-lg transition cursor-pointer"
              >
                Ubah
              </button>
              <button
                onClick={() => handleDelete(addr.id)}
                className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Address Modal */}
      <AddressFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        editingAddress={editingAddress}
      />
    </div>
  );
}
