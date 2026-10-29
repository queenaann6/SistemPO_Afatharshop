import {
  DEFAULT_COLORS,
  DEFAULT_MODELS,
  DEFAULT_PAYMENT_STAGES,
  DEFAULT_SIZES,
  DEFAULT_STORE
} from '../data/mockData';

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
  const dpPct = Math.min(100, Math.max(0, toNumber(product.min_dp_percent ?? product.dp_percent, 25)));

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
    originalPrice: maxPrice,
    discountPercent: 0,
    isSale: false,
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
    paymentStages: DEFAULT_PAYMENT_STAGES,
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
    image: product.image || FALLBACK_IMAGE,
    thumbnails: [product.image || FALLBACK_IMAGE],
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
    avatar: user.avatar || fallback.avatar,
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

export const mapBankAccount = (account) => ({
  id: String(account.id),
  bank: account.bank_name,
  accountNo: account.account_number,
  holder: account.account_holder,
  active: account.is_active !== false
});

export const mapOrderToProjectOrder = (order, user = {}) => {
  const items = Array.isArray(order.items) ? order.items : [];
  const firstItem = items[0] || {};
  const product = firstItem.variant?.product || {};
  const installments = Array.isArray(order.invoice?.installments)
    ? order.invoice.installments
    : [];
  const total = toNumber(order.total_amount);
  const dpRow = installments.find((row) => row.type === 'dp');
  const dpPct =
    total > 0 && dpRow ? Math.round((toNumber(dpRow.amount) / total) * 100) : 25;

  const paid = toNumber(order.invoice?.paid_amount);
  const invoiceStatus = String(order.invoice?.status || '').toLowerCase();
  const orderStatus = String(order.status || '').toLowerCase();

  // "belum_lunas" juga mengandung kata "lunas", jadi harus dikecualikan.
  const invoiceLunas = invoiceStatus.startsWith('lunas');
  const orderLunas = orderStatus.includes('lunas') && !orderStatus.includes('belum');

  let status = 'Pesanan Dibuat';
  if (paid > 0) status = 'DP Terbayar (Validasi Selesai)';
  if (invoiceLunas || orderLunas) {
    status = 'Lunas (Siap Kirim)';
  }
  if (orderStatus.includes('dikirim')) status = 'Dikirim';
  if (orderStatus.includes('selesai')) status = 'Selesai';
  if (orderStatus.includes('batal') || orderStatus.includes('tolak')) status = 'Batal';

  return {
    orderNo: order.order_number || `PO-${order.id}`,
    id: order.id,
    brand: product.brand?.name || '',
    title: product.name || 'Pesanan PO',
    date: order.ordered_at || order.created_at,
    status,
    total,
    courier: order.courier_name || '',
    dpPct,
    paymentStages: installments
      .map((row, index) => ({
        label:
          row.type === 'dp'
            ? 'DP'
            : row.type === 'pelunasan'
              ? 'Pelunasan'
              : `Cicilan ${row.sequence_number ?? index + 1}`,
        pct: total ? Math.round((toNumber(row.amount) / total) * 100) : 0,
        date: row.due_at || ''
      }))
      .filter((stage) => stage.pct > 0),
    items: items.map((item, index) => ({
      id: item.id ?? index + 1,
      title: item.variant?.product?.name || product.name || 'Item PO',
      variant:
        [item.variant?.color, item.variant?.model, item.variant?.size]
          .filter(Boolean)
          .join('/') || 'All Varian',
      color: item.variant?.color || '',
      model: item.variant?.model || '',
      size: item.variant?.size || '',
      price: toNumber(item.unit_price),
      qty: toNumber(item.quantity, 1),
      subtotal: toNumber(item.subtotal),
      image: item.variant?.product?.image || product.image || FALLBACK_IMAGE
    })),
    mitraName: user.name || user.nama || '',
    mitraPhone: user.phone || '',
    mitraLevel: user.level || user.role || '',
    note: order.notes || '',
    image: product.image || FALLBACK_IMAGE,
    closeDate: '',
    isClosedPO: product.status === 'closed_po'
  };
};

export const buildOrderPayload = (order, items = []) => {
  const itemPayload = (Array.isArray(items) ? items : []).map((item) => {
    const variantId = Number(item.variantId);
    return {
      product_variant_id:
        Number.isInteger(variantId) && variantId > 0 ? variantId : null,
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

  return {
    total_amount: toNumber(order.total) || subtotal,
    subtotal,
    shipping_cost: toNumber(order.shippingCost ?? order.ongkir),
    courier_name: order.courier || null,
    notes: order.notes || null,
    address_id: null,
    is_split_address: Boolean(order.isSplitAddress),
    items: itemPayload
  };
};
