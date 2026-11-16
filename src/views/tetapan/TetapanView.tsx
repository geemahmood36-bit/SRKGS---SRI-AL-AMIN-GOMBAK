"use client";

// TetapanView (FR-F04, FR-F06, FR-H02) — Sistem Rekod Kehadiran Guru & Staf SRI Al-Amin Gombak.
// Pentadbir sahaja: konfigurasi waktu kerja, mod Ramadan, aliran kelulusan, jenis cuti, dan set semula data demo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, Loader2, Lock, PencilLine, Plus, RotateCcw, Save,
} from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { NAMA_HARI } from "@/lib/domain";
import type { JenisCuti, Tetapan } from "@/lib/types";

const HARI_SINGKAT = ["Ahd", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"];
const DEFAULT_HARI_BEKERJA = [1, 2, 3, 4, 5]; // Isnin-Jumaat
const MEDAN_KOSONG: TetapanForm = {
  waktuMasuk: "07:30",
  bertolakAnsurMinit: 10,
  waktuTamat: "16:00",
  waktuTamatJumaat: "11:30",
  hariBekerja: DEFAULT_HARI_BEKERJA,
  ramadanAktif: false,
  ramadanMula: "",
  ramadanTamat: "",
  ramadanMasukWaktu: "08:00",
  ramadanTamatWaktu: "13:00",
  aliranDuaPeringkat: false,
};

interface TetapanForm {
  waktuMasuk: string;
  bertolakAnsurMinit: number;
  waktuTamat: string;
  waktuTamatJumaat: string;
  hariBekerja: number[];
  ramadanAktif: boolean;
  ramadanMula: string;
  ramadanTamat: string;
  ramadanMasukWaktu: string;
  ramadanTamatWaktu: string;
  aliranDuaPeringkat: boolean;
}

interface FormJenisCuti {
  nama: string;
  kelayakanTahunan: number;
  perluLampiran: boolean;
}

const JENIS_KOSONG: FormJenisCuti = { nama: "", kelayakanTahunan: 0, perluLampiran: false };

// Tukar tarikh Date → YYYY-MM-DD untuk input[type=date]
function isoTarikh(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  const off = dt.getTimezoneOffset();
  const local = new Date(dt.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

// Tukar string PRD hari (1=Isnin..7=Ahad) pisah koma → array nombor
function parseHari(s: string): number[] {
  return s.split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n));
}

export default function TetapanView() {
  const { staf } = useAuth();
  const hanyaBaca = staf?.peranan !== "Admin";

  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [form, setForm] = useState<TetapanForm>(MEDAN_KOSONG);

  // Jenis cuti
  const [senaraiJenis, setSenaraiJenis] = useState<JenisCuti[]>([]);
  const [memuatJenis, setMemuatJenis] = useState(true);
  const [dialogJenis, setDialogJenis] = useState(false);
  const [editJenis, setEditJenis] = useState<JenisCuti | null>(null);
  const [formJenis, setFormJenis] = useState<FormJenisCuti>(JENIS_KOSONG);
  const [menyimpanJenis, setMenyimpanJenis] = useState(false);

  // Set semula data demo
  const [pengesahan, setPengesahan] = useState("");
  const [dialogReset, setDialogReset] = useState(false);
  const [menetapkan, setMenetapkan] = useState(false);

  const muatTetapan = useCallback(async () => {
    setMemuat(true);
    try {
      const r = await apiFetch<{ tetapan: Tetapan & { ramadanMula?: string | null; ramadanTamat?: string | null } }>(
        "/api/tetapan"
      );
      const t = r.tetapan;
      setForm({
        waktuMasuk: t.waktuMasuk || "07:30",
        bertolakAnsurMinit: t.bertolakAnsurMinit ?? 10,
        waktuTamat: t.waktuTamat || "16:00",
        waktuTamatJumaat: t.waktuTamatJumaat || "11:30",
        hariBekerja: parseHari(t.hariBekerja || "1,2,3,4,5"),
        ramadanAktif: Boolean(t.ramadanAktif),
        ramadanMula: isoTarikh(t.ramadanMula),
        ramadanTamat: isoTarikh(t.ramadanTamat),
        ramadanMasukWaktu: t.ramadanMasukWaktu || "08:00",
        ramadanTamatWaktu: t.ramadanTamatWaktu || "13:00",
        aliranDuaPeringkat: Boolean(t.aliranDuaPeringkat),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuatkan tetapan.");
    } finally {
      setMemuat(false);
    }
  }, []);

  const muatJenis = useCallback(async () => {
    setMemuatJenis(true);
    try {
      const r = await apiFetch<{ senarai: JenisCuti[] }>("/api/jenis-cuti");
      setSenaraiJenis(r.senarai);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuatkan jenis cuti.");
    } finally {
      setMemuatJenis(false);
    }
  }, []);

  useEffect(() => {
    muatTetapan();
    muatJenis();
  }, [muatTetapan, muatJenis]);

  const kemaskini = <K extends keyof TetapanForm>(k: K, v: TetapanForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const togolHari = (hari: number) => {
    setForm((f) => {
      const ada = f.hariBekerja.includes(hari);
      const set = ada
        ? f.hariBekerja.filter((h) => h !== hari)
        : [...f.hariBekerja, hari].sort((a, b) => a - b);
      return { ...f, hariBekerja: set };
    });
  };

  const simpanTetapan = async () => {
    setMenyimpan(true);
    try {
      const badan = {
        waktuMasuk: form.waktuMasuk,
        bertolakAnsurMinit: Number(form.bertolakAnsurMinit),
        waktuTamat: form.waktuTamat,
        waktuTamatJumaat: form.waktuTamatJumaat,
        hariBekerja: form.hariBekerja.join(","),
        ramadanAktif: form.ramadanAktif,
        ramadanMula: form.ramadanMula || null,
        ramadanTamat: form.ramadanTamat || null,
        ramadanMasukWaktu: form.ramadanMasukWaktu,
        ramadanTamatWaktu: form.ramadanTamatWaktu,
        aliranDuaPeringkat: form.aliranDuaPeringkat,
      };
      await apiFetch<{ tetapan: Tetapan }>("/api/tetapan", {
        method: "PUT",
        body: JSON.stringify(badan),
      });
      toast.success("Tetapan berjaya disimpan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan tetapan.");
    } finally {
      setMenyimpan(false);
    }
  };

  const bukaDialogTambah = () => {
    setEditJenis(null);
    setFormJenis(JENIS_KOSONG);
    setDialogJenis(true);
  };

  const bukaDialogUbah = (j: JenisCuti) => {
    setEditJenis(j);
    setFormJenis({
      nama: j.nama,
      kelayakanTahunan: j.kelayakanTahunan,
      perluLampiran: j.perluLampiran,
    });
    setDialogJenis(true);
  };

  const simpanJenis = async () => {
    if (!formJenis.nama.trim()) {
      toast.error("Nama jenis cuti diperlukan.");
      return;
    }
    setMenyimpanJenis(true);
    try {
      const badan = {
        nama: formJenis.nama.trim(),
        kelayakanTahunan: Number(formJenis.kelayakanTahunan) || 0,
        perluLampiran: Boolean(formJenis.perluLampiran),
      };
      if (editJenis) {
        await apiFetch<{ jenisCuti: JenisCuti }>(`/api/jenis-cuti/${editJenis.id}`, {
          method: "PUT",
          body: JSON.stringify(badan),
        });
        toast.success("Jenis cuti dikemaskini.");
      } else {
        await apiFetch<{ jenisCuti: JenisCuti }>("/api/jenis-cuti", {
          method: "POST",
          body: JSON.stringify(badan),
        });
        toast.success("Jenis cuti ditambah.");
      }
      setDialogJenis(false);
      muatJenis();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan jenis cuti.");
    } finally {
      setMenyimpanJenis(false);
    }
  };

  const sahReset = async () => {
    setMenetapkan(true);
    try {
      await apiFetch<{ ok: boolean; mesej: string }>("/api/data/reset", {
        method: "POST",
        body: JSON.stringify({ pengesahan: "SET SEMULA" }),
      });
      toast.success("Data demo telah diset semula. Memuatkan semula...");
      setDialogReset(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menetapkan semula data.");
    } finally {
      setMenetapkan(false);
    }
  };

  const bolehReset = pengesahan.trim() === "SET SEMULA";

  const ringkasanTetapan = useMemo(() => {
    if (memuat) return null;
    const hariLabel = form.hariBekerja
      .slice()
      .sort((a, b) => a - b)
      .map((h) => NAMA_HARI[h === 7 ? 0 : h].slice(0, 3))
      .join(", ");
    return hariLabel;
  }, [form.hariBekerja, memuat]);

  if (memuat) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <div className="skeuo-card p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="skeuo-card p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Tetapan Sistem</h1>
          <p className="text-sm text-stone-600">
            Konfigurasi waktu kerja, mod Ramadan, aliran kelulusan dan jenis cuti.
          </p>
        </div>
        {hanyaBaca && (
          <span className="inline-flex items-center gap-2 skeuo-pill bg-amber-100 text-amber-800">
            <Lock className="h-3 w-3" />
            Mod lihat sahaja
          </span>
        )}
      </header>

      {/* Seksyen 1: Waktu Kerja */}
      <section className="skeuo-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">Waktu Kerja</h2>
          <span className="text-xs text-stone-500">Hari bekerja: {ringkasanTetapan ?? "—"}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="waktuMasuk">Waktu Masuk</Label>
            <Input
              id="waktuMasuk"
              type="time"
              className="skeuo-input"
              value={form.waktuMasuk}
              disabled={hanyaBaca}
              onChange={(e) => kemaskini("waktuMasuk", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bertolakAnsurMinit">Bertolak Ansur (minit)</Label>
            <Input
              id="bertolakAnsurMinit"
              type="number"
              min={0}
              max={120}
              className="skeuo-input"
              value={form.bertolakAnsurMinit}
              disabled={hanyaBaca}
              onChange={(e) => kemaskini("bertolakAnsurMinit", Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waktuTamat">Waktu Tamat (Isnin–Khamis)</Label>
            <Input
              id="waktuTamat"
              type="time"
              className="skeuo-input"
              value={form.waktuTamat}
              disabled={hanyaBaca}
              onChange={(e) => kemaskini("waktuTamat", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waktuTamatJumaat">Waktu Tamat (Jumaat)</Label>
            <Input
              id="waktuTamatJumaat"
              type="time"
              className="skeuo-input"
              value={form.waktuTamatJumaat}
              disabled={hanyaBaca}
              onChange={(e) => kemaskini("waktuTamatJumaat", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Hari Bekerja</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {HARI_SINGKAT.map((label, idx) => {
              // idx 0=Ahad(7) ... 6=Sabtu(6). Konversi ke nombor PRD.
              const prd = idx === 0 ? 7 : idx;
              const dipilih = form.hariBekerja.includes(prd);
              return (
                <label
                  key={prd}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer select-none ${
                    dipilih
                      ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                      : "bg-stone-50 border-stone-300 text-stone-600"
                  } ${hanyaBaca ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <Checkbox
                    checked={dipilih}
                    disabled={hanyaBaca}
                    onCheckedChange={() => togolHari(prd)}
                  />
                  <span className="text-sm font-medium">{NAMA_HARI[idx]}</span>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      {/* Seksyen 2: Mod Ramadan */}
      <section className="skeuo-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">Mod Ramadan</h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="ramadanAktif" className="text-sm">Aktif</Label>
            <Switch
              id="ramadanAktif"
              checked={form.ramadanAktif}
              disabled={hanyaBaca}
              onCheckedChange={(v) => kemaskini("ramadanAktif", v)}
            />
          </div>
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${form.ramadanAktif ? "" : "opacity-60"}`}>
          <div className="space-y-1.5">
            <Label htmlFor="ramadanMula">Tarikh Mula</Label>
            <Input
              id="ramadanMula"
              type="date"
              className="skeuo-input"
              value={form.ramadanMula}
              disabled={hanyaBaca || !form.ramadanAktif}
              onChange={(e) => kemaskini("ramadanMula", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ramadanTamat">Tarikh Tamat</Label>
            <Input
              id="ramadanTamat"
              type="date"
              className="skeuo-input"
              value={form.ramadanTamat}
              disabled={hanyaBaca || !form.ramadanAktif}
              onChange={(e) => kemaskini("ramadanTamat", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ramadanMasukWaktu">Waktu Masuk Ramadan</Label>
            <Input
              id="ramadanMasukWaktu"
              type="time"
              className="skeuo-input"
              value={form.ramadanMasukWaktu}
              disabled={hanyaBaca || !form.ramadanAktif}
              onChange={(e) => kemaskini("ramadanMasukWaktu", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ramadanTamatWaktu">Waktu Tamat Ramadan</Label>
            <Input
              id="ramadanTamatWaktu"
              type="time"
              className="skeuo-input"
              value={form.ramadanTamatWaktu}
              disabled={hanyaBaca || !form.ramadanAktif}
              onChange={(e) => kemaskini("ramadanTamatWaktu", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Seksyen 3: Aliran Kelulusan */}
      <section className="skeuo-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-800">Aliran Kelulusan Cuti</h2>
            <p className="text-sm text-stone-600">
              {form.aliranDuaPeringkat
                ? "Dua peringkat: Penyelia → Pengetua"
                : "Satu peringkat: Pengetua sahaja"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="aliranDuaPeringkat" className="text-sm">Dua Peringkat</Label>
            <Switch
              id="aliranDuaPeringkat"
              checked={form.aliranDuaPeringkat}
              disabled={hanyaBaca}
              onCheckedChange={(v) => kemaskini("aliranDuaPeringkat", v)}
            />
          </div>
        </div>
      </section>

      {/* Butang simpan untuk Seksyen 1-3 */}
      {!hanyaBaca && (
        <div className="flex justify-end">
          <Button
            className="skeuo-btn px-5"
            disabled={menyimpan}
            onClick={simpanTetapan}
          >
            {menyimpan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Tetapan
          </Button>
        </div>
      )}

      {/* Seksyen 4: Jenis Cuti */}
      <section className="skeuo-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-800">Jenis Cuti</h2>
          {!hanyaBaca && (
            <Button className="skeuo-btn-secondary px-4" onClick={bukaDialogTambah}>
              <Plus className="h-4 w-4" />
              Tambah Jenis Cuti
            </Button>
          )}
        </div>
        {memuatJenis ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : senaraiJenis.length === 0 ? (
          <div className="text-center py-8 text-stone-500">
            <p className="text-sm">Tiada jenis cuti didaftarkan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scroll max-h-96 rounded-md border border-stone-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-100 hover:bg-stone-100">
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-48">Kelayakan Tahunan (hari)</TableHead>
                  <TableHead className="w-40">Perlu Lampiran</TableHead>
                  {!hanyaBaca && <TableHead className="w-24 text-right">Tindakan</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {senaraiJenis.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium text-stone-800">{j.nama}</TableCell>
                    <TableCell>{j.kelayakanTahunan}</TableCell>
                    <TableCell>
                      {j.perluLampiran ? (
                        <span className="skeuo-pill bg-amber-100 text-amber-800">Ya</span>
                      ) : (
                        <span className="text-stone-500 text-sm">Tidak</span>
                      )}
                    </TableCell>
                    {!hanyaBaca && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="skeuo-btn-secondary px-3"
                          onClick={() => bukaDialogUbah(j)}
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          Ubah
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Seksyen 5: Set Semula Data Demo (FR-H02) */}
      {!hanyaBaca && (
        <section className="skeuo-card p-6 space-y-4 border-2 border-rose-400">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-rose-100 p-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-rose-800">Set Semula Data Demo</h2>
              <p className="text-sm text-stone-700 mt-1">
                Tindakan ini akan <strong>memadam semua data semasa</strong> dan menggantikan
                dengan data demo asal. Ia tidak boleh dikembalikan. Pastikan anda membuat
                sandaran sebelum meneruskan.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pengesahan">
              Untuk meneruskan, taip <strong className="text-rose-700">SET SEMULA</strong> dalam ruangan di bawah:
            </Label>
            <Input
              id="pengesahan"
              className="skeuo-input max-w-xs"
              placeholder="SET SEMULA"
              value={pengesahan}
              onChange={(e) => setPengesahan(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button
              className="skeuo-btn-danger px-5"
              disabled={!bolehReset || menetapkan}
              onClick={() => setDialogReset(true)}
            >
              <RotateCcw className="h-4 w-4" />
              Set Semula Data
            </Button>
          </div>
        </section>
      )}

      {/* Dialog Tambah/Ubah Jenis Cuti */}
      <Dialog open={dialogJenis} onOpenChange={setDialogJenis}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editJenis ? "Ubah Jenis Cuti" : "Tambah Jenis Cuti"}</DialogTitle>
            <DialogDescription>
              {editJenis
                ? "Kemaskini maklumat jenis cuti."
                : "Daftarkan jenis cuti baru untuk staf."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="jc-nama">Nama Jenis Cuti</Label>
              <Input
                id="jc-nama"
                className="skeuo-input"
                placeholder="cth: Cuti Tahunan"
                value={formJenis.nama}
                onChange={(e) => setFormJenis((f) => ({ ...f, nama: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jc-kelayakan">Kelayakan Tahunan (hari)</Label>
              <Input
                id="jc-kelayakan"
                type="number"
                min={0}
                className="skeuo-input"
                value={formJenis.kelayakanTahunan}
                onChange={(e) => setFormJenis((f) => ({ ...f, kelayakanTahunan: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center gap-3 rounded-md border border-stone-200 p-3">
              <Switch
                id="jc-lampiran"
                checked={formJenis.perluLampiran}
                onCheckedChange={(v) => setFormJenis((f) => ({ ...f, perluLampiran: v }))}
              />
              <div>
                <Label htmlFor="jc-lampiran" className="text-sm">Perlu Lampiran</Label>
                <p className="text-xs text-stone-500">Pemohon wmuatt naik dokumen sokongan.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogJenis(false)}>Batal</Button>
            <Button className="skeuo-btn px-4" disabled={menyimpanJenis} onClick={simpanJenis}>
              {menyimpanJenis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Set Semula */}
      <AlertDialog open={dialogReset} onOpenChange={setDialogReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pengesahan Set Semula Data</AlertDialogTitle>
            <AlertDialogDescription>
              Adakah anda pasti? Semua rekod kehadiran, cuti, jenis cuti, dan tetapan
              akan dipadam dan digantikan dengan data demo asal. Tindakan ini
              <strong> tidak boleh dikembalikan</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="skeuo-btn-danger"
              disabled={menetapkan}
              onClick={(e) => {
                e.preventDefault();
                sahReset();
              }}
            >
              {menetapkan ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Ya, Set Semula
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
