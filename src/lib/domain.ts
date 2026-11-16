// Utiliti domain: pengiraan status kehadiran, baki cuti, dll.
// Fungsi tulen tanpa kesan sampingan.

export type StatusKehadiran =
  | "Hadir"
  | "Lewat"
  | "TidakHadir"
  | "Cuti"
  | "TugasRasmi"
  | "CutiUmum";

export const NAMA_HARI = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
export const NAMA_BULAN_SINGKAT = [
  "Jan", "Feb", "Mac", "Apr", "Mei", "Jun",
  "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis",
];
export const NAMA_BULAN_PENUH = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
];

// Tukar "HH:MM" kepada minit dari tengah malam
export function waktuKeMinit(waktu: string): number {
  const [h, m] = waktu.split(":").map(Number);
  return h * 60 + m;
}

// Hari bekerja sebagai array nombor (1=Isnin..7=Ahad) dari string "1,2,3,4,5"
export function parseHariBekerja(s: string): number[] {
  return s.split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n));
}

// Tentukan sama ada tarikh adalah hari bekerja
export function isHariBekerja(tarikh: Date, hariBekerja: number[]): boolean {
  // JS: 0=Ahad, 1=Isnin.. ; PRD: 1=Isnin..7=Ahad
  const jsDay = tarikh.getDay();
  const prdDay = jsDay === 0 ? 7 : jsDay;
  return hariBekerja.includes(prdDay);
}

// Kira status Hadir/Lewat berdasarkan waktu masuk sebenar dan tetapan
export function kiraStatusDaftarMasuk(params: {
  masaMasuk: Date;
  waktuMasuk: string; // "HH:MM"
  bertolakAnsurMinit: number;
}): "Hadir" | "Lewat" {
  const { masaMasuk, waktuMasuk, bertolakAnsurMinit } = params;
  const hadMinit = waktuKeMinit(waktuMasuk) + bertolakAnsurMinit;
  const masukMinit = masaMasuk.getHours() * 60 + masaMasuk.getMinutes();
  return masukMinit > hadMinit ? "Lewat" : "Hadir";
}

// Kira jam bekerja (dalam jam, perpuluhan) antara masa masuk dan keluar
export function kiraJamBekerja(masaMasuk: Date, masaKeluar: Date): number {
  const ms = masaKeluar.getTime() - masaMasuk.getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

// Format jam bekerja sebagai "Xj Ym"
export function formatJamBekerja(jam: number | null | undefined): string {
  if (jam == null) return "—";
  const j = Math.floor(jam);
  const m = Math.round((jam - j) * 60);
  return `${j}j ${m}m`;
}

// Kira bilangan hari berkesan cuti (tidak termasuk hujung minggu & cuti umum)
export function kiraHariBerkesanCuti(params: {
  tarikhMula: Date;
  tarikhAkhir: Date;
  hariBekerja: number[];
  tarikhCutiUmum: string[]; // ISO date strings YYYY-MM-DD
  separuhHari: boolean;
}): number {
  const { tarikhMula, tarikhAkhir, hariBekerja, tarikhCutiUmum, separuhHari } = params;
  let count = 0;
  const cur = new Date(tarikhMula);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(tarikhAkhir);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const jsDay = cur.getDay();
    const prdDay = jsDay === 0 ? 7 : jsDay;
    const iso = cur.toISOString().slice(0, 10);
    if (hariBekerja.includes(prdDay) && !tarikhCutiUmum.includes(iso)) {
      count += 1;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return separuhHari ? count * 0.5 : count;
}

// Format tarikh BM: HH/MM/TTTT
export function formatTarikhBM(tarikh: Date | string): string {
  const d = typeof tarikh === "string" ? new Date(tarikh) : tarikh;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Format masa 24j: HH:MM
export function formatMasa(tarikh: Date | string | null | undefined): string {
  if (!tarikh) return "—";
  const d = typeof tarikh === "string" ? new Date(tarikh) : tarikh;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Format tarikh & masa penuh
export function formatTarikhMasaBM(tarikh: Date | string): string {
  return `${formatTarikhBM(tarikh)} ${formatMasa(tarikh)}`;
}

// Hash kata laluan dummy (tidak selamat; hanya untuk prototaip)
export function hashLaluanDummy(laluan: string): string {
  // cincang ringkas berasaskan SHA-256 tidak tersedia tanpa crypto; guna Base64 + salt statik
  // NOTA: ini bukan hash selamat — sila guna bcrypt/argon2 dalam produksi.
  let h = 0;
  const salt = "sri-al-amin-gombak-2026";
  const s = salt + laluan;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return `demo$${(h >>> 0).toString(16)}$${Buffer.from(s).toString("base64").slice(0, 16)}`;
}

export function sahkanLaluan(laluan: string, hash: string): boolean {
  return hashLaluanDummy(laluan) === hash;
}

// Semak sama ada staf sudah ada rekod pada tarikh tertentu
export function adaRekodHariIni(rekod: { tarikh: Date }[], tarikh: Date): boolean {
  const t = new Date(tarikh);
  t.setHours(0, 0, 0, 0);
  return rekod.some((r) => {
    const rr = new Date(r.tarikh);
    rr.setHours(0, 0, 0, 0);
    return rr.getTime() === t.getTime();
  });
}

// Warna status untuk paparan (kod Tailwind)
export const WARNA_STATUS: Record<StatusKehadiran, { bg: string; text: string; dot: string; label: string }> = {
  Hadir: { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-600", label: "Hadir" },
  Lewat: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500", label: "Lewat" },
  TidakHadir: { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-600", label: "Tidak Hadir" },
  Cuti: { bg: "bg-sky-100", text: "text-sky-800", dot: "bg-sky-600", label: "Cuti" },
  TugasRasmi: { bg: "bg-violet-100", text: "text-violet-800", dot: "bg-violet-600", label: "Tugas Rasmi" },
  CutiUmum: { bg: "bg-slate-200", text: "text-slate-700", dot: "bg-slate-500", label: "Cuti Umum" },
};

// Label peranan
export const LABEL_PERANAN: Record<string, string> = {
  Admin: "Pentadbir",
  Pengetua: "Pengetua / Guru Besar",
  Penyelia: "Penyelia (Penolong Kanan)",
  Guru: "Guru / Staf",
  Kiosk: "Kiosk",
};

// Samarkan No. K/P: 850101-14-**** menjadi 850101-**-****
export function samarkanKp(noKp: string): string {
  if (!noKp) return "—";
  // anggap format XXXXXX-XX-XXXX
  if (noKp.length >= 12) {
    return noKp.slice(0, 6) + "-**-****";
  }
  return noKp.slice(0, 4) + "****";
}

// Bil hari dalam bulan
export function hariDalamBulan(tahun: number, bulan: number): number {
  return new Date(tahun, bulan + 1, 0).getDate();
}

// ISO date string YYYY-MM-DD dari Date
export function isoTarikh(d: Date): string {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

// Hari dalam BM untuk tarikh
export function namaHariBM(d: Date): string {
  return NAMA_HARI[d.getDay()];
}
