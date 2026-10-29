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

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const token = tokenStore.get();
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
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

  register: (payload) =>
    request('/auth/register', { method: 'POST', auth: false, body: payload }),

  me: () => request('/auth/me'),

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      tokenStore.clear();
    }
  },

  // --- Katalog ---
  products: (params) => request(`/products${buildQuery(params)}`),
  product: (id) => request(`/products/${id}`),
  brands: () => request('/brands', { auth: false }),
  categories: () => request('/categories', { auth: false }),
  couriers: () => request('/couriers', { auth: false }),
  bankAccounts: () => request('/bank-accounts', { auth: false }),
  levels: () => request('/levels', { auth: false }),

  // --- Transaksi ---
  orders: () => request('/orders'),
  order: (id) => request(`/orders/${id}`),
  createOrder: (payload) => request('/orders', { method: 'POST', body: payload })
};

export default api;
