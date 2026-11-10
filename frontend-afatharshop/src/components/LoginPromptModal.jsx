import React from 'react';

export default function LoginPromptModal({ isOpen, onClose, onLogin }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center border border-stone-200">
        
        {/* Yellow Exclamation Circle Icon */}
        <div className="mx-auto w-16 h-16 rounded-full border-2 border-amber-400 bg-amber-50 flex items-center justify-center mb-4">
          <span className="text-2xl font-bold text-amber-500">!</span>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-1">
          Silahkan Login.
        </h3>

        {/* Subtitle */}
        <p className="text-xs text-stone-500 max-w-xs mx-auto mb-6 leading-relaxed">
          Maaf, anda harus Login Untuk Melanjutkan Aksi ini
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg text-xs font-semibold bg-[#FDE5D8] hover:bg-[#F9D6C4] text-stone-700 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onLogin}
            className="flex-1 py-2 px-4 rounded-lg text-xs font-semibold bg-[#FFA67A] hover:bg-[#F9925E] text-white shadow-xs transition cursor-pointer"
          >
            Login
          </button>
        </div>

      </div>
    </div>
  );
}
