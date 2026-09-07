/**
 * Pedoman Kebijakan Pembiayaan BPRS (BPR Syariah Amanah Rabbaniah / Standar BPRS)
 * Sesuai dokumen KPB per 17 Maret 2025.
 */

export const BPRS_PRODUCT_SEGMENTS = [
  "umkm", // Usaha Produktif / Komersial UMKM
  "karyawan_swasta", // Pembiayaan Karyawan Swasta (Payroll / BPJS-TK)
  "guru_sertifikasi", // Pembiayaan Guru dengan jaminan Sertifikat Pendidik
  "non_perorangan", // Pembiayaan Badan Usaha / Non-Perorangan (PT/CV)
] as const;

export type BprsProductSegment = (typeof BPRS_PRODUCT_SEGMENTS)[number];

export const BPRS_SEGMENT_DETAILS: Record<
  BprsProductSegment,
  {
    label: string;
    description: string;
    defaultMaxDsr: number; // Persen
    requiredDocuments: string[];
    collateralNotes: string;
  }
> = {
  umkm: {
    label: "Usaha / Komersial UMKM",
    description: "Pembiayaan produktif modal kerja / investasi bagi pelaku usaha UMKM",
    defaultMaxDsr: 40,
    requiredDocuments: ["KTP", "NPWP", "NIB"],
    collateralNotes: "Tanah, bangunan, kendaraan, atau agunan usaha produktif",
  },
  karyawan_swasta: {
    label: "Karyawan Swasta (Payroll / Jamsostek)",
    description: "Pembiayaan konsumtif/multiguna bagi pegawai swasta dengan potong gaji/ATM",
    defaultMaxDsr: 40, // s.d. 50% jika kepesertaan JHT > 4 tahun
    requiredDocuments: [
      "KTP",
      "Kartu Keluarga",
      "Surat Nikah",
      "NPWP",
      "Kartu Pegawai / ID Card",
      "Slip Gaji Terakhir",
      "Buku Tabungan / Rekening Koran Payroll",
      "Kartu BPJS Ketenagakerjaan / Jamsostek",
      "Bukti Saldo JHT BPJS-TK",
    ],
    collateralNotes: "Jaminan Utama: Saldo JHT BPJS-TK / BPKB / SHM. Jaminan Tambahan: Buku Nikah / Ijazah Asli",
  },
  guru_sertifikasi: {
    label: "Guru Sertifikasi (PNS / Non-PNS)",
    description: "Fasilitas pembiayaan guru dengan jaminan Sertifikat Pendidik & tunjangan sertifikasi",
    defaultMaxDsr: 80, // Maks 80% dari tunjangan sertifikasi/inpassing sesuai pedoman
    requiredDocuments: [
      "KTP Suami/Istri",
      "Kartu Keluarga",
      "NPWP",
      "Kartu Pegawai (KARPEG) / SK Mengajar",
      "Sertifikat Pendidik (Serdik)",
      "Buku Tabungan Rekening Sertifikasi",
      "Rekening Koran Tunjangan 1 Tahun Terakhir",
      "Ijazah Terakhir & Akta IV",
      "Surat Rekomendasi Sekolah",
    ],
    collateralNotes: "Jaminan: Sertifikat Pendidik, Ijazah Terakhir, Akta IV, titip Kartu ATM & Buku Tabungan Sertifikasi (Tabungan blokir 4-6x angsuran)",
  },
  non_perorangan: {
    label: "Non-Perorangan (Badan Hukum PT / CV / Koperasi)",
    description: "Fasilitas pembiayaan untuk korporasi/badan usaha berbadan hukum",
    defaultMaxDsr: 40,
    requiredDocuments: [
      "KTP & NPWP Seluruh Pengurus / Direksi",
      "KTP & NPWP Pemilik Saham",
      "Akta Pendirian Badan Usaha",
      "Akta Perubahan AD/ART Terakhir & SK Kemenkumham",
      "NIB (Nomor Induk Berusaha)",
      "NPWP Badan Usaha",
      "Laporan Keuangan (Neraca, Laba Rugi, Cashflow)",
      "SPT Pajak Terakhir",
      "Rekening Koran Usaha 6 Bulan Terakhir",
    ],
    collateralNotes: "Aset tetap perusahaan, tanah & bangunan SHM/HGB, personal guarantee / corporate guarantee",
  },
};

