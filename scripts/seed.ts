// Skrip benih (seed) — muatkan data dummy realistik ke pangkalan data SQLite.
// Mengikut PRD §11.6: 12 staf rekaan, ±60 hari kerja rekod kehadiran, cuti, kalendar.
// Jalankan: bun run scripts/seed.ts

import { db } from "../src/lib/db";
import { hashLaluanDummy, isoTarikh, kiraStatusDaftarMasuk, parseHariBekerja } from "../src/lib/domain";

const LALUAN_DEMO = "Demo@1234";
const PIN_DEMO = "1234";

// Buat Date pada tengah malam waktu tempatan dari string YYYY-MM-DD
function tarikhLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

async function main() {
  console.log("🔄 Memulakan benih data SRKGS...");

  // 0. Bersihkan semua jadual mengikut urutan kebergantungan
  console.log("→ Membersihkan pangkalan data...");
  await db.logAudit.deleteMany();
  await db.notifikasi.deleteMany();
  await db.kebenaranKeluar.deleteMany();
  await db.permohonanCuti.deleteMany();
  await db.bakiCuti.deleteMany();
  await db.kehadiran.deleteMany();
  await db.sesi.deleteMany();
  await db.kalendar.deleteMany();
  await db.staf.deleteMany();
  await db.jenisCuti.deleteMany();
  await db.jabatan.deleteMany();
  await db.tetapan.deleteMany();

  // 1. Tetapan
  console.log("→ Tetapan");
  await db.tetapan.create({
    data: {
      id: 1,
      waktuMasuk: "07:30",
      bertolakAnsurMinit: 15,
      waktuTamat: "15:30",
      waktuTamatJumaat: "12:30",
      hariBekerja: "1,2,3,4,5",
      ramadanAktif: false,
      ramadanMasukWaktu: "08:00",
      ramadanTamatWaktu: "13:00",
      aliranDuaPeringkat: false,
      sekolahNama: "Sekolah Rendah Islam Al-Amin Gombak",
      sekolahAlamat: "Gombak, Selangor Darul Ehsan, Malaysia",
    },
  });

  // 2. Jabatan
  console.log("→ Jabatan / Panitia");
  const jabatanList = [
    { id: "J1", nama: "Pentadbiran", kod: "PENT", ketuaId: "S001" },
    { id: "J2", nama: "Bahasa Melayu", kod: "BM", ketuaId: "S004" },
    { id: "J3", nama: "Pendidikan Islam & Tahfiz", kod: "PI", ketuaId: "S005" },
    { id: "J4", nama: "Matematik", kod: "MT", ketuaId: "S006" },
    { id: "J5", nama: "Bahasa Inggeris", kod: "BI", ketuaId: "S007" },
    { id: "J6", nama: "Sains", kod: "SN", ketuaId: "S008" },
    { id: "J7", nama: "Sokongan", kod: "SOK", ketuaId: "S010" },
  ];
  for (const j of jabatanList) {
    await db.jabatan.create({ data: j });
  }

  // 3. Jenis Cuti
  console.log("→ Jenis Cuti");
  const jenisCutiList = [
    { id: "JC1", nama: "Cuti Rehat", kelayakanTahunan: 14, perluLampiran: false },
    { id: "JC2", nama: "Cuti Sakit", kelayakanTahunan: 10, perluLampiran: true },
    { id: "JC3", nama: "Cuti Kecemasan", kelayakanTahunan: 5, perluLampiran: false },
    { id: "JC4", nama: "Cuti Bersalin / Paterniti", kelayakanTahunan: 60, perluLampiran: true },
    { id: "JC5", nama: "Tugas Rasmi / Kursus", kelayakanTahunan: 30, perluLampiran: false },
    { id: "JC6", nama: "Lain-lain", kelayakanTahunan: 3, perluLampiran: false },
  ];
  for (const jc of jenisCutiList) {
    await db.jenisCuti.create({ data: jc });
  }

  // 4. Staf (12 orang seperti PRD §11.6)
  console.log("→ Staf (12 orang)");
  const stafList = [
    { id: "S001", noIdStaf: "G001", nama: "Ahmad Faiz bin Roslan", noKpSamar: "780101-14-5521", jantina: "L", jawatan: "Pengetua", kategori: "Pentadbiran", jabatanId: "J1", emel: "faiz@alamin.edu.my", telefon: "012-3456781", peranan: "Pengetua", tarikhLantik: "2018-01-15" },
    { id: "S002", noIdStaf: "G002", nama: "Norhayati binti Ismail", noKpSamar: "800505-08-4422", jantina: "P", jawatan: "Penolong Kanan Pentadbiran", kategori: "Pentadbiran", jabatanId: "J1", emel: "norhayati@alamin.edu.my", telefon: "012-3456782", peranan: "Penyelia", tarikhLantik: "2019-03-01" },
    { id: "S003", noIdStaf: "G003", nama: "Muhammad Hafiz bin Zainal", noKpSamar: "820707-14-3323", jantina: "L", jawatan: "Penolong Kanan HEM", kategori: "Pentadbiran", jabatanId: "J1", emel: "hafiz@alamin.edu.my", telefon: "012-3456783", peranan: "Penyelia", tarikhLantik: "2020-06-10" },
    { id: "S004", noIdStaf: "G004", nama: "Siti Aisyah binti Rahim", noKpSamar: "850101-04-2244", jantina: "P", jawatan: "Guru Bahasa Melayu", kategori: "Guru", jabatanId: "J2", emel: "aisyah@alamin.edu.my", telefon: "012-3456784", peranan: "Guru", tarikhLantik: "2021-01-05" },
    { id: "S005", noIdStaf: "G005", nama: "Nurul Huda binti Karim", noKpSamar: "870303-08-1155", jantina: "P", jawatan: "Guru Pendidikan Islam & Tahfiz", kategori: "Guru", jabatanId: "J3", emel: "nurul@alamin.edu.my", telefon: "012-3456785", peranan: "Guru", tarikhLantik: "2021-03-12" },
    { id: "S006", noIdStaf: "G006", nama: "Mohd Azlan bin Abdullah", noKpSamar: "860812-14-6666", jantina: "L", jawatan: "Guru Matematik", kategori: "Guru", jabatanId: "J4", emel: "azlan@alamin.edu.my", telefon: "012-3456786", peranan: "Guru", tarikhLantik: "2022-01-10" },
    { id: "S007", noIdStaf: "G007", nama: "Farah Nabila binti Hashim", noKpSamar: "881021-04-7777", jantina: "P", jawatan: "Guru Bahasa Inggeris", kategori: "Guru", jabatanId: "J5", emel: "farah@alamin.edu.my", telefon: "012-3456787", peranan: "Guru", tarikhLantik: "2022-04-18" },
    { id: "S008", noIdStaf: "G008", nama: "Zulkifli bin Mahmud", noKpSamar: "840404-14-8888", jantina: "L", jawatan: "Guru Sains", kategori: "Guru", jabatanId: "J6", emel: "zulkifli@alamin.edu.my", telefon: "012-3456788", peranan: "Guru", tarikhLantik: "2023-01-09" },
    { id: "S009", noIdStaf: "A001", nama: "Rosnani binti Yusof", noKpSamar: "870515-08-9999", jantina: "P", jawatan: "Pembantu Tadbir (Admin Sistem)", kategori: "Pentadbiran", jabatanId: "J1", emel: "rosnani@alamin.edu.my", telefon: "012-3456789", peranan: "Admin", tarikhLantik: "2020-02-01" },
    { id: "S010", noIdStaf: "S010", nama: "Kamarul Zaman bin Osman", noKpSamar: "900303-14-1234", jantina: "L", jawatan: "Pembantu Operasi", kategori: "StafSokongan", jabatanId: "J7", emel: "kamarul@alamin.edu.my", telefon: "012-3456790", peranan: "Guru", tarikhLantik: "2021-08-15" },
    { id: "S011", noIdStaf: "S011", nama: "Salmah binti Daud", noKpSamar: "920718-08-2345", jantina: "P", jawatan: "Pembantu Pengurusan Murid", kategori: "StafSokongan", jabatanId: "J7", emel: "salmah@alamin.edu.my", telefon: "012-3456791", peranan: "Guru", tarikhLantik: "2022-09-01" },
    { id: "S012", noIdStaf: "S012", nama: "Ridzuan bin Samad", noKpSamar: "950101-14-3456", jantina: "L", jawatan: "Pengawal Keselamatan", kategori: "StafSokongan", jabatanId: "J7", emel: "ridzuan@alamin.edu.my", telefon: "012-3456792", peranan: "Kiosk", tarikhLantik: "2023-02-01" },
  ];

  const hashLaluan = hashLaluanDummy(LALUAN_DEMO);
  for (const s of stafList) {
    await db.staf.create({
      data: {
        ...s,
        tarikhLantik: s.tarikhLantik ? new Date(s.tarikhLantik) : null,
        kataLaluanHash: hashLaluan,
        pin: PIN_DEMO,
        aktif: true,
        perluTukarLaluan: false,
      },
    });
  }

  // 5. Kalendar cuti (contoh: cuti umum Malaysia 2026)
  console.log("→ Kalendar cuti");
  const kalendarList = [
    { id: "KAL001", tarikh: "2026-01-01", nama: "Tahun Baru 2026", jenis: "CutiUmum" },
    { id: "KAL002", tarikh: "2026-02-01", nama: "Hari Wilayah Persekutuan", jenis: "CutiUmum" },
    { id: "KAL003", tarikh: "2026-02-19", nama: "Tahun Baru Cina", jenis: "CutiUmum" },
    { id: "KAL004", tarikh: "2026-05-01", nama: "Hari Pekerja", jenis: "CutiUmum" },
    { id: "KAL005", tarikh: "2026-05-22", nama: "Hari Wesak", jenis: "CutiUmum" },
    { id: "KAL006", tarikh: "2026-06-02", nama: "Hari Keputeraan YDPA", jenis: "CutiUmum" },
    { id: "KAL007", tarikh: "2026-08-31", nama: "Hari Kebangsaan", jenis: "CutiUmum" },
    { id: "KAL008", tarikh: "2026-09-16", nama: "Hari Malaysia", jenis: "CutiUmum" },
    { id: "KAL009", tarikh: "2026-12-25", nama: "Hari Krismas", jenis: "CutiUmum" },
    // Cuti sekolah (penggal)
    { id: "KAL010", tarikh: "2026-06-05", nama: "Cuti Penggal Pertengahan Tahun", jenis: "CutiSekolah" },
    { id: "KAL011", tarikh: "2026-06-06", nama: "Cuti Penggal Pertengahan Tahun", jenis: "CutiSekolah" },
    { id: "KAL012", tarikh: "2026-06-07", nama: "Cuti Penggal Pertengahan Tahun", jenis: "CutiSekolah" },
    { id: "KAL013", tarikh: "2026-12-19", nama: "Cuti Akhir Tahun", jenis: "CutiSekolah" },
    { id: "KAL014", tarikh: "2026-12-20", nama: "Cuti Akhir Tahun", jenis: "CutiSekolah" },
    // Hari khas sekolah
    { id: "KAL015", tarikh: "2026-09-04", nama: "Hari Kantin Sekolah", jenis: "HariKhas" },
  ];
  for (const k of kalendarList) {
    await db.kalendar.create({ data: { ...k, tarikh: tarikhLocal(k.tarikh) } });
  }

  // 6. Baki Cuti tahun 2026
  console.log("→ Baki cuti");
  const tahun = 2026;
  for (const s of stafList) {
    for (const jc of jenisCutiList) {
      const digunakan = jc.id === "JC1" ? Math.floor(Math.random() * 3) : 0;
      await db.bakiCuti.create({
        data: {
          id: `BC-${s.id}-${jc.id}-${tahun}`,
          stafId: s.id,
          jenisCutiId: jc.id,
          tahun,
          layak: jc.kelayakanTahunan,
          digunakan,
        },
      });
    }
  }

  // 7. Kehadiran: jana ±60 hari kerja lalu dengan taburan realistik
  console.log("→ Kehadiran (±60 hari kerja)");
  const tetapan = await db.tetapan.findFirst();
  if (!tetapan) throw new Error("Tetapan tiada");
  const hariBekerja = parseHariBekerja(tetapan.hariBekerja);
  const cutiUmumDates = (await db.kalendar.findMany({ where: { jenis: { in: ["CutiUmum", "CutiSekolah"] } } })).map((k) => isoTarikh(k.tarikh));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 75);
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);

  const sebabLewatOpts = [
    "Kesesakan lalu lintas",
    "Urusan keluarga",
    "Kenderaan rosak",
    "Lain-lain",
  ];

  let rekodCount = 0;
  while (cur <= today) {
    const jsDay = cur.getDay();
    const prdDay = jsDay === 0 ? 7 : jsDay;
    const iso = isoTarikh(cur);
    if (hariBekerja.includes(prdDay) && !cutiUmumDates.includes(iso)) {
      for (const s of stafList) {
        if (s.peranan === "Kiosk") continue;
        const rnd = Math.random();
        let status: "Hadir" | "Lewat" | "TidakHadir" | "Cuti" | "TugasRasmi";
        if (rnd < 0.02) status = "TidakHadir";
        else if (rnd < 0.05) status = "Cuti";
        else if (rnd < 0.07) status = "TugasRasmi";
        else if (rnd < 0.12) status = "Lewat";
        else status = "Hadir";

        if (status === "TidakHadir") {
          await db.kehadiran.create({
            data: {
              id: `K-${iso}-${s.id}`,
              stafId: s.id,
              tarikh: new Date(cur),
              masaMasuk: null,
              masaKeluar: null,
              status: "TidakHadir",
              sumber: "Admin",
            },
          });
        } else if (status === "Cuti" || status === "TugasRasmi") {
          await db.kehadiran.create({
            data: {
              id: `K-${iso}-${s.id}`,
              stafId: s.id,
              tarikh: new Date(cur),
              masaMasuk: null,
              masaKeluar: null,
              status,
              sumber: "Admin",
              catatan: status === "Cuti" ? "Cuti diluluskan" : "Tugas rasmi luar",
            },
          });
        } else {
          const masukJam = status === "Lewat" ? 8 + Math.floor(Math.random() * 1) : 7;
          const masukMnt = status === "Lewat" ? Math.floor(Math.random() * 25) + 1 : Math.floor(Math.random() * 30);
          const masaMasuk = new Date(cur);
          masaMasuk.setHours(masukJam, masukMnt, 0, 0);

          const isJumaat = prdDay === 5;
          const tamatJam = parseInt(isJumaat ? tetapan.waktuTamatJumaat : tetapan.waktuTamat, 10);
          const masaKeluar = new Date(cur);
          masaKeluar.setHours(tamatJam, Math.floor(Math.random() * 10), 0, 0);

          const jamBekerja = (masaKeluar.getTime() - masaMasuk.getTime()) / (1000 * 60 * 60);

          const sebenar = kiraStatusDaftarMasuk({
            masaMasuk,
            waktuMasuk: tetapan.waktuMasuk,
            bertolakAnsurMinit: tetapan.bertolakAnsurMinit,
          });

          await db.kehadiran.create({
            data: {
              id: `K-${iso}-${s.id}`,
              stafId: s.id,
              tarikh: new Date(cur),
              masaMasuk,
              masaKeluar: cur.toDateString() === today.toDateString() ? null : masaKeluar,
              status: sebenar,
              sebabLewat: sebenar === "Lewat" ? sebabLewatOpts[Math.floor(Math.random() * sebabLewatOpts.length)] : null,
              sumber: "Sendiri",
              jamBekerja: cur.toDateString() === today.toDateString() ? null : jamBekerja,
            },
          });
        }
        rekodCount++;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  console.log(`  ✓ ${rekodCount} rekod kehadiran dijana`);

  // 8. Permohonan cuti
  console.log("→ Permohonan cuti");
  const cutiSamples = [
    { stafId: "S004", jenisCutiId: "JC2", tarikhMula: "2026-11-20", tarikhAkhir: "2026-11-21", separuhHari: false, sebab: "Demam panas", status: "Menunggu", lampiranNama: "sijil_sakit_aisyah.pdf" },
    { stafId: "S006", jenisCutiId: "JC1", tarikhMula: "2026-11-25", tarikhAkhir: "2026-11-26", separuhHari: false, sebab: "Urusan peribadi", status: "Menunggu" },
    { stafId: "S005", jenisCutiId: "JC5", tarikhMula: "2026-11-10", tarikhAkhir: "2026-11-12", separuhHari: false, sebab: "Kursus Pengajaran Tahfiz", status: "Diluluskan", diputuskanOleh: "S001", catatanKeputusan: "Diluluskan. Sila hantar laporan selepas kursus.", tarikhKeputusan: "2026-11-05" },
    { stafId: "S007", jenisCutiId: "JC3", tarikhMula: "2026-11-08", tarikhAkhir: "2026-11-08", separuhHari: true, sebab: "Kecemasan keluarga", status: "Diluluskan", diputuskanOleh: "S001", catatanKeputusan: "Diluluskan separuh hari.", tarikhKeputusan: "2026-11-06" },
    { stafId: "S008", jenisCutiId: "JC1", tarikhMula: "2026-10-20", tarikhAkhir: "2026-10-22", separuhHari: false, sebab: "Cuti rehat keluarga", status: "Ditolak", diputuskanOleh: "S001", catatanKeputusan: "Ditolak kerana pertindihan dengan Peperiksaan Pertengahan Tahun.", tarikhKeputusan: "2026-10-15" },
    { stafId: "S010", jenisCutiId: "JC2", tarikhMula: "2026-11-15", tarikhAkhir: "2026-11-16", separuhHari: false, sebab: "Sakit gigi", status: "Menunggu" },
  ];

  const cutiUmumForCalc = cutiUmumDates;
  for (const c of cutiSamples) {
    const tMula = tarikhLocal(c.tarikhMula);
    const tAkhir = tarikhLocal(c.tarikhAkhir);
    let bil = 0;
    const tmp = new Date(tMula);
    while (tmp <= tAkhir) {
      const pd = tmp.getDay() === 0 ? 7 : tmp.getDay();
      const iso = isoTarikh(tmp);
      if (hariBekerja.includes(pd) && !cutiUmumForCalc.includes(iso)) bil++;
      tmp.setDate(tmp.getDate() + 1);
    }
    bil = c.separuhHari ? bil * 0.5 : bil;

    if (c.status === "Diluluskan" && tAkhir < today) {
      const stStatus = c.jenisCutiId === "JC5" ? "TugasRasmi" : "Cuti";
      const tmp2 = new Date(tMula);
      while (tmp2 <= tAkhir) {
        const pd = tmp2.getDay() === 0 ? 7 : tmp2.getDay();
        const iso = isoTarikh(tmp2);
        if (hariBekerja.includes(pd) && !cutiUmumForCalc.includes(iso)) {
          const tar = new Date(tmp2.getFullYear(), tmp2.getMonth(), tmp2.getDate(), 0, 0, 0, 0);
          await db.kehadiran.deleteMany({ where: { stafId: c.stafId, tarikh: tar } });
          await db.kehadiran.create({
            data: { id: `K-${iso}-${c.stafId}`, stafId: c.stafId, tarikh: tar, status: stStatus, sumber: "Admin", catatan: c.sebab },
          });
        }
        tmp2.setDate(tmp2.getDate() + 1);
      }
      if (c.jenisCutiId !== "JC5") {
        const bc = await db.bakiCuti.findUnique({ where: { id: `BC-${c.stafId}-${c.jenisCutiId}-${tahun}` } });
        if (bc) {
          await db.bakiCuti.update({ where: { id: bc.id }, data: { digunakan: bc.digunakan + bil } });
        }
      }
    }

    await db.permohonanCuti.create({
      data: {
        id: `PC-${c.stafId}-${isoTarikh(tMula)}`,
        stafId: c.stafId,
        jenisCutiId: c.jenisCutiId,
        tarikhMula: tMula,
        tarikhAkhir: tAkhir,
        separuhHari: c.separuhHari,
        bilHari: bil,
        sebab: c.sebab,
        lampiranNama: c.lampiranNama || null,
        status: c.status,
        diputuskanOleh: c.diputuskanOleh || null,
        catatanKeputusan: c.catatanKeputusan || null,
        tarikhKeputusan: c.tarikhKeputusan ? tarikhLocal(c.tarikhKeputusan) : null,
      },
    });
  }

  // 9. Kebenaran Keluar
  console.log("→ Kebenaran keluar");
  const kebenaranSamples = [
    { stafId: "S004", tarikh: isoTarikh(today), masaKeluar: "10:00", masaKembali: "12:00", sebab: "Urusan bank sekolah", status: "Menunggu" },
    { stafId: "S006", tarikh: isoTarikh(new Date(today.getTime() - 86400000)), masaKeluar: "14:00", masaKembali: "15:30", sebab: "Temu janji doktor", status: "Diluluskan", diputuskanOleh: "S001" },
  ];
  for (const k of kebenaranSamples) {
    await db.kebenaranKeluar.create({
      data: {
        id: `KK-${k.stafId}-${k.tarikh}`,
        stafId: k.stafId,
        tarikh: tarikhLocal(k.tarikh),
        masaKeluar: k.masaKeluar,
        masaKembali: k.masaKembali,
        sebab: k.sebab,
        status: k.status,
        diputuskanOleh: k.diputuskanOleh || null,
      },
    });
  }

  // 10. Notifikasi
  console.log("→ Notifikasi");
  const notifSamples = [
    { penerimaId: "S001", tajuk: "Permohonan cuti baharu", mesej: "Siti Aisyah binti Rahim memohon cuti sakit 2 hari (20–21 Nov 2026)." },
    { penerimaId: "S001", tajuk: "Permohonan cuti baharu", mesej: "Mohd Azlan bin Abdullah memohon cuti rehat 2 hari (25–26 Nov 2026)." },
    { penerimaId: "S004", tajuk: "Cuti menunggu kelulusan", mesej: "Permohonan cuti sakit anda sedang menunggu kelulusan Pengetua." },
    { penerimaId: "S005", tajuk: "Cuti diluluskan", mesej: "Permohonan Tugas Rasmi/Kursus (10–12 Nov 2026) telah diluluskan." },
    { penerimaId: "S009", tajuk: "Mod Demo aktif", mesej: "Sistem dalam mod demo. Semua data adalah rekaan. Gunakan butang 'Set Semula Data Demo' untuk memulihkan." },
  ];
  for (const n of notifSamples) {
    await db.notifikasi.create({
      data: {
        id: `N-${Math.random().toString(36).slice(2, 9)}`,
        penerimaId: n.penerimaId,
        tajuk: n.tajuk,
        mesej: n.mesej,
        dibaca: false,
      },
    });
  }

  // 11. Log Audit
  console.log("→ Log audit");
  await db.logAudit.create({
    data: {
      id: `LA-${Math.random().toString(36).slice(2, 9)}`,
      penggunaId: "S009",
      tindakan: "SEED_DATA",
      entiti: "Sistem",
      entitiId: "benih",
      nilaiBaharu: "Data benih dimuatkan",
    },
  });

  console.log("\n✅ Benih data selesai!");
  console.log("   Akaun demo:");
  console.log("   - Pengetua:  G001 / Demo@1234");
  console.log("   - Penyelia:  G002 / Demo@1234");
  console.log("   - Guru:      G004 / Demo@1234");
  console.log("   - Admin:     A001 / Demo@1234");
  console.log("   - Kiosk:     S012 / Demo@1234 (PIN kiosk: 1234)");
}

main()
  .catch((e) => {
    console.error("❌ Ralat benih:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
