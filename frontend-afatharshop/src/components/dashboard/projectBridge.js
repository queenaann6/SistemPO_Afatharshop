import {
  MKT,
  PAY,
  PROD,
  SHIP,
  addDays,
  fmtDate,
  num,
  orderOutstanding,
  orderStage,
  todayISO,
  toISO
} from './poCore';
import {
  DEFAULT_COLORS,
  DEFAULT_MODELS,
  DEFAULT_PAYMENT_STAGES,
  DEFAULT_SIZES,
  DEFAULT_STORE
} from '../../data/mockData';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80';

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6,
  jul: 7, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12
};

export const parseProjectDate = (value) => {
  if (!value) return todayISO();
  const text = String(value);
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parts = text.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (parts) {
    const month = MONTHS[parts[2].slice(0, 3).toLowerCase()] || 1;
    return `${parts[3]}-${String(month).padStart(2, '0')}-${String(parts[1]).padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? todayISO() : toISO(parsed);
};

const longDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

const stageDate = (value) => (value ? parseProjectDate(value) : '');
const cleanPaymentStages = (stages) => {
  const plan = (Array.isArray(stages) ? stages : [])
    .filter(Boolean)
    .map((stage, index) => ({
      label: stage.label || stage.stage || `Termin ${index + 1}`,
      pct: Math.min(100, Math.max(0, num(stage.pct ?? stage.percent))),
      date: stageDate(stage.date)
    }))
    .filter((stage) => stage.pct > 0);
  return plan.length >= 2 ? plan.slice(0, 3) : null;
};
export const normalizePaymentStages = (stages) =>
  cleanPaymentStages(stages) ||
  DEFAULT_PAYMENT_STAGES.map((stage, index) => ({
    label: stage.label || `Termin ${index + 1}`,
    pct: num(stage.percent ?? stage.pct),
    date: stageDate(stage.date)
  }));

const slug = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item';

const titleCase = (text) =>
  String(text || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const BRAND_LABELS = {
  coverme: 'Coverme Hijab',
  isa: 'Isa Luxury',
  kaen: 'Kaen Boutique',
  dalanova: 'Dalanova',
  babyjab: 'Babyjab Hijab'
};

export const prettyBrand = (raw, brandId) => {
  if (brandId && BRAND_LABELS[brandId]) return BRAND_LABELS[brandId];
  const text = String(raw || '').trim();
  if (!text) return 'Lainnya';
  const byId = Object.entries(BRAND_LABELS).find(([id, name]) => id === text.toLowerCase() || name.toLowerCase() === text.toLowerCase());
  return byId ? byId[1] : titleCase(text);
};

const brandIdOf = (name) => {
  const entry = Object.entries(BRAND_LABELS).find(([, label]) => label.toLowerCase() === String(name || '').toLowerCase());
  return entry ? entry[0] : slug(name);
};

export const normalizeLevel = (level) => {
  const text = String(level || '').toLowerCase();
  if (text.includes('sub')) return 'Sub DB';
  if (text.includes('agen')) return 'Agen';
  if (text.includes('reseller')) return 'Reseller';
  return 'DB All';
};

const splitMitraName = (raw) => {
  const text = String(raw || '').trim();
  const match = text.match(/^(.*?)\s*\((.*?)\)\s*$/);
  return match ? { name: match[1].trim(), city: match[2].trim() } : { name: text, city: '' };
};

const statusFlags = (status) => {
  // Parenthetical annotations like "(Validasi Selesai)" describe a sub-step,
  // they must not be read as the order being finished.
  const text = String(status || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const done = /\bselesai\b/.test(text);
  const shipped = done || text.includes('dikirim');
  const paid = text.includes('lunas') || done || text.includes('siap kirim');
  const rejected = text.includes('tolak') || text.includes('batal');
  const dpPaid = paid || text.includes('dp terbayar') || text.includes('diproses');
  return { done, shipped, paid, rejected, dpPaid };
};

const variantParts = (variant) => {
  const [color = '', model = '', size = ''] = String(variant || '').split('/').map((v) => v.trim());
  return { color, model, size };
};

const titleKey = (title) => String(title || '').trim().toLowerCase();

export const projectOrdersToCore = (projectOrders, { currentUser, seedMitra = [], products = [] } = {}) =>
  (projectOrders || []).map((order) => {
    const { name, city } = splitMitraName(order.mitraName);
    const seed = (seedMitra || []).find((m) => m.name.toLowerCase() === name.toLowerCase());
    const isHen = name.toUpperCase().includes('HENI');
    const level = normalizeLevel(order.mitraLevel || seed?.level);
    const items = Array.isArray(order.items) && order.items.length ? order.items : [];
    const orderTitle = order.title || items[0]?.title;
    const matchedProduct = (products || []).find((p) => titleKey(p.title) === titleKey(orderTitle));
    const qty = items.reduce((sum, item) => sum + num(item.qty), 0) || num(order.qty) || 1;
    const subtotal = num(order.total) || items.reduce((sum, item) => sum + num(item.subtotal), 0);
    const price = items.length === 1 ? num(items[0].price) : Math.round(subtotal / Math.max(1, qty));
    const feeMitraNominal =
      num(order.feeMitraNominal) ||
      items.reduce((sum, item) => sum + num(item.feeNominal) * (num(item.qty) || 1), 0);
    const brandDiscountNominal =
      num(order.brandDiscountNominal) ||
      items.reduce((sum, item) => sum + num(item.brandDiscountNominal), 0);
    const feeCompanyNominal =
      num(order.feeCompanyNominal) || Math.max(0, brandDiscountNominal - feeMitraNominal);
    const gross =
      items.reduce(
        (sum, item) => sum + (num(item.basePrice) || num(item.price)) * (num(item.qty) || 1),
        0
      ) || subtotal + feeMitraNominal;
    const discountPct = num(order.discountPct) || (gross ? Math.round((feeMitraNominal / gross) * 100) : 0);
    const schemeDpPct = num(order.dpPct) || num(matchedProduct?.dpPct) || 50;
    const dpNominal = num(order.dpNominal) || Math.round((subtotal * schemeDpPct) / 100);
    const flags = statusFlags(order.status);
    const date = parseProjectDate(order.date);
    const ongkir = flags.paid ? Math.max(20000, Math.round(subtotal * 0.05)) : 0;
    const address = flags.dpPaid
      ? isHen && currentUser?.address
        ? currentUser.address
        : city
        ? `Kota ${city}`
        : null
      : null;
    const invoice = order.orderNo || order.id || `INV-${Date.now()}`;
    const paymentPlan =
      cleanPaymentStages(order.paymentStages) ||
      cleanPaymentStages(matchedProduct?.paymentStages) ||
      (() => {
        const dp = Math.min(100, Math.max(0, num(order.dpPct) || num(matchedProduct?.dpPct) || 50));
        const lastDate = parseProjectDate(
          order.pelunasanDueDate || matchedProduct?.pelunasanDueDate || order.closeDate
        );
        return [
          { label: 'Termin 1 · DP', pct: dp, date: parseProjectDate(order.date) },
          { label: 'Termin 2 · Pelunasan', pct: 100 - dp, date: lastDate }
        ].filter((stage) => stage.pct > 0);
      })();

    const core = {
      id: invoice,
      invoice,
      date,
      mitraId: seed?.id || `m-${slug(name)}`,
      mitraName: name || currentUser?.name || 'HENI',
      level,
      phone: order.mitraPhone || seed?.phone || (isHen ? currentUser?.phone : ''),
      brand: prettyBrand(order.brand || items[0]?.brand),
      produkId: matchedProduct ? `p-${matchedProduct.id}` : `p-${slug(orderTitle)}`,
      produk: orderTitle || 'Pesanan PO',
      variant: items.map((i) => i.variant).filter(Boolean).join(' · ') || order.variant || '-',
      qty,
      price,
      discountPct,
      discountNominal: feeMitraNominal,
      feeMitraNominal,
      brandDiscountNominal,
      feeCompanyNominal,
      subtotal,
      addonNominal:
        num(order.addonNominal) ||
        items.reduce((sum, item) => sum + num(item.addon) * num(item.qty), 0),
      dpPct: schemeDpPct,
      dpNominal,
      pelunasanNominal: Math.max(0, subtotal - dpNominal),
      paymentStages: paymentPlan,
      dpStatus: flags.rejected ? PAY.TOLAK : flags.dpPaid ? PAY.ACC : PAY.BELUM,
      dpProof: '',
      dpVerifiedBy: flags.dpPaid ? 'Nadia Finance' : '',
      dpVerifiedAt: flags.dpPaid ? date : '',
      pelunasanStatus: flags.paid ? PAY.ACC : PAY.BELUM,
      pelunasanProof: '',
      pelunasanVerifiedBy: flags.paid ? 'Nadia Finance' : '',
      pelunasanVerifiedAt: flags.paid ? date : '',
      ongkir,
      ongkirAt: flags.paid ? date : '',
      ekspedisi: order.courier || '',
      weight: `${Math.max(1, Math.round(qty * 0.4))} kg`,
      shippingNote: '',
      ongkirStatus: flags.paid ? PAY.ACC : PAY.BELUM,
      ongkirProof: '',
      ongkirVerifiedBy: flags.paid ? 'Nadia Finance' : '',
      ongkirVerifiedAt: flags.paid ? date : '',
      resi: flags.shipped ? `AWB-${String(invoice).replace(/\s+/g, '')}` : '',
      shippedAt: flags.shipped ? date : '',
      receivedAt: flags.done ? date : '',
      shipStatus: flags.done ? SHIP.DITERIMA : flags.shipped ? SHIP.DIKIRIM : flags.paid ? SHIP.SIAP : SHIP.BELUM,
      marketingStatus: flags.rejected ? (flags.done ? MKT.TOLAK : MKT.ACC) : flags.dpPaid ? MKT.ACC : MKT.PENDING,

      marketingNote: '',
      marketingBy: flags.dpPaid ? 'Fajar Marketing' : '',
      marketingAt: flags.dpPaid ? date : '',
      productionStatus: flags.paid ? PROD.READY : flags.dpPaid ? PROD.RUN : PROD.QUEUE,
      readyAt: flags.paid ? date : '',
      address,
      createdBy: 'Checkout Mitra',
      notes: order.note || '',
      revisionNote: '',
      cancelReason: flags.rejected ? 'Pesanan dibatalkan mitra' : '',
      _projectMeta: {
        items,
        image: order.image,
        closeDate: order.closeDate,
        isClosedPO: order.isClosedPO,
        city,
        mitraPhone: order.mitraPhone,
        pelunasanDueDate: order.pelunasanDueDate || matchedProduct?.pelunasanDueDate || ''
      }
    };
    return core;
  });

export const projectOrderToCore = (order, options) => projectOrdersToCore([order], options)[0];

// Demo orders may reference products that are no longer in the published catalog.
// Link those orders to a catalog product so per-product recap stays consistent.
export const alignCoreOrdersToProducts = (coreOrders, coreProducts) => {
  const list = coreProducts || [];
  if (!list.length) return coreOrders || [];
  const known = new Set(list.map((p) => String(p.id)));
  return (coreOrders || []).map((order, index) => {
    if (known.has(String(order.produkId))) return order;
    const product = list[index % list.length];
    const variant = product.variants?.[0];
    return {
      ...order,
      produkId: product.id,
      produk: product.title,
      brand: product.brand,
      variantId: variant?.id || order.variantId,
      variant: variant ? `${variant.color}/${variant.model}/${variant.size}` : order.variant,
      _projectMeta: {
        ...(order._projectMeta || {}),
        originalTitle: order.produk,
        originalBrand: order.brand
      }
    };
  });
};

const STATUS_META = {
  baru: ['Pesanan Dibuat', 'bg-amber-100 text-amber-800'],
  produksi: ['DP Terbayar (Validasi Selesai)', 'bg-emerald-100 text-emerald-800'],
  alamat: ['Menunggu Alamat Mitra', 'bg-cyan-100 text-cyan-800'],
  ongkir: ['DP Terbayar (Validasi Selesai)', 'bg-emerald-100 text-emerald-800'],
  pelunasan: ['Menunggu Pelunasan', 'bg-indigo-100 text-indigo-800'],
  ongkir_bayar: ['Menunggu Pembayaran Ongkir', 'bg-orange-100 text-orange-800'],
  kirim: ['Lunas (Siap Kirim)', 'bg-green-100 text-green-800'],
  dikirim: ['Dikirim', 'bg-sky-100 text-sky-800'],
  selesai: ['Selesai', 'bg-emerald-100 text-emerald-800'],
  ditolak: ['Batal', 'bg-rose-100 text-rose-800']
};

const dpStatusMeta = (order) => {
  if (order.dpStatus === PAY.TOLAK) return ['Pembayaran Ditolak', 'bg-rose-100 text-rose-800'];
  if (order.dpStatus === PAY.MENUNGGU) return ['Menunggu Verifikasi DP', 'bg-sky-100 text-sky-800'];
  return ['Menunggu Pembayaran DP', 'bg-amber-100 text-amber-800'];
};

const buildProjectItems = (order) => {
  const meta = order._projectMeta || {};
  if (Array.isArray(meta.items) && meta.items.length) return meta.items;
  const parts = variantParts(order.variant);
  const dueDate = meta.pelunasanDueDate
    ? parseProjectDate(meta.pelunasanDueDate)
    : meta.closeDate
      ? parseProjectDate(meta.closeDate)
      : addDays(todayISO(), 30);
  const addon = num(order.addonNominal) ? Math.round(num(order.addonNominal) / Math.max(1, num(order.qty))) : 0;
  return [
    {
      id: `${order.invoice}-1`,
      title: order.produk,
      variant: order.variant,
      variation: parts.model,
      size: parts.size,
      color: parts.color,
      price: num(order.price),
      qty: num(order.qty),
      discountPct: num(order.discountPct),
      addon,
      addonTotal: addon * num(order.qty),
      subtotal: num(order.subtotal),
      dueDate: fmtDate(dueDate),
      image: meta.image || FALLBACK_IMAGE
    }
  ];
};

export const coreOrdersToProject = (coreOrders) =>
  (coreOrders || []).map((order) => {
    const meta = order._projectMeta || {};
    const stage = orderStage(order);
    const [status, statusColor] = stage === 'dp' ? dpStatusMeta(order) : STATUS_META[stage] || STATUS_META.baru;
    const mitraName = meta.city ? `${order.mitraName} (${meta.city})` : order.mitraName;
    return {
      id: order.invoice,
      orderNo: order.invoice,
      mitraName,
      mitraLevel: order.level,
      title: meta.originalTitle || order.produk,
      brand: meta.originalBrand || order.brand,
      date: fmtDate(order.date),
      status,
      statusColor,
      total: num(order.subtotal) + num(order.ongkir),
      dpNominal: num(order.dpNominal),
      dpPct: num(order.dpPct) || Math.round((num(order.dpNominal) / Math.max(1, num(order.subtotal))) * 100),
      pelunasanNominal: Math.max(0, num(order.subtotal) - num(order.dpNominal)),
      addonNominal: num(order.addonNominal),
      pelunasanDueDate: meta.pelunasanDueDate || '',
      sisaTagihan: orderOutstanding(order),
      courier: order.ekspedisi || '-',
      address: order.address || '',
      phone: order.phone || '',
      isClosedPO: !!meta.isClosedPO,
      closeDate: meta.closeDate || '-',
      image: meta.image || FALLBACK_IMAGE,
      items: buildProjectItems(order)
    };
  });

const colorNameOf = (color) => (color && typeof color === 'object' ? color.name : color) || 'Default';
const colorHexOf = (color) => (color && typeof color === 'object' ? color.hex : '') || '#CBD5E1';

export const projectProductsToCore = (products) =>
  (products || []).map((product) => {
    const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : DEFAULT_SIZES;
    const colors = Array.isArray(product.colors) && product.colors.length ? product.colors : DEFAULT_COLORS;
    const models = Array.isArray(product.models) && product.models.length ? product.models : DEFAULT_MODELS;
    // Satu varian untuk setiap kombinasi model x warna x ukuran yang dipublikasikan
    // di katalog (index publish), tanpa memotong opsi.
    const combos = [];
    models.forEach((model, mi) => {
      const modelPrice = model.price != null && model.price !== '' ? num(model.price) : num(product.price);
      const modelAddon = num(model.addon);
      colors.forEach((color, ci) => {
        sizes.forEach((size, si) => {
          combos.push({
            id: `v-${product.id}-${mi}-${ci}-${si}`,
            color: colorNameOf(color),
            model: model.name || 'Reguler',
            size: String(size),
            price: modelPrice,
            addon: modelAddon,
            used: 0
          });
        });
      });
    });
    const stockQuota = num(product.stockQuota);
    const totalQuota = Math.max(stockQuota, combos.length);
    const baseQuota = Math.floor(totalQuota / Math.max(1, combos.length));
    const remainder = totalQuota - baseQuota * combos.length;
    const variants = combos.map((variant, index) => ({
      ...variant,
      quota: Math.max(1, baseQuota + (index < remainder ? 1 : 0))
    }));
    const closeDate = parseProjectDate(product.tutupPO || product.tutupPODetail);
    const closeTimeMatch = String(product.tutupPODetail || product.tutupPO || '').match(/pukul\s+(\d{1,2}:\d{2})/i);
    return {
      id: `p-${product.id}`,
      projectId: product.id,
      title: product.title,
      brand: prettyBrand(product.brand, product.brandId),
      category: product.category || 'Gamis & Abaya',
      price: num(product.price),
      hpp: Math.round(num(product.price) * 0.62),
      openDate: product.openDate ? parseProjectDate(product.openDate) : '',
      closeDate,
      closeTime: closeTimeMatch ? closeTimeMatch[1] : '',
      status: product.status === 'closed' || product.status === 'closed_po' ? 'closed' : 'open',
      readyEstimate: product.estimatedShipment || '-',
      terms: `DP ${num(product.dpPct) || 50}% saat checkout · pelunasan sebelum kirim`,
      dpPct: Math.min(100, Math.max(0, num(product.dpPct) || 50)),
      pelunasanDueDate: product.pelunasanDueDate ? parseProjectDate(product.pelunasanDueDate) : '',
      paymentStages: normalizePaymentStages(product.paymentStages),
      description: product.descriptionDetailed?.summary || product.sku || '',
      image: product.image || FALLBACK_IMAGE,
      createdAt: todayISO(),
      options: {
        models: models.map((model) => ({ name: model.name || 'Reguler' })),
        sizes: sizes.map((size) => String(size)),
        colors: colors.map((color) => ({ name: colorNameOf(color), hex: colorHexOf(color) }))
      },
      variants
    };
  });

export const coreProductsToProject = (coreProducts, prevProducts) => {
  const byId = new Map((prevProducts || []).map((p) => [String(p.id), p]));
  return (coreProducts || []).map((product) => {
    const baseId = product.projectId != null ? String(product.projectId) : `proj-${product.id}`;
    const base = byId.get(baseId);
    const brandName = String(product.brand || '').toUpperCase();
    const brandId = brandIdOf(product.brand);
    const variants = product.variants || [];
    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
    const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
    const options = product.options || {};
    const optionModels = Array.isArray(options.models) && options.models.length ? options.models : null;
    const optionSizes = Array.isArray(options.sizes) && options.sizes.length ? options.sizes : null;
    const optionColors = Array.isArray(options.colors) && options.colors.length ? options.colors : null;
    const variantPrices = variants
      .filter((v) => v?.price != null && v?.price !== '')
      .map((v) => num(v.price));
    const basePrice = variantPrices.length ? Math.min(...variantPrices) : num(product.price);
    const maxPrice = variantPrices.length ? Math.max(...variantPrices) : basePrice;
    const priceOfVariant = (v) => (v?.price != null && v?.price !== '' ? num(v.price) : basePrice);
    const addonOfVariant = (v) => num(v?.addon);
    const modelNames = [
      ...new Set([...(optionModels || []).map((m) => m.name), ...variants.map((v) => v.model)].filter(Boolean))
    ];
    const models = modelNames.map((name) => ({ name }));
    // Opsi katalog tetap jadi acuan, varian tambahan (warna/model/ukuran baru) tetap bisa dipilih
    const mergedModels = models;
    const mergedSizes = [...(optionSizes || sizes)];
    sizes.forEach((s) => {
      if (!mergedSizes.includes(s)) mergedSizes.push(s);
    });
    const mergedColors = [...(optionColors || [])];
    colors.forEach((name) => {
      if (!mergedColors.some((c) => c.name === name)) mergedColors.push({ name, hex: '#CBD5E1' });
    });
    const quotaSum = variants.reduce((sum, v) => sum + num(v.quota), 0);
    return {
      ...(base || {}),
      id: base?.id || baseId,
      title: product.title,
      series: base?.series || 'PRE-ORDER COLLECTION • 2027 SERIES',
      sku: base?.sku || product.title,
      brand: brandName,
      brandId,
      category: product.category || 'Gamis & Abaya',
      price: basePrice,
      priceMin: basePrice,
      priceMax: maxPrice,
      originalPrice: base?.originalPrice || Math.round(basePrice * 1.2),
      discountPercent: base?.discountPercent || 0,
      isSale: !!base?.isSale,
      status: product.status === 'closed' ? 'closed' : 'pre_order',
      statusLabel: product.status === 'closed' ? 'PO Ditutup' : 'Open Pre-Order',
      tutupPO: longDate(product.closeDate),
      tutupPODetail: product.closeTime
        ? `${longDate(product.closeDate)} pukul ${product.closeTime} WIB`
        : base?.tutupPODetail || `${longDate(product.closeDate)} pukul 23:59 WIB`,
      estimatedShipment: product.readyEstimate || '-',
      overlayText: `Tutup PO ${longDate(product.closeDate)}`,
      minDpPercent: num(product.dpPct) || base?.minDpPercent || 50,
      dpPct: num(product.dpPct) || base?.dpPct || 50,
      pelunasanDueDate: product.pelunasanDueDate || base?.pelunasanDueDate || '',
      openDate: product.openDate || base?.openDate || '',
      stockQuota: base && base.stockQuota != null ? base.stockQuota : quotaSum,
      paymentStages:
        cleanPaymentStages(product.paymentStages) ||
        cleanPaymentStages(base?.paymentStages) ||
        normalizePaymentStages(),
      models: mergedModels.length ? mergedModels : DEFAULT_MODELS,
      sizes: mergedSizes.length ? mergedSizes : DEFAULT_SIZES,
      colors: mergedColors.length ? mergedColors : DEFAULT_COLORS,
      variants: variants.map((v) => ({
        id: v.id,
        color: v.color,
        model: v.model,
        size: String(v.size ?? ''),
        price: priceOfVariant(v),
        addon: addonOfVariant(v)
      })),
      image: product.image || base?.image || FALLBACK_IMAGE,
      thumbnails: base?.thumbnails || [product.image || FALLBACK_IMAGE],
      descriptionDetailed: base?.descriptionDetailed || { summary: product.description || '' },
      store: base?.store || DEFAULT_STORE
    };
  });
};

const BRAND_METAS = {
  'Coverme Hijab': { supplier: 'Gaya Hijab Factory', address: 'Solo', discountDBAll: 30, discountSubDB: 25, discountAgen: 20, discountReseller: 15 },
  'Isa Luxury': { supplier: 'Hana Textile', address: 'Bandung', discountDBAll: 30, discountSubDB: 25, discountAgen: 20, discountReseller: 15 },
  'Kaen Boutique': { supplier: 'Sentra Konveksi Pekalongan', address: 'Pekalongan', discountDBAll: 30, discountSubDB: 25, discountAgen: 20, discountReseller: 15 },
  'Dalanova': { supplier: 'Garmen Nusantara Bogor', address: 'Bogor', discountDBAll: 30, discountSubDB: 25, discountAgen: 20, discountReseller: 15 },
  'Babyjab Hijab': { supplier: 'Bandung Garment', address: 'Bandung', discountDBAll: 30, discountSubDB: 25, discountAgen: 20, discountReseller: 15 }
};

export const projectBrandsToCore = (brands) =>
  (brands || [])
    .filter((brand) => brand.id !== 'all')
    .map((brand) => {
      const meta = BRAND_METAS[brand.name] || {};
      return {
        id: brand.id,
        name: brand.name,
        supplier: brand.supplier || meta.supplier || 'Gaya Hijab Factory',
        address: brand.address || meta.address || 'Solo',
        discountType: brand.discountType || 'pct',
        discountValue: brand.discountValue ?? meta.discountValue ?? 30,
        feeType: brand.feeType || 'pct',
        discountDBAll: brand.discountDBAll ?? meta.discountDBAll ?? 30,
        discountSubDB: brand.discountSubDB ?? meta.discountSubDB ?? 25,
        discountAgen: brand.discountAgen ?? meta.discountAgen ?? 20,
        discountReseller: brand.discountReseller ?? meta.discountReseller ?? 15,
        active: true,
        createdAt: todayISO()
      };
    });

export const coreBrandsToProject = (coreBrands, prevBrands) => {
  const prev = (prevBrands || []).filter((b) => b.id !== 'all');
  const byId = new Map(prev.map((b) => [String(b.id), b]));
  const rows = (coreBrands || []).map((brand) => ({
    id: brand.id,
    name: brand.name,
    count: byId.get(String(brand.id))?.count ?? 0
  }));
  return [{ id: 'all', name: 'Semua Brand', count: rows.reduce((sum, b) => sum + b.count, 0) }, ...rows];
};

export const buildMitraList = (coreOrders, seedMitra, currentUser) => {
  const map = new Map();
  (seedMitra || []).forEach((mitra) => map.set(mitra.name.toLowerCase(), { ...mitra }));
  (coreOrders || []).forEach((order) => {
    const key = String(order.mitraName || '').toLowerCase();
    if (!key) return;
    const existing = map.get(key);
    map.set(key, {
      id: order.mitraId || existing?.id || `m-${slug(order.mitraName)}`,
      name: order.mitraName,
      level: normalizeLevel(order.level || existing?.level),
      phone: order.phone || existing?.phone || '',
      city: order._projectMeta?.city || existing?.city || '',
      address: existing?.address || '',
      active: existing?.active ?? true,
      deposit: existing?.deposit || 0,
      joinedAt: existing?.joinedAt || order.date
    });
  });
  if (currentUser?.name) {
    const key = currentUser.name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        id: `m-${slug(currentUser.name)}`,
        name: currentUser.name,
        level: 'DB All',
        phone: currentUser.phone || '',
        city: 'Bekasi',
        address: currentUser.address || '',
        active: true,
        deposit: 0,
        joinedAt: todayISO()
      });
    }
  }
  return [...map.values()];
};

export const couriersToCore = (couriers) =>
  (couriers || []).map((courier) => ({
    ...courier,
    code: courier.code || String(courier.name || '').slice(0, 3).toUpperCase(),
    createdAt: courier.createdAt || todayISO()
  }));

export const paymentToCorePatch = (order, payment) => {
  const title = String(payment?.title || '').toLowerCase();
  const kind = title.includes('ongkir')
    ? 'ongkir'
    : title.includes('pelunasan') || title.includes('lunas')
    ? 'pelunasan'
    : title.includes('dp')
    ? 'dp'
    : !order.dpStatus || order.dpStatus !== PAY.ACC
    ? 'dp'
    : order.pelunasanStatus !== PAY.ACC
    ? 'pelunasan'
    : 'ongkir';

  if (kind === 'dp') {
    return {
      dpStatus: PAY.MENUNGGU,
      dpProof: payment.image || '',
      dpNominal: num(payment.nominal) || order.dpNominal,
      dpSubmittedAt: todayISO()
    };
  }
  if (kind === 'pelunasan') {
    return {
      pelunasanStatus: PAY.MENUNGGU,
      pelunasanProof: payment.image || '',
      pelunasanSubmittedNominal: num(payment.nominal),
      pelunasanSubmittedAt: todayISO()
    };
  }
  return {
    ongkirStatus: PAY.MENUNGGU,
    ongkirProof: payment.image || '',
    ongkirSubmittedNominal: num(payment.nominal),
    ongkirSubmittedAt: todayISO()
  };
};

export const projectPaymentToCoreOrder = (coreOrders, payment) => {
  const orderNo = String(payment?.orderNo || '');
  return (coreOrders || []).map((order) => {
    if (order.invoice !== orderNo && !orderNo.includes(order.invoice)) return order;
    return { ...order, ...paymentToCorePatch(order, payment) };
  });
};

export const paymentToDeposit = (payment) => ({
  id: `dep-${payment.id || Date.now()}`,
  date: parseProjectDate(payment.date),
  mitraName: String(payment.mitraName || 'HENI').replace(/\s*\(.*\)\s*$/, ''),
  nominal: num(payment.nominal),
  bank: payment.bank || '-',
  proof: payment.image || '',
  status: PAY.MENUNGGU,
  verifiedBy: '',
  note: payment.note || 'Top up deposit saldo mitra'
});

export const exportAt = longDate;
