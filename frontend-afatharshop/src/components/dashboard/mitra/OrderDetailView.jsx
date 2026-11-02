import React, { useState, useRef, useEffect, useMemo } from 'react';
import AddProductModal from './AddProductModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import SplitAddressModal from './SplitAddressModal';
import InvoiceModal from '../../InvoiceModal';
import { openInvoicePrintTab } from '../../../utils/printInvoice';
import { getStoredAddresses, syncAddressBookFromApi } from './mitraAddressBook';
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
  EyeIcon,
  AlertTriangleIcon,
  ClockIcon,
  InfoIcon,
  WalletIcon,
  CreditCardIcon
} from '../../Icons';

export default function OrderDetailView({
  order,
  onBack,
  onSelectTab,
  onUploadPayment,
  onPayWithDeposit,
  currentUser,
  isClosedPOProp,
  adminBankAccounts = [],
  adminCouriers = [],
  orderInvoice,
  onUpdateOrder
}) {
  // PO open/close status is strictly determined by Admin (not toggleable by Mitra)
  const statusStr = String(order?.status || '').toLowerCase();
  const isStatusClosed =
    statusStr.includes('siap kirim') ||
    statusStr.includes('dikirim') ||
    statusStr.includes('selesai') ||
    statusStr.includes('batal') ||
    statusStr.includes('closed') ||
    statusStr.includes('ditutup');

  const isClosedPO =
    typeof isClosedPOProp === 'boolean'
      ? isClosedPOProp || isStatusClosed
      : (order?.isClosedPO ?? isStatusClosed);

  const userBalance = Number(String(currentUser?.balance || '').replace(/[^0-9]/g, '')) || 0;
  const userBalanceFormatted = currentUser?.balance || 'Rp 0';

  const isPendingAcc =
    order?.marketingStatus === 'PENDING' ||
    order?.stage === 'baru' ||
    String(order?.status || '').toLowerCase().includes('menunggu acc');

  // Dynamic products list inside this order
  const [items, setItems] = useState(order?.items || []);

  // Ekspedisi selection (without hardcoded price)
  const [selectedCourier, setSelectedCourier] = useState(order?.courier || '');
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);

  // Bank accounts updated by Admin Finance
  const bankAccountsList =
    adminBankAccounts && adminBankAccounts.length > 0
      ? adminBankAccounts
          .filter((b) => b.active !== false)
          .map((b) => ({
            id: b.backendId ?? b.id,
            name: `${b.bank}: ${b.accountNo} a.n ${b.holder}`,
            bank: b.bank,
            accountNo: b.accountNo,
            holder: b.holder
          }))
      : [];

  // Master ekspedisi updated dynamically by Admin Marketing / Finance
  const availableCouriers = useMemo(() => {
    if (adminCouriers && adminCouriers.length > 0) {
      const activeList = adminCouriers.filter((c) => c.active !== false);
      if (activeList.length > 0) return activeList.map((c) => c.name);
    }
    return [
      'JNE Trucking (JTR)',
      'J&T Cargo',
      'Dakota Cargo',
      'SiCepat Cargo / Gokil',
      'Pos Indonesia Pos Reguler'
    ];
  }, [adminCouriers]);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTargetItem, setDeleteTargetItem] = useState(null);
  const [allocationAddress, setAllocationAddress] = useState(null);
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false);
  const [addressBook, setAddressBook] = useState(() => getStoredAddresses());

  useEffect(() => {
    if (!isAddressPickerOpen) return;
    let active = true;
    syncAddressBookFromApi().then((rows) => {
      if (active && Array.isArray(rows)) setAddressBook(rows);
    });
    return () => {
      active = false;
    };
  }, [isAddressPickerOpen]);
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
        senderName: base.senderName || currentUser?.name || 'Afathar Shop',
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
    setCourierChoice(currentCourier?.name || availableCouriers[0] || 'JNE Trucking (JTR)');
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
  const [payMethod, setPayMethod] = useState('deposit');
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

  // Helper untuk membaca bukti dan status pembayaran dari objek order
  const buildPaymentsFromOrder = (ord) => {
    const map = {};
    if (!ord) return map;

    // Check DP
    const isDpAcc =
      ord.dpStatus === 'ACC' ||
      ord.dpStatus === 'Lunas' ||
      ord.status === 'Selesai' ||
      (typeof ord.paymentStatus === 'string' && ord.paymentStatus.includes('Lunas'));
    const isDpMenunggu =
      ord.dpStatus === 'Menunggu Verifikasi' ||
      ord.dpStatus === 'Menunggu Validasi' ||
      ord.dpStatus === 'menunggu';
    const hasDpProof = !!ord.dpProof;

    if (hasDpProof || isDpAcc || isDpMenunggu) {
      map.dp = {
        title: 'DP',
        nominal: Number(ord.dpNominal) || 0,
        bank: ord.dpBank || 'BCA (PT Afathar Niaga Indonesia)',
        status: isDpAcc ? 'Lunas' : 'Menunggu Validasi',
        image: ord.dpProof || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
        date: ord.dpSubmittedAt || ord.date || '27 Okt 2026',
        note: ord.dpNote || ''
      };
    }

    // Check Pelunasan
    const isPelunasanAcc =
      ord.pelunasanStatus === 'ACC' ||
      ord.pelunasanStatus === 'Lunas' ||
      ord.status === 'Selesai';
    const isPelunasanMenunggu =
      ord.pelunasanStatus === 'Menunggu Verifikasi' ||
      ord.pelunasanStatus === 'Menunggu Validasi' ||
      ord.pelunasanStatus === 'menunggu';
    const hasPelunasanProof = !!ord.pelunasanProof;

    if (hasPelunasanProof || isPelunasanAcc || isPelunasanMenunggu) {
      map.pelunasan = {
        title: 'Pelunasan',
        nominal: Number(ord.pelunasanNominal) || 0,
        bank: ord.pelunasanBank || 'BCA (PT Afathar Niaga Indonesia)',
        status: isPelunasanAcc ? 'Lunas' : 'Menunggu Validasi',
        image: ord.pelunasanProof || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
        date: ord.pelunasanSubmittedAt || ord.date || '27 Okt 2026',
        note: ord.pelunasanNote || ''
      };
    }

    return map;
  };

  // Status pembayaran termin lokal (DP, Pelunasan, Ongkir)
  const [localPayments, setLocalPayments] = useState(() => buildPaymentsFromOrder(order));

  // Sinkronkan status pembayaran & bukti saat props order diupdate dari parent/Admin
  useEffect(() => {
    setLocalPayments((prev) => {
      const fromOrder = buildPaymentsFromOrder(order);
      return { ...fromOrder, ...prev };
    });
  }, [
    order?.dpStatus,
    order?.dpProof,
    order?.pelunasanStatus,
    order?.pelunasanProof,
    order?.status,
    order?.orderNo,
    order?.id
  ]);

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
  const buyerName = String(order?.mitraName || currentUser?.name || 'Mitra').split(' (')[0];
  const buyerAddress =
    order?.address || order?.alamat || '-';
  const dpDue =
    order?.dpDueDate ||
    (order?.closeDate && order.closeDate !== '-' ? order.closeDate : '27 Oktober 2026');
  const pelunasanDue =
    order?.pelunasanDueDate || items[0]?.dueDate || '10 Januari 2027';

  // Sinkronisasi status ACC DP dan Pelunasan untuk perhitungan rincian tagihan
  const isDpAcc =
    order?.dpStatus === 'ACC' ||
    order?.dpStatus === 'Lunas' ||
    localPayments?.dp?.status === 'Lunas';
  const isPelunasanAcc =
    order?.pelunasanStatus === 'ACC' ||
    order?.pelunasanStatus === 'Lunas' ||
    localPayments?.pelunasan?.status === 'Lunas';

  const dpPaid = isDpAcc ? (Number(localPayments?.dp?.nominal) || dpNominal) : 0;
  const pelunasanPaid = isPelunasanAcc ? (Number(localPayments?.pelunasan?.nominal) || pelunasanNominal) : 0;
  const nominalTerbayar = dpPaid + pelunasanPaid;
  const sisaPembayaran = Math.max(0, totalItemsPrice - nominalTerbayar);
  const totalTagihanTahap =
    parseInt(proofAmount, 10) ||
    ((proofTitle || '').toLowerCase().includes('pelunasan') ? pelunasanNominal : dpNominal) ||
    sisaPembayaran;

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
    setProofBank(bankAccountsList[0]?.name || '');
    setPayMethod('deposit');
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

  const handlePayWithDepositSubmit = () => {
    const amountToPay = parseInt(proofAmount || '0', 10) || totalTagihanTahap;
    if (userBalance < amountToPay) {
      alert(`Saldo deposit Anda (${userBalanceFormatted}) tidak mencukupi untuk tagihan ini (Rp ${amountToPay.toLocaleString('id-ID')}).`);
      return;
    }
    const orderNum = order?.orderNo || order?.invoice || orderInvoice || order?.id || 'PO-ORDER';
    const isDp = (proofTitle || '').toLowerCase().includes('dp');
    const todayDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    if (onPayWithDeposit) {
      onPayWithDeposit({
        orderNo: orderNum,
        billTitle: proofTitle || (isDp ? 'DP PO' : 'Pelunasan PO'),
        amount: amountToPay,
        billType: isDp ? 'dp' : 'pelunasan'
      });
    }

    setLocalPayments((prev) => ({
      ...prev,
      [isDp ? 'dp' : 'pelunasan']: {
        title: isDp ? 'DP' : 'Pelunasan',
        nominal: amountToPay,
        bank: 'Saldo Deposit Mitra',
        status: 'Lunas',
        date: todayDate,
        note: 'Lunas via Saldo Deposit'
      }
    }));

    if (onUpdateOrder) {
      onUpdateOrder({
        ...(isDp
          ? { dpStatus: 'ACC', dpBank: 'Saldo Deposit Mitra', dpNote: 'Lunas via Saldo Deposit' }
          : { pelunasanStatus: 'ACC', pelunasanBank: 'Saldo Deposit Mitra', pelunasanNote: 'Lunas via Saldo Deposit' })
      });
    }

    setUploadSuccess(true);
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
        orderNo: order?.orderNo || order?.invoice || (order?.id ? String(order.id) : '-'),
        mitraName: currentUser?.name || buyerName || 'Mitra',
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
    const paymentEntry = {
      title: proofTitle || (key === 'dp' ? 'DP' : 'Pelunasan'),
      nominal: parseInt(proofAmount || '0', 10),
      bank: proofBank,
      note: proofNote,
      image: proofImage,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Menunggu Validasi'
    };

    setLocalPayments((prev) => ({
      ...prev,
      [key]: paymentEntry
    }));

    if (onUpdateOrder) {
      if (key === 'dp') {
        onUpdateOrder({
          dpProof: proofImage,
          dpStatus: 'Menunggu Verifikasi',
          dpBank: proofBank,
          dpNote: proofNote,
          dpNominal: parseInt(proofAmount || '0', 10)
        });
      } else {
        onUpdateOrder({
          pelunasanProof: proofImage,
          pelunasanStatus: 'Menunggu Verifikasi',
          pelunasanBank: proofBank,
          pelunasanNote: proofNote,
          pelunasanNominal: parseInt(proofAmount || '0', 10)
        });
      }
    }

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
              {order?.orderNo || order?.invoice || (order?.id ? String(order.id) : '-')}
            </h3>
          </div>

          <div>
            <p className="text-[11px] text-stone-500 font-medium">Tanggal Pembelian</p>
            <p className="text-xs font-semibold text-stone-800 mt-0.5">
              {order?.date || new Date().toLocaleDateString('id-ID')}
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

          {isPendingAcc && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800 flex items-start gap-2">
              <span className="text-amber-600 font-bold">⏳</span>
              <div className="leading-snug">
                <span className="font-bold">Menunggu ACC Admin:</span> Pesanan sedang diverifikasi oleh Admin Marketing. Pembayaran DP akan dibuka setelah pesanan disetujui.
              </div>
            </div>
          )}

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
            ) : isPendingAcc ? (
              <span
                className="bg-stone-100 border border-stone-200 text-stone-500 font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1 cursor-not-allowed shadow-2xs"
                title="Menunggu persetujuan Admin Marketing sebelum pembayaran DP"
              >
                <span>⏳ Menunggu ACC Admin</span>
              </span>
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
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#6B1416]/20 bg-stone-100 shrink-0 shadow-2xs">
              <img
                src="/logo.jpg"
                alt="AfatharShop Official"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/logo-nobg.png';
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm sm:text-base text-stone-900 tracking-tight">
                afatharshop
              </h4>
              <span className="text-[10px] font-semibold text-[#6B1416] bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
                Official Store
              </span>
            </div>
          </div>

          {/* Status Batch PO Badge */}
          {isClosedPO ? (
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              PO Telah Ditutup (Terkunci untuk Pabrik)
            </span>
          ) : (
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5 shadow-2xs">
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
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-200 shadow-2xs"
                      />
                      <div className="space-y-1">
                        <h5 className="font-bold text-stone-900 leading-snug text-xs sm:text-sm">{item.title}</h5>
                        <p className="text-[11px] text-stone-600 font-medium">Varian: {item.variant}</p>
                        <p className="text-[10px] text-stone-500 flex items-center gap-1">
                          <ClockIcon className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>Jatuh tempo: {item.dueDate || order?.pelunasanDueDate || order?.readyEstimate || order?.closeDate || 'Sesuai jadwal PO'}</span>
                        </p>
                        {addon > 0 && (
                          <p className="text-[10px] font-semibold text-amber-700">
                            + Tambahan Rp {addon.toLocaleString('id-ID')}/pcs (di luar diskon)
                          </p>
                        )}
                        <p className="text-xs font-bold text-[#6B1416]">
                          Sub total: Rp {item.subtotal.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Qty Badge */}
                  <td className="py-4 px-3 text-center">
                    {allocated > 0 ? (
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold ${
                          allocated >= (Number(item.qty) || 1)
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {allocated}/{item.qty} pcs dialokasikan
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                        Belum dibagi ({item.qty} pcs)
                      </span>
                    )}
                    {item.splits && item.splits.length > 0 && (
                      <p className="text-[10px] text-sky-600 font-medium mt-1">
                        ✓ {item.splits.length} alamat aktif
                      </p>
                    )}
                  </td>

                  {/* Price */}
                  <td className="py-4 px-3 text-right">
                    <p className="font-bold text-stone-900 text-xs sm:text-sm">Rp {item.price.toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-stone-400 font-medium">
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
                          className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 border border-sky-300 rounded-lg flex items-center gap-1 cursor-pointer transition"
                        >
                          <PencilIcon className="w-3 h-3 text-sky-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setDeleteTargetItem(item)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-300 rounded-lg flex items-center gap-1 cursor-pointer transition"
                        >
                          <TrashIcon className="w-3 h-3 text-rose-500" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    ) : (
                      <span className="inline-block px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-md text-[10px] font-medium text-stone-500">
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
            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-semibold text-amber-950">PO Sudah Ditutup:</strong>
                <span className="text-amber-800 ml-1">
                  Jumlah pesanan telah dikunci untuk proses produksi pabrik. Penambahan atau perubahan varian produk tidak dapat dilakukan.
                </span>
              </div>
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
                <span className="text-sm">Alamat Pengiriman Tambahan (Split Alamat)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold text-[10px]">
                {addressGroups.length} Alamat
              </span>
            </div>
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

      {/* Bottom Section: Informasi Pre-Order & Rincian Pembayaran */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left: Informasi Pengiriman & Ketentuan Pre-Order */}
        <div className="md:col-span-7 bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-stone-200/80 space-y-4 text-xs text-stone-700">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <TruckIcon className="w-4 h-4 text-[#6B1416]" />
            <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
              Informasi Pengiriman & Ketentuan Pre-Order
            </h4>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/70 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Jasa Ekspedisi Logistik</p>
              <p className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {selectedCourier || order?.courier || 'Ekspedisi Reguler / Cargo'}
              </p>
              <p className="text-[10px] text-stone-500">
                Estimasi total berat: <strong>{(totalQty * 0.3).toFixed(1)} Kg</strong>
              </p>
            </div>

            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/70 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Skema Termin PO</p>
              <p className="font-bold text-stone-800 text-xs">
                DP {dpPct}% &bull; Pelunasan {pelunasanPct}%
              </p>
              <p className="text-[10px] text-stone-500">
                {order?.paymentMethod || 'Transfer Bank / Saldo Deposit'}
              </p>
            </div>
          </div>

          <div className="bg-amber-50/70 rounded-2xl p-3.5 border border-amber-200/70 text-[11px] text-amber-900 flex items-start gap-2.5">
            <InfoIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold text-amber-950">Catatan Ongkir:</strong> Biaya ongkos kirim belum termasuk pada total tagihan di samping. Admin Finance akan menginput nominal ongkir resmi setelah paket selesai produksi, ditimbang di gudang, dan siap dikirim.
            </div>
          </div>
        </div>

        {/* Right: Rincian Pembayaran */}
        <div className="md:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-stone-200/80 space-y-3.5 text-xs text-stone-700">
          <h4 className="font-bold text-xs sm:text-sm text-stone-900 pb-2.5 border-b border-stone-100">
            Rincian Pembayaran
          </h4>
          
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-stone-500">Total harga produk ({totalQty} pcs)</span>
              <span className="font-semibold text-stone-900">Rp {totalItemsPrice.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500">Biaya Platform</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">Gratis (Rp 0)</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-stone-500">Ongkos kirim</span>
              <span className="font-semibold text-amber-700 text-right text-[11px]">
                Dihitung setelah penimbangan koli di gudang
              </span>
            </div>

            <div className="pt-2.5 border-t border-dashed border-stone-200 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-stone-600">
                <span>Termin DP ({dpPct}%)</span>
                <span className="font-semibold text-stone-800">Rp {dpNominal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Termin Pelunasan ({pelunasanPct}%)</span>
                <span className="font-semibold text-stone-800">Rp {pelunasanNominal.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
              <div>
                <p className="font-bold text-stone-900 text-xs sm:text-sm">Total Tagihan Produk</p>
                <p className="text-[10px] text-stone-400">Belum termasuk ongkir</p>
              </div>
              <span className="font-extrabold text-base sm:text-lg text-[#6B1416]">
                Rp {totalItemsPrice.toLocaleString('id-ID')}
              </span>
            </div>
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
              {addressBook.filter(
                (addr) =>
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
              {addressBook.filter(
                (addr) =>
                  !addressGroups.some((g) => String(g.address?.id) === String(addr.id))
              ).length === 0 && (
                <p className="text-[11px] text-stone-400 italic text-center py-6">
                  Belum ada alamat tersimpan di buku alamat. Tambahkan lewat menu Alamat, lalu
                  muat ulang halaman ini.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3c: Pilih Jasa Kirim per Alamat */}
      {courierTargetAddress && (
        <div
          onClick={() => setCourierTargetAddress(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 space-y-4"
          >
            <div className="flex items-start justify-between gap-3 pb-2 border-b border-stone-100">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Pilih Jasa Kirim</h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Alamat: <strong className="text-stone-700">{courierTargetAddress.recipient || courierTargetAddress.name}</strong> — {courierTargetAddress.city}
                </p>
              </div>
              <button
                type="button"
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
              {availableCouriers.map((courierName) => (
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
        <div
          onClick={() => setIsCourierModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h4 className="font-bold text-stone-900 text-sm">Pilih Jasa Ekspedisi</h4>
              <button
                type="button"
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
              {availableCouriers.map((courierName) => (
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

      {/* MODAL 5: Info Pembayaran & Upload Bukti Transfer */}
      {isUploadProofOpen && (
        <div
          onClick={() => {
            setIsUploadProofOpen(false);
            setUploadSuccess(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 animate-in zoom-in-95 max-h-[92vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-200/80 bg-stone-50/70 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
                  {proofTitle || 'Pembayaran Tagihan PO'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  No. Pesanan:{' '}
                  <span className="font-mono font-semibold text-stone-700">
                    {order?.orderNo || order?.invoice || orderInvoice || order?.id || '-'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadProofOpen(false);
                  setUploadSuccess(false);
                }}
                className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 flex items-center justify-center transition cursor-pointer"
                title="Tutup (Klik luar / Esc)"
                aria-label="Tutup"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1">
              {uploadSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckIcon className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-stone-900">Pembayaran Berhasil Diproses</h4>
                  <p className="text-xs text-stone-600 max-w-xs mx-auto leading-relaxed">
                    {payMethod === 'deposit'
                      ? 'Tagihan telah dipotong dari saldo deposit dan pesanan otomatis berstatus Lunas.'
                      : 'Data bukti transfer telah dikirim ke Admin Finance AfatharShop untuk verifikasi mutasi rekening.'}
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploadProofOpen(false);
                        setUploadSuccess(false);
                      }}
                      className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 1. Ringkasan Tagihan */}
                  <div className="bg-stone-50/80 border border-stone-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-stone-200/70">
                      <div>
                        <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                          Tagihan Tahap Ini
                        </span>
                        <span className="text-lg font-extrabold text-[#6B1416]">
                          Rp {totalTagihanTahap.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-medium text-stone-500 block">
                          Saldo Deposit Anda
                        </span>
                        <span className="text-xs font-bold text-emerald-700 font-mono">
                          {userBalanceFormatted}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-stone-600">
                      <div className="flex justify-between">
                        <span>Total Pesanan:</span>
                        <span className="font-semibold text-stone-800">
                          Rp {totalItemsPrice.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nominal Terbayar:</span>
                        <span className="font-semibold text-emerald-700">
                          Rp {nominalTerbayar.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sisa Tagihan PO:</span>
                        <span className="font-semibold text-stone-800">
                          Rp {sisaPembayaran.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tahap:</span>
                        <span className="font-semibold text-stone-800">
                          {(proofTitle || '').toLowerCase().includes('pelunasan') ? 'Pelunasan PO' : 'Uang Muka (DP)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Pilihan Metode Pembayaran */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-stone-800">
                      Pilih Metode Pembayaran :
                    </label>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      {/* Opsi 1: Saldo Deposit */}
                      <button
                        type="button"
                        onClick={() => setPayMethod('deposit')}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                          payMethod === 'deposit'
                            ? 'bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-600'
                            : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/60'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            payMethod === 'deposit' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          <WalletIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-900 leading-tight">Saldo Deposit</p>
                          <p className="text-[11px] text-emerald-700 font-semibold font-mono truncate">
                            {userBalanceFormatted}
                          </p>
                        </div>
                      </button>

                      {/* Opsi 2: Transfer Bank */}
                      <button
                        type="button"
                        onClick={() => setPayMethod('transfer')}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                          payMethod === 'transfer'
                            ? 'bg-[#6B1416]/5 border-[#6B1416] ring-1 ring-[#6B1416]'
                            : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/60'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            payMethod === 'transfer' ? 'bg-[#6B1416] text-white' : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          <CreditCardIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-900 leading-tight">Transfer Bank</p>
                          <p className="text-[11px] text-stone-500 truncate">
                            BCA, Mandiri, BSI
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 3. Detail Konten Berdasarkan Metode */}
                  {payMethod === 'deposit' ? (
                    /* OPSI A: SALDO DEPOSIT */
                    <div className="bg-stone-50/60 border border-stone-200 rounded-xl p-4 space-y-3.5">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                          <CheckIcon className="w-3 h-3" />
                        </div>
                        <div className="text-xs">
                          <h5 className="font-bold text-stone-900">Pembayaran Instan Otomatis</h5>
                          <p className="text-stone-500 text-[11px] leading-relaxed mt-0.5">
                            Tagihan pesanan akan langsung terverifikasi seketika dan saldo deposit Anda berkurang secara otomatis tanpa perlu unggah struk manual.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white border border-stone-200 rounded-lg p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-stone-600">
                          <span>Tagihan yang dibayar:</span>
                          <span className="font-bold text-[#6B1416]">
                            Rp {totalTagihanTahap.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-stone-600">
                          <span>Saldo Deposit saat ini:</span>
                          <span className="font-bold text-emerald-700 font-mono">
                            {userBalanceFormatted}
                          </span>
                        </div>
                        <div className="border-t border-stone-100 pt-1.5 flex justify-between items-center">
                          <span className="font-medium text-stone-700">Sisa saldo setelah bayar:</span>
                          <span
                            className={`font-bold font-mono ${
                              userBalance >= totalTagihanTahap ? 'text-stone-900' : 'text-rose-600'
                            }`}
                          >
                            Rp {Math.max(0, userBalance - totalTagihanTahap).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>

                      {userBalance < totalTagihanTahap ? (
                        <div className="space-y-3">
                          <div className="bg-rose-50/70 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-start gap-2.5">
                            <AlertTriangleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block">Saldo Deposit Tidak Mencukupi</span>
                              <span className="text-[11px] text-rose-700">
                                Kurang Rp {(totalTagihanTahap - userBalance).toLocaleString('id-ID')} untuk menyelesaikan tagihan ini. Anda dapat melakukan Top Up deposit atau membayar lewat transfer bank manual.
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsUploadProofOpen(false);
                                setUploadSuccess(false);
                              }}
                              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 border border-stone-300 rounded-lg transition cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => setPayMethod('transfer')}
                              className="px-4 py-2 text-xs font-semibold text-stone-800 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition cursor-pointer shadow-2xs"
                            >
                              Gunakan Transfer Bank
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsUploadProofOpen(false);
                                if (onSelectTab) onSelectTab('deposit');
                              }}
                              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition cursor-pointer shadow-2xs"
                            >
                              + Top Up Deposit
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsUploadProofOpen(false);
                              setUploadSuccess(false);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 border border-stone-300 rounded-lg transition cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handlePayWithDepositSubmit}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#6B1416] hover:bg-[#520C0E] rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                          >
                            <span>Bayar Sekarang (Rp {totalTagihanTahap.toLocaleString('id-ID')})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* OPSI B: TRANSFER BANK MANUAL */
                    <form onSubmit={handleUploadProofSubmit} className="space-y-4 text-xs">
                      {/* Daftar Rekening Resmi Distributor */}
                      <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CreditCardIcon className="w-3.5 h-3.5 text-stone-600" />
                            <span className="font-bold text-stone-800 text-xs">Rekening Resmi AfatharShop</span>
                          </div>
                          <span className="text-[10px] text-stone-500 font-medium bg-white px-2 py-0.5 rounded border border-stone-200">
                            a.n {bankAccountsList[0]?.holder || 'CV AFATHAR SHOP DISTRIBUTOR'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {bankAccountsList.map((acc) => (
                            <div
                              key={acc.id}
                              className="flex items-center justify-between bg-white border border-stone-200 px-3 py-2 rounded-lg hover:border-stone-300 transition"
                            >
                              <div className="truncate mr-2">
                                <span className="font-bold text-stone-700">{acc.bank}</span>
                                <span className="font-mono text-stone-900 font-semibold block text-xs">
                                  {acc.accountNo}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyRekening(acc.accountNo, acc.bank)}
                                title={`Salin No Rekening ${acc.bank}`}
                                className="text-stone-400 hover:text-[#6B1416] p-1.5 rounded-md hover:bg-stone-100 cursor-pointer transition shrink-0"
                              >
                                <CopyIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {copyFeedback && (
                          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium animate-in fade-in flex items-center gap-1.5">
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{copyFeedback}</span>
                          </div>
                        )}
                      </div>

                      {/* Area Upload File Struk */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-stone-800">
                          Unggah Bukti Struk / Transfer <span className="text-rose-600">*</span>
                        </label>
                        <div
                          onClick={() => proofFileRef.current?.click()}
                          className="border-2 border-dashed border-stone-300 hover:border-stone-400 rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center bg-white hover:bg-stone-50/80 cursor-pointer transition text-center"
                        >
                          {proofImage ? (
                            <div className="flex items-center gap-3 text-left">
                              <img
                                src={proofImage}
                                alt="Bukti Transfer"
                                className="w-16 h-16 object-cover rounded-lg border border-stone-200 shadow-2xs shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-stone-900 text-xs truncate max-w-[220px]">
                                  {proofFileName || 'bukti_transfer.jpg'}
                                </p>
                                <p className="text-[11px] text-[#6B1416] font-medium mt-0.5">
                                  Klik untuk mengganti foto bukti
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-stone-500 py-1">
                              <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                                <CameraIcon className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-semibold text-stone-800">
                                Klik untuk memilih foto bukti transfer
                              </span>
                              <span className="text-[11px] text-stone-400">
                                Format JPG, PNG, atau WebP (Maks. 5 MB)
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

                      {/* Form Fields: Nominal, Rekening Bank Tujuan, Catatan */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-stone-800">
                            Jumlah Transfer (Rp) <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="number"
                            value={proofAmount}
                            onChange={(e) => setProofAmount(e.target.value)}
                            placeholder="Contoh: 150000"
                            className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-900 font-semibold text-xs focus:ring-1 focus:ring-[#6B1416] focus:border-[#6B1416] focus:outline-none"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-stone-800">
                            Bank Tujuan <span className="text-rose-600">*</span>
                          </label>
                          <select
                            value={proofBank}
                            onChange={(e) => setProofBank(e.target.value)}
                            className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-800 font-medium text-xs focus:ring-1 focus:ring-[#6B1416] focus:border-[#6B1416] focus:outline-none cursor-pointer"
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
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-stone-800">
                          Catatan Tambahan <span className="text-stone-400 font-normal">(opsional)</span>
                        </label>
                        <input
                          type="text"
                          value={proofNote}
                          onChange={(e) => setProofNote(e.target.value)}
                          placeholder="Contoh: Transfer via BCA Mobile an Budi"
                          className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-800 text-xs focus:ring-1 focus:ring-[#6B1416] focus:border-[#6B1416] focus:outline-none"
                        />
                      </div>

                      {/* Modal Footer Actions */}
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUploadProofOpen(false);
                            setUploadSuccess(false);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-100 border border-stone-300 rounded-lg transition cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 text-xs font-bold text-white bg-[#6B1416] hover:bg-[#520C0E] rounded-lg transition cursor-pointer shadow-2xs"
                        >
                          Kirim Bukti Pembayaran
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
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
