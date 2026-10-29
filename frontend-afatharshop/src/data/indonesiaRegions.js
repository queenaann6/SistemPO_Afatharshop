// Comprehensive Indonesian Administrative Regions Data (Provinsi, Kota/Kabupaten, Kecamatan, Kelurahan & Kode Pos)

export const PROVINCES = [
  'Aceh',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Jambi',
  'Sumatera Selatan',
  'Kepulauan Bangka Belitung',
  'Bengkulu',
  'Lampung',
  'DKI Jakarta',
  'Banten',
  'Jawa Barat',
  'Jawa Tengah',
  'DI Yogyakarta',
  'Jawa Timur',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Gorontalo',
  'Sulawesi Tengah',
  'Sulawesi Barat',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
  'Papua Selatan',
  'Papua Tengah',
  'Papua Pegunungan',
  'Papua Barat Daya'
];

export const CITIES_BY_PROVINCE = {
  'Jawa Barat': [
    'Kota Bekasi',
    'Kabupaten Bekasi',
    'Kota Bogor',
    'Kabupaten Bogor',
    'Kota Depok',
    'Kota Bandung',
    'Kabupaten Bandung',
    'Kabupaten Bandung Barat',
    'Kota Cimahi',
    'Kota Cirebon',
    'Kabupaten Cirebon',
    'Kota Sukabumi',
    'Kabupaten Sukabumi',
    'Kota Tasikmalaya',
    'Kabupaten Tasikmalaya',
    'Kabupaten Garut',
    'Kabupaten Karawang',
    'Kabupaten Purwakarta',
    'Kabupaten Subang',
    'Kabupaten Sumedang',
    'Kabupaten Indramayu',
    'Kabupaten Majalengka',
    'Kabupaten Kuningan',
    'Kabupaten Ciamis',
    'Kabupaten Cianjur',
    'Kabupaten Pangandaran',
    'Kota Banjar'
  ],
  'DKI Jakarta': [
    'Jakarta Barat',
    'Jakarta Selatan',
    'Jakarta Timur',
    'Jakarta Pusat',
    'Jakarta Utara',
    'Kepulauan Seribu'
  ],
  Banten: [
    'Kota Tangerang',
    'Kota Tangerang Selatan',
    'Kabupaten Tangerang',
    'Kota Serang',
    'Kabupaten Serang',
    'Kota Cilegon',
    'Kabupaten Lebak',
    'Kabupaten Pandeglang'
  ],
  'Jawa Tengah': [
    'Kota Semarang',
    'Kota Surakarta (Solo)',
    'Kota Magelang',
    'Kota Pekalongan',
    'Kota Salatiga',
    'Kota Tegal',
    'Kabupaten Banyumas',
    'Kabupaten Cilacap',
    'Kabupaten Brebes',
    'Kabupaten Kudus',
    'Kabupaten Jepara',
    'Kabupaten Klaten',
    'Kabupaten Sukoharjo',
    'Kabupaten Karanganyar',
    'Kabupaten Boyolali',
    'Kabupaten Sragen',
    'Kabupaten Wonogiri',
    'Kabupaten Kebumen',
    'Kabupaten Purworejo',
    'Kabupaten Wonosobo',
    'Kabupaten Temanggung',
    'Kabupaten Magelang',
    'Kabupaten Semarang',
    'Kabupaten Demak',
    'Kabupaten Grobogan',
    'Kabupaten Pati',
    'Kabupaten Rembang',
    'Kabupaten Blora',
    'Kabupaten Batang',
    'Kabupaten Kendal',
    'Kabupaten Pekalongan',
    'Kabupaten Pemalang',
    'Kabupaten Tegal',
    'Kabupaten Purbalingga',
    'Kabupaten Banjarnegara'
  ],
  'DI Yogyakarta': [
    'Kota Yogyakarta',
    'Kabupaten Sleman',
    'Kabupaten Bantul',
    'Kabupaten Gunungkidul',
    'Kabupaten Kulon Progo'
  ],
  'Jawa Timur': [
    'Kota Surabaya',
    'Kota Malang',
    'Kota Batu',
    'Kota Sidoarjo',
    'Kabupaten Sidoarjo',
    'Kota Gresik',
    'Kabupaten Gresik',
    'Kota Pasuruan',
    'Kabupaten Pasuruan',
    'Kota Probolinggo',
    'Kabupaten Probolinggo',
    'Kota Kediri',
    'Kabupaten Kediri',
    'Kota Madiun',
    'Kabupaten Madiun',
    'Kota Blitar',
    'Kabupaten Blitar',
    'Kota Mojokerto',
    'Kabupaten Mojokerto',
    'Kabupaten Jember',
    'Kabupaten Banyuwangi',
    'Kabupaten Lamongan',
    'Kabupaten Tuban',
    'Kabupaten Bojonegoro',
    'Kabupaten Lumajang',
    'Kabupaten Ponorogo',
    'Kabupaten Tulungagung',
    'Kabupaten Trenggalek',
    'Kabupaten Ngawi',
    'Kabupaten Magetan',
    'Kabupaten Pacitan',
    'Kabupaten Nganjuk',
    'Kabupaten Bangkalan',
    'Kabupaten Sampang',
    'Kabupaten Pamekasan',
    'Kabupaten Sumenep',
    'Kabupaten Situbondo',
    'Kabupaten Bondowoso'
  ],
  Bali: [
    'Kota Denpasar',
    'Kabupaten Badung',
    'Kabupaten Gianyar',
    'Kabupaten Tabanan',
    'Kabupaten Buleleng',
    'Kabupaten Karangasem',
    'Kabupaten Klungkung',
    'Kabupaten Bangli',
    'Kabupaten Jembrana'
  ],
  'Sumatera Utara': [
    'Kota Medan',
    'Kota Binjai',
    'Kota Pematangsiantar',
    'Kota Tebing Tinggi',
    'Kota Tanjungbalai',
    'Kota Sibolga',
    'Kota Padang Sidempuan',
    'Kota Gunungsitoli',
    'Kabupaten Deli Serdang',
    'Kabupaten Karo',
    'Kabupaten Langkat',
    'Kabupaten Asahan',
    'Kabupaten Simalungun',
    'Kabupaten Serdang Bedagai',
    'Kabupaten Batubara',
    'Kabupaten Labuhanbatu',
    'Kabupaten Tapanuli Utara',
    'Kabupaten Tapanuli Tengah',
    'Kabupaten Tapanuli Selatan',
    'Kabupaten Mandailing Natal',
    'Kabupaten Dairi',
    'Kabupaten Toba'
  ],
  'Sumatera Barat': [
    'Kota Padang',
    'Kota Bukittinggi',
    'Kota Payakumbuh',
    'Kota Pariaman',
    'Kota Padang Panjang',
    'Kota Solok',
    'Kota Sawahlunto',
    'Kabupaten Agam',
    'Kabupaten Tanah Datar',
    'Kabupaten Lima Puluh Kota',
    'Kabupaten Pasaman',
    'Kabupaten Pasaman Barat',
    'Kabupaten Pesisir Selatan',
    'Kabupaten Solok',
    'Kabupaten Solok Selatan'
  ],
  Riau: [
    'Kota Pekanbaru',
    'Kota Dumai',
    'Kabupaten Kampar',
    'Kabupaten Siak',
    'Kabupaten Bengkalis',
    'Kabupaten Indragiri Hilir',
    'Kabupaten Indragiri Hulu',
    'Kabupaten Pelalawan',
    'Kabupaten Rokan Hilir',
    'Kabupaten Rokan Hulu',
    'Kabupaten Kuantan Singingi'
  ],
  'Kepulauan Riau': [
    'Kota Batam',
    'Kota Tanjungpinang',
    'Kabupaten Bintan',
    'Kabupaten Karimun',
    'Kabupaten Natuna',
    'Kabupaten Lingga',
    'Kabupaten Kepulauan Anambas'
  ],
  'Sumatera Selatan': [
    'Kota Palembang',
    'Kota Prabumulih',
    'Kota Lubuklinggau',
    'Kota Pagar Alam',
    'Kabupaten Banyuasin',
    'Kabupaten Ogan Ilir',
    'Kabupaten Ogan Komering Ilir',
    'Kabupaten Muara Enim',
    'Kabupaten Lahat',
    'Kabupaten Musi Banyuasin'
  ],
  Lampung: [
    'Kota Bandar Lampung',
    'Kota Metro',
    'Kabupaten Lampung Selatan',
    'Kabupaten Lampung Tengah',
    'Kabupaten Lampung Timur',
    'Kabupaten Lampung Utara',
    'Kabupaten Pesawaran',
    'Kabupaten Pringsewu',
    'Kabupaten Tanggamus'
  ],
  'Sulawesi Selatan': [
    'Kota Makassar',
    'Kota Parepare',
    'Kota Palopo',
    'Kabupaten Gowa',
    'Kabupaten Maros',
    'Kabupaten Bone',
    'Kabupaten Bulukumba',
    'Kabupaten Bantaeng',
    'Kabupaten Wajo',
    'Kabupaten Luwu',
    'Kabupaten Tana Toraja'
  ],
  'Kalimantan Timur': [
    'Kota Samarinda',
    'Kota Balikpapan',
    'Kota Bontang',
    'Kabupaten Kutai Kartanegara',
    'Kabupaten Kutai Timur',
    'Kabupaten Berau',
    'Kabupaten Penajam Paser Utara',
    'Kabupaten Paser'
  ],
  'Kalimantan Barat': [
    'Kota Pontianak',
    'Kota Singkawang',
    'Kabupaten Kubu Raya',
    'Kabupaten Mempawah',
    'Kabupaten Sambas',
    'Kabupaten Ketapang',
    'Kabupaten Sintang'
  ],
  'Kalimantan Selatan': [
    'Kota Banjarmasin',
    'Kota Banjarbaru',
    'Kabupaten Banjar',
    'Kabupaten Tanah Bumbu',
    'Kabupaten Kotabaru',
    'Kabupaten Barito Kuala'
  ],
  'Sulawesi Utara': [
    'Kota Manado',
    'Kota Bitung',
    'Kota Tomohon',
    'Kota Kotamobagu',
    'Kabupaten Minahasa',
    'Kabupaten Minahasa Utara'
  ],
  'Nusa Tenggara Barat': [
    'Kota Mataram',
    'Kota Bima',
    'Kabupaten Lombok Barat',
    'Kabupaten Lombok Tengah',
    'Kabupaten Lombok Timur',
    'Kabupaten Sumbawa'
  ],
  'Nusa Tenggara Timur': [
    'Kota Kupang',
    'Kabupaten Kupang',
    'Kabupaten Manggarai Barat (Labuan Bajo)',
    'Kabupaten Ende',
    'Kabupaten Sikka'
  ],
  Papua: [
    'Kota Jayapura',
    'Kabupaten Jayapura',
    'Kabupaten Keerom',
    'Kabupaten Sarmi'
  ]
};

