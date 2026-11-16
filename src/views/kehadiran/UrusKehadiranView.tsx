"use client";

// UrusKehadiranView (FR-B07, FR-B08) — Admin sahaja.
// Pengurusan rekod kehadiran semua staf + Tutup Hari.
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList, Loader2, Lock, Pencil, Search, Users,
} from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  WARNA_STATUS, formatMasa, formatTarikhBM, isoTarikh, namaHariBM,
} from "@/lib/domain";
import type { Jabatan, Kehadiran, Staf, StatusKehadiran } from "@/lib/types";

interface JabatanRingkas { id: string; nama: string; kod: string; bilStaf?: number }

const SEMUA_STATUS: StatusKehadiran[] = [
  "Hadir", "Lewat", "TidakHadir", "Cuti", "TugasRasmi", "CutiUmum",
];

// Pasangan staf + kehadiran (jika ada)
interface BarisStaf {
  staf: Staf;
  rekod: Kehadiran | null;
}

interface FormPinda {
  status: StatusKehadiran;
  masaMasuk: string;   // "HH:MM" atau ""
  masaKeluar: string;  // "HH:MM" atau ""
  sebabLewat: string;
  catatan: string;
  alasan: string;
}

const FORM_KOSONG: FormPinda = {
  status: "Hadir",
  masaMasuk: "",
  masaKeluar: "",
  sebabLewat: "",
  catatan: "",
  alasan: "",
};

