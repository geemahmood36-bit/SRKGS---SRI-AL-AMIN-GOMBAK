"use client";

// KehadiranSayaView (FR-B09)
// Paparan rekod kehadiran peribadi: kalendar bulanan + jadual rekod.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  WARNA_STATUS, NAMA_HARI, NAMA_BULAN_PENUH,
  formatTarikhBM, formatMasa, formatJamBekerja, namaHariBM, isoTarikh,
} from "@/lib/domain";
import type { Kehadiran, StatusKehadiran } from "@/lib/types";

type StatusCal = StatusKehadiran;

interface KalendarItem {
  tarikh: string; // YYYY-MM-DD
  status: StatusCal;
  masaMasuk?: string | null;
  masaKeluar?: string | null;
  jamBekerja?: number | null;
}

interface ResponKalendar { senarai: KalendarItem[] }
interface ResponSaya { senarai: Kehadiran[] }

const SEMUA_STATUS: StatusKehadiran[] = [
  "Hadir", "Lewat", "TidakHadir", "Cuti", "TugasRasmi", "CutiUmum",
];

export function KehadiranSayaView() {
  const { staf } = useAuth();
  const hariIni = new Date();
  const [tahun, setTahun] = useState(hariIni.getFullYear());
  const [bulan, setBulan] = useState(hariIni.getMonth() + 1); // 1-12
  const [kalendar, setKalendar] = useState<KalendarItem[]>([]);
  const [senarai, setSenarai] = useState<Kehadiran[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [ralatMesej, setRalatMesej] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setRalatMesej(null);
    try {
      const [kal, tbl] = await Promise.all([
        apiFetch<ResponKalendar>(`/api/kehadiran/kalendar-saya?bulan=${bulan}&tahun=${tahun}`),
        apiFetch<ResponSaya>(`/api/kehadiran/saya?bulan=${bulan}&tahun=${tahun}`),
      ]);
      setKalendar(kal.senarai || []);
      setSenarai(tbl.senarai || []);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Gagal memuatkan rekod kehadiran.";
      setRalatMesej(m);
      toast.error(m);
    } finally {
      setMemuat(false);
    }
  }, [bulan, tahun]);

  useEffect(() => { muat(); }, [muat]);

  const petaTarikh = useMemo(() => {
    const m = new Map<string, KalendarItem>();
    for (const k of kalendar) m.set(k.tarikh, k);
    return m;
  }, [kalendar]);

  function tukarBulan(delta: number) {
    let b = bulan + delta;
    let t = tahun;
    if (b < 1) { b = 12; t -= 1; }
    else if (b > 12) { b = 1; t += 1; }
    setBulan(b);
    setTahun(t);
  }

  // Bina grid mingguan (Ahad-Sabtu) untuk bulan
  const grid = useMemo(() => {
    const hariPertama = new Date(tahun, bulan - 1, 1).getDay(); // 0=Ahad
    const bilHari = new Date(tahun, bulan, 0).getDate();
    const sel: (number | null)[] = [];
    for (let i = 0; i < hariPertama; i++) sel.push(null);
    for (let d = 1; d <= bilHari; d++) sel.push(d);
    while (sel.length % 7 !== 0) sel.push(null);
    // Bungkus minggu
    const minggu: (number | null)[][] = [];
    for (let i = 0; i < sel.length; i += 7) minggu.push(sel.slice(i, i + 7));
    return minggu;
  }, [tahun, bulan]);

  const isoHariIni = isoTarikh(hariIni);
  const ringkasan = useMemo(() => {
    const kiraan: Record<StatusKehadiran, number> = {
      Hadir: 0, Lewat: 0, TidakHadir: 0, Cuti: 0, TugasRasmi: 0, CutiUmum: 0,
    };
    for (const k of kalendar) {
      if (kiraan[k.status] != null) kiraan[k.status] += 1;
    }
    return kiraan;
  }, [kalendar]);

  if (!staf) {
    return (
      <div className="skeuo-card p-8 text-center text-stone-500">
        Sila log masuk untuk melihat rekod kehadiran anda.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header pilih bulan */}
      <div className="skeuo-panel p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold flex items-center gap-1.5">
              <CalendarDays size={14} /> Kehadiran Saya
            </div>
            <div className="text-lg sm:text-xl font-bold text-stone-800">
              {NAMA_BULAN_PENUH[bulan - 1]} {tahun}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              {staf.nama} ({staf.noIdStaf})
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => tukarBulan(-1)}
              className="skeuo-btn-secondary h-9 px-3"
              aria-label="Bulan sebelum"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              onClick={() => { setBulan(hariIni.getMonth() + 1); setTahun(hariIni.getFullYear()); }}
              className="skeuo-btn-secondary h-9 px-3 text-xs"
            >
              Hari ini
            </Button>
            <Button
              variant="outline"
              onClick={() => tukarBulan(1)}
              className="skeuo-btn-secondary h-9 px-3"
              aria-label="Bulan seterus"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {/* Ringkasan status bulan */}
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {SEMUA_STATUS.map((s) => {
            const w = WARNA_STATUS[s];
            return (
              <div key={s} className="skeuo-card-inset p-2 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${w.dot}`} />
                  <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">{w.label}</span>
                </div>
                <div className="text-lg font-bold text-stone-800 tabular-nums">{ringkasan[s]}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kalendar grid */}
      <div className="skeuo-card p-4">
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {NAMA_HARI.map((h) => (
            <div key={h} className="text-center text-[10px] sm:text-xs uppercase font-semibold text-stone-500 py-1">
              {h.slice(0, 3)}
            </div>
          ))}
        </div>
        {memuat ? (
          <div className="space-y-1.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-1.5">
                {[...Array(7)].map((_, j) => (
                  <div key={j} className="skeuo-card-inset h-16 sm:h-20 animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {grid.map((minggu, mi) => (
              <div key={mi} className="grid grid-cols-7 gap-1.5">
                {minggu.map((hari, hi) => {
                  if (hari === null) {
                    return <div key={hi} className="skeuo-card-inset h-16 sm:h-20 opacity-40" />;
                  }
                  const d = new Date(tahun, bulan - 1, hari);
                  const iso = isoTarikh(d);
                  const item = petaTarikh.get(iso);
                  const w = item ? WARNA_STATUS[item.status] : null;
                  const isHariIni = iso === isoHariIni;
                  return (
                    <div
                      key={hi}
                      className={`skeuo-card-inset h-16 sm:h-20 p-1.5 flex flex-col justify-between relative ${isHariIni ? "ring-2 ring-emerald-600" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-700 tabular-nums">{hari}</span>
                        {w && <span className={`inline-block w-2 h-2 rounded-full ${w.dot}`} />}
                      </div>
                      {w && (
                        <div className="text-[9px] sm:text-[10px] leading-tight text-stone-600 truncate">
                          {w.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Petunjuk warna */}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {SEMUA_STATUS.map((s) => {
            const w = WARNA_STATUS[s];
            return (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${w.dot}`} />
                <span className="text-[10px] text-stone-600">{w.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Jadual rekod bulan */}
      <div className="skeuo-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-stone-800 text-sm">
            Rekod {NAMA_BULAN_PENUH[bulan - 1]} {tahun}
          </h3>
          <span className="skeuo-pill bg-stone-200 text-stone-700">{senarai.length} rekod</span>
        </div>

        {ralatMesej ? (
          <div className="skeuo-card-inset p-4 text-center text-rose-700 text-sm">
            {ralatMesej}
          </div>
        ) : memuat ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeuo-card-inset h-10 animate-pulse" />
            ))}
          </div>
        ) : senarai.length === 0 ? (
          <div className="skeuo-card-inset p-8 text-center text-stone-500 text-sm">
            Tiada rekod kehadiran untuk bulan ini. Rekod anda akan muncul di sini selepas anda mendaftar masuk.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto custom-scroll -mx-1 px-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tarikh</TableHead>
                  <TableHead className="text-xs">Hari</TableHead>
                  <TableHead className="text-xs">Masa Masuk</TableHead>
                  <TableHead className="text-xs">Masa Keluar</TableHead>
                  <TableHead className="text-xs">Jam Bekerja</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Sebab Lewat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {senarai.map((r) => {
                  const d = new Date(r.tarikh);
                  const w = WARNA_STATUS[r.status];
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-medium tabular-nums">{formatTarikhBM(d)}</TableCell>
                      <TableCell className="text-xs">{namaHariBM(d)}</TableCell>
                      <TableCell className="text-xs font-mono tabular-nums">{formatMasa(r.masaMasuk)}</TableCell>
                      <TableCell className="text-xs font-mono tabular-nums">{formatMasa(r.masaKeluar)}</TableCell>
                      <TableCell className="text-xs tabular-nums">{formatJamBekerja(r.jamBekerja)}</TableCell>
                      <TableCell>
                        <span className={`skeuo-pill ${w.bg} ${w.text}`}>
                          <span className={`led ${w.dot}`} />
                          {w.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-stone-600">{r.sebabLewat || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {memuat && (
        <div className="sr-only" aria-live="polite">
          <Loader2 className="animate-spin" /> Memuatkan data kehadiran...
        </div>
      )}
    </div>
  );
}

export default KehadiranSayaView;
