// Demo data generator. Every field is drawn from one coherent profile so the
// demo never contradicts itself (NIK region matches the address, business type
// matches the business name, installment fits the repayment capacity).

type Region = { province: string; provinceCode: string; city: string; cityCode: string; kecamatan: string[] };

const REGIONS: Region[] = [
  { province: "Jawa Barat", provinceCode: "32", city: "Bandung", cityCode: "73", kecamatan: ["Coblong", "Lengkong", "Cicendo", "Batununggal", "Regol", "Kiaracondong"] },
  { province: "Jawa Barat", provinceCode: "32", city: "Bekasi", cityCode: "75", kecamatan: ["Bekasi Timur", "Bekasi Selatan", "Medan Satria"] },
  { province: "Jawa Barat", provinceCode: "32", city: "Depok", cityCode: "76", kecamatan: ["Beji", "Pancoran Mas", "Sukmajaya"] },
  { province: "Jawa Barat", provinceCode: "32", city: "Bogor", cityCode: "71", kecamatan: ["Bogor Tengah", "Tanah Sareal", "Bogor Utara"] },
  { province: "Banten", provinceCode: "36", city: "Tangerang", cityCode: "71", kecamatan: ["Cipondoh", "Karawaci", "Ciledug"] },
  { province: "Jawa Tengah", provinceCode: "33", city: "Semarang", cityCode: "74", kecamatan: ["Semarang Tengah", "Banyumanik", "Tembalang"] },
  { province: "DI Yogyakarta", provinceCode: "34", city: "Yogyakarta", cityCode: "71", kecamatan: ["Gondokusuman", "Umbulharjo", "Jetis"] },
  { province: "Jawa Timur", provinceCode: "35", city: "Surabaya", cityCode: "78", kecamatan: ["Gubeng", "Tegalsari", "Wonokromo"] },
  { province: "Jawa Timur", provinceCode: "35", city: "Malang", cityCode: "73", kecamatan: ["Klojen", "Lowokwaru", "Blimbing"] },
  { province: "Sumatera Utara", provinceCode: "12", city: "Medan", cityCode: "75", kecamatan: ["Medan Baru", "Medan Petisah", "Medan Kota"] },
  { province: "Sumatera Selatan", provinceCode: "16", city: "Palembang", cityCode: "71", kecamatan: ["Ilir Timur I", "Seberang Ulu I", "Bukit Kecil"] },
  { province: "Sulawesi Selatan", provinceCode: "73", city: "Makassar", cityCode: "71", kecamatan: ["Panakkukang", "Tamalate", "Rappocini"] },
];

const STREETS = ["Jl. Merdeka", "Jl. Sudirman", "Jl. Ahmad Yani", "Jl. Gatot Subroto", "Jl. Diponegoro", "Jl. Pahlawan", "Jl. Veteran", "Jl. Pemuda"];

const FIRST_NAMES: Array<[string, "L" | "P"]> = [
  ["Andi", "L"], ["Budi", "L"], ["Eko", "L"], ["Gunawan", "L"], ["Hendra", "L"], ["Joko", "L"], ["Mulyadi", "L"], ["Rahmat", "L"], ["Teguh", "L"], ["Yudi", "L"], ["Zainal", "L"],
  ["Citra", "P"], ["Dewi", "P"], ["Fitri", "P"], ["Indah", "P"], ["Kartika", "P"], ["Lestari", "P"], ["Nurhayati", "P"], ["Siti", "P"], ["Wulan", "P"],
];
const LAST_NAMES = ["Pratama", "Wijaya", "Santoso", "Kurniawan", "Hidayat", "Nugroho", "Saputra", "Maulana", "Firmansyah", "Wibowo", "Hakim", "Setiawan", "Prasetyo", "Anggraini", "Rahmawati", "Utami"];

type BusinessProfile = { name: string; type: string; purposes: string[]; murabahahObject: string };

