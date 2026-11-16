"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Delete,
  LogIn,
  LogOut,
  RotateCcw,
  School,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Jenis = "masuk" | "keluar";

type SebabLewat =
  | "Kesesakan lalu lintas"
  | "Urusan keluarga"
  | "Kenderaan rosak"
  | "Lain-lain";

const SENARAI_SEBAB: SebabLewat[] = [
  "Kesesakan lalu lintas",
  "Urusan keluarga",
  "Kenderaan rosak",
  "Lain-lain",
];

const NAMA_HARI: string[] = [
  "Ahad",
  "Isnin",
  "Selasa",
  "Rabu",
  "Khamis",
  "Jumaat",
  "Sabtu",
];

function formatTarikhBM(d: Date): string {
  const hari = NAMA_HARI[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${hari}, ${dd}/${mm}/${yyyy}`;
}

function formatMasa(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatMasaPendek(d?: Date | string | null): string {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "-";
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

type KioskRekod = {
  id: string;
  status?: string | null;
  masaMasuk?: string | Date | null;
  masaKeluar?: string | Date | null;
  jamBekerja?: number | string | null;
};

type KioskRespOK = {
  rekod: KioskRekod;
  staf?: { nama: string };
  nama?: string;
  amaran?: string;
};

type KioskRespRalat = {
  ralat: string;
};

export default function KioskView({ fullscreen = true }: { fullscreen?: boolean }) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [jenis, setJenis] = useState<Jenis>("masuk");
  const [noIdStaf, setNoIdStaf] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [sebabLewat, setSebabLewat] = useState<SebabLewat | "">("");
  const [fokus, setFokus] = useState<"noIdStaf" | "pin">("noIdStaf");

  const [loading, setLoading] = useState<boolean>(false);
  const [ralat, setRalat] = useState<string | null>(null);
  const [amaran, setAmaran] = useState<string | null>(null);

  const [pengesahan, setPengesahan] = useState<{
    nama: string;
    status: string;
    masa: string;
    jenis: Jenis;
    jamBekerja?: string | null;
  } | null>(null);
  const [kiraan, setKiraan] = useState<number>(3);

  const ralatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const amaranTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update clock every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-dismiss error after 4s
  useEffect(() => {
    if (!ralat) return;
    if (ralatTimer.current) clearTimeout(ralatTimer.current);
    ralatTimer.current = setTimeout(() => setRalat(null), 4000);
    return () => {
      if (ralatTimer.current) clearTimeout(ralatTimer.current);
    };
  }, [ralat]);

  // Auto-dismiss amaran after 6s (warning)
  useEffect(() => {
    if (!amaran) return;
    if (amaranTimer.current) clearTimeout(amaranTimer.current);
    amaranTimer.current = setTimeout(() => setAmaran(null), 6000);
    return () => {
      if (amaranTimer.current) clearTimeout(amaranTimer.current);
    };
  }, [amaran]);

  const resetSepenuhnya = useCallback(() => {
    setPengesahan(null);
    setJenis("masuk");
    setNoIdStaf("");
    setPin("");
    setSebabLewat("");
    setFokus("noIdStaf");
    setRalat(null);
    setAmaran(null);
    setLoading(false);
  }, []);

  // Confirmation countdown (3s) - resetSepenuhnya is stable (useCallback)
  useEffect(() => {
    if (!pengesahan) return;
    setKiraan(3);
    const interval = setInterval(() => {
      setKiraan((k) => {
        if (k <= 1) {
          clearInterval(interval);
          resetSepenuhnya();
          return 0;
        }
        return k - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pengesahan, resetSepenuhnya]);

  const tekanKekunci = useCallback(
    (k: string) => {
      setRalat(null);
      if (fokus === "noIdStaf") {
        if (k === "clear") {
          setNoIdStaf("");
        } else if (k === "backspace") {
          setNoIdStaf((s) => s.slice(0, -1));
        } else if (k === "switch") {
          setFokus("pin");
        } else {
          setNoIdStaf((s) => (s.length >= 32 ? s : s + k));
        }
      } else {
        // pin - 4 digits numeric
        if (k === "clear") {
          setPin("");
        } else if (k === "backspace") {
          setPin((s) => s.slice(0, -1));
        } else if (k === "switch") {
          setFokus("noIdStaf");
        } else if (/^[0-9]$/.test(k)) {
          setPin((s) => (s.length >= 4 ? s : s + k));
        }
      }
    },
    [fokus],
  );

  const hantar = useCallback(async () => {
    if (loading || pengesahan) return;
    const id = noIdStaf.trim();
    const p = pin.trim();
    if (!id) {
      setRalat("Sila masukkan No. ID Staf.");
      setFokus("noIdStaf");
      return;
    }
    if (p.length !== 4) {
      setRalat("PIN mesti 4 digit.");
      setFokus("pin");
      return;
    }
    setLoading(true);
    setRalat(null);
    setAmaran(null);
    try {
      const body: Record<string, unknown> = { noIdStaf: id, pin: p, jenis };
      if (jenis === "masuk" && sebabLewat) body.sebabLewat = sebabLewat;
      const res = await fetch("/api/kehadiran/kiosk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: KioskRespOK & KioskRespRalat = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const msg = data?.ralat || `Ralat (${res.status})`;
        setRalat(msg);
        toast.error(msg);
        // Likely wrong PIN — clear pin
        if (res.status === 401) {
          setPin("");
          setFokus("pin");
        }
        return;
      }
      const nama = data.staf?.nama || data.nama || "Staf";
      const status = String(data.rekod?.status || (jenis === "keluar" ? "Daftar Keluar" : "Hadir"));
      const masa = formatMasaPendek(jenis === "masuk" ? data.rekod?.masaMasuk : data.rekod?.masaKeluar);
      const jamBekerja =
        jenis === "keluar" && data.rekod?.jamBekerja != null
          ? String(data.rekod.jamBekerja)
          : null;
      if (data.amaran) {
        setAmaran(data.amaran);
        toast.warning(data.amaran);
      }
      toast.success(jenis === "masuk" ? "Daftar masuk berjaya" : "Daftar keluar berjaya");
      setPengesahan({ nama, status, masa, jenis, jamBekerja });
    } catch (e: any) {
      const msg = "Ralat rangkaian. Cuba lagi.";
      setRalat(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [loading, pengesahan, noIdStaf, pin, jenis, sebabLewat]);

  const tarikhStr = useMemo(() => formatTarikhBM(now), [now]);
  const masaStr = useMemo(() => formatMasa(now), [now]);

  const pinDots = useMemo(() => {
    const arr = ["", "", "", ""];
    for (let i = 0; i < pin.length && i < 4; i++) arr[i] = "filled";
    return arr;
  }, [pin]);

  // Show confirmation panel
  if (pengesahan) {
    const isMasuk = pengesahan.jenis === "masuk";
    const statusColor =
      pengesahan.status === "Hadir"
        ? "text-green-700"
        : pengesahan.status === "Lewat"
          ? "text-amber-700"
          : "text-green-700";
    return (
      <div
        className={`bg-wood ${fullscreen ? "fixed inset-0 z-50" : "min-h-screen w-full"} flex flex-col items-center justify-center p-4 sm:p-8`}
      >
        <div className="skeuo-panel w-full max-w-3xl p-8 sm:p-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="led inline-block" style={{ color: "#22c55e" }} />
            <span className="text-sm font-semibold uppercase tracking-widest text-green-800">
              {isMasuk ? "Pendaftaran Masuk Berjaya" : "Pendaftaran Keluar Berjaya"}
            </span>
          </div>
          <CheckCircle2 className="mx-auto mb-4 h-20 w-20 text-green-700" strokeWidth={2.5} />
          <h2 className="mb-1 text-3xl font-bold text-stone-800 sm:text-4xl">
            {pengesahan.nama}
          </h2>
          <p className="mb-6 text-base text-stone-600">
            {isMasuk ? "Selamat datang" : "Selamat pulang"}
          </p>
          <div className="skeuo-card-inset mx-auto mb-6 grid max-w-md grid-cols-2 gap-4 p-5 text-left">
            <div>
              <div className="text-xs uppercase tracking-wide text-stone-500">Status</div>
              <div className={`text-xl font-bold ${statusColor}`}>{pengesahan.status}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-stone-500">
                {isMasuk ? "Masa Masuk" : "Masa Keluar"}
              </div>
              <div className="font-mono text-xl font-bold text-stone-800 tabular-nums">
                {pengesahan.masa}
              </div>
            </div>
            {!isMasuk && pengesahan.jamBekerja ? (
              <div className="col-span-2">
                <div className="text-xs uppercase tracking-wide text-stone-500">
                  Jam Bekerja
                </div>
                <div className="font-mono text-lg font-bold text-stone-800 tabular-nums">
                  {pengesahan.jamBekerja} jam
                </div>
              </div>
            ) : null}
          </div>
          {amaran ? (
            <div className="mx-auto mb-6 flex max-w-md items-center gap-2 rounded-md border border-amber-400 bg-amber-100 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{amaran}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-center gap-2 text-stone-600">
            <RotateCcw className="h-4 w-4 animate-pulse-soft" />
            <span className="text-sm">
              Skrin akan direset dalam <span className="font-bold tabular-nums">{kiraan}</span> saat...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-wood ${fullscreen ? "fixed inset-0 z-40 overflow-y-auto" : "min-h-screen w-full"} flex flex-col`}
    >
      {/* Header: metal plate school branding */}
      <header className="px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="metal-plate mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-stone-800 text-amber-200 sm:h-12 sm:w-12">
              <School className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-bold tracking-wide text-stone-800 sm:text-xl">
                SRI Al-Amin Gombak
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-stone-600 sm:text-xs">
                Sistem Rekod Kehadiran Guru &amp; Staf
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="led inline-block" style={{ color: "#22c55e" }} />
            <span className="hidden text-xs font-semibold text-green-800 sm:inline">
              KIOSK AKTIF
            </span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="skeuo-btn-secondary ml-1 inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold sm:px-3 sm:py-1.5 sm:text-sm"
              aria-label="Keluar Kiosk"
              title="Keluar Kiosk"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Keluar Kiosk</span>
            </button>
          </div>
        </div>
      </header>

      {/* Clock LCD */}
      <section className="px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="mx-auto w-full max-w-5xl">
          <div className="lcd-display flex flex-col items-center justify-center gap-1 px-4 py-3 text-center sm:py-4">
            <div
              className="font-mono text-4xl font-bold tabular-nums sm:text-6xl"
              aria-live="polite"
            >
              {masaStr}
            </div>
            <div className="font-mono text-sm font-semibold tabular-nums text-green-900/80 sm:text-base">
              {tarikhStr}
            </div>
          </div>
        </div>
      </section>

      {/* Main body */}
      <main className="flex-1 px-3 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Left: Mode + Inputs */}
          <div className="flex flex-col gap-4">
            {/* Mode toggle - LED-style buttons */}
            <div className="skeuo-panel p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-stone-600" />
                <span className="text-sm font-semibold uppercase tracking-wide text-stone-700">
                  Pilih Mod Pendaftaran
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setJenis("masuk")}
                  className={`flex flex-col items-center gap-2 px-3 py-4 text-base font-bold sm:text-lg ${
                    jenis === "masuk" ? "skeuo-btn-kiosk" : "skeuo-btn-secondary"
                  }`}
                  aria-pressed={jenis === "masuk"}
                >
                  <LogIn className="h-7 w-7" />
                  <span>Daftar Masuk</span>
                  <span
                    className={`led ${jenis === "masuk" ? "inline-block" : "hidden"}`}
                    style={{ color: "#22c55e" }}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setJenis("keluar")}
                  className={`flex flex-col items-center gap-2 px-3 py-4 text-base font-bold sm:text-lg ${
                    jenis === "keluar" ? "skeuo-btn-kiosk" : "skeuo-btn-secondary"
                  }`}
                  aria-pressed={jenis === "keluar"}
                >
                  <LogOut className="h-7 w-7" />
                  <span>Daftar Keluar</span>
                  <span
                    className={`led ${jenis === "keluar" ? "inline-block" : "hidden"}`}
                    style={{ color: "#ef4444" }}
                  />
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className="skeuo-panel p-4 sm:p-5">
              <div className="flex flex-col gap-4">
                {/* No ID */}
                <div>
                  <label
                    htmlFor="kiosk-no-id"
                    className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-stone-600"
                  >
                    <span>No. ID Staf</span>
                    <button
                      type="button"
                      onClick={() => setFokus("noIdStaf")}
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        fokus === "noIdStaf"
                          ? "bg-green-700 text-white"
                          : "bg-stone-200 text-stone-600"
                      }`}
                    >
                      {fokus === "noIdStaf" ? "Aktif" : "Tukar"}
                    </button>
                  </label>
                  <input
                    id="kiosk-no-id"
                    type="text"
                    value={noIdStaf}
                    onChange={(e) => setNoIdStaf(e.target.value)}
                    onFocus={() => setFokus("noIdStaf")}
                    className="skeuo-input h-14 w-full px-4 font-mono text-2xl font-bold tracking-wider text-stone-800 tabular-nums"
                    placeholder="cth: SRI-001"
                    autoComplete="off"
                    autoCapitalize="characters"
                    inputMode="text"
                  />
                </div>

                {/* PIN */}
                <div>
                  <label
                    htmlFor="kiosk-pin"
                    className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-stone-600"
                  >
                    <span>PIN (4 digit)</span>
                    <button
                      type="button"
                      onClick={() => setFokus("pin")}
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        fokus === "pin"
                          ? "bg-green-700 text-white"
                          : "bg-stone-200 text-stone-600"
                      }`}
                    >
                      {fokus === "pin" ? "Aktif" : "Tukar"}
                    </button>
                  </label>
                  <div
                    id="kiosk-pin"
                    role="presentation"
                    onClick={() => setFokus("pin")}
                    className="skeuo-input flex h-14 cursor-text items-center justify-center gap-3 px-4"
                  >
                    {pinDots.map((d, i) => (
                      <span
                        key={i}
                        className={`inline-block h-4 w-4 rounded-full border-2 transition ${
                          d === "filled"
                            ? "border-stone-800 bg-stone-800"
                            : "border-stone-400 bg-transparent"
                        }`}
                      />
                    ))}
                    <span className="ml-2 font-mono text-xs text-stone-500 tabular-nums">
                      {pin.length}/4
                    </span>
                  </div>
                </div>

                {/* Sebab lewat (masuk only) */}
                {jenis === "masuk" ? (
                  <div>
                    <label
                      htmlFor="kiosk-sebab"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-600"
                    >
                      Sebab Kekacangan (pilihan)
                    </label>
                    <select
                      id="kiosk-sebab"
                      value={sebabLewat}
                      onChange={(e) => setSebabLewat(e.target.value as SebabLewat | "")}
                      className="skeuo-input h-12 w-full px-3 text-base text-stone-800"
                    >
                      <option value="">— Tiada / tepat waktu —</option>
                      {SENARAI_SEBAB.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Error / amaran */}
            {ralat ? (
              <div
                role="alert"
                className="animate-slide-in flex items-start gap-3 rounded-lg border border-red-400 bg-red-100 px-4 py-3 text-sm font-semibold text-red-800 shadow-sm"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{ralat}</span>
                <button
                  type="button"
                  onClick={() => setRalat(null)}
                  className="text-red-700 hover:text-red-900"
                  aria-label="Tutup amaran"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            {amaran ? (
              <div
                role="status"
                className="animate-slide-in flex items-start gap-3 rounded-lg border border-amber-400 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{amaran}</span>
                <button
                  type="button"
                  onClick={() => setAmaran(null)}
                  className="text-amber-700 hover:text-amber-900"
                  aria-label="Tutup amaran"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {/* Submit button */}
            <button
              type="button"
              onClick={hantar}
              disabled={loading || pengesahan !== null}
              className="skeuo-btn-kiosk flex h-20 w-full items-center justify-center gap-3 px-4 text-2xl font-bold disabled:opacity-60 sm:h-24 sm:text-3xl"
            >
              {loading ? (
                <>
                  <RotateCcw className="h-7 w-7 animate-spin sm:h-8 sm:w-8" />
                  <span>Memproses...</span>
                </>
              ) : jenis === "masuk" ? (
                <>
                  <LogIn className="h-7 w-7 sm:h-8 sm:w-8" />
                  <span>Daftar Masuk</span>
                </>
              ) : (
                <>
                  <LogOut className="h-7 w-7 sm:h-8 sm:w-8" />
                  <span>Daftar Keluar</span>
                </>
              )}
            </button>
          </div>

          {/* Right: keypad */}
          <div className="skeuo-panel p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-stone-700">
                Papan Kekunci
              </span>
              <span className="text-xs text-stone-500">
                Medan aktif:{" "}
                <span className="font-bold text-stone-700">
                  {fokus === "noIdStaf" ? "No. ID" : "PIN"}
                </span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => tekanKekunci(d)}
                  className="skeuo-btn-kiosk flex h-16 items-center justify-center text-2xl font-bold sm:h-20 sm:text-3xl"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => tekanKekunci("clear")}
                className="skeuo-btn-danger flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold sm:h-20"
              >
                <Delete className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>Padam</span>
              </button>
              <button
                type="button"
                onClick={() => tekanKekunci("0")}
                className="skeuo-btn-kiosk flex h-16 items-center justify-center text-2xl font-bold sm:h-20 sm:text-3xl"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => tekanKekunci("backspace")}
                className="skeuo-btn-secondary flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold sm:h-20"
              >
                <Delete className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>Undur</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => tekanKekunci("switch")}
              className="skeuo-btn-secondary mt-2 flex h-10 w-full items-center justify-center gap-2 text-sm font-semibold sm:mt-3"
            >
              <RotateCcw className="h-4 w-4" />
              Tukar Medan Aktif
            </button>
          </div>
        </div>
      </main>

      <footer className="mt-auto px-3 pb-3 sm:px-6 sm:pb-4">
        <p className="mx-auto max-w-5xl text-center text-[11px] text-stone-600 sm:text-xs">
          Sentuh butang mod, masukkan No. ID Staf &amp; PIN, kemudian tekan butang
          pendaftaran. &copy; {new Date().getFullYear()} SRI Al-Amin Gombak.
        </p>
      </footer>
    </div>
  );
}
