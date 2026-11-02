import React from 'react';

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Hapus split alamat ini?",
  message = "Apakah Anda yakin ingin menghapus item ini dari pesanan PO Anda?"
}) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-stone-200 animate-in zoom-in-95 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Circle (Matches Screenshot 3) */}
        <div className="w-16 h-16 rounded-full border-2 border-amber-400 text-amber-500 flex items-center justify-center mx-auto text-3xl font-serif">
          !
        </div>

        <h3 className="text-base sm:text-lg font-bold text-stone-900 leading-snug">
          {title}
        </h3>

        {message && (
          <p className="text-xs text-stone-500">
            {message}
          </p>
        )}

        {/* Buttons (Matches Screenshot 3) */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-[#525CEB] hover:bg-[#3D47D9] text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            Ya, hapus
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#64748B] hover:bg-[#475569] text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
