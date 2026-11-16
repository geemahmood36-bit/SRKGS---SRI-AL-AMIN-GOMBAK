# SRKGS — Sistem Rekod Kehadiran Guru & Staf

### Sekolah Rendah Islam Al-Amin Gombak, Selangor, Malaysia

Sistem digital untuk merekod kehadiran guru dan staf sokongan secara tepat, telus dan mudah dilaporkan. Dibangunkan sebagai **prototaip Fasa 1** mengikut Dokumen Keperluan Produk (PRD) v1.0.

> **⚠ Mod Demo** — Semua data adalah rekaan untuk prototaip. Bukan data sebenar.

---

## Ciri-ciri Utama

- **Pengesahan & RBAC** — Log masuk dengan No. ID Staf + kata laluan; kawalan akses berasaskan 5 peranan (Admin, Pengetua, Penyelia, Guru/Staf, Kiosk).
- **Rekod Kehadiran** — Daftar masuk/keluar satu klik, mod kiosk dengan PIN, pengiraan status Hadir/Lewat automatik, pindaan manual dengan jejak audit, Tutup Hari.
- **Cuti & Kebenaran Keluar** — Permohonan cuti berbilang jenis, aliran kelulusan (tahap tunggal/dua peringkat), kira hari berkesan, auto-tolak baki, auto-mark kehadiran sebagai Cuti.
- **Dashboard** — Paparan ringkasan hari ini, senarai belum hadir/lewat, carta trend 7 hari, carta pai status; paparan berbeza mengikut peranan.
- **Laporan** — Harian, Bulanan (matriks staf × tarikh), Individu, Cuti; penapis jabatan/kategori/status; eksport CSV + cetak.
- **Data Induk** — CRUD staf & jabatan, kalendar cuti umum/sekolah, jenis cuti, tetapan waktu kerja (Isnin–Jumaat, Jumaat khas, mod Ramadan).
- **Audit & Notifikasi** — Log audit tidak boleh diubah; notifikasi dalam aplikasi untuk permohonan/keputusan cuti.
- **Set Semula Data Demo** — Butang pentadbir dengan pengesahan dua langkah.

## Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Rangka kerja | Next.js 16 (App Router) |
| Bahasa | TypeScript 5 |
| Gaya | Tailwind CSS 4 + shadcn/ui (New York) |
| Pangkalan data | Prisma ORM + SQLite (dummy) |
| Carta | Recharts |
| Ikon | Lucide React |
| Notifikasi | Sonner |
| Penjanaan kod | z.ai (model GLM 5.2) |

## Reka Bentuk UI

Skeuomorfik profesional dengan tema hijau Islamik:
- Latar kayu bertekstur (`bg-wood`)
- Kad embossed/depressed (`skeuo-card`, `skeuo-card-inset`)
- Butang 3D tekan (`skeuo-btn`, `skeuo-btn-kiosk`)
- Paparan LCD untuk jam (`lcd-display`)
- Plat logam untuk pengepala (`metal-plate`)
- LED penunjuk status (`led`)
- Sepanduk Mod Demo sentiasa kelihatan

## Pemasangan & Pelancaran

```bash
# 1. Pasang kebergantungan
bun install

# 2. Sediakan pangkalan data (skema + benih data)
bun run db:push
bun run seed

# 3. Jalankan pelayan pembangunan
bun run dev
```

Buka `http://localhost:3000` dalam pelayar.

## Akaun Demo

Kata laluan lalai untuk semua akaun: **`Demo@1234`** (PIN kiosk: `1234`)

| Peranan | No. ID Staf | Penerangan |
|---------|-------------|------------|
| Pengetua | `G001` | Ahmad Faiz bin Roslan — akses penuh laporan + kelulusan cuti |
| Penyelia | `G002` | Norhayati binti Ismail — Penolong Kanan Pentadbiran |
| Guru / Staf | `G004` | Siti Aisyah binti Rahim — Guru Bahasa Melayu |
| Pentadbir | `A001` | Rosnani binti Yusof — Admin sistem (akses semua modul) |
| Kiosk | `S012` | Ridzuan bin Samad — mod kiosk daftar masuk/keluar |

