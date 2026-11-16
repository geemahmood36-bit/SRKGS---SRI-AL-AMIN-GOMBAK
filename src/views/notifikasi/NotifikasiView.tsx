"use client";

// NotifikasiView (FR-G01) — Sistem Rekod Kehadiran Guru & Staf SRI Al-Amin Gombak.
// Pusat Notifikasi: semua peranan boleh lihat notifikasi sendiri.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { formatTarikhMasaBM } from "@/lib/domain";
import type { Notifikasi } from "@/lib/types";

function masaRelatif(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const mnt = Math.floor(diff / 60000);
  if (mnt < 1) return "Baru sahaja";
  if (mnt < 60) return `${mnt} minit lalu`;
  const jam = Math.floor(mnt / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return formatTarikhMasaBM(iso);
}

export default function NotifikasiView() {
  const { staf } = useAuth();
  const [senarai, setSenarai] = useState<Notifikasi[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [menanda, setMenanda] = useState(false);
  const [menandaiSatu, setMenandaiSatu] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const r = await apiFetch<{ senarai: Notifikasi[] }>("/api/notifikasi");
      setSenarai(r.senarai ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuatkan notifikasi.");
      setSenarai([]);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    if (staf) muat();
    else setMemuat(false);
  }, [staf, muat]);

  const tandaiBaca = async (id: string) => {
    setMenandaiSatu(id);
    try {
      await apiFetch<{ notifikasi: Notifikasi }>(`/api/notifikasi/${id}/baca`, {
        method: "PATCH",
      });
      setSenarai((s) =>
        s.map((n) => (n.id === id ? { ...n, dibaca: true } : n))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menandai dibaca.");
    } finally {
      setMenandaiSatu(null);
    }
  };

  const tandaiSemua = async () => {
    setMenanda(true);
    try {
      await apiFetch<{ ok: boolean; dikemaskini: number }>("/api/notifikasi/baca-semua", {
        method: "POST",
      });
      setSenarai((s) => s.map((n) => ({ ...n, dibaca: true })));
      toast.success("Semua notifikasi ditandai dibaca.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menandai semua.");
    } finally {
      setMenanda(false);
    }
  };

  const bilBelumBaca = senarai.filter((n) => !n.dibaca).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Pusat Notifikasi</h1>
          <p className="text-sm text-stone-600">
            {bilBelumBaca > 0
              ? `Anda ada ${bilBelumBaca} notifikasi belum dibaca.`
              : "Semua notifikasi telah dibaca."}
          </p>
        </div>
        <Button
          className="skeuo-btn-secondary px-4"
          onClick={tandaiSemua}
          disabled={menanda || bilBelumBaca === 0}
        >
          {menanda ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
          Tandai Semua Dibaca
        </Button>
      </header>

      {memuat ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeuo-card p-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-3 h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      ) : senarai.length === 0 ? (
        <div className="skeuo-card p-10 text-center text-stone-500">
          <Bell className="mx-auto h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Tiada notifikasi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {senarai.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.dibaca && tandaiBaca(n.id)}
              disabled={n.dibaca || menandaiSatu === n.id}
              className={`w-full text-left skeuo-card p-4 transition-all ${
                n.dibaca
                  ? "opacity-70"
                  : "border-l-4 border-l-sky-500 hover:shadow-md cursor-pointer"
              }`}
            >
              <div className="flex items-start gap-3">
                {!n.dibaca && (
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-sky-500 flex-shrink-0 shadow-[0_0_4px_rgba(14,165,233,0.6)]" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm ${n.dibaca ? "font-medium text-stone-600" : "font-semibold text-stone-900"}`}>
                      {n.tajuk}
                    </h3>
                    {menandaiSatu === n.id && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${n.dibaca ? "text-stone-500" : "text-stone-700"}`}>
                    {n.mesej}
                  </p>
                  <p className="text-xs text-stone-400 mt-2">
                    {masaRelatif(n.dicipta)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
