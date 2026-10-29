import React, { useState, useRef, useEffect, useMemo } from 'react';
import AddProductModal from './AddProductModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import SplitAddressModal from './SplitAddressModal';
import InvoiceModal from '../../InvoiceModal';
import { openInvoicePrintTab } from '../../../utils/printInvoice';
import { MITRA_ADDRESS_BOOK } from './mitraAddressBook';
import {
  PrinterIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  TruckIcon,
  XIcon,
  CameraIcon,
  CopyIcon,
  DocumentTextIcon,
  EyeIcon
} from '../../Icons';

export default function OrderDetailView({
  order,
  onBack,
  onSelectTab,
  onUploadPayment,
  isClosedPOProp,
  adminBankAccounts = [],
  orderInvoice,
  onUpdateOrder
}) {
  // PO open/close status is strictly determined by Admin (not toggleable by Mitra)
  const isClosedPO = typeof isClosedPOProp === 'boolean' ? isClosedPOProp : (order?.isClosedPO ?? false);

  // Dynamic products list inside this order
  const [items, setItems] = useState(
    order?.items || [
      {
        id: 1,
        title: 'SARIMBIT KARTIKA RAYA BATCH 2',
        variant: 'SCARF MOM ALL : IVORY',
        variation: 'SCARF MOM',
        size: 'ALL',
        color: 'IVORY',
        price: 92000,
        qty: 1,
        subtotal: 92000,
        dueDate: '20 Jan 2027',
        image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80',
        splits: []
      },
      {
        id: 2,
        title: 'SARIMBIT KARTIKA RAYA BATCH 2',
        variant: 'MOM DRESS B ONLY L : SANGRIA',
        variation: 'MOM DRESS B ONLY',
        size: 'L',
        color: 'SANGRIA',
        price: 390000,
        qty: 1,
        subtotal: 390000,
        dueDate: '20 Jan 2027',
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80',
        splits: []
      }
    ]
  );

  // Ekspedisi selection (without hardcoded price)
  const [selectedCourier, setSelectedCourier] = useState('JNE JNE Trucking (Cargo)');
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);

  // Bank accounts updated by Admin Finance
  const bankAccountsList = adminBankAccounts && adminBankAccounts.length > 0
    ? adminBankAccounts.filter((b) => b.active !== false).map((b) => ({
        id: b.id,
        name: `${b.bank}: ${b.accountNo} a.n ${b.holder}`,
        bank: b.bank,
        accountNo: b.accountNo,
        holder: b.holder
      }))
    : [
        { id: 'mandiri', name: 'MANDIRI : 1234567890123 (a.n Erna Susiyanti)', bank: 'MANDIRI', accountNo: '1234567890123', holder: 'Erna Susiyanti' },
        { id: 'bca', name: 'BCA : 87654321 (a.n Erna Susiyanti)', bank: 'BCA', accountNo: '87654321', holder: 'Erna Susiyanti' },
        { id: 'bri', name: 'BRI : 987654312156 (a.n Erna Susiyanti)', bank: 'BRI', accountNo: '987654312156', holder: 'Erna Susiyanti' },
        { id: 'bsi', name: 'BSI Syariah : 7149021821 (a.n Erna Susiyanti)', bank: 'BSI', accountNo: '7149021821', holder: 'Erna Susiyanti' }
      ];

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTargetItem, setDeleteTargetItem] = useState(null);
  const [allocationAddress, setAllocationAddress] = useState(null);
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [extraAddresses, setExtraAddresses] = useState([]);
  const [courierTargetAddress, setCourierTargetAddress] = useState(null);
  const [courierChoice, setCourierChoice] = useState('');

  const persistItems = (nextItems) => {
    setItems(nextItems);
    onUpdateOrder?.({ items: nextItems, invoice: orderInvoice || order?.orderNo || order?.id });
  };

  const openAllocationFor = (address) => {
    setAllocationAddress(address);
    setIsSplitModalOpen(true);
  };

  const handleSaveAllocations = (allocations) => {
    if (!allocationAddress) return;
    const targetId = String(allocationAddress.id);
    const nextItems = items.map((item) => {
      const alloc = allocations.find((a) => String(a.itemId) === String(item.id));
      if (!alloc) return item;
      const qty = Math.max(0, Number(alloc.qty) || 0);
      const existing = (item.splits || []).filter(
        (s) => String(s.address?.id) === targetId
      );
      const others = (item.splits || []).filter(
        (s) => String(s.address?.id) !== targetId
      );
      if (qty === 0) return { ...item, splits: others };
      const base = existing[0] || {};
      const addressCourier =
        base.courier ||
        extraAddresses.find((a) => String(a.id) === targetId)?.courier ||
        null;
      const split = {
        id: base.id || Date.now() + Math.floor(Math.random() * 1000),
        address: allocationAddress,
        qty,
        weight: qty * (Number(item.unitWeight) || 300),
        senderName: base.senderName || 'HENI',
        senderPhone: base.senderPhone || '(+62)',
        senderNotes: base.senderNotes || '',
        courier: addressCourier
      };
      return { ...item, splits: [...others, split] };
    });
    persistItems(nextItems);
    setNotification('Alokasi produk ke alamat berhasil disimpan.');
    setTimeout(() => setNotification(''), 3500);
  };

  const addressGroups = useMemo(() => {
    const groups = new Map();
    items.forEach((item) => {
      (item.splits || []).forEach((split) => {
        const key = String(split.address?.id ?? split.address?.recipient ?? split.id);
        if (!groups.has(key)) {
          groups.set(key, { address: split.address, rows: [], courier: null });
        }
        const group = groups.get(key);
        group.rows.push({ item, split });
        if (split.courier) group.courier = split.courier;
      });
    });
    extraAddresses.forEach((address) => {
      const key = String(address.id);
      if (!groups.has(key)) {
        groups.set(key, { address, rows: [], courier: address.courier || null });
      } else if (!groups.get(key).courier && address.courier) {
        groups.get(key).courier = address.courier;
      }
    });
    return [...groups.values()];
  }, [items, extraAddresses]);

  const handlePickAddress = (address) => {
    setExtraAddresses((prev) =>
      prev.some((a) => String(a.id) === String(address.id)) ? prev : [...prev, address]
    );
    setIsAddressPickerOpen(false);
    openAllocationFor(address);
  };

  const handleRemoveAddress = (address) => {
    setExtraAddresses((prev) =>
      prev.filter((a) => String(a.id) !== String(address?.id))
    );
  };

  const openCourierFor = (address, currentCourier) => {
    setCourierTargetAddress(address);
    setCourierChoice(currentCourier?.name || 'JNE JNE Trucking (Cargo)');
  };

  const handleSaveAddressCourier = () => {
    if (!courierTargetAddress || !courierChoice) return;
    const targetId = String(courierTargetAddress.id);
    const courierObj = {
      id: courierChoice.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      name: courierChoice
    };
    const nextItems = items.map((item) => ({
      ...item,
      splits: (item.splits || []).map((split) =>
        String(split.address?.id) === targetId ? { ...split, courier: courierObj } : split
      )
    }));
    setExtraAddresses((prev) =>
      prev.some((a) => String(a.id) === targetId)
        ? prev.map((a) => (String(a.id) === targetId ? { ...a, courier: courierObj } : a))
        : [...prev, { ...courierTargetAddress, courier: courierObj }]
    );
    persistItems(nextItems);
    setNotification(
      `Jasa kirim untuk alamat ${courierTargetAddress.recipient || courierTargetAddress.name} disimpan: ${courierChoice}.`
    );
    setTimeout(() => setNotification(''), 3500);
    setCourierTargetAddress(null);
  };

  const handleRemoveSingleSplit = (itemId, splitId) => {
    const nextItems = items.map((item) => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        splits: (item.splits || []).filter((sp) => sp.id !== splitId)
      };
    });
    persistItems(nextItems);
    setNotification('Alamat split berhasil dihapus.');
    setTimeout(() => setNotification(''), 3000);
  };

  // Proof Upload Modal States (Exact match to Info Pembayaran mockup)
  const [isUploadProofOpen, setIsUploadProofOpen] = useState(false);
  const [proofTitle, setProofTitle] = useState('');
  const [proofAmount, setProofAmount] = useState('156000');
  const [proofBank, setProofBank] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [proofFileName, setProofFileName] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [notification, setNotification] = useState('');
  const [previewProof, setPreviewProof] = useState(null);
  const proofFileRef = useRef(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Status pembayaran termin lokal (DP, Pelunasan, Ongkir)
  const [localPayments, setLocalPayments] = useState(() => {
    const map = {};
    if (order?.status === 'Selesai' || order?.paymentStatus === 'Lunas' || order?.dpStatus === 'Lunas') {
      map.dp = {
        title: 'DP',
        nominal: Number(order?.dpNominal) || 82800,
        bank: 'BCA (PT Afathar Niaga Indonesia)',
        status: 'Lunas',
        image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
        date: order?.date || '27 Okt 2026'
      };
    }
    return map;
  });

  // Sinkronkan daftar produk saat Admin Finance mengubah invoice
  useEffect(() => {
    if (order?.items && order.items.length) setItems(order.items);
  }, [order?.items]);

  // Calculations (Ongkir is NOT a number, only product total is billed upfront)
  const totalItemsPrice = items.reduce((sum, item) => sum + item.subtotal, 0);
  const primaryTitle = String(items[0]?.title || order?.title || 'Pesanan PO').toUpperCase();
  const isMultiItem = items.length > 1;
  const summaryTitle = isMultiItem ? `Pesanan (${items.length} Varian)` : primaryTitle;
  const totalQty = items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
  const dpNominal = Number(order?.dpNominal) || Math.round(totalItemsPrice * 0.4);
  const dpPct =
    Number(order?.dpPct) || Math.round((dpNominal / Math.max(1, totalItemsPrice)) * 100);
  const pelunasanNominal = Math.max(0, totalItemsPrice - dpNominal);
  const pelunasanPct = Math.max(0, 100 - dpPct);
  const buyerName = String(order?.mitraName || 'HENI').split(' (')[0];
  const buyerAddress =
    order?.address || 'Perumnas 1 Jl Bungur Raya Rt 12 Rw 7 No 86, Bekasi';
  const dpDue =
    order?.dpDueDate ||
    (order?.closeDate && order.closeDate !== '-' ? order.closeDate : '27 Oktober 2026');
  const pelunasanDue =
    order?.pelunasanDueDate || items[0]?.dueDate || '10 Januari 2027';

  // Copy Rekening to clipboard handler
  const handleCopyRekening = (text, bankLabel) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopyFeedback(`Nomor Rekening ${bankLabel} (${text}) berhasil disalin!`);
      setTimeout(() => setCopyFeedback(''), 2500);
    }
  };

  // Add or Edit Product Handler
  const handleSaveProduct = (newProduct) => {
    if (editingItem) {
      persistItems(items.map((item) => (item.id === newProduct.id ? newProduct : item)));
      setNotification(`Produk "${newProduct.variant}" berhasil diperbarui.`);
    } else {
      persistItems([...items, newProduct]);
      setNotification(`Produk "${newProduct.variant}" berhasil ditambahkan ke pesanan PO.`);
    }
    setTimeout(() => setNotification(''), 3500);
  };

  // Delete Product Handler
  const handleConfirmDelete = () => {
    if (deleteTargetItem) {
      persistItems(items.filter((item) => item.id !== deleteTargetItem.id));
      setNotification(`Produk berhasil dihapus dari pesanan.`);
      setDeleteTargetItem(null);
      setTimeout(() => setNotification(''), 3500);
    }
  };

  // Open Proof Upload Modal with auto-filled suggested amount
  const handleOpenProof = (title, defaultAmount) => {
    setProofTitle(title);
    setProofAmount(defaultAmount.toString());
    setProofImage(null);
    setProofFileName('');
    setProofNote('');
    setProofBank('');
    setUploadSuccess(false);
    setIsUploadProofOpen(true);
  };

  const handleProofImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadProofSubmit = (e) => {
    e.preventDefault();
    if (!proofImage) {
      alert('Harap pilih foto bukti transfer terlebih dahulu.');
      return;
    }
    if (!proofBank) {
      alert('Harap pilih rekening bank tujuan transfer.');
      return;
    }

    if (onUploadPayment) {
      onUploadPayment({
        id: Date.now(),
        orderNo: order?.orderNo || 'INV-20261018-0146',
        mitraName: 'HENI',
        title: proofTitle || 'Pembayaran Termin PO',
        nominal: parseInt(proofAmount || '0', 10),
        bank: proofBank,
        note: proofNote,
        image: proofImage,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'Menunggu Validasi'
      });
    }

    const key = (proofTitle || '').toLowerCase().includes('dp') ? 'dp' : 'pelunasan';
    setLocalPayments((prev) => ({
      ...prev,
      [key]: {
        title: proofTitle || (key === 'dp' ? 'DP' : 'Pelunasan'),
        nominal: parseInt(proofAmount || '0', 10),
        bank: proofBank,
        note: proofNote,
        image: proofImage,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'Menunggu Validasi'
      }
    }));

    setUploadSuccess(true);
    setTimeout(() => {
      setIsUploadProofOpen(false);
      setUploadSuccess(false);
      setNotification('Bukti pembayaran berhasil diunggah dan diteruskan ke Admin Finance.');
      setTimeout(() => setNotification(''), 4000);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Navigation & Read-only PO Status (Regulated strictly by Admin) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="text-xs font-bold text-[#6B1416] hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          <span>&larr; Kembali ke Daftar Pesanan</span>
        </button>

        {/* Status Batch Pre-Order Badge (Regulated strictly by Admin) */}
        <div className="flex items-center gap-2 bg-stone-50 px-3.5 py-1.5 rounded-2xl border border-stone-200 text-xs">
          <span className="text-stone-500 font-medium">Status Batch Pre-Order:</span>
          <span
            className={`px-3 py-1 rounded-xl font-bold text-[11px] inline-flex items-center gap-1.5 ${
              isClosedPO
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isClosedPO ? 'bg-rose-600' : 'bg-emerald-600 animate-pulse'}`}></span>
            {isClosedPO ? 'Pre-Order Ditutup (Proses Pabrik)' : 'Pre-Order Aktif Terbuka'}
          </span>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification('')} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top 2-Column Order Header (Matches Screenshot 2 & 5) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Col: Order Identifiers */}
        <div className="space-y-4">
          <div>
            <p className="text-[11px] text-stone-500 font-medium">Nomor pesanan:</p>
            <h3 className="text-base sm:text-lg font-mono font-bold text-stone-900 mt-0.5">
              {order?.orderNo || 'INV-20261018-0146'}
            </h3>
          </div>

          <div>
            <p className="text-[11px] text-stone-500 font-medium">Tanggal Pembelian</p>
            <p className="text-xs font-semibold text-stone-800 mt-0.5">
              {order?.date || '18 Oct 2026'}, 02:46 WIB
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs px-4 py-2 rounded-xl shadow-2xs transition flex items-center gap-2 cursor-pointer"
            >
              <DocumentTextIcon className="w-3.5 h-3.5" />
              <span>Lihat Invoice</span>
            </button>
            <button
              onClick={() =>
                openInvoicePrintTab({
                  ...order,
                  items,
                  dpNominal,
                  dpPct,
                  pelunasanNominal,
                  recipientName: buyerName,
                  recipientPhone: order?.phone || '',
                  recipientAddress: buyerAddress
                }, adminBankAccounts)
              }
              className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <PrinterIcon className="w-3.5 h-3.5" />
              <span>Cetak Invoice</span>
            </button>
          </div>
        </div>

        {/* Right Col: Stepper & Payment Stages (Matches Screenshot 2 & 5) */}
        <div className="space-y-4 text-xs text-stone-700">
          
          {/* Status Step 1 */}
          <div className="flex items-center gap-1.5 font-bold text-emerald-700">
            <span>Pesanan Dibuat</span>
            <CheckIcon className="w-4 h-4 text-emerald-600" />
          </div>

          {/* Biaya Platform */}
          <div className="space-y-0.5">
            <p className="text-[11px] text-stone-500 font-medium">Biaya Platform</p>
            <p className="font-bold text-stone-900">Rp 0</p>
          </div>

          {/* Metode Pengiriman (Tanpa Jumlah Ongkir Tetap Sesuai Arahan) */}
          <div className="space-y-1">
            <p className="text-[11px] text-stone-500 font-medium">Metode Pengiriman</p>
            <p className="text-[11px] text-sky-600 font-medium">
              Estimasi Total Berat Produk: <strong>{(totalQty * 0.3).toFixed(1)} Kg</strong>
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-stone-800 font-semibold">{selectedCourier}</p>
                <p className="text-[11px] text-amber-700 font-semibold italic">
                  (Ongkos kirim di-update Admin setelah penimbangan)
                </p>
              </div>
              <button
                onClick={() => setIsCourierModalOpen(true)}
                className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition cursor-pointer"
              >
                Pilih Jasa Pengiriman
              </button>
            </div>
          </div>

          {/* DP Termin Card */}
          <div className="pt-2 border-t border-stone-100 flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-stone-800">Dp {summaryTitle}</p>
                {localPayments.dp?.status === 'Lunas' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckIcon className="w-3 h-3" /> Lunas / Terverifikasi
                  </span>
                ) : localPayments.dp ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Menunggu ACC Admin
                  </span>
                ) : null}
              </div>
              <p className="text-[#2563EB] font-bold text-xs mt-0.5">
                Rp {dpNominal.toLocaleString('id-ID')} ({dpPct}%)
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">Bayar sebelum {dpDue}</p>
            </div>
            {localPayments.dp ? (
              <button
                onClick={() => setPreviewProof(localPayments.dp)}
                className="bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-[10px] px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Lihat Bukti Transfer"
              >
                <EyeIcon className="w-3.5 h-3.5 text-[#6B1416]" />
                <span>Lihat Bukti</span>
              </button>
            ) : (
              <button
                onClick={() =>
                  handleOpenProof(
                    `DP ${summaryTitle} (${dpPct}%)`,
                    dpNominal
                  )
                }
                className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
              >
                Upload Bukti Pembayaran
              </button>
            )}
          </div>

          {/* Pelunasan Termin Card */}
          <div className="pt-2 border-t border-stone-100 flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-stone-800">Pelunasan {summaryTitle}</p>
                {localPayments.pelunasan?.status === 'Lunas' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckIcon className="w-3 h-3" /> Lunas / Terverifikasi
                  </span>
                ) : localPayments.pelunasan ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Menunggu ACC Admin
                  </span>
                ) : null}
              </div>
              <p className="text-[#2563EB] font-bold text-xs mt-0.5">
                Rp {pelunasanNominal.toLocaleString('id-ID')} ({pelunasanPct}%)
              </p>
              <p className="text-[10px] text-stone-500 mt-0.5">Bayar sebelum {pelunasanDue}</p>
            </div>
            {localPayments.pelunasan ? (
              <button
                onClick={() => setPreviewProof(localPayments.pelunasan)}
                className="bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-[10px] px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="Lihat Bukti Transfer"
              >
                <EyeIcon className="w-3.5 h-3.5 text-[#6B1416]" />
                <span>Lihat Bukti</span>
              </button>
            ) : (
              <button
                onClick={() =>
                  handleOpenProof(
                    `Pelunasan ${summaryTitle} (${pelunasanPct}%)`,
                    pelunasanNominal
                  )
                }
                className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
              >
                Upload Bukti Pembayaran
              </button>
            )}
          </div>

          {/* Final steps */}
          <div className="pt-2 text-stone-400 space-y-1">
            <p>Pesanan Dikirim</p>
            <p>Pesanan Selesai</p>
          </div>

        </div>

      </div>

      {/* Product List Card (Matches Screenshot 2 & 5) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-6">
        
        {/* Store Title Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-stone-900 text-white flex items-center justify-center font-bold text-[10px]">
              AS
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-stone-800 tracking-wide">
              afatharshop
            </h4>
          </div>

          {/* Status Batch PO Badge */}
          {isClosedPO ? (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              PO Telah Ditutup (Terkunci untuk Pabrik)
            </span>
          ) : (
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              PO Aktif Terbuka
            </span>
          )}
        </div>

        {/* Product Table Header */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-bold bg-stone-50/50">
                <th className="py-2.5 px-3">Produk</th>
                <th className="py-2.5 px-3 text-center">Alokasi Alamat</th>
                <th className="py-2.5 px-3 text-right">Harga</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item) => {
                const allocated = (item.splits || []).reduce((s, sp) => s + (Number(sp.qty) || 0), 0);
                const addon = Number(item.addon) || 0;
                return (
                <tr key={item.id} className="hover:bg-stone-50/50 transition">
                  {/* Product Info */}
                  <td className="py-4 px-3">
                    <div className="flex gap-3">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-14 h-16 rounded-xl object-cover shrink-0 border border-stone-200"
                      />
                      <div className="space-y-0.5">
                        <h5 className="font-bold text-stone-900 leading-snug">{item.title}</h5>
                        <p className="text-[11px] text-stone-600 font-medium">{item.variant}</p>
                        <p className="text-[10px] text-stone-400">📅 Jatuh tempo: {item.dueDate}</p>
                        {addon > 0 && (
                          <p className="text-[10px] font-semibold text-amber-700">
                            + Tambahan Rp {addon.toLocaleString('id-ID')}/pcs (di luar diskon)
                          </p>
                        )}
                        <p className="text-[11px] font-bold text-[#6B1416]">
                          Sub total: Rp {item.subtotal.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Qty Badge */}
                  <td className="py-4 px-3 text-center">
                    {allocated > 0 ? (
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          allocated >= (Number(item.qty) || 1)
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {allocated}/{item.qty} pcs dialokasikan
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600">
                        Belum dibagi ({item.qty} pcs)
                      </span>
                    )}
                    {item.splits && item.splits.length > 0 && (
                      <p className="text-[10px] text-sky-600 font-bold mt-1">
                        ✓ {item.splits.length} alamat aktif
                      </p>
                    )}
                  </td>

                  {/* Price */}
                  <td className="py-4 px-3 text-right">
                    <p className="font-bold text-stone-900">Rp {item.price.toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-stone-400">
                      {addon > 0
                        ? `Mitra: Rp ${item.price.toLocaleString('id-ID')} + Rp ${addon.toLocaleString('id-ID')}`
                        : 'Normal'}
                    </p>
                  </td>

                  {/* Action Buttons: Edit, Atur Alamat, Hapus */}
                  <td className="py-4 px-3 text-right">
                    {!isClosedPO ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsAddModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 border border-sky-300 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <PencilIcon className="w-3 h-3 text-sky-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setDeleteTargetItem(item)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-300 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <TrashIcon className="w-3 h-3 text-rose-500" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-stone-400 italic">
                        Terkunci (Close PO)
                      </span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* BOTTOM ACTION BUTTONS: USER CORE REQUIREMENT:
            "mitra dapat tambah produk, hapus, edit sebelum close PO. Jika sudah close po, tombol tambah produk hilang."
        */}
        <div className="pt-2">
          {!isClosedPO ? (
            <div className="flex flex-wrap items-center gap-3">
              {/* Tambah Produk Button (Grey border button) */}
              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
              >
                + Tambah Produk
              </button>

              {/* Tambah Alamat Penerima Button (Blue border button) */}
              <button
                onClick={() => setIsAddressPickerOpen(true)}
                className="px-4 py-2 border border-sky-400 hover:bg-sky-50 text-sky-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <MapPinIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>+ Tambah Alamat Penerima</span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-500 flex items-center justify-between">
              <span>⚠️ <strong>PO Sudah Ditutup:</strong> Tombol tambah produk disembunyikan. Jumlah pesanan telah dikunci untuk proses produksi pabrik.</span>
            </div>
          )}
        </div>

      </div>

      {/* Alamat Lain Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-stone-200/80 space-y-4">
        
        {/* Header Address */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#2563EB] font-bold flex items-center gap-1.5">
                <MapPinIcon className="w-4 h-4 text-[#2563EB]" />
                <span className="text-sm">Alamat Lain</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold text-[10px]">
                {addressGroups.length} Alamat
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Alamat Pengiriman Utama: <strong className="text-stone-700">{buyerName}</strong> &mdash; {buyerAddress}
            </p>
          </div>

          {!isClosedPO && (
            <button
              onClick={() => setIsAddressPickerOpen(true)}
              className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <MapPinIcon className="w-3.5 h-3.5 text-white" />
              <span>+ Tambah Alamat Penerima</span>
            </button>
          )}
        </div>

        {/* Daftar alamat tambahan */}
        {addressGroups.length === 0 ? (
          <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 text-center space-y-1">
            <p className="font-bold text-stone-700 text-xs">Belum ada alamat tambahan</p>
            <p className="text-[11px] text-stone-400">
              Klik &ldquo;Tambah Alamat Penerima&rdquo; lalu pilih produk yang dikirim ke alamat tersebut.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {addressGroups.map((group) => (
              <div
                key={group.address?.id ?? group.address?.recipient}
                className="border border-stone-200 rounded-2xl overflow-hidden"
              >
                {/* Address header */}
                <div className="p-3.5 bg-sky-50/70 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <MapPinIcon className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-900">
                        {group.address?.recipient || group.address?.name || 'Penerima'}
                      </p>
                      <p className="text-[10px] text-stone-600 leading-snug line-clamp-2">
                        {group.address?.address}
                      </p>
                      <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                        {group.address?.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {group.courier?.name ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                        <TruckIcon className="w-3 h-3" />
                        {group.courier.name}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">
                        Belum ada jasa kirim
                      </span>
                    )}
                    {!isClosedPO && (
                      <>
                        {group.rows.length === 0 && (
                          <button
                            onClick={() => handleRemoveAddress(group.address)}
                            className="text-[11px] font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-lg cursor-pointer"
                          >
                            Hapus Alamat
                          </button>
                        )}
                        <button
                          onClick={() => openCourierFor(group.address, group.courier)}
                          className="border border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold text-[11px] px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          <TruckIcon className="w-3 h-3" />
                          {group.courier?.name ? 'Ubah Jasa Kirim' : 'Pilih Jasa Kirim'}
                        </button>
                        <button
                          onClick={() => openAllocationFor(group.address)}
                          className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          Pilih Produk
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Products assigned to this address */}
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 font-bold text-[10px] border-b border-stone-200">
                      <th className="px-3 py-2">Produk</th>
                      <th className="px-3 py-2 text-center w-16">Qty</th>
                      <th className="px-3 py-2 text-right w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {group.rows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-stone-400 italic">
                          Belum ada produk. Klik &ldquo;Pilih Produk&rdquo; untuk mengatur produk ke alamat ini.
                        </td>
                      </tr>
                    ) : (
                      group.rows.map(({ item, split }) => (
                        <tr key={split.id}>
                          <td className="px-3 py-2">
                            <p className="font-semibold text-stone-800">{item.title}</p>
                            <p className="text-[10px] text-stone-500">{item.variant}</p>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-stone-700">
                            {split.qty}x
                          </td>
                          <td className="px-3 py-2 text-right">
                            {!isClosedPO && (
                              <button
                                onClick={() => handleRemoveSingleSplit(item.id, split.id)}
                                className="px-2 py-0.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                Hapus
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Total pesanan (jasa kirim diatur per alamat di atas) */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2 text-xs">
          <span className="text-stone-500">Total Pesanan:</span>
          <span className="font-bold text-base text-stone-900">
            Rp {totalItemsPrice.toLocaleString('id-ID')}
          </span>
        </div>

      </div>

      {/* Bottom 2 Cards: Alamat Pengiriman & Rincian Pembayaran (Matches Screenshot 2 & 5) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Card: Alamat Pengiriman */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200/80 space-y-3">
          <h4 className="font-bold text-xs sm:text-sm text-stone-800">
            Alamat Pengiriman Utama
          </h4>
          <p className="text-xs text-stone-600">
            {buyerName}
            {order?.phone ? ` (${order.phone})` : ''} &mdash; {buyerAddress}
          </p>
          <button
            onClick={() => onSelectTab?.('alamat')}
            className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Ubah Alamat Pengiriman
          </button>
        </div>

        {/* Right Card: Rincian Pembayaran (No fixed ongkir amount as requested) */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200/80 space-y-2.5 text-xs text-stone-700">
          <h4 className="font-bold text-xs sm:text-sm text-stone-800 mb-1">
            Rincian Pembayaran
          </h4>
          <div className="flex justify-between">
            <span className="text-stone-500">Total harga produk</span>
            <span className="font-semibold text-stone-800">Rp {totalItemsPrice.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Biaya Platform</span>
            <span className="font-semibold text-stone-800">Rp 0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-500">Ongkos kirim</span>
            <span className="font-semibold text-amber-700 text-[11px]">
              Dihitung setelah penimbangan koli di gudang
            </span>
          </div>
          <div className="pt-2 border-t border-stone-200 flex justify-between items-center">
            <span className="font-bold text-stone-900">Total Tagihan Produk</span>
            <span className="font-extrabold text-base text-stone-900">
              Rp {totalItemsPrice.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

      </div>

      {/* MODAL 1: Tambah / Edit Produk (Image 4) */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveProduct}
        initialData={editingItem}
      />

      {/* MODAL 2: Hapus Konfirmasi (Image 3) */}
      <DeleteConfirmModal
        isOpen={!!deleteTargetItem}
        onClose={() => setDeleteTargetItem(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus produk dari pesanan ini?"
        message={`Apakah Anda yakin ingin menghapus "${deleteTargetItem?.variant || ''}" dari pesanan ini sebelum PO ditutup?`}
      />

      {/* MODAL 3: Pilih Produk per Alamat */}
      <SplitAddressModal
        isOpen={isSplitModalOpen}
        address={allocationAddress}
        items={items}
        onClose={() => {
          setIsSplitModalOpen(false);
          setAllocationAddress(null);
        }}
        onSave={handleSaveAllocations}
      />

      {/* MODAL 3b: Pilih Alamat Penerima */}
      {isAddressPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[88vh] overflow-y-auto shadow-2xl border border-stone-200 animate-in zoom-in-95">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-stone-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-[#6B1416]" />
                <h4 className="font-bold text-sm text-stone-900">Tambah Alamat Penerima</h4>
              </div>
              <button
                onClick={() => setIsAddressPickerOpen(false)}
                className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-2">
              <p className="text-[11px] text-stone-500 mb-3">
                Pilih alamat dari buku alamat, lalu atur produk yang dikirim ke alamat tersebut.
              </p>
              {MITRA_ADDRESS_BOOK.filter(
                (addr) =>
                  String(addr.id) !== '1' &&
                  !addressGroups.some((g) => String(g.address?.id) === String(addr.id))
              ).map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => handlePickAddress(addr)}
                  className="w-full text-left p-3 rounded-2xl border border-stone-200 hover:border-sky-400 hover:bg-sky-50/50 transition cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-900">{addr.recipient}</span>
                    <span className="text-[10px] text-stone-500 font-mono">{addr.phone}</span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-snug line-clamp-2">
                    {addr.address}
                  </p>
                  <p className="text-[10px] text-sky-700 font-semibold">
                    {addr.city}{addr.subdistrict ? ` — ${addr.subdistrict}` : ''}
                  </p>
                </button>
              ))}
              {MITRA_ADDRESS_BOOK.filter(
                (addr) =>
                  String(addr.id) !== '1' &&
                  !addressGroups.some((g) => String(g.address?.id) === String(addr.id))
              ).length === 0 && (
                <p className="text-[11px] text-stone-400 italic text-center py-6">
                  Semua alamat pada buku alamat sudah ditambahkan.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3c: Pilih Jasa Kirim per Alamat */}
      {courierTargetAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-2 border-b border-stone-100">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Pilih Jasa Kirim</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Alamat: <strong className="text-stone-700">{courierTargetAddress.recipient || courierTargetAddress.name}</strong> — {courierTargetAddress.city}
                </p>
              </div>
              <button
                onClick={() => setCourierTargetAddress(null)}
                className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center cursor-pointer shrink-0"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Ekspedisi khusus untuk kiriman ke alamat ini. Nominal ongkir dihitung dan di-update oleh Admin:
            </p>

            <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
              {[
                'JNE JNE Trucking (Cargo)',
                'JNE Reguler',
                'JNE Yakin Esok Sampai (YES)',
                'Pos Indonesia Pos Reguler',
                'J&T EZ / Cargo',
                'SiCepat Cargo / Gokil'
              ].map((courierName) => (
                <label
                  key={courierName}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                    courierChoice === courierName
                      ? 'bg-emerald-50/60 border-emerald-600 ring-1 ring-emerald-600'
                      : 'bg-white border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="addressCourierOption"
                      value={courierName}
                      checked={courierChoice === courierName}
                      onChange={() => setCourierChoice(courierName)}
                      className="text-emerald-600 focus:ring-emerald-600"
                    />
                    <span className="font-bold text-stone-800">{courierName}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 italic">(Tarif di-update Admin)</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCourierTargetAddress(null)}
                className="px-4 py-2 border border-stone-300 rounded-xl text-stone-600 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAddressCourier}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Simpan Jasa Kirim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Pilih Jasa Ekspedisi (Without Price) */}
      {isCourierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h4 className="font-bold text-stone-900 text-sm">Pilih Jasa Ekspedisi</h4>
              <button
                onClick={() => setIsCourierModalOpen(false)}
                className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Pilihan ekspedisi logistik yang disediakan distributor. Nominal ongkir akan dihitung dan di-update oleh Admin:
            </p>

            <div className="space-y-2 text-xs">
              {[
                'JNE JNE Trucking (Cargo)',
                'JNE Reguler',
                'JNE Yakin Esok Sampai (YES)',
                'Pos Indonesia Pos Reguler',
                'J&T EZ / Cargo',
                'SiCepat Cargo / Gokil'
              ].map((courierName) => (
                <label
                  key={courierName}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                    selectedCourier === courierName
                      ? 'bg-rose-50/50 border-[#6B1416] ring-1 ring-[#6B1416]'
                      : 'bg-white border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="courierOption"
                      value={courierName}
                      checked={selectedCourier === courierName}
                      onChange={() => setSelectedCourier(courierName)}
                      className="text-[#6B1416] focus:ring-[#6B1416]"
                    />
                    <span className="font-bold text-stone-800">{courierName}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 italic">(Tarif di-update Admin)</span>
                </label>
              ))}
            </div>

            <button
              onClick={() => {
                setIsCourierModalOpen(false);
                onUpdateOrder?.({
                  ekspedisi: selectedCourier,
                  invoice: orderInvoice || order?.orderNo || order?.id
                });
              }}
              className="w-full bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              Simpan Ekspedisi
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: Info Pembayaran! & Upload Bukti Transfer (Exact match to media_1793006147406_f14fdfd9.png) */}
      {isUploadProofOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 animate-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
            
            {uploadSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckIcon className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-stone-900">Bukti Transfer Berhasil Diunggah!</h4>
                <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">
                  Data pembayaran telah dikirim ke Admin Finance Afathar Shop untuk validasi mutasi rekening.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsUploadProofOpen(false);
                      setUploadSuccess(false);
                    }}
                    className="bg-black hover:bg-stone-800 text-white text-xs font-bold px-6 py-2 rounded-md transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* 1. TOP CARD: Info Pembayaran! (Red Border Card from Mockup) */}
                <div className="border border-red-300 rounded-xl p-4 bg-white shadow-xs space-y-2.5">
                  <h4 className="text-red-500 font-bold text-sm tracking-tight">
                    Info Pembayaran!
                  </h4>

                  {/* Atas Nama */}
                  <p className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                    <span>💳 Atas Nama Erna Susiyanti</span>
                  </p>

                  {/* Rekening Mandiri, BCA, BRI */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-stone-800 gap-y-1">
                    <div className="flex items-center gap-1.5">
                      <span>MANDIRI : <strong className="font-mono">1234567890123</strong></span>
                      <button
                        type="button"
                        onClick={() => handleCopyRekening('1234567890123', 'MANDIRI')}
                        title="Salin No Rekening Mandiri"
                        className="text-stone-400 hover:text-stone-800 p-0.5 rounded cursor-pointer transition"
                      >
                        <CopyIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span>BCA : <strong className="font-mono">87654321</strong></span>
                      <button
                        type="button"
                        onClick={() => handleCopyRekening('87654321', 'BCA')}
                        title="Salin No Rekening BCA"
                        className="text-stone-400 hover:text-stone-800 p-0.5 rounded cursor-pointer transition"
                      >
                        <CopyIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-stone-800">
                    <span>BRI : <strong className="font-mono">987654312156</strong></span>
                    <button
                      type="button"
                      onClick={() => handleCopyRekening('987654312156', 'BRI')}
                      title="Salin No Rekening BRI"
                      className="text-stone-400 hover:text-stone-800 p-0.5 rounded cursor-pointer transition"
                    >
                      <CopyIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {copyFeedback && (
                    <div className="p-1.5 bg-emerald-50 rounded text-[11px] text-emerald-700 font-semibold animate-in fade-in">
                      ✓ {copyFeedback}
                    </div>
                  )}

                  {/* Rincian Tagihan */}
                  <div className="pt-2 border-t border-red-100">
                    <p className="text-xs font-semibold text-stone-700 mb-1.5 flex items-center gap-1">
                      <span>📋 Rincian Tagihan</span>
                    </p>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-stone-600">Total Pesanan :</span>
                        <span className="font-bold text-stone-900">
                          Rp {totalItemsPrice.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-600">Nominal Terbayar :</span>
                        <span className="font-bold text-stone-900">Rp 0</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-600">Total Tagihan :</span>
                        <span className="font-bold text-stone-900">
                          Rp {(parseInt(proofAmount, 10) || totalItemsPrice).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-600">Sisa Pembayaran :</span>
                        <span className="font-bold text-stone-900">
                          Rp {totalItemsPrice.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Sisa Deposit & Top Up Button */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-red-100 text-xs">
                      <span className="text-emerald-600 font-bold">Sisa Deposit : Rp 0</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsUploadProofOpen(false);
                          if (onSelectTab) onSelectTab('deposit');
                        }}
                        className="bg-black hover:bg-stone-800 text-white text-[11px] font-bold px-3 py-0.5 rounded cursor-pointer transition shadow-2xs"
                      >
                        Top Up
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. FORM: Upload Bukti, Jumlah Bayar, Bank Tujuan, Catatan */}
                <form onSubmit={handleUploadProofSubmit} className="space-y-3.5 text-xs text-stone-700">
                  
                  {/* Bukti Transfer Box (Large dropzone matching mockup) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-800">
                      Bukti Transfer :
                    </label>
                    <div
                      onClick={() => proofFileRef.current?.click()}
                      className="border border-stone-300 rounded-lg p-6 sm:p-7 flex flex-col items-center justify-center bg-white hover:bg-stone-50 cursor-pointer transition"
                    >
                      {proofImage ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={proofImage}
                            alt="Bukti Transfer"
                            className="w-14 h-14 object-cover rounded-md border border-stone-200"
                          />
                          <div className="text-left">
                            <p className="font-semibold text-stone-800 text-xs truncate max-w-[220px]">
                              {proofFileName || 'bukti_transfer.jpg'}
                            </p>
                            <p className="text-[11px] text-stone-400 mt-0.5">
                              Klik untuk mengganti foto
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2">
                          <span className="px-4 py-1.5 bg-white border border-stone-300 rounded text-xs text-stone-700 font-medium hover:bg-stone-100 shadow-2xs pointer-events-none">
                            Pilih File
                          </span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={proofFileRef}
                      onChange={handleProofImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {/* Jumlah Bayar */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-800">
                      Jumlah Bayar :
                    </label>
                    <input
                      type="number"
                      value={proofAmount}
                      onChange={(e) => setProofAmount(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-md px-3 py-2 text-stone-800 font-semibold text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Bank Tujuan (Blue outline matching mockup) */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-800">
                      Bank Tujuan :
                    </label>
                    <select
                      value={proofBank}
                      onChange={(e) => setProofBank(e.target.value)}
                      className="w-full bg-white border border-blue-400 focus:ring-2 focus:ring-blue-300 rounded-md px-3 py-2 text-stone-700 font-medium text-xs outline-none cursor-pointer"
                      required
                    >
                      <option value="">-- Pilih Bank --</option>
                      {bankAccountsList.map((b) => (
                        <option key={b.id} value={`${b.bank} : ${b.accountNo} (a.n ${b.holder})`}>
                          {b.bank} : {b.accountNo} (a.n {b.holder})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Catatan */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-stone-800">
                      Catatan :
                    </label>
                    <input
                      type="text"
                      value={proofNote}
                      onChange={(e) => setProofNote(e.target.value)}
                      placeholder="Catatan pembayaran (opsional)"
                      className="w-full bg-white border border-stone-300 rounded-md px-3 py-2 text-stone-800 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Buttons: Upload (Black) and Close (Slate Grey) */}
                  <div className="flex justify-end items-center gap-2 pt-3">
                    <button
                      type="submit"
                      className="bg-black hover:bg-stone-800 text-white font-bold px-5 py-2 rounded-md text-xs transition cursor-pointer shadow-xs"
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploadProofOpen(false);
                        setUploadSuccess(false);
                      }}
                      className="bg-[#64748B] hover:bg-[#475569] text-white font-bold px-5 py-2 rounded-md text-xs transition cursor-pointer shadow-xs"
                    >
                      Close
                    </button>
                  </div>
                </form>

              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL PREVIEW BUKTI TRANSFER */}
      {previewProof && (
        <div
          onClick={() => setPreviewProof(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    previewProof.status === 'Lunas' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <h3 className="font-bold text-sm text-stone-900">
                  {previewProof.status === 'Lunas'
                    ? 'Bukti Transfer Valid (ACC Admin)'
                    : 'Bukti Transfer Terkirim'}
                </h3>
              </div>
              <button
                onClick={() => setPreviewProof(null)}
                className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center cursor-pointer transition font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="w-full h-56 bg-stone-100 rounded-xl overflow-hidden border border-stone-200 flex items-center justify-center">
                {previewProof.image ? (
                  <img
                    src={previewProof.image}
                    alt="Bukti Transfer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-stone-400">Tidak ada gambar</span>
                )}
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500">Termin:</span>
                  <span className="font-bold text-stone-800">{previewProof.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Nominal:</span>
                  <span className="font-bold text-[#6B1416]">
                    Rp {Number(previewProof.nominal || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Bank Tujuan:</span>
                  <span className="text-stone-700">
                    {previewProof.bank || 'BCA (Afathar Niaga Indonesia)'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-stone-200/60">
                  <span className="text-stone-500">Status Validasi:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                      previewProof.status === 'Lunas'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {previewProof.status === 'Lunas'
                      ? '✓ Disetujui Admin Finance'
                      : '⏳ Menunggu ACC Admin'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setPreviewProof(null)}
              className="w-full py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Tutup Preview Bukti
            </button>
          </div>
        </div>
      )}

      {/* MODAL 6: Official Printable Invoice (Matches media_1793008189307_59e1977d.png) */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        order={{
          ...order,
          items,
          dpNominal,
          dpPct,
          pelunasanNominal,
          recipientName: buyerName,
          recipientPhone: order?.phone || '',
          recipientAddress: buyerAddress
        }}
        bankAccounts={adminBankAccounts}
      />

    </div>
  );
}
