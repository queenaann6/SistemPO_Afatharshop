const RAW_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
const TOKEN_KEY = 'afathar_token';
const DEFAULT_TIMEOUT = 8000;

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage tidak tersedia */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage tidak tersedia */
    }
  }
};

const buildQuery = (params) => {
  const entries = Object.entries(params || {}).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );
  if (!entries.length) return '';
  return `?${new URLSearchParams(entries).toString()}`;
};

const inFlightGets = new Map();

// StrictMode/remount ganda tidak perlu menembak endpoint GET yang sama dua kali.
function request(path, options = {}) {
  const method = options.method || 'GET';
  if (method !== 'GET') return performRequest(path, options);

  const key = `${tokenStore.get() || 'guest'}|${path}`;
  const pending = inFlightGets.get(key);
  if (pending) return pending;

  const task = performRequest(path, options).finally(() => inFlightGets.delete(key));
  inFlightGets.set(key, task);
  return task;
}

async function performRequest(
  path,
  { method = 'GET', body, auth = true, signal, timeout = DEFAULT_TIMEOUT } = {}
) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = { Accept: 'application/json' };

  if (body !== undefined && !isForm) {
    headers['Content-Type'] = 'application/json';
  }

  const token = tokenStore.get();
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const abortFromOutside = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', abortFromOutside, { once: true });
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    throw new ApiError(
      'Tidak dapat terhubung ke server backend. Pastikan Laravel berjalan di ' + API_BASE_URL,
      0,
      null
    );
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', abortFromOutside);
  }

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const firstValidationError =
      data && typeof data === 'object' && data.errors
        ? Object.values(data.errors).flat()[0]
        : null;
    const message =
      (data && typeof data === 'object' && data.message) ||
      firstValidationError ||
      `Permintaan gagal (${response.status}).`;

    throw new ApiError(message, response.status, data);
  }

  return data;
}

