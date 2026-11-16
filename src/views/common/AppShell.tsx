"use client";

import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { LABEL_PERANAN } from "@/lib/domain";
import type { Peranan } from "@/lib/types";
import {
  LayoutDashboard, CalendarCheck, ClipboardList, CalendarDays,
  FileBarChart, Users, Settings, ShieldAlert, Bell, UserCircle,
  LogOut, Menu, X, Building2, DoorOpen,
} from "lucide-react";

export type NamaLaluan =
  | "dashboard" | "kehadiran-saya" | "kehadiran-urus" | "kiosk"
  | "cuti" | "cuti-kelulusan" | "laporan" | "staf"
  | "kalendar" | "tetapan" | "audit" | "notifikasi" | "profil";

interface ItemNav {
  id: NamaLaluan;
  label: string;
  icon: ReactNode;
  perananDibenar: Peranan[];
}

const ITEM_NAV: ItemNav[] = [
  { id: "dashboard", label: "Papan Pemuka", icon: <LayoutDashboard size={18} />, perananDibenar: ["Admin", "Pengetua", "Penyelia", "Guru"] },
  { id: "kehadiran-saya", label: "Kehadiran Saya", icon: <CalendarCheck size={18} />, perananDibenar: ["Admin", "Pengetua", "Penyelia", "Guru"] },
  { id: "kiosk", label: "Mod Kiosk", icon: <DoorOpen size={18} />, perananDibenar: ["Admin", "Kiosk"] },
  { id: "kehadiran-urus", label: "Urus Kehadiran", icon: <ClipboardList size={18} />, perananDibenar: ["Admin"] },
  { id: "cuti", label: "Cuti Saya", icon: <CalendarDays size={18} />, perananDibenar: ["Admin", "Pengetua", "Penyelia", "Guru"] },
  { id: "cuti-kelulusan", label: "Kelulusan Cuti", icon: <ClipboardList size={18} />, perananDibenar: ["Admin", "Pengetua", "Penyelia"] },
  { id: "laporan", label: "Laporan", icon: <FileBarChart size={18} />, perananDibenar: ["Admin", "Pengetua", "Penyelia"] },
  { id: "staf", label: "Pengurusan Staf", icon: <Users size={18} />, perananDibenar: ["Admin"] },
  { id: "kalendar", label: "Kalendar Cuti", icon: <CalendarDays size={18} />, perananDibenar: ["Admin", "Pengetua", "Penyelia", "Guru"] },
  { id: "tetapan", label: "Tetapan", icon: <Settings size={18} />, perananDibenar: ["Admin"] },
  { id: "audit", label: "Log Audit", icon: <ShieldAlert size={18} />, perananDibenar: ["Admin", "Pengetua"] },
  { id: "notifikasi", label: "Notifikasi", icon: <Bell size={18} />, perananDibenar: ["Admin", "Pengetua", "Penyelia", "Guru"] },
  { id: "profil", label: "Profil", icon: <UserCircle size={18} />, perananDibenar: ["Admin", "Pengetua", "Penyelia", "Guru", "Kiosk"] },
];

interface AppShellProps {
  laluanAktif: NamaLaluan;
  onTukarLaluan: (l: NamaLaluan) => void;
  bilNotifikasiBelumDibaca: number;
  kanak: ReactNode;
}

