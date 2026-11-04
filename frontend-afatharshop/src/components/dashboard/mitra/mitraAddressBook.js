import { api } from '../../../services/api';
import { addressBookToPayload, mapAddressToBook } from '../../../services/adapters';

export const MITRA_ADDRESS_BOOK = [];

export function getStoredAddresses() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('afathar_saved_addresses');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse stored addresses', e);
    return [];
  }
}

export function saveStoredAddresses(addresses) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('afathar_saved_addresses', JSON.stringify(addresses));
  } catch (e) {
    console.warn('Failed to save addresses to localStorage', e);
  }
}

export function formatFullAddress({ address, subdistrict, district, city, province, postalCode }) {
  const base = (address || '').trim();
  const baseLower = base.toLowerCase();
  const parts = [];
  if (base) parts.push(base);
  const push = (value, prefix = '') => {
    const v = (value || '').trim();
    if (!v) return;
    // Lewati segmen yang sudah tercantum di string alamat utama agar tidak dobel.
    if (baseLower.includes(v.toLowerCase())) return;
    parts.push(prefix ? `${prefix} ${v}` : v);
  };
  push(subdistrict, 'Kelurahan');
  push(district, 'Kecamatan');
  push(city);
  push(province);
  push(postalCode);
  return parts.join(', ');
}

/* Sinkronisasi buku alamat dengan backend; null berarti offline/gagal sehingga
   pemanggil tetap memakai data lokal. */
export async function syncAddressBookFromApi() {
  try {
    const response = await api.my.addresses();
    const rows = response?.data || [];
    const mapped = rows.map(mapAddressToBook);
    saveStoredAddresses(mapped);
    return mapped;
  } catch {
    return getStoredAddresses();
  }
}

export async function pushAddressBookItem(savedAddress, editingId) {
  try {
    const payload = addressBookToPayload(savedAddress);
    if (editingId) {
      await api.my.updateAddress(editingId, payload);
    } else {
      await api.my.createAddress(payload);
    }
    return await syncAddressBookFromApi();
  } catch {
    return null;
  }
}

export async function setDefaultAddressItem(id) {
  try {
    await api.my.updateAddress(id, { is_default: true });
    return await syncAddressBookFromApi();
  } catch {
    return null;
  }
}

export async function deleteAddressBookItem(id) {
  try {
    await api.my.deleteAddress(id);
    return await syncAddressBookFromApi();
  } catch {
    return null;
  }
}
