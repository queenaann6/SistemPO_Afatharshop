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

export const brandIdFor = (brandName) => {
  const key = String(brandName || '').toLowerCase().trim();
  return BRAND_ID_MAP[key] || slugify(brandName);
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
  const basePrice = toNumber(
    product.user_price ?? product.price,
    priceValues.length ? Math.min(...priceValues) : 0
  );
  const maxPrice = priceValues.length ? Math.max(...priceValues) : basePrice;
  // Jadwal termin katalog adalah sumber persen; min_dp_percent hanya cadangan.
  const paymentStages = terminPlanFor(product);
  const dpPct = paymentStages[0]?.pct || 0;

  const rawVariants = Array.isArray(product.variants) ? product.variants : [];
  const variantModels = unique(rawVariants.map((variant) => variant.model));
  const variantSizes = unique(rawVariants.map((variant) => variant.size));
  const variantColors = unique(rawVariants.map((variant) => variant.color));

  const status = ['closed_po', 'closed'].includes(product.status) ? 'closed' : 'pre_order';
  const closeIso = product.tutup_po_iso ? String(product.tutup_po_iso).slice(0, 10) : '';

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
    priceMin: basePrice,
    priceMax: maxPrice,
    originalPrice: Number(
      product.original_price ||
      product.originalPrice ||
      (product.is_sale || product.isSale ? Math.round(basePrice * 1.2) : maxPrice)
    ),
    discountPercent: Number(
      product.discount_percent ||
      product.discountPercent ||
      (product.is_sale || product.isSale ? 15 : 0)
    ),
    isSale: Boolean(
      product.is_sale === true ||
      product.isSale === true ||
      (product.discount_percent && Number(product.discount_percent) > 0) ||
      (product.discountPercent && Number(product.discountPercent) > 0) ||
      [2, 3, 4, 6].includes(Number(product.id)) ||
      [2, 3, 4, 6].includes(Number(product.backendId))
    ),
    status,
    statusLabel: status === 'closed' ? 'PO Ditutup' : 'Open Pre-Order',
    tutupPO: product.tutup_po || '-',
    tutupPODetail: product.tutup_po ? `${product.tutup_po} WIB` : '-',
    closeDate: closeIso,
    openDate: '',
    estimatedShipment: product.estimated_shipment || '-',
    overlayText: product.tutup_po ? `Tutup PO ${product.tutup_po}` : '',
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
    variants: rawVariants.map((variant) => ({
      id: variant.id,
      color: variant.color,
      model: variant.model,
      size: String(variant.size ?? ''),
      price: basePrice,
      addon: 0
    })),
    image: mediaUrl(product.image) || FALLBACK_IMAGE,
    image2: mediaUrl(product.image2),
    image3: mediaUrl(product.image3),
    image4: mediaUrl(product.image4),
    reelUrl: mediaUrl(product.reel_url || product.reelUrl),
    videoUrl: mediaUrl(product.reel_url || product.reelUrl),
    thumbnails: (() => {
      const raw = [
        product.image,
        product.image2,
        product.image3,
        product.image4,
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

export const mapApiUser = (user, fallback = {}) => {
  if (!user) return null;

  return {
    name: user.name || user.nama || fallback.name || 'Mitra',
    role: user.role || user.level || fallback.role || 'Mitra Distributor',
    roleId: roleIdFromApiUser(user),
    level: user.level || fallback.level || '',
    avatar: (user.avatar && !user.avatar.includes('unsplash.com')) ? user.avatar : (fallback.avatar && !fallback.avatar.includes('unsplash.com') ? fallback.avatar : ''),
    balance: formatRupiah(user.deposit_balance ?? 0),
    totalBill: fallback.totalBill || 'Rp 0',
    phone: user.phone || fallback.phone || '',
    email: user.email || fallback.email || '',
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
  if (invoiceLunas || (/lunas/.test(text) && !text.includes('belum') && !text.includes('pelunasan'))) return 'Lunas (Siap Kirim)';
  if (/selesai/.test(text)) return 'Selesai';
  if (/dikirim|terkirim/.test(text)) return 'Dikirim';
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
    const related = payments.filter(
      (payment) => Number(payment.installment_id) === Number(row.id)
    );
    if (related.some((payment) => normalizePaymentStatus(payment.status) === 'Ditolak')) {
      return 'Ditolak';
    }
    const byInstallment = normalizePaymentStatus(row.status);
    if (byInstallment !== 'Belum') return byInstallment;
    if (toNumber(row.paid_amount) > 0) return 'ACC';
    if (
      related.some(
        (payment) => normalizePaymentStatus(payment.status) === 'Menunggu Verifikasi'
      )
    ) {
      return 'Menunggu Verifikasi';
    }
    return 'Belum';
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

  const isReady = String(order.production_status || '').toLowerCase() === 'ready';
  const hasOngkir = shipping > 0;
  const isAddressSubmitted = Boolean(
    order.address_id &&
      (hasOngkir ||
        String(order.status || '').toLowerCase().includes('ongkir') ||
        String(order.status || '').toLowerCase().includes('pelunasan') ||
        String(order.status || '').toLowerCase().includes('siap'))
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

  return {
    orderNo: order.order_number || `PO-${order.id}`,
    id: order.id,
    backendId: order.id,
    invoiceId: order.invoice?.id ?? null,
    invoiceNumber: order.invoice?.invoice_number || '',
    dbStatus: order.status || '',
    productionStatus: order.production_status || (isReady ? 'Ready' : (paid > 0 || stageStatus(dpRow) === 'ACC') ? 'Produksi' : 'Antrian'),
    readyAt: isReady ? (order.updated_at || order.ordered_at) : '',
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
    date: order.ordered_at || order.created_at,
    status,
    marketingStatus:
      order.marketing_status ||
      (status === 'Menunggu ACC Admin'
        ? MARKETING_PENDING
        : orderRejected
          ? MARKETING_REJECTED
          : MARKETING_ACC),
    subtotal,
    ongkir: shipping,
    total,
    paidAmount: paid,
    dpStatus: orderRejected ? 'Ditolak' : stageStatus(dpRow),
    pelunasanStatus: stageStatus(pelunasanRow),
    ongkirStatus: orderLunas ? 'ACC' : 'Belum',
    dpProof: mediaUrl(dpPayment?.proof_url || ''),
    pelunasanProof: mediaUrl(pelunasanPayment?.proof_url || ''),
    ongkirProof: mediaUrl(stagelessPayment?.proof_url || ''),
    dpPaymentId: dpPayment?.id ?? null,
    pelunasanPaymentId: pelunasanPayment?.id ?? null,
    ongkirPaymentId: stagelessPayment?.id ?? null,
    address,
    courier: order.courier_name || '',
    dpPct,
    dpNominal: toNumber(dpRow?.amount),
    paymentStages: installments
      .map((row, index) => {
        const related = payments.filter((p) => Number(p.installment_id) === Number(row.id));
        const lastPay = related[related.length - 1] || null;
        const stgStatus = stageStatus(row);
        return {
          id: row.id,
          type: row.type,
          sequence: row.sequence_number ?? index + 1,
          label:
            row.type === 'dp'
              ? 'DP'
              : row.type === 'pelunasan'
                ? 'Pelunasan'
                : `Cicilan ${row.sequence_number ? row.sequence_number - 1 : index + 1}`,
          pct: stageBase ? Math.round((toNumber(row.amount) / stageBase) * 100) : 0,
          amount: toNumber(row.amount),
          status: stgStatus,
          proof: mediaUrl(lastPay?.proof_url || ''),
          payment: lastPay ? {
            id: lastPay.id,
            status: normalizePaymentStatus(lastPay.status),
            image: mediaUrl(lastPay.proof_url || ''),
            bank: lastPay.bank_account?.bank_name || 'BCA (PT Afathar Niaga Indonesia)',
            date: lastPay.created_at,
            nominal: toNumber(lastPay.amount)
          } : null,
          date: row.due_at || ''
        };
      })
      .filter((stage) => stage.amount > 0 || stage.pct > 0),
    items: items.map((item, index) => {
      const qty = toNumber(item.quantity, 1);
      const gross = toNumber(item.subtotal, toNumber(item.unit_price) * qty);
      const fee = toNumber(item.fee);
      // Baris tua tidak punya kolom diskon/addon: fee negatif = potongan,
      // fee positif = biaya tambahan.
      const discountNominal = toNumber(item.discount_nominal) || Math.max(0, -fee);
      const addonNominal = toNumber(item.addon_nominal) || Math.max(0, fee);
      return {
        id: item.id ?? index + 1,
        variantId: item.variant?.id ?? null,
        productId: item.variant?.product?.id ?? null,
        title: item.variant?.product?.name || product.name || 'Item PO',
        variant:
          [item.variant?.color, item.variant?.model, item.variant?.size]
            .filter(Boolean)
            .join('/') || 'All Varian',
        color: item.variant?.color || '',
        model: item.variant?.model || '',
        size: item.variant?.size || '',
        price: toNumber(item.unit_price),
        qty,
        fee,
        discountNominal,
        discountPct: gross > 0 ? Math.round((discountNominal / gross) * 100) : 0,
        addon: qty > 0 ? Math.round(addonNominal / qty) : 0,
        addonNominal,
        // Nilai bersih yang ditagih untuk baris ini: gross - diskon + addon.
        subtotal: Math.max(
          0,
          Math.round(toNumber(item.net_subtotal) || gross - discountNominal + addonNominal)
        ),
        image: mediaUrl(item.variant?.product?.image || product.image) || FALLBACK_IMAGE
      };
    }),
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
    isClosedPO: batchClosed || product.status === 'closed_po',
    invoiceOutstanding:
      order.invoice?.outstanding_amount !== undefined
        ? toNumber(order.invoice.outstanding_amount)
        : null
  };
};

export const buildOrderPayload = (order, items = []) => {
  const itemPayload = (Array.isArray(items) ? items : []).map((item) => {
    const variantId = Number(item.variantId);
    const productId = Number(item.productId ?? item.product_id ?? item.id);
    return {
      product_variant_id:
        Number.isInteger(variantId) && variantId > 0 ? variantId : null,
      product_id:
        Number.isInteger(productId) && productId > 0 ? productId : null,
      quantity: Math.max(1, toNumber(item.qty, 1)),
      unit_price: toNumber(item.price),
      fee: toNumber(item.feeNominal)
    };
  });

  const itemsTotal = itemPayload.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const subtotal = itemsTotal || toNumber(order.total);

  const addressId = Number(order.addressId);
  return {
    total_amount: toNumber(order.total) || subtotal,
    subtotal,
    shipping_cost: toNumber(order.shippingCost ?? order.ongkir),
    courier_name: order.courier || null,
    notes: order.notes || null,
    address_id: Number.isInteger(addressId) && addressId > 0 ? addressId : null,
    is_split_address: Boolean(order.isSplitAddress),
    status: order.status || 'Menunggu ACC Marketing',
    items: itemPayload
  };
};

/* ------------------------------------------------------------------ data dashboard */

export const mapUserToMitra = (user) => ({
  id: user.id ? `m-${user.id}` : `m-${slugify(user.name || user.nama)}`,
  backendId: user.id,
  name: user.name || user.nama || '',
  email: user.email || '',
  level: user.level || 'DB All',
  phone: user.phone || '',
  city: user.city || '',
  address: '',
  active: user.is_active !== false,
  deposit: toNumber(user.deposit_balance),
  joinedAt: String(user.joined_at || '').slice(0, 10)
});

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
  const supplierCity = (typeof brand.supplier === 'object' ? brand.supplier?.city : '') || brand.address || 'Bandung';
  return {
    id: brand.id ? `b-${brand.id}` : (brand.id || `b-${slugify(brand.name)}`),
    backendId: brand.id,
    name: brand.name,
    supplier: supplierName,
    supplier_id: brand.supplier_id || (typeof brand.supplier === 'object' ? brand.supplier?.id : null),
    address: supplierCity,
    discountType: 'pct',
    discountValue: toNumber(brand.discount_db_all ?? brand.discountDBAll, 30),
    feeType: 'pct',
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
  bank: '-',
  by: payment.verified_by || '',
  status: normalizePaymentStatus(payment.status),
  proof: mediaUrl(payment.proof_url),
  note: payment.rejection_reason || ''
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
  const close = batch.close_date ? new Date(batch.close_date) : null;
  const valid = close && !Number.isNaN(close.getTime());
  return {
    id: batch.id,
    backendId: batch.id,
    title: batch.name,
    brand: batch.brand || '',
    status: batch.status === 'closed' ? 'closed' : 'open',
    closeDate: valid
      ? close.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      : '-',
    closeTime: valid
      ? `${close.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
      : '',
    quotaTarget: 0,
    quotaFilled: toNumber(batch.products_count)
  };
};

export const mapSettings = (payload) => {
  const raw = payload?.data || payload || {};
  return {
    shopName: raw.shopName || 'Afathar Shop',
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
  seed_shipment: 'blue'
};

const NOTIF_TARGET = {
  seed_catalog: 'katalog',
  seed_shipment: 'alamat',
  seed_order: 'tagihan',
  seed_payment: 'tagihan'
};

export const mapNotificationToHeader = (notification) => ({
  id: String(notification.id),
  title: notification.title || 'Pemberitahuan',
  sub: notification.message || '',
  time: timeAgo(notification.created_at),
  tone: NOTIF_TONE[notification.type] || 'emerald',
  read: Boolean(notification.is_read),
  target: NOTIF_TARGET[notification.type] || 'dashboard'
});

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
  const candidates = [row.backendId, row.db_id, row.id];
  for (const raw of candidates) {
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
    const text = String(raw ?? '').trim();
    if (/^[1-9]\d*$/.test(text)) return Number(text);
  }
  return null;
};
