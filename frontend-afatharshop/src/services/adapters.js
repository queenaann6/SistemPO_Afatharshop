import {
  DEFAULT_COLORS,
  DEFAULT_MODELS,
  DEFAULT_SIZES,
  DEFAULT_STORE
} from '../data/mockData';
import { mediaUrl } from './api';
import { DEFAULT_DP_PCT, terminPlanFor } from '../utils/terminScheme';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80';

const COLOR_HEX = {
  'NOIR MATTE': '#1C1917',
  'OYSTER WHITE': '#F5F5F4',
  'PLUMBERRY LUX': '#581C87',
  'SANDY COCOA': '#A87A5B',
  'VINTAGE MERLOT': '#831843'
};

const BRAND_ID_MAP = {
  'coverme hijab': 'coverme',
  'isa luxury': 'isa',
  'kaen boutique': 'kaen',
  dalanova: 'dalanova',
  'babyjab hijab': 'babyjab'
};

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item';

const unique = (list) => [...new Set((list || []).filter(Boolean))];

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatRupiah = (value) =>
  'Rp ' + Math.round(toNumber(value)).toLocaleString('id-ID');

const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const formatDisplayDate = (val) => {
  if (!val || val === '-' || val === '—') return '—';
  const str = String(val).trim();

  // If already Indonesian format like "20 November 2026" or "12 Nov 2026"
  if (/^\d{1,2}\s+[A-Za-z]+(\s+\d{4})?/.test(str)) {
    return str.replace(/(\s+\d{2}:\d{2}(:\d{2})?.*)$/, '').trim();
  }

  // If ISO datetime with time component (contains 'T' or ':')
  if (str.includes('T') || (str.includes(':') && /\d{4}/.test(str))) {
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 1970) {
      try {
        return parsed.toLocaleDateString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      } catch {
        return parsed.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    }
  }

  // If format starts with YYYY-MM-DD
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    const day = Number(m[3]);
    if (year <= 1970) return '—';
    return `${day} ${INDO_MONTHS[monthIndex] || ''} ${year}`;
  }

  // Fallback Date parse
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 1970) {
    return `${parsed.getDate()} ${INDO_MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
  }

  return str;
};

export const brandIdFor = (brandName) => {
  return slugify(brandName);
};

const colorOption = (name) => {
  const upper = String(name || '').toUpperCase();
  return {
    name: name || 'Default',
    hex: COLOR_HEX[upper] || '#CBD5E1'
  };
};

export const mapBrand = (brand) => ({
  id: brandIdFor(brand.name),
  backendId: brand.id,
  name: brand.name,
  count: toNumber(brand.products_count),
  logo: brand.logo || null
});

export const mapBrands = (brands = []) => {
  const mapped = brands.map(mapBrand);
  const total = mapped.reduce((sum, brand) => sum + brand.count, 0);

  return [{ id: 'all', name: 'Semua Brand', count: total }, ...mapped];
};

export const mapCategoryNames = (categories = []) =>
  categories.map((category) => category.name).filter(Boolean);

export const mapProduct = (product) => {
  const prices = Array.isArray(product.prices) ? product.prices : [];
  const priceValues = prices.map((row) => toNumber(row.price)).filter((value) => value > 0);
  const explicitPrice = product.user_price ?? product.userPrice ?? product.price ?? product.selling_price ?? product.sellingPrice ?? product.original_price ?? product.originalPrice;
  const basePrice = toNumber(
    explicitPrice,
    priceValues.length ? Math.min(...priceValues) : 0
  );
  const maxPrice = toNumber(product.price_max ?? product.priceMax, priceValues.length ? Math.max(...priceValues) : basePrice);
  // Jadwal termin katalog adalah sumber persen; min_dp_percent hanya cadangan.
  const paymentStages = terminPlanFor(product);
  const dpPct = paymentStages[0]?.pct || 0;

  const rawVariants = Array.isArray(product.variants) ? product.variants : [];
  const variantModels = unique(rawVariants.map((variant) => variant.model));
  const variantSizes = unique(rawVariants.map((variant) => variant.size));
  const variantColors = unique(rawVariants.map((variant) => variant.color));

  const rawCloseStr = String(product.tutup_po_iso || product.tutup_po || product.close_date || product.closeDate || '').trim();

  let closeIso = '';
  const dateMatch = rawCloseStr.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    closeIso = dateMatch[1];
  }

  let closeTime = '23:59';
  if (product.close_time) {
    closeTime = String(product.close_time).slice(0, 5);
  } else if (rawCloseStr.includes('T') && rawCloseStr.split('T')[1]) {
    closeTime = rawCloseStr.split('T')[1].slice(0, 5);
  } else if (rawCloseStr.includes(' ') && rawCloseStr.split(' ')[1]) {
    closeTime = rawCloseStr.split(' ')[1].slice(0, 5);
  }

  // Cek apakah waktu saat ini telah melewati batas hari & jam tutup PO
  let isExpiredByTime = false;
  if (closeIso) {
    const timeIso = rawCloseStr.includes('+') || rawCloseStr.endsWith('Z')
      ? rawCloseStr
      : `${closeIso}T${closeTime}:00+07:00`;
    const closeTimestamp = new Date(timeIso).getTime();
    if (!Number.isNaN(closeTimestamp) && closeTimestamp <= Date.now()) {
      isExpiredByTime = true;
    }
  }

  const isClosed = Boolean(
    product.is_closed === true ||
    product.isClosedPO === true ||
    ['closed_po', 'closed'].includes(product.status) ||
    isExpiredByTime
  );
  const status = isClosed ? 'closed_po' : (product.status === 'ready_stock' ? 'ready_stock' : 'pre_order');

  const displayCloseDate = closeIso
    ? formatDisplayDate(closeIso)
    : (product.tutup_po && !product.tutup_po.includes('T') && !product.tutup_po.includes('+') ? formatDisplayDate(product.tutup_po) : '—');

  const displayTutupPO = displayCloseDate !== '—' ? displayCloseDate : '-';
  const displayTutupPODetail = displayCloseDate !== '—' ? `${displayCloseDate} pukul ${closeTime} WIB` : '-';
  const overlayText = displayCloseDate !== '—' ? `Tutup PO ${displayCloseDate}` : '';

  const displayEstimatedShipment = (product.estimated_shipment && !String(product.estimated_shipment).startsWith('1970'))
    ? (/^\d{4}-\d{2}-\d{2}/.test(String(product.estimated_shipment)) ? formatDisplayDate(product.estimated_shipment) : String(product.estimated_shipment))
    : '-';
  const openDate = product.open_date || product.openDate || (product.batch?.start_date ? String(product.batch.start_date).slice(0, 10) : '');

  return {
    id: product.id,
    backendId: product.id,
    title: product.title || product.name,
    series: product.series || 'PRE-ORDER COLLECTION • 2027 SERIES',
    sku: product.article_code || product.title || product.name,
    brand: String(product.brand || '').toUpperCase(),
    brandId: brandIdFor(product.brand),
    category: product.category || 'Gamis & Abaya',
    price: basePrice,
    userPrice: toNumber(product.user_price ?? product.userPrice ?? basePrice),
    priceMin: basePrice,
    priceMax: maxPrice,
    sellingPrice: Number(
      product.selling_price ||
      product.sellingPrice ||
      product.original_price ||
      product.originalPrice ||
      basePrice
    ),
    originalPrice: Number(
      product.original_price ||
      product.originalPrice ||
      product.selling_price ||
      product.sellingPrice ||
      basePrice
    ),
    discountPercent: Number(
      product.discount_percent ??
      product.discountPercent ??
      0
    ),
    isSale: Boolean(
      product.is_sale === true ||
      product.is_sale === 1 ||
      product.is_sale === '1' ||
      product.isSale === true ||
      (product.discount_percent && Number(product.discount_percent) > 0) ||
      (product.discountPercent && Number(product.discountPercent) > 0)
    ),
    status,
    statusLabel: status === 'closed' ? 'PO Ditutup' : 'Open Pre-Order',
    tutupPO: displayTutupPO,
    tutupPODetail: displayTutupPODetail,
    closeDate: closeIso,
    closeTime,
    openDate,
    estimatedShipment: displayEstimatedShipment,
    overlayText,
    minDpPercent: dpPct,
    dpPct,
    pelunasanDueDate: '',
    stockQuota: toNumber(product.stock_quota),
    terminCount: paymentStages.length,
    paymentStages,
    models: (variantModels.length ? variantModels : DEFAULT_MODELS.map((model) => model.name)).map(
      (name) => ({ name, price: basePrice })
    ),
    sizes: variantSizes.length ? variantSizes : DEFAULT_SIZES,
    colors: (variantColors.length ? variantColors : DEFAULT_COLORS.map((color) => color.name)).map(
      colorOption
    ),
    variants: rawVariants.map((variant) => {
      const vSellingPrice = toNumber(
        variant.selling_price ||
        variant.sellingPrice ||
        variant.original_price ||
        variant.originalPrice ||
        variant.price ||
        basePrice
      );
      const vUserPrice = (variant.user_price !== undefined || variant.userPrice !== undefined)
        ? toNumber(variant.user_price ?? variant.userPrice)
        : null;

      return {
        id: variant.id,
        color: variant.color,
        model: variant.model,
        size: String(variant.size ?? ''),
        price: vSellingPrice,
        sellingPrice: vSellingPrice,
        originalPrice: vSellingPrice,
        userPrice: vUserPrice,
        userFee: toNumber(variant.user_fee || variant.userFee || 0),
        addon: toNumber(variant.addon || 0)
      };
    }),
    image: mediaUrl(product.image) || FALLBACK_IMAGE,
    image2: mediaUrl(product.image2),
    image3: mediaUrl(product.image3),
    image4: mediaUrl(product.image4),
    image5: mediaUrl(product.image5),
    image6: mediaUrl(product.image6),
    reelUrl: mediaUrl(product.reel_url || product.reelUrl),
    videoUrl: mediaUrl(product.reel_url || product.reelUrl),
    thumbnails: (() => {
      const raw = [
        product.image,
        product.image2,
        product.image3,
        product.image4,
        product.image5,
        product.image6,
        ...(Array.isArray(product.thumbnails) ? product.thumbnails : [])
      ]
        .filter(Boolean)
        .map((img) => mediaUrl(img))
        .filter(Boolean);
      const set = Array.from(new Set(raw));
      return set.length ? set : [mediaUrl(product.image) || FALLBACK_IMAGE];
    })(),
    material: product.material_detail || product.materialDetail || product.material || '',
    materialDetail: product.material_detail || product.materialDetail || product.material || '',
    description: product.description || '',
    descriptionDetailed: {
      summary: product.description || '',
      materialGamis: product.material_detail || '',
      materialKoko: '',
      fiturGamis: '',
      fiturKoko: '',
      panduanMomDad: '',
      panduanKids: '',
      toleransi: 'Toleransi jahitan ± 1-2 cm'
    },
    store: DEFAULT_STORE,
    backendMeta: {
      brandId: product.brand_id,
      categoryId: product.category_id,
      batch: product.batch,
      prices
    }
  };
};

export const mapProducts = (payload) => {
  const list = Array.isArray(payload?.data) ? payload.data : [];
  return list.map(mapProduct);
};

export const roleIdFromApiUser = (user) => {
  const raw = String(user?.role || user?.level || '').toLowerCase();

  if (raw.includes('owner') || raw.includes('direksi')) return 'owner';
  if (raw.includes('finance') || raw.includes('keuangan')) return 'finance';
  if (raw.includes('marketing') || raw.includes('purchasing') || raw.includes('mkt')) {
    return 'marketing';
  }

  return 'mitra';
};

export const normalizeLevel = (level) => {
  const text = String(level || '').toLowerCase().trim();
  if (text.includes('sub')) return 'Sub DB';
  if (text.includes('agen')) return 'Agen';
  if (text.includes('reseller')) return 'Reseller';
  return 'DB All';
};

export const mapApiUser = (user, fallback = {}) => {
  if (!user) return null;

  const rawId = user.id || fallback.id || null;
  const formattedMitraId =
    user.mitra_id ||
    user.id_mitra ||
    (rawId ? `MTR-${String(rawId).padStart(3, '0')}` : (fallback.mitraId || fallback.id_mitra || 'MTR-001'));

  return {
    id: rawId,
    mitraId: formattedMitraId,
    id_mitra: formattedMitraId,
    name: user.name || user.nama || fallback.name || 'Mitra',
    role: user.role || user.level || fallback.role || 'Mitra Distributor',
    roleId: roleIdFromApiUser(user),
    level: normalizeLevel(user.level || fallback.level || 'DB All'),
    avatar: (user.avatar && !user.avatar.includes('unsplash.com')) ? user.avatar : (fallback.avatar && !fallback.avatar.includes('unsplash.com') ? fallback.avatar : ''),
    balance: formatRupiah(user.deposit_balance ?? 0),
    deposit_balance: user.deposit_balance,
    totalBill: fallback.totalBill || 'Rp 0',
    phone: user.phone || fallback.phone || '',
    email: user.email || fallback.email || '',
    city: user.city || fallback.city || '',
    address: user.address || user.city || fallback.address || ''
  };
};

export const mapCourier = (courier) => ({
  id: courier.code || `c-${courier.id}`,
  backendId: courier.id,
  name: courier.name,
  active: courier.is_active !== false,
  note: courier.description || ''
});

export const mapBankAccount = (account) => {
  let brands = [];
  if (Array.isArray(account.brands)) {
    brands = account.brands;
  } else if (typeof account.brands === 'string' && account.brands.trim()) {
    try {
      const parsed = JSON.parse(account.brands);
      brands = Array.isArray(parsed) ? parsed : [account.brands];
    } catch {
      brands = account.brands.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  return {
    id: String(account.id),
    backendId: account.id,
    bank: account.bank_name,
    accountNo: account.account_number,
    holder: account.account_holder,
    active: account.is_active !== false,
    type: account.type || 'public',
    purpose: account.purpose || '',
    brands
  };
};

const PAY_STATUS = {
  acc: 'ACC',
  pending: 'Menunggu Verifikasi',
  rejected: 'Ditolak',
  none: 'Belum'
};

const normalizePaymentStatus = (status) => {
  const text = String(status || '').toLowerCase();
  if (text.includes('ditolak') || text.includes('tolak') || text.includes('reject')) {
    return 'Ditolak';
  }
  if (text.includes('disetujui') || text.includes('lunas') || text.includes('dibayar')) {
    return 'ACC';
  }
  if (text.includes('menunggu') || text.includes('pending')) {
    return 'Menunggu Verifikasi';
  }
  return 'Belum';
};

// Nilai status yang dibandingkan poCore.orderStage (MKT.PENDING/ACC/TOLAK).
const MARKETING_PENDING = 'Menunggu ACC';
const MARKETING_ACC = 'ACC';
const MARKETING_REJECTED = 'Ditolak';

/**
 * Status backend pesanan (VARCHAR) diterjemahkan ke label yang dipakai
 * tabel pesanan dashboard. Urutan cek penting: 'Menunggu ACC Marketing'
 * memuat kata 'acc' tapi berarti menunggu ACC, bukan sudah di-ACC.
 */
const resolveProjectStatus = (rawStatus, { paid, invoiceLunas, dpStage, isReady, hasOngkir }) => {
  const text = String(rawStatus || '').toLowerCase();

  if (/batal|tolak/.test(text)) return 'Batal';
  if (/menunggu\s*acc/.test(text)) return 'Menunggu ACC Admin';
  if (/selesai/.test(text)) return 'Selesai';
  if (/dikirim|terkirim/.test(text)) return 'Dikirim';
  if (/siap\s*kirim/.test(text) || invoiceLunas || (/lunas/.test(text) && !text.includes('belum') && !text.includes('pelunasan'))) return 'Lunas (Siap Kirim)';
  if (/pelunasan/.test(text)) return 'Menunggu Pelunasan + Ongkir';
  if (/ongkir/.test(text)) return 'Menunggu Input Ongkir';
  if (/alamat/.test(text) || text.includes('ready') || isReady) return 'Menunggu Alamat Mitra';
  if (/pengiriman|resi/.test(text)) return 'Lunas (Siap Kirim)';
  if (/produksi/.test(text)) return 'Dalam Produksi';
  if (/dp/.test(text)) {
    if (dpStage === 'Menunggu Verifikasi') return 'Menunggu Verifikasi DP';
    return paid > 0 ? 'Dalam Produksi' : 'Menunggu Pembayaran DP';
  }

  return 'Menunggu ACC Admin';
};

export const mapOrderToProjectOrder = (order, user = {}) => {
  const owner = order.user || user || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const firstItem = items[0] || {};
  const product = firstItem.variant?.product || {};
  const installments = Array.isArray(order.invoice?.installments)
    ? order.invoice.installments
    : [];
  const payments = Array.isArray(order.invoice?.payments) ? order.invoice.payments : [];
  const total = toNumber(order.total_amount);
  const shipping = toNumber(order.shipping_cost);
  const subtotal = toNumber(order.subtotal, Math.max(0, total - shipping));
  const dpRow = installments.find((row) => row.type === 'dp');
  const pelunasanRow = installments.find((row) => row.type === 'pelunasan');
  // Termin dibagi di atas subtotal produk; ongkir ditagih terpisah.
  const stageBase = subtotal > 0 ? subtotal : total;
  const dpPct =
    stageBase > 0 && dpRow ? Math.round((toNumber(dpRow.amount) / stageBase) * 100) : DEFAULT_DP_PCT;

  const paid = toNumber(order.invoice?.paid_amount);
  const invoiceStatus = String(order.invoice?.status || '').toLowerCase();
  const orderStatus = String(order.status || '').toLowerCase();

  // "belum_lunas" juga mengandung kata "lunas", jadi harus dikecualikan.
  const invoiceLunas = invoiceStatus.startsWith('lunas');
  const orderLunas = orderStatus.includes('lunas') && !orderStatus.includes('belum');
  const orderRejected = orderStatus.includes('batal') || orderStatus.includes('tolak');

  const stageStatus = (row) => {
    if (!row) return PAY_STATUS.none;
    const byInstallment = normalizePaymentStatus(row.status);
    if (byInstallment === 'ACC' || toNumber(row.paid_amount) > 0) return 'ACC';

    const related = payments.filter(
      (payment) => Number(payment.installment_id) === Number(row.id)
    );
    const lastPay = related[related.length - 1] || null;
    if (lastPay) {
      const lastStatus = normalizePaymentStatus(lastPay.status);
      if (lastStatus !== 'Belum') return lastStatus;
    }
    return byInstallment;
  };

  // Bukti bayar tersimpan di baris payments; unggahan tahap ongkir tidak punya
  // baris cicilan sehingga installment_id-nya kosong.
  const lastPaymentFor = (row) => {
    if (!row) return null;
    const related = payments.filter(
      (payment) => Number(payment.installment_id) === Number(row.id)
    );
    return related[related.length - 1] || null;
  };
  const stagelessPayment =
    payments.filter((payment) => !payment.installment_id).slice(-1)[0] || null;
  const dpPayment = lastPaymentFor(dpRow);
  const pelunasanPayment = lastPaymentFor(pelunasanRow);

  const isDepositPayment = (p) => {
    if (!p) return false;
    const proof = String(p.proof_url || '').toUpperCase();
    const bName = String(p.bank_name || p.bank || '').toLowerCase();
    const method = String(p.method || '').toLowerCase();
    return method === 'deposit' || proof === 'DEPOSIT' || bName.includes('deposit') || (!p.proof_url && p.status === 'disetujui');
  };

  const isDpDep = isDepositPayment(dpPayment) || String(order.dpBank || '').toLowerCase().includes('deposit') || String(order.dpNote || '').toLowerCase().includes('deposit');
  const dpDateVal = dpPayment?.verified_at || dpPayment?.uploaded_at || dpPayment?.created_at || order.dpPaidAt || order.dpDate || order.dpVerifiedAt || order.dpSubmittedAt || '';

  const isPelunasanDep = isDepositPayment(pelunasanPayment) || String(order.pelunasanBank || '').toLowerCase().includes('deposit') || String(order.pelunasanNote || '').toLowerCase().includes('deposit');
  const pelunasanDateVal = pelunasanPayment?.verified_at || pelunasanPayment?.uploaded_at || pelunasanPayment?.created_at || order.pelunasanPaidAt || order.pelunasanDate || order.pelunasanVerifiedAt || order.pelunasanSubmittedAt || '';

  const isOngkirDep = isDepositPayment(stagelessPayment) || String(order.ongkirBank || '').toLowerCase().includes('deposit') || String(order.ongkirNote || '').toLowerCase().includes('deposit');
  const ongkirDateVal = stagelessPayment?.verified_at || stagelessPayment?.uploaded_at || stagelessPayment?.created_at || order.ongkirPaidAt || order.ongkirDate || order.ongkirVerifiedAt || order.ongkirSubmittedAt || '';

  const isReady = String(order.production_status || '').toLowerCase() === 'ready';
  const aturSebelumKirim = order.atur_sebelum_kirim !== undefined
    ? Boolean(order.atur_sebelum_kirim)
    : (!shipping || shipping === 0 || String(order.courier_name || '').toLowerCase().includes('sebelum'));
  const hasOngkir = !aturSebelumKirim && shipping > 0;
  const statusLower = String(order.status || '').toLowerCase();
  const isAddressSubmitted = Boolean(
    order.address_id &&
      (hasOngkir ||
        order.ongkir_at ||
        order.shipped_at ||
        order.received_at ||
        order.tracking_number ||
        statusLower.includes('ongkir') ||
        statusLower.includes('pelunasan') ||
        statusLower.includes('siap') ||
        statusLower.includes('dikirim') ||
        statusLower.includes('terkirim') ||
        statusLower.includes('selesai'))
  );

  const status = resolveProjectStatus(order.status, {
    paid,
    invoiceLunas,
    dpStage: stageStatus(dpRow),
    isReady,
    hasOngkir
  });

  const address = order.address
    ? [
        order.address.recipient_name,
        order.address.address_line,
        order.address.city,
        order.address.province
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  const batchesFromItems = items
    .map((item) => item.variant?.product?.batch)
    .filter(Boolean);
  const batchCloseIso = batchesFromItems
    .map((b) => b.close_date || '')
    .filter(Boolean)
    .sort()[0] || '';
  const batchClosed = batchesFromItems.some(
    (b) =>
      String(b.status || '').toLowerCase() === 'closed' ||
      (b.close_date && new Date(b.close_date).getTime() < Date.now())
  );
  const closeDateFormatted = batchCloseIso
    ? new Date(batchCloseIso).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    : '';

  const mappedItems = items.map((item, index) => {
    const qty = toNumber(item.quantity, 1);
    const unitPrice = toNumber(item.unit_price);
    const fee = toNumber(item.fee);
    // Baris tua tidak punya kolom diskon/addon: fee negatif = potongan,
    // fee positif = biaya tambahan.
    const discountNominal = toNumber(item.discount_nominal) || Math.max(0, -fee);
    const addonNominal = toNumber(item.addon_nominal) || Math.max(0, fee);
    const netSubtotal = Math.max(
      0,
      Math.round(
        item.net_subtotal !== undefined && item.net_subtotal !== null
          ? toNumber(item.net_subtotal)
          : toNumber(item.subtotal, unitPrice * qty - discountNominal + addonNominal)
      )
    );
    const isLegacyNetUnitPrice =
      discountNominal > 0 &&
      Math.abs(unitPrice * qty + addonNominal - netSubtotal) <= 2 &&
      Math.abs(unitPrice * qty - discountNominal + addonNominal - netSubtotal) > 2;
    const effectiveGrossPrice =
      isLegacyNetUnitPrice && qty > 0
        ? Math.round((unitPrice * qty + discountNominal) / qty)
        : unitPrice;
    const gross = effectiveGrossPrice * qty;
    return {
      id: item.id ?? index + 1,
      variantId: item.variant?.id ?? item.product_variant_id ?? null,
      productId: item.variant?.product?.id ?? null,
      splits: Array.isArray(item.splits) ? item.splits : [],
      addressId: item.address_id ?? null,
      title: item.variant?.product?.name || product.name || 'Item PO',
      variant:
        [item.variant?.color, item.variant?.model, item.variant?.size]
          .filter(Boolean)
          .join('/') || 'All Varian',
      color: item.variant?.color || '',
      model: item.variant?.model || '',
      size: item.variant?.size || '',
      price: effectiveGrossPrice,
      qty,
      fee,
      discountNominal,
      discountPct: gross > 0 ? Math.round((discountNominal / gross) * 100) : 0,
      addon: qty > 0 ? Math.round(addonNominal / qty) : 0,
      addonNominal,
      subtotal: netSubtotal,
      image: mediaUrl(item.variant?.product?.image || product.image) || FALLBACK_IMAGE
    };
  });

  const feeMitraNominal = mappedItems.reduce((sum, it) => sum + (it.discountNominal || 0), 0);
  const addonNominal = mappedItems.reduce((sum, it) => sum + (it.addonNominal || 0), 0);
  const brandDiscountNominal = feeMitraNominal > 0 ? Math.round(feeMitraNominal * 1.5) : 0;
  const feeCompanyNominal = Math.max(0, brandDiscountNominal - feeMitraNominal);

  return {
    orderNo: order.order_number || `PO-${order.id}`,
    id: order.id,
    backendId: order.id,
    invoiceId: order.invoice?.id ?? null,
    invoiceNumber: order.invoice?.invoice_number || '',
    dbStatus: order.status || '',
    productionStatus: order.production_status || (isReady ? 'Ready' : (paid > 0 || stageStatus(dpRow) === 'ACC') ? 'Produksi' : 'Antrian'),
    readyAt: order.ready_at || (isReady ? (order.updated_at || order.ordered_at) : ''),
    addressConfirmed: isAddressSubmitted,
    addressSubmitted: isAddressSubmitted,
    trackingNumber: order.tracking_number || '',
    addressId: order.address?.id ?? null,
    addressObject: order.address ? mapAddressToBook(order.address) : null,
    dpInstallmentId: dpRow?.id ?? null,
    pelunasanInstallmentId: pelunasanRow?.id ?? null,
    installmentIds: installments.reduce(
      (acc, row) => ({ ...acc, [row.type]: row.id, [`stage-${row.sequence_number}`]: row.id }),
      {}
    ),
    brand: product.brand?.name || '',
    brandName: product.brand?.name || '',
    title: product.name || 'Pesanan PO',
    date: order.ordered_at || order.created_at ? formatDisplayDate(order.ordered_at || order.created_at) : '',
    dateRaw: order.ordered_at || order.created_at || '',
    status,
    marketingStatus:
      order.marketing_status ||
      (status === 'Menunggu ACC Admin'
        ? MARKETING_PENDING
        : orderRejected
          ? MARKETING_REJECTED
          : MARKETING_ACC),
    marketingBy: order.marketing_by || '',
    marketingAt: order.marketing_at || '',
    marketingNote: order.marketing_note || '',
    subtotal,
    ongkir: aturSebelumKirim ? 0 : shipping,
    weight: order.weight_kg !== null && order.weight_kg !== undefined ? toNumber(order.weight_kg) : '',
    shippingNote: order.shipping_note || '',
    ongkirAt: order.ongkir_at || '',
    shippedAt: order.shipped_at || '',
    receivedAt: order.received_at || '',
    deletedAt: order.deleted_at || '',
    deletedBy: order.deleted_by || '',
    deleteReason: order.delete_reason || '',
    total,
    paidAmount: paid,
    dpStatus: orderRejected ? 'Ditolak' : stageStatus(dpRow),
    pelunasanStatus: stageStatus(pelunasanRow),
    ongkirStatus: stagelessPayment ? normalizePaymentStatus(stagelessPayment.status) : (orderLunas ? 'ACC' : 'Belum'),
    dpProof: mediaUrl(dpPayment?.proof_url || ''),
    pelunasanProof: mediaUrl(pelunasanPayment?.proof_url || ''),
    ongkirProof: mediaUrl(stagelessPayment?.proof_url || ''),
    dpPaymentId: dpPayment?.id ?? null,
    pelunasanPaymentId: pelunasanPayment?.id ?? null,
    ongkirPaymentId: stagelessPayment?.id ?? null,
    dpNote: dpPayment?.rejection_reason || dpPayment?.note || order.dpNote || '',
    pelunasanNote: pelunasanPayment?.rejection_reason || pelunasanPayment?.note || order.pelunasanNote || '',
    ongkirNote: stagelessPayment?.rejection_reason || stagelessPayment?.note || order.ongkirNote || '',
    isDpDeposit: isDpDep,
    dpBank: isDpDep ? 'Deposit' : (dpPayment?.bank_name || order.dpBank || ''),
    dpBankAccount: isDpDep ? 'Saldo Deposit' : (dpPayment?.account_number || order.dpBankAccount || ''),
    dpVerifiedAt: dpPayment?.verified_at || order.dpVerifiedAt,
    dpSubmittedAt: dpPayment?.uploaded_at || dpPayment?.created_at || order.dpSubmittedAt,
    dpPaidAt: dpDateVal,
    dpDate: dpDateVal,
    isPelunasanDeposit: isPelunasanDep,
    pelunasanBank: isPelunasanDep ? 'Deposit' : (pelunasanPayment?.bank_name || order.pelunasanBank || ''),
    pelunasanBankAccount: isPelunasanDep ? 'Saldo Deposit' : (pelunasanPayment?.account_number || order.pelunasanBankAccount || ''),
    pelunasanVerifiedAt: pelunasanPayment?.verified_at || order.pelunasanVerifiedAt,
    pelunasanSubmittedAt: pelunasanPayment?.uploaded_at || pelunasanPayment?.created_at || order.pelunasanSubmittedAt,
    pelunasanPaidAt: pelunasanDateVal,
    pelunasanDate: pelunasanDateVal,
    isOngkirDeposit: isOngkirDep,
    ongkirBank: isOngkirDep ? 'Deposit' : (stagelessPayment?.bank_name || order.ongkirBank || ''),
    ongkirBankAccount: isOngkirDep ? 'Saldo Deposit' : (stagelessPayment?.account_number || order.ongkirBankAccount || ''),
    ongkirVerifiedAt: stagelessPayment?.verified_at || order.ongkirVerifiedAt,
    ongkirSubmittedAt: stagelessPayment?.uploaded_at || stagelessPayment?.created_at || order.ongkirSubmittedAt,
    ongkirPaidAt: ongkirDateVal,
    ongkirDate: ongkirDateVal,
    address,
    courier: order.courier_name || (aturSebelumKirim ? 'Ditentukan Sebelum Pengiriman' : ''),
    aturSebelumKirim,
    dpPct,
    dpNominal: toNumber(dpRow?.amount),
    paymentStages: installments
      .map((row, index) => {
        const related = payments.filter((p) => Number(p.installment_id) === Number(row.id));
        const lastPay = related[related.length - 1] || null;
        const stgStatus = stageStatus(row);
        const isDepStage = isDepositPayment(lastPay);
        return {
          id: row.id,
          type: row.type,
          sequence: row.sequence_number ?? index + 1,
          label:
            row.type === 'dp'
              ? (installments.length <= 2 ? 'DP' : 'DP 1')
              : row.type === 'pelunasan'
                ? 'Pelunasan'
                : (installments.length <= 2 ? 'Pelunasan' : `DP ${row.sequence_number || index + 1}`),
          pct: stageBase ? Math.round((toNumber(row.amount) / stageBase) * 100) : 0,
          amount: toNumber(row.amount),
          status: stgStatus,
          proof: mediaUrl(lastPay?.proof_url || ''),
          payment: lastPay ? {
            id: lastPay.id,
            status: normalizePaymentStatus(lastPay.status),
            image: mediaUrl(lastPay.proof_url || ''),
            bank: isDepStage ? 'Deposit' : (lastPay.bank_name || lastPay.bank_account?.bank_name || 'BCA (PT Afathar Niaga Indonesia)'),
            account: isDepStage ? 'Saldo Deposit' : (lastPay.account_number || lastPay.bank_account?.account_number || ''),
            method: isDepStage ? 'deposit' : 'transfer',
            date: lastPay ? (lastPay.verified_at || lastPay.uploaded_at || lastPay.created_at ? formatDisplayDate(lastPay.verified_at || lastPay.uploaded_at || lastPay.created_at) : '') : '',
            nominal: toNumber(lastPay.amount)
          } : null,
          date: row.due_at ? formatDisplayDate(row.due_at) : (row.due_date ? formatDisplayDate(row.due_date) : ''),
          dateRaw: row.due_at || row.due_date || ''
        };
      })
      .filter((stage) => stage.amount > 0 || stage.pct > 0),
    items: mappedItems,
    feeMitraNominal,
    brandDiscountNominal,
    feeCompanyNominal,
    addonNominal,
    mitraId: owner.id ? `m-${owner.id}` : '',
    mitraName: owner.name || owner.nama || '',
    mitraPhone: owner.phone || '',
    mitraLevel: owner.level || owner.role || '',
    mitraCity: owner.city || order.address?.city || '',
    mitraAddress: address,
    mitraEmail: owner.email || '',
    note: order.notes || '',
    image: mediaUrl(product.image) || FALLBACK_IMAGE,
    closeDate: closeDateFormatted || (product.closeDate || ''),
    closeDateRaw: batchCloseIso,
    isClosedPO: batchClosed || product.status === 'closed_po' || product.status === 'closed' || product.isClosedPO === true,
    invoiceOutstanding:
      order.invoice?.outstanding_amount !== undefined
        ? toNumber(order.invoice.outstanding_amount)
        : null
  };
};

export const buildOrderPayload = (order, items = []) => {
  const itemPayload = (Array.isArray(items) ? items : []).map((item) => {
    const variantId = Number(item.variantId);
    const productId = Number(item.productId ?? item.product_id ?? item.backendId ?? item.id);
    const qty = Math.max(1, toNumber(item.qty, 1));
    const feePerUnit = toNumber(item.feeNominal ?? 0);
    const netPrice = toNumber(item.price);
    const basePrice = toNumber(item.basePrice);
    const discountNominal = toNumber(item.discountNominal, feePerUnit * qty);
    const grossUnitPrice =
      basePrice > 0 ? basePrice : (discountNominal > 0 ? netPrice + Math.round(discountNominal / qty) : netPrice);
    const addonNominal = toNumber(item.addonTotal ?? (toNumber(item.addon) * qty));
    const subtotalLine = Math.max(
      0,
      Math.round(
        item.subtotal !== undefined && item.subtotal !== null
          ? toNumber(item.subtotal)
          : grossUnitPrice * qty - discountNominal + addonNominal
      )
    );
    const addressId = Number(item.addressId ?? item.address_id);
    return {
      product_variant_id:
        Number.isInteger(variantId) && variantId > 0 ? variantId : null,
      product_id:
        Number.isInteger(productId) && productId > 0 ? productId : null,
      quantity: qty,
      unit_price: grossUnitPrice,
      fee: addonNominal - discountNominal,
      discount_nominal: discountNominal,
      addon_nominal: addonNominal,
      subtotal: subtotalLine,
      address_id: Number.isInteger(addressId) && addressId > 0 ? addressId : undefined,
      splits: Array.isArray(item.splits) && item.splits.length ? item.splits : undefined,
      model: item.model || item.selectedModel || undefined,
      size: item.size || item.selectedSize || undefined,
      color: item.color || item.selectedColor || undefined
    };
  });

  const itemsTotal = itemPayload.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const subtotal = itemsTotal || toNumber(order.total);

  const addressId = Number(order.addressId);
  const aturSebelumKirim = order.aturSebelumKirim !== undefined ? Boolean(order.aturSebelumKirim) : true;
  const shippingCost = aturSebelumKirim ? 0 : toNumber(order.shippingCost ?? order.ongkir);
  const courierName = aturSebelumKirim
    ? 'Ditentukan Sebelum Pengiriman'
    : (order.courier || 'Ditentukan Sebelum Pengiriman');

  return {
    total_amount: toNumber(order.total) || subtotal,
    subtotal,
    shipping_cost: shippingCost,
    courier_name: courierName,
    atur_sebelum_kirim: aturSebelumKirim,
    notes: order.notes || null,
    address_id: Number.isInteger(addressId) && addressId > 0 ? addressId : null,
    is_split_address: Boolean(order.isSplitAddress),
    status: order.status || 'Menunggu ACC Marketing',
    items: itemPayload
  };
};

/* ------------------------------------------------------------------ data dashboard */

export const mapUserToMitra = (user) => {
  const rawId = user.id || null;
  const formattedMitraId =
    user.mitra_id ||
    user.id_mitra ||
    (rawId ? `MTR-${String(rawId).padStart(3, '0')}` : `m-${slugify(user.name || user.nama || 'mitra')}`);

  return {
    id: rawId ? `m-${rawId}` : `m-${slugify(user.name || user.nama || 'mitra')}`,
    backendId: rawId,
    mitraId: formattedMitraId,
    id_mitra: formattedMitraId,
    name: user.name || user.nama || '',
    email: user.email || '',
    level: normalizeLevel(user.level),
    phone: user.phone || '',
    city: user.city || '',
    address: user.address || '',
    active: user.is_active !== false,
    deposit: toNumber(user.deposit_balance),
    joinedAt: String(user.joined_at || '').slice(0, 10)
  };
};

export const mapUserToTeam = (user) => ({
  id: user.id ? `u-${user.id}` : `u-${slugify(user.name || user.nama)}`,
  backendId: user.id,
  name: user.name || user.nama || '',
  email: user.email || '',
  role: roleIdFromApiUser(user),
  phone: user.phone || '',
  active: user.is_active !== false,
  createdAt: String(user.joined_at || '').slice(0, 10),
  createdBy: 'System'
});

export const mapSupplier = (supplier) => ({
  id: supplier.id ? `s-${supplier.id}` : `s-${slugify(supplier.name)}`,
  backendId: supplier.id,
  name: supplier.name,
  city: supplier.city || '',
  contact: supplier.contact_person || supplier.contact || '',
  phone: supplier.phone || '',
  note: Array.isArray(supplier.brands) ? supplier.brands.map((b) => b.name || b).join(', ') : (supplier.note || ''),
  createdAt: String(supplier.created_at || '').slice(0, 10)
});

export const mapBrandToCore = (brand) => {
  const supplierName = brand.supplier_name || (typeof brand.supplier === 'object' ? brand.supplier?.name : brand.supplier) || '';
  const supplierCity = brand.address || (typeof brand.supplier === 'object' ? brand.supplier?.city : '') || 'Solo';
  return {
    id: brand.id ? `b-${brand.id}` : (brand.id || `b-${slugify(brand.name)}`),
    backendId: brand.id,
    name: brand.name,
    supplier: supplierName,
    supplier_id: brand.supplier_id || (typeof brand.supplier === 'object' ? brand.supplier?.id : null),
    address: supplierCity,
    discountType: brand.discount_type || brand.discountType || 'pct',
    discountValue: toNumber(brand.discount_value ?? brand.discountValue ?? brand.discount_db_all ?? brand.discountDBAll, 30),
    feeType: brand.fee_type || brand.feeType || 'pct',
    discountDBAll: toNumber(brand.discount_db_all ?? brand.discountDBAll, 30),
    discountSubDB: toNumber(brand.discount_sub_db ?? brand.discountSubDB, 25),
    discountAgen: toNumber(brand.discount_agen ?? brand.discountAgen, 20),
    discountReseller: toNumber(brand.discount_reseller ?? brand.discountReseller, 15),
    active: brand.is_active !== false && brand.active !== false,
    createdAt: String(brand.created_at || '').slice(0, 10)
  };
};

export const mapDepositToCore = (deposit) => ({
  id: deposit.id ? `dep-${deposit.id}` : `dep-${Date.now()}`,
  backendId: deposit.id,
  mitraId: deposit.mitra_id ? `m-${deposit.mitra_id}` : '',
  date: String(deposit.created_at || '').slice(0, 10),
  mitraName: deposit.mitra_name || '',
  nominal: toNumber(deposit.amount),
  bank: deposit.bank || '-',
  accountNo: deposit.bank_account || '',
  proof: mediaUrl(deposit.proof_url),
  status: normalizePaymentStatus(deposit.status),
  verifiedBy: deposit.verified_by || '',
  note: deposit.description || 'Top up saldo deposit mitra'
});

const LEDGER_TYPE = {
  dp: 'DP',
  cicilan: 'Cicilan',
  pelunasan: 'Pelunasan',
  ongkir: 'Ongkir',
  deposit: 'Deposit'
};

export const mapPaymentToLedger = (payment) => ({
  id: payment.id ? `l-${payment.id}` : `l-${Date.now()}`,
  backendId: payment.id,
  date: String(payment.uploaded_at || payment.verified_at || '').slice(0, 10),
  type: LEDGER_TYPE[String(payment.stage || '').toLowerCase()] || 'Pembayaran',
  ref: payment.order_number || payment.invoice_number || '-',
  mitraName: payment.mitra_name || '',
  nominal: toNumber(payment.amount),
  bank: payment.bank_name || '-',
  by: payment.verified_by || '',
  status: normalizePaymentStatus(payment.status),
  proof: mediaUrl(payment.proof_url),
  note: payment.rejection_reason || payment.note || ''
});

const PREQ_LABEL = {
  'menunggu review purchasing': 'Menunggu Review Purchasing',
  'menunggu acc owner': 'Menunggu Approval Owner',
  'acc owner': 'Disetujui Owner',
  'selesai ditransfer': 'Ditransfer',
  'ditolak marketing': 'Ditolak',
  'ditolak owner': 'Ditolak',
  'dibatalkan': 'Dibatalkan'
};

export const mapPaymentRequestToCore = (request) => ({
  id: request.id ? `pr-${request.id}` : `pr-${Date.now()}`,
  backendId: request.id,
  code: request.code,
  createdAt: String(request.created_at || '').slice(0, 10),
  createdBy: request.created_by || '',
  amount: toNumber(request.amount),
  bank: request.bank || '-',
  accountNo: request.bank_account || '',
  holder: request.bank_holder || '',
  purpose: request.purpose || '',
  ref: request.reference || '-',
  note: request.note || '',
  status: PREQ_LABEL[String(request.status || '').toLowerCase()] || request.status || 'Menunggu Review Purchasing',
  dbStatus: request.status || '',
  marketing: request.marketing || null,
  owner: request.owner || null,
  transfer: request.transfer
    ? { ...request.transfer, proof: mediaUrl(request.transfer.proof) }
    : null
});

export const mapBatchToCore = (batch) => {
  const name = batch.name || batch.title || '';
  const brandName = typeof batch.brand === 'object' ? (batch.brand?.name || '') : (batch.brand || '');
  const rawClose = batch.close_date || batch.closeDate || '';
  let closeIso = '';
  const m = String(rawClose).match(/(\d{4}-\d{2}-\d{2})/);
  if (m) closeIso = m[1];

  let closeTime = '23:59';
  if (String(rawClose).includes('T') && String(rawClose).split('T')[1]) {
    closeTime = String(rawClose).split('T')[1].slice(0, 5);
  } else if (String(rawClose).includes(' ') && String(rawClose).split(' ')[1]) {
    closeTime = String(rawClose).split(' ')[1].slice(0, 5);
  }

  const closeFormatted = closeIso ? formatDisplayDate(closeIso) : (batch.closeDate && batch.closeDate !== '-' ? batch.closeDate : '-');

  return {
    id: batch.id,
    backendId: batch.id,
    name,
    title: name,
    brand: brandName,
    brand_id: batch.brand_id || batch.brandId || null,
    status: batch.status === 'closed' ? 'closed' : 'open',
    start_date: batch.start_date ? String(batch.start_date).slice(0, 10) : '',
    close_date: batch.close_date ? String(batch.close_date) : '',
    closeDateIso: closeIso,
    closeDate: closeFormatted,
    closeTime,
    closeTimeDisplay: closeFormatted !== '-' ? `${closeTime} WIB` : '',
    estimated_shipment: batch.estimated_shipment && !String(batch.estimated_shipment).startsWith('1970')
      ? String(batch.estimated_shipment).slice(0, 10)
      : '',
    quotaTarget: 0,
    quotaFilled: toNumber(batch.products_count),
    products_count: toNumber(batch.products_count)
  };
};

export const mapSettings = (payload) => {
  const raw = payload?.data || payload || {};
  return {
    shopName: raw.shopName || 'Afatharshop',
    senderName: raw.senderName || '',
    dpPct: toNumber(raw.dpPct, DEFAULT_DP_PCT),
    pelunasanDueDays: toNumber(raw.pelunasanDueDays, 30),
    ongkirDueDays: toNumber(raw.ongkirDueDays, 3),
    waFooter: raw.waFooter || '',
    instagram: raw.instagram || ''
  };
};

const timeAgo = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari yang lalu`;
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const NOTIF_TONE = {
  seed_payment: 'emerald',
  seed_order: 'emerald',
  seed_catalog: 'amber',
  seed_finance: 'amber',
  seed_marketing: 'amber',
  seed_shipment: 'blue',
  warning: 'red',
  danger: 'red',
  error: 'red',
  rejected: 'red',
  success: 'emerald',
  order: 'emerald',
  payment: 'blue',
  info: 'blue',
  deposit: 'amber',
  finance: 'amber'
};

const NOTIF_TARGET = {
  seed_catalog: 'katalog',
  seed_shipment: 'alamat',
  seed_order: 'tagihan',
  seed_payment: 'tagihan'
};

export const mapNotificationToHeader = (notification) => {
  const title = notification.title || 'Pemberitahuan';
  const sub = notification.message || '';
  const type = String(notification.type || '').toLowerCase();
  const isRejected =
    type === 'warning' ||
    type === 'danger' ||
    type === 'error' ||
    type === 'rejected' ||
    title.toLowerCase().includes('ditolak') ||
    sub.toLowerCase().includes('ditolak');
  return {
    id: String(notification.id),
    title,
    sub,
    time: timeAgo(notification.created_at),
    tone: isRejected ? 'red' : NOTIF_TONE[type] || 'emerald',
    read: Boolean(notification.is_read),
    isRejected,
    target: isRejected ? '' : NOTIF_TARGET[type] || 'dashboard'
  };
};

export const mapAddressToBook = (address) => {
  const parts = [
    address.address_line,
    address.subdistrict ? `Kelurahan ${address.subdistrict}` : '',
    address.district ? `Kecamatan ${address.district}` : '',
    address.city,
    address.province,
    address.postal_code
  ].filter(Boolean);

  return {
    id: address.id,
    backendId: address.id,
    name: address.recipient_name || 'Alamat',
    label: address.label || '',
    recipient: address.recipient_name || '',
    phone: address.recipient_phone || '',
    phoneDisplay: address.recipient_phone ? `(+62) ${address.recipient_phone}` : '',
    email: address.email || '',
    street: address.address_line || '',
    subdistrict: address.subdistrict || '',
    district: address.district || '',
    city: address.city || '',
    province: address.province || '',
    postalCode: address.postal_code || '',
    address: parts.join(', '),
    isDefault: Boolean(address.is_default),
    isPrimary: Boolean(address.is_default)
  };
};

export const addressBookToPayload = (address) => ({
  recipient_name: address.recipient || address.name || '',
  recipient_phone: address.phone || '',
  address_line: address.street || address.address || '',
  city: address.city || '',
  province: address.province || '',
  postal_code: address.postalCode || '',
  label: address.label || '',
  email: address.email || '',
  subdistrict: address.subdistrict || '',
  district: address.district || '',
  is_default: Boolean(address.isDefault || address.isPrimary)
});

/**
 * ID numerik asli milik baris data. Baris hasil uid('b')/draft lokal bukan data server,
 * jadi nilainya null supaya tidak pernah dikirim sebagai ?/?/id ke backend
 * (pembulatan "b-12" menjadi 12 pernah membuat request mengenai baris yang salah).
 */
export const dbId = (row) => {
  if (!row) return null;
  const candidates = typeof row === 'object'
    ? [
        row.backendId,
        row.db_id,
        row.id,
        row.form?.backendId,
        row.form?.id
      ]
    : [row];
  for (const raw of candidates) {
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
    const text = String(raw ?? '').trim();
    if (/^[1-9]\d*$/.test(text)) return Number(text);
    const prefixMatch = text.match(/^[a-z]+-([1-9]\d*)$/i);
    if (prefixMatch) return Number(prefixMatch[1]);
  }
  return null;
};