export const DISTRICTS_BY_CITY = {
  'Kota Bekasi': [
    'Bekasi Barat',
    'Bekasi Selatan',
    'Bekasi Timur',
    'Bekasi Utara',
    'Pondok Gede',
    'Medansatria',
    'Jatiasih',
    'Rawalumbu',
    'Mustikajaya',
    'Pondok Melati',
    'Jatisampurna',
    'Bantargebang'
  ],
  'Kabupaten Bekasi': [
    'Babelan',
    'Tambun Selatan',
    'Tambun Utara',
    'Cikarang Barat',
    'Cikarang Pusat',
    'Cikarang Selatan',
    'Cikarang Utara',
    'Cikarang Timur',
    'Cibitung',
    'Setu',
    'Tarumajaya',
    'Sukatani'
  ],
  'Kota Bogor': [
    'Bogor Barat',
    'Bogor Tengah',
    'Bogor Selatan',
    'Bogor Timur',
    'Bogor Utara',
    'Tanah Sareal'
  ],
  'Kabupaten Bogor': [
    'Cibinong',
    'Cileungsi',
    'Gunung Putri',
    'Bojong Gede',
    'Kemang',
    'Ciawi',
    'Cisarua',
    'Parung',
    'Citeureup',
    'Babakan Madang (Sentul)'
  ],
  'Kota Depok': [
    'Pancoran Mas',
    'Beji',
    'Sukmajaya',
    'Cimanggis',
    'Cinere',
    'Sawangan',
    'Tapos',
    'Bojongsari',
    'Cilodong',
    'Limo',
    'Cipayung'
  ],
  'Kota Bandung': [
    'Coblong',
    'Sukajadi',
    'Lengkong',
    'Andir',
    'Cicendo',
    'Regol',
    'Batununggal',
    'Buahbatu',
    'Kiaracondong',
    'Antapani',
    'Arcamanik',
    'Bandung Wetan'
  ],
  'Jakarta Barat': [
    'Kebon Jeruk',
    'Palmerah',
    'Grogol Petamburan',
    'Kembangan',
    'Cengkareng',
    'Kalideres',
    'Tamansari',
    'Tambora'
  ],
  'Jakarta Selatan': [
    'Kebayoran Baru',
    'Kebayoran Lama',
    'Cilandak',
    'Tebet',
    'Pasar Minggu',
    'Setiabudi',
    'Mampang Prapatan',
    'Pancoran',
    'Pesanggrahan',
    'Jagakarsa'
  ],
  'Jakarta Timur': [
    'Duren Sawit',
    'Jatinegara',
    'Cakung',
    'Kramat Jati',
    'Matraman',
    'Pasar Rebo',
    'Pulo Gadung',
    'Ciracas',
    'Cipayung',
    'Makasar'
  ],
  'Jakarta Pusat': [
    'Menteng',
    'Tanah Abang',
    'Gambir',
    'Senen',
    'Cempaka Putih',
    'Johar Baru',
    'Kemayoran',
    'Sawah Besar'
  ],
  'Jakarta Utara': [
    'Kelapa Gading',
    'Tanjung Priok',
    'Penjaringan',
    'Pademangan',
    'Koja',
    'Cilincing'
  ],
  'Kota Tangerang': [
    'Tangerang',
    'Cipondoh',
    'Karawaci',
    'Ciledug',
    'Batuceper',
    'Benda',
    'Cibodas',
    'Larangan',
    'Pinang'
  ],
  'Kota Tangerang Selatan': [
    'Serpong',
    'Serpong Utara',
    'Pondok Aren (Bintaro)',
    'Pamulang',
    'Ciputat',
    'Ciputat Timur',
    'Setu'
  ],
  'Kota Medan': [
    'Medan Sunggal',
    'Medan Kota',
    'Medan Baru',
    'Medan Petisah',
    'Medan Barat',
    'Medan Timur',
    'Medan Denai',
    'Medan Helvetia',
    'Medan Johor',
    'Medan Selayang',
    'Medan Tembung'
  ],
  'Kota Surabaya': [
    'Gubeng',
    'Wonokromo',
    'Sukolilo',
    'Rungkut',
    'Tegalsari',
    'Genteng',
    'Bubutan',
    'Sawahan',
    'Tambaksari',
    'Mulyorejo',
    'Sambikerep',
    'Dukuh Pakis'
  ],
  'Kota Semarang': [
    'Semarang Tengah',
    'Semarang Barat',
    'Semarang Timur',
    'Semarang Selatan',
    'Semarang Utara',
    'Banyumanik',
    'Gajahmungkur',
    'Candisari',
    'Pedurungan',
    'Ngaliyan'
  ],
  'Kota Surakarta (Solo)': [
    'Banjarsari',
    'Jebres',
    'Laweyan',
    'Pasar Kliwon',
    'Serengan'
  ],
  'Kabupaten Cilacap': [
    'Majenang',
    'Cilacap Selatan',
    'Cilacap Tengah',
    'Cilacap Utara',
    'Kroya',
    'Sidareja'
  ],
  'Kota Denpasar': [
    'Denpasar Timur',
    'Denpasar Barat',
    'Denpasar Selatan',
    'Denpasar Utara'
  ]
};