## Struktur Projek

```
├─ prisma/
│  ├─ schema.prisma          # 13 model pangkalan data
│  └─ (custom.db)            # SQLite DB (dijana oleh db:push + seed)
├─ scripts/
│  └─ seed.ts                # Benih data: 12 staf, 75 hari kehadiran, cuti, kalendar
├─ src/
│  ├─ app/
│  │  ├─ api/                # 47 route handler (auth, kehadiran, cuti, laporan, dll.)
│  │  ├─ globals.css         # Sistem reka bentuk skeuomorfik
│  │  ├─ layout.tsx
│  │  └─ page.tsx            # Pintu masuk utama (SPA)
│  ├─ components/ui/         # Komponen shadcn/ui
│  ├─ lib/
│  │  ├─ api-client.ts       # Klien fetch + eksport CSV + cetak
│  │  ├─ auth-context.tsx    # Konteks sesi sisi klien
│  │  ├─ db.ts               # Prisma Client
│  │  ├─ domain.ts           # Logik domain tulen (kiraStatus, bakiCuti, format BM)
│  │  ├─ server.ts           # Utiliti pelayan (sesi, audit, notifikasi)
│  │  └─ types.ts            # Kontrak TypeScript (serasi API sebenar)
│  └─ views/                 # 13 paparan (auth, dashboard, kehadiran, cuti, laporan, dll.)
└─ tailwind.config.ts
```

## Peraturan Perniagaan (Lalai)

| Kod | Peraturan | Nilai |
|-----|-----------|-------|
| BR-01 | Hari bekerja | Isnin–Jumaat |
| BR-02 | Waktu masuk | 07:30 pagi |
| BR-03 | Tempoh bertolak ansur | 15 minit (lewat selepas 07:45) |
| BR-04 | Waktu tamat | Isnin–Khamis 15:30; Jumaat 12:30 |
| BR-05 | Cut-off Tidak Hadir | Tiada rekod hingga Tutup Hari |
| BR-08 | Cuti separuh hari | Dikira 0.5 hari |
| BR-10 | Pindaan rekod | Alasan wajib; jejak audit |

Semua boleh dikonfigurasi melalui halaman **Tetapan**.

## Pematuhan

- **NFR-01**: Semua antara muka dalam Bahasa Malaysia; format tarikh HH/BB/TTTT; masa 24 jam; zon waktu Asia/Kuala_Lumpur.
- **NFR-03**: Responsif 360px – 1920px (mobile-first).
- **NFR-05**: WCAG 2.1 AA (kontras, ARIA, navigasi papan kekunci).
- **NFR-08**: Akta Perlindungan Data Peribadi 2010 (Akta 709) — No. K/P disamarkan, akses mengikut peranan, tiada data sebenar.

## Hala Tuju Selepas Prototaip

- **Produksi 1**: Backend NestJS/Supabase + PostgreSQL + pengesahan selamat + HTTPS
- **Produksi 2**: Kod QR dinamik + geofence + pengesahan peranti
- **Produksi 3**: Notifikasi emel/WhatsApp + laporan berjadual + PWA
- **Lanjutan**: Integrasi sistem gaji/HR + kehadiran murid + guru ganti (relief)

## Lesen

Prototaip dalaman untuk penilaian pengurusan Sekolah Rendah Islam Al-Amin Gombak. Tidak untuk pengedaran awam.

---

**Disediakan oleh**: Pentadbir Sekolah / Jurutera Perisian  
**Tarikh**: 16 November 2026  
**Versi**: 1.0 (Draf Untuk Semakan)  
**Klasifikasi**: Dalaman – Pentadbiran Sekolah
