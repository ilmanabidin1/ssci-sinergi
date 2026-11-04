// Contoh data untuk uji alur. Satu klik menghasilkan satu skenario nasabah yang
// utuh: identitas, usaha, keuangan, akad, dan profil format BPRS diturunkan dari
// persona yang sama, sehingga angka-angkanya masuk akal dan tidak saling
// bertentangan (NIK sesuai tanggal lahir dan jenis kelamin, omzet sesuai jenis
// usaha, angsuran di bawah batas DSR 40%, agunan di atas 125% plafon).

import { facilityInstallment, type BprsProfile } from "./bprsTemplate";

type Rng = () => number;
const pick = <T,>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)]!;
const randInt = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const pad = (value: number, length: number) => String(value).padStart(length, "0");

type Region = { province: string; provinceCode: string; city: string; cityCode: string; kecamatan: Array<[string, string]>; postal: string };

/** Wilayah sekitar BPRS mitra (Bandung Raya) ditambah beberapa kota besar. Kecamatan berpasangan dengan satu kelurahan. */
const REGIONS: Region[] = [
  { province: "Jawa Barat", provinceCode: "32", city: "Kota Bandung", cityCode: "73", postal: "40", kecamatan: [["Coblong", "Dago"], ["Lengkong", "Turangga"], ["Cicendo", "Pasirkaliki"], ["Batununggal", "Kebon Gedang"], ["Kiaracondong", "Babakan Sari"]] },
  { province: "Jawa Barat", provinceCode: "32", city: "Kabupaten Bandung", cityCode: "04", postal: "40", kecamatan: [["Banjaran", "Kiangroke"], ["Soreang", "Pamekaran"], ["Pangalengan", "Pangalengan"], ["Cimaung", "Cimaung"], ["Arjasari", "Baros"]] },
  { province: "Jawa Barat", provinceCode: "32", city: "Kota Cimahi", cityCode: "77", postal: "40", kecamatan: [["Cimahi Tengah", "Setiamanah"], ["Cimahi Selatan", "Leuwigajah"], ["Cimahi Utara", "Cibabat"]] },
  { province: "Jawa Barat", provinceCode: "32", city: "Kabupaten Garut", cityCode: "05", postal: "44", kecamatan: [["Tarogong Kidul", "Haurpanggung"], ["Garut Kota", "Ciwalen"]] },
  { province: "Jawa Barat", provinceCode: "32", city: "Kota Bogor", cityCode: "71", postal: "16", kecamatan: [["Bogor Tengah", "Paledang"], ["Tanah Sareal", "Kebon Pedes"]] },
  { province: "DI Yogyakarta", provinceCode: "34", city: "Kota Yogyakarta", cityCode: "71", postal: "55", kecamatan: [["Gondokusuman", "Baciro"], ["Umbulharjo", "Warungboto"]] },
];

const STREETS = ["Jl. Raya Banjaran", "Jl. Terusan Buah Batu", "Jl. Kopo", "Jl. Cibaduyut", "Jl. Pahlawan", "Jl. Mekarsari", "Jl. Sukasari", "Kp. Cibodas"];

const MALE = ["Asep", "Dadang", "Ujang", "Rudi", "Hendra", "Yayan", "Agus", "Dedi", "Ahmad", "Iwan", "Rahmat", "Wawan"];
const FEMALE = ["Euis", "Neneng", "Siti", "Rina", "Yuli", "Dewi", "Nining", "Tati", "Ai", "Lilis", "Nurhayati", "Ratna"];
const LAST = ["Sopandi", "Hidayat", "Kurniawan", "Suryana", "Rahayu", "Permana", "Sutisna", "Mulyana", "Hermawan", "Saepudin", "Rohmawati", "Kusnadi"];