export function AppShell({ laluanAktif, onTukarLaluan, bilNotifikasiBelumDibaca, kanak }: AppShellProps) {
  const { staf, logKeluar } = useAuth();
  const [menuTerbuka, setMenuTerbuka] = useState(false);
  const [masa, setMasa] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setMasa(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!staf) return null;

  const peranan = staf.peranan as Peranan;
  const itemTampak = ITEM_NAV.filter((i) => i.perananDibenar.includes(peranan));

  async function handleLogKeluar() {
    await logKeluar();
  }

  // Butang nav bawah (mobile) — 5 utama
  const navBawah = itemTampak.slice(0, 5);

  return (
    <div className="min-h-screen bg-wood flex flex-col">
      {/* Sepanduk Mod Demo */}
      <div className="demo-banner px-4 py-1.5 text-center text-[11px] font-semibold flex items-center justify-center gap-2 print:hidden">
        <span>⚠</span>
        <span>Mod Demo — data rekaan untuk prototaip SRI Al-Amin Gombak. Bukan data sebenar.</span>
      </div>

      {/* Header */}
      <header className="metal-plate px-3 sm:px-5 py-2 flex items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMenuTerbuka(true)}
            className="lg:hidden skeuo-btn-secondary p-2"
            aria-label="Buka menu"
          >
            <Menu size={18} />
          </button>
          <div className="w-9 h-9 rounded-full skeuo-btn flex items-center justify-center text-[10px] font-bold shrink-0">
            SRI
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-stone-800 truncate">
              SRKGS · SRI Al-Amin Gombak
            </div>
            <div className="text-[10px] text-stone-500 truncate hidden sm:block">
              Sistem Rekod Kehadiran Guru &amp; Staf
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Jam langsung */}
          <div className="lcd-display px-2.5 py-1 text-xs font-mono hidden sm:block tabular-nums">
            {masa.toLocaleTimeString("ms-MY", { hour12: false })}
          </div>

          {/* Loceng notifikasi */}
          <button
            onClick={() => onTukarLaluan("notifikasi")}
            className="skeuo-btn-secondary relative p-2"
            aria-label="Notifikasi"
          >
            <Bell size={16} />
            {bilNotifikasiBelumDibaca > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow border border-white/50">
                {bilNotifikasiBelumDibaca > 99 ? "99+" : bilNotifikasiBelumDibaca}
              </span>
            )}
          </button>

          {/* Butang staf */}
          <button
            onClick={() => onTukarLaluan("profil")}
            className="skeuo-btn-secondary px-2 py-1.5 flex items-center gap-2"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center">
              {staf.nama.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-[11px] font-semibold text-stone-700 leading-tight truncate max-w-[120px]">
                {staf.nama}
              </div>
              <div className="text-[9px] text-stone-500 leading-tight">
                {LABEL_PERANAN[peranan]}
              </div>
            </div>
          </button>

          <button
            onClick={handleLogKeluar}
            className="skeuo-btn-danger p-2"
            aria-label="Log keluar"
            title="Log Keluar"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar desktop */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] text-[var(--sidebar-foreground)]">
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto custom-scroll">
            {itemTampak.map((item) => (
              <button
                key={item.id}
                onClick={() => onTukarLaluan(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  laluanAktif === item.id
                    ? "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] shadow-inner"
                    : "text-[var(--sidebar-foreground)]/85 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                }`}
              >
                {item.icon}
                <span className="text-left">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-3 border-t border-[var(--sidebar-border)] text-[10px] text-[var(--sidebar-foreground)]/60">
            <div className="flex items-center gap-1.5">
              <Building2 size={11} />
              <span>Prototaip v1.0 · Fasa 1</span>
            </div>
          </div>
        </aside>

        {/* Drawer mobile */}
        {menuTerbuka && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMenuTerbuka(false)}
            />
            <aside className="relative w-64 max-w-[80vw] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] flex flex-col animate-slide-in">
              <div className="flex items-center justify-between p-3 border-b border-[var(--sidebar-border)]">
                <div className="text-sm font-bold">Menu</div>
                <button
                  onClick={() => setMenuTerbuka(false)}
                  className="p-1.5 text-[var(--sidebar-foreground)]/70 hover:text-[var(--sidebar-foreground)]"
                  aria-label="Tutup menu"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 p-2 space-y-1 overflow-y-auto custom-scroll">
                {itemTampak.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTukarLaluan(item.id);
                      setMenuTerbuka(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium ${
                      laluanAktif === item.id
                        ? "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]"
                        : "hover:bg-[var(--sidebar-accent)]"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </aside>
          </div>
        )}

        {/* Kandungan utama */}
        <main className="flex-1 min-w-0 overflow-x-hidden pb-20 lg:pb-6">
          <div className="p-3 sm:p-5 lg:p-6 max-w-[1400px] mx-auto">
            {kanak}
          </div>
        </main>
      </div>

      {/* Nav bawah (mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 metal-plate border-t border-stone-400 flex z-40 print:hidden">
        {navBawah.map((item) => (
          <button
            key={item.id}
            onClick={() => onTukarLaluan(item.id)}
            className={`flex-1 py-2 flex flex-col items-center gap-0.5 ${
              laluanAktif === item.id ? "text-emerald-800" : "text-stone-600"
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.id === "notifikasi" && bilNotifikasiBelumDibaca > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[8px] font-bold rounded-full min-w-[12px] h-3 px-0.5 flex items-center justify-center">
                  {bilNotifikasiBelumDibaca > 9 ? "9+" : bilNotifikasiBelumDibaca}
                </span>
              )}
            </div>
            <span className="text-[9px] font-medium leading-tight truncate max-w-full px-0.5">
              {item.label.split(" ")[0]}
            </span>
          </button>
        ))}
      </nav>

      {/* Footer sticky */}
      <footer className="bg-stone-800 text-stone-300 text-center text-[10px] py-2 px-4 print:hidden lg:pb-2 pb-16">
        © 2026 Sekolah Rendah Islam Al-Amin Gombak · Prototaip Mod Demo · Dibangunkan untuk penilaian pengurusan sekolah
      </footer>
    </div>
  );
}