export const DEMO_BUSINESSES: BusinessProfile[] = [
  { name: "Toko Sembako", type: "Perdagangan", purposes: ["Pembelian stok sembako dan kebutuhan pokok"], murabahahObject: "Stok sembako dan kebutuhan pokok" },
  { name: "Toko Kelontong", type: "Perdagangan", purposes: ["Pembelian stok barang dagangan", "Penambahan rak dan etalase toko"], murabahahObject: "Barang dagangan kelontong" },
  { name: "Toko Bangunan", type: "Perdagangan", purposes: ["Pembelian stok bahan bangunan"], murabahahObject: "Stok semen, besi, dan bahan bangunan" },
  { name: "Bengkel Motor", type: "Jasa", purposes: ["Pembelian peralatan servis motor", "Pembelian stok suku cadang"], murabahahObject: "Peralatan servis dan suku cadang motor" },
  { name: "Laundry", type: "Jasa", purposes: ["Pembelian mesin cuci dan pengering komersial"], murabahahObject: "Mesin cuci dan pengering komersial" },
  { name: "Fotokopi dan Percetakan", type: "Jasa", purposes: ["Pembelian mesin fotokopi"], murabahahObject: "Mesin fotokopi digital" },
  { name: "Warung Makan", type: "Kuliner", purposes: ["Pembelian peralatan dapur", "Renovasi tempat makan"], murabahahObject: "Peralatan dapur dan kompor komersial" },
  { name: "Katering", type: "Kuliner", purposes: ["Pembelian peralatan masak dan wadah saji"], murabahahObject: "Peralatan masak dan wadah saji katering" },
  { name: "Konveksi", type: "Manufaktur", purposes: ["Pembelian mesin jahit", "Pembelian bahan baku kain"], murabahahObject: "Mesin jahit dan peralatan konveksi" },
  { name: "Toko Pakaian", type: "Retail", purposes: ["Pembelian stok pakaian"], murabahahObject: "Stok pakaian jadi" },
  { name: "Toko Elektronik", type: "Retail", purposes: ["Pembelian stok barang elektronik"], murabahahObject: "Barang dagangan elektronik" },
  { name: "Jasa Pengiriman", type: "Transportasi", purposes: ["Pembelian kendaraan pengiriman"], murabahahObject: "Sepeda motor niaga untuk pengiriman" },
  { name: "Toko Pertanian", type: "Pertanian", purposes: ["Pembelian stok pupuk dan bibit"], murabahahObject: "Stok pupuk, bibit, dan sarana tani" },
];

const SUFFIXES = ["Sejahtera", "Berkah", "Maju", "Jaya", "Abadi", "Mandiri", "Barokah", "Utama"];

type Rng = () => number;
const pick = <T,>(rng: Rng, items: T[]): T => items[Math.floor(rng() * items.length)]!;
const randInt = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const pad = (value: number, length: number) => String(value).padStart(length, "0");

export function buildNik(region: Region, kecamatanIndex: number, gender: "L" | "P", birth: Date, serial: number): string {
  const day = birth.getDate() + (gender === "P" ? 40 : 0);
  return `${region.provinceCode}${region.cityCode}${pad(kecamatanIndex + 1, 2)}${pad(day, 2)}${pad(birth.getMonth() + 1, 2)}${pad(birth.getFullYear() % 100, 2)}${pad(serial, 4)}`;
}

export function demoCustomer(rng: Rng = Math.random) {
  const [first, gender] = pick(rng, FIRST_NAMES);
  const last = pick(rng, LAST_NAMES);
  const region = pick(rng, REGIONS);
  const kecamatanIndex = randInt(rng, 0, region.kecamatan.length - 1);
  const birth = new Date(randInt(rng, 1965, 2000), randInt(rng, 0, 11), randInt(rng, 1, 28));
  return {
    customerName: `${first} ${last}`,
    customerId: buildNik(region, kecamatanIndex, gender, birth, randInt(rng, 1, 9999)),
    phone: `08${randInt(rng, 1, 9)}${pad(randInt(rng, 0, 99999999), 8)}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}${randInt(rng, 1, 99)}@gmail.com`,
    address: `${pick(rng, STREETS)} No. ${randInt(rng, 1, 120)}, Kec. ${region.kecamatan[kecamatanIndex]}, Kota ${region.city}, ${region.province}`,
  };
}

export function demoBusiness(rng: Rng = Math.random) {
  const profile = pick(rng, DEMO_BUSINESSES);
  const revenue = randInt(rng, 15, 80) * 1_000_000;
  const expenses = roundTo(revenue * randInt(rng, 52, 68) / 100, 100_000);
  const installment = randInt(rng, 0, 3) * 500_000;
  const marginRate = pick(rng, [8, 10, 11, 12, 13]);
  const surplus = revenue - expenses - installment;
  const tenor = pick(rng, [12, 24, 36]);
  // Keep the new installment within 60% of the remaining surplus.
  const maxRequested = (surplus * 0.6 * tenor) / (1 + marginRate / 100);
  const requested = Math.max(5_000_000, roundTo(Math.min(maxRequested, revenue * randInt(rng, 150, 300) / 100), 500_000));
  const collateral = roundTo(requested * randInt(rng, 125, 180) / 100, 500_000);
  return {
    businessName: `${profile.name} ${pick(rng, SUFFIXES)}`,
    businessType: profile.type,
    businessAge: String(randInt(rng, 18, 120)),
    monthlyRevenue: String(revenue),
    monthlyExpenses: String(expenses),
    existingDebt: String(installment),
    collateralValue: String(collateral),
    requestedAmount: String(requested),
    financingTenor: String(tenor),
    marginRate: String(marginRate),
    loanPurpose: pick(rng, profile.purposes),
  };
}

export function demoMurabahahObject(businessName: string | undefined, rng: Rng = Math.random): string {
  const profile = DEMO_BUSINESSES.find(p => businessName?.startsWith(p.name));
  return profile?.murabahahObject ?? pick(rng, DEMO_BUSINESSES).murabahahObject;
}
