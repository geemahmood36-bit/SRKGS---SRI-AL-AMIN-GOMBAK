"use client";

// LaporanView (FR-E01..E05) — Sistem Rekod Kehadiran Guru & Staf SRI Al-Amin Gombak.
// Empat tab: Harian, Bulanan, Individu, Cuti.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays, CalendarRange, FileText, Printer, User,
  Download, Users,
} from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiFetch, eksportCSV, cetakHalaman } from "@/lib/api-client";
import {
  WARNA_STATUS, formatJamBekerja, formatMasa, formatTarikhBM,
  isoTarikh, NAMA_BULAN_PENUH,
} from "@/lib/domain";
import type { KategoriStaf, Tetapan } from "@/lib/types";

// ---------- Jenis data (mengikut respons API sebenar) ----------
interface JabatanRingkas { id: string; nama: string; kod: string; bilStaf?: number }
interface StafRingkas {
  id: string;
  noIdStaf: string;
  nama: string;
  jawatan?: string | null;
  kategori?: KategoriStaf;
  jabatanId?: string | null;
  peranan?: string;
}

interface BarisHarian {
  staf: {
    id: string;
    noIdStaf: string;
    nama: string;
    jawatan: string;
    jabatan: string;
  };
  kehadiran: {
    masaMasuk?: string | null;
    masaKeluar?: string | null;
    jamBekerja?: number | null;
    status: string;
  } | null;
  statusRingkas: string;
}
interface ResponsHarian {
  tarikh: string;
  tetapan: Tetapan;
  isCutiUmum: boolean;
  cutiUmum?: string | null;
  isHujungMinggu: boolean;
  senarai: BarisHarian[];
}

interface SelBulanan { stafId: string; tarikh: string; status: string }
interface StafBulanan {
  id: string; noIdStaf: string; nama: string; jawatan: string; jabatan: string;
}
interface ResponsBulanan {
  tahun: number;
  bulan: number;
  tetapan: Tetapan;
  staf: StafBulanan[];
  tarikh: string[];
  sel: SelBulanan[];
  summary: {
    peratusHadir: number;
    jumlahLewat: number;
    purataJamBekerja: number;
    teratasLewat: { stafId: string; nama: string; bilLewat: number }[];
  };
}

interface RekodIndividu {
  id: string;
  tarikh: string;
  masaMasuk?: string | null;
  masaKeluar?: string | null;
  jamBekerja?: number | null;
  status: string;
  sebabLewat?: string | null;
}
interface ResponsIndividu {
  staf: {
    id: string; nama: string; jawatan: string;
    jabatan: { nama: string } | string; noIdStaf: string;
  };
  rekod: RekodIndividu[];
  ringkasan: {
    hadir: number; lewat: number; cuti: number;
    tidakHadir: number; purataJamBekerja: number;
  };
}

interface BakiCutiItem {
  jenisCutiId: string;
  jenisCuti: string | { nama: string };
  layak: number;
  digunakan: number;
  baki?: number;
}
interface BarisCuti {
  stafId: string;
  nama: string;
  jabatan: string;
  bakiCuti: BakiCutiItem[];
}
interface ResponsCuti { tahun: number; senarai: BarisCuti[] }

// ---------- Utiliti paparan status ----------
const KOD_SEL: Record<string, { kod: string; bg: string; text: string }> = {
  Hadir:        { kod: "H", bg: "bg-emerald-100", text: "text-emerald-800" },
  Lewat:        { kod: "L", bg: "bg-amber-100",   text: "text-amber-800" },
  TidakHadir:   { kod: "T", bg: "bg-rose-100",    text: "text-rose-800" },
  Cuti:         { kod: "C", bg: "bg-sky-100",     text: "text-sky-800" },
  TugasRasmi:   { kod: "R", bg: "bg-violet-100",  text: "text-violet-800" },
  CutiUmum:     { kod: "U", bg: "bg-slate-200",   text: "text-slate-700" },
};

function kelasStatusRingkas(s: string): { bg: string; text: string; label: string } | null {
  if (s === "Hadir")        return { bg: WARNA_STATUS.Hadir.bg,        text: WARNA_STATUS.Hadir.text,        label: WARNA_STATUS.Hadir.label };
  if (s === "Lewat")        return { bg: WARNA_STATUS.Lewat.bg,        text: WARNA_STATUS.Lewat.text,        label: WARNA_STATUS.Lewat.label };
  if (s === "TidakHadir")   return { bg: WARNA_STATUS.TidakHadir.bg,   text: WARNA_STATUS.TidakHadir.text,   label: WARNA_STATUS.TidakHadir.label };
  if (s === "Cuti")         return { bg: WARNA_STATUS.Cuti.bg,         text: WARNA_STATUS.Cuti.text,         label: WARNA_STATUS.Cuti.label };
  if (s === "TugasRasmi")   return { bg: WARNA_STATUS.TugasRasmi.bg,   text: WARNA_STATUS.TugasRasmi.text,   label: WARNA_STATUS.TugasRasmi.label };
  if (s === "Cuti Umum" || s === "CutiUmum") return { bg: WARNA_STATUS.CutiUmum.bg, text: WARNA_STATUS.CutiUmum.text, label: WARNA_STATUS.CutiUmum.label };
  return null;
}

function namaJenisCuti(j: BakiCutiItem["jenisCuti"]): string {
  return typeof j === "string" ? j : j?.nama ?? "—";
}

