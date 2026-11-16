"use client";

// AuditView (FR-G02) — Sistem Rekod Kehadiran Guru & Staf SRI Al-Amin Gombak.
// Log Audit: Pentadbir & Pengetua sahaja. Pengetua lihat sahaja.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, FileSearch, Loader2, Search } from "lucide-react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, eksportCSV } from "@/lib/api-client";
import { formatTarikhMasaBM } from "@/lib/domain";

interface PenggunaRingkas {
  id: string;
  nama: string;
  noIdStaf: string;
}

interface LogAuditDenganPengguna {
  id: string;
  penggunaId?: string | null;
  pengguna?: PenggunaRingkas | null;
  tindakan: string;
  entiti: string;
  entitiId?: string | null;
  nilaiLame?: string | null;
  nilaiBaharu?: string | null;
  capMasa: string;
}

const PILIHAN_ENTITI = [
  { nilai: "", label: "Semua Entiti" },
  { nilai: "Staf", label: "Staf" },
  { nilai: "Kehadiran", label: "Kehadiran" },
  { nilai: "Cuti", label: "Cuti" },
  { nilai: "KebenaranKeluar", label: "Kebenaran Keluar" },
  { nilai: "Tetapan", label: "Tetapan" },
  { nilai: "Kalendar", label: "Kalendar" },
  { nilai: "Jabatan", label: "Jabatan" },
  { nilai: "Sesi", label: "Sesi" },
];