function masaDariISO(s: string | null | undefined): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function UrusKehadiranView() {
  const { staf } = useAuth();
  const hariIni = new Date();
  const [tarikh, setTarikh] = useState(isoTarikh(hariIni));
  const [jabatanId, setJabatanId] = useState<string>("__SEMUA__");
  const [senJabatan, setSenJabatan] = useState<JabatanRingkas[]>([]);
  const [senStaf, setSenStaf] = useState<Staf[]>([]);
  const [petaKehadiran, setPetaKehadiran] = useState<Map<string, Kehadiran>>(new Map());
  const [cari, setCari] = useState("");
  const [memuat, setMemuat] = useState(true);

  // Modal pinda
  const [pindaStaf, setPindaStaf] = useState<Staf | null>(null);
  const [pindaForm, setPindaForm] = useState<FormPinda>(FORM_KOSONG);
  const [hantarPinda, setHantarPinda] = useState(false);

  // Modal tutup hari
  const [tutupTerbuka, setTutupTerbuka] = useState(false);
  const [menjalankanTutup, setMenjalankanTutup] = useState(false);

  // Akses (ditangguh selepas semua hook dipanggil)
  // Muat jabatan sekali
  useEffect(() => {
    (async () => {
      try {
        const r = await apiFetch<{ senarai: JabatanRingkas[] }>("/api/jabatan");
        setSenJabatan(r.senarai || []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuatkan jabatan.");
      }
    })();
  }, []);

  const muatData = useCallback(async () => {
    if (!tarikh) return;
    setMemuat(true);
    try {
      const params = new URLSearchParams({ aktif: "true" });
      // kecualikan akaun Kiosk
      const r = await apiFetch<{ senarai: Staf[] }>(`/api/staf?${params.toString()}`);
      const semua = (r.senarai || []).filter((s) => s.peranan !== "Kiosk");
      setSenStaf(semua);

      // kehadiran untuk tarikh ini — gunakan tarikhMula=tarikhAkhir
      const k = await apiFetch<{ senarai: Kehadiran[] }>(
        `/api/kehadiran?tarikhMula=${tarikh}&tarikhAkhir=${tarikh}`,
      );
      const m = new Map<string, Kehadiran>();
      for (const rek of k.senarai || []) m.set(rek.stafId, rek);
      setPetaKehadiran(m);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Gagal memuatkan data kehadiran.";
      toast.error(m);
    } finally {
      setMemuat(false);
    }
  }, [tarikh]);

  useEffect(() => { muatData(); }, [muatData]);

  // Pasangkan staf dengan rekod kehadiran & tapis jabatan/carian
  const baris: BarisStaf[] = useMemo(() => {
    const kata = cari.trim().toLowerCase();
    return senStaf
      .filter((s) => jabatanId === "__SEMUA__" ? true : (s.jabatanId || "") === jabatanId)
      .filter((s) => {
        if (!kata) return true;
        return (
          s.nama.toLowerCase().includes(kata) ||
          s.noIdStaf.toLowerCase().includes(kata) ||
          (s.jawatan || "").toLowerCase().includes(kata)
        );
      })
      .map((staf) => ({ staf, rekod: petaKehadiran.get(staf.id) || null }));
  }, [senStaf, petaKehadiran, jabatanId, cari]);

  // Ringkasan ringkas
  const ringkasan = useMemo(() => {
    const kiraan: Record<StatusKehadiran | "Belum", number> = {
      Hadir: 0, Lewat: 0, TidakHadir: 0, Cuti: 0, TugasRasmi: 0, CutiUmum: 0, Belum: 0,
    };
    for (const b of baris) {
      if (!b.rekod) kiraan.Belum += 1;
      else kiraan[b.rekod.status] += 1;
    }
    return kiraan;
  }, [baris]);

  function bukaPinda(staf: Staf, rekod: Kehadiran | null) {
    setPindaStaf(staf);
    setPindaForm({
      status: rekod?.status ?? "Hadir",
      masaMasuk: masaDariISO(rekod?.masaMasuk),
      masaKeluar: masaDariISO(rekod?.masaKeluar),
      sebabLewat: rekod?.sebabLewat || "",
      catatan: rekod?.catatan || "",
      alasan: "",
    });
  }

  function tutupPinda() {
    setPindaStaf(null);
    setPindaForm(FORM_KOSONG);
    setHantarPinda(false);
  }

  async function hantarPindaFn() {
    if (!pindaStaf) return;
    if (!pindaForm.alasan.trim()) {
      toast.error("Alasan pindaan diperlukan.");
      return;
    }
    setHantarPinda(true);
    try {
      await apiFetch<{ rekod: Kehadiran }>("/api/kehadiran/pinda", {
        method: "POST",
        body: JSON.stringify({
          stafId: pindaStaf.id,
          tarikh,
          masaMasuk: pindaForm.masaMasuk || null,
          masaKeluar: pindaForm.masaKeluar || null,
          status: pindaForm.status,
          sebabLewat: pindaForm.sebabLewat || null,
          catatan: pindaForm.catatan || null,
          alasan: pindaForm.alasan.trim(),
        }),
      });
      toast.success(`Rekod ${pindaStaf.nama} pada ${formatTarikhBM(tarikh)} telah dikemaskini.`);
      tutupPinda();
      await muatData();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Gagal mengemaskini rekod.";
      toast.error(m);
    } finally {
      setHantarPinda(false);
    }
  }

  async function jalankanTutupHari() {
    setMenjalankanTutup(true);
    try {
      const r = await apiFetch<{ ditandakan: number; dilangkau: number; tarikh?: string; mesej?: string }>(
        "/api/kehadiran/tutup-hari",
        { method: "POST", body: JSON.stringify({ tarikh }) },
      );
      if (r.mesej) {
        toast.info(r.mesej);
      } else {
        toast.success(
          `Tutup hari selesai. Ditandakan: ${r.ditandakan} staf. Dilangkau: ${r.dilangkau} staf.`,
        );
      }
      setTutupTerbuka(false);
      await muatData();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Gagal menjalankan tutup hari.";
      toast.error(m);
    } finally {
      setMenjalankanTutup(false);
    }
  }

  const tarikhDate = new Date(tarikh + "T00:00:00");
  const tarikhLabel = isNaN(tarikhDate.getTime()) ? tarikh : `${namaHariBM(tarikhDate)}, ${formatTarikhBM(tarikhDate)}`;

  if (staf && staf.peranan !== "Admin") {
    return (
      <div className="skeuo-card p-8 text-center text-stone-500">
        <Lock className="mx-auto mb-2 text-stone-400" size={24} />
        Halaman ini hanya untuk Pentadbir.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="skeuo-panel p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
              <ClipboardList size={14} /> Pengurusan Kehadiran
            </div>
            <div className="text-lg sm:text-xl font-bold text-stone-800">Tutup Hari &amp; Pinda Rekod</div>
            <div className="text-xs text-stone-500 mt-0.5">Tarikh: {tarikhLabel}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setTutupTerbuka(true)}
              className="skeuo-btn-danger h-9 px-4 gap-1.5"
            >
              <Lock size={15} /> Tutup Hari
            </Button>
          </div>
        </div>

        {/* Ringkasan pantas */}
        <div className="mt-4 grid grid-cols-4 sm:grid-cols-7 gap-2">
          {(["Hadir", "Lewat", "TidakHadir", "Cuti", "TugasRasmi", "CutiUmum"] as StatusKehadiran[]).map((s) => {
            const w = WARNA_STATUS[s];
            return (
              <div key={s} className="skeuo-card-inset p-2 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${w.dot}`} />
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-stone-500 font-semibold">{w.label}</span>
                </div>
                <div className="text-base sm:text-lg font-bold text-stone-800 tabular-nums">{ringkasan[s]}</div>
              </div>
            );
          })}
          <div className="skeuo-card-inset p-2 text-center">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Belum Rekod</div>
            <div className="text-base sm:text-lg font-bold text-stone-500 tabular-nums">{ringkasan.Belum}</div>
          </div>
        </div>
      </div>

      {/* Penapis */}
      <div className="skeuo-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="tarikh" className="text-xs font-semibold text-stone-600">Tarikh</Label>
            <Input
              id="tarikh"
              type="date"
              value={tarikh}
              onChange={(e) => setTarikh(e.target.value)}
              className="skeuo-input mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-stone-600">Jabatan</Label>
            <Select value={jabatanId} onValueChange={setJabatanId}>
              <SelectTrigger className="skeuo-input mt-1">
                <SelectValue placeholder="Semua jabatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__SEMUA__">Semua Jabatan</SelectItem>
                {senJabatan.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.nama} ({j.kod})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cari" className="text-xs font-semibold text-stone-600">Cari Staf</Label>
            <div className="relative mt-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input
                id="cari"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Nama / No. ID / Jawatan"
                className="skeuo-input pl-8"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Jadual staf & kehadiran */}
      <div className="skeuo-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-stone-800 text-sm flex items-center gap-1.5">
            <Users size={15} className="text-stone-500" /> Senarai Staf Aktif
          </h3>
          <span className="skeuo-pill bg-stone-200 text-stone-700">{baris.length} staf</span>
        </div>

        {memuat ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeuo-card-inset h-10 animate-pulse" />
            ))}
          </div>
        ) : baris.length === 0 ? (
          <div className="skeuo-card-inset p-8 text-center text-stone-500 text-sm">
            Tiada staf dijumpai untuk penapis ini. Cuba ubah jabatan atau kata carian.
          </div>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto custom-scroll -mx-1 px-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Staf</TableHead>
                  <TableHead className="text-xs">Jabatan</TableHead>
                  <TableHead className="text-xs">Masa Masuk</TableHead>
                  <TableHead className="text-xs">Masa Keluar</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Sumber</TableHead>
                  <TableHead className="text-xs text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baris.map(({ staf: s, rekod }) => {
                  const w = rekod ? WARNA_STATUS[rekod.status] : null;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-stone-800">{s.nama}</span>
                          <span className="text-[10px] text-stone-500 tabular-nums">{s.noIdStaf} · {s.jawatan}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-stone-600">{s.jabatan?.nama || "—"}</TableCell>
                      <TableCell className="text-xs font-mono tabular-nums">{formatMasa(rekod?.masaMasuk)}</TableCell>
                      <TableCell className="text-xs font-mono tabular-nums">{formatMasa(rekod?.masaKeluar)}</TableCell>
                      <TableCell>
                        {w ? (
                          <span className={`skeuo-pill ${w.bg} ${w.text}`}>
                            <span className={`led ${w.dot}`} />
                            {w.label}
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic">Belum ada rekod</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-stone-600">
                        {rekod?.sumber || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          onClick={() => bukaPinda(s, rekod)}
                          className="skeuo-btn-secondary h-8 px-3 text-xs gap-1"
                        >
                          <Pencil size={12} /> Pinda
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modal Pinda Rekod */}
      <Dialog open={!!pindaStaf} onOpenChange={(o) => { if (!o) tutupPinda(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Pinda Rekod Kehadiran</DialogTitle>
            <DialogDescription className="text-xs">
              Kemaskini rekod kehadiran staf. Semua pindaan direkodkan dalam log audit.
            </DialogDescription>
          </DialogHeader>

          {pindaStaf && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="skeuo-card-inset p-2">
                  <div className="text-[10px] uppercase text-stone-500">Staf</div>
                  <div className="text-xs font-semibold text-stone-800">{pindaStaf.nama}</div>
                  <div className="text-[10px] text-stone-500">{pindaStaf.noIdStaf}</div>
                </div>
                <div className="skeuo-card-inset p-2">
                  <div className="text-[10px] uppercase text-stone-500">Tarikh</div>
                  <div className="text-xs font-semibold text-stone-800">{formatTarikhBM(tarikh)}</div>
                  <div className="text-[10px] text-stone-500">{namaHariBM(tarikhDate)}</div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-stone-600">Status</Label>
                <Select
                  value={pindaForm.status}
                  onValueChange={(v) => setPindaForm((f) => ({ ...f, status: v as StatusKehadiran }))}
                >
                  <SelectTrigger className="skeuo-input mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMUA_STATUS.map((s) => (
                      <SelectItem key={s} value={s}>{WARNA_STATUS[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="masaMasuk" className="text-xs font-semibold text-stone-600">Masa Masuk (pilihan)</Label>
                  <Input
                    id="masaMasuk"
                    type="time"
                    value={pindaForm.masaMasuk}
                    onChange={(e) => setPindaForm((f) => ({ ...f, masaMasuk: e.target.value }))}
                    className="skeuo-input mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="masaKeluar" className="text-xs font-semibold text-stone-600">Masa Keluar (pilihan)</Label>
                  <Input
                    id="masaKeluar"
                    type="time"
                    value={pindaForm.masaKeluar}
                    onChange={(e) => setPindaForm((f) => ({ ...f, masaKeluar: e.target.value }))}
                    className="skeuo-input mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sebabLewat" className="text-xs font-semibold text-stone-600">Sebab Lewat (pilihan)</Label>
                <Input
                  id="sebabLewat"
                  value={pindaForm.sebabLewat}
                  onChange={(e) => setPindaForm((f) => ({ ...f, sebabLewat: e.target.value }))}
                  className="skeuo-input mt-1"
                  placeholder="Cth: Kesesakan lalu lintas"
                />
              </div>

              <div>
                <Label htmlFor="catatan" className="text-xs font-semibold text-stone-600">Catatan (pilihan)</Label>
                <Textarea
                  id="catatan"
                  value={pindaForm.catatan}
                  onChange={(e) => setPindaForm((f) => ({ ...f, catatan: e.target.value }))}
                  className="skeuo-input mt-1 min-h-[60px]"
                  placeholder="Catatan tambahan..."
                />
              </div>

              <div>
                <Label htmlFor="alasan" className="text-xs font-semibold text-rose-700">
                  Alasan Pindaan (wajib)
                </Label>
                <Textarea
                  id="alasan"
                  value={pindaForm.alasan}
                  onChange={(e) => setPindaForm((f) => ({ ...f, alasan: e.target.value }))}
                  className="skeuo-input mt-1 min-h-[70px]"
                  placeholder="Nyatakan sebab pindaan rekod ini..."
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={tutupPinda} className="skeuo-btn-secondary">
              Batal
            </Button>
            <Button
              onClick={hantarPindaFn}
              disabled={hantarPinda || !pindaForm.alasan.trim()}
              className="skeuo-btn"
            >
              {hantarPinda ? <Loader2 size={14} className="animate-spin" /> : null}
              Simpan Pindaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tutup Hari */}
      <Dialog open={tutupTerbuka} onOpenChange={setTutupTerbuka}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-1.5">
              <Lock size={16} className="text-rose-700" /> Sahkan Tutup Hari
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tindakan ini akan menandakan semua staf aktif yang belum ada rekod sebagai <b>Tidak Hadir</b> pada tarikh tersebut.
            </DialogDescription>
          </DialogHeader>
          <div className="skeuo-card-inset p-3 text-center">
            <div className="text-[10px] uppercase text-stone-500">Tarikh Tutup</div>
            <div className="text-sm font-bold text-stone-800">{tarikhLabel}</div>
            <div className="text-[10px] text-stone-500 mt-1">{tarikh}</div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTutupTerbuka(false)} className="skeuo-btn-secondary">
              Batal
            </Button>
            <Button
              onClick={jalankanTutupHari}
              disabled={menjalankanTutup}
              className="skeuo-btn-danger"
            >
              {menjalankanTutup ? <Loader2 size={14} className="animate-spin" /> : null}
              Sah &amp; Tutup Hari
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UrusKehadiranView;
