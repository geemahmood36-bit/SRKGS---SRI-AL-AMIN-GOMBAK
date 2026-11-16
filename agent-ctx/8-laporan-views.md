# Task 8 — Laporan Views (FR-E01..E05)

## Status: SELESAI

## Fail dicipta
- `src/views/laporan/LaporanView.tsx` — satu-satunya fail laporan dengan 4 tab.

## Ciri utama
- Komponen `LaporanView` ("use client") eksport named + default.
- Menggunakan shadcn `Tabs` dengan 4 trigger: Harian, Bulanan, Individu, Cuti.
- Penapis bersama: jabatan (dari `/api/jabatan`, prepend "Semua Jabatan"), kategori (Semua / Guru / StafSokongan / Pentadbiran), ditambah input tarikh spesifik per tab.
- Staf list dimuat sekali dari `/api/staf?aktif=true` (buang Kiosk) untuk:
  - membina set stafId per kategori (tapisan sisi klien, kerana API laporan tidak menyokong kategori),
  - mengisi dropdown carian staf pada tab Individu.

### Tab Harian (FR-E01)
- Fetch `/api/laporan/harian?tarikh=YYYY-MM-DD&jabatanId=X`.
- Tajuk sekolah cetakan (`print:block`) menggunakan `tetapan.sekolahNama` / `sekolahAlamat`.
- Jadual: Staf (nama + noIdStaf), Jawatan, Jabatan, Masa Masuk, Masa Keluar, Jam Bekerja, Status (skeuo-pill dengan dot warna `WARNA_STATUS`).
- Butang "Eksport CSV" (`eksportCSV`).
- Penunjung cuti umum / hujung minggu sebagai pill.

### Tab Bulanan (FR-E02)
- Fetch `/api/laporan/bulanan?tahun=Y&bulan=M&jabatanId=X`.
- Matriks grid: lajur = tarikh setiap hari bulan (nombor hari), sel = kod 1 hurup (H/L/T/C/R/U) atau `—` (hujung minggu) / `·` (belum hadir), dengan warna latar `KOD_SEL`.
- Sticky kolum pertama (nama staf) untuk tatal mendatar.
- Kad ringkasan: peratusHadir, jumlahLewat, purataJamBekerja (formatJamBekerja).
- Senarai "10 Teratas Lewat" dari `summary.teratasLewat` (asal 5, paparan grid 2 kolum).
- Petunjung kod warna di bawah matriks.
- Eksport CSV matriks + baris ringkasan keseluruhan.

### Tab Individu (FR-E03)
- Dropdown carian staf (Popover + Command dari shadcn) dengan input carian.
- Input tarikhMula + tarikhAkhir.
- Fetch `/api/laporan/individu?stafId=X&tarikhMula=Y&tarikhAkhir=Z`.
- Kad info staf (nama, noIdStaf, jawatan, jabatan).
- 5 kad ringkasan: hadir, lewat, cuti, tidakHadir, purataJamBekerja.
- Jadual rekod tarikh/masa/jam/status/sebab lewat.
- Eksport CSV rekod individu.

### Tab Cuti (FR-E05)
- Fetch `/api/laporan/cuti?tahun=Y&jabatanId=X`.
- Senarai jenis cuti dibina dari data (unik) untuk lajur dinamik.
- Jadual per staf: Nama + jabatan, lajur per jenis cuti menunjukkan `digunakan / layak (baki)` dengan baki kritikal (≤0) ditanda merah.
- Sticky kolum pertama.
- Eksport CSV lajur digunakan & baki.

## Cetak
- Butang "Cetak" (Printer icon) di header panel (`cetakHalaman()`).
- `print:hidden` pada tabs list, penapis, dan butang tidak penting.
- Tajuk sekolah tercetak (`hidden print:block`) pada tab Harian, Bulanan, Cuti.

## Styling
- Latar belakang `bg-wood` (dari AppShell pembungkus).
- `skeuo-panel`, `skeuo-card`, `skeuo-card-inset`, `skeuo-input`, `skeuo-btn-secondary`, `skeuo-pill`.
- Skeleton `animate-pulse` semasa memuat.
- `custom-scroll` + `max-h-* overflow-y-auto` untuk jadual panjang & matriks.
- Keadaan kosong mesra BM.

## Nota teknikal
- API `bulanan` sebenar mengembalikan `summary` (bukan `ringkasan`); kod membaca `data.summary`.
- API `cuti` mengembalikan `bakiCuti[].jenisCuti` sebagai string (nama); helper `namaJenisCuti` mengendali kedua-dua format string & `{nama}`.
- API `harian` mengembalikan `staf.jabatan` sebagai string; terus dipaparkan.
- Status ringkas dari API ("Hadir"/"Lewat"/"TidakHadir"/"Cuti"/"TugasRasmi"/"Cuti Umum"/"Hujung Minggu"/"Belum Hadir") dipetakan ke kelas warna `WARNA_STATUS`.
- Helpers digunakan: `formatTarikhBM`, `formatMasa`, `formatJamBekerja`, `WARNA_STATUS`, `NAMA_BULAN_PENUH`, `isoTarikh`.
- `apiFetch`, `eksportCSV`, `cetakHalaman` dari `@/lib/api-client`.
- Semua teks Bahasa Malaysia.

## Lint
- `bun run lint` lulus (EXIT=0) — tiada amaran / ralat.

## Lokasi
`/home/z/my-project/src/views/laporan/LaporanView.tsx`
