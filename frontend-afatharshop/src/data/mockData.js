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
  productsCount: 1203,
  processTime: '± 1-2 hari'
};

export const DEFAULT_PAYMENT_STAGES = [
  { stage: 'TAHAP 1', label: 'DP 25%', date: '05 Okt - 02 Nov 2026', percent: 25 },
  { stage: 'TAHAP 2', label: 'Cicilan 50%', date: '07 Desember 2026', percent: 50 },
  { stage: 'TAHAP 3', label: 'Pelunasan 25%', date: '04 Januari 2027', percent: 25 }
];

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

export const PRODUCTS = [
  {
    id: 1,
    title: 'Safiyya Premium Abaya Set',
    series: 'OFFICIAL EXCLUSIVE COLLECTION • 2027 SERIES',
    sku: 'Safiyya Premium Abaya Set | Seri Arunika Espresso',
    brand: 'COVERME HIJAB',
    brandId: 'coverme',
    category: 'Gamis & Abaya',
    price: 90000,
    priceMin: 80000,
    priceMax: 265000,
    originalPrice: 295000,
    discountPercent: 16,
    isSale: true,
    status: 'pre_order',
    statusLabel: 'Open Pre-Order',
    tutupPO: '13 Oktober 2026',
    tutupPODetail: '13 Oktober 2026 pukul 10:30 WIB',
    estimatedShipment: '09 Januari 2027',
    overlayText: 'Tutup PO 13 Oktober 2026',
    minDpPercent: 25,
    stockQuota: 48,
    paymentStages: DEFAULT_PAYMENT_STAGES,
    models: DEFAULT_MODELS,
    sizes: DEFAULT_SIZES,
    colors: DEFAULT_COLORS,
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85',
    thumbnails: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80'
    ],
    descriptionDetailed: {
      summary: 'Koleksi sarimbit sarat keanggunan keluarga dengan perpaduan Jacquard Silk & Katun Toyobo premium yang adem, flowy, dan nyaman seharian.',
      materialGamis: 'Jacquard Silk Exclusive x Ceruty Babydoll Armani (lembut, jatuh, tidak menerawang)',
      materialKoko: 'Katun Toyobo Fodu Premium (adem, halus, tidak mudah kusut)',
      fiturGamis: 'Busui friendly (resleting depan), wudhu friendly manset kancing, cutting A-line flowy',
      fiturKoko: 'Kerah shanghai modern, saku paspol dada, kancing tersembunyi',
      panduanMomDad: 'XS s/d 3L (Lingkar Dada 90-120 cm, PB 135-142 cm / Koko 70-80 cm)',
      panduanKids: 'Kids Size 1-3 (Usia 2-12 tahun)',
      toleransi: 'Toleransi jahitan ± 1-2 cm'
    },
    store: DEFAULT_STORE
  },
  {
    id: 2,
    title: 'Arunika Family Series - Espresso',
    series: 'OFFICIAL EXCLUSIVE COLLECTION • 2027 SERIES',
    sku: 'Arunika Family Series | Espresso Edition',
    brand: 'COVERME HIJAB',
    brandId: 'coverme',
    category: 'Sarimbit Keluarga',
    price: 349000,
    priceMin: 120000,
    priceMax: 349000,
    originalPrice: 388000,
    discountPercent: 10,
    isSale: true,
    status: 'pre_order',
    statusLabel: 'Open Pre-Order',
    tutupPO: '13 Oktober 2026',
    tutupPODetail: '13 Oktober 2026 pukul 10:30 WIB',
    estimatedShipment: '15 Januari 2027',
    overlayText: 'Tutup PO 13 Oktober 2026',
    minDpPercent: 25,
    stockQuota: 36,
    paymentStages: DEFAULT_PAYMENT_STAGES,
    models: DEFAULT_MODELS,
    sizes: DEFAULT_SIZES,
    colors: DEFAULT_COLORS,
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1000&q=85',
    thumbnails: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=500&q=80'
    ],
    descriptionDetailed: {
      summary: 'Sarimbit keluarga nuansa espresso hangat dengan siluet kontemporer berpadu aksen bordir etnik istimewa.',
      materialGamis: 'Royal Silk Jacquard mix Ceruty Baby Doll',
      materialKoko: 'Toyobo Fodu Silk Breathable',
      fiturGamis: 'Hidden zipper depan, aksen layer depan bertingkat anggun',
      fiturKoko: 'Kerah tegak formal, saku samping fungsional',
      panduanMomDad: 'S s/d XXL (LD 92-118 cm)',
      panduanKids: 'Size 1-5 (Usia 3-10 tahun)',
      toleransi: 'Toleransi jahitan ± 1-2 cm'
    },
    store: DEFAULT_STORE
  },
  {
    id: 3,
    title: 'Sarimbit Royal Blue Elegance Edition',
    series: 'LUXURY HERITAGE • 2027 SERIES',
    sku: 'Sarimbit Royal Blue | Isa Heritage Exclusive',
    brand: 'ISA LUXURY',
    brandId: 'isa',
    category: 'Sarimbit Keluarga',
    price: 395000,
    priceMin: 145000,
    priceMax: 395000,
    originalPrice: 439000,
    discountPercent: 10,
    isSale: true,
    status: 'pre_order',
    statusLabel: 'Open Pre-Order',
    tutupPO: '15 Oktober 2026',
    tutupPODetail: '15 Oktober 2026 pukul 17:00 WIB',
    estimatedShipment: '20 Januari 2027',
    overlayText: 'Tutup PO 15 Oktober 2026',
    minDpPercent: 25,
    stockQuota: 24,
    paymentStages: DEFAULT_PAYMENT_STAGES,
    models: DEFAULT_MODELS,
    sizes: DEFAULT_SIZES,
    colors: DEFAULT_COLORS,
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=85',
    thumbnails: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80'
    ],
    descriptionDetailed: {
      summary: 'Sentuhan kemewahan keluarga bernuansa sapphire royal blue dengan motif ornamen eksklusif yang anggun.',
      materialGamis: 'Silk Premium & Brokat Chantilly Import',
      materialKoko: 'Katun Toyobo Deluxe Soft Touch',
      fiturGamis: 'Manset kancing permata, busui friendly resleting jepang',
      fiturKoko: 'Kancing sembunyi eksklusif Isa Luxury',
      panduanMomDad: 'S s/d 3L (LD 94-122 cm)',
      panduanKids: 'Kids S-XL (Usia 2-11 tahun)',
      toleransi: 'Toleransi jahitan ± 1-2 cm'
    },
    store: DEFAULT_STORE
  },
  {
    id: 4,
    title: 'Timeline Syari Exclusive Luxury Hijab',
    series: 'KAEN BOUTIQUE SIGNATURE',
    sku: 'Timeline Syari Luxury | Kaen Edition',
    brand: 'KAEN BOUTIQUE',
    brandId: 'kaen',
    category: 'Khimar & Bergo Syar\'i',
    price: 288000,
    priceMin: 120000,
    priceMax: 288000,
    originalPrice: 320000,
    discountPercent: 10,
    isSale: true,
    status: 'pre_order',
    statusLabel: 'Open Pre-Order',
    tutupPO: '20 Oktober 2026',
    tutupPODetail: '20 Oktober 2026 pukul 21:00 WIB',
    estimatedShipment: '25 Januari 2027',
    overlayText: 'Tutup PO 20 Oktober 2026',
    minDpPercent: 25,
    stockQuota: 50,
    paymentStages: DEFAULT_PAYMENT_STAGES,
    models: [
      { name: 'KHIMAR SYARI JUMBO', price: 288000 },
      { name: 'KHIMAR SYARI STANDARD', price: 235000 },
      { name: 'PASHMINA INNER INSTANT', price: 120000 }
    ],
    sizes: ['Standard', 'Jumbo'],
    colors: DEFAULT_COLORS,
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=85',
    thumbnails: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500&q=80'
    ],
    descriptionDetailed: {
      summary: 'Khimar syar\'i anggun dengan kristal bordir khas Kaen Boutique, jatuh anggun dan menutupi dada secara sempurna.',
      materialGamis: 'Ceruty Diamond Crepe 2 Layer',
      materialKoko: 'Bahan Halus Adem',
      fiturGamis: 'Soft pet antem pembentuk wajah tirus',
      fiturKoko: 'Jahitan kelim rapi standar butik',
      panduanMomDad: 'Panjang Depan 105cm, Belakang 135cm',
      panduanKids: 'Free size syar\'i',
      toleransi: 'Toleransi jahitan ± 1-2 cm'
    },
    store: DEFAULT_STORE
  },
  {
    id: 5,
    title: 'Bunga Raya Premium Scarf & Dress',
    series: 'DALANOVA BOTANICAL SERIES',
    sku: 'Bunga Raya Scarf Dress | Dalanova',
    brand: 'DALANOVA',
    brandId: 'dalanova',
    category: 'Gamis & Abaya',
    price: 315000,
    priceMin: 95000,
    priceMax: 315000,
    originalPrice: 350000,
    discountPercent: 10,
    isSale: true,
    status: 'pre_order',
    statusLabel: 'Open Pre-Order',
    tutupPO: '18 Oktober 2026',
    tutupPODetail: '18 Oktober 2026 pukul 12:00 WIB',
    estimatedShipment: '05 Februari 2027',
    overlayText: 'Tutup PO 18 Oktober 2026',
    minDpPercent: 25,
    stockQuota: 40,
    paymentStages: DEFAULT_PAYMENT_STAGES,
    models: DEFAULT_MODELS,
    sizes: DEFAULT_SIZES,
    colors: DEFAULT_COLORS,
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=85',
    thumbnails: [
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=500&q=80'
    ],
    descriptionDetailed: {
      summary: 'Paduan dress motif botanical eksklusif Bunga Raya Dalanova bersama scarf senada, nyaman dipakai seharian.',
      materialGamis: 'Armany Silk Print & Voal Sahara Premium',
      materialKoko: 'Katun Toyobo Fodu',
      fiturGamis: 'Manset karet wudhu, aksen pita leher manis',
      fiturKoko: 'Kerah kemeja formal santai',
      panduanMomDad: 'Regular Fit (S-M) & Plus Fit (L-XXL)',
      panduanKids: 'Size 1-3 Kids',
      toleransi: 'Toleransi jahitan ± 1-2 cm'
    },
    store: DEFAULT_STORE
  },
  {
    id: 6,
    title: 'Oneset Muslimah Dita & Voal Kids',
    series: 'BABYJAB KIDS COMFORT',
    sku: 'Dita Oneset Voal Kids | Babyjab',
    brand: 'BABYJAB HIJAB',
    brandId: 'babyjab',
    category: 'Oneset & Kids',
    price: 111200,
    priceMin: 85000,
    priceMax: 140000,
    originalPrice: 140000,
    discountPercent: 20,
    isSale: true,
    status: 'pre_order',
    statusLabel: 'Open Pre-Order',
    tutupPO: '22 September 2026',
    tutupPODetail: '22 September 2026 pukul 15:00 WIB',
    estimatedShipment: '15 Oktober 2026',
    overlayText: 'Tutup PO 22 September 2026',
    minDpPercent: 25,
    stockQuota: 30,
    paymentStages: DEFAULT_PAYMENT_STAGES,
    models: [
      { name: 'ONESET + VOAL KIDS', price: 140000 },
      { name: 'DRESS ONLY KIDS', price: 111200 },
      { name: 'VOAL KIDS ONLY', price: 85000 }
    ],
    sizes: ['Size 1 (1-2 Thn)', 'Size 2 (2-3 Thn)', 'Size 3 (3-4 Thn)'],
    colors: DEFAULT_COLORS,
    image: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=1000&q=85',
    thumbnails: [
      'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=500&q=80'
    ],
    descriptionDetailed: {
      summary: 'Oneset manis untuk si kecil dengan voal motif ramah anak, adem, menyerap keringat dan tidak bikin gerah.',
      materialGamis: 'Cotton Combed 30s & Voal Printing Halus',
      materialKoko: 'Cotton Lembut',
      fiturGamis: 'Pinggang karet elastis lembut, voal instan',
      fiturKoko: 'Jahitan halus anti gatal untuk anak',
      panduanMomDad: 'Kids Series Spesifik',
      panduanKids: 'Size 1 s/d Size 3',
      toleransi: 'Toleransi jahitan ± 1 cm'
    },
    store: DEFAULT_STORE
  },
  {
    id: 7,
    title: 'Timeline Avica Bag Collection',
    series: 'LEATHER LUXE COLLECTION',
    sku: 'Timeline Avica Bag | Coverme Luxury',
    brand: 'COVERME HIJAB',
    brandId: 'coverme',
    category: 'Tas Kulit & Aksesoris',
    price: 93750,
    priceMin: 93750,
    priceMax: 185000,
    originalPrice: 195000,
    discountPercent: 10,
    isSale: false,
    status: 'closed_po',
    statusLabel: 'Closed PO',
    tutupPO: '29 September 2026',
    tutupPODetail: '29 September 2026 pukul 23:59 WIB',
    estimatedShipment: '15 November 2026',
    overlayText: 'PO Ditutup 29 Sep',
    minDpPercent: 50,
    stockQuota: 0,
    paymentStages: DEFAULT_PAYMENT_STAGES,
    models: [
      { name: 'AVICA TOTE BAG REGULAR', price: 185000 },
      { name: 'AVICA SLING BAG MINI', price: 93750 }
    ],
    sizes: ['Medium 28x20x10 cm'],
    colors: DEFAULT_COLORS,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85',
    thumbnails: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=500&q=80'
    ],
    descriptionDetailed: {
      summary: 'Tas jinjing dan selempang berdesain timeless, kompartemen luas cocok untuk kegiatan formal maupun harian.',
      materialGamis: 'Synthetic PU Leather Grade A',
      materialKoko: 'Hardware Gold Metal Anti Karat',
      fiturGamis: 'Resleting utama kuat, strap kulit adjustable',
      fiturKoko: 'Tali selempang dan handle strap empuk',
      panduanMomDad: 'Dimensi 28 x 20 x 10 cm',
      panduanKids: 'Cocok Dewasa',
      toleransi: 'Toleransi ukuran ± 0.5 cm'
    },
    store: DEFAULT_STORE
  },
  {
    id: 8,
    title: 'Coverme Selaras Syar\'i Exclusive',
    series: 'SELARAS SERI RESMI • 2027',
    sku: 'Coverme Selaras Syari | Exclusive Set',
    brand: 'COVERME HIJAB',
    brandId: 'coverme',
    category: 'Khimar & Bergo Syar\'i',
    price: 119200,
    priceMin: 85000,
    priceMax: 119200,
    originalPrice: 129000,
    discountPercent: 8,
    isSale: false,
    status: 'pre_order',
    statusLabel: 'Open Pre-Order',
    tutupPO: '05 Oktober 2026',
    tutupPODetail: '05 Oktober 2026 pukul 18:00 WIB',
    estimatedShipment: '10 November 2026',
    overlayText: 'Tutup PO 05 Oktober 2026',
    minDpPercent: 25,
    stockQuota: 60,
    paymentStages: DEFAULT_PAYMENT_STAGES,
    models: DEFAULT_MODELS,
    sizes: DEFAULT_SIZES,
    colors: DEFAULT_COLORS,
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=85',
    thumbnails: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80'
    ],
    descriptionDetailed: {
      summary: 'Set gamis dan khimar harian dengan bahan crinkle premium anti kusut, praktis tanpa perlu disetrika.',
      materialGamis: 'Airflow Crinkle Soft Premium',
      materialKoko: 'Katun Adem',
      fiturGamis: 'Kancing depan busui, manset karet nyaman',
      fiturKoko: 'Saku samping kanan kiri',
      panduanMomDad: 'M, L, XL (LD 98-115 cm)',
      panduanKids: 'Tersedia varian anak',
      toleransi: 'Toleransi jahitan ± 1 cm'
    },
    store: DEFAULT_STORE
  }
];
