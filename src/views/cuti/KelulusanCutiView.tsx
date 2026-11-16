"use client";

// KelulusanCutiView (FR-C03, FR-C05)
// Untuk Pengetua / Penyelia / Admin: lulus / tolak permohonan cuti & kebenaran keluar.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Loader2, FileText, DoorOpen, Info, Check,
} from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatTarikhBM } from "@/lib/domain";
import type { KebenaranKeluar, PermohonanCuti, StatusCuti } from "@/lib/types";

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

type JenisKeputusan = "Diluluskan" | "Ditolak";

interface KeputusanModal {
  jenis: "cuti" | "keluar";
  id: string;
  keputusan: JenisKeputusan;
  catatan: string;
}

const PILIHAN_STATUS: { nilai: string; label: string }[] = [
  { nilai: "__SEMUA__", label: "Semua" },
  { nilai: "Menunggu", label: "Menunggu" },
  { nilai: "Diluluskan", label: "Diluluskan" },
  { nilai: "Ditolak", label: "Ditolak" },
  { nilai: "Dibatalkan", label: "Dibatalkan" },
];

export function KelulusanCutiView() {
  const { staf } = useAuth();
  const [tabAktif, setTabAktif] = useState<string>("cuti");

  // Cuti
  const [senCuti, setSenCuti] = useState<PermohonanCuti[]>([]);
  const [statusCuti, setStatusCuti] = useState<string>("Menunggu");
  const [memuatCuti, setMemuatCuti] = useState(true);

  // Kebenaran Keluar
  const [senKeluar, setSenKeluar] = useState<KebenaranKeluar[]>([]);
  const [statusKeluar, setStatusKeluar] = useState<string>("Menunggu");
  const [memuatKeluar, setMemuatKeluar] = useState(true);

  // Tetapan
  const [aliranDuaPeringkat, setAliranDuaPeringkat] = useState(false);

  // Modal keputusan
  const [modal, setModal] = useState<KeputusanModal | null>(null);
  const [menghantar, setMenghantar] = useState(false);

  const muatTetapan = useCallback(async () => {
    try {
      const r = await apiFetch<{ tetapan: { aliranDuaPeringkat: boolean } }>("/api/tetapan");
      setAliranDuaPeringkat(r.tetapan?.aliranDuaPeringkat ?? false);
    } catch {
      // abaikan
    }
  }, []);

  const muatCuti = useCallback(async () => {
    setMemuatCuti(true);
    try {
      const params = statusCuti !== "__SEMUA__" ? `?status=${statusCuti}` : "";
      // Ambil semua permohonan cuti (Pengetua/Penyelia/Admin boleh lihat semua)
      const url = `/api/cuti?semua=true${statusCuti !== "__SEMUA__" ? `&status=${statusCuti}` : ""}`;
      void params;
      const r = await apiFetch<{ senarai: PermohonanCuti[] }>(url);
      setSenCuti(r.senarai || []);
    } catch (err) {
      const m = err instanceof ApiError ? err.message : "Gagal memuatkan permohonan cuti.";
      toast.error(m);
      setSenCuti([]);
    } finally {
      setMemuatCuti(false);
    }
  }, [statusCuti]);

  const muatKeluar = useCallback(async () => {
    setMemuatKeluar(true);
    try {
      const url = `/api/kebenaran-keluar?stafId=__SEMUA__${statusKeluar !== "__SEMUA__" ? `&status=${statusKeluar}` : ""}`;
      const r = await apiFetch<{ senarai: KebenaranKeluar[] }>(url);
      setSenKeluar(r.senarai || []);
    } catch (err) {
      const m = err instanceof ApiError ? err.message : "Gagal memuatkan kebenaran keluar.";
      toast.error(m);
      setSenKeluar([]);
    } finally {
      setMemuatKeluar(false);
    }
  }, [statusKeluar]);

  useEffect(() => { muatTetapan(); }, [muatTetapan]);
  useEffect(() => {
    if (tabAktif === "cuti") muatCuti();
    else if (tabAktif === "keluar") muatKeluar();
  }, [tabAktif, muatCuti, muatKeluar]);

  function bukaModal(jenis: "cuti" | "keluar", id: string, keputusan: JenisKeputusan) {
    setModal({ jenis, id, keputusan, catatan: "" });
  }

  async function sahKeputusan() {
    if (!modal) return;
    setMenghantar(true);
    try {
      if (modal.jenis === "cuti") {
        await apiFetch(`/api/cuti/${modal.id}/keputusan`, {
          method: "POST",
          body: JSON.stringify({
            keputusan: modal.keputusan,
            catatan: modal.catatan.trim() || null,
          }),
        });
      } else {
        await apiFetch(`/api/kebenaran-keluar/${modal.id}/keputusan`, {
          method: "POST",
          body: JSON.stringify({
            keputusan: modal.keputusan,
            catatan: modal.catatan.trim() || null,
          }),
        });
      }
      toast.success(`Permohonan telah ${modal.keputusan.toLowerCase()}.`);
      setModal(null);
      if (tabAktif === "cuti") await muatCuti();
      else await muatKeluar();
    } catch (err) {
      const m = err instanceof ApiError ? err.message : "Gagal memproses keputusan.";
      toast.error(m);
    } finally {
      setMenghantar(false);
    }
  }

  const peranan = staf?.peranan;
  const bolehLulus = peranan === "Pengetua" || peranan === "Admin";
  const penyeliaSahaja = peranan === "Penyelia";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-800">Kelulusan Cuti</h1>
        <p className="text-sm text-stone-600">
          Luluskan atau tolak permohonan cuti &amp; kebenaran keluar staf.
        </p>
      </div>

      {penyeliaSahaja && !bolehLulus && (
        <div className="skeuo-card-inset rounded-md p-3 flex items-start gap-2 text-sm text-stone-700">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
          <div>
            Anda log masuk sebagai Penyelia.{" "}
            {aliranDuaPeringkat
              ? "Aliran dua peringkat diaktifkan — anda boleh memberi keputusan atas permohonan."
              : "Anda hanya boleh melihat senarai (baca sahaja). Hanya Pengetua / Admin boleh memberi keputusan."}
          </div>
        </div>
      )}

      <Tabs value={tabAktif} onValueChange={setTabAktif}>
        <TabsList className="skeuo-card-inset p-1">
          <TabsTrigger value="cuti" className="gap-1.5">
            <FileText className="w-4 h-4" />
            Permohonan Cuti
          </TabsTrigger>
          <TabsTrigger value="keluar" className="gap-1.5">
            <DoorOpen className="w-4 h-4" />
            Kebenaran Keluar
          </TabsTrigger>
        </TabsList>

        {/* Tab Permohonan Cuti */}
        <TabsContent value="cuti" className="space-y-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="statusCuti" className="text-sm text-stone-700">Tapis Status:</Label>
            <Select value={statusCuti} onValueChange={setStatusCuti}>
              <SelectTrigger id="statusCuti" className="skeuo-input w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PILIHAN_STATUS.map((p) => (
                  <SelectItem key={p.nilai} value={p.nilai}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="skeuo-panel p-2 sm:p-4">
            {memuatCuti ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : senCuti.length === 0 ? (
              <div className="p-10 text-center text-stone-600 text-sm">
                <FileText className="w-8 h-8 mx-auto mb-2 text-stone-400" />
                Tiada permohonan cuti{statusCuti !== "__SEMUA__" ? ` berstatus ${statusCuti}` : ""}.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scroll max-h-[34rem] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Pemohon</TableHead>
                      <TableHead className="min-w-[130px]">Jenis Cuti</TableHead>
                      <TableHead className="min-w-[180px]">Tarikh Mula–Akhir</TableHead>
                      <TableHead className="text-center">Bil Hari</TableHead>
                      <TableHead className="text-center">Separuh Hari</TableHead>
                      <TableHead className="min-w-[180px]">Sebab</TableHead>
                      <TableHead>Lampiran</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {senCuti.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium text-stone-800">{c.staf?.nama ?? "—"}</div>
                          <div className="text-xs text-stone-500">{c.staf?.jawatan ?? "—"}</div>
                        </TableCell>
                        <TableCell>{c.jenisCuti?.nama ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatTarikhBM(c.tarikhMula)} – {formatTarikhBM(c.tarikhAkhir)}
                        </TableCell>
                        <TableCell className="text-center font-semibold">{c.bilHari}</TableCell>
                        <TableCell className="text-center">
                          {c.separuhHari ? (
                            <span className="text-amber-700 text-xs font-semibold">Ya</span>
                          ) : (
                            <span className="text-stone-400 text-xs">Tidak</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="line-clamp-2 text-sm">{c.sebab}</div>
                        </TableCell>
                        <TableCell>
                          {c.lampiranNama ? (
                            <span className="text-xs text-stone-700 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              {c.lampiranNama}
                            </span>
                          ) : (
                            <span className="text-stone-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell><PilStatus status={c.status} /></TableCell>
                        <TableCell className="text-right">
                          {c.status === "Menunggu" && (bolehLulus || (penyeliaSahaja && aliranDuaPeringkat)) ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                className="skeuo-btn h-8 px-3 gap-1 text-xs"
                                onClick={() => bukaModal("cuti", c.id, "Diluluskan")}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Lulus
                              </Button>
                              <Button
                                size="sm"
                                className="skeuo-btn-danger h-8 px-3 gap-1 text-xs"
                                onClick={() => bukaModal("cuti", c.id, "Ditolak")}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Tolak
                              </Button>
                            </div>
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
        </TabsContent>

        {/* Tab Kebenaran Keluar */}
        <TabsContent value="keluar" className="space-y-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="statusKeluar" className="text-sm text-stone-700">Tapis Status:</Label>
            <Select value={statusKeluar} onValueChange={setStatusKeluar}>
              <SelectTrigger id="statusKeluar" className="skeuo-input w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PILIHAN_STATUS.map((p) => (
                  <SelectItem key={p.nilai} value={p.nilai}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="skeuo-panel p-2 sm:p-4">
            {memuatKeluar ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : senKeluar.length === 0 ? (
              <div className="p-10 text-center text-stone-600 text-sm">
                <DoorOpen className="w-8 h-8 mx-auto mb-2 text-stone-400" />
                Tiada permohonan kebenaran keluar{statusKeluar !== "__SEMUA__" ? ` berstatus ${statusKeluar}` : ""}.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scroll max-h-[34rem] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Pemohon</TableHead>
                      <TableHead className="min-w-[110px]">Tarikh</TableHead>
                      <TableHead className="min-w-[160px]">Masa Keluar–Kembali</TableHead>
                      <TableHead className="min-w-[200px]">Sebab</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {senKeluar.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell>
                          <div className="font-medium text-stone-800">{k.staf?.nama ?? "—"}</div>
                          <div className="text-xs text-stone-500">{k.staf?.jawatan ?? "—"}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatTarikhBM(k.tarikh)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-mono">
                          {k.masaKeluar} – {k.masaKembali}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="line-clamp-2 text-sm">{k.sebab}</div>
                        </TableCell>
                        <TableCell><PilStatus status={k.status} /></TableCell>
                        <TableCell className="text-right">
                          {k.status === "Menunggu" && (bolehLulus || penyeliaSahaja) ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                className="skeuo-btn h-8 px-3 gap-1 text-xs"
                                onClick={() => bukaModal("keluar", k.id, "Diluluskan")}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Lulus
                              </Button>
                              <Button
                                size="sm"
                                className="skeuo-btn-danger h-8 px-3 gap-1 text-xs"
                                onClick={() => bukaModal("keluar", k.id, "Ditolak")}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Tolak
                              </Button>
                            </div>
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
        </TabsContent>
      </Tabs>

      {/* Dialog keputusan */}
      <Dialog open={!!modal} onOpenChange={(o) => { if (!o) setModal(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-stone-800">
              {modal?.keputusan === "Diluluskan" ? "Lulus Permohonan" : "Tolak Permohonan"}
            </DialogTitle>
            <DialogDescription>
              {modal?.keputusan === "Diluluskan"
                ? "Sahkan kelulusan permohonan ini. Catatan adalah pilihan."
                : "Sahkan penolakan permohonan ini. Sila nyatakan sebab dalam catatan."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="catatan" className="text-sm text-stone-700">Catatan Keputusan</Label>
              <Textarea
                id="catatan"
                rows={4}
                className="skeuo-input resize-y"
                placeholder={
                  modal?.keputusan === "Diluluskan"
                    ? "Catatan tambahan (cth. diluluskan dengan syarat…)"
                    : "Nyatakan sebab penolakan…"
                }
                value={modal?.catatan ?? ""}
                onChange={(e) => setModal((m) => m ? { ...m, catatan: e.target.value } : m)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="skeuo-btn-secondary h-9"
              onClick={() => setModal(null)}
              disabled={menghantar}
            >
              Batal
            </Button>
            <Button
              className={modal?.keputusan === "Diluluskan" ? "skeuo-btn h-9 gap-2" : "skeuo-btn-danger h-9 gap-2"}
              onClick={sahKeputusan}
              disabled={menghantar}
            >
              {menghantar ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Memproses…</>
              ) : modal?.keputusan === "Diluluskan" ? (
                <><CheckCircle2 className="w-4 h-4" /> Sah Lulus</>
              ) : (
                <><XCircle className="w-4 h-4" /> Sah Tolak</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default KelulusanCutiView;
