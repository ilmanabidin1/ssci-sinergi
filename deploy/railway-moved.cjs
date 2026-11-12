// Pengganti aplikasi SSCI di Railway setelah pindah ke server Indonesia.
// - Semua halaman dialihkan ke alamat baru, jadi tidak ada data baru yang masuk ke Railway.
// - /uploads/<nama> tetap dilayani dari volume, untuk penyalinan berkas terakhir.
// - /api/health menjawab 200 agar pemeriksaan kesehatan Railway lolos.
// Alamat tujuan bisa diubah lewat variabel SSCI_NEW_URL di Railway.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const target = (process.env.SSCI_NEW_URL || "https://ssci-sinergi.id").replace(/\/$/, "");
const uploadDir = process.env.UPLOAD_DIR || "/data/uploads";
const port = Number(process.env.PORT) || 8080;

http
  .createServer((req, res) => {
    const pathname = (req.url || "/").split("?")[0];
    if (pathname === "/api/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"ok":true,"moved":true}');
      return;
    }
    if (pathname.startsWith("/uploads/")) {
      const name = path.basename(decodeURIComponent(pathname));
      const stream = fs.createReadStream(path.join(uploadDir, name));
      stream.on("error", () => {
        res.writeHead(404);
        res.end();
      });
      stream.on("open", () => res.writeHead(200));
      stream.pipe(res);
      return;
    }
    res.writeHead(302, { location: target + (req.url || "/") });
    res.end();
  })
  .listen(port, () => console.log(`SSCI sudah pindah. Mengalihkan ke ${target}`));
