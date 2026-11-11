# Dibangun dari akar repositori: docker build -f deploy/Dockerfile .
# Sengaja tidak di akar supaya Railway tetap memakai builder Railpack.
# Image produksi SSCI: satu layanan Node yang menyajikan API dan halaman web.
# Tahap 1 membangun client (Vite) dan server (esbuild); tahap 2 hanya membawa hasilnya.

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
# Variabel VITE_ ikut tertanam di halaman saat build, bukan saat server dijalankan.
ARG VITE_DEMO_MODE=false
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE
RUN pnpm build

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080 \
    UPLOAD_DIR=/data/uploads
WORKDIR /app
# node_modules dibawa utuh: server dibundel dengan paket eksternal, dan drizzle-kit dipakai untuk migrasi.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json /app/drizzle.config.ts ./
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/templates ./templates
COPY --from=build /app/knowledge_base ./knowledge_base
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
