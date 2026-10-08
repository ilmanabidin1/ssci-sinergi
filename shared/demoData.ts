// Contoh data untuk uji alur. Satu klik menghasilkan satu skenario nasabah yang
// utuh: identitas, usaha, keuangan, akad, dan profil format BPRS diturunkan dari
// persona yang sama, sehingga angka-angkanya masuk akal dan tidak saling
// bertentangan (NIK sesuai tanggal lahir dan jenis kelamin, omzet sesuai jenis
// usaha, angsuran di bawah batas DSR 40%, agunan di atas 125% plafon).

import type { BprsProfile } from "./bprsTemplate";

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
  /** Biaya tetap per bulan (sewa, listrik, gaji karyawan). */
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
};
const SALES = ["Tunai", "Non Tunai & Tunai"] as const;

export const DEMO_PERSONAS: Persona[] = [
  {
    name: "Warung Nasi", type: "Kuliner", dailySales: [900_000, 1_600_000], openDays: 26, cogsPct: [0.52, 0.58], fixedCosts: [2_500_000, 4_000_000], employees: [1, 3],
    plafond: [15_000_000, 40_000_000], purpose: "Pembelian peralatan dapur dan etalase saji", object: "Kompor komersial, freezer, dan etalase saji", supplier: "Toko Alat Dapur Sinar Jaya",
    sistemPenjualan: "Tunai", daerahPemasaran: "Sekitar Lokasi Usaha", ownsPlace: false, lokasi: "Menetap/Permanen",
    sharia: "Menjual makanan halal, bahan dibeli dari pemasok yang jelas, tanpa minuman beralkohol.", environmental: "Memakai wadah makan yang dapat dicuci ulang dan memilah sampah dapur.", social: "Mempekerjakan tetangga sekitar sebagai juru masak dan pelayan.",
  },
  {
    name: "Toko Sembako", type: "Perdagangan", dailySales: [2_500_000, 4_500_000], openDays: 30, cogsPct: [0.83, 0.87], fixedCosts: [1_500_000, 2_500_000], employees: [1, 2],
    plafond: [20_000_000, 50_000_000], purpose: "Penambahan stok sembako (beras, minyak goreng, gula)", object: "Stok beras, minyak goreng, dan gula", supplier: "UD Sumber Rejeki (agen sembako)",
    sistemPenjualan: "Tunai", daerahPemasaran: "Kelurahan/Kecamatan", ownsPlace: true, lokasi: "Menetap/Permanen",
    sharia: "Barang dagangan halal dan harga jual diumumkan jelas kepada pembeli.", environmental: "Menyediakan kantong belanja kain dan mengurangi plastik sekali pakai.", social: "Melayani warung kecil sekitar dengan harga grosir.",
  },
  {
    name: "Laundry Kiloan", type: "Jasa", dailySales: [500_000, 900_000], openDays: 28, cogsPct: [0.25, 0.32], fixedCosts: [2_000_000, 3_500_000], employees: [2, 3],
    plafond: [15_000_000, 35_000_000], purpose: "Pembelian mesin cuci dan pengering kapasitas besar", object: "Mesin cuci front loading 10 kg dan mesin pengering", supplier: "CV Mandiri Elektrik",
    sistemPenjualan: "Tunai", daerahPemasaran: "Sekitar Lokasi Usaha", ownsPlace: false, lokasi: "Menetap/Permanen",
    sharia: "Jasa jelas tarif per kilogram dan tidak ada unsur yang dilarang.", environmental: "Memakai deterjen ramah lingkungan dan mesin hemat air.", social: "Mempekerjakan ibu rumah tangga sekitar sebagai tenaga setrika.",
  },
  {
    name: "Bengkel Motor", type: "Jasa", dailySales: [700_000, 1_300_000], openDays: 26, cogsPct: [0.45, 0.55], fixedCosts: [2_000_000, 3_500_000], employees: [1, 3],
    plafond: [15_000_000, 40_000_000], purpose: "Pembelian kompresor, alat servis, dan stok suku cadang", object: "Kompresor, kunci pas set, dan stok suku cadang", supplier: "Toko Sparepart Motor Jaya Abadi",
    sistemPenjualan: "Tunai", daerahPemasaran: "Kelurahan/Kecamatan", ownsPlace: true, lokasi: "Menetap/Permanen",
    sharia: "Jasa servis dengan tarif yang disepakati di awal dan suku cadang asli.", environmental: "Menampung oli bekas untuk diserahkan ke pengepul resmi.", social: "Membina dua pemuda sekitar sebagai mekanik magang.",
  },
  {
    name: "Konveksi", type: "Manufaktur", dailySales: [1_500_000, 2_800_000], openDays: 26, cogsPct: [0.6, 0.66], fixedCosts: [4_000_000, 7_000_000], employees: [4, 8],
    plafond: [30_000_000, 75_000_000], purpose: "Pembelian mesin jahit high speed dan mesin obras", object: "Mesin jahit high speed dan mesin obras", supplier: "Toko Mesin Jahit Cigondewah",
    sistemPenjualan: "Non Tunai & Tunai", daerahPemasaran: "Regional/Provinsi", ownsPlace: true, lokasi: "Menetap/Permanen",
    sharia: "Memproduksi pakaian muslim dan seragam sekolah sesuai pesanan dengan akad yang jelas.", environmental: "Sisa kain dijual ke pengrajin keset dan lap.", social: "Mempekerjakan penjahit dari lingkungan sekitar.",
  },
  {
    name: "Produksi Kerupuk", type: "Manufaktur", dailySales: [1_200_000, 2_000_000], openDays: 26, cogsPct: [0.55, 0.62], fixedCosts: [3_000_000, 5_000_000], employees: [3, 5],
    plafond: [25_000_000, 60_000_000], purpose: "Pembelian bahan baku tepung tapioka dan alat penjemuran", object: "Bahan baku tapioka dan rak jemur", supplier: "Agen Tapioka Sumber Makmur",
    sistemPenjualan: "Non Tunai & Tunai", daerahPemasaran: "Kabupaten/Kotamadya", ownsPlace: true, lokasi: "Menetap/Permanen",
    sharia: "Produk bersertifikat halal dan dijual ke warung serta pasar tradisional.", environmental: "Memanfaatkan sinar matahari untuk penjemuran dan mengolah limbah adonan menjadi pakan.", social: "Mempekerjakan warga sekitar dalam proses produksi.",
  },
  {
    name: "Toko Pertanian", type: "Perdagangan", dailySales: [1_500_000, 3_000_000], openDays: 28, cogsPct: [0.8, 0.85], fixedCosts: [1_500_000, 3_000_000], employees: [1, 2],
    plafond: [20_000_000, 50_000_000], purpose: "Penambahan stok pupuk, bibit, dan obat tanaman", object: "Stok pupuk, bibit, dan sarana produksi pertanian", supplier: "CV Tani Makmur (distributor saprotan)",
    sistemPenjualan: "Non Tunai & Tunai", daerahPemasaran: "Kelurahan/Kecamatan", ownsPlace: true, lokasi: "Menetap/Permanen",
    sharia: "Barang halal dan penjualan tempo kepada petani dicatat dengan jelas tanpa tambahan bunga.", environmental: "Menyediakan pupuk organik sebagai pilihan bagi petani.", social: "Menjadi tempat konsultasi petani setempat.",
  },
  {
    name: "Fotokopi dan ATK", type: "Jasa", dailySales: [600_000, 1_100_000], openDays: 26, cogsPct: [0.4, 0.5], fixedCosts: [1_800_000, 3_000_000], employees: [1, 2],
    plafond: [15_000_000, 35_000_000], purpose: "Pembelian mesin fotokopi digital", object: "Mesin fotokopi digital rekondisi", supplier: "CV Duta Copier",
    sistemPenjualan: "Tunai", daerahPemasaran: "Sekitar Lokasi Usaha", ownsPlace: false, lokasi: "Menetap/Permanen",
    sharia: "Jasa dan barang yang dijual halal dengan harga yang jelas.", environmental: "Mengumpulkan kertas sisa untuk didaur ulang.", social: "Melayani kebutuhan sekolah sekitar dengan harga pelajar.",
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
  const customer = {
    customerName,
    customerId: buildNik(region, kecIndex, gender, birth, randInt(rng, 1, 2999)),
    phone: `08${pick(rng, ["12", "13", "21", "22", "52", "57", "77", "81", "95"])}${pad(randInt(rng, 0, 99_999_999), 8)}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@gmail.com`,
    address: `${pick(rng, STREETS)} No. ${randInt(rng, 3, 99)} RT ${pad(randInt(rng, 1, 9), 2)}/RW ${pad(randInt(rng, 1, 12), 2)}, Kel. ${kelurahan}, Kec. ${kecamatan}, ${region.city}, ${region.province}`,
  };
  const yearsInHome = Math.min(age - 22, randInt(rng, 4, 15));
  const monthlyRate = pick(rng, MONTHLY_FLAT_RATES);
  const dsr = DSR_TARGET[0] + rng() * (DSR_TARGET[1] - DSR_TARGET[0]);

  const baseProfile: BprsProfile = {
    kantor: "PUSAT",
    kategoriNasabah: pick(rng, ["Walk In Customer", "Referral", "Solisitasi"] as const),
    jenisKelamin: gender === "L" ? "Pria" : "Wanita",
    tempatLahir: region.city.replace(/^(Kota|Kabupaten) /, ""),
    tanggalLahir: `${birth.getFullYear()}-${pad(birth.getMonth() + 1, 2)}-${pad(birth.getDate(), 2)}`,
    desa: kelurahan,
    kecamatan,
    kabupaten: region.city,
    kodePos: `${region.postal}${pad(randInt(rng, 100, 399), 3)}`,
    statusPerkawinan: married ? "Menikah" : "Lajang",
    tanggungan: children === 0 ? "Tidak Mempunyai Tanggungan" : children <= 2 ? " 1 - 2 Orang" : "3 - 5 Orang",
    ibuKandung: pick(rng, ["Iyah", "Enok", "Aminah", "Cucu", "Imas", "Onih"]),
    namaPasangan: married ? `${pick(rng, gender === "L" ? FEMALE : MALE)} ${pick(rng, LAST)}` : undefined,
    pekerjaanPasangan: married ? (gender === "L" ? "Mengurus Rumah Tangga" : pick(rng, ["Wiraswasta", "Karyawan Swasta"])) : undefined,
    statusTempatTinggal: rng() < 0.7 ? "Milik sendiri" : "Sewa",
    lamaMenetap: yearsInHome > 8 ? "> 8 tahun" : yearsInHome > 5 ? "> 5 - 8 tahun" : "> 2 - 5 tahun",
    reputasi: "Dikenal memiliki reputasi baik",
    hubunganBank: pick(rng, ["Nasabah/debitur bank 1 - 3 tahun", "Nasabah/debitur bank > 3 tahun"] as const),
    pembiayaanKe: randInt(rng, 1, 2),
    jenisMargin: "Flat",
    rpcPersen: "0.7",
    asuransiJiwa: "Asuransi Jiwa Syariah",
    namaAo: "Andrie Hardiman",
  };

  let business: DemoScenario["business"];
  let revenue: number;
  let expenses: number;
  let existingDebt: number;
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

  if (fixed) {
    const employers = EMPLOYERS.filter(e => (options.segment === "guru_sertifikasi" ? e.guru : options.segment === "karyawan_swasta" ? !e.guru : true));
    const employer = pick(rng, employers);
    const salary = roundTo(randInt(rng, employer.salary[0], employer.salary[1]), 50_000);
    const yearsWorked = Math.min(age - 22, randInt(rng, 3, 15));
    revenue = salary;
    expenses = roundTo(salary * (married ? 0.45 + rng() * 0.1 : 0.35 + rng() * 0.1), 50_000);
    existingDebt = rng() < 0.3 ? roundTo(salary * 0.08, 50_000) : 0;
    plafondRange = [10_000_000, 60_000_000];
    const need = pick(rng, FIXED_NEEDS);
    purpose = need.purpose;
    business = { businessName: employer.name, businessType: employer.guru ? "Guru" : "Karyawan", businessAge: String(yearsWorked * 12) };
    akad = { object: need.object, supplier: need.supplier, downPaymentPct: 0.1 };
    legal = { businessShariaCompliant: "yes", shariaComplianceNotes: `Penghasilan berasal dari gaji tetap di ${employer.name}, halal dan dapat diverifikasi melalui slip gaji.` };
    esg = { environmentalPractices: "", socialImpact: "", governanceQuality: "good" };
    financialDataSource = "laporan_keuangan";
    financialDataNote = `Gaji dari slip gaji 3 bulan terakhir; pengeluaran rumah tangga dari wawancara.`;
    extraProfile = {
      template: "fix_income",
      pendidikanFix: employer.guru ? "S1" : pick(rng, ["SMA", "D1 - D4", "S1"] as const),
      statusKaryawan: employer.status,
      bidangPekerjaan: employer.bidang,
      bonafiditas: "Bonafide",
      suratKeteranganBekerja: "Ada",
      slipGaji: "Ada",
      rekeningGaji: "Ada",
      suratKuasaPotongGaji: "Ada",
      potonganGaji: "0.4",
      gajiBulanan: salary,
      namaInstansi: employer.name,
      alamatInstansi: employer.alamat,
      reputasiFix: "Dikenal baik",
      sektorEkonomi: "Lainnya",
      jenisPenggunaan: "Konsumtif",
      latarBelakang: `Pemohon bekerja sebagai ${employer.guru ? "guru" : "karyawan"} ${employer.status === "PNS" ? "berstatus PNS" : employer.status === "Kontrak ASN/PPPK" ? "berstatus PPPK" : "tetap"} di ${employer.name} sejak ${yearsWorked} tahun lalu. Pembiayaan diajukan untuk ${purpose.toLowerCase()}, dengan angsuran dipotong dari gaji bulanan.`,
      pengalamanUsaha: `Masa kerja ${yearsWorked} tahun di ${employer.name} tanpa catatan pelanggaran.`,
      indikatorReputasi: "Berdasarkan konfirmasi ke bagian kepegawaian dan tetangga, pemohon dikenal disiplin dan bertanggung jawab.",
    };
  } else {
    const persona = pick(rng, DEMO_PERSONAS);
    const daily = roundTo(randInt(rng, persona.dailySales[0], persona.dailySales[1]), 50_000);
    const cogs = persona.cogsPct[0] + rng() * (persona.cogsPct[1] - persona.cogsPct[0]);
    const fixedCosts = roundTo(randInt(rng, persona.fixedCosts[0], persona.fixedCosts[1]), 100_000);
    revenue = roundTo(daily * persona.openDays, 100_000);
    expenses = roundTo(revenue * cogs + fixedCosts, 100_000);
    existingDebt = rng() < 0.35 ? pick(rng, [450_000, 650_000, 850_000]) : 0;
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
    };
  }

  // Plafon: angsuran total (existing + baru) sekitar 30 sampai 36% dari laba bersih.
  // Tenor dipilih yang terpendek tetapi cukup untuk plafon minimal persona.
  // Laba usaha dikurangi biaya rumah tangga, seperti perhitungan RPC di Excel BPRS.
  const net = revenue - expenses - household;
  // Nasabah dengan laba tipis dibuat tanpa pinjaman lain, agar plafon tetap wajar.
  if (existingDebt > 0 && ((net * dsr - existingDebt) * 36) / (1 + (monthlyRate * 36 * 100) / 100) < plafondRange[0]) existingDebt = 0;
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
          merek: "Honda", tipe: pick(rng, ["Vario 125", "Beat", "Scoopy"]), tahun: today.getFullYear() - randInt(rng, 1, 4), atasNama: customerName,
          nomorBpkb: `P-${pad(randInt(rng, 0, 99_999_999), 8)}`, nopol: `D ${randInt(rng, 1000, 6999)} ${pick(rng, ["ABC", "UKA", "SAR", "FGH"])}`, nilaiPasar: marketValue, persen: 0.6,
        }],
        pengikatan: "Tidak Pengikatan Notaril",
        asuransiAgunan: "Tidak Diasuransikan",
      };

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
      // SLIK mengikuti riwayat: ada pinjaman berjalan atau pembiayaan sebelumnya berarti tercatat lancar.
      riwayatSlik: existingDebt > 0 || (baseProfile.pembiayaanKe ?? 1) > 1 ? "Tidak pernah terlambat 12 bulan terakhir" : "Belum memiliki kredit/Pembiayaan",
      buktiPenggunaanDana: (baseProfile.pembiayaanKe ?? 1) > 1 ? "Ada" : undefined,
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

const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
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
