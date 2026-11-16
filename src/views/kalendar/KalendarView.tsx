"use client";

// KalendarView (FR-F03) — Sistem Rekod Kehadiran Guru & Staf SRI Al-Amin Gombak.
// Kalendar Cuti: admin boleh tambah/padam; semua peranan boleh lihat.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays, Loader2, Lock, Plus, Trash2,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import {
  formatTarikhBM, namaHariBM, NAMA_BULAN_SINGKAT, NAMA_HARI,
} from "@/lib/domain";
import type { Kalendar } from "@/lib/types";

type JenisCuti = Kalendar["jenis"];

const TAHUN_PILIHAN = [2025, 2026, 2027];

const JENIS_WARNA: Record<JenisCuti, { bg: string; text: string; dot: string; label: string }> = {
  CutiUmum: { bg: "bg-sky-100", text: "text-sky-800", dot: "bg-sky-600", label: "Cuti Umum" },
  CutiSekolah: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500", label: "Cuti Sekolah" },
  HariKhas: { bg: "bg-violet-100", text: "text-violet-800", dot: "bg-violet-600", label: "Hari Khas" },
};

function PilJenis({ jenis }: { jenis: JenisCuti }) {
  const w = JENIS_WARNA[jenis];
  return (
    <span className={`skeuo-pill ${w.bg} ${w.text}`}>
      <span className={`led ${w.dot}`} />
      {w.label}
    </span>
  );
}

interface FormCuti {
  tarikh: string;
  nama: string;
  jenis: JenisCuti;
}

const FORM_KOSONG: FormCuti = { tarikh: "", nama: "", jenis: "CutiUmum" };

