# Task 9a — Staf & Kalendar Views (FR-F01, FR-F02, FR-F03)

## Status: SELESAI

## Fail dicipta
- `src/views/staf/StafView.tsx` — Pengurusan Staf (CRUD) & Jabatan/Panitia (CRUD). Admin sahaja.
- `src/views/kalendar/KalendarView.tsx` — Kalendar Cuti (admin boleh tambah/padam; semua peranan boleh lihat).

## Fail diubah suai (backend)
- `src/app/api/staf/route.ts` — ditambah pengendali `POST` untuk cipta staf baharu
  (medan wajib: noIdStaf, nama, noKpSamar, jawatan; kata laluan lalai `Demo@1234`;
  turut inisialisasi `BakiCuti` untuk tahun semasa bagi setiap `JenisCuti` sedia ada).

## Ciri-ciri StafView
- `Tabs` shadcn dengan dua trigger: **Staf** dan **Jabatan/Panitia**.
- Tab Staf:
  - Kotak carian (nama / noIdStaf / jawatan) + 4 penapis `Select`: jabatan, kategori,
    peranan, status. Semua nilai "Semua" dihantar sebagai tiada parameter.
  - Fetch `GET /api/staf?cari=&jabatanId=&kategori=&peranan=&aktif=` mengikut penapis.
  - Jadual: No. ID, Nama (dengan penanda `perluTukarLaluan`), No. K/P (disamarkan
    dengan `samarkanKp`), Jawatan, Jabatan, Kategori, Peranan (`LABEL_PERANAN`),
    Status (skeuo-pill Aktif/Nyahaktif), Tindakan (Ubah / Nyahaktif|Aktifkan / Reset Laluan).
  - Butang "Tambah Staf" membuka `Dialog` dengan borang penuh:
    noIdStaf, nama, noKpSamar, jantina (RadioGroup L/P), jawatan, kategori (Select),
    jabatanId (Select), emel, telefon, tarikhLantik (date), peranan (Select),
    kataLaluan (lalai `Demo@1234`). POST `/api/staf`.
  - "Ubah" membuka `Dialog` sama praisi. PUT `/api/staf/[id]`.
  - Nyahaktif/Aktifkan: PATCH `/api/staf/[id]/aktif` dengan `{ aktif: bool }`,
    disahkan melalui `AlertDialog`.
  - Reset Laluan: POST `/api/staf/[id]/reset-laluan`, disahkan melalui `AlertDialog`.
- Tab Jabatan:
  - Jadual: Kod, Nama, Bilangan Staf.
  - "Tambah Jabatan" `Dialog`: nama, kod (auto-uppercase). POST `/api/jabatan`.
  - "Ubah" — PUT `/api/jabatan/[id]`.
- Skeleton `animate-pulse` semasa memuat; keadaan kosong mesra BM dengan ikon.
- Akses: paparan halaman ditolak untuk bukan-Admin (kad `Lock`).
- Eksport `StafView` named + default.

## Ciri-ciri KalendarView
- Pemilih tahun `Select` (2025/2026/2027).
- Fetch `GET /api/kalendar?tahun=Y` — senarai entri disusun mengikut tarikh (sisi API).
- Jadual: Tarikh (`formatTarikhBM`), Hari (`namaHariBM`), Nama, Jenis
  (skeuo-pill warna: CutiUmum=sky/biru, CutiSekolah=amber/orena, HariKhas=violet/ungu).
- Visualisasi **kalendar tahunan** — grid 12 bulan (responsive 1/2/3/4 lajur),
  setiap hari sebagai sel kecil dengan titik warna jenis cuti; tooltip penuh pada hover.
- "Tambah Cuti" (Admin sahaja) `Dialog`: tarikh (date), nama, jenis (Select).
  POST `/api/kalendar`.
- Butang "Padam" per baris (Admin sahaja) — DELETE `/api/kalendar/[id]` dengan
  pengesahan `AlertDialog`.
- Skeleton semasa memuat; keadaan kosong mesra BM.
- Eksport `KalendarView` named + default.

## Styling & utiliti
- `skeuo-panel`, `skeuo-card`, `skeuo-card-inset`, `skeuo-input`, `skeuo-btn`,
  `skeuo-pill` (semua dari `globals.css`).
- `custom-scroll` + `max-h-* overflow-y-auto` untuk jadual panjang.
- `useAuth` dari `@/lib/auth-context`; `apiFetch` dari `@/lib/api-client`.
- Helpers domain: `samarkanKp`, `LABEL_PERANAN`, `formatTarikhBM`, `namaHariBM`,
  `NAMA_HARI`, `NAMA_BULAN_SINGKAT`.
- Semua teks dalam Bahasa Malaysia.

## Lint
- `bun run lint` lulus (EXIT=0) — tiada amaran/ralat selepas pembetulan
  `interface StafRespons extends Staf {}` -> `type StafRespons = Staf`
  (peraturan `@typescript-eslint/no-empty-object-type`).

## Lokasi
- `/home/z/my-project/src/views/staf/StafView.tsx`
- `/home/z/my-project/src/views/kalendar/KalendarView.tsx`
- `/home/z/my-project/src/app/api/staf/route.ts` (POST baharu)