export const BPRS_POLICY_CONSTANTS = {
  MAX_DSR_RATIO: 40, // 40%
  /** Threshold taksasi agunan internal vs eksternal (KJPP) */
  EXTERNAL_APPRAISAL_THRESHOLD: 500_000_000, // Rp 500.000.000
  /** Threshold kewajiban Opini Kepatuhan & Manajemen Risiko */
  COMPLIANCE_OPINION_THRESHOLD: 100_000_000, // Rp 100.000.000
  /** Threshold kewajiban Opini Legal untuk Perorangan */
  LEGAL_OPINION_THRESHOLD_INDIVIDUAL: 250_000_000, // Rp 250.000.000
  /** Threshold batas kewenangan memutus pembiayaan */
  APPROVAL_LEVEL_1_MAX: 10_000_000, // <= 10 jt: Kabag Marketing (rekomendasi Koordinator)
  APPROVAL_LEVEL_2_MAX: 25_000_000, // <= 25 jt: Kepala Kantor Cabang (rekomendasi Koordinator)
  // > 25 jt: Direksi yang membawahkan Bisnis (Direktur Utama)
} as const;

export interface BprsPolicyEvaluation {
  /** Estimasi angsuran bulanan */
  monthlyInstallment: number;
  /** Rasio angsuran (DSR) terhadap net income dalam persen */
  dsrRatio: number;
  /** Apakah DSR memenuhi batas maksimal kebijakan segmen */
  isDsrCompliant: boolean;
  /** Batas maksimal DSR segmen yang diterapkan (%) */
  appliedMaxDsr: number;
  /** Batas maksimal angsuran berdasarkan DSR 40% */
  maxAllowedInstallmentDsr: number;
  /** Rekomendasi plafon maksimal berdasarkan kapasitas DSR 40% */
  maxPlafonByDsr: number;
  /** Tingkatan pejabat pemutus pembiayaan yang berwenang */
  approvalAuthority: {
    roleTitle: string;
    description: string;
    subordinateApprovalRequired: string;
  };
  /** Ketentuan taksasi jaminan */
  appraisalRequirement: {
    type: "INTERNAL" | "KJPP_EKSTERNAL";
    label: string;
    requiredDocuments: string[];
  };
  /** Kebutuhan opini kepatuhan & manajemen risiko */
  needsComplianceOpinion: boolean;
  complianceOpinionNote: string;
  /** Kebutuhan opini legal */
  needsLegalOpinion: boolean;
  legalOpinionNote: string;
}

/**
 * Evaluasi kepatuhan terhadap Pedoman Kebijakan Pembiayaan BPRS
 */