export const api = {
  baseUrl: API_BASE_URL,

  health: () => request('/health', { auth: false }),

  // --- Autentikasi ---
  async login(identifier, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      auth: false,
      body: { login: identifier, password }
    });

    if (data?.access_token) {
      tokenStore.set(data.access_token);
    }

    return data;
  },

  async register(payload) {
    const data = await request('/auth/register', {
      method: 'POST',
      auth: false,
      body: payload
    });

    if (data?.access_token) {
      tokenStore.set(data.access_token);
    }

    return data;
  },

  forgotPassword: (payload) =>
    request('/auth/forgot-password', { method: 'POST', body: payload, auth: false }),

  resetPassword: (payload) =>
    request('/auth/reset-password', { method: 'POST', body: payload, auth: false }),

  me: () => request('/auth/me'),

  updateProfile: (payload) =>
    request('/auth/profile', { method: 'PUT', body: payload }),

  changePassword: (payload) =>
    request('/auth/password', { method: 'PUT', body: payload }),

  uploadFile: (file, folder = 'proof') => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    return request('/uploads', { method: 'POST', body: form, timeout: 30000 });
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      tokenStore.clear();
    }
  },

  // --- Katalog ---
  catalog: () => request('/catalog'),
  products: (params) => request(`/products${buildQuery(params)}`),
  product: (id) => request(`/products/${id}`),
  brands: () => request('/brands', { auth: false }),
  brand: (id) => request(`/brands/${id}`, { auth: false }),
  suppliers: () => request('/suppliers', { auth: false }),
  categories: () => request('/categories', { auth: false }),
  couriers: () => request('/couriers', { auth: false }),
  bankAccounts: () => request('/bank-accounts', { auth: false }),
  batches: (params) => request(`/batches${buildQuery(params)}`, { auth: false }),
  levels: () => request('/levels'),

  // --- Transaksi ---
  orders: () => request('/orders'),
  order: (id) => request(`/orders/${id}`),
  orderInvoice: (id) => request(`/orders/${id}/invoice`),
  invoice: (id) => request(`/invoices/${id}`),
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload }),
  updateOrder: (id, payload) =>
    request(`/orders/${id}`, { method: 'PUT', body: payload }),
  updateOrderAddress: (id, payload) =>
    request(`/orders/${id}/address`, { method: 'PATCH', body: payload }),
  cancelOrder: (id, payload = {}) =>
    request(`/orders/${id}/cancel`, { method: 'POST', body: payload }),

  // --- Keranjang Belanja (Cart) ---
  cart: {
    get: () => request('/cart'),
    add: (payload) => request('/cart/items', { method: 'POST', body: payload }),
    update: (id, payload) =>
      request(`/cart/items/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => request(`/cart/items/${id}`, { method: 'DELETE' }),
    clear: () => request('/cart', { method: 'DELETE' }),
    sync: (items) => request('/cart/sync', { method: 'POST', body: { items } })
  },

  // --- Wishlist Produk Favorit ---
  wishlist: {
    get: () => request('/wishlist'),
    toggle: (productId) =>
      request('/wishlist/toggle', { method: 'POST', body: { product_id: productId } }),
    remove: (productId) => request(`/wishlist/${productId}`, { method: 'DELETE' })
  },

  // --- Data mitra yang sedang login ---
  my: {
    profile: () => request('/auth/me'),
    updateProfile: (payload) =>
      request('/auth/profile', { method: 'PUT', body: payload }),
    changePassword: (payload) =>
      request('/auth/password', { method: 'PUT', body: payload }),
    deposits: () => request('/my/deposits'),
    createDeposit: (payload) => request('/my/deposits', { method: 'POST', body: payload }),
    payments: () => request('/my/payments'),
    uploadPayment: (payload) => request('/my/payments', { method: 'POST', body: payload }),
    payWithDeposit: (payload) => request('/my/payments/deposit', { method: 'POST', body: payload }),
    notifications: () => request('/my/notifications'),
    markNotificationsRead: (id) =>
      request('/my/notifications/read', { method: 'PATCH', body: id ? { id } : {} }),
    addresses: () => request('/my/addresses'),
    createAddress: (payload) => request('/my/addresses', { method: 'POST', body: payload }),
    updateAddress: (id, payload) =>
      request(`/my/addresses/${id}`, { method: 'PUT', body: payload }),
    deleteAddress: (id) => request(`/my/addresses/${id}`, { method: 'DELETE' }),
    cancelOrder: (id, payload = {}) =>
      request(`/orders/${id}/cancel`, { method: 'POST', body: payload })
  },

  // --- Data lintas modul untuk dashboard owner/finance/marketing ---
  management: {
    bootstrap: (options) => request('/management/bootstrap', options),

    orders: (options) => request('/management/orders', options),
    trashedOrders: (options) => request('/management/orders/trashed', options),
    orderInvoice: (id, options) => request(`/management/orders/${id}/invoice`, options),
    invoice: (id, options) => request(`/management/invoices/${id}`, options),
    createOrder: (payload) => request('/management/orders', { method: 'POST', body: payload }),
    updateOrderStatus: (id, payload) =>
      request(`/management/orders/${id}/status`, { method: 'PATCH', body: payload }),
    updateOrderInvoice: (id, payload) =>
      request(`/management/orders/${id}/invoice`, { method: 'PATCH', body: payload }),
    updateOrder: (id, payload) =>
      request(`/management/orders/${id}`, { method: 'PUT', body: payload }),
    trashOrder: (id, payload = {}) =>
      request(`/management/orders/${id}/trash`, { method: 'POST', body: payload }),
    restoreOrder: (id) =>
      request(`/management/orders/${id}/restore`, { method: 'POST' }),
    deleteOrder: (id) => request(`/management/orders/${id}`, { method: 'DELETE' }),

    batches: (options) => request('/management/batches', options),
    createBatch: (payload) =>
      request('/management/batches', { method: 'POST', body: payload }),
    updateBatch: (id, payload) =>
      request(`/management/batches/${id}`, { method: 'PUT', body: payload }),
    deleteBatch: (id) =>
      request(`/management/batches/${id}`, { method: 'DELETE' }),

    createProduct: (payload) =>
      request('/management/products', { method: 'POST', body: payload }),
    updateProduct: (id, payload) =>
      request(`/management/products/${id}`, { method: 'PUT', body: payload }),
    deleteProduct: (id) =>
      request(`/management/products/${id}`, { method: 'DELETE' }),

    users: (options) => request('/management/users', options),
    createUser: (payload) =>
      request('/management/users', { method: 'POST', body: payload }),
    updateUser: (id, payload) =>
      request(`/management/users/${id}`, { method: 'PUT', body: payload }),
    deleteUser: (id, force = false) =>
      request(`/management/users/${id}${force ? '?force=1' : ''}`, { method: 'DELETE' }),

    deposits: (options) => request('/management/deposits', options),
    createDeposit: (payload) =>
      request('/management/deposits', { method: 'POST', body: payload }),
    verifyDeposit: (id, payload) =>
      request(`/management/deposits/${id}/verify`, { method: 'PATCH', body: payload }),

    payments: (options) => request('/management/payments', options),
    createPayment: (payload) =>
      request('/management/payments', { method: 'POST', body: payload }),
    verifyPayment: (id, payload) =>
      request(`/management/payments/${id}/verify`, { method: 'PATCH', body: payload }),

    paymentRequests: (options) => request('/management/payment-requests', options),
    createPaymentRequest: (payload) =>
      request('/management/payment-requests', { method: 'POST', body: payload }),
    updatePaymentRequest: (id, payload) =>
      request(`/management/payment-requests/${id}`, { method: 'PATCH', body: payload }),
    deletePaymentRequest: (id) =>
      request(`/management/payment-requests/${id}`, { method: 'DELETE' }),
    deletePayment: (id) =>
      request(`/management/payments/${id}`, { method: 'DELETE' }),
    deleteDeposit: (id) =>
      request(`/management/deposits/${id}`, { method: 'DELETE' }),

    suppliers: (options) => request('/management/suppliers', options),
    createSupplier: (payload) =>
      request('/management/suppliers', { method: 'POST', body: payload }),
    updateSupplier: (id, payload) =>
      request(`/management/suppliers/${id}`, { method: 'PUT', body: payload }),
    deleteSupplier: (id) =>
      request(`/management/suppliers/${id}`, { method: 'DELETE' }),

    brands: (options) => request('/management/brands', options),
    brand: (id) => request(`/management/brands/${id}`),
    createBrand: (payload) =>
      request('/management/brands', { method: 'POST', body: payload }),
    updateBrand: (id, payload) =>
      request(`/management/brands/${id}`, { method: 'PUT', body: payload }),
    deleteBrand: (id) =>
      request(`/management/brands/${id}`, { method: 'DELETE' }),

    categories: (options) => request('/management/categories', options),
    createCategory: (payload) =>
      request('/management/categories', { method: 'POST', body: payload }),
    updateCategory: (id, payload) =>
      request(`/management/categories/${id}`, { method: 'PUT', body: payload }),
    deleteCategory: (id) =>
      request(`/management/categories/${id}`, { method: 'DELETE' }),

    bankAccounts: (options) => request('/management/bank-accounts', options),
    createBankAccount: (payload) =>
      request('/management/bank-accounts', { method: 'POST', body: payload }),
    updateBankAccount: (id, payload) =>
      request(`/management/bank-accounts/${id}`, { method: 'PUT', body: payload }),
    deleteBankAccount: (id) =>
      request(`/management/bank-accounts/${id}`, { method: 'DELETE' }),

    couriers: (options) => request('/management/couriers', options),
    createCourier: (payload) =>
      request('/management/couriers', { method: 'POST', body: payload }),
    updateCourier: (id, payload) =>
      request(`/management/couriers/${id}`, { method: 'PUT', body: payload }),
    deleteCourier: (id) =>
      request(`/management/couriers/${id}`, { method: 'DELETE' }),

    reportSummary: (params) =>
      request(`/management/reports/summary${buildQuery(params)}`),
    reportProduction: (params) =>
      request(`/management/reports/production${buildQuery(params)}`),
    exportReport: (type = 'orders') =>
      request(`/management/reports/export?type=${type}`),

    updateSettings: (payload) =>
      request('/management/settings', { method: 'PUT', body: payload }),

    uploadFile: (file, folder = 'proof') => {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', folder);
      return request('/uploads', { method: 'POST', body: form, timeout: 30000 });
    },

    activityLogs: (options) => request('/management/activity-logs', options),
    deleteActivityLog: (id) =>
      request(`/management/activity-logs/${id}`, { method: 'DELETE' }),
    clearActivityLogs: () =>
      request('/management/activity-logs', { method: 'DELETE' }),
    notifications: (options) => request('/management/notifications', options),
    markNotificationsRead: (id) =>
      request('/management/notifications/read', { method: 'PATCH', body: id ? { id } : {} }),
    settings: (options) => request('/management/settings', options)
  }
};
/**
 * Berkas yang diunggah ke backend disimpan di public/uploads dan dikembalikan sebagai
 * path relatif, jadi prefix dengan origin API supaya bisa dimuat dari origin Vite.
 */
export const mediaUrl = (src) => {
  const value = String(src || '').trim();
  if (!value) return '';
  if (/^(data|blob):/i.test(value) || /^https?:\/\//i.test(value)) return value;
  const origin = API_BASE_URL.replace(/\/api$/, '');
  return `${origin}${value.startsWith('/') ? value : `/${value}`}`;
};

export default api;
