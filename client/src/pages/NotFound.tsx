import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-navy-900 px-4 text-white">
      <div className="pattern-islamic pointer-events-none absolute inset-0 opacity-[0.05]" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-gold-400/10 blur-3xl" />
      <div className="relative max-w-lg text-center">
        <p className="text-gold-gradient font-serif text-[8rem] leading-none sm:text-[10rem]">404</p>
        <div className="gold-rule mx-auto my-6 w-24" />
        <h1 className="font-serif text-3xl">Halaman tidak ditemukan</h1>
        <p className="mt-4 leading-7 text-[#b9c4d8]">
          Maaf, halaman yang Anda cari tidak tersedia. Mungkin sudah dipindahkan atau dihapus.
        </p>
        <Button asChild className="mt-9 h-11 rounded-full bg-gold-400 px-7 text-navy-900 hover:bg-gold-300">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Kembali ke beranda
          </Link>
        </Button>
      </div>
    </main>
  );
}
