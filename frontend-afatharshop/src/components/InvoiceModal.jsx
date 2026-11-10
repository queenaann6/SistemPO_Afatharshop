import React, { useRef, useState, useEffect } from 'react';
import { XIcon, PrinterIcon } from './Icons';
import { buildInvoiceHTML, openInvoicePrintTab } from '../utils/printInvoice';
import api, { tokenStore } from '../services/api';
import { mapOrderToProjectOrder } from '../services/adapters';

export default function InvoiceModal({
  isOpen,
  onClose,
  order,
  bankAccounts = []
}) {
  const iframeRef = useRef(null);
  const [activeOrder, setActiveOrder] = useState(order);

  useEffect(() => {
    setActiveOrder(order);
  }, [order]);

  // Synchronize fresh invoice details from API when modal opens
  useEffect(() => {
    if (!isOpen || !order) return;
    const orderKey = order.id || order.orderNo || order.invoice || order.order_number;
    if (!orderKey || !tokenStore.get()) return;

    let isMounted = true;
    (async () => {
      try {
        const res = await api.orderInvoice(orderKey).catch(() => api.management.orderInvoice(orderKey));
        if (isMounted && res?.data) {
          const freshMapped = (res.data.invoice_number || res.data.order_number)
            ? mapOrderToProjectOrder(res.data)
            : res.data;
          setActiveOrder((prev) => ({
            ...prev,
            ...freshMapped,
            items: (Array.isArray(freshMapped.items) && freshMapped.items.length) ? freshMapped.items : prev.items
          }));
        }
      } catch {
        // Fall back gracefully to passed order prop
      }
    })();

    return () => { isMounted = false; };
  }, [isOpen, order?.id, order?.orderNo, order?.invoice, order?.order_number]);

  if (!isOpen || !activeOrder) return null;

  const clean = (v) => String(v == null ? '' : v).trim();
  const orderNo = clean(activeOrder.orderNo) || clean(activeOrder.invoice) || clean(activeOrder.order_number) || '#INV';

  const html = buildInvoiceHTML(activeOrder, bankAccounts, { insideModal: true });

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      openInvoicePrintTab(activeOrder, bankAccounts);
    }
  };

  const handleOpenTab = () => {
    openInvoicePrintTab(activeOrder, bankAccounts);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in zoom-in-95 flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Control Bar */}
        <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between gap-3 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <PrinterIcon className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-xs sm:text-sm tracking-wide">
              Invoice <span className="font-mono text-amber-300">{orderNo}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenTab}
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
              title="Buka faktur di tab baru"
            >
              Tab Baru
            </button>
            <button
              onClick={handlePrint}
              className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs px-4 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Cetak faktur / simpan PDF"
            >
              <PrinterIcon className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Tutup"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ON-SCREEN INVOICE DOCUMENT PREVIEW: 100% IDENTICAL TO CETAK INVOICE */}
        <div className="flex-1 w-full bg-white overflow-hidden min-h-[550px] sm:min-h-[660px]">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title={`Invoice ${orderNo}`}
            className="w-full h-full border-none block"
            style={{ minHeight: 'calc(88vh - 60px)' }}
          />
        </div>
      </div>
    </div>
  );
}
