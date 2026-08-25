export type MurabahahBreakdownInput = {
  requestedAmount: string;
  acquisitionPrice?: string | null;
  directCost?: string | null;
  supplierDiscount?: string | null;
  downPaymentAmount?: string | null;
  marginRate?: string | null;
};

export type MurabahahBreakdown = {
  hargaPokok: number;
  biayaLangsung: number;
  diskon: number;
  hargaPerolehan: number;
  uangMuka: number;
  pokokPembiayaan: number;
  marginNominal: number | null;
  piutangMurabahah: number;
  suggestedType: "ultra_mikro" | "standard";
  wakalahForbidden: boolean;
};

const toNumber = (value: string | null | undefined) => {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round = (value: number) => Math.round(value * 100) / 100;

export function calculateMurabahahBreakdown(input: MurabahahBreakdownInput): MurabahahBreakdown {
  const hargaPokok = toNumber(input.acquisitionPrice);
  const biayaLangsung = toNumber(input.directCost);
  const diskon = toNumber(input.supplierDiscount);
  const hargaPerolehan = round(hargaPokok + biayaLangsung - diskon);
  const uangMuka = toNumber(input.downPaymentAmount);
  const pokokPembiayaan = round(hargaPerolehan - uangMuka);
  const marginNominal =
    input.marginRate != null && input.marginRate !== "" && Number.isFinite(Number(input.marginRate))
      ? round(hargaPerolehan * (Number(input.marginRate) / 100))
      : null;
  const piutangMurabahah = round(pokokPembiayaan + (marginNominal ?? 0));
  const suggestedType = toNumber(input.requestedAmount) <= 20_000_000 ? "ultra_mikro" : "standard";
  const wakalahForbidden = false;

  return {
    hargaPokok,
    biayaLangsung,
    diskon,
    hargaPerolehan,
    uangMuka,
    pokokPembiayaan,
    marginNominal,
    piutangMurabahah,
    suggestedType,
    wakalahForbidden,
  };
}
