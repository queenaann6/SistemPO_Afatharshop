import React, { useState, useEffect, useMemo, useRef } from 'react';

const PRESET_COLORS = [
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Rose Gold', hex: '#f472b6' },
  { name: 'Hitam', hex: '#111827' },
  { name: 'Navy Blue', hex: '#1e3a8a' },
  { name: 'Maroon', hex: '#831843' },
  { name: 'Sage Green', hex: '#10b981' },
  { name: 'Dusty Pink', hex: '#fb7185' },
  { name: 'Mocca', hex: '#78350f' },
  { name: 'Broken White', hex: '#f1f5f9' },
  { name: 'Lavender', hex: '#8b5cf6' },
  { name: 'Terracotta', hex: '#c2410c' }
];

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3L', 'All Size'];
const PRESET_MODELS = ['Standard', 'Jumbo', 'Mom', 'Dad', 'Kids'];

// Tabs navigasi tanpa nomor halaman
const TABS = [
  { id: 'media', label: 'Foto & Media Produk' },
  { id: 'info', label: 'Informasi Produk' },
  { id: 'variasi', label: 'Variasi' },
  { id: 'timeline', label: 'Timeline' }
];

// Helper pemformat ribuan angka
const formatRupiah = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const num = typeof val === 'number' ? val : Number(String(val).replace(/\D/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('id-ID');
};

export default function ProductCatalogModal({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialData = null,
  brands = [],
  categories = [],
  poBatches = [],
  onCreateBatch = null,
  onClose,
  onSave,
  uploadFile,
  mediaUrl = (url) => url || ''
}) {
  if (!isOpen) return null;

  // Active Tab: Mulai dari Foto & Media Produk
  const [activeTab, setActiveTab] = useState('media');

  // File input refs untuk upload berkas internal
  const fileInputMainRef = useRef(null);
  const fileInput2Ref = useRef(null);
  const fileInput3Ref = useRef(null);
  const fileInput4Ref = useRef(null);
  const fileInputVideoRef = useRef(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab: Foto & Media (Internal Upload)
  const [image, setImage] = useState('');
  const [image2, setImage2] = useState('');
  const [image3, setImage3] = useState('');
  const [image4, setImage4] = useState('');
  const [reelUrl, setReelUrl] = useState('');
  const [uploadingSlot, setUploadingSlot] = useState(null); // 'main' | '2' | '3' | '4' | 'video'

  // Tab: Informasi Dasar
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [brandId, setBrandId] = useState('');
  const [series, setSeries] = useState('');
  const [materialDetail, setMaterialDetail] = useState('');
  const [description, setDescription] = useState('');

  // Tab: Variasi
  const [models, setModels] = useState(['Standard']);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState(['S', 'M', 'L', 'XL']);
  const [variants, setVariants] = useState([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState(new Set());

  // Mass Apply Variasi (tanpa spinner arrow, dengan input Rp)
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkQuota, setBulkQuota] = useState('');
  const [bulkAddon, setBulkAddon] = useState('');

  // Tab: Timeline & PO
  const [batch, setBatch] = useState('');
  const [poBatchId, setPoBatchId] = useState('');
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchStartDate, setNewBatchStartDate] = useState('');
  const [newBatchCloseDate, setNewBatchCloseDate] = useState('');

  const [openDate, setOpenDate] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [closeTime, setCloseTime] = useState('23:59');
  const [readyEstimate, setReadyEstimate] = useState('');

  // Promo Sale
  const [isSale, setIsSale] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [saleQuota, setSaleQuota] = useState('');
  const [manualOriginalPrice, setManualOriginalPrice] = useState('');

  // Termin Pembayaran PO
  const [terminCount, setTerminCount] = useState(2);
  const [stages, setStages] = useState([
    { label: 'Tahap 1 (DP)', pct: 50, date: '' },
    { label: 'Tahap 2 (Pelunasan)', pct: 50, date: '' }
  ]);

  // Dialog pembantu variasi
  const [showAddColorModal, setShowAddColorModal] = useState(false);
  const [customColorName, setCustomColorName] = useState('');

  const [showAddSizeModal, setShowAddSizeModal] = useState(false);
  const [customSizeName, setCustomSizeName] = useState('');

  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [customModelName, setCustomModelName] = useState('');

  // Brand object terpilih
  const selectedBrandObj = useMemo(() => {
    return brands.find((b) => b.name === brand || b.id === brandId || b.backendId === brandId);
  }, [brands, brand, brandId]);

  // Inisialisasi Data
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const defaultClose = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    setActiveTab('media');

    if (initialData) {
      setTitle(initialData.title || initialData.name || '');

      const initialBrand = initialData.brand || brands[0]?.name || '';
      setBrand(initialBrand);
      setBrandId(initialData.brand_id || initialData.brandId || brands.find((b) => b.name === initialBrand)?.id || '');

      const initialCategory = initialData.category || categories[0] || 'Gamis & Abaya';
      setCategory(initialCategory);
      setCategoryId(initialData.category_id || initialData.categoryId || '');

      setSeries(initialData.series || initialData.article_code || '');
      setMaterialDetail(initialData.material_detail || initialData.materialDetail || '');
      setDescription(initialData.description || '');

      // Media
      setImage(initialData.image || '');
      setImage2(initialData.thumbnails?.[1] || initialData.image2 || '');
      setImage3(initialData.thumbnails?.[2] || initialData.image3 || '');
      setImage4(initialData.thumbnails?.[3] || initialData.image4 || '');
      setReelUrl(initialData.reelUrl || '');

      // Timeline & PO
      setBatch(initialData.batch || initialData.po_batch?.name || '');
      setPoBatchId(initialData.po_batch_id || initialData.poBatchId || '');
      setOpenDate(initialData.openDate || today);
      setCloseDate(initialData.closeDate || defaultClose);
      setCloseTime(initialData.closeTime || '23:59');
      setReadyEstimate(initialData.readyEstimate || initialData.estimated_shipment || '14 Hari setelah PO Tutup');

      const isSaleActive = initialData.is_sale !== undefined ? !!initialData.is_sale : !!initialData.isSale;
      setIsSale(isSaleActive);
      setDiscountPercent(initialData.discount_percent ?? initialData.discountPercent ?? 0);
      setSaleQuota(initialData.saleQuota ? String(initialData.saleQuota) : '');
      setManualOriginalPrice(initialData.original_price || initialData.originalPrice ? String(initialData.original_price || initialData.originalPrice) : '');

      const tCount = initialData.terminCount === 3 || initialData.paymentStages?.length === 3 || initialData.stages?.length === 3 ? 3 : 2;
      setTerminCount(tCount);
      if (initialData.paymentStages && initialData.paymentStages.length >= 2) {
        setStages(initialData.paymentStages);
      } else if (initialData.stages && initialData.stages.length >= 2) {
        setStages(initialData.stages);
      } else {
        setStages(
          tCount === 2
            ? [
                { label: 'Tahap 1 (DP)', pct: initialData.min_dp_percent || 50, date: today },
                { label: 'Tahap 2 (Pelunasan)', pct: 100 - (initialData.min_dp_percent || 50), date: defaultClose }
              ]
            : [
                { label: 'Tahap 1 (DP)', pct: 40, date: today },
                { label: 'Tahap 2 (Cicilan 1)', pct: 30, date: defaultClose },
                { label: 'Tahap 3 (Pelunasan)', pct: 30, date: defaultClose }
              ]
        );
      }

      const existingColors = [];
      const existingSizes = [];
      const existingModels = [];

      if (initialData.variants && initialData.variants.length > 0) {
        const mappedVariants = initialData.variants.map((v, i) => {
          if (v.color && !existingColors.some((c) => c.name.toLowerCase() === v.color.toLowerCase())) {
            const matched = PRESET_COLORS.find((pc) => pc.name.toLowerCase() === v.color.toLowerCase());
            existingColors.push({
              name: v.color,
              hex: matched ? matched.hex : '#059669'
            });
          }
          if (v.size && !existingSizes.includes(v.size)) {
            existingSizes.push(v.size);
          }
          if (v.model && !existingModels.includes(v.model)) {
            existingModels.push(v.model);
          }

          const matchedColor = PRESET_COLORS.find(
            (c) => String(c.name).toLowerCase() === String(v.color || '').toLowerCase()
          );

          return {
            id: v.id || `v-${Date.now()}-${i}`,
            color: v.color || 'Standard',
            colorHex: matchedColor ? matchedColor.hex : '#059669',
            size: v.size || 'All',
            model: v.model || 'Standard',
            sku: v.sku || `${v.color || 'VAR'}-${v.size || 'ALL'}`,
            price: Number(v.price) || Number(initialData.price) || 0,
            addon: Number(v.addon) || 0,
            quota: Number(v.quota ?? v.stock ?? 50),
            is_active: v.is_active !== undefined ? !!v.is_active : true
          };
        });

        setVariants(mappedVariants);
      } else {
        setVariants([]);
      }

      if (initialData.options?.colors?.length > 0) {
        setColors(initialData.options.colors);
      } else if (existingColors.length > 0) {
        setColors(existingColors);
      } else {
        setColors([]);
      }

      if (initialData.options?.sizes?.length > 0) {
        setSizes(initialData.options.sizes);
      } else if (existingSizes.length > 0) {
        setSizes(existingSizes);
      } else {
        setSizes(['S', 'M', 'L', 'XL']);
      }

      if (initialData.options?.models?.length > 0) {
        setModels(initialData.options.models.map((m) => (typeof m === 'object' ? m.name : m)));
      } else if (existingModels.length > 0) {
        setModels(existingModels);
      } else {
        setModels(['Standard']);
      }
    } else {
      // Create mode
      setTitle('');
      setCategory(categories[0] || 'Gamis & Abaya');
      setCategoryId('');
      setBrand(brands[0]?.name || '');
      setBrandId(brands[0]?.id || brands[0]?.backendId || '');
      setSeries('');
      setMaterialDetail('');
      setDescription('');

      setImage('');
      setImage2('');
      setImage3('');
      setImage4('');
      setReelUrl('');

      setBatch(poBatches[0]?.name || '');
      setPoBatchId(poBatches[0]?.id || '');
      setOpenDate(today);
      setCloseDate(defaultClose);
      setCloseTime('23:59');
      setReadyEstimate('14 Hari setelah PO Tutup');

      setIsSale(false);
      setDiscountPercent(0);
      setSaleQuota('');
      setManualOriginalPrice('');

      setTerminCount(2);
      setStages([
        { label: 'Tahap 1 (DP)', pct: 50, date: today },
        { label: 'Tahap 2 (Pelunasan)', pct: 50, date: defaultClose }
      ]);

      setModels(['Standard']);
      setColors([]);
      setSizes(['S', 'M', 'L', 'XL']);
      setVariants([]);
    }
  }, [isOpen, initialData, brands, categories, poBatches]);

  const totalQuota = useMemo(() => {
    return variants.reduce((sum, v) => sum + (Number(v.quota) || 0), 0);
  }, [variants]);

  const minActivePrice = useMemo(() => {
    const activePrices = variants.filter((v) => v.is_active && Number(v.price) > 0).map((v) => Number(v.price));
    if (activePrices.length > 0) return Math.min(...activePrices);
    return variants[0]?.price ? Number(variants[0].price) : 0;
  }, [variants]);

  const computedOriginalPrice = useMemo(() => {
    if (manualOriginalPrice && Number(manualOriginalPrice) > 0) {
      return Number(manualOriginalPrice);
    }
    if (isSale && discountPercent > 0 && minActivePrice > 0) {
      return Math.round(minActivePrice / (1 - discountPercent / 100));
    }
    return minActivePrice;
  }, [manualOriginalPrice, isSale, discountPercent, minActivePrice]);

  const totalTerminPct = useMemo(() => {
    return stages.slice(0, terminCount).reduce((sum, s) => sum + (Number(s.pct) || 0), 0);
  }, [stages, terminCount]);

  // Upload berkas internal
  const handleInternalFileUpload = async (file, slot) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      alert('Ukuran berkas maksimal 20 MB.');
      return;
    }
    setUploadingSlot(slot);
    try {
      if (uploadFile) {
        const res = await uploadFile(file, 'product');
        const path = res?.data?.path || res?.path || '';
        if (path) {
          if (slot === 'main') setImage(path);
          if (slot === '2') setImage2(path);
          if (slot === '3') setImage3(path);
          if (slot === '4') setImage4(path);
          if (slot === 'video') setReelUrl(path);
        }
      } else {
        const localUrl = URL.createObjectURL(file);
        if (slot === 'main') setImage(localUrl);
        if (slot === '2') setImage2(localUrl);
        if (slot === '3') setImage3(localUrl);
        if (slot === '4') setImage4(localUrl);
        if (slot === 'video') setReelUrl(localUrl);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Gagal mengunggah berkas. Pastikan ukuran di bawah 20 MB.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleStageChange = (index, field, value) => {
    setStages((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, [field]: value } : s))
    );
  };

  const handleTerminCountChange = (count) => {
    setTerminCount(count);
    if (count === 2) {
      setStages([
        { label: 'Tahap 1 (DP)', pct: 50, date: openDate || '' },
        { label: 'Tahap 2 (Pelunasan)', pct: 50, date: closeDate || '' }
      ]);
    } else {
      setStages([
        { label: 'Tahap 1 (DP)', pct: 40, date: openDate || '' },
        { label: 'Tahap 2 (Cicilan 1)', pct: 30, date: closeDate || '' },
        { label: 'Tahap 3 (Pelunasan)', pct: 30, date: closeDate || '' }
      ]);
    }
  };

  const handleBrandChange = (brandName) => {
    setBrand(brandName);
    const bObj = brands.find((b) => b.name === brandName);
    if (bObj) setBrandId(bObj.id || bObj.backendId || '');
  };

  const handleCategoryChange = (catName) => {
    setCategory(catName);
    const cObj = categories.find((c) => (typeof c === 'object' ? c.name === catName : c === catName));
    if (cObj && typeof cObj === 'object') setCategoryId(cObj.id || '');
  };

  const handleBatchChange = (batchName) => {
    setBatch(batchName);
    const bObj = poBatches.find((b) => b.name === batchName);
    if (bObj) {
      setPoBatchId(bObj.id);
      if (bObj.start_date) setOpenDate(bObj.start_date);
      if (bObj.close_date) {
        const parts = bObj.close_date.split('T');
        setCloseDate(parts[0]);
      }
      if (bObj.estimated_shipment) setReadyEstimate(bObj.estimated_shipment);
    }
  };

  const handleQuickCreateBatch = async () => {
    if (!newBatchName.trim()) {
      alert('Nama batch PO wajib diisi.');
      return;
    }
    const payload = {
      name: newBatchName.trim(),
      brand: brand,
      brand_id: brandId || undefined,
      start_date: newBatchStartDate || openDate || new Date().toISOString().split('T')[0],
      close_date: newBatchCloseDate || closeDate || '',
      status: 'open'
    };

    try {
      if (onCreateBatch) {
        const created = await onCreateBatch(payload);
        if (created) {
          setBatch(created.name);
          setPoBatchId(created.id);
        }
      } else {
        setBatch(newBatchName.trim());
      }
      setShowNewBatchModal(false);
      setNewBatchName('');
    } catch (err) {
      alert('Gagal membuat batch baru: ' + (err.message || 'Error server'));
    }
  };

  // Color handling — hex diambil otomatis dari palet preset (tanpa input kode warna)
  const handleAddColor = () => {
    if (!customColorName.trim()) return;
    const name = customColorName.trim();
    const exists = colors.some((c) => c.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      const matched = PRESET_COLORS.find((pc) => pc.name.toLowerCase() === name.toLowerCase());
      const usedHexes = new Set(colors.map((c) => c.hex));
      const freePreset = PRESET_COLORS.find((pc) => !usedHexes.has(pc.hex));
      const hex =
        matched?.hex ||
        freePreset?.hex ||
        PRESET_COLORS[colors.length % PRESET_COLORS.length].hex;
      setColors((prev) => [...prev, { name, hex }]);
    }
    setCustomColorName('');
    setShowAddColorModal(false);
  };

  const handleRemoveColor = (nameToRemove) => {
    setColors((prev) => prev.filter((c) => c.name !== nameToRemove));
  };

  // Size handling
  const handleAddSize = () => {
    if (!customSizeName.trim()) return;
    const upper = customSizeName.trim().toUpperCase();
    if (!sizes.includes(upper)) {
      setSizes((prev) => [...prev, upper]);
    }
    setCustomSizeName('');
    setShowAddSizeModal(false);
  };

  const handleRemoveSize = (sizeToRemove) => {
    setSizes((prev) => prev.filter((s) => s !== sizeToRemove));
  };

  // Model handling
  const handleAddModel = () => {
    if (!customModelName.trim()) return;
    const name = customModelName.trim();
    if (!models.includes(name)) {
      setModels((prev) => [...prev, name]);
    }
    setCustomModelName('');
    setShowAddModelModal(false);
  };

  const handleRemoveModel = (modelToRemove) => {
    if (models.length <= 1) {
      alert('Minimal harus memiliki 1 model.');
      return;
    }
    setModels((prev) => prev.filter((m) => m !== modelToRemove));
  };

  // Generate Varian Otomatis
  const handleGenerateCombinations = () => {
    const activeModels = models.length > 0 ? models : ['Standard'];
    const activeColors = colors.length > 0 ? colors : [{ name: 'Default', hex: '#059669' }];
    const activeSizes = sizes.length > 0 ? sizes : ['All Size'];

    const existingKeys = new Set(variants.map((v) => `${v.model}|${v.color}|${v.size}`));
    const newItems = [];

    const basePrice = Number(bulkPrice) || (variants[0]?.price ? Number(variants[0].price) : 0);
    const baseQuota = Number(bulkQuota) || (variants[0]?.quota ? Number(variants[0].quota) : 50);
    const baseAddon = Number(bulkAddon) || 0;

    activeModels.forEach((m) => {
      activeColors.forEach((c) => {
        activeSizes.forEach((s) => {
          const key = `${m}|${c.name}|${s}`;
          if (!existingKeys.has(key)) {
            const cleanPrefix = (series || title || 'ART').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
            const colorCode = c.name.slice(0, 3).toUpperCase();
            const autoSku = `${cleanPrefix}-${colorCode}-${s}`;

            newItems.push({
              id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              model: m,
              color: c.name,
              colorHex: c.hex,
              size: s,
              sku: autoSku,
              price: basePrice,
              addon: baseAddon,
              quota: baseQuota,
              is_active: true
            });
            existingKeys.add(key);
          }
        });
      });
    });

    if (newItems.length > 0) {
      setVariants((prev) => [...prev, ...newItems]);
    } else {
      alert('Semua kombinasi variasi sudah ada dalam tabel.');
    }
  };

  // Tambah 1 baris manual
  const handleAddManualVariant = () => {
    const defModel = models[0] || 'Standard';
    const defColor = colors[0] || { name: 'Default', hex: '#059669' };
    const defSize = sizes[0] || 'All Size';
    const cleanPrefix = (series || title || 'ART').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    const autoSku = `${cleanPrefix}-${defColor.name.slice(0, 3).toUpperCase()}-${defSize}`;

    const newRow = {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      model: defModel,
      color: defColor.name,
      colorHex: defColor.hex,
      size: defSize,
      sku: autoSku,
      price: Number(bulkPrice) || 0,
      addon: Number(bulkAddon) || 0,
      quota: Number(bulkQuota) || 50,
      is_active: true
    };

    setVariants((prev) => [newRow, ...prev]);
  };

  // Mass Apply ("Terapkan ke Semua")
  const handleApplyBulkToAll = () => {
    if (bulkPrice === '' && bulkQuota === '' && bulkAddon === '') {
      alert('Isi minimal salah satu kolom (Harga Jual, Kuota, atau Add-on) untuk diterapkan.');
      return;
    }

    const hasSelection = selectedVariantIds.size > 0;

    setVariants((prev) =>
      prev.map((v) => {
        if (hasSelection && !selectedVariantIds.has(v.id)) {
          return v;
        }
        return {
          ...v,
          ...(bulkPrice !== '' ? { price: Number(bulkPrice) || 0 } : {}),
          ...(bulkQuota !== '' ? { quota: Number(bulkQuota) || 0 } : {}),
          ...(bulkAddon !== '' ? { addon: Number(bulkAddon) || 0 } : {})
        };
      })
    );
  };

  const handleToggleSelectAll = (checked) => {
    if (checked) {
      setSelectedVariantIds(new Set(variants.map((v) => v.id)));
    } else {
      setSelectedVariantIds(new Set());
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelectedVariants = () => {
    if (selectedVariantIds.size === 0) return;
    if (confirm(`Hapus ${selectedVariantIds.size} varian terpilih?`)) {
      setVariants((prev) => prev.filter((v) => !selectedVariantIds.has(v.id)));
      setSelectedVariantIds(new Set());
    }
  };

  const handleVariantChange = (id, field, value) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          return { ...v, [field]: value };
        }
        return v;
      })
    );
  };

  const handleDeleteVariant = (id) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
    setSelectedVariantIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSubmit = async (actionType = 'open') => {
    if (!title.trim()) {
      setActiveTab('info');
      alert('Nama produk wajib diisi pada tab Informasi Produk.');
      return;
    }
    if (!category.trim()) {
      setActiveTab('info');
      alert('Kategori produk wajib dipilih pada tab Informasi Produk.');
      return;
    }
    if (totalTerminPct !== 100) {
      setActiveTab('timeline');
      alert(`Total porsi termin pembayaran saat ini ${totalTerminPct}%. Harus 100% pada tab Timeline.`);
      return;
    }
    if (variants.length === 0) {
      setActiveTab('variasi');
      alert('Tambahkan minimal 1 varian produk pada tab Variasi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeStages = stages.slice(0, terminCount).map((s) => ({
        ...s,
        pct: Number(s.pct) || 0
      }));

      const activePrices = variants.filter((v) => v.is_active && Number(v.price) > 0).map((v) => Number(v.price));
      const effectiveBasePrice = activePrices.length > 0 ? Math.min(...activePrices) : Number(variants[0]?.price) || 0;

      const productPayload = {
        title: title.trim(),
        name: title.trim(),
        brand: brand || 'Afathar Exclusive',
        brand_id: brandId || undefined,
        category: category,
        category_id: categoryId || undefined,
        series: series.trim(),
        batch: batch || undefined,
        po_batch_id: poBatchId || undefined,
        description: description,
        material_detail: materialDetail.trim(),
        materialDetail: materialDetail.trim(),
        image: image,
        image2: image2,
        image3: image3,
        image4: image4,
        thumbnails: [image, image2, image3, image4].filter(Boolean),
        reelUrl: reelUrl,
        openDate: openDate,
        closeDate: closeDate,
        closeTime: closeTime,
        readyEstimate: readyEstimate,
        isSale: !!isSale,
        is_sale: !!isSale,
        discountPercent: isSale ? Number(discountPercent) || 0 : 0,
        discount_percent: isSale ? Number(discountPercent) || 0 : 0,
        saleQuota: saleQuota,
        saleBadgeText: isSale ? `SALE ${discountPercent}%` : '',
        originalPrice: isSale ? computedOriginalPrice : effectiveBasePrice,
        original_price: isSale ? computedOriginalPrice : effectiveBasePrice,
        terminCount: terminCount,
        stages: activeStages,
        paymentStages: activeStages,
        dpPct: activeStages[0]?.pct || 50,
        pelunasanDueDate: activeStages[activeStages.length - 1]?.date || closeDate,
        options: {
          models: models.map((m) => ({ name: m })),
          colors: colors,
          sizes: sizes
        },
        modelsText: models.join(', '),
        colorsText: colors.map((c) => c.name).join(', '),
        sizesText: sizes.join(', '),
        variants: variants.map((v) => ({
          ...v,
          price: Number(v.price) || 0,
          addon: Number(v.addon) || 0,
          quota: Number(v.quota) || 0,
          stock: Number(v.quota) || 0,
          is_active: v.is_active !== undefined ? !!v.is_active : true
        })),
        price: effectiveBasePrice,
        status: actionType === 'open' ? 'pre_order' : actionType === 'scheduled' ? 'upcoming' : 'draft'
      };

      await onSave(productPayload, actionType);
      onClose();
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Gagal menyimpan produk: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 overflow-y-auto">
      <div
        className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-gray-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bersih */}
        <div className="bg-[#541221] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-semibold">
              {mode === 'edit' ? 'Ubah Produk Pre-Order' : 'Tambah Produk Pre-Order'}
            </h2>
            <p className="text-xs text-rose-100 font-normal mt-0.5">
              Kelola input foto & media, informasi produk, variasi, dan timeline
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-100 hover:text-white hover:bg-white/10 transition text-lg"
            title="Tutup"
          >
            ✕
          </button>
        </div>

        {/* TAB BAR NAVIGATION DI ATAS (Bisa Diklik Bebas Kapan Saja) */}
        <div className="flex border-b border-gray-200 bg-gray-50/90 px-4 sm:px-6 pt-1.5 overflow-x-auto shrink-0 select-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#541221] text-[#541221] bg-white rounded-t-lg font-bold shadow-2xs'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ISI FORM PER HALAMAN / TAB */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-gray-800">

          {/* ================================================================= */}
          {/* TAB 1: FOTO & MEDIA PRODUK (INTERNAL UPLOAD) */}
          {/* ================================================================= */}
          {activeTab === 'media' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 pb-1 border-b border-gray-200">
                  Foto Sampul & Galeri Produk
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Unggah berkas foto langsung dari komputer / penyimpanan lokal Anda (format JPG, PNG, atau WEBP, maks. 5 MB).
                </p>
              </div>

              {/* Upload Foto Utama */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  Foto Sampul Utama (Cover) <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div
                    onClick={() => fileInputMainRef.current?.click()}
                    className="w-44 h-44 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-500 overflow-hidden relative group bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition shrink-0"
                  >
                    {uploadingSlot === 'main' ? (
                      <div className="text-center p-3 text-xs text-gray-500">
                        <span>Mengunggah foto...</span>
                      </div>
                    ) : image ? (
                      <>
                        <img src={mediaUrl(image)} alt="Foto Utama" className="w-full h-full object-cover" />
                        <div className="bg-black/60 text-white text-xs text-center w-full py-1.5 absolute bottom-0 inset-x-0 opacity-0 group-hover:opacity-100 transition">
                          Ganti Foto
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImage('');
                          }}
                          className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition z-10"
                          title="Hapus foto"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-3 text-gray-400">
                        <span className="block text-2xl mb-1">📷</span>
                        <span className="text-xs font-medium text-gray-600 block">Pilih Foto Utama</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Klik untuk upload berkas</span>
                      </div>
                    )}
                    <input
                      ref={fileInputMainRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleInternalFileUpload(e.target.files?.[0], 'main')}
                    />
                  </div>

                  <div className="space-y-2 pt-1 text-xs text-gray-600">
                    <p className="font-medium text-gray-800">Petunjuk Foto Sampul:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-500 text-[11px]">
                      <li>Foto sampul akan ditampilkan di halaman utama katalog dan etalase mitra.</li>
                      <li>Disarankan menggunakan rasio 1:1 (persegi) dengan pencahayaan jelas.</li>
                      <li>Ukuran maksimal 5 MB. Foto tersimpan langsung di server internal sistem.</li>
                    </ul>
                    {image && (
                      <button
                        type="button"
                        onClick={() => fileInputMainRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium hover:bg-gray-50 text-gray-700 transition"
                      >
                        Pilih Berkas Lain
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Foto Galeri Tambahan */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-medium text-gray-700">
                  Foto Galeri Tambahan (Detail Produk, Tampak Belakang, Cutting)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Slot Foto 2 */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-500 block">Foto 2</span>
                    <div
                      onClick={() => fileInput2Ref.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-500 overflow-hidden relative group bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition text-gray-400"
                    >
                      {uploadingSlot === '2' ? (
                        <span className="text-xs text-gray-500">Mengunggah...</span>
                      ) : image2 ? (
                        <>
                          <img src={mediaUrl(image2)} alt="Foto 2" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImage2('');
                            }}
                            className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs z-10"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <span className="text-sm font-semibold text-gray-500 block">+ Upload</span>
                          <span className="text-[10px] text-gray-400">Pilih Berkas</span>
                        </div>
                      )}
                      <input
                        ref={fileInput2Ref}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleInternalFileUpload(e.target.files?.[0], '2')}
                      />
                    </div>
                  </div>

                  {/* Slot Foto 3 */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-500 block">Foto 3</span>
                    <div
                      onClick={() => fileInput3Ref.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-500 overflow-hidden relative group bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition text-gray-400"
                    >
                      {uploadingSlot === '3' ? (
                        <span className="text-xs text-gray-500">Mengunggah...</span>
                      ) : image3 ? (
                        <>
                          <img src={mediaUrl(image3)} alt="Foto 3" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImage3('');
                            }}
                            className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs z-10"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <span className="text-sm font-semibold text-gray-500 block">+ Upload</span>
                          <span className="text-[10px] text-gray-400">Pilih Berkas</span>
                        </div>
                      )}
                      <input
                        ref={fileInput3Ref}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleInternalFileUpload(e.target.files?.[0], '3')}
                      />
                    </div>
                  </div>

                  {/* Slot Foto 4 */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-500 block">Foto 4</span>
                    <div
                      onClick={() => fileInput4Ref.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-500 overflow-hidden relative group bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition text-gray-400"
                    >
                      {uploadingSlot === '4' ? (
                        <span className="text-xs text-gray-500">Mengunggah...</span>
                      ) : image4 ? (
                        <>
                          <img src={mediaUrl(image4)} alt="Foto 4" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImage4('');
                            }}
                            className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs z-10"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-2">
                          <span className="text-sm font-semibold text-gray-500 block">+ Upload</span>
                          <span className="text-[10px] text-gray-400">Pilih Berkas</span>
                        </div>
                      )}
                      <input
                        ref={fileInput4Ref}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleInternalFileUpload(e.target.files?.[0], '4')}
                      />
                    </div>
                  </div>

                  {/* Slot Video Produk (Internal File Upload) */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-500 block">Video Produk (MP4/WebM)</span>
                    <div
                      onClick={() => fileInputVideoRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-500 overflow-hidden relative group bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition text-gray-400"
                    >
                      {uploadingSlot === 'video' ? (
                        <span className="text-xs text-gray-500">Mengunggah video...</span>
                      ) : reelUrl ? (
                        <div className="w-full h-full p-2 flex flex-col items-center justify-center text-center bg-emerald-50 text-emerald-800">
                          <span className="text-lg">🎬</span>
                          <span className="text-xs font-semibold mt-1">Video Terpasang</span>
                          <span className="text-[10px] text-emerald-600 truncate max-w-[90%]">
                            {reelUrl.split('/').pop()}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReelUrl('');
                            }}
                            className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs z-10"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="text-center p-2">
                          <span className="text-sm font-semibold text-gray-500 block">+ Upload Video</span>
                          <span className="text-[10px] text-gray-400">MP4 / WebM</span>
                        </div>
                      )}
                      <input
                        ref={fileInputVideoRef}
                        type="file"
                        accept="video/mp4,video/webm,video/*"
                        className="hidden"
                        onChange={(e) => handleInternalFileUpload(e.target.files?.[0], 'video')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: INFORMASI PRODUK */}
          {/* ================================================================= */}
          {activeTab === 'info' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-200">
                Informasi Detail Produk
              </h3>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">
                    Nama Produk PO <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {title.length}/120 Karakter
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={120}
                  value={title}
                  placeholder="Masukkan nama produk katalog..."
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221] focus:border-[#541221]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Brand / Vendor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={brand}
                    onChange={(e) => handleBrandChange(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221] bg-white text-gray-800"
                  >
                    <option value="" disabled>-- Pilih Brand / Vendor --</option>
                    {brands.map((b) => (
                      <option key={b.id || b.name} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                    {brand && !brands.some((b) => b.name === brand) && (
                      <option value={brand}>{brand}</option>
                    )}
                  </select>
                  {selectedBrandObj?.supplier && (
                    <p className="mt-1 text-[11px] text-gray-500">
                      Pabrik: <span className="font-medium text-gray-700">{selectedBrandObj.supplier}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221] bg-white text-gray-800"
                  >
                    <option value="" disabled>-- Pilih Kategori --</option>
                    {[
                      ...new Set([
                        'Gamis & Abaya',
                        'Koko & Kemko',
                        'Sarimbit Keluarga',
                        'Dress & Oneset',
                        'Hijab & Khimar',
                        'Aksesoris & Scarf',
                        ...categories.map((c) => (typeof c === 'object' ? c.name : c)),
                        category
                      ])
                    ]
                      .filter(Boolean)
                      .map((catName) => (
                        <option key={catName} value={catName}>
                          {catName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Seri / Koleksi
                  </label>
                  <input
                    type="text"
                    value={series}
                    placeholder="Contoh: Ramadhan 2026 / Signature Edition"
                    onChange={(e) => setSeries(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Bahan / Material
                  </label>
                  <input
                    type="text"
                    value={materialDetail}
                    placeholder="Contoh: Silk Armani HQ x Ceruty Babydoll"
                    onChange={(e) => setMaterialDetail(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Deskripsi Lengkap Produk
                </label>
                <textarea
                  rows={4}
                  value={description}
                  placeholder="Tuliskan spesifikasi detail produk, furing, cutting, kancing/resleting busui, serta catatan perawatan..."
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221] resize-none"
                />
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: VARIASI */}
          {/* ================================================================= */}
          {activeTab === 'variasi' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Pengaturan Variasi & Matriks Harga
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateCombinations}
                    className="px-3 py-1.5 rounded-lg bg-[#541221] text-white text-xs font-medium hover:bg-[#430e1a] transition"
                  >
                    Buat Kombinasi Varian
                  </button>
                  <button
                    type="button"
                    onClick={handleAddManualVariant}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 transition"
                  >
                    + Tambah Baris Manual
                  </button>
                </div>
              </div>

              {/* Opsi Model, Warna, Ukuran */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Model */}
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Model / Tipe</span>
                    <button
                      type="button"
                      onClick={() => setShowAddModelModal(true)}
                      className="text-xs text-[#541221] hover:underline font-medium"
                    >
                      + Tambah
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                    {models.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-gray-300 bg-white text-gray-800 text-xs font-medium"
                      >
                        {m}
                        {models.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveModel(m)}
                            className="text-gray-400 hover:text-red-600 ml-1 leading-none"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Warna */}
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Pilihan Warna ({colors.length})</span>
                    <button
                      type="button"
                      onClick={() => setShowAddColorModal(true)}
                      className="text-xs text-[#541221] hover:underline font-medium"
                    >
                      + Tambah
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                    {colors.length === 0 ? (
                      <span className="text-[11px] text-gray-400 italic">Belum ada warna. Klik + Tambah</span>
                    ) : (
                      colors.map((c) => (
                        <span
                          key={c.name}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-gray-300 bg-white text-gray-800 text-xs"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                            style={{ backgroundColor: c.hex }}
                          />
                          {c.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveColor(c.name)}
                            className="text-gray-400 hover:text-red-600 ml-0.5 leading-none"
                          >
                            ✕
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Ukuran */}
                <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700">Pilihan Ukuran ({sizes.length})</span>
                    <button
                      type="button"
                      onClick={() => setShowAddSizeModal(true)}
                      className="text-xs text-[#541221] hover:underline font-medium"
                    >
                      + Tambah
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                    {sizes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-gray-300 bg-white text-gray-800 text-xs font-medium"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() => handleRemoveSize(s)}
                          className="text-gray-400 hover:text-red-600 ml-0.5 leading-none"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bar Atur Sekaligus (Tanpa Spinner Arrow, Dengan Prefix Rp) */}
              <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-800">
                    Atur Sekaligus (Terapkan ke Semua Varian)
                  </span>
                  {selectedVariantIds.size > 0 && (
                    <span className="text-[11px] text-gray-500">
                      Menerapkan ke {selectedVariantIds.size} baris yang dipilih
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end">
                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Harga Jual</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs text-gray-500 font-medium pointer-events-none">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatRupiah(bulkPrice)}
                        onChange={(e) => setBulkPrice(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#541221]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Kuota Stok</label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatRupiah(bulkQuota)}
                        onChange={(e) => setBulkQuota(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-xs px-2.5 py-1.5 pr-8 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#541221]"
                      />
                      <span className="absolute right-2 text-[10px] text-gray-400 pointer-events-none">pcs</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-600 mb-1">Add-on</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-xs text-gray-500 font-medium pointer-events-none">+Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatRupiah(bulkAddon)}
                        onChange={(e) => setBulkAddon(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#541221]"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleApplyBulkToAll}
                      className="w-full py-1.5 px-3 rounded border border-gray-300 bg-white hover:bg-gray-100 text-gray-800 font-medium text-xs transition"
                    >
                      Terapkan ke Semua
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabel Matriks Varian (Input Murni Nominal Rp Tanpa Tombol Panah) */}
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                <div className="p-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">
                    Daftar Varian ({variants.length})
                  </span>

                  {selectedVariantIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedVariants}
                      className="text-xs text-red-600 hover:underline font-medium"
                    >
                      Hapus {selectedVariantIds.size} Varian Terpilih
                    </button>
                  )}
                </div>

                {variants.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500">
                    Belum ada varian produk. Klik "Buat Kombinasi Varian" di atas untuk membuat varian dari warna dan ukuran yang dipilih.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 sticky top-0 z-10 select-none">
                        <tr>
                          <th className="p-2 w-8 text-center">
                            <input
                              type="checkbox"
                              checked={selectedVariantIds.size === variants.length && variants.length > 0}
                              onChange={(e) => handleToggleSelectAll(e.target.checked)}
                              className="rounded border-gray-300 text-[#541221]"
                            />
                          </th>
                          <th className="px-3 py-2 font-medium">Model</th>
                          <th className="px-3 py-2 font-medium">Warna</th>
                          <th className="px-3 py-2 font-medium">Ukuran</th>
                          <th className="px-3 py-2 font-medium">SKU</th>
                          <th className="px-3 py-2 font-medium w-32">Harga Jual</th>
                          <th className="px-3 py-2 font-medium w-28">Add-on</th>
                          <th className="px-3 py-2 font-medium w-20 text-right">Kuota</th>
                          <th className="px-2 py-2 w-8 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-800">
                        {variants.map((v) => {
                          const isSelected = selectedVariantIds.has(v.id);

                          return (
                            <tr
                              key={v.id}
                              className={`hover:bg-gray-50/70 transition ${isSelected ? 'bg-amber-50/30' : ''}`}
                            >
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectRow(v.id)}
                                  className="rounded border-gray-300 text-[#541221]"
                                />
                              </td>

                              <td className="px-3 py-1.5">
                                <input
                                  type="text"
                                  value={v.model || 'Standard'}
                                  onChange={(e) => handleVariantChange(v.id, 'model', e.target.value)}
                                  className="w-24 text-xs px-2 py-1 rounded border border-gray-200 focus:border-[#541221] bg-white"
                                />
                              </td>

                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                                    style={{ backgroundColor: v.colorHex || '#059669' }}
                                  />
                                  <span className="text-gray-800">{v.color}</span>
                                </div>
                              </td>

                              <td className="px-3 py-1.5">
                                <span className="font-medium text-gray-700">{v.size}</span>
                              </td>

                              <td className="px-3 py-1.5">
                                <input
                                  type="text"
                                  value={v.sku || ''}
                                  onChange={(e) => handleVariantChange(v.id, 'sku', e.target.value)}
                                  className="w-28 text-xs px-2 py-1 rounded border border-gray-200 focus:border-[#541221] bg-white text-gray-600 font-mono"
                                />
                              </td>

                              <td className="px-3 py-1.5">
                                <div className="relative flex items-center">
                                  <span className="absolute left-2 text-[11px] text-gray-400 font-medium pointer-events-none">Rp</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatRupiah(v.price)}
                                    placeholder="0"
                                    onChange={(e) => handleVariantChange(v.id, 'price', Number(e.target.value.replace(/\D/g, '')) || 0)}
                                    className="w-full text-xs pl-7 pr-2 py-1 rounded border border-gray-200 focus:border-[#541221] bg-white font-medium text-gray-900"
                                  />
                                </div>
                              </td>

                              <td className="px-3 py-1.5">
                                <div className="relative flex items-center">
                                  <span className="absolute left-2 text-[11px] text-gray-400 font-medium pointer-events-none">+Rp</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={formatRupiah(v.addon)}
                                    placeholder="0"
                                    onChange={(e) => handleVariantChange(v.id, 'addon', Number(e.target.value.replace(/\D/g, '')) || 0)}
                                    className="w-24 text-xs pl-8 pr-2 py-1 rounded border border-gray-200 focus:border-[#541221] bg-white text-gray-700"
                                  />
                                </div>
                              </td>

                              <td className="px-3 py-1.5 text-right">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatRupiah(v.quota)}
                                  placeholder="0"
                                  onChange={(e) => handleVariantChange(v.id, 'quota', Number(e.target.value.replace(/\D/g, '')) || 0)}
                                  className="w-16 text-right text-xs px-2 py-1 rounded border border-gray-200 focus:border-[#541221] bg-white font-medium"
                                />
                              </td>

                              <td className="px-2 py-1.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVariant(v.id)}
                                  className="text-gray-400 hover:text-red-600 text-xs transition"
                                  title="Hapus baris"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: TIMELINE */}
          {/* ================================================================= */}
          {activeTab === 'timeline' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b border-gray-200">
                Timeline & Pengaturan Pre-Order (PO)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Batch PO
                  </label>
                  <select
                    value={batch}
                    onChange={(e) => handleBatchChange(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221] bg-white text-gray-800"
                  >
                    <option value="">-- Tanpa Batch / Pilih Batch PO --</option>
                    {poBatches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name} {b.brand ? `(${b.brand})` : ''}
                      </option>
                    ))}
                    {batch && !poBatches.some((b) => b.name === batch) && (
                      <option value={batch}>{batch}</option>
                    )}
                  </select>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowNewBatchModal(true)}
                    className="w-full text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:bg-gray-50 px-3 py-2.5 rounded-lg transition"
                  >
                    + Buat Batch Baru
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 -mt-1">
                {poBatchId
                  ? 'Jadwal Buka/Tutup PO produk ini mengikuti Batch PO terpilih — status Open/Close batch menjadi kunci periode PO.'
                  : 'Tanpa batch, jadwal Buka/Tutup PO berlaku mandiri untuk produk ini.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tanggal Buka PO {!batch && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    value={openDate}
                    onChange={(e) => setOpenDate(e.target.value)}
                    disabled={!!poBatchId}
                    className={`w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221] ${
                      poBatchId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tanggal Tutup PO <span className="text-red-500">*</span>
                  </label>
                  <div className={`grid ${poBatchId ? 'grid-cols-[1.5fr]' : 'grid-cols-[1.5fr_1fr]'} gap-2`}>
                    <input
                      type="date"
                      value={closeDate}
                      onChange={(e) => setCloseDate(e.target.value)}
                      disabled={!!poBatchId}
                      className={`w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221] ${
                        poBatchId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                      }`}
                    />
                    {!poBatchId && (
                      <input
                        type="time"
                        value={closeTime}
                        onChange={(e) => setCloseTime(e.target.value)}
                        className="w-full text-sm px-2 py-2 rounded-lg border border-gray-300 text-center"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Estimasi Siap Kirim
                  </label>
                  <input
                    type="text"
                    value={readyEstimate}
                    placeholder="Contoh: 14 Hari setelah PO Tutup"
                    onChange={(e) => setReadyEstimate(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#541221]"
                  />
                </div>
              </div>

              {/* Skema Termin */}
              <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">Skema Termin Pembayaran:</span>
                    <div className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-white text-xs">
                      <button
                        type="button"
                        onClick={() => handleTerminCountChange(2)}
                        className={`px-3 py-1 rounded-md transition font-medium ${
                          terminCount === 2 ? 'bg-[#541221] text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        2 Tahap (DP + Pelunasan)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTerminCountChange(3)}
                        className={`px-3 py-1 rounded-md transition font-medium ${
                          terminCount === 3 ? 'bg-[#541221] text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        3 Tahap (DP + Cicilan + Pelunasan)
                      </button>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      totalTerminPct === 100
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        : 'text-red-700 bg-red-50 border border-red-200'
                    }`}
                  >
                    {totalTerminPct === 100 ? 'Total 100%' : `Total ${totalTerminPct}% (Harus 100%)`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {stages.slice(0, terminCount).map((stg, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-800">
                          {idx === 0
                            ? 'Tahap 1 (DP)'
                            : idx === terminCount - 1
                            ? `Tahap ${idx + 1} (Pelunasan)`
                            : `Tahap ${idx + 1} (Cicilan)`}
                        </span>
                        <div className="flex items-center gap-1 font-semibold text-gray-900">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={stg.pct || ''}
                              onChange={(e) => {
                                const val = Number(e.target.value.replace(/\D/g, '')) || 0;
                                handleStageChange(idx, 'pct', Math.min(100, val));
                              }}
                              className="w-14 text-center p-1 pr-4 rounded border border-gray-300 text-xs font-medium"
                            />
                            <span className="absolute right-1 text-[10px] text-gray-400 pointer-events-none">%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] text-gray-500 block mb-0.5">Jatuh Tempo</span>
                        <input
                          type="date"
                          value={stg.date || ''}
                          onChange={(e) => handleStageChange(idx, 'date', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 rounded border border-gray-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opsi Sale / Promo */}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-800">
                  <input
                    type="checkbox"
                    checked={isSale}
                    onChange={(e) => setIsSale(e.target.checked)}
                    className="rounded border-gray-300 text-[#541221]"
                  />
                  <span>Aktifkan Diskon Promo (Sale)</span>
                </label>

                {isSale && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Diskon
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={discountPercent || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value.replace(/\D/g, '')) || 0;
                            setDiscountPercent(Math.min(99, val));
                          }}
                          placeholder="0"
                          className="w-full text-sm px-3 py-2 pr-7 rounded-lg border border-gray-300 bg-white"
                        />
                        <span className="absolute right-2.5 text-xs text-gray-400 pointer-events-none">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Batas Kuota Promo
                      </label>
                      <input
                        type="text"
                        value={saleQuota}
                        placeholder="Contoh: 100 pcs"
                        onChange={(e) => setSaleQuota(e.target.value)}
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Harga Normal / Coret
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs text-gray-500 font-medium pointer-events-none">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatRupiah(manualOriginalPrice || computedOriginalPrice)}
                          onChange={(e) => setManualOriginalPrice(e.target.value.replace(/\D/g, ''))}
                          placeholder="Dihitung otomatis jika kosong"
                          className="w-full text-sm pl-8 pr-3 py-2 rounded-lg border border-gray-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER NAVIGASI BERSIH (Langsung Action Buttons Tanpa Langkah-Langkah) */}
        <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-600">
            Total Kuota: <span className="font-semibold text-gray-900">{totalQuota ? Number(totalQuota).toLocaleString('id-ID') : 0} pcs</span> ({variants.length} varian)
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              className="px-3.5 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium transition cursor-pointer"
            >
              Simpan Draf
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('open')}
              className="px-5 py-2 rounded-lg bg-[#541221] hover:bg-[#430e1a] text-white text-xs font-medium transition cursor-pointer"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan & Buka PO'}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Modal: Tambah Warna */}
      {showAddColorModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Tambah Warna</h4>
              <button
                type="button"
                onClick={() => setShowAddColorModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <div>
              <span className="text-[11px] text-gray-600 block mb-1.5">Pilih warna populer:</span>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {PRESET_COLORS.map((pc) => (
                  <button
                    key={pc.name}
                    type="button"
                    onClick={() => {
                      setCustomColorName(pc.name);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded border border-gray-200 hover:border-gray-400 bg-gray-50 text-xs"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pc.hex }} />
                    <span>{pc.name}</span>
                  </button>
                ))}
              </div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nama Warna</label>
              <input
                type="text"
                placeholder="Contoh: Dusty Rose"
                value={customColorName}
                onChange={(e) => setCustomColorName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-gray-300"
              />
              <p className="text-[11px] text-gray-500 mt-1.5">
                Warna swatch dipilihkan otomatis dari palet. Cukup isi nama warnanya saja.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddColorModal(false)}
                className="px-3 py-1.5 rounded border border-gray-300 text-xs font-medium text-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddColor}
                className="px-4 py-1.5 rounded bg-[#541221] text-white text-xs font-medium"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Tambah Ukuran */}
      {showAddSizeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Tambah Ukuran</h4>
              <button
                type="button"
                onClick={() => setShowAddSizeModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <div>
              <span className="text-[11px] text-gray-600 block mb-1.5">Pilih ukuran:</span>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {PRESET_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setCustomSizeName(sz)}
                    className="px-2.5 py-1 rounded border border-gray-200 hover:border-gray-400 bg-gray-50 text-xs font-medium"
                  >
                    {sz}
                  </button>
                ))}
              </div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nama Ukuran Baru</label>
              <input
                type="text"
                placeholder="Misal: 4L atau Kids S"
                value={customSizeName}
                onChange={(e) => setCustomSizeName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-gray-300"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddSizeModal(false)}
                className="px-3 py-1.5 rounded border border-gray-300 text-xs font-medium text-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddSize}
                className="px-4 py-1.5 rounded bg-[#541221] text-white text-xs font-medium"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Tambah Model */}
      {showAddModelModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Tambah Model / Tipe</h4>
              <button
                type="button"
                onClick={() => setShowAddModelModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            <div>
              <span className="text-[11px] text-gray-600 block mb-1.5">Pilihan umum:</span>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {PRESET_MODELS.map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setCustomModelName(pm)}
                    className="px-2.5 py-1 rounded border border-gray-200 hover:border-gray-400 bg-gray-50 text-xs"
                  >
                    {pm}
                  </button>
                ))}
              </div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nama Model</label>
              <input
                type="text"
                placeholder="Contoh: Gamis Mom, Koko Dad"
                value={customModelName}
                onChange={(e) => setCustomModelName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded border border-gray-300"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModelModal(false)}
                className="px-3 py-1.5 rounded border border-gray-300 text-xs font-medium text-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddModel}
                className="px-4 py-1.5 rounded bg-[#541221] text-white text-xs font-medium"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modal: Buat Batch PO Baru */}
      {showNewBatchModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900">Buat Batch PO Baru</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nama Batch <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Batch 1 Ramadhan 2026"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded border border-gray-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Tgl Buka</label>
                  <input
                    type="date"
                    value={newBatchStartDate}
                    onChange={(e) => setNewBatchStartDate(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Tgl Tutup</label>
                  <input
                    type="date"
                    value={newBatchCloseDate}
                    onChange={(e) => setNewBatchCloseDate(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded border border-gray-300"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewBatchModal(false)}
                className="px-3 py-1.5 rounded border border-gray-300 text-xs font-medium text-gray-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleQuickCreateBatch}
                className="px-4 py-1.5 rounded bg-[#541221] text-white text-xs font-medium"
              >
                Buat Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
