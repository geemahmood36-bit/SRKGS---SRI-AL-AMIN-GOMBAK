# Task 2 — API Route Handlers (SRKGS)

## Ringkasan
Tugas: mencipta semua pengendali laluan API App Router Next.js 16 untuk Sistem Rekod Kehadiran Guru dan Staf (SRKGS) SRI Al-Amin Gombak.

## Status: SELESAIA

### Fail dicipta (47 laluan + laluan tambahan untuk sub-resource)

#### Auth (3)
- `src/app/api/auth/login/route.ts` — POST login
- `src/app/api/auth/logout/route.ts` — POST logout
- `src/app/api/auth/me/route.ts` — GET sesi semasa

#### Dashboard (1)
- `src/app/api/dashboard/route.ts` — GET role-aware summary

#### Staf (6)
- `src/app/api/staf/route.ts` — GET (senarai), POST (cipta)
- `src/app/api/staf/[id]/route.ts` — GET, PUT
- `src/app/api/staf/[id]/aktif/route.ts` — PATCH toggle aktif
- `src/app/api/staf/[id]/reset-laluan/route.ts` — POST reset laluan
- `src/app/api/staf/import/route.ts` — POST (501 placeholder)

#### Jabatan (2)
- `src/app/api/jabatan/route.ts` — GET, POST
- `src/app/api/jabatan/[id]/route.ts` — PUT

#### Kehadiran (8)
- `src/app/api/kehadiran/route.ts` — GET
- `src/app/api/kehadiran/saya/route.ts` — GET
- `src/app/api/kehadiran/daftar-masuk/route.ts` — POST
- `src/app/api/kehadiran/daftar-keluar/route.ts` — POST
- `src/app/api/kehadiran/kiosk/route.ts` — POST
- `src/app/api/kehadiran/pinda/route.ts` — POST (Admin)
- `src/app/api/kehadiran/tutup-hari/route.ts` — POST (Admin)
- `src/app/api/kehadiran/kalendar-saya/route.ts` — GET

#### Cuti (4)
- `src/app/api/cuti/route.ts` — GET, POST
- `src/app/api/cuti/[id]/batal/route.ts` — PATCH
- `src/app/api/cuti/[id]/keputusan/route.ts` — POST
- `src/app/api/cuti/baki/route.ts` — GET

#### Kebenaran Keluar (2)
- `src/app/api/kebenaran-keluar/route.ts` — GET, POST
- `src/app/api/kebenaran-keluar/[id]/keputusan/route.ts` — POST

#### Laporan (4)
- `src/app/api/laporan/harian/route.ts`
- `src/app/api/laporan/bulanan/route.ts`
- `src/app/api/laporan/individu/route.ts`
- `src/app/api/laporan/cuti/route.ts`

#### Tetapan (1)
- `src/app/api/tetapan/route.ts` — GET, PUT

#### Kalendar (2)
- `src/app/api/kalendar/route.ts` — GET, POST
- `src/app/api/kalendar/[id]/route.ts` — DELETE

#### Jenis Cuti (2)
- `src/app/api/jenis-cuti/route.ts` — GET, POST
- `src/app/api/jenis-cuti/[id]/route.ts` — PUT

#### Notifikasi (3)
- `src/app/api/notifikasi/route.ts` — GET
- `src/app/api/notifikasi/[id]/baca/route.ts` — PATCH
- `src/app/api/notifikasi/baca-semua/route.ts` — POST

#### Audit (1)
- `src/app/api/audit/route.ts` — GET (Admin/Pengetua)

#### Data Demo (1)
- `src/app/api/data/reset/route.ts` — POST (Admin) — exec `bun run scripts/seed.ts`

## Pengesahan
- `bun run lint` lulus (EXIT=0, tiada ralat).
- Ujian asal melalui curl:
  - `POST /api/auth/login` dengan `A001` / `Demo@1234` → 200, pulang staf.
  - `GET /api/auth/me` → 200.
  - `GET /api/dashboard` → 200 dengan ringkasan lengkap (11 staf, 10 hadir, peratus 91).
  - `GET /api/staf` → 200 senarai dengan no K/P disamarkan.
  - `GET /api/jabatan` → 200 dengan bil staf.
  - `GET /api/jenis-cuti`, `/api/tetapan`, `/api/audit` → 200.
  - Laluan tanpa sesi → 401.

## Nota reka bentuk
- Setiap laluan: `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
- Sesi disahkan melalui `getSesiSemasa()`; 401 jika tiada sesi, 403 jika peranan tidak dibenar.
- Tarikh dibina sebagai `new Date(y, m-1, d)` (tengah malam tempatan) dari string `YYYY-MM-DD`.
- `isoTarikh(d)` digunakan untuk menukar `Date` → `YYYY-MM-DD` dalam respons.
- `kataLaluanHash` tidak pernah dipulangkan dalam respons; `noKpSamar` disamarkan melalui `samarkanKp`.
- Audit trail (tulisAudit) dan notifikasi (hantarNotifikasi) digunakan pada semua mutasi penting.
- IDs dijana dengan timestamp + random base36 untuk mengelakkan perlanggaran.

## Lokasi
Semua fail di bawah `/home/z/my-project/src/app/api/`.
