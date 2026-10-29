import React, { useEffect } from 'react';
import { XIcon, InfoIcon } from './Icons';

export default function Toast({ message, type = 'warning', onClose, onAction, actionLabel }) {
  if (!message) return null;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-white border border-amber-300 rounded-xl shadow-2xl p-4 animate-in slide-in-from-top-4 duration-200">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-800">
          <InfoIcon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-xs font-bold text-stone-900">Perhatian</h4>
          <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{message}</p>
          {actionLabel && (
            <button
              onClick={onAction}
              className="mt-2.5 text-xs font-bold text-[#6B1416] bg-amber-100/70 hover:bg-amber-200/80 px-3 py-1 rounded-md transition cursor-pointer"
            >
              {actionLabel} &rarr;
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-700 p-0.5 rounded cursor-pointer"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
