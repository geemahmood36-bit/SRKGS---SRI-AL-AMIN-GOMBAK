"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, Building2 } from "lucide-react";

const AKAUN_DEMO = [
  { peranan: "Pengetua", noId: "G001" },
  { peranan: "Penyelia (PK)", noId: "G002" },
  { peranan: "Guru / Staf", noId: "G004" },
  { peranan: "Pentadbir", noId: "A001" },
  { peranan: "Kiosk", noId: "S012" },
];

export function LogMasukSkrin() {
  const { logMasuk } = useAuth();
  const [noIdStaf, setNoIdStaf] = useState("");
  const [kataLaluan, setKataLaluan] = useState("");
  const [tunjuk, setTunjuk] = useState(false);
  const [memuat, setMemuat] = useState(false);

  async function hantar(e: React.FormEvent) {
    e.preventDefault();
    setMemuat(true);
    try {
      await logMasuk(noIdStaf.trim(), kataLaluan);
      toast.success("Log masuk berjaya. Selamat datang!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Log masuk gagal.");
    } finally {
      setMemuat(false);
    }
  }

  function akaunCepat(id: string) {
    setNoIdStaf(id);
    setKataLaluan("Demo@1234");
  }

  return (
    <div className="min-h-screen bg-wood flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Plat logam header sekolah */}
        <div className="metal-plate p-5 mb-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full skeuo-btn flex items-center justify-center text-sm font-bold shadow-inner">
              SRI
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-widest text-stone-600 font-semibold">
                Sekolah Rendah Islam
              </div>
              <div className="text-base font-bold text-stone-800 leading-tight">
                Al-Amin Gombak
              </div>
            </div>
          </div>
          <div className="text-[10px] text-stone-500 mt-1">
            Gombak, Selangor Darul Ehsan, Malaysia
          </div>
        </div>

        {/* Sepanduk Mod Demo */}
        <div className="demo-banner rounded-md px-4 py-2 mb-4 text-center text-xs font-semibold">
          ⚠ Mod Demo — Semua data adalah rekaan untuk prototaip
        </div>

        {/* Panel log masuk */}
        <form onSubmit={hantar} className="skeuo-panel p-6 space-y-5">
          <div>
            <h1 className="text-xl font-bold text-stone-800 text-center">
              Sistem Rekod Kehadiran
            </h1>
            <p className="text-xs text-stone-500 text-center mt-1">
              Guru &amp; Staf · Sila log masuk dengan No. ID Staf
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="noIdStaf" className="text-sm font-semibold text-stone-700">
              No. ID Staf
            </label>
            <input
              id="noIdStaf"
              className="skeuo-input w-full px-3 py-2.5 text-sm"
              placeholder="cth. G001"
              value={noIdStaf}
              onChange={(e) => setNoIdStaf(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="kataLaluan" className="text-sm font-semibold text-stone-700">
              Kata Laluan
            </label>
            <div className="relative">
              <input
                id="kataLaluan"
                type={tunjuk ? "text" : "password"}
                className="skeuo-input w-full px-3 py-2.5 pr-10 text-sm"
                placeholder="Kata laluan"
                value={kataLaluan}
                onChange={(e) => setKataLaluan(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setTunjuk(!tunjuk)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-500 hover:text-stone-700"
                aria-label={tunjuk ? "Sembunyi kata laluan" : "Tunjuk kata laluan"}
              >
                {tunjuk ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={memuat}
            className="skeuo-btn w-full py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {memuat ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Memproses…
              </>
            ) : (
              <>
                <LogIn size={16} />
                Log Masuk
              </>
            )}
          </button>

          <div className="skeuo-card-inset p-3 rounded-md">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-stone-600 mb-2 flex items-center gap-1">
              <Building2 size={11} /> Akaun Demo (klik untuk auto-isi)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {AKAUN_DEMO.map((a) => (
                <button
                  key={a.noId}
                  type="button"
                  onClick={() => akaunCepat(a.noId)}
                  className="skeuo-btn-secondary px-2 py-1.5 text-[11px] text-left"
                >
                  <div className="font-semibold text-stone-700">{a.peranan}</div>
                  <div className="text-stone-500 text-[10px]">{a.noId} / Demo@1234</div>
                </button>
              ))}
            </div>
          </div>
        </form>

        <div className="text-center text-[10px] text-stone-500 mt-4 px-4">
          Prototaip Fasa 1 · Pangkalan data dummy (SQLite) · v1.0 Draf
        </div>
      </div>
    </div>
  );
}