function ringkas(s: string | null | undefined, max = 60): string {
  if (!s) return "—";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function SelNilai({ nilai }: { nilai?: string | null }) {
  const [buka, setBuka] = useState(false);
  if (!nilai) return <span className="text-stone-400">—</span>;
  if (nilai.length <= 60) {
    return <code className="text-xs text-stone-700 break-all">{nilai}</code>;
  }
  return (
    <div className="space-y-1">
      <code className="text-xs text-stone-700 break-all">
        {buka ? nilai : ringkas(nilai)}
      </code>
      <button
        type="button"
        className="text-xs text-emerald-700 hover:underline"
        onClick={() => setBuka((b) => !b)}
      >
        {buka ? "Tunjuk kurang" : "Tunjuk penuh"}
      </button>
    </div>
  );
}

export default function AuditView() {
  const { staf } = useAuth();
  const dibenar = staf?.peranan === "Admin" || staf?.peranan === "Pengetua";

  const [entiti, setEntiti] = useState("");
  const [penggunaId, setPenggunaId] = useState("");
  const [tarikhMula, setTarikhMula] = useState("");
  const [tarikhAkhir, setTarikhAkhir] = useState("");

  const [senarai, setSenarai] = useState<LogAuditDenganPengguna[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [mengeksport, setMengeksport] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const params = new URLSearchParams();
      if (entiti) params.set("entiti", entiti);
      if (penggunaId.trim()) params.set("penggunaId", penggunaId.trim());
      if (tarikhMula) params.set("tarikhMula", tarikhMula);
      if (tarikhAkhir) params.set("tarikhAkhir", tarikhAkhir);
      const qs = params.toString();
      const r = await apiFetch<{ senarai: LogAuditDenganPengguna[] }>(
        `/api/audit${qs ? `?${qs}` : ""}`
      );
      setSenarai(r.senarai ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuatkan log audit.");
      setSenarai([]);
    } finally {
      setMemuat(false);
    }
  }, [entiti, penggunaId, tarikhMula, tarikhAkhir]);

  useEffect(() => {
    if (dibenar) muat();
    else setMemuat(false);
  }, [dibenar, muat]);

  const cetakSemula = (e: React.FormEvent) => {
    e.preventDefault();
    muat();
  };

  const eksport = () => {
    if (senarai.length === 0) {
      toast.error("Tiada data untuk dieksport.");
      return;
    }
    setMengeksport(true);
    try {
      const baris = senarai.map((a) => ({
        capMasa: formatTarikhMasaBM(a.capMasa),
        pengguna: a.pengguna?.nama ?? a.penggunaId ?? "",
        noIdStaf: a.pengguna?.noIdStaf ?? "",
        tindakan: a.tindakan,
        entiti: a.entiti,
        entitiId: a.entitiId ?? "",
        nilaiLame: a.nilaiLame ?? "",
        nilaiBaharu: a.nilaiBaharu ?? "",
      }));
      eksportCSV("log-audit.csv", [
        "capMasa", "pengguna", "noIdStaf", "tindakan", "entiti", "entitiId", "nilaiLame", "nilaiBaharu",
      ], baris);
      toast.success("Log audit dieksport.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengeksport.");
    } finally {
      setMengeksport(false);
    }
  };

  if (!dibenar) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-stone-800">Log Audit</h1>
        <div className="skeuo-card p-10 text-center text-stone-500">
          <FileSearch className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Anda tiada kebenaran untuk melihat log audit.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Log Audit</h1>
          <p className="text-sm text-stone-600">
            Rekod tindakan pengguna dalam sistem. Disusun terbaru dahulu (maksimum 200 rekod).
          </p>
        </div>
        <Button
          className="skeuo-btn-secondary px-4"
          onClick={eksport}
          disabled={mengeksport || senarai.length === 0}
        >
          {mengeksport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Eksport CSV
        </Button>
      </header>

      {/* Penapis */}
      <form onSubmit={cetakSemula} className="skeuo-card p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="audit-entiti">Entiti</Label>
            <Select value={entiti} onValueChange={setEntiti}>
              <SelectTrigger id="audit-entiti" className="skeuo-input">
                <SelectValue placeholder="Semua Entiti" />
              </SelectTrigger>
              <SelectContent>
                {PILIHAN_ENTITI.map((p) => (
                  <SelectItem key={p.nilai || "semua"} value={p.nilai}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-pengguna">ID Pengguna</Label>
            <Input
              id="audit-pengguna"
              className="skeuo-input"
              placeholder="cth: STAF-001"
              value={penggunaId}
              onChange={(e) => setPenggunaId(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-mula">Tarikh Mula</Label>
            <Input
              id="audit-mula"
              type="date"
              className="skeuo-input"
              value={tarikhMula}
              onChange={(e) => setTarikhMula(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-akhir">Tarikh Akhir</Label>
            <Input
              id="audit-akhir"
              type="date"
              className="skeuo-input"
              value={tarikhAkhir}
              onChange={(e) => setTarikhAkhir(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" className="skeuo-btn-secondary px-4">
            <Search className="h-4 w-4" />
            Cari
          </Button>
        </div>
      </form>

      {/* Jadual */}
      <div className="skeuo-card p-4 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-800">Rekod Log</h2>
          <span className="text-xs text-stone-500">
            {memuat ? "Memuatkan…" : `${senarai.length} rekod`}
          </span>
        </div>

        {memuat ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : senarai.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <FileSearch className="mx-auto h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Tiada rekod log audit yang sepadan dengan penapis.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scroll max-h-[28rem] rounded-md border border-stone-200">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-stone-100 hover:bg-stone-100">
                  <TableHead className="w-44">Cap Masa</TableHead>
                  <TableHead className="w-44">Pengguna</TableHead>
                  <TableHead className="w-32">Tindakan</TableHead>
                  <TableHead className="w-36">Entiti</TableHead>
                  <TableHead className="w-28">Entiti ID</TableHead>
                  <TableHead>Nilai Lama</TableHead>
                  <TableHead>Nilai Baharu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {senarai.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-stone-700 whitespace-nowrap">
                      {formatTarikhMasaBM(a.capMasa)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {a.pengguna?.nama ?? "—"}
                      {a.pengguna?.noIdStaf && (
                        <span className="block text-xs text-stone-500">{a.pengguna.noIdStaf}</span>
                      )}
                      {!a.pengguna && a.penggunaId && (
                        <span className="text-xs text-stone-500">{a.penggunaId}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="skeuo-pill bg-emerald-100 text-emerald-800">
                        {a.tindakan}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-stone-700">{a.entiti}</TableCell>
                    <TableCell className="text-xs text-stone-600 font-mono">
                      {a.entitiId ?? "—"}
                    </TableCell>
                    <TableCell><SelNilai nilai={a.nilaiLame} /></TableCell>
                    <TableCell><SelNilai nilai={a.nilaiBaharu} /></TableCell>
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
