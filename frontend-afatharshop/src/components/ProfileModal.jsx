import React, { useRef, useState } from 'react';
import { XIcon, CameraIcon, CheckIcon, ShieldCheckIcon, PhoneIcon, MailIcon, MapPinIcon, TrashIcon } from './Icons';

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onUpdateAvatar
}) {
  const fileInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.name || 'Mitra',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    address: currentUser?.address || ''
  });
  const [uploadSuccess, setUploadSuccess] = useState(false);

  if (!isOpen) return null;

  // Handle image upload from file picker
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        onUpdateAvatar && onUpdateAvatar(dataUrl);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateUser && onUpdateUser(formData);
    setIsEditing(false);
  };

  const hasAvatar = !!(currentUser?.avatar && !currentUser.avatar.includes('unsplash.com'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-orange-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#6B1416] text-white px-6 py-4 flex items-center justify-between border-b border-[#520C0E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#F0C973] text-[#6B1416] flex items-center justify-center font-bold text-sm">
              AS
            </div>
            <div>
              <h2 className="font-bold text-base text-white">Akun Saya & Profil Mitra</h2>
              <p className="text-[11px] text-amber-100/80">Kelola informasi akun dan foto profil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center text-center p-4 bg-gradient-to-b from-[#FFF5ED] to-white rounded-2xl border border-rose-100/60">
            <div className="relative group mb-3">
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#F0C973] shadow-lg bg-stone-100 flex items-center justify-center">
                {hasAvatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser?.name || 'Mitra'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-extrabold text-stone-400 uppercase">
                    {String(currentUser?.name || 'M').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Upload Overlay Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/45 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer text-[10px] font-semibold"
                title="Unggah Foto Profil Baru"
              >
                <CameraIcon className="w-5 h-5 mb-0.5 text-[#F0C973]" />
                <span>{hasAvatar ? 'Ganti Foto' : 'Pilih Foto'}</span>
              </button>

              {/* Camera Badge */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#6B1416] text-[#F0C973] border-2 border-white shadow-md flex items-center justify-center hover:scale-110 transition cursor-pointer"
                title="Pilih Foto dari Perangkat"
              >
                <CameraIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden Input File */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <h3 className="font-bold text-lg text-stone-900 tracking-wide">
              {currentUser?.name || 'Mitra'}
            </h3>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mt-1">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mitra Distributor Terverifikasi</span>
            </div>

            {uploadSuccess && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 animate-in fade-in">
                <CheckIcon className="w-3.5 h-3.5" />
                <span>{hasAvatar ? 'Foto profil berhasil diperbarui!' : 'Foto profil berhasil dihapus!'}</span>
              </div>
            )}

            {/* Avatar Action Controls */}
            <div className="mt-4 pt-3 border-t border-rose-100/80 w-full flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-[#6B1416] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CameraIcon className="w-3.5 h-3.5" />
                <span>{hasAvatar ? 'Ganti Foto' : 'Unggah Foto'}</span>
              </button>
              {hasAvatar && (
                <>
                  <span className="text-stone-300">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateAvatar && onUpdateAvatar('');
                      setUploadSuccess(true);
                      setTimeout(() => setUploadSuccess(false), 2000);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    <span>Hapus Foto</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Billing & Saldo Quick Bar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-center">
              <p className="text-[11px] text-stone-500 font-medium">Saldo / Poin</p>
              <p className="text-base font-bold text-emerald-600 mt-0.5">
                {currentUser?.balance || 'Rp 0'}
              </p>
            </div>
            <div className="bg-rose-50/80 rounded-xl p-3 border border-rose-100 text-center">
              <p className="text-[11px] text-rose-500 font-medium">Total Tagihan PO</p>
              <p className="text-base font-bold text-rose-700 mt-0.5">
                {currentUser?.totalBill || 'Rp 0'}
              </p>
            </div>
          </div>

          {/* Form / Details */}
          <div className="space-y-3.5 text-xs text-stone-700">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-800 text-sm">Informasi Kontak & Pengiriman</span>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-[#6B1416] font-semibold hover:underline cursor-pointer"
              >
                {isEditing ? 'Batal' : 'Edit Info'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white px-3 py-2 rounded-lg border border-stone-300 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">No. WhatsApp</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white px-3 py-2 rounded-lg border border-stone-300 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white px-3 py-2 rounded-lg border border-stone-300 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">Alamat Pengiriman</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-white px-3 py-2 rounded-lg border border-stone-300 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6B1416]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold py-2 rounded-xl transition cursor-pointer shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </form>
            ) : (
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100/70 text-[#6B1416] flex items-center justify-center shrink-0">
                    <PhoneIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-500 font-medium">No. WhatsApp</p>
                    <p className="font-semibold text-stone-800">{currentUser?.phone || '-'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100/70 text-[#6B1416] flex items-center justify-center shrink-0">
                    <MailIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-500 font-medium">Email Terdaftar</p>
                    <p className="font-semibold text-stone-800">{currentUser?.email || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100/70 text-[#6B1416] flex items-center justify-center shrink-0 mt-0.5">
                    <MapPinIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-500 font-medium">Alamat Ekspedisi Mitra</p>
                    <p className="font-medium text-stone-700 leading-relaxed">
                      {currentUser?.address || 'Belum ada alamat tersimpan'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 px-6 py-3.5 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs px-5 py-2 rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
