import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Aplikasi hanya memakai tema terang (lihat catatan di index.css), sehingga
 * toast tidak mengikuti tema OS agar tidak tampil gelap di atas UI terang.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      // Di bawah tengah: tombol aksi halaman ada di kanan (bawah dan atas), jadi posisi ini tidak menutupinya.
      position="bottom-center"
      // Di ponsel, naik sedikit agar tidak menutupi bilah tombol Kembali/Lanjutkan yang menempel di bawah.
      mobileOffset={{ bottom: 88 }}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