// Tukar "YYYY-MM-DD" -> Date tempatan tengah malam
function tarikhDariISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function KalendarView() {
  const { staf: pengguna } = useAuth();
  const isAdmin = pengguna?.peranan === "Admin";

  const tahunSekarang = new Date().getFullYear();
  const tahunAwal = TAHUN_PILIHAN.includes(tahunSekarang) ? tahunSekarang : 2026;

  const [tahun, setTahun] = useState<number>(tahunAwal);
  const [senarai, setSenarai] = useState<Kalendar[]>([]);
  const [memuat, setMemuat] = useState(true);

  const [dialogBuka, setDialogBuka] = useState(false);
  const [form, setForm] = useState<FormCuti>(FORM_KOSONG);
  const [hantar, setHantar] = useState(false);

  const [padamId, setPadamId] = useState<string | null>(null);
  const [memproses, setMemproses] = useState(false);

  const muatData = useCallback(async () => {
    setMemuat(true);
    try {
      const r = await apiFetch<{ senarai: Kalendar[]; tahun: number }>(
        `/api/kalendar?tahun=${tahun}`,
      );
      setSenarai(r.senarai || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuatkan kalendar cuti.");
    } finally {
      setMemuat(false);
    }
  }, [tahun]);

  useEffect(() => { muatData(); }, [muatData]);

  // ---------- Peta tarikh -> entri (untuk kalendar visual) ----------
  const petaTarikh = useMemo(() => {
    const m = new Map<string, Kalendar>();
    for (const k of senarai) {
      m.set(k.tarikh.slice(0, 10), k);
    }
    return m;
  }, [senarai]);

  // ---------- Tambah cuti ----------
  function bukaTambah() {
    setForm({ ...FORM_KOSONG, tarikh: `${tahun}-01-01` });
    setDialogBuka(true);
  }

  function tutupDialog() {
    setDialogBuka(false);
    setForm(FORM_KOSONG);
    setHantar(false);
  }

  async function hantarFn() {
    if (!form.tarikh || !form.nama.trim()) {
      toast.error("Tarikh dan Nama cuti diperlukan.");
      return;
    }
    setHantar(true);
    try {
      await apiFetch("/api/kalendar", {
        method: "POST",
        body: JSON.stringify({
          tarikh: form.tarikh,
          nama: form.nama.trim(),
          jenis: form.jenis,
        }),
      });
      toast.success(`Cuti ${form.nama.trim()} pada ${formatTarikhBM(form.tarikh)} telah ditambah.`);
      tutupDialog();
      await muatData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah cuti.");
    } finally {
      setHantar(false);
    }
  }

  async function padamCuti() {
    if (!padamId) return;
    setMemproses(true);
    try {
      await apiFetch(`/api/kalendar/${padamId}`, { method: "DELETE" });
      toast.success("Entri kalendar telah dipadam.");
      setPadamId(null);
      await muatData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memadam entri.");
    } finally {
      setMemproses(false);
    }
  }

  // ---------- Grid tahun (12 bulan x ~31 hari) ----------
  const gridBulan = useMemo(() => {
    return Array.from({ length: 12 }).map((_, bulanIdx) => {
      const bilHari = new Date(tahun, bulanIdx + 1, 0).getDate();
      const hari = Array.from({ length: bilHari }).map((__, hariKe) => {
        const d = new Date(tahun, bulanIdx, hariKe + 1);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const entri = petaTarikh.get(iso);
        return { d, iso, entri };
      });
      return { bulanIdx, hari };
    });
  }, [tahun, petaTarikh]);

  const entriPadam = useMemo(
    () => senarai.find((k) => k.id === padamId) ?? null,
    [senarai, padamId],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="skeuo-panel p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
              <CalendarDays size={14} /> Kalendar Cuti
            </div>
            <div className="text-lg sm:text-xl font-bold text-stone-800">
              Cuti Umum, Cuti Sekolah &amp; Hari Khas
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              Senarai cuti &amp; hari penting untuk tahun {tahun}.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-stone-600">Tahun</Label>
              <Select value={String(tahun)} onValueChange={(v) => setTahun(Number(v))}>
                <SelectTrigger className="skeuo-input w-28 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAHUN_PILIHAN.map((t) => (
                    <SelectItem key={t} value={String(t)}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <Button onClick={bukaTambah} className="skeuo-btn h-9 px-4 gap-1.5">
                <Plus size={15} /> Tambah Cuti
              </Button>
            )}
          </div>
        </div>

        {/* Petunjung warna */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {Object.entries(JENIS_WARNA).map(([k, w]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${w.dot}`} />
              <span className="text-xs text-stone-600">{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Jadual senarai cuti */}
      <div className="skeuo-card p-0 overflow-hidden">
        <div className="max-h-[45vh] overflow-y-auto custom-scroll">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-stone-50">
              <TableRow className="border-stone-200 hover:bg-stone-50">
                <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Tarikh</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Hari</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Nama</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-stone-500">Jenis</TableHead>
                {isAdmin && (
                  <TableHead className="text-[11px] uppercase tracking-wider text-stone-500 text-right">Tindakan</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {memuat ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: isAdmin ? 5 : 4 }).map((__, j) => (
                      <TableCell key={`skc-${i}-${j}`}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : senarai.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-stone-500 py-12">
                    <CalendarDays className="mx-auto mb-2 text-stone-300" size={28} />
                    Tiada entri kalendar cuti untuk tahun {tahun}.
                  </TableCell>
                </TableRow>
              ) : (
                senarai.map((k) => {
                  const d = tarikhDariISO(k.tarikh);
                  return (
                    <TableRow key={k.id} className="border-stone-100">
                      <TableCell className="font-mono text-sm text-stone-700">{formatTarikhBM(d)}</TableCell>
                      <TableCell className="text-stone-700">{namaHariBM(d)}</TableCell>
                      <TableCell className="font-semibold text-stone-800">{k.nama}</TableCell>
                      <TableCell><PilJenis jenis={k.jenis} /></TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPadamId(k.id)}
                            className="h-8 px-2 gap-1 text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 size={13} /> Padam
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Kalendar visual tahunan */}
      <div className="skeuo-card p-4">
        <div className="text-sm font-semibold text-stone-800 mb-3">
          Kalendar Tahunan {tahun}
        </div>
        {memuat ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={`gsk-${i}`} className="h-40 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {gridBulan.map(({ bulanIdx, hari }) => (
              <div key={bulanIdx} className="skeuo-card-inset p-3">
                <div className="text-xs font-semibold text-stone-700 mb-2">
                  {NAMA_BULAN_SINGKAT[bulanIdx]} {tahun}
                </div>
                {/* Header hari: Isnin..Ahad (mula Ahad supaya sejajar dengan getDay) */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {NAMA_HARI.map((h) => (
                    <div key={h} className="text-[9px] text-center text-stone-400 font-medium">
                      {h.slice(0, 1)}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    // Pad sel kosong di awal supaya hari 1 berada pada kolum getDay() yang betul
                    const sel: (typeof hari[number] | null)[] = [];
                    const hariPertama = hari[0]?.d.getDay() ?? 0; // 0=Ahad
                    for (let p = 0; p < hariPertama; p++) sel.push(null);
                    for (const h of hari) sel.push(h);
                    return sel.map((s, idx) => {
                      if (!s) return <div key={`pad-${idx}`} />;
                      const entri = s.entri;
                      const w = entri ? JENIS_WARNA[entri.jenis] : null;
                      return (
                        <div
                          key={s.iso}
                          title={
                            entri
                              ? `${formatTarikhBM(s.d)} — ${entri.nama} (${JENIS_WARNA[entri.jenis].label})`
                              : `${formatTarikhBM(s.d)} — ${namaHariBM(s.d)}`
                          }
                          className={[
                            "h-6 w-full rounded text-[10px] flex items-center justify-center",
                            "tabular-nums cursor-default",
                            entri
                              ? `${w!.bg} ${w!.text} font-semibold ring-1 ring-inset ring-stone-200`
                              : "text-stone-500 hover:bg-stone-100",
                          ].join(" ")}
                        >
                          {s.d.getDate()}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Akses tidak sah */}
      {!isAdmin && pengguna && (
        <div className="sr-only">
          <Lock /> Anda hanya boleh melihat kalendar cuti. Tindakan tambah/padam dihadkan kepada Pentadbir.
        </div>
      )}

      {/* Dialog tambah cuti */}
      <Dialog open={dialogBuka} onOpenChange={(o) => { if (!o) tutupDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Cuti Baharu</DialogTitle>
            <DialogDescription>
              Tambah entri cuti umum, cuti sekolah atau hari khas untuk tahun {tahun}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold text-stone-600">Tarikh *</Label>
              <Input
                type="date"
                value={form.tarikh}
                onChange={(e) => setForm({ ...form, tarikh: e.target.value })}
                className="skeuo-input mt-1"
              />
              {form.tarikh && (
                <p className="text-[11px] text-stone-500 mt-1">
                  {namaHariBM(tarikhDariISO(form.tarikh))}, {formatTarikhBM(form.tarikh)}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">Nama Cuti *</Label>
              <Input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="skeuo-input mt-1"
                placeholder="cth: Hari Kebangsaan"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-stone-600">Jenis</Label>
              <Select
                value={form.jenis}
                onValueChange={(v) => setForm({ ...form, jenis: v as JenisCuti })}
              >
                <SelectTrigger className="skeuo-input mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CutiUmum">Cuti Umum</SelectItem>
                  <SelectItem value="CutiSekolah">Cuti Sekolah</SelectItem>
                  <SelectItem value="HariKhas">Hari Khas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={tutupDialog} className="h-9">Batal</Button>
            <Button
              onClick={hantarFn}
              disabled={hantar}
              className="skeuo-btn h-9 gap-1.5"
            >
              {hantar && <Loader2 size={15} className="animate-spin" />}
              Tambah Cuti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pengesahan padam */}
      <AlertDialog
        open={!!padamId}
        onOpenChange={(o) => { if (!o) setPadamId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Padam Entri Kalendar?</AlertDialogTitle>
            <AlertDialogDescription>
              {entriPadam ? (
                <>
                  Entri <strong>{entriPadam.nama}</strong> pada{" "}
                  {formatTarikhBM(tarikhDariISO(entriPadam.tarikh))} akan dipadam secara kekal.
                  Tindakan ini tidak boleh diundur.
                </>
              ) : (
                "Entri ini akan dipadam secara kekal."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9" disabled={memproses}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="h-9 gap-1.5 skeuo-btn-danger"
              disabled={memproses}
              onClick={(e) => {
                e.preventDefault();
                padamCuti();
              }}
            >
              {memproses && <Loader2 size={15} className="animate-spin" />}
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default KalendarView;
