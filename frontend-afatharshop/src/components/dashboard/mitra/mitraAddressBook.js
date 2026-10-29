export const MITRA_ADDRESS_BOOK = [
  {
    id: 1,
    name: 'HENI',
    recipient: 'HENI',
    phone: '081219991888',
    phoneDisplay: '(+62) 0812-1999-1888',
    email: 'afatharshop@maknahijab.com',
    isPrimary: true,
    isDefault: true,
    street: 'Perumnas 1 Jl Bungur Raya Rt 12 Rw 7 No 86',
    subdistrict: 'Jakasampurna',
    district: 'Bekasi Barat',
    city: 'Kota Bekasi',
    province: 'Jawa Barat',
    postalCode: '17145',
    address:
      'Perumnas 1 Jl Bungur Raya Rt 12 Rw 7 No 86, Kelurahan Jakasampurna, Kecamatan Bekasi Barat, Kota Bekasi, Jawa Barat 17145'
  },
  {
    id: 2,
    name: 'IDAR',
    recipient: 'IDAR',
    phone: '081360001215',
    phoneDisplay: '(+62) 081360001215',
    email: 'idar.medan@gmail.com',
    isPrimary: false,
    isDefault: false,
    street: 'MIE ACEH TUTI BOBROK JL SETIA BUDI',
    subdistrict: 'Sei Sikambing B',
    district: 'Medan Sunggal',
    city: 'Kota Medan',
    province: 'Sumatera Utara',
    postalCode: '20122',
    address:
      'MIE ACEH TUTI BOBROK JL SETIA BUDI, Kelurahan Sei Sikambing B, Kecamatan Medan Sunggal, Kota Medan, Sumatera Utara 20122'
  },
  {
    id: 3,
    name: 'ZENI KRISTIANA',
    recipient: 'ZENI KRISTIANA',
    phone: '081382317110',
    phoneDisplay: '(+62) 081382317110',
    email: 'zeni.kristiana@gmail.com',
    isPrimary: false,
    isDefault: false,
    street: 'PERUM. PONDOK AFI 2 BLOK I6 NO 21',
    subdistrict: 'Kedung Pengawas',
    district: 'Babelan',
    city: 'Kabupaten Bekasi',
    province: 'Jawa Barat',
    postalCode: '17164',
    address:
      'PERUM. PONDOK AFI 2 BLOK I6 NO 21, Kelurahan Kedung Pengawas, Kecamatan Babelan, Kabupaten Bekasi, Jawa Barat 17164'
  },
  {
    id: 4,
    name: 'Puji Astuti',
    recipient: 'Puji Astuti',
    phone: '087778093609',
    phoneDisplay: '(+62) 0877-7809-3609',
    email: 'puji.astuti@gmail.com',
    isPrimary: false,
    isDefault: false,
    street: 'Jl. H. Halimi no 02 Rt 02/RW 06 Dusun Dawuan (belakang TPA Baiturrahman) Desa Bener',
    subdistrict: 'Bener',
    district: 'Majenang',
    city: 'Kabupaten Cilacap',
    province: 'Jawa Tengah',
    postalCode: '53257',
    address:
      'Jl. H. Halimi no 02 Rt 02/RW 06 Dusun Dawuan, Kelurahan Bener, Kecamatan Majenang, Kabupaten Cilacap, Jawa Tengah 53257'
  },
  {
    id: 5,
    name: 'Hesty',
    recipient: 'Hesty',
    phone: '081517439155',
    phoneDisplay: '(+62) 0815-1743-9155',
    email: 'hesty@gmail.com',
    isPrimary: false,
    isDefault: false,
    street: 'Jl. Duri Kepa Gg. H. Sanusi Rt.004/08 No. 46',
    subdistrict: 'Duri Kepa',
    district: 'Kebon Jeruk',
    city: 'Jakarta Barat',
    province: 'DKI Jakarta',
    postalCode: '11510',
    address:
      'Jl. Duri Kepa Gg. H. Sanusi Rt.004/08 No. 46, Kelurahan Duri Kepa, Kecamatan Kebon Jeruk, Jakarta Barat, DKI Jakarta 11510'
  },
  {
    id: 6,
    name: 'Bu siti khofifah (mama rozan)',
    recipient: 'Bu siti khofifah',
    phone: '081338055512',
    phoneDisplay: '(+62) 0813-3805-5512',
    email: 'sitikhofifah@gmail.com',
    isPrimary: false,
    isDefault: false,
    street: 'JL Sedap malam II no.8 Kesiman',
    subdistrict: 'Kesiman',
    district: 'Denpasar Timur',
    city: 'Kota Denpasar',
    province: 'Bali',
    postalCode: '80237',
    address:
      'JL Sedap malam II no.8 Kesiman, Kelurahan Kesiman, Kecamatan Denpasar Timur, Kota Denpasar, Bali 80237'
  }
];

export function getStoredAddresses() {
  if (typeof window === 'undefined') return MITRA_ADDRESS_BOOK;
  try {
    const raw = localStorage.getItem('afathar_saved_addresses');
    if (!raw) return MITRA_ADDRESS_BOOK;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : MITRA_ADDRESS_BOOK;
  } catch (e) {
    console.warn('Failed to parse stored addresses', e);
    return MITRA_ADDRESS_BOOK;
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
  const parts = [];
  if (address && address.trim()) parts.push(address.trim());
  if (subdistrict && subdistrict.trim()) parts.push(`Kelurahan ${subdistrict.trim()}`);
  if (district && district.trim()) parts.push(`Kecamatan ${district.trim()}`);
  if (city && city.trim()) parts.push(city.trim());
  if (province && province.trim()) parts.push(province.trim());
  if (postalCode && postalCode.trim()) parts.push(postalCode.trim());
  return parts.join(', ');
}
