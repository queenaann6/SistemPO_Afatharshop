export const BRANDS = [
  { id: 'all', name: 'Semua Brand', count: 78 },
  { id: 'coverme', name: 'Coverme Hijab', count: 24 },
  { id: 'isa', name: 'Isa Luxury', count: 15 },
  { id: 'kaen', name: 'Kaen Boutique', count: 12 },
  { id: 'dalanova', name: 'Dalanova', count: 18 },
  { id: 'babyjab', name: 'Babyjab Hijab', count: 9 },
];

export const CATEGORIES = [
  'Semua Kategori',
  'Sarimbit Keluarga',
  'Gamis & Abaya',
  'Khimar & Bergo Syar\'i',
  'Scarf & Voal Premium',
  'Oneset & Kids',
  'Prayer Set & Mukena',
  'Tas Kulit & Aksesoris'
];

export const ROLES = [
  {
    id: 'mitra',
    name: 'Mitra Distributor',
    badge: 'Akses Mitra / Reseller',
    color: 'from-amber-500 to-amber-700',
    description: 'Pemesanan PO brand, booking kuota, bayar DP bertahap, cek invoice & pelunasan, tracking resi ekspedisi.',
    features: ['Katalog Khusus Mitra', 'Kalkulator DP 3 Tahap', 'Riwayat PO & Invoice', 'Download Foto Promosi HD']
  },
  {
    id: 'marketing',
    name: 'Admin Purchasing',
    badge: 'Purchasing & Katalog',
    color: 'from-rose-600 to-rose-800',
    description: 'Kelola jadwal buka/tutup PO, input katalog brand baru, monitoring kuota PO mitra, broadcast promo.',
    features: ['Timeline Buka/Tutup PO', 'Manajemen Kuota Brand', 'Monitoring Omset Mitra', 'Upload Flyer & Materi Promosi']
  },
  {
    id: 'finance',
    name: 'Admin Finance',
    badge: 'Keuangan & Validasi',
    color: 'from-emerald-600 to-emerald-800',
    description: 'Verifikasi mutasi bank & DP/pelunasan mitra, cetak invoice, rekonsiliasi pembayaran PO, rekap komisi.',
    features: ['Verifikasi Pembayaran DP', 'Penerbitan Invoice Resmi', 'Rekap Piutang & Pelunasan', 'Export Laporan Keuangan']
  },
  {
    id: 'owner',
    name: 'Owner / Direksi',
    badge: 'Executive Dashboard',
    color: 'from-purple-700 to-indigo-900',
    description: 'Executive overview, performa omset distributor per brand, profit margin, approval PO ke vendor pabrik.',
    features: ['Executive Summary PO', 'Analisis Performa Brand', 'Approval PO Masal Pabrik', 'Laporan Laba/Rugi Distributor']
  }
];

export const DEFAULT_STORE = {
  name: 'afatharshop',
  badge: 'Official',
  city: 'KOTA BOGOR',
  productsCount: 0,
  processTime: '± 1-2 hari'
};

export const DEFAULT_MODELS = [
  { name: 'MOM DRESS ONLY STYLE 1', price: 265000 },
  { name: 'MOM DRESS ONLY STYLE 2', price: 265000 },
  { name: 'DAD PENDEK', price: 185000 },
  { name: 'DAD PANJANG', price: 210000 },
  { name: 'PASHMINA MOM', price: 80000 },
  { name: 'SCARF MOM', price: 95000 },
  { name: 'GIRL ONESET + ROK', price: 175000 },
  { name: 'GIRL ONESET + CELANA', price: 185000 },
  { name: 'BOY PENDEK', price: 145000 },
  { name: 'BOY PANJANG', price: 160000 }
];

export const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3L'];

export const DEFAULT_COLORS = [
  { name: 'NOIR MATTE', hex: '#1C1917' },
  { name: 'OYSTER WHITE', hex: '#F5F5F4' },
  { name: 'PLUMBERRY LUX', hex: '#581C87' },
  { name: 'SANDY COCOA', hex: '#A87A5B' },
  { name: 'VINTAGE MERLOT', hex: '#831843' }
];

export const PRODUCTS = [];
