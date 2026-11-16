"use client";

// ProfilView (FR-A04) — Sistem Rekod Kehadiran Guru & Staf SRI Al-Amin Gombak.
// Profil: semua peranan boleh lihat maklumat sendiri & tukar kata laluan.
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { LABEL_PERANAN, formatTarikhBM } from "@/lib/domain";

const KOSONG = { kataLaluanLama: "", kataLaluanBaharu: "", sahKataLaluan: "" };

function sahKataLaluanBaharu(laluan: string): string | null {
  if (laluan.length < 8) return "Kata laluan baharu mestilah sekurang-kurangnya 8 aksara.";
  if (!/[A-Za-z]/.test(laluan)) return "Kata laluan baharu mesti mengandungi sekurang-kurangnya satu huruf.";
  if (!/[0-9]/.test(laluan)) return "Kata laluan baharu mesti mengandungi sekurang-kurangnya satu nombor.";
  return null;
}

function BarisMaklumat({ label, nilai }: { label: string; nilai?: string | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2 border-b border-stone-200 last:border-b-0">
      <span className="text-xs font-medium uppercase tracking-wide text-stone-500 sm:w-40 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-stone-800 break-words">{nilai || "—"}</span>
    </div>
  );
}

export default function ProfilView() {
  const { staf } = useAuth();
  const [form, setForm] = useState(KOSONG);
  const [menyimpan, setMenyimpan] = useState(false);

  if (!staf) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-stone-800">Profil</h1>
        <div className="skeuo-card p-6 space-y-3">
          <Skeleton className="h-5 w-1/3" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const set = (k: keyof typeof KOSONG, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staf) return;

    if (!form.kataLaluanLama) {
      toast.error("Sila masukkan kata laluan semasa.");
      return;
    }
    const ralatBaharu = sahKataLaluanBaharu(form.kataLaluanBaharu);
    if (ralatBaharu) {
      toast.error(ralatBaharu);
      return;
    }
    if (form.kataLaluanBaharu !== form.sahKataLaluan) {
      toast.error("Pengesahan kata laluan baharu tidak sepadan.");
      return;
    }

    setMenyimpan(true);
    try {
      // Langkah 1: sahkan kata laluan lama melalui endpoint log masuk
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          noIdStaf: staf.noIdStaf,
          kataLaluan: form.kataLaluanLama,
        }),
      });
      // Langkah 2: tukar kata laluan baharu
      await apiFetch<{ ok: boolean }>("/api/profil/tukar-laluan", {
        method: "POST",
        body: JSON.stringify({ kataLaluanBaharu: form.kataLaluanBaharu }),
      });
      toast.success("Kata laluan berjaya ditukar.");
      setForm(KOSONG);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menukar kata laluan.");
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-800">Profil Saya</h1>
        <p className="text-sm text-stone-600">Maklumat peribadi dan akaun anda.</p>
      </header>

      {/* Kad Maklumat Staf */}
      <section className="skeuo-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-emerald-100 p-2 text-emerald-700">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-800">Maklumat Staf</h2>
            <p className="text-xs text-stone-500">Maklumat ini diuruskan oleh pentadbir sistem.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          <BarisMaklumat label="Nama" nilai={staf.nama} />
          <BarisMaklumat label="No. ID Staf" nilai={staf.noIdStaf} />
          <BarisMaklumat label="Jawatan" nilai={staf.jawatan} />
          <BarisMaklumat label="Jabatan" nilai={staf.jabatan?.nama} />
          <BarisMaklumat label="Peranan" nilai={LABEL_PERANAN[staf.peranan] ?? staf.peranan} />
          <BarisMaklumat label="Kategori" nilai={staf.kategori} />
          <BarisMaklumat label="Emel" nilai={staf.emel} />
          <BarisMaklumat label="Telefon" nilai={staf.telefon} />
          <BarisMaklumat
            label="Tarikh Lantik"
            nilai={staf.tarikhLantik ? formatTarikhBM(staf.tarikhLantik) : null}
          />
        </div>
      </section>

      {/* Kad Tukar Kata Laluan */}
      <section className="skeuo-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-amber-100 p-2 text-amber-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-800">Tukar Kata Laluan</h2>
            <p className="text-xs text-stone-500">
              Kata laluan baharu mestilah sekurang-kurangnya 8 aksara dengan huruf dan nombor.
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="laluan-lama">Kata Laluan Semasa</Label>
            <Input
              id="laluan-lama"
              type="password"
              className="skeuo-input"
              autoComplete="current-password"
              value={form.kataLaluanLama}
              onChange={(e) => set("kataLaluanLama", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="laluan-baharu">Kata Laluan Baharu</Label>
            <Input
              id="laluan-baharu"
              type="password"
              className="skeuo-input"
              autoComplete="new-password"
              value={form.kataLaluanBaharu}
              onChange={(e) => set("kataLaluanBaharu", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sah-laluan">Sahkan Kata Laluan Baharu</Label>
            <Input
              id="sah-laluan"
              type="password"
              className="skeuo-input"
              autoComplete="new-password"
              value={form.sahKataLaluan}
              onChange={(e) => set("sahKataLaluan", e.target.value)}
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" className="skeuo-btn px-5" disabled={menyimpan}>
              {menyimpan ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Tukar Kata Laluan
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