export const SUBDISTRICTS_BY_DISTRICT = {
  // Bekasi Barat
  'Bekasi Barat': [
    { name: 'Jakasampurna', postalCode: '17145' },
    { name: 'Kranji', postalCode: '17135' },
    { name: 'Bintara', postalCode: '17134' },
    { name: 'Bintara Jaya', postalCode: '17136' },
    { name: 'Kota Baru', postalCode: '17139' }
  ],
  // Bekasi Selatan
  'Bekasi Selatan': [
    { name: 'Pekayon Jaya', postalCode: '17148' },
    { name: 'Jaka Mulya', postalCode: '17146' },
    { name: 'Jaka Setia', postalCode: '17147' },
    { name: 'Kayuringin Jaya', postalCode: '17144' },
    { name: 'Marga Jaya', postalCode: '17141' }
  ],
  // Bekasi Timur
  'Bekasi Timur': [
    { name: 'Aren Jaya', postalCode: '17111' },
    { name: 'Duren Jaya', postalCode: '17112' },
    { name: 'Margahayu', postalCode: '17113' },
    { name: 'Bekasi Jaya', postalCode: '17114' }
  ],
  // Bekasi Utara
  'Bekasi Utara': [
    { name: 'Harapan Baru', postalCode: '17123' },
    { name: 'Harapan Jaya', postalCode: '17124' },
    { name: 'Kaliabang Tengah', postalCode: '17125' },
    { name: 'Perwira', postalCode: '17122' },
    { name: 'Teluk Pucung', postalCode: '17121' }
  ],
  // Babelan
  Babelan: [
    { name: 'Kedung Pengawas', postalCode: '17164' },
    { name: 'Babelan Kota', postalCode: '17610' },
    { name: 'Bahagia', postalCode: '17612' },
    { name: 'Kebalen', postalCode: '17610' }
  ],
  // Tambun Selatan
  'Tambun Selatan': [
    { name: 'Tambun', postalCode: '17510' },
    { name: 'Mangunjaya', postalCode: '17510' },
    { name: 'Mekarsari', postalCode: '17510' },
    { name: 'Setiadarma', postalCode: '17510' },
    { name: 'Tridaya Sakti', postalCode: '17510' },
    { name: 'Jatimulya', postalCode: '17515' },
    { name: 'Lambangsari', postalCode: '17510' }
  ],
  // Medan Sunggal
  'Medan Sunggal': [
    { name: 'Sei Sikambing B', postalCode: '20122' },
    { name: 'Babura Sunggal', postalCode: '20121' },
    { name: 'Simpang Tanjung', postalCode: '20122' },
    { name: 'Sunggal', postalCode: '20128' },
    { name: 'Tanjung Rejo', postalCode: '20122' },
    { name: 'Lalang', postalCode: '20127' }
  ],
  // Kebon Jeruk
  'Kebon Jeruk': [
    { name: 'Duri Kepa', postalCode: '11510' },
    { name: 'Kebon Jeruk', postalCode: '11530' },
    { name: 'Kedoya Selatan', postalCode: '11520' },
    { name: 'Kedoya Utara', postalCode: '11520' },
    { name: 'Sukabumi Utara', postalCode: '11540' },
    { name: 'Kelapa Dua', postalCode: '11550' },
    { name: 'Sukabumi Selatan', postalCode: '11560' }
  ],
  // Majenang
  Majenang: [
    { name: 'Bener', postalCode: '53257' },
    { name: 'Jenang', postalCode: '53257' },
    { name: 'Pahonjean', postalCode: '53257' },
    { name: 'Boja', postalCode: '53257' },
    { name: 'Cibeunying', postalCode: '53257' },
    { name: 'Mulyasari', postalCode: '53257' },
    { name: 'Padangsari', postalCode: '53257' },
    { name: 'Cilopadang', postalCode: '53257' }
  ],
  // Denpasar Timur
  'Denpasar Timur': [
    { name: 'Kesiman', postalCode: '80237' },
    { name: 'Kesiman Petilan', postalCode: '80237' },
    { name: 'Kesiman Kertalangu', postalCode: '80237' },
    { name: 'Sumerta', postalCode: '80235' },
    { name: 'Sumerta Kelod', postalCode: '80239' },
    { name: 'Dangin Puri', postalCode: '80232' },
    { name: 'Penatih', postalCode: '80238' }
  ],
  // Bogor Barat
  'Bogor Barat': [
    { name: 'Menteng', postalCode: '16111' },
    { name: 'Cilendek Barat', postalCode: '16112' },
    { name: 'Cilendek Timur', postalCode: '16112' },
    { name: 'Semplak', postalCode: '16114' },
    { name: 'Bubulak', postalCode: '16115' },
    { name: 'Pasirmulya', postalCode: '16118' },
    { name: 'Loji', postalCode: '16117' }
  ],
  // Bogor Tengah
  'Bogor Tengah': [
    { name: 'Babakan', postalCode: '16128' },
    { name: 'Gudang', postalCode: '16123' },
    { name: 'Paledang', postalCode: '16122' },
    { name: 'Panaragan', postalCode: '16125' },
    { name: 'Sempur', postalCode: '16129' },
    { name: 'Tegallega', postalCode: '16129' }
  ],
  // Kemang (Bogor)
  Kemang: [
    { name: 'Atang Sanjaya', postalCode: '16310' },
    { name: 'Kemang', postalCode: '16310' },
    { name: 'Bojong', postalCode: '16310' },
    { name: 'Semplak Barat', postalCode: '16310' }
  ],
  // Duren Sawit
  'Duren Sawit': [
    { name: 'Duren Sawit', postalCode: '13440' },
    { name: 'Pondok Kelapa', postalCode: '13450' },
    { name: 'Pondok Kopi', postalCode: '13460' },
    { name: 'Klender', postalCode: '13470' },
    { name: 'Pondok Bambu', postalCode: '13430' }
  ],
  // Pancoran Mas (Depok)
  'Pancoran Mas': [
    { name: 'Depok', postalCode: '16431' },
    { name: 'Depok Jaya', postalCode: '16432' },
    { name: 'Mampang', postalCode: '16436' },
    { name: 'Pancoran Mas', postalCode: '16436' },
    { name: 'Rangkapan Jaya', postalCode: '16435' }
  ],
  // Coblong (Bandung)
  Coblong: [
    { name: 'Dago', postalCode: '40135' },
    { name: 'Lebakgede', postalCode: '40132' },
    { name: 'Lebaksiliwangi', postalCode: '40132' },
    { name: 'Sadang Serang', postalCode: '40133' },
    { name: 'Sekeloa', postalCode: '40134' }
  ],
  // Gubeng (Surabaya)
  Gubeng: [
    { name: 'Gubeng', postalCode: '60281' },
    { name: 'Kertajaya', postalCode: '60282' },
    { name: 'Pucang Sewu', postalCode: '60283' },
    { name: 'Barata Jaya', postalCode: '60284' },
    { name: 'Mojo', postalCode: '60285' },
    { name: 'Airlangga', postalCode: '60286' }
  ]
};

// Helper utilities
export function getCitiesForProvince(provinceName) {
  if (!provinceName) return [];
  return CITIES_BY_PROVINCE[provinceName] || [
    `Kota ${provinceName}`,
    `Kabupaten ${provinceName}`
  ];
}

export function getDistrictsForCity(cityName) {
  if (!cityName) return [];
  if (DISTRICTS_BY_CITY[cityName]) {
    return DISTRICTS_BY_CITY[cityName];
  }
  // Generic fallback districts for any other regency/city
  return [
    `${cityName} Barat`,
    `${cityName} Timur`,
    `${cityName} Selatan`,
    `${cityName} Utara`,
    `${cityName} Pusat`
  ];
}

export function getSubdistrictsForDistrict(districtName) {
  if (!districtName) return [];
  if (SUBDISTRICTS_BY_DISTRICT[districtName]) {
    return SUBDISTRICTS_BY_DISTRICT[districtName];
  }
  return [
    { name: `${districtName} I`, postalCode: '' },
    { name: `${districtName} II`, postalCode: '' },
    { name: `${districtName} Raya`, postalCode: '' }
  ];
}
