import React, { useState, useRef, useEffect, useMemo } from 'react';
import { api, tokenStore, mediaUrl } from '../../../services/api';
import AddProductModal from './AddProductModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import SplitAddressModal from './SplitAddressModal';
import AddressFormModal from '../../AddressFormModal';
import InvoiceModal from '../../InvoiceModal';
import { openInvoicePrintTab } from '../../../utils/printInvoice';
import { getStoredAddresses, syncAddressBookFromApi, formatFullAddress, pushAddressBookItem } from './mitraAddressBook';
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
  CreditCardIcon,
  PlusIcon
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

  const batchDatePassed =
    Boolean(order?.closeDateRaw) && new Date(order.closeDateRaw).getTime() < Date.now();

  const isClosedPO =
    (typeof isClosedPOProp === 'boolean'
      ? isClosedPOProp || (order?.isClosedPO ?? false)
      : (order?.isClosedPO ?? false)) ||
    isStatusClosed ||
    batchDatePassed;

  const userBalance = Number(String(currentUser?.balance || '').replace(/[^0-9]/g, '')) || 0;
  const userBalanceFormatted = currentUser?.balance || 'Rp 0';

  const isPendingAcc =
    order?.marketingStatus === 'PENDING' ||
    order?.stage === 'baru' ||
    String(order?.status || '').toLowerCase().includes('menunggu acc');

  const primaryAddress = useMemo(() => {
    if (order?.addressObject) return order.addressObject;
    const list = getStoredAddresses();
    if (order?.addressId) {
      const found = list.find((a) => String(a.id) === String(order.addressId));
      if (found) return found;
    }
    const def = list.find((a) => a.isDefault || a.isPrimary);
    if (def) return def;
    if (list.length > 0) return list[0];
    if (order?.address) {
      return {
        id: order?.addressId || 'main',
        recipient: order.mitraName || currentUser?.name || 'Penerima',
        phone: order.mitraPhone || order.phone || '',
        address: order.address,
        city: order.mitraCity || ''
      };
    }
    return null;
  }, [order?.addressObject, order?.addressId, order?.address, order?.mitraName, order?.mitraPhone, order?.phone, order?.mitraCity, currentUser?.name]);

  // Identitas pengirim pada label dropship (nama toko, telepon, catatan).
  // Hanya bisa disunting selama alamat belum terkunci oleh konfirmasi.
  const [senderIdentity, setSenderIdentity] = useState({
    name: order?.senderName || currentUser?.name || 'Afathar Shop',
    phone: order?.senderPhone || currentUser?.phone || '',
    notes: order?.senderNotes || ''
  });
  const [isEditingSender, setIsEditingSender] = useState(false);

  // Dynamic products list inside this order
  const [items, setItems] = useState(() => {
    const rawItems = order?.items || [];
    const hasSplits = rawItems.some((item) => item.splits && item.splits.length > 0);
    if (hasSplits) return rawItems;

    if (primaryAddress) {
      const courierObj = order?.courier
        ? { id: order.courier.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name: order.courier }
        : null;

      return rawItems.map((item) => {
        const qty = Number(item.qty) || 1;
        return {
          ...item,
          splits: [
            {
              id: Date.now() + Math.floor(Math.random() * 1000),
              address: primaryAddress,
              qty,
              weight: qty * (Number(item.unitWeight) || 300),
              senderName: senderIdentity.name,
              senderPhone: senderIdentity.phone,
              senderNotes: senderIdentity.notes,
              courier: courierObj
            }
          ]
        };
      });
    }
    return rawItems;
  });

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
  const [isNewAddressModalOpen, setIsNewAddressModalOpen] = useState(false);
  const [pickingAddressFor, setPickingAddressFor] = useState('split');
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
  const [extraAddresses, setExtraAddresses] = useState(() => {
    const rawItems = order?.items || [];
    const hasSplits = rawItems.some((item) => item.splits && item.splits.length > 0);
    if (hasSplits) return [];
    if (primaryAddress) {
      const courierObj = order?.courier
        ? { id: order.courier.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name: order.courier }
        : null;
      return [{ ...primaryAddress, courier: courierObj }];
    }
    return [];
  });
  const [courierTargetAddress, setCourierTargetAddress] = useState(null);
  const [courierChoice, setCourierChoice] = useState('');

  const persistItems = (nextItems) => {
    if (isClosedPO) {
      setNotification('Batch PO sudah ditutup — item pesanan tidak dapat diubah lagi.');
      setTimeout(() => setNotification(''), 3500);
      return;
    }
    setItems(nextItems);
    onUpdateOrder?.({ items: nextItems, invoice: orderInvoice || order?.orderNo || order?.id });
  };

  const openAllocationFor = (address) => {
    setAllocationAddress(address);
    setIsSplitModalOpen(true);
  };

  const handleSaveSenderIdentity = () => {
    if (!senderIdentity.name.trim()) return;
    onUpdateOrder?.({
      senderName: senderIdentity.name.trim(),
      senderPhone: senderIdentity.phone.trim(),
      senderNotes: senderIdentity.notes.trim(),
      invoice: orderInvoice || order?.orderNo || order?.id
    });
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        splits: (item.splits || []).map((s) => ({
          ...s,
          senderName: senderIdentity.name.trim(),
          senderPhone: senderIdentity.phone.trim() || s.senderPhone,
          senderNotes: senderIdentity.notes.trim()
        }))
      }))
    );
    setIsEditingSender(false);
    setNotification('Identitas pengirim pada label dropship diperbarui.');
    setTimeout(() => setNotification(''), 3500);
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
        senderName: base.senderName || senderIdentity.name,
        senderPhone: base.senderPhone || senderIdentity.phone,
        senderNotes: base.senderNotes || senderIdentity.notes,
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
    const targetId = String(address?.id);
    setExtraAddresses((prev) =>
      prev.filter((a) => String(a.id) !== targetId)
    );
    const nextItems = items.map((item) => ({
      ...item,
      splits: (item.splits || []).filter((sp) => String(sp.address?.id) !== targetId)
    }));
    persistItems(nextItems);
    setNotification('Alamat berhasil dihapus.');
    setTimeout(() => setNotification(''), 3000);
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
  const [proofFileObj, setProofFileObj] = useState(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofFileName, setProofFileName] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [notification, setNotification] = useState('');
  const [previewProof, setPreviewProof] = useState(null);
  const proofFileRef = useRef(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  // Termin aktif yang sedang diunggah buktinya (id installment + type dari invoice).
  const [proofStage, setProofStage] = useState(null);

  // Helper untuk membaca bukti dan status pembayaran dari objek order
  const buildPaymentsFromOrder = (ord) => {
    const map = {};
    if (!ord) return map;

    // Check DP
    const isDpAcc =
      ord.dpStatus === 'ACC' ||
      ord.dpStatus === 'acc' ||
      ord.dpStatus === 'Lunas' ||
      ord.dpStatus === 'lunas' ||
      ord.status === 'Produksi' ||
      ord.status === 'Siap Kirim' ||
      ord.status === 'Selesai' ||
      (typeof ord.paymentStatus === 'string' && ord.paymentStatus.includes('Lunas'));
    const isDpMenunggu =
      ord.dpStatus === 'Menunggu Verifikasi' ||
      ord.dpStatus === 'Menunggu Validasi' ||
      ord.dpStatus === 'menunggu';
    const hasDpProof = Boolean(ord.dpProof);

    if (hasDpProof || isDpAcc || isDpMenunggu) {
      map.dp = {
        title: 'DP',
        nominal: Number(ord.dpNominal) || 0,
        bank: ord.dpBank || 'BCA (PT Afathar Niaga Indonesia)',
        status: isDpAcc ? 'Lunas' : 'Menunggu Validasi',
        image: ord.dpProof || '',
        date: ord.dpSubmittedAt || ord.date || '',
        note: ord.dpNote || ''
      };
    }

    // Check Pelunasan
    const isPelunasanAcc =
      ord.pelunasanStatus === 'ACC' ||
      ord.pelunasanStatus === 'acc' ||
      ord.pelunasanStatus === 'Lunas' ||
      ord.pelunasanStatus === 'lunas' ||
      ord.status === 'Selesai';
    const isPelunasanMenunggu =
      ord.pelunasanStatus === 'Menunggu Verifikasi' ||
      ord.pelunasanStatus === 'Menunggu Validasi' ||
      ord.pelunasanStatus === 'menunggu';
    const hasPelunasanProof = Boolean(ord.pelunasanProof);

    if (hasPelunasanProof || isPelunasanAcc || isPelunasanMenunggu) {
      map.pelunasan = {
        title: 'Pelunasan',
        nominal: Number(ord.pelunasanNominal) || 0,
        bank: ord.pelunasanBank || 'BCA (PT Afathar Niaga Indonesia)',
        status: isPelunasanAcc ? 'Lunas' : 'Menunggu Validasi',
        image: ord.pelunasanProof || '',
        date: ord.pelunasanSubmittedAt || ord.date || '',
        note: ord.pelunasanNote || ''
      };
    }

    if (Array.isArray(ord.paymentStages)) {
      ord.paymentStages.forEach((stg, i) => {
        const key = stg.type || `stage_${i + 1}`;
        const isLunas = stg.status === 'Lunas' || stg.status === 'ACC' || stg.status === 'disetujui';
        const isMenunggu = stg.status === 'Menunggu Verifikasi' || stg.status === 'Menunggu Validasi';
        const proof = stg.proof || stg.payment?.image || '';
        if (proof || isLunas || isMenunggu) {
          map[key] = {
            title: stg.label || `Tahap ${i + 1}`,
            nominal: Number(stg.amount) || 0,
            bank: stg.payment?.bank || ord.dpBank || 'BCA (PT Afathar Niaga Indonesia)',
            status: isLunas ? 'Lunas' : 'Menunggu Validasi',
            image: proof,
            date: stg.payment?.date || ord.date || '',
            note: stg.payment?.note || ''
          };
        }
      });
    }

    return map;
  };

  // Status pembayaran termin lokal (DP, Pelunasan, Ongkir)
  const [localPayments, setLocalPayments] = useState(() => buildPaymentsFromOrder(order));

  // Sinkronkan status pembayaran & bukti saat props order diupdate dari parent/Admin
  useEffect(() => {
    setLocalPayments((prev) => {
      const fromOrder = buildPaymentsFromOrder(order);
      return {
        ...prev,
        ...fromOrder,
        dp: fromOrder.dp ? { ...(prev.dp || {}), ...fromOrder.dp } : prev.dp,
        pelunasan: fromOrder.pelunasan ? { ...(prev.pelunasan || {}), ...fromOrder.pelunasan } : prev.pelunasan
      };
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

  // Sinkronisasi status ACC DP dan Pelunasan untuk alur PO 6 Tahap
  const isDpAcc =
    order?.dpStatus === 'ACC' ||
    order?.dpStatus === 'acc' ||
    order?.dpStatus === 'Lunas' ||
    order?.dpStatus === 'lunas' ||
    order?.status === 'Produksi' ||
    order?.status === 'Dalam Produksi' ||
    order?.status === 'Siap Kirim' ||
    order?.status === 'Selesai' ||
    localPayments?.dp?.status === 'Lunas';

  const isReady =
    order?.productionStatus === 'Ready' ||
    Boolean(order?.readyAt) ||
    String(order?.status || '').toLowerCase().includes('ready') ||
    String(order?.status || '').toLowerCase().includes('alamat') ||
    String(order?.status || '').toLowerCase().includes('ongkir') ||
    String(order?.status || '').toLowerCase().includes('pelunasan') ||
    String(order?.status || '').toLowerCase().includes('siap') ||
    String(order?.status || '').toLowerCase().includes('kirim') ||
    String(order?.status || '').toLowerCase().includes('selesai');

  const ongkirAmount = Number(order?.ongkir) || 0;
  const hasOngkir = ongkirAmount > 0;

  const [localConfirmed, setLocalConfirmed] = useState(false);
  const isAddressConfirmed =
    localConfirmed ||
    Boolean(order?.addressConfirmed || order?.addressSubmitted) ||
    hasOngkir ||
    String(order?.status || '').toLowerCase().includes('ongkir') ||
    String(order?.status || '').toLowerCase().includes('pelunasan') ||
    String(order?.status || '').toLowerCase().includes('siap') ||
    String(order?.status || '').toLowerCase().includes('kirim') ||
    String(order?.status || '').toLowerCase().includes('selesai');

  const totalPelunasanWithOngkir = pelunasanNominal + ongkirAmount;

  // Alamat & alokasi barang dropship terkunci permanen setelah mitra
  // konfirmasi/kirim, sampai Admin menginput ongkir (guard 423 di backend).
  const canManageAddress = !isAddressConfirmed && !hasOngkir;

  const isPelunasanAcc =
    order?.pelunasanStatus === 'ACC' ||
    order?.pelunasanStatus === 'acc' ||
    order?.pelunasanStatus === 'Lunas' ||
    order?.pelunasanStatus === 'lunas' ||
    order?.status === 'Selesai' ||
    localPayments?.pelunasan?.status === 'Lunas';

  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  const handleUsePrimaryAddress = () => {
    if (!primaryAddress) return;
    const courierObj = selectedCourier
      ? { id: selectedCourier.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name: selectedCourier }
      : (order?.courier ? { id: order.courier.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name: order.courier } : null);

    setExtraAddresses((prev) =>
      prev.some((a) => String(a.id) === String(primaryAddress.id))
        ? prev
        : [...prev, { ...primaryAddress, courier: courierObj }]
    );

    const nextItems = items.map((item) => {
      const qty = Number(item.qty) || 1;
      const split = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        address: primaryAddress,
        qty,
        weight: qty * (Number(item.unitWeight) || 300),
        senderName: senderIdentity.name,
        senderPhone: senderIdentity.phone,
        senderNotes: senderIdentity.notes,
        courier: courierObj
      };
      return { ...item, splits: [split] };
    });
    persistItems(nextItems);
    setNotification(`Semua produk dialokasikan ke alamat ${primaryAddress.recipient || primaryAddress.name}.`);
    setTimeout(() => setNotification(''), 3500);
  };

  const handleConfirmAddressSubmit = async () => {
    setIsSubmittingAddress(true);
    setLocalConfirmed(true);
    const primaryAddr = primaryAddress || addressGroups[0]?.address || order?.address || buyerAddress;
    const addressId = primaryAddr?.id ?? order?.addressId ?? null;
    const courier = selectedCourier || addressGroups[0]?.courier?.name || order?.courier || 'JNE Trucking (JTR)';

    const patch = {
      addressConfirmed: true,
      addressSubmitted: true,
      addressSubmittedAt: new Date().toISOString().slice(0, 10),
      status: 'Menunggu Input Ongkir',
      ekspedisi: courier,
      courier_name: courier,
      address: typeof primaryAddr === 'object' ? (primaryAddr.address || formatFullAddress(primaryAddr)) : primaryAddr,
      addressId: addressId
    };

    if (onUpdateOrder) {
      onUpdateOrder(order?.invoice || order?.orderNo || order?.id, patch);
    }

    try {
      const orderId = order?.backendId || order?.id || order?.orderNo || order?.invoice;
      if (tokenStore.get() && orderId) {
        await api.updateOrderAddress(orderId, {
          address_id: Number.isInteger(Number(addressId)) ? Number(addressId) : null,
          courier_name: courier,
          notes: order?.note || '',
          is_split_address: addressGroups.length > 0
        });
      }
      setNotification('Alamat pengiriman berhasil dikonfirmasi. Diteruskan ke Admin untuk penimbangan ongkir.');
    } catch (err) {
      if (err?.status === 423) {
        setLocalConfirmed(false);
        setNotification(
          err?.message ||
            'Alamat pengiriman sudah terkunci. Menunggu Admin menginput ongkos kirim.'
        );
      } else {
        console.warn('Konfirmasi alamat ke backend tertunda:', err);
        setNotification('Alamat berhasil disimpan. Menunggu Admin Finance menginput ongkos kirim.');
      }
    } finally {
      setIsSubmittingAddress(false);
      setTimeout(() => setNotification(''), 4000);
    }
  };

  const handleSaveNewAddress = async (savedAddr) => {
    try {
      const isFirst = addressBook.length === 0;
      const newAddress = {
        ...savedAddr,
        id: savedAddr.id || Date.now(),
        isDefault: isFirst,
        isPrimary: isFirst
      };
      const updatedBook = await pushAddressBookItem(savedAddr);
      if (Array.isArray(updatedBook)) {
        setAddressBook(updatedBook);
      } else {
        setAddressBook((prev) => [newAddress, ...prev]);
      }
      setIsNewAddressModalOpen(false);
      
      if (pickingAddressFor === 'primary') {
        setPrimaryAddress(newAddress);
        setIsAddressPickerOpen(false);
      } else if (pickingAddressFor === 'split') {
        handlePickAddress(newAddress);
      }
      setNotification('Alamat baru berhasil ditambahkan.');
      setTimeout(() => setNotification(''), 3000);
    } catch (e) {
      console.error('Failed to save new address', e);
    }
  };

  const dpPaid = isDpAcc ? (Number(localPayments?.dp?.nominal) || dpNominal) : 0;
  const pelunasanPaid = isPelunasanAcc ? (Number(localPayments?.pelunasan?.nominal) || totalPelunasanWithOngkir) : 0;
  const nominalTerbayar = dpPaid + pelunasanPaid;
  const sisaPembayaran = Math.max(0, (totalItemsPrice + ongkirAmount) - nominalTerbayar);
  const totalTagihanTahap =
    parseInt(proofAmount, 10) ||
    ((proofTitle || '').toLowerCase().includes('pelunasan') ? totalPelunasanWithOngkir : dpNominal) ||
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
  const handleOpenProof = (title, defaultAmount, stage = null) => {
    setProofTitle(title);
    setProofAmount(defaultAmount.toString());
    setProofImage(null);
    setProofFileName('');
    setProofNote('');
    setProofBank(bankAccountsList[0]?.name || '');
    setPayMethod('deposit');
    setUploadSuccess(false);
    setProofStage(stage || null);
    setIsUploadProofOpen(true);
  };

  const handleProofImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFileObj(file);
      setProofFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePayWithDepositSubmit = async () => {
    const amountToPay = parseInt(proofAmount || '0', 10) || totalTagihanTahap;
    if (userBalance < amountToPay) {
      alert(`Saldo deposit Anda (${userBalanceFormatted}) tidak mencukupi untuk tagihan ini (Rp ${amountToPay.toLocaleString('id-ID')}).`);
      return;
    }
    const orderNum = order?.orderNo || order?.invoice || orderInvoice || order?.id || 'PO-ORDER';
    const stageFromTitle = (t) => {
      const s = String(t || '').toLowerCase();
      if (s.includes('dp')) return 'dp';
      if (s.includes('cicilan')) return 'cicilan';
      return 'pelunasan';
    };
    const stageKey = proofStage?.type || stageFromTitle(proofTitle);
    const isDp = stageKey === 'dp';
    const isPelunasan = stageKey === 'pelunasan';
    const instId =
      proofStage?.id ??
      order?.installmentIds?.[stageKey] ??
      (isDp
        ? order?.dpInstallmentId
        : isPelunasan
        ? order?.pelunasanInstallmentId
        : undefined);
    const todayDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    // Potong saldo deposit di server terlebih dahulu agar saldo tidak double-spend
    if (tokenStore.get()) {
      try {
        await api.my.payWithDeposit({
          order_number: order?.orderNo || order?.invoice || (order?.id ? String(order.id) : ''),
          invoice_number: order?.invoiceNumber || '',
          installment_id: instId || undefined,
          stage: stageKey,
          amount: amountToPay
        });
      } catch (err) {
        alert(`Pembayaran via deposit gagal disimpan di server: ${err?.message || 'tidak diketahui'}.`);
        return;
      }
    }

    if (onPayWithDeposit) {
      onPayWithDeposit({
        orderNo: orderNum,
        billTitle: proofStage?.label || proofTitle || (isDp ? 'DP PO' : isPelunasan ? 'Pelunasan PO' : 'Cicilan PO'),
        amount: amountToPay,
        billType: stageKey,
        installmentId: instId
      });
    }

    setLocalPayments((prev) => ({
      ...prev,
      [stageKey]: {
        title: proofStage?.label || (isDp ? 'DP' : isPelunasan ? 'Pelunasan' : 'Cicilan'),
        nominal: amountToPay,
        bank: 'Saldo Deposit Mitra',
        status: 'Lunas',
        date: todayDate,
        note: 'Lunas via Saldo Deposit'
      }
    }));

    if (onUpdateOrder) {
      if (isDp) {
        onUpdateOrder({ dpStatus: 'ACC', dpBank: 'Saldo Deposit Mitra', dpNote: 'Lunas via Saldo Deposit' });
      } else if (isPelunasan) {
        onUpdateOrder({ pelunasanStatus: 'ACC', pelunasanBank: 'Saldo Deposit Mitra', pelunasanNote: 'Lunas via Saldo Deposit' });
      } else {
        onUpdateOrder({ stageProofPatch: { stageKey, status: 'Lunas', bank: 'Saldo Deposit Mitra' } });
      }
    }

    setUploadSuccess(true);
  };

  const handleUploadProofSubmit = async (e) => {
    e.preventDefault();
    if (!proofImage && !proofFileObj) {
      alert('Harap pilih foto bukti transfer terlebih dahulu.');
      return;
    }
    if (!proofBank) {
      alert('Harap pilih rekening bank tujuan transfer.');
      return;
    }

    setIsUploadingProof(true);
    let finalProofUrl = proofImage;

    // Tentukan termin aktif: utamakan stage yang dibuka (punya id installment
    // dari invoice) agar bukti transfer tersambung ke cicilan yang benar,
    // termasuk termin menengah (cicilan) pada katalog 3x.
    const stageFromTitle = (t) => {
      const s = String(t || '').toLowerCase();
      if (s.includes('dp')) return 'dp';
      if (s.includes('cicilan')) return 'cicilan';
      return 'pelunasan';
    };
    const stageKey = proofStage?.type || stageFromTitle(proofTitle);
    const isDp = stageKey === 'dp';
    const isPelunasan = stageKey === 'pelunasan';
    const instId =
      proofStage?.id ??
      order?.installmentIds?.[stageKey] ??
      order?.installmentIds?.[`stage-${proofStage?.sequence}`] ??
      (isDp
        ? order?.dpInstallmentId
        : isPelunasan
        ? order?.pelunasanInstallmentId
        : undefined);

    // Unggah bukti transfer ke API backend jika token aktif
    if (proofFileObj && tokenStore.get()) {
      try {
        const uploadRes = await api.management.uploadFile(proofFileObj, 'proof');
        const serverPath = uploadRes?.data?.path || '';
        if (serverPath) {
          finalProofUrl = mediaUrl(serverPath);

          await api.my.uploadPayment({
            order_number: order?.orderNo || order?.invoice || (order?.id ? String(order.id) : ''),
            invoice_number: order?.invoiceNumber || '',
            installment_id: instId || undefined,
            stage: stageKey,
            amount: parseInt(proofAmount || '0', 10),
            proof_url: serverPath
          });
        }
      } catch (err) {
        console.warn('Gagal sinkronisasi bukti pembayaran ke API backend:', err);
      }
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
        image: finalProofUrl,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        status: 'Menunggu Validasi',
        installmentId: instId ?? null,
        stage: stageKey
      });
    }

    const key = isDp ? 'dp' : isPelunasan ? 'pelunasan' : stageKey;
    const paymentEntry = {
      title: proofStage?.label || proofTitle || (isDp ? 'DP' : isPelunasan ? 'Pelunasan' : 'Cicilan'),
      nominal: parseInt(proofAmount || '0', 10),
      bank: proofBank,
      note: proofNote,
      image: finalProofUrl,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Menunggu Validasi'
    };

    setLocalPayments((prev) => ({
      ...prev,
      [key]: paymentEntry
    }));

    if (onUpdateOrder) {
      if (isDp) {
        onUpdateOrder({
          dpProof: finalProofUrl,
          dpStatus: 'Menunggu Verifikasi',
          dpBank: proofBank,
          dpNote: proofNote,
          dpNominal: parseInt(proofAmount || '0', 10)
        });
      } else if (isPelunasan) {
        onUpdateOrder({
          pelunasanProof: finalProofUrl,
          pelunasanStatus: 'Menunggu Verifikasi',
          pelunasanBank: proofBank,
          pelunasanNote: proofNote,
          pelunasanNominal: parseInt(proofAmount || '0', 10)
        });
      } else {
        // Termin cicilan menengah: patch rincian stage agar UI langsung
        // menandai "Menunggu Verifikasi" tanpa menunggu sinkronisasi server.
        onUpdateOrder({
          stageProofPatch: { stageKey, image: finalProofUrl, status: 'Menunggu Verifikasi' }
        });
      }
    }

    setIsUploadingProof(false);
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
          {order?.closeDate && order.closeDate !== '-' && (
            <span className="text-stone-600 font-semibold">
              Batas PO: {order.closeDate}
            </span>
          )}
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

          {/* Status Alert Banner per Tahap Alur PO */}
          {isPendingAcc ? (
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <ClockIcon className="w-4 h-4" />
              </div>
              <div className="leading-snug space-y-0.5">
                <span className="font-bold text-amber-950">Menunggu ACC Pesanan</span>
                <p className="text-[11px] text-amber-800">Pesanan sedang diverifikasi oleh Admin. Pembayaran DP akan dibuka setelah pesanan disetujui.</p>
              </div>
            </div>
          ) : !isDpAcc ? (
            <div className="bg-sky-50/80 border border-sky-200/90 rounded-2xl p-3.5 text-xs text-sky-900 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCardIcon className="w-4 h-4" />
              </div>
              <div className="leading-snug space-y-0.5">
                <span className="font-bold text-sky-950">Menunggu Pembayaran DP</span>
                <p className="text-[11px] text-sky-800">Pesanan disetujui. Silakan selesaikan pembayaran DP agar masuk antrian produksi pabrik.</p>
              </div>
            </div>
          ) : !isReady ? (
            <div className="bg-stone-100/90 border border-stone-200 rounded-2xl p-3.5 text-xs text-stone-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-stone-200/80 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                <ClockIcon className="w-4 h-4" />
              </div>
              <div className="leading-snug space-y-0.5">
                <span className="font-bold text-stone-900">Dalam Proses Produksi</span>
                <p className="text-[11px] text-stone-600">DP terverifikasi. Pengisian alamat pengiriman akan dibuka setelah pesanan siap kirim.</p>
              </div>
            </div>
          ) : !isAddressConfirmed ? (
            <div className="bg-[#6B1416]/5 border border-[#6B1416]/20 rounded-2xl p-3.5 text-xs text-stone-900 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#6B1416]/10 text-[#6B1416] flex items-center justify-center shrink-0 mt-0.5">
                <TruckIcon className="w-4 h-4" />
              </div>
              <div className="leading-snug space-y-0.5">
                <span className="font-bold text-[#6B1416]">Barang Ready — Konfirmasi Alamat</span>
                <p className="text-[11px] text-stone-600">Produksi selesai. Lengkapi alamat pengiriman di bawah, lalu klik <strong>Konfirmasi Alamat</strong>.</p>
              </div>
            </div>
          ) : !hasOngkir ? (
            <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <ClockIcon className="w-4 h-4" />
              </div>
              <div className="leading-snug space-y-0.5">
                <span className="font-bold text-amber-950">Menunggu Penimbangan Ongkir</span>
                <p className="text-[11px] text-amber-800">Alamat telah dikonfirmasi. Admin Finance sedang menimbang paket dan menentukan nominal ongkos kirim.</p>
              </div>
            </div>
          ) : !isPelunasanAcc ? (
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 text-xs text-emerald-950 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCardIcon className="w-4 h-4" />
              </div>
              <div className="leading-snug space-y-0.5">
                <span className="font-bold text-emerald-950">Pembayaran Pelunasan & Ongkir</span>
                <p className="text-[11px] text-emerald-800">Ongkir Rp {ongkirAmount.toLocaleString('id-ID')} telah diinput. Total tagihan: <strong>Rp {totalPelunasanWithOngkir.toLocaleString('id-ID')}</strong>.</p>
              </div>
            </div>
          ) : order?.resi ? (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-xs text-stone-900 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-stone-200/80 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                <TruckIcon className="w-4 h-4" />
              </div>
              <div className="leading-snug space-y-0.5">
                <span className="font-bold text-stone-900">Pesanan Dalam Pengiriman</span>
                <p className="text-[11px] text-stone-600">Nomor Resi: <strong className="font-mono">{order.resi}</strong> ({order.courier || selectedCourier}).</p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 text-xs text-emerald-950 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <CheckIcon className="w-4 h-4" />
              </div>
              <div className="leading-snug space-y-0.5">
                <span className="font-bold text-emerald-950">Pesanan Selesai (Lunas)</span>
                <p className="text-[11px] text-emerald-800">Seluruh tagihan telah lunas dan paket siap diserahkan ke ekspedisi.</p>
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
                <p className="text-stone-800 font-semibold">{selectedCourier || order?.courier || 'Pilih Ekspedisi'}</p>
                <p className="text-[11px] text-amber-700 font-semibold italic">
                  {hasOngkir
                    ? `Ongkos Kirim: Rp ${ongkirAmount.toLocaleString('id-ID')}`
                    : '(Ongkos kirim di-update Admin setelah barang Ready & ditimbang)'}
                </p>
              </div>
              {isReady && !hasOngkir && (
                <button
                  onClick={() => setIsCourierModalOpen(true)}
                  className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition cursor-pointer"
                >
                  Pilih Jasa Pengiriman
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Multi-Stage Installments (Cicilan > 2x / 3x Sesuai Publikasi Katalog Admin) */}
          {order?.paymentStages && order.paymentStages.length >= 2 ? (
            order.paymentStages.map((stg, sIdx) => {
              const isFirst = sIdx === 0 || stg.type === 'dp';
              const isLast = sIdx === order.paymentStages.length - 1 || stg.type === 'pelunasan';
              const stageKey = stg.type || `stage_${sIdx + 1}`;
              const localPay = localPayments[stageKey] || localPayments[stg.type];
              const isLunas = stg.status === 'Lunas' || stg.status === 'ACC' || localPay?.status === 'Lunas';
              const hasProof = Boolean(stg.proof || stg.payment?.image || localPay?.image);
              const isWaiting = stg.status === 'Menunggu Verifikasi' || stg.status === 'Menunggu Validasi' || (hasProof && !isLunas);

              const stageTitle = isFirst
                ? `DP ${summaryTitle}`
                : isLast
                ? `Pelunasan + Ongkir ${summaryTitle}`
                : `${stg.label || `Cicilan ${sIdx}`} ${summaryTitle}`;
              const nominal = isLast
                ? (Number(stg.amount || pelunasanNominal) + ongkirAmount)
                : Number(stg.amount || Math.round(totalItemsPrice * (stg.pct || 30) / 100));

              const prevStage = sIdx > 0 ? order.paymentStages[sIdx - 1] : null;
              const prevLunas = !prevStage || prevStage.status === 'Lunas' || prevStage.status === 'ACC' || localPayments[prevStage.type]?.status === 'Lunas' || isDpAcc;

              return (
                <div key={stg.id || sIdx} className="pt-2 border-t border-stone-100 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-stone-800">{stageTitle}</p>
                      {isLunas ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckIcon className="w-3 h-3" /> Lunas / Terverifikasi
                        </span>
                      ) : isWaiting ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Menunggu ACC Admin
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[#2563EB] font-bold text-xs mt-0.5">
                      Rp {nominal.toLocaleString('id-ID')} ({stg.pct}%)
                      {isLast && (
                        hasOngkir ? (
                          <span className="text-[10px] font-normal text-stone-500 ml-1">
                            (Produk: Rp {Number(stg.amount || pelunasanNominal).toLocaleString('id-ID')} + Ongkir: Rp {ongkirAmount.toLocaleString('id-ID')})
                          </span>
                        ) : (
                          <span className="text-[10px] font-normal text-amber-700 ml-1">
                            (Belum termasuk ongkir)
                          </span>
                        )
                      )}
                    </p>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      {stg.date ? `Bayar sebelum ${stg.date}` : (isFirst ? `Bayar sebelum ${dpDue}` : `Bayar sebelum ${pelunasanDue}`)}
                    </p>
                  </div>

                  {localPay || hasProof || isLunas ? (
                    <button
                      onClick={() => setPreviewProof(localPay || {
                        title: stageTitle,
                        nominal: nominal,
                        bank: stg.payment?.bank || order?.dpBank || 'BCA (PT Afathar Niaga Indonesia)',
                        status: isLunas ? 'Lunas' : 'Menunggu Validasi',
                        image: stg.proof || stg.payment?.image || '',
                        date: stg.payment?.date || order?.date || '',
                        note: stg.payment?.note || ''
                      })}
                      className="bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-[10px] px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Lihat Bukti Transfer"
                    >
                      <EyeIcon className="w-3.5 h-3.5 text-[#6B1416]" />
                      <span>Lihat Bukti</span>
                    </button>
                  ) : isFirst && isPendingAcc ? (
                    <span
                      className="bg-stone-100 border border-stone-200 text-stone-500 font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1 cursor-not-allowed shadow-2xs"
                      title="Menunggu persetujuan Admin Marketing sebelum pembayaran DP"
                    >
                      <span>⏳ Menunggu ACC Admin</span>
                    </span>
                  ) : !prevLunas ? (
                    <span
                      className="bg-stone-100 border border-stone-200 text-stone-400 font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 cursor-not-allowed shadow-2xs"
                      title="Selesaikan pembayaran tahap sebelumnya terlebih dahulu"
                    >
                      <span>Menunggu Tahap {sIdx}</span>
                    </span>
                  ) : isLast && (!isReady || !hasOngkir) ? (
                    <span
                      className="bg-stone-100 border border-stone-200 text-stone-400 font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 cursor-not-allowed shadow-2xs"
                      title="Pelunasan dibuka setelah barang Ready dan ongkir diinput Admin"
                    >
                      <span>Menunggu Ready &amp; Ongkir</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleOpenProof(stageTitle, nominal, stg)}
                      className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
                    >
                      Upload Bukti Pembayaran
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <>
              {/* DP Termin Card */}
              <div className="pt-2 border-t border-stone-100 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-stone-800">Dp {summaryTitle}</p>
                    {localPayments.dp?.status === 'Lunas' || isDpAcc ? (
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
                {localPayments.dp || isDpAcc || order?.dpProof ? (
                  <button
                    onClick={() => setPreviewProof(localPayments.dp || {
                      title: 'DP',
                      nominal: dpNominal,
                      bank: order?.dpBank || 'BCA (PT Afathar Niaga Indonesia)',
                      status: isDpAcc ? 'Lunas' : 'Menunggu Validasi',
                      image: order?.dpProof || '',
                      date: order?.dpSubmittedAt || order?.date || '',
                      note: order?.dpNote || ''
                    })}
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
                    <p className="font-bold text-stone-800">Pelunasan + Ongkir {summaryTitle}</p>
                    {localPayments.pelunasan?.status === 'Lunas' || isPelunasanAcc ? (
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
                    Rp {totalPelunasanWithOngkir.toLocaleString('id-ID')}
                    {hasOngkir ? (
                      <span className="text-[10px] font-normal text-stone-500 ml-1">
                        (Produk: Rp {pelunasanNominal.toLocaleString('id-ID')} + Ongkir: Rp {ongkirAmount.toLocaleString('id-ID')})
                      </span>
                    ) : (
                      <span className="text-[10px] font-normal text-amber-700 ml-1">
                        (Belum termasuk ongkir)
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-stone-500 mt-0.5">Bayar sebelum {pelunasanDue}</p>
                </div>
                {localPayments.pelunasan || isPelunasanAcc || order?.pelunasanProof ? (
                  <button
                    onClick={() => setPreviewProof(localPayments.pelunasan || {
                      title: 'Pelunasan + Ongkir',
                      nominal: totalPelunasanWithOngkir,
                      bank: order?.pelunasanBank || 'BCA (PT Afathar Niaga Indonesia)',
                      status: isPelunasanAcc ? 'Lunas' : 'Menunggu Validasi',
                      image: order?.pelunasanProof || '',
                      date: order?.pelunasanSubmittedAt || order?.date || '',
                      note: order?.pelunasanNote || ''
                    })}
                    className="bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-[10px] px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Lihat Bukti Transfer"
                  >
                    <EyeIcon className="w-3.5 h-3.5 text-[#6B1416]" />
                    <span>Lihat Bukti</span>
                  </button>
                ) : !isDpAcc ? (
                  <span
                    className="bg-stone-100 border border-stone-200 text-stone-400 font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 cursor-not-allowed shadow-2xs"
                    title="Selesaikan pembayaran DP terlebih dahulu"
                  >
                    <span>⏳ Menunggu DP</span>
                  </span>
                ) : !isReady ? (
                  <span
                    className="bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 cursor-not-allowed shadow-2xs"
                    title="Menunggu barang selesai diproduksi dan ditandai Ready oleh Admin"
                  >
                    <span>⏳ Dalam Produksi</span>
                  </span>
                ) : !isAddressConfirmed ? (
                  <span
                    className="bg-cyan-50 border border-cyan-200 text-cyan-800 font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 cursor-not-allowed shadow-2xs"
                    title="Konfirmasi alamat pengiriman terlebih dahulu"
                  >
                    <span>⏳ Isi Alamat Dulu</span>
                  </span>
                ) : !hasOngkir ? (
                  <span
                    className="bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px] px-3 py-1.5 rounded-lg shrink-0 cursor-not-allowed shadow-2xs"
                    title="Menunggu Admin Finance menimbang paket dan menginput ongkos kirim"
                  >
                    <span>⏳ Menunggu Ongkir</span>
                  </span>
                ) : (
                  <button
                    onClick={() =>
                      handleOpenProof(
                        `Pelunasan + Ongkir (${order?.courier || selectedCourier || 'Ekspedisi'})`,
                        totalPelunasanWithOngkir
                      )
                    }
                    className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    Upload Bukti Pembayaran
                  </button>
                )}
              </div>
            </>
          )}

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
              {isReady && !hasOngkir && (
                <button
                  onClick={() => {
                    setPickingAddressFor('split');
                    setIsAddressPickerOpen(true);
                  }}
                  className="px-4 py-2 border border-sky-400 hover:bg-sky-50 text-sky-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <MapPinIcon className="w-3.5 h-3.5 text-sky-600" />
                  <span>+ Tambah Alamat Penerima</span>
                </button>
              )}
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
        
        {/* Banner Status Alamat Berdasarkan Alur PO */}
        {!isReady && (
          <div className="bg-stone-50/80 border border-stone-200/90 rounded-2xl p-4 flex items-start gap-3.5 text-stone-700">
            <div className="w-9 h-9 rounded-xl bg-stone-200/70 text-stone-600 flex items-center justify-center shrink-0 mt-0.5">
              <ClockIcon className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-stone-900 text-xs sm:text-sm">Dalam Tahap Produksi</h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-200/70 text-stone-700">
                  Menunggu Ready
                </span>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Pengisian dan konfirmasi alamat pengiriman akan dibuka setelah barang selesai diproduksi pabrik.
              </p>
            </div>
          </div>
        )}

        {isReady && !isAddressConfirmed && (
          <div className="bg-stone-50/90 rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#6B1416]/10 text-[#6B1416] flex items-center justify-center shrink-0 mt-0.5 border border-[#6B1416]/20">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-stone-900 text-sm tracking-tight">Konfirmasi Alamat Pengiriman (Dropship)</h4>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Siap Dikirim
                </span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Pesanan telah selesai diproduksi. Tentukan atau periksa detail alamat tujuan di bawah, lalu klik tombol <strong>Konfirmasi Alamat &amp; Ajukan Cek Ongkir</strong> di bagian bawah untuk proses perhitungan ongkir oleh Admin.
              </p>
            </div>
          </div>
        )}

        {isAddressConfirmed && (
          <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs transition ${
            hasOngkir
              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/40 border-amber-200/80 text-amber-950'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                hasOngkir
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100/80 text-amber-700'
              }`}>
                {hasOngkir ? <CheckIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                    {hasOngkir ? 'Ongkos Kirim Telah Diinput' : 'Alamat Dikonfirmasi'}
                  </h4>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    hasOngkir
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {hasOngkir ? 'Siap Pelunasan' : 'Menunggu Penimbangan Admin'}
                  </span>
                </div>
                <p className="text-stone-600 text-xs mt-0.5 leading-relaxed">
                  {hasOngkir
                    ? `Biaya pengiriman Rp ${ongkirAmount.toLocaleString('id-ID')} (${order?.courier || selectedCourier || 'Ekspedisi'}) telah ditambahkan ke rincian tagihan.`
                    : 'Data alamat telah diterima Admin Finance untuk proses penimbangan paket dan kalkulasi ongkir.'}
                </p>
              </div>
            </div>

            {!hasOngkir && (
              <span
                className="text-[10px] font-bold text-stone-600 bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0"
                title="Alamat & alokasi barang terkunci sampai Admin menginput ongkos kirim"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-600">
                  <path fillRule="evenodd" d="M10 2a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4Zm2 6V6a2 2 0 1 0-4 0v2h4Z" clipRule="evenodd" />
                </svg>
                <span>Terkunci — menunggu input ongkir Admin</span>
              </span>
            )}
          </div>
        )}

        {/* Header Address (Dropship) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100 text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#2563EB] font-bold flex items-center gap-1.5">
                <MapPinIcon className="w-4 h-4 text-[#2563EB]" />
                <span className="text-sm">Alamat Pengiriman (Dropship)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold text-[10px]">
                {addressGroups.length} Alamat
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Gunakan fitur ini jika pesanan ingin dikirim langsung ke pelanggan (Dropship) atau dipecah ke beberapa alamat penerima yang berbeda.
            </p>
          </div>

          {canManageAddress && (
            <button
              type="button"
              onClick={() => {
                setPickingAddressFor('split');
                setIsAddressPickerOpen(true);
              }}
              className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <MapPinIcon className="w-3.5 h-3.5 text-white" />
              <span>+ Tambah Alamat Penerima</span>
            </button>
          )}
        </div>

        {/* Daftar alamat tambahan */}
        {addressGroups.length === 0 ? (
          <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 text-center space-y-3">
            <div className="space-y-1">
              <p className="font-bold text-stone-700 text-xs">Belum ada alamat tambahan</p>
              <p className="text-[11px] text-stone-400 max-w-md mx-auto leading-relaxed">
                Klik &ldquo;Tambah Alamat Penerima&rdquo; lalu pilih produk yang dikirim ke alamat tersebut.
              </p>
            </div>
            {canManageAddress && (
              <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPickingAddressFor('split');
                    setIsAddressPickerOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <MapPinIcon className="w-3.5 h-3.5 text-white" />
                  <span>+ Tambah Alamat Penerima</span>
                </button>
                {primaryAddress && (
                  <button
                    type="button"
                    onClick={handleUsePrimaryAddress}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-stone-100 text-stone-800 font-bold text-xs rounded-xl border border-stone-300 shadow-2xs transition cursor-pointer"
                  >
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gunakan Alamat Saya ({primaryAddress.recipient || primaryAddress.name})</span>
                  </button>
                )}
              </div>
            )}
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
                    {canManageAddress && (
                      <>
                        {(addressGroups.length > 1 || group.rows.length === 0) && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAddress(group.address)}
                            className="text-[11px] font-semibold text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-lg cursor-pointer"
                          >
                            Hapus Alamat
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openCourierFor(group.address, group.courier)}
                          className="border border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold text-[11px] px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                        >
                          <TruckIcon className="w-3 h-3" />
                          {group.courier?.name ? 'Ubah Jasa Kirim' : 'Pilih Jasa Kirim'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openAllocationFor(group.address)}
                          className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <span>Pilih Produk</span>
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
                          <div className="space-y-1.5">
                            <p>Belum ada produk. Klik tombol di bawah untuk mengatur produk ke alamat ini.</p>
                            {canManageAddress && (
                              <button
                                type="button"
                                onClick={() => openAllocationFor(group.address)}
                                className="inline-flex items-center gap-1 bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs"
                              >
                                <span>+ Pilih Produk</span>
                              </button>
                            )}
                          </div>
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
                            {canManageAddress && (
                              <button
                                type="button"
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

        {/* Footer Section: Konfirmasi Alamat di Bawah Sesuai Permintaan Mitra */}
        <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-stone-500 text-[11px] leading-relaxed">
            {isReady && !isAddressConfirmed ? (
              <span className="text-stone-600">
                Pastikan pilihan jasa ekspedisi dan alokasi produk di atas telah sesuai sebelum mengajukan cek ongkir.
              </span>
            ) : isAddressConfirmed ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckIcon className="w-4 h-4" /> Alamat pengiriman telah dikonfirmasi ke Admin Finance.
              </span>
            ) : (
              <span>Alamat penerima dapat disesuaikan selama periode PO berlangsung.</span>
            )}
          </div>

          {isReady && !isAddressConfirmed && (
            <button
              type="button"
              onClick={handleConfirmAddressSubmit}
              disabled={isSubmittingAddress}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#6B1416] hover:bg-[#520C0E] active:scale-[0.99] text-white font-bold text-xs shadow-xs hover:shadow transition disabled:opacity-60 cursor-pointer shrink-0 ml-auto"
            >
              {isSubmittingAddress ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  <span>Konfirmasi Alamat &amp; Ajukan Cek Ongkir</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>

      {/* Bottom Section: Informasi Pre-Order & Rincian Pembayaran */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left: Detail Pengiriman & Label Dropship */}
        <div className="md:col-span-7 bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-stone-200/80 space-y-4 text-xs text-stone-700">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <TruckIcon className="w-4 h-4 text-[#6B1416]" />
            <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
              Detail Pengiriman &amp; Label Dropship
            </h4>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/70 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Label Pengirim (Dropship)</p>
                {canManageAddress && !isEditingSender && (
                  <button
                    type="button"
                    onClick={() => setIsEditingSender(true)}
                    className="text-[10px] font-bold text-[#6B1416] hover:text-[#520C0E] px-2 py-0.5 rounded-md border border-stone-200 bg-white hover:bg-stone-50 transition cursor-pointer"
                  >
                    Ubah
                  </button>
                )}
              </div>

              {isEditingSender ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={senderIdentity.name}
                    onChange={(e) => setSenderIdentity((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nama toko pengirim"
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#6B1416]/40"
                  />
                  <input
                    type="text"
                    value={senderIdentity.phone}
                    onChange={(e) => setSenderIdentity((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Telepon pengirim (mis. 0812xxxx)"
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#6B1416]/40"
                  />
                  <textarea
                    value={senderIdentity.notes}
                    onChange={(e) => setSenderIdentity((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Catatan label (opsional, mis. 'Jangan cantumkan harga')"
                    rows={2}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#6B1416]/40 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveSenderIdentity}
                      className="bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Simpan Identitas
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingSender(false)}
                      className="bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-[10px] px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-bold text-stone-800 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {senderIdentity.name || 'Toko Mitra'}
                  </p>
                  {senderIdentity.phone && (
                    <p className="text-[11px] text-stone-600 font-medium">Telp: {senderIdentity.phone}</p>
                  )}
                  {senderIdentity.notes && (
                    <p className="text-[11px] text-stone-600 italic">"{senderIdentity.notes}"</p>
                  )}
                  <p className="text-[10px] text-stone-500">
                    {canManageAddress
                      ? 'Identitas ini dicantumkan sebagai pengirim paket di label ekspedisi. Ubah sebelum alamat dikonfirmasi.'
                      : 'Identitas pengirim terkunci bersama alamat — menunggu input ongkir Admin.'}
                  </p>
                </>
              )}
            </div>

            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/70 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Ringkasan Logistik</p>
              <p className="font-bold text-stone-800 text-xs">
                {selectedCourier || order?.courier || 'Ekspedisi Reguler / Cargo'}
              </p>
              <p className="text-[10px] text-stone-500">
                Total muatan: <strong>{totalQty} pcs</strong> &bull; Estimasi berat: <strong>{(totalQty * 0.3).toFixed(1)} Kg</strong>
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
              {order?.paymentStages && order.paymentStages.length >= 2 ? (
                order.paymentStages.map((stg, sIdx) => {
                  const sNominal = Number(stg.amount || Math.round(totalItemsPrice * (stg.pct || 0) / 100));
                  return (
                    <div key={sIdx} className="flex justify-between text-stone-600">
                      <span>Termin {stg.label || `Tahap ${sIdx + 1}`} ({stg.pct}%)</span>
                      <span className="font-semibold text-stone-800">Rp {sNominal.toLocaleString('id-ID')}</span>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="flex justify-between text-stone-600">
                    <span>Termin DP ({dpPct}%)</span>
                    <span className="font-semibold text-stone-800">Rp {dpNominal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Termin Pelunasan ({pelunasanPct}%)</span>
                    <span className="font-semibold text-stone-800">Rp {pelunasanNominal.toLocaleString('id-ID')}</span>
                  </div>
                </>
              )}
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
                <h4 className="font-bold text-sm text-stone-900">
                  {pickingAddressFor === 'primary'
                    ? 'Pilih Alamat Pengiriman Utama'
                    : 'Tambah Alamat Penerima (Split Alamat)'}
                </h4>
              </div>
              <button
                onClick={() => setIsAddressPickerOpen(false)}
                className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-stone-500">
                  {pickingAddressFor === 'primary'
                    ? 'Pilih alamat dari buku alamat untuk tujuan utama pesanan ini.'
                    : 'Pilih alamat dari buku alamat, lalu atur produk yang dikirim ke alamat tersebut.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewAddressModalOpen(true)}
                  className="px-3 py-1.5 bg-[#6B1416] hover:bg-[#520C0E] text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>+ Buat Alamat Baru</span>
                </button>
              </div>

              {addressBook
                .filter((addr) =>
                  pickingAddressFor === 'split'
                    ? !addressGroups.some((g) => String(g.address?.id) === String(addr.id))
                    : true
                )
                .map((addr) => {
                  const isCurrentPrimary =
                    pickingAddressFor === 'primary' &&
                    String(primaryAddress?.id) === String(addr.id);

                  return (
                    <button
                      key={addr.id}
                      onClick={() => {
                        if (pickingAddressFor === 'primary') {
                          setPrimaryAddress(addr);
                          setIsAddressPickerOpen(false);
                          setNotification(`Alamat utama diubah ke: ${addr.recipient || addr.name}`);
                          setTimeout(() => setNotification(''), 3000);
                        } else {
                          handlePickAddress(addr);
                        }
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition cursor-pointer space-y-1 ${
                        isCurrentPrimary
                          ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                          : 'border-stone-200 hover:border-sky-400 hover:bg-sky-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">{addr.recipient || addr.name}</span>
                          {addr.label && (
                            <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] font-semibold">
                              {addr.label}
                            </span>
                          )}
                          {isCurrentPrimary && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                              Aktif Sekarang
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-500 font-mono">{addr.phone}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 leading-snug line-clamp-2">
                        {addr.address || formatFullAddress(addr)}
                      </p>
                      <p className="text-[10px] text-sky-700 font-semibold">
                        {addr.city}{addr.subdistrict ? ` — ${addr.subdistrict}` : ''}
                      </p>
                    </button>
                  );
                })}

              {addressBook.filter((addr) =>
                pickingAddressFor === 'split'
                  ? !addressGroups.some((g) => String(g.address?.id) === String(addr.id))
                  : true
              ).length === 0 && (
                <div className="text-center py-6 space-y-2">
                  <p className="text-[11px] text-stone-400 italic">
                    Belum ada alamat lain tersimpan di buku alamat.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsNewAddressModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6B1416] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>+ Buat Alamat Sekarang</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3b-2: Tambah Alamat Baru Langsung */}
      <AddressFormModal
        isOpen={isNewAddressModalOpen}
        onClose={() => setIsNewAddressModalOpen(false)}
        onSave={handleSaveNewAddress}
        currentUser={currentUser}
      />

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
                          {(() => {
                            const s = proofStage?.type
                              || (String(proofTitle || '').toLowerCase().includes('dp')
                                ? 'dp'
                                : String(proofTitle || '').toLowerCase().includes('cicilan')
                                ? 'cicilan'
                                : 'pelunasan');
                            if (s === 'dp') return proofStage?.label || 'Uang Muka (DP)';
                            if (s === 'pelunasan') return proofStage?.label || 'Pelunasan PO';
                            return proofStage?.label || `Cicilan PO${proofStage?.sequence ? ` ${proofStage.sequence}` : ''}`;
                          })()}
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
                    src={mediaUrl(previewProof.image)}
                    alt="Bukti Transfer"
                    className="w-full h-full object-contain bg-black/5"
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