export function evaluateBprsPolicy(params: {
  requestedAmount: number;
  collateralValue: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  existingDebt: number;
  tenorMonths: number;
  marginRate: number;
  segment?: BprsProductSegment;
  isNonIndividual?: boolean; // Badan Usaha
}): BprsPolicyEvaluation {
  const {
    requestedAmount,
    collateralValue,
    monthlyRevenue,
    monthlyExpenses,
    existingDebt,
    tenorMonths,
    marginRate,
    segment = "umkm",
    isNonIndividual = false,
  } = params;

  const segmentConfig = BPRS_SEGMENT_DETAILS[segment] || BPRS_SEGMENT_DETAILS.umkm;
  const maxDsrAllowed = segmentConfig.defaultMaxDsr;

  const netIncome = Math.max(0, monthlyRevenue - monthlyExpenses);
  const tenor = Math.max(1, tenorMonths);
  const monthlyInstallment = requestedAmount * (1 + marginRate / 100) / tenor;
  const totalMonthlyCommitment = existingDebt + monthlyInstallment;
  
  // DSR = (Total Kewajiban Bulanan / Net Income) * 100
  const dsrRatio = netIncome > 0 ? (totalMonthlyCommitment / netIncome) * 100 : 999;
  const isDsrCompliant = dsrRatio <= maxDsrAllowed;

  // Kapasitas angsuran baru maksimal sesuai DSR limit segmen
  const maxTotalAllowedCommitment = netIncome * (maxDsrAllowed / 100);
  const maxAllowedInstallmentDsr = Math.max(0, maxTotalAllowedCommitment - existingDebt);
  const maxPlafonByDsr = Math.round((maxAllowedInstallmentDsr * tenor / (1 + marginRate / 100)) * 100) / 100;

  // 1. Kewenangan Memutus Pembiayaan (Bab Kewenangan Memutus)
  let approvalAuthority: BprsPolicyEvaluation["approvalAuthority"];
  if (requestedAmount <= BPRS_POLICY_CONSTANTS.APPROVAL_LEVEL_1_MAX) {
    approvalAuthority = {
      roleTitle: "Kepala Bagian Marketing",
      description: "Plafond s.d. Rp 10.000.000,-",
      subordinateApprovalRequired: "Wajib persetujuan Koordinator Marketing terlebih dahulu",
    };
  } else if (requestedAmount <= BPRS_POLICY_CONSTANTS.APPROVAL_LEVEL_2_MAX) {
    approvalAuthority = {
      roleTitle: "Kepala Kantor Cabang",
      description: "Plafond > Rp 10.000.000,- s.d. Rp 25.000.000,-",
      subordinateApprovalRequired: "Wajib persetujuan Koordinator Marketing terlebih dahulu",
    };
  } else {
    approvalAuthority = {
      roleTitle: "Direksi yang Membawahkan Bisnis (Dirut)",
      description: "Plafond di atas Rp 25.000.000,-",
      subordinateApprovalRequired: "Wajib persetujuan Kepala Kantor Cabang / Kabag Marketing & Koordinator Marketing",
    };
  }

  // 2. Taksasi Jaminan (Bab Taksasi Jaminan)
  const isExternalAppraisal = requestedAmount >= BPRS_POLICY_CONSTANTS.EXTERNAL_APPRAISAL_THRESHOLD;
  const appraisalRequirement: BprsPolicyEvaluation["appraisalRequirement"] = {
    type: isExternalAppraisal ? "KJPP_EKSTERNAL" : "INTERNAL",
    label: isExternalAppraisal
      ? "Taksasi Eksternal (KJPP)"
      : "Taksasi Internal BPRS",
    requiredDocuments: isExternalAppraisal
      ? ["SPPT PBB Terakhir (Tanah/Bangunan)", "NPWP Pemohon", "Surat Permohonan Taksasi KJPP", "Bukti Pajak Kendaraan Terakhir (Kendaraan)"]
      : ["SPPT PBB Terakhir (Tanah/Bangunan)", "Bukti Pajak Kendaraan Terakhir (Kendaraan)"],
  };

  // 3. Opini Kepatuhan & MR (Bab Opini Kepatuhan & Manajemen Risiko)
  const needsComplianceOpinion = requestedAmount >= BPRS_POLICY_CONSTANTS.COMPLIANCE_OPINION_THRESHOLD;
  const complianceOpinionNote = needsComplianceOpinion
    ? `Plafon >= Rp 100 Juta: Wajib lembar Opini Kepatuhan & Manajemen Risiko dari PE Kepatuhan & Direktur Kepatuhan sebelum komite pembiayaan.`
    : `Plafon < Rp 100 Juta: Tidak dipersyaratkan Opini Kepatuhan formal, cukup kajian risiko standar.`;

  // 4. Opini Legal (Bab Opini Legal)
  const needsLegalOpinion = isNonIndividual || requestedAmount >= BPRS_POLICY_CONSTANTS.LEGAL_OPINION_THRESHOLD_INDIVIDUAL;
  const legalOpinionNote = isNonIndividual
    ? `Nasabah Non-Perorangan (Badan Usaha): Wajib Opini Legal (telaah legalitas badan hukum, AD/ART, SK Kemenkumham, keabsahan pengurus).`
    : needsLegalOpinion
    ? `Plafon Perorangan >= Rp 250 Juta: Wajib lembar Opini Legal (telaah keabsahan dokumen jaminan dan perjanjian).`
    : `Plafon < Rp 250 Juta: Telaah legalitas mengikuti verifikasi standar ADMP & Legal.`;

  return {
    monthlyInstallment: Math.round(monthlyInstallment * 100) / 100,
    dsrRatio: Math.round(dsrRatio * 100) / 100,
    isDsrCompliant,
    appliedMaxDsr: maxDsrAllowed,
    maxAllowedInstallmentDsr: Math.round(maxAllowedInstallmentDsr * 100) / 100,
    maxPlafonByDsr,
    approvalAuthority,
    appraisalRequirement,
    needsComplianceOpinion,
    complianceOpinionNote,
    needsLegalOpinion,
    legalOpinionNote,
  };
}
