# Task 6b — Kehadiran Views (FR-B07, FR-B08, FR-B09)

## Status: SELESAI

## Fail dicipta
- `src/views/kehadiran/KehadiranSayaView.tsx` — Kehadiran Saya (FR-B09) untuk Guru/Staf/Pengetua/Admin.
- `src/views/kehadiran/UrusKehadiranView.tsx` — Pengurusan Kehadiran (FR-B07, FR-B08) untuk Admin sahaja.

## Ciri utama — KehadiranSayaView
- Header pilih bulan/tahun (butang sebelum/hari ini/seterus).
- Ringkasan bulanan 6 status dengan dot warna (`WARNA_STATUS`).
- Kalendar grid mingguan (Ahad-Sabtu) dengan sel warna status, label pendek dalam sel, hari ini ditanda dengan border `ring-emerald-600`.
- Petunjung warna di bawah kalendar.
- Jadual rekod bulanan: Tarikh (dd/mm/yyyy), Hari (BM), Masa Masuk, Masa Keluar, Jam Bekerja (`formatJamBekerja`), Status (skeuo-pill), Sebab Lewat.
- Fetch `/api/kehadiran/kalendar-saya?bulan=X&tahun=Y` dan `/api/kehadiran/saya?bulan=X&tahun=Y`.
- Skeleton loading + keadaan kosong mesra BM.

## Ciri utama — UrusKehadiranView
- Date picker `<input type="date">` (skeuo-input), lalai hari ini (`isoTarikh(new Date())`).
- Penapis jabatan dari `/api/jabatan`.
- Kotak carian staf (nama / noIdStaf / jawatan).
- Ringkasan 7 status (termasuk "Belum Rekod").
- Jadual staf aktif (dari `/api/staf?aktif=true`, ditapis peranan Kiosk) dipasangkan dengan rekod kehadiran tarikh tersebut (dari `/api/kehadiran?tarikhMula=X&tarikhAkhir=X`).
- Lajur: Staf (nama + noIdStaf + jawatan), Jabatan, Masa Masuk, Masa Keluar, Status (skeuo-pill), Sumber, Tindakan (Pinda).
- Modal Pinda (shadcn Dialog): Staf & tarikh baca-sahaja; Status (Select); Masa Masuk/Keluar (input time, pilihan); Sebab Lewat; Catatan; Alasan Pindaan (wajib, FR-B07). POST `/api/kehadiran/pinda` dengan `{ stafId, tarikh, masaMasuk, masaKeluar, status, sebabLewat, catatan, alasan }`.
- Butang "Tutup Hari" (skeuo-btn-danger) membuka modal pengesahan menunjukkan tarikh. Confirm POST `/api/kehadiran/tutup-hari` `{ tarikh }`. Toast menunjukkan `ditandakan` / `dilangkau`.
- Refresh data selepas pinda / tutup hari.
- Kawalan akses: papar halaman kunci jika peranan bukan Admin (selepas semua hook React dipanggil untuk patuh `rules-of-hooks`).
- Skeleton loading + keadaan kosong mesra BM.

## Nota teknikal
- Masa `masaMasuk`/`masaKeluar` ditukar dari ISO string ke "HH:MM" melalui helper `masaDariISO`.
- Tarikh dihantar sebagai `YYYY-MM-DD` (keperluan API).
- Menggunakan `useCallback` untuk `muatData` agar `useEffect` bersih.
- `bun run lint` lulus (EXIT=0).

## Lokasi
`/home/z/my-project/src/views/kehadiran/`