const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
/** Tanggal ditulis seperti di formulir BPRS, misalnya "7 Oktober 2026". */
const idDateText = (date: Date) => `${date.getDate()} ${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;

export function buildNik(region: Region, kecamatanIndex: number, gender: "L" | "P", birth: Date, serial: number): string {
  const day = birth.getDate() + (gender === "P" ? 40 : 0);
  return `${region.provinceCode}${region.cityCode}${pad(kecamatanIndex + 1, 2)}${pad(day, 2)}${pad(birth.getMonth() + 1, 2)}${pad(birth.getFullYear() % 100, 2)}${pad(serial, 4)}`;
}

// ---------------------------------------------------------------------------
// Persona usaha (penghasilan tidak tetap)
// ---------------------------------------------------------------------------

type Persona = {
  name: string;
  type: string;
  /** Omzet per hari buka (Rp). */
  dailySales: [number, number];
  openDays: number;
  /** Porsi HPP/bahan dari omzet. */
  cogsPct: [number, number];
  /** Biaya tetap per bulan (gaji karyawan, sewa, listrik, transportasi). */
  fixedCosts: [number, number];
  employees: [number, number];
  plafond: [number, number];
  purpose: string;
  object: string;
  supplier: string;
  sistemPenjualan: (typeof SALES)[number];
  daerahPemasaran: string;
  ownsPlace: boolean;
  lokasi: string;
  sharia: string;
  environmental: string;
  social: string;
  /** Dua kelompok produk dan porsinya dari omzet (format BPRS: penjualan per barang). */
  products: [[string, number], [string, number]];
  sarana: string;
  bahanBaku: string;
  proses: string;
  distribusi: string;
  persaingan: string;
  /** Persediaan yang lazim ada di tempat usaha: nama, satuan, harga per satuan. */
  stock: Array<[string, string, number]>;
  halal: boolean;
};
const SALES = ["Tunai", "Non Tunai & Tunai"] as const;

export const DEMO_PERSONAS: Persona[] = [
  {
    name: "Warung Nasi", type: "Kuliner", dailySales: [900_000, 1_600_000], openDays: 26, cogsPct: [0.52, 0.58], fixedCosts: [3_500_000, 5_500_000], employees: [1, 3],
    plafond: [15_000_000, 40_000_000], purpose: "Pembelian peralatan dapur dan etalase saji", object: "Kompor komersial, freezer, dan etalase saji", supplier: "Toko Alat Dapur Sinar Jaya",
    sistemPenjualan: "Tunai", daerahPemasaran: "Sekitar Lokasi Usaha", ownsPlace: false, lokasi: "Menetap/Permanen",
    sharia: "Menjual makanan halal, bahan dibeli dari pemasok yang jelas, tanpa minuman beralkohol.", environmental: "Memakai wadah makan yang dapat dicuci ulang dan memilah sampah dapur.", social: "Mempekerjakan tetangga sekitar sebagai juru masak dan pelayan.",
    products: [["Nasi dan lauk pauk", 0.75], ["Minuman dan gorengan", 0.25]],
    sarana: "Kios ukuran 4 x 6 m dengan 4 meja makan, kompor gas dua tungku, rice cooker besar, kulkas, dan etalase lauk.",
    bahanBaku: "Beras, sayur, dan lauk dibeli setiap pagi di pasar tradisional terdekat; gas dan minyak goreng dari agen langganan.",
    proses: "Memasak dimulai pukul 05.00, warung buka pukul 07.00 sampai 20.00. Menu harian diganti bergiliran agar pelanggan tidak bosan.",
    distribusi: "Penjualan langsung di warung dan pesan antar untuk kantor serta bengkel sekitar.",
    persaingan: "Ada beberapa warung makan sejenis di sekitar lokasi; keunggulan pemohon pada harga terjangkau, porsi besar, dan pelanggan tetap dari pekerja sekitar.",
    stock: [["Beras", "karung 25 kg", 340_000], ["Minyak goreng", "jeriken 18 L", 310_000], ["Gas elpiji 12 kg", "tabung", 210_000]],
    halal: true,
  },
  {
    name: "Toko Sembako", type: "Perdagangan", dailySales: [2_500_000, 4_500_000], openDays: 30, cogsPct: [0.83, 0.87], fixedCosts: [2_500_000, 4_000_000], employees: [1, 2],
    plafond: [20_000_000, 50_000_000], purpose: "Penambahan stok sembako (beras, minyak goreng, gula)", object: "Stok beras, minyak goreng, dan gula", supplier: "UD Sumber Rejeki (agen sembako)",
    sistemPenjualan: "Tunai", daerahPemasaran: "Kelurahan/Kecamatan", ownsPlace: true, lokasi: "Menetap/Permanen",
    sharia: "Barang dagangan halal dan harga jual diumumkan jelas kepada pembeli.", environmental: "Menyediakan kantong belanja kain dan mengurangi plastik sekali pakai.", social: "Melayani warung kecil sekitar dengan harga grosir.",
    products: [["Beras, minyak goreng, dan gula", 0.7], ["Kebutuhan harian lain", 0.3]],
    sarana: "Toko permanen 5 x 8 m milik sendiri dengan rak besi, timbangan digital, freezer, dan gudang kecil di belakang toko.",
    bahanBaku: "Barang dagangan dibeli dari agen sembako dan distributor minyak goreng; pengiriman dua kali seminggu langsung ke toko.",
    proses: "Toko buka pukul 06.00 sampai 21.00. Stok dicatat di buku dan dihitung ulang setiap akhir minggu.",
    distribusi: "Penjualan eceran di toko dan grosir kecil ke warung sekitar yang mengambil sendiri atau diantar dengan motor.",
    persaingan: "Bersaing dengan minimarket waralaba di jalan utama; pemohon unggul dari harga grosir untuk warung dan kedekatan dengan warga.",
    stock: [["Beras premium", "karung 25 kg", 340_000], ["Minyak goreng 2 L", "karton", 210_000], ["Gula pasir", "karung 50 kg", 900_000]],
    halal: false,
  },
  {
    name: "Laundry Kiloan", type: "Jasa", dailySales: [500_000, 900_000], openDays: 28, cogsPct: [0.25, 0.32], fixedCosts: [4_000_000, 6_000_000], employees: [2, 3],
    plafond: [15_000_000, 35_000_000], purpose: "Pembelian mesin cuci dan pengering kapasitas besar", object: "Mesin cuci front loading 10 kg dan mesin pengering", supplier: "CV Mandiri Elektrik",
    sistemPenjualan: "Tunai", daerahPemasaran: "Sekitar Lokasi Usaha", ownsPlace: false, lokasi: "Menetap/Permanen",
    sharia: "Jasa jelas tarif per kilogram dan tidak ada unsur yang dilarang.", environmental: "Memakai deterjen ramah lingkungan dan mesin hemat air.", social: "Mempekerjakan ibu rumah tangga sekitar sebagai tenaga setrika.",
    products: [["Cuci kiloan", 0.8], ["Setrika dan cuci satuan", 0.2]],
    sarana: "Ruko sewa 4 x 10 m dengan 3 mesin cuci, 1 mesin pengering, meja setrika uap, dan rak penyimpanan pakaian.",
    bahanBaku: "Deterjen, pewangi, dan plastik kemasan dibeli bulanan dari toko grosir bahan laundry.",
    proses: "Pakaian ditimbang dan diberi nota, dicuci, dikeringkan, disetrika, lalu dikemas. Layanan reguler 2 hari dan kilat 1 hari.",
    distribusi: "Pelanggan mengantar dan mengambil sendiri; tersedia antar jemput gratis untuk radius 2 km.",
    persaingan: "Ada dua laundry lain di kelurahan yang sama; pemohon unggul dari layanan antar jemput dan ketepatan waktu.",
    stock: [["Deterjen cair", "jeriken 20 L", 280_000], ["Pewangi pakaian", "jeriken 20 L", 250_000], ["Plastik kemasan", "pak", 45_000]],
    halal: false,
  },
  {
    name: "Bengkel Motor", type: "Jasa", dailySales: [700_000, 1_300_000], openDays: 26, cogsPct: [0.45, 0.55], fixedCosts: [3_000_000, 5_500_000], employees: [1, 3],
    plafond: [15_000_000, 40_000_000], purpose: "Pembelian kompresor, alat servis, dan stok suku cadang", object: "Kompresor, kunci pas set, dan stok suku cadang", supplier: "Toko Sparepart Motor Jaya Abadi",
    sistemPenjualan: "Tunai", daerahPemasaran: "Kelurahan/Kecamatan", ownsPlace: true, lokasi: "Menetap/Permanen",
    sharia: "Jasa servis dengan tarif yang disepakati di awal dan suku cadang asli.", environmental: "Menampung oli bekas untuk diserahkan ke pengepul resmi.", social: "Membina dua pemuda sekitar sebagai mekanik magang.",
    products: [["Jasa servis dan ganti oli", 0.45], ["Penjualan suku cadang dan oli", 0.55]],
    sarana: "Bengkel permanen di depan rumah dengan 2 lift motor, kompresor, kunci set lengkap, dan etalase suku cadang.",
    bahanBaku: "Suku cadang dan oli dibeli dari toko sparepart grosir; barang fast moving dipesan setiap minggu.",
    proses: "Motor diterima, diperiksa, lalu dikerjakan sesuai antrean. Servis ringan selesai di hari yang sama.",
    distribusi: "Pelayanan langsung di bengkel; panggilan servis darurat untuk pelanggan sekitar.",
    persaingan: "Bersaing dengan bengkel resmi dan bengkel kecil lain; pemohon unggul dari harga jasa yang lebih murah dan suku cadang yang lengkap.",
    stock: [["Oli mesin 0,8 L", "dus isi 24", 960_000], ["Kampas rem", "pak isi 10", 350_000], ["Ban dalam", "pak isi 10", 300_000]],
    halal: false,
  },
  {
    name: "Konveksi", type: "Manufaktur", dailySales: [1_500_000, 2_800_000], openDays: 26, cogsPct: [0.6, 0.66], fixedCosts: [6_500_000, 10_000_000], employees: [4, 8],
    plafond: [30_000_000, 75_000_000], purpose: "Pembelian mesin jahit high speed dan mesin obras", object: "Mesin jahit high speed dan mesin obras", supplier: "Toko Mesin Jahit Cigondewah",
    sistemPenjualan: "Non Tunai & Tunai", daerahPemasaran: "Regional/Provinsi", ownsPlace: true, lokasi: "Menetap/Permanen",
    sharia: "Memproduksi pakaian muslim dan seragam sekolah sesuai pesanan dengan akad yang jelas.", environmental: "Sisa kain dijual ke pengrajin keset dan lap.", social: "Mempekerjakan penjahit dari lingkungan sekitar.",
    products: [["Seragam sekolah", 0.6], ["Busana muslim", 0.4]],
    sarana: "Rumah produksi 6 x 10 m dengan mesin jahit high speed, mesin obras, meja potong, dan setrika uap.",
    bahanBaku: "Kain dibeli dari grosir tekstil Cigondewah; benang dan aksesoris dari toko langganan. Pembelian sesuai pesanan.",
    proses: "Pola dan pemotongan kain oleh pemohon, penjahitan oleh penjahit, lalu finishing, lipat, dan kemas.",
    distribusi: "Dijual ke sekolah dan toko busana muslim, sebagian lewat reseller dan marketplace.",
    persaingan: "Banyak konveksi sejenis di Bandung Raya; pemohon unggul dari kerapian jahitan dan ketepatan waktu pesanan sekolah.",
    stock: [["Kain katun", "rol 50 m", 1_250_000], ["Benang jahit", "lusin", 120_000], ["Kancing dan resleting", "pak", 85_000]],
    halal: false,
  },
  {
    name: "Produksi Kerupuk", type: "Manufaktur", dailySales: [1_200_000, 2_000_000], openDays: 26, cogsPct: [0.55, 0.62], fixedCosts: [6_000_000, 9_000_000], employees: [3, 5],
    plafond: [25_000_000, 60_000_000], purpose: "Pembelian bahan baku tepung tapioka dan alat penjemuran", object: "Bahan baku tapioka dan rak jemur", supplier: "Agen Tapioka Sumber Makmur",
    sistemPenjualan: "Non Tunai & Tunai", daerahPemasaran: "Kabupaten/Kotamadya", ownsPlace: true, lokasi: "Menetap/Permanen",
    sharia: "Produk bersertifikat halal dan dijual ke warung serta pasar tradisional.", environmental: "Memanfaatkan sinar matahari untuk penjemuran dan mengolah limbah adonan menjadi pakan.", social: "Mempekerjakan warga sekitar dalam proses produksi.",
    products: [["Kerupuk mentah", 0.65], ["Kerupuk matang kemasan", 0.35]],
    sarana: "Rumah produksi dengan mesin pengaduk adonan, cetakan, dandang pengukus, rak jemur bambu, dan wajan penggorengan.",
    bahanBaku: "Tepung tapioka dari agen langganan, bumbu dan minyak goreng dari pasar; stok bahan baku dijaga untuk satu minggu produksi.",
    proses: "Adonan dicampur, dicetak, dikukus, dipotong, lalu dijemur 1 sampai 2 hari. Sebagian digoreng dan dikemas.",
    distribusi: "Dijual ke pedagang pasar, warung, dan toko oleh-oleh; pengiriman memakai mobil bak terbuka.",
    persaingan: "Produsen kerupuk sejenis cukup banyak; pemohon unggul dari rasa yang konsisten dan sudah bersertifikat halal.",
    stock: [["Tepung tapioka", "karung 50 kg", 450_000], ["Minyak goreng", "jeriken 18 L", 310_000], ["Plastik kemasan", "pak", 60_000]],
    halal: true,
  },
  {
    name: "Toko Pertanian", type: "Perdagangan", dailySales: [1_500_000, 3_000_000], openDays: 28, cogsPct: [0.8, 0.85], fixedCosts: [2_000_000, 3_500_000], employees: [1, 2],
    plafond: [20_000_000, 50_000_000], purpose: "Penambahan stok pupuk, bibit, dan obat tanaman", object: "Stok pupuk, bibit, dan sarana produksi pertanian", supplier: "CV Tani Makmur (distributor saprotan)",
    sistemPenjualan: "Non Tunai & Tunai", daerahPemasaran: "Kelurahan/Kecamatan", ownsPlace: true, lokasi: "Menetap/Permanen",
    sharia: "Barang halal dan penjualan tempo kepada petani dicatat dengan jelas tanpa tambahan bunga.", environmental: "Menyediakan pupuk organik sebagai pilihan bagi petani.", social: "Menjadi tempat konsultasi petani setempat.",
    products: [["Pupuk dan obat tanaman", 0.7], ["Bibit dan alat pertanian", 0.3]],
    sarana: "Toko permanen dengan gudang pupuk, rak obat tanaman, timbangan, dan motor roda tiga untuk pengantaran.",
    bahanBaku: "Pupuk dan obat tanaman dari distributor saprotan resmi; bibit dari penangkar bersertifikat.",
    proses: "Toko buka pukul 07.00 sampai 17.00, melayani petani eceran dan kelompok tani. Stok dicatat per jenis barang.",
    distribusi: "Penjualan di toko dan pengantaran ke kelompok tani dengan motor roda tiga.",
    persaingan: "Ada kios pupuk lain di kecamatan; pemohon unggul dari layanan konsultasi tanaman dan penjualan tempo panen yang tercatat.",
    stock: [["Pupuk NPK", "karung 50 kg", 650_000], ["Pupuk organik", "karung 40 kg", 75_000], ["Obat tanaman", "botol", 95_000]],
    halal: false,
  },
  {
    name: "Fotokopi dan ATK", type: "Jasa", dailySales: [600_000, 1_100_000], openDays: 26, cogsPct: [0.4, 0.5], fixedCosts: [2_500_000, 4_000_000], employees: [1, 2],
    plafond: [15_000_000, 35_000_000], purpose: "Pembelian mesin fotokopi digital", object: "Mesin fotokopi digital rekondisi", supplier: "CV Duta Copier",
    sistemPenjualan: "Tunai", daerahPemasaran: "Sekitar Lokasi Usaha", ownsPlace: false, lokasi: "Menetap/Permanen",
    sharia: "Jasa dan barang yang dijual halal dengan harga yang jelas.", environmental: "Mengumpulkan kertas sisa untuk didaur ulang.", social: "Melayani kebutuhan sekolah sekitar dengan harga pelajar.",
    products: [["Jasa fotokopi dan cetak", 0.6], ["Alat tulis kantor", 0.4]],
    sarana: "Kios sewa 3 x 6 m dengan 2 mesin fotokopi, printer warna, mesin jilid, dan etalase ATK.",
    bahanBaku: "Kertas, tinta, dan ATK dibeli dari grosir ATK setiap dua minggu.",
    proses: "Melayani fotokopi, cetak, jilid, dan laminasi langsung di tempat; pesanan banyak dikerjakan di hari yang sama.",
    distribusi: "Penjualan langsung di kios dan pesanan dari sekolah serta kantor desa sekitar.",
    persaingan: "Bersaing dengan dua usaha fotokopi lain; pemohon unggul dari lokasi dekat sekolah dan harga pelajar.",
    stock: [["Kertas HVS A4", "rim", 52_000], ["Tinta fotokopi", "botol", 180_000], ["Buku tulis", "pak isi 10", 45_000]],
    halal: false,
  },
];

// ---------------------------------------------------------------------------
// Persona karyawan (penghasilan tetap)
// ---------------------------------------------------------------------------

type Employer = { name: string; bidang: "Perdagangan" | "Jasa" | "Pendidikan" | "Kesehatan" | "Pemerintahan"; status: "Tetap Swasta" | "PNS" | "Kontrak ASN/PPPK"; salary: [number, number]; alamat: string; guru: boolean };

const EMPLOYERS: Employer[] = [
  { name: "PT Kahatex", bidang: "Perdagangan", status: "Tetap Swasta", salary: [4_200_000, 5_500_000], alamat: "Jl. Raya Rancaekek Km. 23, Kabupaten Sumedang", guru: false },
  { name: "RS Al Islam Bandung", bidang: "Kesehatan", status: "Tetap Swasta", salary: [4_500_000, 7_000_000], alamat: "Jl. Soekarno Hatta No. 644, Kota Bandung", guru: false },
  { name: "PT Pos Indonesia", bidang: "Jasa", status: "Tetap Swasta", salary: [5_000_000, 7_500_000], alamat: "Jl. Cilaki No. 73, Kota Bandung", guru: false },
  { name: "SMP Negeri 2 Banjaran", bidang: "Pendidikan", status: "PNS", salary: [5_500_000, 8_000_000], alamat: "Jl. Raya Banjaran, Kabupaten Bandung", guru: true },
  { name: "SD Negeri Soreang 1", bidang: "Pendidikan", status: "Kontrak ASN/PPPK", salary: [4_000_000, 5_500_000], alamat: "Jl. Raya Soreang, Kabupaten Bandung", guru: true },
];

const FIXED_NEEDS = [
  { purpose: "Renovasi rumah tinggal (pembelian bahan bangunan)", object: "Bahan bangunan: semen, bata ringan, dan keramik", supplier: "Toko Bangunan Sinar Abadi" },
  { purpose: "Pembelian sepeda motor untuk transportasi kerja", object: "Sepeda motor Honda Beat baru", supplier: "Dealer Honda Mitra Sendang" },
  { purpose: "Pembelian laptop dan printer untuk menunjang pekerjaan", object: "Laptop dan printer", supplier: "Toko Komputer Bandung Elektronik" },
];

// ---------------------------------------------------------------------------
// Skenario lengkap
// ---------------------------------------------------------------------------

export type DemoScenario = {
  incomeSourceType: "fixed" | "non_fixed";
  customer: { customerName: string; customerId: string; phone: string; email: string; address: string };
  business: { businessName: string; businessType: string; businessAge: string };
  finance: {
    monthlyRevenue: string; monthlyExpenses: string; existingDebt: string; collateralValue: string;
    requestedAmount: string; financingTenor: string; marginRate: string; loanPurpose: string;
    financialDataSource: "laporan_keuangan" | "omzet_harian"; financialDataNote: string;
  };
  akad: { object: string; supplier: string; downPaymentPct: number };
  legal: { businessShariaCompliant: "yes"; shariaComplianceNotes: string };
  esg: { environmentalPractices: string; socialImpact: string; governanceQuality: "good" | "excellent" };
  profile: BprsProfile;
};

/** Margin flat BPRS untuk pembiayaan mikro, per bulan. */
const MONTHLY_FLAT_RATES = [0.0125, 0.015, 0.0175];
/** DSR maksimal kebijakan BPRS 40%; contoh memakai 30 sampai 36% agar tetap ada ruang. */
const DSR_TARGET: [number, number] = [0.3, 0.36];

export function buildDemoScenario(options: { segment?: string; incomeSourceType?: string; rng?: Rng; today?: Date } = {}): DemoScenario {
  const rng = options.rng ?? Math.random;
  const today = options.today ?? new Date();
  const fixed = options.incomeSourceType === "fixed" || options.segment === "karyawan_swasta" || options.segment === "guru_sertifikasi";

  // Identitas: usia 30 sampai 50 tahun agar tenor tidak melewati usia pensiun.
  const gender: "L" | "P" = rng() < 0.55 ? "L" : "P";
  const first = pick(rng, gender === "L" ? MALE : FEMALE);
  const last = pick(rng, LAST);
  const age = randInt(rng, 30, 50);
  const birth = new Date(today.getFullYear() - age, randInt(rng, 0, 11), randInt(rng, 1, 28));
  const region = pick(rng, REGIONS);
  const kecIndex = randInt(rng, 0, region.kecamatan.length - 1);
  const [kecamatan, kelurahan] = region.kecamatan[kecIndex]!;
  const married = age >= 30 ? rng() < 0.85 : rng() < 0.5;
  const children = married ? randInt(rng, 1, 3) : 0;
  const customerName = `${first} ${last}`;
  const phone = () => `08${pick(rng, ["12", "13", "21", "22", "52", "57", "77", "81", "95"])}${pad(randInt(rng, 0, 99_999_999), 8)}`;
  const street = pick(rng, STREETS);
  const customer = {
    customerName,
    customerId: buildNik(region, kecIndex, gender, birth, randInt(rng, 1, 2999)),
    phone: phone(),
    email: `${first.toLowerCase()}.${last.toLowerCase()}@gmail.com`,
    address: `${street} No. ${randInt(rng, 3, 99)} RT ${pad(randInt(rng, 1, 9), 2)}/RW ${pad(randInt(rng, 1, 12), 2)}, Kel. ${kelurahan}, Kec. ${kecamatan}, ${region.city}, ${region.province}`,
  };
  const yearsInHome = Math.min(age - 22, randInt(rng, 4, 15));
  const monthlyRate = pick(rng, MONTHLY_FLAT_RATES);
  const dsr = DSR_TARGET[0] + rng() * (DSR_TARGET[1] - DSR_TARGET[0]);
  const ownsHome = rng() < 0.7;

  // Pasangan: lawan jenis, usia sebaya, NIK sesuai tanggal lahir dan jenis kelamin pasangan.
  const spouseGender: "L" | "P" = gender === "L" ? "P" : "L";
  const spouseBirth = new Date(birth.getFullYear() + randInt(rng, -3, 4), randInt(rng, 0, 11), randInt(rng, 1, 28));
  const spouseName = `${pick(rng, spouseGender === "L" ? MALE : FEMALE)} ${pick(rng, LAST)}`;
  const spouseWorks = gender === "P" || rng() < 0.4;
  const spouseJob = gender === "L" ? (spouseWorks ? pick(rng, ["Wiraswasta", "Karyawan Swasta"]) : "Mengurus Rumah Tangga") : pick(rng, ["Wiraswasta", "Karyawan Swasta"]);
  const kategori = pick(rng, ["Walk In Customer", "Referral", "Solisitasi"] as const);
  const sequence = randInt(rng, 1, 999);
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][today.getMonth()]!;

  const baseProfile: BprsProfile = {
    kantor: "PUSAT",
    nomorRegister: `${pad(sequence, 4)}/REG/BPRS-AR/${roman}/${today.getFullYear()}`,
    nomorProposal: `${pad(sequence, 4)}/MUP/BPRS-AR/${roman}/${today.getFullYear()}`,
    kategoriNasabah: kategori,
    namaReferral: kategori === "Referral" ? `${pick(rng, MALE)} ${pick(rng, LAST)} (nasabah lama)` : undefined,
    jenisKelamin: gender === "L" ? "Pria" : "Wanita",
    tempatLahir: region.city.replace(/^(Kota|Kabupaten) /, ""),
    tanggalLahir: isoDate(birth),
    desa: kelurahan,
    kecamatan,
    kabupaten: region.city,
    kodePos: `${region.postal}${pad(randInt(rng, 100, 399), 3)}`,
    telponRumah: rng() < 0.35 ? `022-${pad(randInt(rng, 5_000_000, 7_999_999), 7)}` : "-",
    statusPerkawinan: married ? "Menikah" : "Lajang",
    tanggungan: children === 0 ? "Tidak Mempunyai Tanggungan" : children <= 2 ? " 1 - 2 Orang" : "3 - 5 Orang",
    ibuKandung: pick(rng, ["Iyah", "Enok", "Aminah", "Cucu", "Imas", "Onih"]),
    namaPasangan: married ? spouseName : undefined,
    ttlPasangan: married ? `${region.city.replace(/^(Kota|Kabupaten) /, "")}, ${idDateText(spouseBirth)}` : undefined,
    ktpPasangan: married ? buildNik(region, kecIndex, spouseGender, spouseBirth, randInt(rng, 1, 2999)) : undefined,
    pekerjaanPasangan: married ? spouseJob : undefined,
    namaSaudara: `${pick(rng, rng() < 0.5 ? MALE : FEMALE)} ${pick(rng, LAST)} (saudara kandung)`,
    hpSaudara: phone(),
    statusTempatTinggal: ownsHome ? "Milik sendiri" : "Sewa",
    lamaMenetap: yearsInHome > 8 ? "> 8 tahun" : yearsInHome > 5 ? "> 5 - 8 tahun" : "> 2 - 5 tahun",
    reputasi: "Dikenal memiliki reputasi baik",
    hubunganBank: pick(rng, ["Nasabah/debitur bank 1 - 3 tahun", "Nasabah/debitur bank > 3 tahun"] as const),
    pembiayaanKe: randInt(rng, 1, 2),
    jenisMargin: "Flat",
    rpcPersen: "0.7",
    asuransiJiwa: "Asuransi Jiwa Syariah",
    namaAo: "Andrie Hardiman",
    // Pejabat cabang (nama fiktif) dan tempat tanda tangan.
    kotaTandaTangan: "Banjaran",
    kepalaCabangNama: "Hendra Gunawan",
    verifikatorNama: "Rina Marlina",
    keteranganBankPasangan: married ? "Pasangan tidak memiliki fasilitas pembiayaan berdasarkan iDeb SLIK." : undefined,
  };

  let business: DemoScenario["business"];
  let revenue: number;
  let expenses: number;
  let existingTarget: number;
  let plafondRange: [number, number];
  let purpose: string;
  let akad: DemoScenario["akad"];
  let legal: DemoScenario["legal"];
  let esg: DemoScenario["esg"];
  let financialDataSource: DemoScenario["finance"]["financialDataSource"];
  let financialDataNote: string;
  let extraProfile: BprsProfile;
  let household = 0;
  let workingCapital = false;
  let facilityStyle: { banks: string[]; margin: "Flat" | "Efektif"; rates: number[]; pangsa: string };
  let businessAssets: BprsProfile["aset"] = [];

  if (fixed) {
    const employers = EMPLOYERS.filter(e => (options.segment === "guru_sertifikasi" ? e.guru : options.segment === "karyawan_swasta" ? !e.guru : true));
    const employer = pick(rng, employers);
    const salary = roundTo(randInt(rng, employer.salary[0], employer.salary[1]), 50_000);
    const yearsWorked = Math.min(age - 22, randInt(rng, 3, 15));
    const hired = new Date(today.getFullYear() - yearsWorked, randInt(rng, 0, 11), randInt(rng, 1, 28));
    revenue = salary;
    expenses = roundTo(salary * (married ? 0.45 + rng() * 0.1 : 0.35 + rng() * 0.1), 50_000);
    existingTarget = rng() < 0.3 ? roundTo(salary * 0.08, 50_000) : 0;
    plafondRange = [10_000_000, 60_000_000];
    const need = pick(rng, FIXED_NEEDS);
    purpose = need.purpose;
    const role = employer.guru ? "guru" : "karyawan";
    const statusText = employer.status === "PNS" ? "berstatus PNS" : employer.status === "Kontrak ASN/PPPK" ? "berstatus PPPK" : "tetap";
    business = { businessName: employer.name, businessType: employer.guru ? "Guru" : "Karyawan", businessAge: String(yearsWorked * 12) };
    akad = { object: need.object, supplier: need.supplier, downPaymentPct: 0.1 };
    legal = { businessShariaCompliant: "yes", shariaComplianceNotes: `Penghasilan berasal dari gaji tetap di ${employer.name}, halal dan dapat diverifikasi melalui slip gaji.` };
    esg = { environmentalPractices: "", socialImpact: "", governanceQuality: "good" };
    financialDataSource = "laporan_keuangan";
    financialDataNote = `Gaji dari slip gaji 3 bulan terakhir; pengeluaran rumah tangga dari wawancara.`;
    facilityStyle = { banks: ["BSI KCP Banjaran", "Bank BJB Syariah", "FIF Syariah"], margin: "Efektif", rates: [0.1, 0.12], pangsa: "Konsumtif" };
    extraProfile = {
      template: "fix_income",
      pendidikanFix: employer.guru ? "S1" : pick(rng, ["SMA", "D1 - D4", "S1"] as const),
      statusKaryawan: employer.status,
      bidangPekerjaan: employer.bidang,
      bonafiditas: "Bonafide",
      suratKeteranganBekerja: "Ada",
      slipGaji: "Ada",
      rekeningGaji: "Ada",
      mouInstansi: employer.status === "Tetap Swasta" ? "Tidak Ada" : "Ada",
      suratKuasaPotongGaji: "Ada",
      potonganGaji: "0.4",
      gajiBulanan: salary,
      rekeningKoran: demoSalaryStatement(rng, salary, today),
      namaInstansi: employer.name,
      alamatInstansi: employer.alamat,
      nomorSk: `${pad(randInt(rng, 10, 899), 3)}/SK-${employer.guru ? "KEP" : "HRD"}/${hired.getFullYear()}`,
      tanggalSk: idDateText(hired),
      reputasiFix: "Dikenal baik",
      sektorEkonomi: "Lainnya",
      jenisPenggunaan: "Konsumtif",
      latarBelakang: `Pemohon bekerja sebagai ${role} ${statusText} di ${employer.name} sejak ${yearsWorked} tahun lalu dan menerima gaji bulanan melalui rekening gaji. `
        + `${married ? `Pemohon sudah menikah dengan ${children} orang anak; pasangan bekerja sebagai ${spouseJob.toLowerCase()}. ` : "Pemohon belum menikah dan tinggal bersama orang tua. "}`
        + `Pembiayaan diajukan untuk ${purpose.toLowerCase()}, dengan angsuran dipotong langsung dari gaji bulanan berdasarkan surat kuasa potong gaji. `
        + `Selama bekerja pemohon tidak pernah mendapat sanksi disiplin dan riwayat pembayaran kewajiban tercatat lancar.`,
      pengalamanUsaha: `Masa kerja ${yearsWorked} tahun di ${employer.name} tanpa catatan pelanggaran.`,
      indikatorReputasi: "Berdasarkan konfirmasi ke bagian kepegawaian dan tetangga, pemohon dikenal disiplin dan bertanggung jawab.",
      mengetahuiNama: "Yusuf Maulana",
      verifikatorNama: "Rina Marlina",
      kabagMarketingNama: "Dian Kartika",
    };
  } else {
    const persona = pick(rng, DEMO_PERSONAS);
    const daily = roundTo(randInt(rng, persona.dailySales[0], persona.dailySales[1]), 50_000);
    const cogs = Math.round((persona.cogsPct[0] + rng() * (persona.cogsPct[1] - persona.cogsPct[0])) * 100) / 100;
    const fixedCosts = roundTo(randInt(rng, persona.fixedCosts[0], persona.fixedCosts[1]), 100_000);
    revenue = roundTo(daily * persona.openDays, 100_000);
    expenses = roundTo(revenue * cogs + fixedCosts, 100_000);
    existingTarget = rng() < 0.35 ? pick(rng, [450_000, 650_000, 850_000]) : 0;
    plafondRange = persona.plafond;
    purpose = persona.purpose;
    const businessYears = Math.min(age - 20, randInt(rng, 3, 12));
    const employees = randInt(rng, persona.employees[0], persona.employees[1]);
    household = married ? roundTo(1_800_000 + children * 500_000, 100_000) : 1_500_000;
    // Nama usaha mikro lazimnya memakai nama pemilik ("Warung Nasi Bu Euis") atau nama toko sederhana.
    const businessName = rng() < 0.5
      ? `${persona.name} ${gender === "L" ? "Pak" : "Bu"} ${first}`
      : `${persona.name} ${pick(rng, ["Barokah", "Berkah", "Amanah", "Sejahtera", "Mandiri"])}`;
    business = { businessName, businessType: persona.type, businessAge: String(businessYears * 12) };
    workingCapital = /stok|bahan baku/i.test(persona.purpose);
    akad = { object: persona.object, supplier: persona.supplier, downPaymentPct: 0.1 };
    legal = { businessShariaCompliant: "yes", shariaComplianceNotes: persona.sharia };
    esg = { environmentalPractices: persona.environmental, socialImpact: persona.social, governanceQuality: "good" };
    financialDataSource = "omzet_harian";
    financialDataNote = `Estimasi dari omzet harian Rp ${daily.toLocaleString("id-ID")} x ${persona.openDays} hari; HPP/bahan ${Math.round(cogs * 100)}% dari omzet; biaya tetap Rp ${fixedCosts.toLocaleString("id-ID")} per bulan.`;
    facilityStyle = { banks: ["BRI Unit Banjaran", "Bank BJB Syariah", "BSI KCP Soreang", "Koperasi Syariah Benteng Mikro"], margin: "Flat", rates: [0.06, 0.12, 0.18], pangsa: "Modal Kerja" };

    // Penjualan per kelompok produk, 3 bulan terakhir: rata-ratanya sama dengan omzet SSCI.
    const factors = pick(rng, [[0.97, 1, 1.03], [1.03, 0.97, 1], [1, 1.03, 0.97]] as const);
    const dayShift = pick(rng, [[0, -1, 1], [-1, 1, 0], [1, 0, -1]] as const);
    const penjualan = persona.products.map(([nama, share]) => ({
      nama,
      hppPersen: cogs,
      bulan: [0, 1, 2].map(i => {
        const hari = Math.min(31, persona.openDays + dayShift[i]!);
        return { hari, omzetHarian: Math.round((revenue * share * factors[i]!) / hari / 1000) * 1000 };
      }),
    }));
    // Biaya tetap persona dipecah: upah pekerja, lalu biaya usaha (sewa, listrik, transportasi, komunikasi).
    const wage = roundTo(Math.min(randInt(rng, 1_100_000, 1_600_000), (fixedCosts * 0.75) / employees), 50_000);
    const operating = fixedCosts - wage * employees;
    const sewa = persona.ownsPlace ? 0 : roundTo(operating * 0.45, 10_000);
    const listrik = roundTo(operating * 0.3, 10_000);
    const transport = roundTo(operating * 0.15, 10_000);
    const biayaUsaha = [
      ...(sewa > 0 ? [{ nama: "Sewa tempat usaha", nominal: sewa }] : []),
      { nama: "Listrik dan air tempat usaha", nominal: listrik },
      { nama: "Transportasi dan pengiriman", nominal: transport },
      { nama: "Pulsa, internet, dan kebersihan", nominal: operating - sewa - listrik - transport },
    ];
    // Biaya rumah tangga dirinci; jumlahnya sama dengan angka rumah tangga persona.
    const pendidikan = children * 300_000;
    const rumahTangga = {
      belanja: household - pendidikan - 250_000 - 150_000 - 100_000,
      pendidikan,
      listrikAir: 250_000,
      telepon: 150_000,
      lainnya: [{ nama: "Iuran warga dan sosial", nominal: 100_000 }],
    };
    const tempo = persona.sistemPenjualan !== "Tunai";
    const stockQty = [randInt(rng, 5, 20), randInt(rng, 5, 20), randInt(rng, 5, 15)];
    const supplierDebt = persona.type === "Perdagangan" || persona.type === "Manufaktur" ? roundTo(revenue * 0.04, 100_000) : 0;
    const businessAddress = persona.ownsPlace
      ? customer.address.replace(/, (Kota|Kabupaten) .*$/, "")
      : `${pick(rng, STREETS)} No. ${randInt(rng, 3, 120)}, Kel. ${kelurahan}, Kec. ${kecamatan}`;
    const permitIssued = new Date(today.getFullYear(), today.getMonth() - randInt(rng, 1, 6), randInt(rng, 1, 28));
    businessAssets = [
      { jenis: "Peralatan", jumlah: 1, tahunPerolehan: today.getFullYear() - Math.min(businessYears, randInt(rng, 1, 4)), nilaiTaksasi: roundTo(fixedCosts * randInt(rng, 2, 5), 500_000) },
    ];
    extraProfile = {
      template: "fluktuatif",
      pendidikan: pick(rng, ["SMP", "SMA", "SMA", "Dip./S1-S3"] as const),
      laporanKeuangan: "Proforma",
      sistemPenjualan: persona.sistemPenjualan,
      kepemilikanTempatUsaha: persona.ownsPlace ? "Milik sendiri" : "Sewa",
      lokasiUsaha: persona.lokasi as BprsProfile["lokasiUsaha"],
      daerahPemasaran: persona.daerahPemasaran as BprsProfile["daerahPemasaran"],
      tenagaKerja: employees <= 2 ? "<= 2 Orang" : employees <= 5 ? ">2 sd. 5 Orang" : ">5 sd. 10 Orang",
      pengelolaanKeuangan: "Terdapat pencatatan usaha namun tidak ada pemisahan dengan keuangan lainnya",
      hutangDagang: "Tidak ada/sebagian kecil dari Pembiayaan yang dimohon",
      sektorEkonomi: persona.type === "Perdagangan" ? "Perdagangan" : persona.type === "Manufaktur" ? "Industri" : "Jasa",
      jenisPenggunaan: /stok|bahan baku/i.test(persona.purpose) ? "Modal Kerja" : "Investasi",
      kas: roundTo(revenue * 0.08, 100_000),
      rekeningKoran: demoStatement(rng, revenue, today),
      biayaRumahTangga: household,
      latarBelakang: `Pemohon menjalankan usaha ${persona.name.toLowerCase()} di Kec. ${kecamatan} sejak ${businessYears} tahun lalu dengan ${employees} orang pekerja. Pembiayaan diajukan untuk ${persona.purpose.toLowerCase()} guna menambah kapasitas usaha.`,
      pengalamanUsaha: `Usaha dirintis sendiri oleh pemohon dan berjalan ${businessYears} tahun. Penjualan ${persona.sistemPenjualan === "Tunai" ? "dilakukan tunai" : "dilakukan tunai dan sebagian tempo"} dengan pasar ${persona.daerahPemasaran.toLowerCase()}.`,
      indikatorReputasi: "Berdasarkan informasi ketua RT dan pemasok, pemohon dikenal jujur dan tertib membayar.",
      // Aspek teknis, pemasaran, legalitas
      alamatUsaha: businessAddress,
      gambaranDaerah: `Lokasi usaha berada di kawasan permukiman padat Kel. ${kelurahan}, Kec. ${kecamatan}, dekat ${pick(rng, ["pasar tradisional", "sekolah dasar dan madrasah", "jalan raya kecamatan", "kantor desa"])}, sehingga ramai dilalui warga setiap hari. Akses jalan dapat dilalui mobil.`,
      saranaPrasarana: persona.sarana,
      bahanBaku: persona.bahanBaku,
      hubunganSupplier: `Pembelian utama dari ${persona.supplier} sudah berjalan sekitar ${Math.max(1, businessYears - 1)} tahun. Pembayaran tunai atau tempo satu minggu dan tidak pernah ada tunggakan.`,
      prosesProduksi: persona.proses,
      sistemPenjualanNarasi: tempo
        ? "Penjualan tunai kepada konsumen eceran dan tempo 1 sampai 2 minggu kepada pelanggan tetap yang tercatat di buku piutang."
        : "Penjualan tunai langsung kepada konsumen di lokasi usaha.",
      daerahPemasaranNarasi: `Pemasaran ${persona.daerahPemasaran.toLowerCase()}, pelanggan utama warga Kec. ${kecamatan} dan sekitarnya.`,
      saluranDistribusi: persona.distribusi,
      faktorPersaingan: persona.persaingan,
      bentukUsaha: "Perorangan (UMKM), belum berbadan hukum",
      perizinan: [
        { jenis: "NIB", nomor: `9120${pad(randInt(rng, 0, 999_999_999), 9)}`, berlakuSampai: "Selama usaha berjalan", atasNama: customerName },
        ...(persona.halal ? [{ jenis: "Sertifikat Halal", nomor: `ID32110000${pad(randInt(rng, 0, 99_999_999), 8)}`, berlakuSampai: "Selama tidak ada perubahan bahan dan proses", atasNama: customerName }] : []),
        { jenis: "SKU", nomor: `503/${pad(randInt(rng, 10, 899), 3)}/Kel. ${kelurahan}/${permitIssued.getFullYear()}`, berlakuSampai: idDateText(new Date(permitIssued.getFullYear() + 1, permitIssued.getMonth(), permitIssued.getDate())), atasNama: customerName },
      ],
      // Rincian keuangan
      penjualan,
      tenagaKerjaJumlah: employees,
      tenagaKerjaUpah: wage,
      biayaUsaha,
      rumahTangga,
      persediaan: persona.stock.map(([nama, satuan, harga], i) => ({ nama, satuan, harga, jumlah: stockQty[i]! })),
      keteranganPersediaan: "Persediaan dihitung bersama pemohon saat kunjungan usaha.",
      ...(tempo
        ? {
            piutang: [
              { nama: `Warung ${pick(rng, FEMALE)}`, jumlah: 1, harga: roundTo(revenue * 0.03, 50_000), keterangan: "Tempo 2 minggu, lancar" },
              { nama: `Toko ${pick(rng, ["Berkah", "Makmur", "Jaya"])}`, jumlah: 1, harga: roundTo(revenue * 0.02, 50_000), keterangan: "Tempo 1 minggu, lancar" },
            ],
            keteranganPiutang: "Piutang kepada pelanggan tetap, umur di bawah 1 bulan.",
          }
        : { keteranganPiutang: "Tidak ada piutang usaha, seluruh penjualan dilakukan tunai." }),
      ...(supplierDebt > 0
        ? { hutangUsaha: [{ nama: persona.supplier, jumlah: 1, harga: supplierDebt, keterangan: "Tempo 1 minggu" }], keteranganHutang: "Hutang dagang kepada pemasok utama, dibayar setiap minggu." }
        : { keteranganHutang: "Tidak ada hutang usaha; pembelian bahan dibayar tunai." }),
      ...(married && spouseWorks
        ? { pendapatanLain: [{ nama: `Penghasilan pasangan (${spouseJob.toLowerCase()})`, nominal: roundTo(randInt(rng, 1_200_000, 2_500_000), 100_000) }] }
        : {}),
      biayaLain: [{ nama: "Iuran BPJS Kesehatan keluarga", nominal: (married ? 2 + children : 1) * 35_000 }],
      saldoBankLain: [{ bank: pick(rng, ["BRI", "BSI", "Bank BJB"]), nomorRekening: pad(randInt(rng, 0, 999_999_999), 10), saldo: roundTo(revenue * (0.03 + rng() * 0.05), 50_000) }],
      mengetahuiNama: "Hendra Gunawan",
    };
  }

  // Fasilitas berjalan dari iDeb SLIK. Angsuran existing SSCI dihitung dari fasilitas itu
  // dengan rumus tabel hubungan bank, agar SSCI dan Excel BPRS memakai angka yang sama.
  const net = revenue - expenses - household;
  // Nasabah dengan laba tipis dibuat tanpa pinjaman lain, agar plafon tetap wajar.
  if (existingTarget > 0 && ((net * dsr - existingTarget) * 36) / (1 + (monthlyRate * 36 * 100) / 100) < plafondRange[0]) existingTarget = 0;
  let existingDebt = 0;
  let fasilitasBank: BprsProfile["fasilitasBank"];
  if (existingTarget > 0) {
    const months = pick(rng, [24, 36]);
    const yearly = pick(rng, facilityStyle.rates);
    const r = yearly / 12;
    const perUnit = facilityStyle.margin === "Flat" ? 1 / months + r : r / (1 - Math.pow(1 + r, -months));
    const plafond = Math.max(1_000_000, roundTo(existingTarget / perUnit, 500_000));
    const start = new Date(today.getFullYear(), today.getMonth() - randInt(rng, 4, 14), randInt(rng, 1, 28));
    const end = new Date(start.getFullYear(), start.getMonth() + months, start.getDate());
    const row = {
      pemilik: "nasabah" as const, namaBank: pick(rng, facilityStyle.banks), plafond, marginTahunan: yearly,
      tanggalMulai: isoDate(start), tanggalAkhir: isoDate(end), pangsa: facilityStyle.pangsa, jenisMargin: facilityStyle.margin, kol: 1, dilunasi: "Tidak" as const,
    };
    fasilitasBank = [row];
    existingDebt = Math.round(facilityInstallment(row));
  }
  const room = Math.max(0, net * dsr - existingDebt);
  const marginFor = (months: number) => Math.round(monthlyRate * months * 1000) / 10; // persen, satu desimal
  const fittedFor = (months: number) => (room * months) / (1 + marginFor(months) / 100);
  // Modal kerja maksimal 24 bulan; investasi dan konsumtif sampai 36 bulan.
  const tenorOptions = fixed ? [24, 36] : workingCapital ? [12, 24] : [12, 24, 36];
  const tenor = tenorOptions.find(months => fittedFor(months) >= plafondRange[0]) ?? tenorOptions[tenorOptions.length - 1]!;
  const marginRate = marginFor(tenor);
  const fitted = fittedFor(tenor);
  // Dibulatkan ke bawah agar tidak pernah melewati batas DSR, lalu dibatasi plafon wajar persona.
  const finalRequested = Math.max(1_000_000, Math.min(plafondRange[1], Math.floor(fitted / 1_000_000) * 1_000_000));

  // Agunan: SHM untuk plafon menengah, BPKB untuk plafon kecil. Nilai bank (nilai pasar x %) di atas 150% plafon.
  const useLand = finalRequested > 12_000_000;
  const marketValue = useLand
    ? roundTo(Math.max(finalRequested * (2.4 + rng() * 1.2), 120_000_000), 5_000_000)
    : roundTo(Math.max(finalRequested * 2.8, 16_000_000), 500_000);
  const motorYear = today.getFullYear() - randInt(rng, 1, 4);
  const collateralProfile: BprsProfile = useLand
    ? {
        agunanTanah: [{
          jenisSurat: "Sertipikat Hak Milik",
          nomor: pad(randInt(rng, 100, 4999), 5),
          atasNama: customerName,
          luasTanah: randInt(rng, 60, 140),
          luasBangunan: randInt(rng, 36, 90),
          nilaiPasar: marketValue,
          persen: 0.7,
          pengikatan: finalRequested >= 50_000_000 ? "APHT" : "SKMHT",
          lokasi: `Kel. ${kelurahan}, Kec. ${kecamatan}`,
        }],
        pengikatan: "Pengikatan Notaril",
        asuransiAgunan: "Asuransi Kerugian Syariah",
      }
    : {
        agunanKendaraan: [{
          merek: "Honda", tipe: pick(rng, ["Vario 125", "Beat", "Scoopy"]), tahun: motorYear, atasNama: customerName,
          nomorBpkb: `P-${pad(randInt(rng, 0, 99_999_999), 8)}`, nopol: `D ${randInt(rng, 1000, 6999)} ${pick(rng, ["ABC", "UKA", "SAR", "FGH"])}`, nilaiPasar: marketValue, persen: 0.6,
        }],
        pengikatan: "Tidak Pengikatan Notaril",
        asuransiAgunan: "Tidak Diasuransikan",
      };

  // Aset yang dimiliki: rumah (agunan SHM bila dipakai), kendaraan, dan peralatan usaha.
  const homeValue = useLand ? marketValue : roundTo(randInt(rng, 150_000_000, 350_000_000), 5_000_000);
  const aset: NonNullable<BprsProfile["aset"]> = [
    ...((ownsHome || useLand) ? [{ jenis: "Tanah&Bangunan" as const, jumlah: 1, tahunPerolehan: today.getFullYear() - yearsInHome, nilaiTaksasi: homeValue }] : []),
    { jenis: "Kendaraan" as const, jumlah: 1, tahunPerolehan: motorYear, nilaiTaksasi: useLand ? roundTo(randInt(rng, 9_000_000, 16_000_000), 500_000) : marketValue },
    ...(businessAssets ?? []),
  ];
  // Bila agunan SHM, rumah tinggal adalah milik sendiri.
  const statusTempatTinggal: BprsProfile["statusTempatTinggal"] = ownsHome || useLand ? "Milik sendiri" : "Sewa";

  const pembiayaanKe = baseProfile.pembiayaanKe ?? 1;
  return {
    incomeSourceType: fixed ? "fixed" : "non_fixed",
    customer,
    business,
    finance: {
      monthlyRevenue: String(revenue),
      monthlyExpenses: String(expenses),
      existingDebt: String(existingDebt),
      collateralValue: String(marketValue),
      requestedAmount: String(finalRequested),
      financingTenor: String(tenor),
      marginRate: String(marginRate),
      loanPurpose: purpose,
      financialDataSource,
      financialDataNote,
    },
    akad,
    legal,
    esg,
    profile: {
      ...baseProfile,
      ...extraProfile,
      ...collateralProfile,
      statusTempatTinggal,
      aset,
      fasilitasBank,
      keteranganBank: fasilitasBank
        ? "Fasilitas berjalan sesuai iDeb SLIK, kolektibilitas lancar (kol 1)."
        : "Tidak ada fasilitas pembiayaan berjalan berdasarkan iDeb SLIK.",
      // SLIK mengikuti riwayat: ada pinjaman berjalan atau pembiayaan sebelumnya berarti tercatat lancar.
      riwayatSlik: existingDebt > 0 || pembiayaanKe > 1 ? "Tidak pernah terlambat 12 bulan terakhir" : "Belum memiliki kredit/Pembiayaan",
      buktiPenggunaanDana: pembiayaanKe > 1 ? "Ada" : undefined,
    },
  };
}

/**
 * Rekening koran 3 bulan terakhir: setoran hasil penjualan beberapa kali per
 * minggu (sekitar 60 sampai 75% omzet, sisanya diputar tunai) dan pembayaran ke
 * pemasok serta biaya.
 */
function demoStatement(rng: Rng, revenue: number, today: Date): NonNullable<BprsProfile["rekeningKoran"]> {
  const first = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const months = [0, 1, 2].map(() => {
    const deposits = randInt(rng, 8, 12);
    const depositTotal = revenue * (0.6 + rng() * 0.15);
    const credits = Array.from({ length: deposits }, () => roundTo((depositTotal / deposits) * (0.7 + rng() * 0.6), 50_000));
    const payments = randInt(rng, 4, 7);
    const paymentTotal = credits.reduce((a, b) => a + b, 0) * (0.85 + rng() * 0.1);
    const debits = Array.from({ length: payments }, () => roundTo((paymentTotal / payments) * (0.7 + rng() * 0.6), 50_000));
    return { credits, debits };
  });
  return {
    bank: "BPRS Amanah Rabbaniah",
    nomorRekening: `21${pad(randInt(rng, 0, 9_999_999), 7)}`,
    saldoAwal: roundTo(revenue * (0.15 + rng() * 0.15), 50_000),
    bulanPertama: `${first.getFullYear()}-${pad(first.getMonth() + 1, 2)}`,
    months,
  };
}

/** Rekening gaji 3 bulan: gaji masuk sekali sebulan (kadang ada tunjangan), lalu penarikan dan pembayaran rutin. */
function demoSalaryStatement(rng: Rng, salary: number, today: Date): NonNullable<BprsProfile["rekeningKoran"]> {
  const first = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const months = [0, 1, 2].map(() => {
    const credits = [salary, ...(rng() < 0.4 ? [roundTo(salary * (0.05 + rng() * 0.1), 50_000)] : [])];
    const spend = credits.reduce((a, b) => a + b, 0) * (0.85 + rng() * 0.1);
    const count = randInt(rng, 3, 6);
    const debits = Array.from({ length: count }, () => roundTo((spend / count) * (0.7 + rng() * 0.6), 50_000));
    return { credits, debits };
  });
  return {
    bank: pick(rng, ["Bank BJB", "BSI", "BRI"]),
    nomorRekening: `00${pad(randInt(rng, 0, 99_999_999), 8)}`,
    saldoAwal: roundTo(salary * (0.1 + rng() * 0.2), 50_000),
    bulanPertama: `${first.getFullYear()}-${pad(first.getMonth() + 1, 2)}`,
    months,
  };
}

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Isian ceklist akad yang selaras dengan plafon dan margin skenario. */
export function demoAkadFields(scenario: DemoScenario, akad: string, today = new Date()): Record<string, string> {
  const requested = Number(scenario.finance.requestedAmount);
  const marginRate = Number(scenario.finance.marginRate);
  const tenor = Number(scenario.finance.financingTenor);
  const net = Number(scenario.finance.monthlyRevenue) - Number(scenario.finance.monthlyExpenses);
  if (akad === "mudharabah") {
    return {
      mudharabahType: "muqayyadah",
      mudharabahCapitalForm: "uang",
      mudharabahCapitalValue: String(requested),
      mudharabahBusinessPurpose: scenario.finance.loanPurpose,
      mudharabahProfitSharingMethod: "net_revenue",
      mudharabahBankNisbah: "35",
      mudharabahCustomerNisbah: "65",
      mudharabahPbh: String(roundTo(net, 50_000)),
      mudharabahRbh: String(roundTo(net * 0.95, 50_000)),
      mudharabahCollateral: "yes",
      mudharabahGuarantor: "no",
      mudharabahTaazirToWelfare: "yes",
      mudharabahSignedAt: isoDate(addDays(today, 7)),
      mudharabahNotes: "Nisbah 35:65 disepakati berdasarkan proyeksi pendapatan usaha 3 bulan terakhir.",
    };
  }
  if (akad === "qardh") {
    return { qardhPurpose: "Dana talangan biaya pendaftaran porsi haji reguler.", qardhAdminFee: "250000", marginRate: "0" };
  }
  if (akad === "multijasa") {
    const dp = roundTo(requested * 0.1, 100_000);
    return {
      multijasaAkadType: "ijarah",
      multijasaServiceCategory: "pendidikan",
      multijasaServiceProvider: "Universitas Islam Bandung (Unisba)",
      multijasaSourceObject: "Biaya pendidikan dan SPP dua semester",
      multijasaServiceCost: String(requested + dp),
      multijasaDownPayment: String(dp),
      multijasaUjrahAmount: String(roundTo(requested * marginRate / 100, 50_000)),
      multijasaWakalah: "no",
      multijasaDpsReviewed: "yes",
      multijasaTaazirToWelfare: "yes",
      multijasaNotes: `Biaya jasa dikonfirmasi ke penyedia; ujrah setara margin ${marginRate}% untuk ${tenor} bulan.`,
    };
  }
  // Murabahah: harga pokok = plafon + uang muka 10%.
  const price = roundTo(requested / (1 - scenario.akad.downPaymentPct), 100_000);
  return {
    murabahahType: requested <= 25_000_000 ? "ultra_mikro" : "standard",
    murabahahSupplierName: scenario.akad.supplier,
    murabahahObject: scenario.akad.object,
    murabahahPriceKnown: "yes",
    murabahahMarginDisclosed: "yes",
    murabahahDpsReviewed: "yes",
    murabahahAcquisitionPrice: String(price),
    murabahahDirectCost: "0",
    murabahahSupplierDiscount: "0",
    murabahahDownPaymentAmount: String(price - requested),
    murabahahWakalah: "yes",
    murabahahWakalahConfirmedAt: isoDate(addDays(today, 1)),
    murabahahInvoiceNumber: `INV/${today.getFullYear()}/${pad(randInt(Math.random, 100, 999), 4)}`,
    murabahahQabdhVerifiedAt: isoDate(addDays(today, 4)),
    murabahahSignedAt: isoDate(addDays(today, 5)),
    murabahahTaazirToWelfare: "yes",
    murabahahNotes: `Barang dibeli dari ${scenario.akad.supplier} atas wakalah BPRS; akad ditandatangani setelah barang diterima nasabah.`,
  };
}
