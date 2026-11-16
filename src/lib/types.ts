// Kontrak TypeScript untuk entiti sistem (serasi dengan API sebenar kelak)
// Semua akses data dari frontend melalui kontrak ini.

export type Peranan = "Admin" | "Pengetua" | "Penyelia" | "Guru" | "Kiosk";
export type Jantina = "L" | "P";
export type KategoriStaf = "Guru" | "StafSokongan" | "Pentadbiran";
export type StatusKehadiran =
  | "Hadir"
  | "Lewat"
  | "TidakHadir"
  | "Cuti"
  | "TugasRasmi"
  | "CutiUmum";
export type SumberKehadiran = "Sendiri" | "Kiosk" | "Admin";
export type StatusCuti = "Menunggu" | "Diluluskan" | "Ditolak" | "Dibatalkan";

export interface Jabatan {
  id: string;
  nama: string;
  kod: string;
  ketuaId?: string | null;
}

export interface Staf {
  id: string;
  noIdStaf: string;
  nama: string;
  noKpSamar: string;
  jantina: Jantina;
  jawatan: string;
  kategori: KategoriStaf;
  jabatanId?: string | null;
  emel?: string | null;
  telefon?: string | null;
  tarikhLantik?: string | null;
  peranan: Peranan;
  pin?: string | null;
  aktif: boolean;
  perluTukarLaluan: boolean;
  jabatan?: Jabatan | null;
}

export interface Kehadiran {
  id: string;
  stafId: string;
  tarikh: string; // ISO date
  masaMasuk?: string | null;
  masaKeluar?: string | null;
  status: StatusKehadiran;
  sebabLewat?: string | null;
  catatan?: string | null;
  sumber: SumberKehadiran;
  jamBekerja?: number | null;
  dikemaskiniOleh?: string | null;
  staf?: Staf;
}

export interface JenisCuti {
  id: string;
  nama: string;
  kelayakanTahunan: number;
  perluLampiran: boolean;
}

export interface PermohonanCuti {
  id: string;
  stafId: string;
  jenisCutiId: string;
  tarikhMula: string;
  tarikhAkhir: string;
  separuhHari: boolean;
  bilHari: number;
  sebab: string;
  lampiranNama?: string | null;
  status: StatusCuti;
  diputuskanOleh?: string | null;
  catatanKeputusan?: string | null;
  tarikhKeputusan?: string | null;
  dicipta: string;
  staf?: Staf;
  jenisCuti?: JenisCuti;
}

export interface KebenaranKeluar {
  id: string;
  stafId: string;
  tarikh: string;
  masaKeluar: string;
  masaKembali: string;
  sebab: string;
  status: StatusCuti;
  diputuskanOleh?: string | null;
  dicipta: string;
  staf?: Staf;
}

export interface BakiCuti {
  id: string;
  stafId: string;
  jenisCutiId: string;
  tahun: number;
  layak: number;
  digunakan: number;
  jenisCuti?: JenisCuti;
}

export interface Kalendar {
  id: string;
  tarikh: string;
  nama: string;
  jenis: "CutiUmum" | "CutiSekolah" | "HariKhas";
}

export interface Tetapan {
  id: number;
  waktuMasuk: string;
  bertolakAnsurMinit: number;
  waktuTamat: string;
  waktuTamatJumaat: string;
  hariBekerja: string;
  ramadanAktif: boolean;
  ramadanMula?: string | null;
  ramadanTamat?: string | null;
  ramadanMasukWaktu: string;
  ramadanTamatWaktu: string;
  aliranDuaPeringkat: boolean;
  sekolahNama: string;
  sekolahAlamat: string;
}

export interface Notifikasi {
  id: string;
  penerimaId: string;
  tajuk: string;
  mesej: string;
  dibaca: boolean;
  dicipta: string;
}

export interface LogAudit {
  id: string;
  penggunaId?: string | null;
  tindakan: string;
  entiti: string;
  entitiId?: string | null;
  nilaiLama?: string | null;
  nilaiBaharu?: string | null;
  capMasa: string;
}

export interface SesiPengguna {
  staf: Staf;
  token: string;
}
