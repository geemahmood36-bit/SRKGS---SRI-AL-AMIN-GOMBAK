"use client";

// CutiSayaView (FR-C01..C07)
// Paparan permohonan cuti peribadi, baki cuti tahunan & borang mohon cuti baharu.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarPlus, Loader2, Paperclip, XCircle, FileText, Info,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatTarikhBM } from "@/lib/domain";
import type { BakiCuti, JenisCuti, PermohonanCuti, StatusCuti } from "@/lib/types";

// Pemetaan warna status cuti (Tailwind)
const STATUS_CUTI_WARNA: Record<StatusCuti, { bg: string; text: string; dot: string; label: string }> = {
  Menunggu: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500", label: "Menunggu" },
  Diluluskan: { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-600", label: "Diluluskan" },
  Ditolak: { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-600", label: "Ditolak" },
  Dibatalkan: { bg: "bg-slate-200", text: "text-slate-700", dot: "bg-slate-500", label: "Dibatalkan" },
};

function PilStatus({ status }: { status: StatusCuti }) {
  const w = STATUS_CUTI_WARNA[status];
  return (
    <span className={`skeuo-pill ${w.bg} ${w.text}`}>
      <span className={`led ${w.dot}`} />
      {w.label}
    </span>
  );
}

interface FormMohon {
  jenisCutiId: string;
  tarikhMula: string;
  tarikhAkhir: string;
  separuhHari: boolean;
  sebab: string;
  lampiranNama: string;
}

const FORM_KOSONG: FormMohon = {
  jenisCutiId: "",
  tarikhMula: "",
  tarikhAkhir: "",
  separuhHari: false,
  sebab: "",
  lampiranNama: "",
};

export function CutiSayaView() {
  const { staf } = useAuth();
  const [baki, setBaki] = useState<BakiCuti[]>([]);
  const [senarai, setSenarai] = useState<PermohonanCuti[]>([]);
  const [jenisCuti, setJenisCuti] = useState<JenisCuti[]>([]);
  const [memuat, setMemuat] = useState(true);

  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [form, setForm] = useState<FormMohon>(FORM_KOSONG);
  const [menghantar, setMenghantar] = useState(false);
  const [bilHariPulangan, setBilHariPulangan] = useState<number | null>(null);
  const [amaran, setAmaran] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const [b, c, j] = await Promise.all([
        apiFetch<{ senarai: BakiCuti[]; tahun: number }>("/api/cuti/baki"),
        apiFetch<{ senarai: PermohonanCuti[] }>("/api/cuti"),
        apiFetch<{ senarai: JenisCuti[] }>("/api/jenis-cuti"),
      ]);
      setBaki(b.senarai || []);
      setSenarai(c.senarai || []);
      setJenisCuti(j.senarai || []);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Gagal memuatkan data cuti.";
      toast.error(m);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => { muat(); }, [muat]);

  function bukaDialog() {
    setForm(FORM_KOSONG);
    setBilHariPulangan(null);
    setAmaran(null);
    setDialogTerbuka(true);
  }

  async function hantarMohon() {
    if (!form.jenisCutiId) { toast.error("Sila pilih jenis cuti."); return; }
    if (!form.tarikhMula || !form.tarikhAkhir) { toast.error("Sila isi tarikh mula dan akhir."); return; }
    if (form.tarikhAkhir < form.tarikhMula) { toast.error("Tarikh akhir tidak boleh lebih awal dari tarikh mula."); return; }
    if (!form.sebab.trim()) { toast.error("Sebab permohonan diperlukan."); return; }
    setMenghantar(true);
    try {
      const r = await apiFetch<{ permohonan: PermohonanCuti; amaran?: string }>("/api/cuti", {
        method: "POST",
        body: JSON.stringify({
          jenisCutiId: form.jenisCutiId,
          tarikhMula: form.tarikhMula,
          tarikhAkhir: form.tarikhAkhir,
          separuhHari: form.separuhHari,
          sebab: form.sebab.trim(),
          lampiranNama: form.lampiranNama.trim() || null,
        }),
      });
      setBilHariPulangan(r.permohonan.bilHari);
      if (r.amaran) setAmaran(r.amaran);
      toast.success(`Permohonan berjaya dihantar. Bil hari: ${r.permohonan.bilHari}.`);
      await muat();
      // Tutup dialog selepas jangka pendek untuk benarkan pengguna lihat bil hari
      setTimeout(() => {
        setDialogTerbuka(false);
        setBilHariPulangan(null);
        setAmaran(null);
      }, 1500);
    } catch (err) {
      const m = err instanceof ApiError ? err.message : "Gagal menghantar permohonan.";
      toast.error(m);
    } finally {
      setMenghantar(false);
    }
  }

  async function batalPermohonan(id: string) {
    if (!confirm("Batalkan permohonan cuti ini?")) return;
    try {
      await apiFetch(`/api/cuti/${id}/batal`, { method: "PATCH" });
      toast.success("Permohonan dibatalkan.");
      await muat();
    } catch (err) {
      const m = err instanceof ApiError ? err.message : "Gagal membatalkan permohonan.";
      toast.error(m);
    }
  }

  const tahunSemasa = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* Tajuk */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Cuti Saya</h1>
          <p className="text-sm text-stone-600">
            Baki &amp; senarai permohonan cuti bagi tahun {tahunSemasa}.
          </p>
        </div>
        <Button onClick={bukaDialog} className="skeuo-btn h-10 px-4 gap-2">
          <CalendarPlus className="w-4 h-4" />
          Mohon Cuti Baharu
        </Button>
      </div>

      {/* Baki cuti tahunan */}
      <section aria-label="Baki cuti tahunan">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">
          Baki Cuti Tahun {tahunSemasa}
        </h2>
        {memuat ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="skeuo-card h-28" />
            ))}
          </div>
        ) : baki.length === 0 ? (
          <div className="skeuo-card p-6 text-center text-stone-600 text-sm">
            Tiada rekod baki cuti untuk tahun {tahunSemasa}.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {baki.map((b) => {
              const tinggal = Math.max(0, b.layak - b.digunakan);
              const peratus = b.layak > 0 ? Math.min(100, (b.digunakan / b.layak) * 100) : 0;
              return (
                <div key={b.id} className="skeuo-card p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-stone-800">
                      {b.jenisCuti?.nama ?? "—"}
                    </div>
                    <span className="text-xs text-stone-500">Tahun {b.tahun}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="skeuo-card-inset rounded-md py-2">
                      <div className="text-[10px] uppercase text-stone-500">Layak</div>
                      <div className="text-sm font-bold text-stone-800">{b.layak}</div>
                    </div>
                    <div className="skeuo-card-inset rounded-md py-2">
                      <div className="text-[10px] uppercase text-stone-500">Digunakan</div>
                      <div className="text-sm font-bold text-amber-700">{b.digunakan}</div>
                    </div>
                    <div className="skeuo-card-inset rounded-md py-2">
                      <div className="text-[10px] uppercase text-stone-500">Baki</div>
                      <div className="text-sm font-bold text-emerald-700">{tinggal}</div>
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
                        style={{ width: `${peratus}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Senarai permohonan cuti saya */}
      <section aria-label="Senarai permohonan cuti">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">
          Sejarah Permohonan Cuti
        </h2>
        <div className="skeuo-panel p-2 sm:p-4">
          {memuat ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : senarai.length === 0 ? (
            <div className="p-10 text-center text-stone-600 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 text-stone-400" />
              Tiada permohonan cuti lagi. Klik &quot;Mohon Cuti Baharu&quot; untuk mula.
            </div>
          ) : (
            <div className="overflow-x-auto custom-scroll max-h-[28rem] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[110px]">Mula</TableHead>
                    <TableHead className="min-w-[110px]">Akhir</TableHead>
                    <TableHead className="min-w-[140px]">Jenis Cuti</TableHead>
                    <TableHead className="text-center">Bil Hari</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[200px]">Sebab</TableHead>
                    <TableHead className="min-w-[180px]">Catatan Keputusan</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {senarai.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap">{formatTarikhBM(c.tarikhMula)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatTarikhBM(c.tarikhAkhir)}</TableCell>
                      <TableCell>{c.jenisCuti?.nama ?? "—"}</TableCell>
                      <TableCell className="text-center font-semibold">{c.bilHari}</TableCell>
                      <TableCell><PilStatus status={c.status} /></TableCell>
                      <TableCell className="max-w-xs">
                        <div className="line-clamp-2 text-sm">{c.sebab}</div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {c.catatanKeputusan ? (
                          <div className="line-clamp-2 text-sm text-stone-600">{c.catatanKeputusan}</div>
                        ) : (
                          <span className="text-stone-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === "Menunggu" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="skeuo-btn-danger h-8 px-3 gap-1 text-xs"
                            onClick={() => batalPermohonan(c.id)}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Batal
                          </Button>
                        ) : (
                          <span className="text-stone-400 text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      {/* Dialog mohon cuti baharu */}
      <Dialog open={dialogTerbuka} onOpenChange={setDialogTerbuka}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-stone-800">Mohon Cuti Baharu</DialogTitle>
            <DialogDescription>
              Isi borang di bawah untuk menghantar permohonan cuti kepada Pengetua / Penyelia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto custom-scroll pr-1">
            {/* Jenis Cuti */}
            <div className="space-y-1.5">
              <Label htmlFor="jenisCuti" className="text-sm text-stone-700">
                Jenis Cuti <span className="text-rose-600">*</span>
              </Label>
              <Select
                value={form.jenisCutiId}
                onValueChange={(v) => setForm((f) => ({ ...f, jenisCutiId: v }))}
              >
                <SelectTrigger id="jenisCuti" className="skeuo-input w-full">
                  <SelectValue placeholder="Pilih jenis cuti" />
                </SelectTrigger>
                <SelectContent>
                  {jenisCuti.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.nama} {j.perluLampiran && "(perlukan lampiran)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tarikh Mula & Akhir */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tarikhMula" className="text-sm text-stone-700">
                  Tarikh Mula <span className="text-rose-600">*</span>
                </Label>
                <Input
                  id="tarikhMula"
                  type="date"
                  className="skeuo-input"
                  value={form.tarikhMula}
                  onChange={(e) => setForm((f) => ({ ...f, tarikhMula: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tarikhAkhir" className="text-sm text-stone-700">
                  Tarikh Akhir <span className="text-rose-600">*</span>
                </Label>
                <Input
                  id="tarikhAkhir"
                  type="date"
                  className="skeuo-input"
                  min={form.tarikhMula || undefined}
                  value={form.tarikhAkhir}
                  onChange={(e) => setForm((f) => ({ ...f, tarikhAkhir: e.target.value }))}
                />
                {form.tarikhMula && form.tarikhAkhir && form.tarikhAkhir < form.tarikhMula && (
                  <p className="text-xs text-rose-600">
                    Tarikh akhir mestilah sama atau selepas tarikh mula.
                  </p>
                )}
              </div>
            </div>

            {/* Separuh Hari */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="separuhHari"
                checked={form.separuhHari}
                onCheckedChange={(v) => setForm((f) => ({ ...f, separuhHari: Boolean(v) }))}
              />
              <Label htmlFor="separuhHari" className="text-sm text-stone-700 cursor-pointer">
                Separuh Hari (bil hari dikira separuh)
              </Label>
            </div>

            {/* Sebab */}
            <div className="space-y-1.5">
              <Label htmlFor="sebab" className="text-sm text-stone-700">
                Sebab <span className="text-rose-600">*</span>
              </Label>
              <Textarea
                id="sebab"
                rows={3}
                className="skeuo-input resize-y"
                placeholder="Nyatakan sebab permohonan cuti…"
                value={form.sebab}
                onChange={(e) => setForm((f) => ({ ...f, sebab: e.target.value }))}
              />
            </div>

            {/* Lampiran Nama */}
            <div className="space-y-1.5">
              <Label htmlFor="lampiranNama" className="text-sm text-stone-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                Lampiran Nama
              </Label>
              <Input
                id="lampiranNama"
                type="text"
                className="skeuo-input"
                placeholder="cth. sijil_mc.pdf"
                value={form.lampiranNama}
                onChange={(e) => setForm((f) => ({ ...f, lampiranNama: e.target.value }))}
              />
              <p className="text-xs text-stone-500 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Hanya nama fail disimpan dalam prototaip.
              </p>
            </div>

            {/* Pulangan bil hari / amaran */}
            {bilHariPulangan !== null && (
              <div className="skeuo-card-inset rounded-md p-3 text-sm">
                <div className="font-semibold text-emerald-700">
                  Bil hari berkesan: {bilHariPulangan}
                </div>
                {amaran && (
                  <div className="text-amber-700 mt-1 text-xs">{amaran}</div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="skeuo-btn-secondary h-9"
              onClick={() => setDialogTerbuka(false)}
              disabled={menghantar}
            >
              Batal
            </Button>
            <Button
              className="skeuo-btn h-9 gap-2"
              onClick={hantarMohon}
              disabled={menghantar}
            >
              {menghantar ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Menghantar…</>
              ) : (
                "Hantar Permohonan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {staf && (
        <div className="text-xs text-stone-500">
          Log masuk sebagai: {staf.nama} ({staf.jawatan})
        </div>
      )}
    </div>
  );
}

export default CutiSayaView;
