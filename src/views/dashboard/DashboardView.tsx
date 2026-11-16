"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Users, CheckCircle2, Clock, XCircle, CalendarOff, Briefcase,
  TrendingUp, PieChart, Bell, DoorOpen, LogIn, LogOut, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart as RPie, Pie, Cell, Legend,
} from "recharts";
import { WARNA_STATUS, formatMasa, formatTarikhBM, namaHariBM } from "@/lib/domain";
import type { StatusKehadiran, Staf } from "@/lib/types";

interface RingkasanAdmin {
  peranan: string;
  ringkasan: {
    totalStaf: number;
    hadir: number;
    lewat: number;
    belumHadir: number;
    cuti: number;
    tugasRasmi: number;
    peratus: number;
    tarikh: string;
    isCutiUmum: boolean;
    isWorkingDay: boolean;
  };
  senaraiBelumHadir: (Staf & { jabatan?: { nama: string }; jawatan: string; noIdStaf: string })[];
  senaraiLewat: (Staf & { jabatan?: { nama: string }; jawatan: string; noIdStaf: string })[];
  cutiMenunggu: number;
  trend7Hari: { tarikh: string; hadir: number; lewat: number; tidakHadir: number; cuti: number }[];
  pecahanStatus: { status: string; bil: number }[];
}

interface RingkasanGuru {
  peranan: string;
  rekodHariIni: {
    id: string;
    status: StatusKehadiran;
    masaMasuk?: string | null;
    masaKeluar?: string | null;
    jamBekerja?: number | null;
    sebabLewat?: string | null;
  } | null;
  ringkasanBulanIni: { hadir: number; lewat: number; cuti: number; tidakHadir: number };
  bakiCuti: { jenisCutiId: string; jenisCuti?: { nama: string }; layak: number; digunakan: number }[];
  notifikasiBelumDibaca: number;
  daftarBoleh: boolean;
}

const WARNA_PIE: Record<string, string> = {
  Hadir: "#16a34a",
  Lewat: "#d97706",
  TidakHadir: "#dc2626",
  Cuti: "#0284c7",
  TugasRasmi: "#7c3aed",
  CutiUmum: "#64748b",
};

