import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";

/**
 * Mengubah error dari tRPC atau jaringan menjadi kalimat yang dapat dipahami
 * pengguna. Pesan server sudah berbahasa Indonesia (lihat errorFormatter di
 * server/_core/trpc.ts); fungsi ini menangani sisa kasus teknis.
 */
export function errorMessage(error: unknown, fallback = "Terjadi kesalahan. Coba lagi beberapa saat."): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const message = raw.trim();
  if (!message) return fallback;
  if (message === UNAUTHED_ERR_MSG) return "Sesi Anda telah berakhir. Silakan masuk kembali.";
  if (message === NOT_ADMIN_ERR_MSG) return "Anda tidak memiliki akses untuk tindakan ini.";
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.";
  }
  if (message.startsWith("TWO_FACTOR_REQUIRED:")) return message.replace("TWO_FACTOR_REQUIRED:", "").trim();
  // JSON mentah (misalnya daftar issue zod dari versi server lama) tidak ditampilkan.
  if (message.startsWith("[") || message.startsWith("{")) return "Ada isian yang tidak valid. Periksa kembali data Anda.";
  return message;
}

/** Pesan per kolom dari errorFormatter server, jika ada. */
export function fieldErrors(error: unknown): Record<string, string> {
  const data = (error as { data?: { fieldErrors?: Record<string, string> } } | null)?.data;
  return data?.fieldErrors ?? {};
}
