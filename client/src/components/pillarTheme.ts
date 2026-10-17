/**
 * Warna tetap untuk tiga pilar SSCI, dipakai bersama oleh Beranda dan halaman
 * Tentang SSCI agar asosiasi warna pilar konsisten dan tiap pilar dapat
 * dibedakan: SFI biru royal, SCI emas, LCI abu-biru (token chart-4).
 */
export type PillarKey = "sfi" | "sci" | "lci";

export const PILLAR_THEME: Record<PillarKey, {
  /** Titik/aksen kecil dan garis atas kartu. */
  dot: string;
  /** Segmen bar proporsi bobot, termasuk warna teks di atasnya. */
  bar: string;
  /** Latar lembut kartu. */
  soft: string;
  border: string;
  /** Warna teks angka besar (kontras cukup di latar lembut). */
  text: string;
  icon: string;
  badge: string;
}> = {
  sfi: {
    dot: "bg-royal-600",
    bar: "bg-royal-600 text-white",
    soft: "bg-royal-600/5",
    border: "border-royal-600/30",
    text: "text-royal-700",
    icon: "text-royal-600",
    badge: "bg-royal-600/10 text-royal-700",
  },
  sci: {
    dot: "bg-gold-400",
    bar: "bg-gold-400 text-navy-900",
    soft: "bg-gold-50",
    border: "border-gold-400/50",
    text: "text-navy-900",
    icon: "text-gold-500",
    badge: "bg-gold-400/20 text-navy-900",
  },
  lci: {
    dot: "bg-chart-4",
    bar: "bg-chart-4 text-navy-950",
    soft: "bg-muted",
    border: "border-chart-4/50",
    text: "text-navy-700",
    icon: "text-navy-700",
    badge: "bg-chart-4/20 text-navy-900",
  },
};