export function DashboardView() {
  const { staf } = useAuth();
  const peranan = staf?.peranan;
  const [memuat, setMemuat] = useState(true);

  const [admin, setAdmin] = useState<RingkasanAdmin | null>(null);
  const [guru, setGuru] = useState<RingkasanGuru | null>(null);

  useEffect(() => {
    let aktif = true;
    (async () => {
      setMemuat(true);
      try {
        const data = await apiFetch<RingkasanAdmin & RingkasanGuru>("/api/dashboard");
        if (!aktif) return;
        if (peranan === "Admin" || peranan === "Pengetua" || peranan === "Penyelia") {
          setAdmin(data as RingkasanAdmin);
        } else {
          setGuru(data as RingkasanGuru);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuatkan dashboard.");
      } finally {
        setMemuat(false);
      }
    })();
    return () => { aktif = false; };
  }, [peranan]);

  if (memuat) {
    return (
      <div className="space-y-3">
        <div className="skeuo-card h-24 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeuo-card h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const hariIni = new Date();
  const salam = (() => {
    const h = hariIni.getHours();
    if (h < 11) return "Selamat pagi";
    if (h < 15) return "Selamat tengah hari";
    if (h < 19) return "Selamat petang";
    return "Selamat malam";
  })();

  if (peranan === "Guru" || peranan === "Kiosk") {
    return guru ? (
      <GuruDashboard data={guru} salam={salam} nama={staf?.nama || ""} hariIni={hariIni} />
    ) : (
      <TiadaData />
    );
  }

  return admin ? (
    <AdminDashboard data={admin} salam={salam} nama={staf?.nama || ""} hariIni={hariIni} peranan={peranan || "Admin"} />
  ) : (
    <TiadaData />
  );
}

function TiadaData() {
  return (
    <div className="skeuo-card p-8 text-center text-stone-500">
      Tiada data dashboard tersedia.
    </div>
  );
}

function KadStat({ label, nilai, ikon, warna, sub }: {
  label: string; nilai: number | string; ikon: React.ReactNode; warna: string; sub?: string;
}) {
  return (
    <div className="skeuo-card p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">{label}</div>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${warna}`}>{ikon}</div>
      </div>
      <div className="text-2xl font-bold text-stone-800 tabular-nums">{nilai}</div>
      {sub && <div className="text-[10px] text-stone-500">{sub}</div>}
    </div>
  );
}

function AdminDashboard({ data, salam, nama, hariIni, peranan }: {
  data: RingkasanAdmin; salam: string; nama: string; hariIni: Date; peranan: string;
}) {
  const r = data.ringkasan;
  const trendData = data.trend7Hari.map((t) => ({
    tarikh: formatTarikhBM(t.tarikh).slice(0, 5),
    Hadir: t.hadir,
    Lewat: t.lewat,
    TidakHadir: t.tidakHadir,
    Cuti: t.cuti,
  }));
  const pieData = data.pecahanStatus.filter((p) => p.bil > 0).map((p) => ({
    name: p.status, value: p.bil, fill: WARNA_PIE[p.status] || "#999",
  }));

  return (
    <div className="space-y-4">
      {/* Salam header */}
      <div className="skeuo-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
            {namaHariBM(hariIni)}, {formatTarikhBM(hariIni)}
          </div>
          <div className="text-lg sm:text-xl font-bold text-stone-800">
            {salam}, {nama.split(" ").slice(0, 2).join(" ")}.
          </div>
          <div className="text-xs text-stone-500 mt-0.5">
            {peranan === "Pengetua" ? "Pemantauan disiplin & kelulusan cuti" :
             peranan === "Penyelia" ? "Pemantauan jabatan" :
             "Pengurusan kehadiran harian"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="lcd-display px-3 py-2 text-center">
            <div className="text-[9px] uppercase">Peratus Hari Ini</div>
            <div className="text-2xl font-bold tabular-nums">{r.peratus}%</div>
          </div>
        </div>
      </div>

      {/* Kad ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <KadStat label="Jumlah Staf" nilai={r.totalStaf} ikon={<Users size={16} className="text-white" />} warna="bg-stone-600" />
        <KadStat label="Hadir" nilai={r.hadir} ikon={<CheckCircle2 size={16} className="text-white" />} warna="bg-emerald-600" />
        <KadStat label="Lewat" nilai={r.lewat} ikon={<Clock size={16} className="text-white" />} warna="bg-amber-500" />
        <KadStat label="Belum Hadir" nilai={r.belumHadir} ikon={<XCircle size={16} className="text-white" />} warna="bg-rose-600" />
        <KadStat label="Cuti" nilai={r.cuti} ikon={<CalendarOff size={16} className="text-white" />} warna="bg-sky-600" />
        <KadStat label="Tugas Rasmi" nilai={r.tugasRasmi} ikon={<Briefcase size={16} className="text-white" />} warna="bg-violet-600" />
      </div>

      {/* Senarai belum hadir & lewat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="skeuo-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-rose-600" />
              <h3 className="font-bold text-stone-800 text-sm">Belum Hadir Hari Ini</h3>
            </div>
            <span className="skeuo-pill bg-rose-100 text-rose-800">{r.belumHadir} staf</span>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto custom-scroll">
            {data.senaraiBelumHadir.length === 0 ? (
              <div className="text-center py-6 text-stone-400 text-sm">Semua staf telah mendaftar kehadiran.</div>
            ) : (
              data.senaraiBelumHadir.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 skeuo-card-inset rounded">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-800 truncate">{s.nama}</div>
                    <div className="text-[10px] text-stone-500">{s.jawatan} · {s.jabatan?.nama || "—"}</div>
                  </div>
                  <span className="text-[10px] text-stone-400">{s.noIdStaf}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="skeuo-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-600" />
              <h3 className="font-bold text-stone-800 text-sm">Lewat Hari Ini</h3>
            </div>
            <span className="skeuo-pill bg-amber-100 text-amber-800">{r.lewat} staf</span>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto custom-scroll">
            {data.senaraiLewat.length === 0 ? (
              <div className="text-center py-6 text-stone-400 text-sm">Tiada staf lewat hari ini.</div>
            ) : (
              data.senaraiLewat.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2 skeuo-card-inset rounded">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-800 truncate">{s.nama}</div>
                    <div className="text-[10px] text-stone-500">{s.jawatan}</div>
                  </div>
                  <span className="text-[10px] text-amber-700 font-mono">{s.noIdStaf}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Carta trend & pai */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="skeuo-card p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-emerald-700" />
            <h3 className="font-bold text-stone-800 text-sm">Trend Kehadiran 7 Hari Terakhir</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,90,40,0.15)" />
              <XAxis dataKey="tarikh" tick={{ fontSize: 10 }} stroke="#78583c" />
              <YAxis tick={{ fontSize: 10 }} stroke="#78583c" />
              <Tooltip contentStyle={{ background: "#fff8e8", border: "1px solid #c9a86a", borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Hadir" stackId="a" fill="#16a34a" />
              <Bar dataKey="Lewat" stackId="a" fill="#d97706" />
              <Bar dataKey="TidakHadir" stackId="a" fill="#dc2626" />
              <Bar dataKey="Cuti" stackId="a" fill="#0284c7" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="skeuo-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <PieChart size={16} className="text-emerald-700" />
            <h3 className="font-bold text-stone-800 text-sm">Pecahan Status Bulan Ini</h3>
          </div>
          {pieData.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-sm">Tiada data.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RPie>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#fff8e8", border: "1px solid #c9a86a", borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </RPie>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Widget cuti menunggu */}
      <div className="skeuo-card-inset p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center">
            <Bell size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold text-stone-800">Cuti Menunggu Kelulusan</div>
            <div className="text-[11px] text-stone-500">Tinjau di halaman Kelulusan Cuti</div>
          </div>
        </div>
        <div className="text-2xl font-bold text-amber-700 tabular-nums">{data.cutiMenunggu}</div>
      </div>
    </div>
  );
}

function GuruDashboard({ data, salam, nama, hariIni }: {
  data: RingkasanGuru; salam: string; nama: string; hariIni: Date;
}) {
  const [menjalankan, setMenjalankan] = useState<"masuk" | "keluar" | null>(null);

  async function daftar(jenis: "masuk" | "keluar") {
    setMenjalankan(jenis);
    try {
      if (jenis === "masuk") {
        const r = await apiFetch<{ rekod: { status: string; masaMasuk: string }; amaran?: string }>("/api/kehadiran/daftar-masuk", { method: "POST", body: JSON.stringify({}) });
        toast.success(`Daftar masuk berjaya. Status: ${r.rekod.status}. Masa: ${formatMasa(r.rekod.masaMasuk)}.`);
        if (r.amaran) toast.warning(r.amaran);
      } else {
        const r = await apiFetch<{ rekod: { jamBekerja: number }; amaran?: string }>("/api/kehadiran/daftar-keluar", { method: "POST", body: JSON.stringify({}) });
        toast.success(`Daftar keluar berjaya. Jam bekerja: ${r.rekod.jamBekerja?.toFixed(1) || 0} jam.`);
        if (r.amaran) toast.warning(r.amaran);
      }
      // Refresh data
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mendaftar.");
    } finally {
      setMenjalankan(null);
    }
  }

  const sudahMasuk = !!data.rekodHariIni?.masaMasuk;
  const sudahKeluar = !!data.rekodHariIni?.masaKeluar;
  const statusHariIni = data.rekodHariIni?.status as StatusKehadiran | undefined;
  const warnaStatus = statusHariIni ? WARNA_STATUS[statusHariIni] : null;

  return (
    <div className="space-y-4">
      <div className="skeuo-panel p-4 sm:p-5">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
          {namaHariBM(hariIni)}, {formatTarikhBM(hariIni)}
        </div>
        <div className="text-lg sm:text-xl font-bold text-stone-800">
          {salam}, {nama.split(" ").slice(0, 2).join(" ")}.
        </div>
        <div className="text-xs text-stone-500 mt-0.5">{data.daftarBoleh ? "Anda boleh mendaftar kehadiran hari ini." : "Hari ini bukan hari bekerja atau anda dalam cuti."}</div>
      </div>

      {/* Butang daftar besar */}
      <div className="skeuo-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-stone-800 text-sm flex items-center gap-2">
            <Activity size={16} className="text-emerald-700" /> Status Kehadiran Hari Ini
          </h3>
          {warnaStatus && (
            <span className={`skeuo-pill ${warnaStatus.bg} ${warnaStatus.text}`}>
              <span className={`led ${warnaStatus.dot}`} />
              {warnaStatus.label}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="skeuo-card-inset p-3 text-center">
            <div className="text-[10px] uppercase text-stone-500">Masa Masuk</div>
            <div className="text-lg font-mono font-bold text-emerald-800 tabular-nums">
              {formatMasa(data.rekodHariIni?.masaMasuk)}
            </div>
          </div>
          <div className="skeuo-card-inset p-3 text-center">
            <div className="text-[10px] uppercase text-stone-500">Masa Keluar</div>
            <div className="text-lg font-mono font-bold text-rose-800 tabular-nums">
              {formatMasa(data.rekodHariIni?.masaKeluar)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => daftar("masuk")}
            disabled={!data.daftarBoleh || sudahMasuk || menjalankan === "masuk"}
            className="skeuo-btn-kiosk py-5 font-bold text-base flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn size={22} />
            <span>{sudahMasuk ? "Sudah Daftar Masuk" : "Daftar Masuk"}</span>
          </button>
          <button
            onClick={() => daftar("keluar")}
            disabled={!sudahMasuk || sudahKeluar || menjalankan === "keluar"}
            className="skeuo-btn-kiosk py-5 font-bold text-base flex flex-col items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: sudahKeluar ? undefined : "radial-gradient(circle at 30% 30%, oklch(0.55 0.2 25) 0%, oklch(0.34 0.18 25) 70%)",
              borderColor: sudahKeluar ? undefined : "oklch(0.2 0.15 25)",
            }}
          >
            <LogOut size={22} />
            <span>{sudahKeluar ? "Sudah Daftar Keluar" : "Daftar Keluar"}</span>
          </button>
        </div>
      </div>

      {/* Ringkasan bulan ini + baki cuti */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="skeuo-card p-4">
          <h3 className="font-bold text-stone-800 text-sm mb-3">Ringkasan Bulan Ini</h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="skeuo-card-inset p-2 text-center">
              <div className="text-[9px] uppercase text-stone-500">Hadir</div>
              <div className="text-lg font-bold text-emerald-700">{data.ringkasanBulanIni.hadir}</div>
            </div>
            <div className="skeuo-card-inset p-2 text-center">
              <div className="text-[9px] uppercase text-stone-500">Lewat</div>
              <div className="text-lg font-bold text-amber-600">{data.ringkasanBulanIni.lewat}</div>
            </div>
            <div className="skeuo-card-inset p-2 text-center">
              <div className="text-[9px] uppercase text-stone-500">Cuti</div>
              <div className="text-lg font-bold text-sky-600">{data.ringkasanBulanIni.cuti}</div>
            </div>
            <div className="skeuo-card-inset p-2 text-center">
              <div className="text-[9px] uppercase text-stone-500">T. Hadir</div>
              <div className="text-lg font-bold text-rose-600">{data.ringkasanBulanIni.tidakHadir}</div>
            </div>
          </div>
        </div>

        <div className="skeuo-card p-4">
          <h3 className="font-bold text-stone-800 text-sm mb-3">Baki Cuti Tahun Ini</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto custom-scroll">
            {data.bakiCuti.length === 0 ? (
              <div className="text-center py-4 text-stone-400 text-xs">Tiada rekod baki cuti.</div>
            ) : (
              data.bakiCuti.map((b) => {
                const baki = b.layak - b.digunakan;
                return (
                  <div key={b.jenisCutiId} className="flex items-center justify-between p-2 skeuo-card-inset rounded">
                    <span className="text-xs text-stone-700">{b.jenisCuti?.nama || b.jenisCutiId}</span>
                    <span className="text-xs font-bold tabular-nums text-emerald-700">{baki.toFixed(1)} / {b.layak}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