function pillStatus(label: string, kelas: { bg: string; text: string } | null) {
  if (!kelas) {
    return <span className="text-[10px] text-stone-500 italic">{label}</span>;
  }
  return (
    <span className={`skeuo-pill ${kelas.bg} ${kelas.text}`}>
      <span className="led bg-stone-400" />
      {label}
    </span>
  );
}

// ---------- Komponen kecil ----------
function TajukSekolah({ tetapan, sub }: { tetapan?: Tetapan | null; sub: string }) {
  return (
    <div className="text-center hidden print:block mb-3">
      <div className="text-base font-bold text-stone-800">
        {tetapan?.sekolahNama ?? "SRI Al-Amin Gombak"}
      </div>
      <div className="text-xs text-stone-600">{tetapan?.sekolahAlamat ?? ""}</div>
      <div className="text-sm font-semibold text-stone-700 mt-1">{sub}</div>
    </div>
  );
}

function ButangCetak() {
  return (
    <Button
      variant="outline"
      onClick={cetakHalaman}
      className="skeuo-btn-secondary h-9 px-3 gap-1.5 print:hidden"
      title="Cetak laporan ini"
    >
      <Printer size={15} /> Cetak
    </Button>
  );
}

function BarisPenapis({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">{children}</div>;
}

function PilihJabatan({
  senarai, value, onChange,
}: { senarai: JabatanRingkas[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-stone-600">Jabatan</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="skeuo-input mt-1">
          <SelectValue placeholder="Semua jabatan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__SEMUA__">Semua Jabatan</SelectItem>
          {senarai.map((j) => (
            <SelectItem key={j.id} value={j.id}>{j.nama} ({j.kod})</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PilihKategori({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-stone-600">Kategori</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="skeuo-input mt-1">
          <SelectValue placeholder="Semua kategori" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__SEMUA__">Semua</SelectItem>
          <SelectItem value="Guru">Guru</SelectItem>
          <SelectItem value="StafSokongan">Staf Sokongan</SelectItem>
          <SelectItem value="Pentadbiran">Pentadbiran</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function SkeletonJadual({ bil = 6 }: { bil?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(bil)].map((_, i) => (
        <div key={i} className="skeuo-card-inset h-10 animate-pulse" />
      ))}
    </div>
  );
}

function KeadaanKosong({ mesej }: { mesej: string }) {
  return (
    <div className="skeuo-card-inset p-8 text-center text-stone-500 text-sm">
      {mesej}
    </div>
  );
}

// ============================================================
// Komponen utama
// ============================================================
export function LaporanView() {
  const [tab, setTab] = useState("harian");

  // Penapis bersama
  const [senJabatan, setSenJabatan] = useState<JabatanRingkas[]>([]);
  const [senStaf, setSenStaf] = useState<StafRingkas[]>([]);
  const [jabatanId, setJabatanId] = useState<string>("__SEMUA__");
  const [kategori, setKategori] = useState<string>("__SEMUA__");

  const now = new Date();
  const [tarikhHarian, setTarikhHarian] = useState(isoTarikh(now));
  const [tahunBulanan, setTahunBulanan] = useState(now.getFullYear());
  const [bulanBulanan, setBulanBulanan] = useState(now.getMonth() + 1);
  const [stafIdIndividu, setStafIdIndividu] = useState<string>("");
  const [tarikhMulaIndividu, setTarikhMulaIndividu] = useState<string>(isoTarikh(now));
  const [tarikhAkhirIndividu, setTarikhAkhirIndividu] = useState<string>(isoTarikh(now));
  const [tahunCuti, setTahunCuti] = useState(now.getFullYear());

  // Muat jabatan & staf sekali
  useEffect(() => {
    (async () => {
      try {
        const rj = await apiFetch<{ senarai: JabatanRingkas[] }>("/api/jabatan");
        setSenJabatan(rj.senarai || []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuatkan jabatan.");
      }
    })();
    (async () => {
      try {
        const rs = await apiFetch<{ senarai: StafRingkas[] }>("/api/staf?aktif=true");
        const senarai = (rs.senarai || []).filter((s) => s.peranan !== "Kiosk");
        setSenStaf(senarai);
        if (senarai.length > 0) setStafIdIndividu((s) => s || senarai[0].id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuatkan senarai staf.");
      }
    })();
  }, []);

  // Bina set ID staf bagi kategori terpilih (untuk tapisan sisi klien)
  const setKategoriIds = useMemo(() => {
    if (kategori === "__SEMUA__") return null;
    const s = new Set<string>();
    for (const st of senStaf) if (st.kategori === kategori) s.add(st.id);
    return s;
  }, [kategori, senStaf]);

  // ---------------------------------------------------- Tab Harian
  return (
    <div className="space-y-4">
      <div className="skeuo-panel p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
              <FileText size={14} /> Modul Laporan
            </div>
            <div className="text-lg sm:text-xl font-bold text-stone-800">Laporan Kehadiran</div>
            <div className="text-xs text-stone-500 mt-0.5">
              Sistem Rekod Kehadiran Guru &amp; Staf — SRI Al-Amin Gombak
            </div>
          </div>
          <ButangCetak />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="print:hidden">
          <TabsTrigger value="harian" className="gap-1.5"><CalendarDays size={14} /> Harian</TabsTrigger>
          <TabsTrigger value="bulanan" className="gap-1.5"><CalendarRange size={14} /> Bulanan</TabsTrigger>
          <TabsTrigger value="individu" className="gap-1.5"><User size={14} /> Individu</TabsTrigger>
          <TabsTrigger value="cuti" className="gap-1.5"><FileText size={14} /> Cuti</TabsTrigger>
        </TabsList>

        <TabsContent value="harian">
          <TabHarian
            tarikh={tarikhHarian}
            setTarikh={setTarikhHarian}
            jabatanId={jabatanId}
            senJabatan={senJabatan}
            setJabatanId={setJabatanId}
            kategori={kategori}
            setKategori={setKategori}
            setKategoriIds={setKategoriIds}
          />
        </TabsContent>

        <TabsContent value="bulanan">
          <TabBulanan
            tahun={tahunBulanan}
            setTahun={setTahunBulanan}
            bulan={bulanBulanan}
            setBulan={setBulanBulanan}
            jabatanId={jabatanId}
            senJabatan={senJabatan}
            setJabatanId={setJabatanId}
            kategori={kategori}
            setKategori={setKategori}
            setKategoriIds={setKategoriIds}
          />
        </TabsContent>

        <TabsContent value="individu">
          <TabIndividu
            stafId={stafIdIndividu}
            setStafId={setStafIdIndividu}
            tarikhMula={tarikhMulaIndividu}
            setTarikhMula={setTarikhMulaIndividu}
            tarikhAkhir={tarikhAkhirIndividu}
            setTarikhAkhir={setTarikhAkhirIndividu}
            senStaf={senStaf}
            jabatanId={jabatanId}
            senJabatan={senJabatan}
            setJabatanId={setJabatanId}
            kategori={kategori}
            setKategori={setKategori}
          />
        </TabsContent>

        <TabsContent value="cuti">
          <TabCuti
            tahun={tahunCuti}
            setTahun={setTahunCuti}
            jabatanId={jabatanId}
            senJabatan={senJabatan}
            setJabatanId={setJabatanId}
            kategori={kategori}
            setKategori={setKategori}
            setKategoriIds={setKategoriIds}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Tab Harian (FR-E01)
// ============================================================
function TabHarian(props: {
  tarikh: string;
  setTarikh: (v: string) => void;
  jabatanId: string;
  senJabatan: JabatanRingkas[];
  setJabatanId: (v: string) => void;
  kategori: string;
  setKategori: (v: string) => void;
  setKategoriIds: Set<string> | null;
}) {
  const { tarikh, setTarikh, jabatanId, senJabatan, setJabatanId, kategori, setKategori, setKategoriIds } = props;
  const [data, setData] = useState<ResponsHarian | null>(null);
  const [memuat, setMemuat] = useState(true);

  const muat = useCallback(async () => {
    if (!tarikh) return;
    setMemuat(true);
    try {
      const qs = new URLSearchParams({ tarikh });
      if (jabatanId !== "__SEMUA__") qs.set("jabatanId", jabatanId);
      const r = await apiFetch<ResponsHarian>(`/api/laporan/harian?${qs.toString()}`);
      setData(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuatkan laporan harian.");
      setData(null);
    } finally {
      setMemuat(false);
    }
  }, [tarikh, jabatanId]);

  useEffect(() => { muat(); }, [muat]);

  const barisTapis = useMemo(() => {
    if (!data) return [];
    if (!setKategoriIds) return data.senarai;
    return data.senarai.filter((b) => setKategoriIds.has(b.staf.id));
  }, [data, setKategoriIds]);

  function eksport() {
    if (!data) return;
    const lajur = ["NoIdStaf", "Nama", "Jawatan", "Jabatan", "MasaMasuk", "MasaKeluar", "JamBekerja", "Status"];
    const baris = barisTapis.map((b) => ({
      NoIdStaf: b.staf.noIdStaf,
      Nama: b.staf.nama,
      Jawatan: b.staf.jawatan,
      Jabatan: b.staf.jabatan,
      MasaMasuk: formatMasa(b.kehadiran?.masaMasuk),
      MasaKeluar: formatMasa(b.kehadiran?.masaKeluar),
      JamBekerja: b.kehadiran?.jamBekerja != null ? b.kehadiran.jamBekerja.toFixed(2) : "",
      Status: b.statusRingkas,
    }));
    eksportCSV(`laporan-harian-${tarikh}.csv`, lajur, baris);
  }

  const tarikhDate = tarikh ? new Date(tarikh + "T00:00:00") : null;
  const namaHari = tarikhDate
    ? ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"][tarikhDate.getDay()]
    : "";

  return (
    <div className="space-y-4">
      <div className="skeuo-card p-4">
        <BarisPenapis>
          <div>
            <Label className="text-xs font-semibold text-stone-600">Tarikh</Label>
            <Input type="date" value={tarikh} onChange={(e) => setTarikh(e.target.value)} className="skeuo-input mt-1" />
          </div>
          <PilihJabatan senarai={senJabatan} value={jabatanId} onChange={setJabatanId} />
          <PilihKategori value={kategori} onChange={setKategori} />
          <div className="flex items-end gap-2">
            <Button onClick={eksport} disabled={!data || barisTapis.length === 0} className="skeuo-btn-secondary h-9 gap-1.5">
              <Download size={15} /> Eksport CSV
            </Button>
          </div>
        </BarisPenapis>
      </div>

      <div className="skeuo-card p-4">
        <TajukSekolah tetapan={data?.tetapan} sub={`Laporan Harian Kehadiran — ${namaHari}, ${formatTarikhBM(tarikh)}`} />
        <div className="flex items-center justify-between mb-3 print:hidden">
          <h3 className="font-bold text-stone-800 text-sm flex items-center gap-1.5">
            <CalendarDays size={15} className="text-stone-500" />
            {namaHari}, {formatTarikhBM(tarikh)}
          </h3>
          <div className="flex items-center gap-2">
            {data?.isCutiUmum && (
              <span className="skeuo-pill bg-slate-200 text-slate-700">Cuti Umum: {data.cutiUmum}</span>
            )}
            {data?.isHujungMinggu && (
              <span className="skeuo-pill bg-slate-200 text-slate-700">Hujung Minggu</span>
            )}
            <span className="skeuo-pill bg-stone-200 text-stone-700">{barisTapis.length} staf</span>
          </div>
        </div>

        {memuat ? (
          <SkeletonJadual />
        ) : barisTapis.length === 0 ? (
          <KeadaanKosong mesej="Tiada rekod kehadiran dijumpai untuk tarikh dan penapis ini." />
        ) : (
          <div className="max-h-[32rem] overflow-y-auto custom-scroll -mx-1 px-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Staf</TableHead>
                  <TableHead className="text-xs">Jawatan</TableHead>
                  <TableHead className="text-xs">Jabatan</TableHead>
                  <TableHead className="text-xs">Masa Masuk</TableHead>
                  <TableHead className="text-xs">Masa Keluar</TableHead>
                  <TableHead className="text-xs">Jam Bekerja</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barisTapis.map((b) => {
                  const kelas = kelasStatusRingkas(b.statusRingkas);
                  return (
                    <TableRow key={b.staf.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-stone-800">{b.staf.nama}</span>
                          <span className="text-[10px] text-stone-500 tabular-nums">{b.staf.noIdStaf}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-stone-600">{b.staf.jawatan || "—"}</TableCell>
                      <TableCell className="text-xs text-stone-600">{b.staf.jabatan || "—"}</TableCell>
                      <TableCell className="text-xs font-mono tabular-nums">{formatMasa(b.kehadiran?.masaMasuk)}</TableCell>
                      <TableCell className="text-xs font-mono tabular-nums">{formatMasa(b.kehadiran?.masaKeluar)}</TableCell>
                      <TableCell className="text-xs tabular-nums">{formatJamBekerja(b.kehadiran?.jamBekerja)}</TableCell>
                      <TableCell>{pillStatus(b.statusRingkas, kelas)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Tab Bulanan (FR-E02)
// ============================================================
function TabBulanan(props: {
  tahun: number;
  setTahun: (v: number) => void;
  bulan: number;
  setBulan: (v: number) => void;
  jabatanId: string;
  senJabatan: JabatanRingkas[];
  setJabatanId: (v: string) => void;
  kategori: string;
  setKategori: (v: string) => void;
  setKategoriIds: Set<string> | null;
}) {
  const {
    tahun, setTahun, bulan, setBulan, jabatanId, senJabatan, setJabatanId,
    kategori, setKategori, setKategoriIds,
  } = props;
  const [data, setData] = useState<ResponsBulanan | null>(null);
  const [memuat, setMemuat] = useState(true);

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const qs = new URLSearchParams({ tahun: String(tahun), bulan: String(bulan) });
      if (jabatanId !== "__SEMUA__") qs.set("jabatanId", jabatanId);
      const r = await apiFetch<ResponsBulanan>(`/api/laporan/bulanan?${qs.toString()}`);
      setData(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuatkan laporan bulanan.");
      setData(null);
    } finally {
      setMemuat(false);
    }
  }, [tahun, bulan, jabatanId]);

  useEffect(() => { muat(); }, [muat]);

  // Peta sel: stafId -> tarikhISO -> status
  const petaSel = useMemo(() => {
    const m = new Map<string, Map<string, string>>();
    if (data) for (const s of data.sel) {
      if (!m.has(s.stafId)) m.set(s.stafId, new Map());
      m.get(s.stafId)!.set(s.tarikh, s.status);
    }
    return m;
  }, [data]);

  const stafTapis = useMemo(() => {
    if (!data) return [];
    if (!setKategoriIds) return data.staf;
    return data.staf.filter((s) => setKategoriIds.has(s.id));
  }, [data, setKategoriIds]);

  const senTahun = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  function selKod(stafId: string, tarikhISO: string) {
    const m = petaSel.get(stafId);
    const status = m?.get(tarikhISO);
    if (!status) return { kod: "", bg: "", text: "" };
    if (status === "Hujung Minggu") return { kod: "—", bg: "bg-stone-50", text: "text-stone-300" };
    if (status === "Belum Hadir") return { kod: "·", bg: "bg-stone-100", text: "text-stone-400" };
    if (status === "Cuti Umum") return KOD_SEL.CutiUmum;
    return KOD_SEL[status] ?? { kod: "?", bg: "bg-stone-100", text: "text-stone-500" };
  }

  function eksport() {
    if (!data) return;
    // Matriks + ringkasan
    const lajur = ["NoIdStaf", "Nama", "Jawatan", "Jabatan", ...data.tarikh, "Ringkasan"];
    const baris = stafTapis.map((s) => {
      const m = petaSel.get(s.id);
      const row: Record<string, unknown> = {
        NoIdStaf: s.noIdStaf, Nama: s.nama, Jawatan: s.jawatan, Jabatan: s.jabatan,
      };
      for (const t of data.tarikh) {
        row[t] = m?.get(t) ?? "";
      }
      // ringkasan ringkas
      let h = 0, l = 0;
      for (const t of data.tarikh) {
        const st = m?.get(t);
        if (st === "Hadir") h++;
        else if (st === "Lewat") l++;
      }
      row.Ringkasan = `H=${h};L=${l}`;
      return row;
    });
    // Tambah baris ringkasan keseluruhan
    const sm = data.summary;
    baris.push({
      NoIdStaf: "", Nama: "RINGKASAN", Jawatan: "", Jabatan: "",
      ...Object.fromEntries(data.tarikh.map((t) => [t, ""])),
      Ringkasan: `Peratus=${sm.peratusHadir}%;Lewat=${sm.jumlahLewat};PurataJam=${sm.purataJamBekerja}`,
    } as Record<string, unknown>);
    eksportCSV(`laporan-bulanan-${tahun}-${String(bulan).padStart(2, "0")}.csv`, lajur, baris);
  }

  return (
    <div className="space-y-4">
      <div className="skeuo-card p-4">
        <BarisPenapis>
          <div>
            <Label className="text-xs font-semibold text-stone-600">Tahun</Label>
            <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
              <SelectTrigger className="skeuo-input mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {senTahun.map((t) => (<SelectItem key={t} value={String(t)}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-stone-600">Bulan</Label>
            <Select value={String(bulan)} onValueChange={(v) => setBulan(Number(v))}>
              <SelectTrigger className="skeuo-input mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NAMA_BULAN_PENUH.map((n, i) => (
                  <SelectItem key={n} value={String(i + 1)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <PilihJabatan senarai={senJabatan} value={jabatanId} onChange={setJabatanId} />
          <div className="flex items-end gap-2">
            <PilihKategori value={kategori} onChange={setKategori} />
            <Button onClick={eksport} disabled={!data || stafTapis.length === 0} className="skeuo-btn-secondary h-9 gap-1.5">
              <Download size={15} /> CSV
            </Button>
          </div>
        </BarisPenapis>
      </div>

      {memuat ? (
        <div className="skeuo-card p-4"><SkeletonJadual /></div>
      ) : !data || stafTapis.length === 0 ? (
        <div className="skeuo-card p-4">
          <KeadaanKosong mesej="Tiada rekod kehadiran dijumpai untuk bulan dan penapis ini." />
        </div>
      ) : (
        <>
          {/* Kad ringkasan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="skeuo-card-inset p-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Peratus Hadir</div>
              <div className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                {data.summary.peratusHadir}%
              </div>
            </div>
            <div className="skeuo-card-inset p-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Jumlah Lewat</div>
              <div className="text-2xl font-bold text-amber-600 tabular-nums mt-1">
                {data.summary.jumlahLewat}
              </div>
            </div>
            <div className="skeuo-card-inset p-4">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Purata Jam Bekerja</div>
              <div className="text-2xl font-bold text-stone-800 tabular-nums mt-1">
                {formatJamBekerja(data.summary.purataJamBekerja)}
              </div>
            </div>
          </div>

          {/* 10 Teratas Lewat */}
          {data.summary.teratasLewat.length > 0 && (
            <div className="skeuo-card p-4">
              <h3 className="font-bold text-stone-800 text-sm flex items-center gap-1.5 mb-3">
                <Users size={15} className="text-stone-500" /> 10 Teratas Lewat — {NAMA_BULAN_PENUH[data.bulan - 1]} {data.tahun}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.summary.teratasLewat.map((t, i) => (
                  <div key={t.stafId} className="skeuo-card-inset p-2 flex items-center gap-3">
                    <span className="skeuo-pill bg-amber-100 text-amber-800 w-6 justify-center">#{i + 1}</span>
                    <span className="text-xs font-medium text-stone-800 flex-1">{t.nama}</span>
                    <span className="text-xs text-amber-700 font-bold tabular-nums">{t.bilLewat} kali</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matriks */}
          <div className="skeuo-card p-4">
            <TajukSekolah tetapan={data.tetapan} sub={`Laporan Bulanan Kehadiran — ${NAMA_BULAN_PENUH[data.bulan - 1]} ${data.tahun}`} />
            <h3 className="font-bold text-stone-800 text-sm flex items-center gap-1.5 mb-3 print:hidden">
              <CalendarRange size={15} className="text-stone-500" />
              Matriks Kehadiran — {NAMA_BULAN_PENUH[data.bulan - 1]} {data.tahun}
              <span className="skeuo-pill bg-stone-200 text-stone-700 ml-2">{stafTapis.length} staf</span>
            </h3>
            <div className="max-h-[34rem] overflow-auto custom-scroll">
              <Table className="text-[10px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] sticky left-0 bg-stone-50 min-w-[140px]">Staf</TableHead>
                    {data.tarikh.map((t) => {
                      const d = new Date(t + "T00:00:00");
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <TableHead
                          key={t}
                          className={`text-[9px] text-center px-1 min-w-[22px] ${isWeekend ? "text-stone-300" : "text-stone-600"}`}
                        >
                          {d.getDate()}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stafTapis.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-[10px] sticky left-0 bg-white min-w-[140px]">
                        <div className="flex flex-col">
                          <span className="font-medium text-stone-800">{s.nama}</span>
                          <span className="text-[9px] text-stone-500">{s.noIdStaf} · {s.jawatan}</span>
                        </div>
                      </TableCell>
                      {data.tarikh.map((t) => {
                        const sel = selKod(s.id, t);
                        return (
                          <TableCell key={t} className={`text-center px-1 ${sel.bg}`}>
                            <span className={`text-[9px] font-bold ${sel.text}`}>{sel.kod}</span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Petunjuk */}
            <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
              <span className="text-[10px] text-stone-500 font-semibold">Petunjung:</span>
              {[
                { kod: "H", bg: "bg-emerald-100", text: "text-emerald-800", label: "Hadir" },
                { kod: "L", bg: "bg-amber-100", text: "text-amber-800", label: "Lewat" },
                { kod: "T", bg: "bg-rose-100", text: "text-rose-800", label: "Tidak Hadir" },
                { kod: "C", bg: "bg-sky-100", text: "text-sky-800", label: "Cuti" },
                { kod: "R", bg: "bg-violet-100", text: "text-violet-800", label: "Tugas Rasmi" },
                { kod: "U", bg: "bg-slate-200", text: "text-slate-700", label: "Cuti Umum" },
                { kod: "—", bg: "bg-stone-50", text: "text-stone-300", label: "Hujung Minggu" },
              ].map((p) => (
                <span key={p.kod} className="inline-flex items-center gap-1 text-[10px] text-stone-600">
                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded ${p.bg} ${p.text} font-bold`}>{p.kod}</span>
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Tab Individu (FR-E03)
// ============================================================
function TabIndividu(props: {
  stafId: string;
  setStafId: (v: string) => void;
  tarikhMula: string;
  setTarikhMula: (v: string) => void;
  tarikhAkhir: string;
  setTarikhAkhir: (v: string) => void;
  senStaf: StafRingkas[];
  jabatanId: string;
  senJabatan: JabatanRingkas[];
  setJabatanId: (v: string) => void;
  kategori: string;
  setKategori: (v: string) => void;
}) {
  const {
    stafId, setStafId, tarikhMula, setTarikhMula, tarikhAkhir, setTarikhAkhir,
    senStaf, jabatanId, senJabatan, setJabatanId, kategori, setKategori,
  } = props;
  const [data, setData] = useState<ResponsIndividu | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [popoverTerbuka, setPopoverTerbuka] = useState(false);
  const [cari, setCari] = useState("");

  const muat = useCallback(async () => {
    if (!stafId || !tarikhMula || !tarikhAkhir) return;
    setMemuat(true);
    try {
      const qs = new URLSearchParams({ stafId, tarikhMula, tarikhAkhir });
      const r = await apiFetch<ResponsIndividu>(`/api/laporan/individu?${qs.toString()}`);
      setData(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuatkan laporan individu.");
      setData(null);
    } finally {
      setMemuat(false);
    }
  }, [stafId, tarikhMula, tarikhAkhir]);

  useEffect(() => { muat(); }, [muat]);

  const stafDipilih = senStaf.find((s) => s.id === stafId) || null;
  const senCarian = useMemo(() => {
    const k = cari.trim().toLowerCase();
    if (!k) return senStaf;
    return senStaf.filter((s) =>
      s.nama.toLowerCase().includes(k) ||
      s.noIdStaf.toLowerCase().includes(k) ||
      (s.jawatan || "").toLowerCase().includes(k),
    );
  }, [senStaf, cari]);

  function eksport() {
    if (!data) return;
    const lajur = ["Tarikh", "MasaMasuk", "MasaKeluar", "JamBekerja", "Status", "SebabLewat"];
    const baris = data.rekod.map((r) => ({
      Tarikh: formatTarikhBM(r.tarikh),
      MasaMasuk: formatMasa(r.masaMasuk),
      MasaKeluar: formatMasa(r.masaKeluar),
      JamBekerja: r.jamBekerja != null ? r.jamBekerja.toFixed(2) : "",
      Status: r.status,
      SebabLewat: r.sebabLewat || "",
    }));
    eksportCSV(`laporan-individu-${stafId}-${tarikhMula}-${tarikhAkhir}.csv`, lajur, baris);
  }

  const namaJabatanStaf = data
    ? (typeof data.staf.jabatan === "string" ? data.staf.jabatan : data.staf.jabatan?.nama ?? "—")
    : "—";

  return (
    <div className="space-y-4">
      <div className="skeuo-card p-4">
        <BarisPenapis>
          <div>
            <Label className="text-xs font-semibold text-stone-600">Staf</Label>
            <Popover open={popoverTerbuka} onOpenChange={setPopoverTerbuka}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="skeuo-input mt-1 w-full justify-between font-normal"
                >
                  {stafDipilih
                    ? <span className="text-xs">{stafDipilih.nama} <span className="text-stone-400">· {stafDipilih.noIdStaf}</span></span>
                    : <span className="text-xs text-stone-400">Pilih staf…</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cari nama / no. ID…" value={cari} onValueChange={setCari} />
                  <CommandList>
                    <CommandEmpty>Tiada staf dijumpai.</CommandEmpty>
                    <CommandGroup>
                      {senCarian.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={`${s.nama} ${s.noIdStaf}`}
                          onSelect={() => { setStafId(s.id); setPopoverTerbuka(false); setCari(""); }}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs">{s.nama}</span>
                            <span className="text-[10px] text-stone-500">{s.noIdStaf} · {s.jawatan}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="text-xs font-semibold text-stone-600">Tarikh Mula</Label>
            <Input type="date" value={tarikhMula} onChange={(e) => setTarikhMula(e.target.value)} className="skeuo-input mt-1" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-stone-600">Tarikh Akhir</Label>
            <Input type="date" value={tarikhAkhir} onChange={(e) => setTarikhAkhir(e.target.value)} className="skeuo-input mt-1" />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={eksport} disabled={!data || data.rekod.length === 0} className="skeuo-btn-secondary h-9 gap-1.5">
              <Download size={15} /> CSV
            </Button>
          </div>
        </BarisPenapis>
        {/* Penapis jabatan & kategori (sisi klien) — disertakan untuk keseragaman */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 print:hidden">
          <PilihJabatan senarai={senJabatan} value={jabatanId} onChange={setJabatanId} />
          <PilihKategori value={kategori} onChange={setKategori} />
        </div>
      </div>

      {memuat ? (
        <div className="skeuo-card p-4"><SkeletonJadual /></div>
      ) : !data ? (
        <div className="skeuo-card p-4"><KeadaanKosong mesej="Pilih staf dan julat tarikh untuk melihat laporan individu." /></div>
      ) : (
        <>
          {/* Kad info staf */}
          <div className="skeuo-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                {data.staf.nama.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-stone-800">{data.staf.nama}</div>
                <div className="text-xs text-stone-500">
                  {data.staf.noIdStaf} · {data.staf.jawatan} · {namaJabatanStaf}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase text-stone-500">Julat</div>
                <div className="text-xs font-semibold text-stone-700">
                  {formatTarikhBM(tarikhMula)} — {formatTarikhBM(tarikhAkhir)}
                </div>
              </div>
            </div>
          </div>

          {/* Ringkasan */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: "Hadir", nilai: data.ringkasan.hadir, warna: "text-emerald-700" },
              { label: "Lewat", nilai: data.ringkasan.lewat, warna: "text-amber-600" },
              { label: "Cuti", nilai: data.ringkasan.cuti, warna: "text-sky-700" },
              { label: "Tidak Hadir", nilai: data.ringkasan.tidakHadir, warna: "text-rose-700" },
              { label: "Purata Jam", nilai: formatJamBekerja(data.ringkasan.purataJamBekerja), warna: "text-stone-800" },
            ].map((r) => (
              <div key={r.label} className="skeuo-card-inset p-3 text-center">
                <div className="text-[9px] uppercase tracking-wider text-stone-500 font-semibold">{r.label}</div>
                <div className={`text-base font-bold tabular-nums mt-0.5 ${r.warna}`}>{r.nilai}</div>
              </div>
            ))}
          </div>

          {/* Jadual rekod */}
          <div className="skeuo-card p-4">
            <h3 className="font-bold text-stone-800 text-sm flex items-center gap-1.5 mb-3">
              <CalendarDays size={15} className="text-stone-500" /> Rekod Kehadiran
              <span className="skeuo-pill bg-stone-200 text-stone-700 ml-2">{data.rekod.length} rekod</span>
            </h3>
            {data.rekod.length === 0 ? (
              <KeadaanKosong mesej="Tiada rekod kehadiran dalam julat tarikh ini." />
            ) : (
              <div className="max-h-[32rem] overflow-y-auto custom-scroll -mx-1 px-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Tarikh</TableHead>
                      <TableHead className="text-xs">Masa Masuk</TableHead>
                      <TableHead className="text-xs">Masa Keluar</TableHead>
                      <TableHead className="text-xs">Jam Bekerja</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Sebab Lewat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rekod.map((r) => {
                      const kelas = kelasStatusRingkas(r.status);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs tabular-nums">{formatTarikhBM(r.tarikh)}</TableCell>
                          <TableCell className="text-xs font-mono tabular-nums">{formatMasa(r.masaMasuk)}</TableCell>
                          <TableCell className="text-xs font-mono tabular-nums">{formatMasa(r.masaKeluar)}</TableCell>
                          <TableCell className="text-xs tabular-nums">{formatJamBekerja(r.jamBekerja)}</TableCell>
                          <TableCell>{pillStatus(r.status, kelas)}</TableCell>
                          <TableCell className="text-xs text-stone-600">{r.sebabLewat || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Tab Cuti (FR-E05)
// ============================================================
function TabCuti(props: {
  tahun: number;
  setTahun: (v: number) => void;
  jabatanId: string;
  senJabatan: JabatanRingkas[];
  setJabatanId: (v: string) => void;
  kategori: string;
  setKategori: (v: string) => void;
  setKategoriIds: Set<string> | null;
}) {
  const { tahun, setTahun, jabatanId, senJabatan, setJabatanId, kategori, setKategori, setKategoriIds } = props;
  const [data, setData] = useState<ResponsCuti | null>(null);
  const [memuat, setMemuat] = useState(true);

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const qs = new URLSearchParams({ tahun: String(tahun) });
      if (jabatanId !== "__SEMUA__") qs.set("jabatanId", jabatanId);
      const r = await apiFetch<ResponsCuti>(`/api/laporan/cuti?${qs.toString()}`);
      setData(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuatkan laporan cuti.");
      setData(null);
    } finally {
      setMemuat(false);
    }
  }, [tahun, jabatanId]);

  useEffect(() => { muat(); }, [muat]);

  // Senarai jenis cuti unik
  const senJenis = useMemo(() => {
    if (!data) return [] as { id: string; nama: string }[];
    const m = new Map<string, string>();
    for (const b of data.senarai) for (const bc of b.bakiCuti) {
      if (!m.has(bc.jenisCutiId)) m.set(bc.jenisCutiId, namaJenisCuti(bc.jenisCuti));
    }
    return Array.from(m.entries()).map(([id, nama]) => ({ id, nama }));
  }, [data]);

  const barisTapis = useMemo(() => {
    if (!data) return [];
    if (!setKategoriIds) return data.senarai;
    return data.senarai.filter((b) => setKategoriIds.has(b.stafId));
  }, [data, setKategoriIds]);

  function bakiStaf(baris: BarisCuti, jenisCutiId: string): { layak: number; digunakan: number; baki: number } {
    const entri = baris.bakiCuti.find((b) => b.jenisCutiId === jenisCutiId);
    if (!entri) return { layak: 0, digunakan: 0, baki: 0 };
    return {
      layak: entri.layak,
      digunakan: entri.digunakan,
      baki: entri.baki != null ? entri.baki : entri.layak - entri.digunakan,
    };
  }

  function eksport() {
    if (!data) return;
    const lajur = ["Nama", "Jabatan", ...senJenis.map((j) => j.nama + " (digunakan)"), ...senJenis.map((j) => j.nama + " (baki)")];
    const baris = barisTapis.map((b) => {
      const row: Record<string, unknown> = { Nama: b.nama, Jabatan: b.jabatan };
      for (const j of senJenis) {
        const v = bakiStaf(b, j.id);
        row[`${j.nama} (digunakan)`] = v.digunakan;
      }
      for (const j of senJenis) {
        const v = bakiStaf(b, j.id);
        row[`${j.nama} (baki)`] = v.baki;
      }
      return row;
    });
    eksportCSV(`laporan-cuti-${tahun}.csv`, lajur, baris);
  }

  const senTahun = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  return (
    <div className="space-y-4">
      <div className="skeuo-card p-4">
        <BarisPenapis>
          <div>
            <Label className="text-xs font-semibold text-stone-600">Tahun</Label>
            <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
              <SelectTrigger className="skeuo-input mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {senTahun.map((t) => (<SelectItem key={t} value={String(t)}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <PilihJabatan senarai={senJabatan} value={jabatanId} onChange={setJabatanId} />
          <PilihKategori value={kategori} onChange={setKategori} />
          <div className="flex items-end gap-2">
            <Button onClick={eksport} disabled={!data || barisTapis.length === 0} className="skeuo-btn-secondary h-9 gap-1.5">
              <Download size={15} /> CSV
            </Button>
          </div>
        </BarisPenapis>
      </div>

      <div className="skeuo-card p-4">
        <h3 className="font-bold text-stone-800 text-sm flex items-center gap-1.5 mb-3 print:hidden">
          <FileText size={15} className="text-stone-500" /> Laporan Baki Cuti — Tahun {tahun}
          <span className="skeuo-pill bg-stone-200 text-stone-700 ml-2">{barisTapis.length} staf</span>
        </h3>
        <div className="text-center hidden print:block mb-3">
          <div className="text-base font-bold text-stone-800">SRI Al-Amin Gombak</div>
          <div className="text-sm font-semibold text-stone-700 mt-1">Laporan Baki Cuti — Tahun {tahun}</div>
        </div>

        {memuat ? (
          <SkeletonJadual />
        ) : barisTapis.length === 0 ? (
          <KeadaanKosong mesej="Tiada data cuti dijumpai untuk penapis ini." />
        ) : (
          <div className="max-h-[34rem] overflow-auto custom-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sticky left-0 bg-stone-50 min-w-[160px]">Staf</TableHead>
                  <TableHead className="text-xs min-w-[120px]">Jawatan</TableHead>
                  {senJenis.map((j) => (
                    <TableHead key={j.id} className="text-xs text-center min-w-[110px]">{j.nama}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {barisTapis.map((b) => (
                  <TableRow key={b.stafId}>
                    <TableCell className="text-xs sticky left-0 bg-white">
                      <div className="font-medium text-stone-800">{b.nama}</div>
                      <div className="text-[10px] text-stone-500">{b.jabatan}</div>
                    </TableCell>
                    <TableCell className="text-xs text-stone-600">{b.jabatan}</TableCell>
                    {senJenis.map((j) => {
                      const v = bakiStaf(b, j.id);
                      const bakiKritikal = v.baki <= 0;
                      return (
                        <TableCell key={j.id} className="text-center text-xs">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-semibold text-stone-800 tabular-nums">
                              {v.digunakan} / {v.layak}
                            </span>
                            <span className={`text-[9px] tabular-nums ${bakiKritikal ? "text-rose-600 font-semibold" : "text-stone-500"}`}>
                              (baki {v.baki.toFixed(1)})
                            </span>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

export default LaporanView;
