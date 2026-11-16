"use client";

// Konteks autentikasi sisi klien
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Staf } from "@/lib/types";

interface AuthCtx {
  staf: Staf | null;
  memuat: boolean;
  logMasuk: (noIdStaf: string, kataLaluan: string) => Promise<void>;
  logKeluar: () => Promise<void>;
  semula: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staf, setStaf] = useState<Staf | null>(null);
  const [memuat, setMemuat] = useState(true);

  const semula = useCallback(async () => {
    try {
      const res = await apiFetch<{ staf: Staf }>("/api/auth/me");
      setStaf(res.staf);
    } catch {
      setStaf(null);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    semula();
  }, [semula]);

  const logMasuk = useCallback(async (noIdStaf: string, kataLaluan: string) => {
    const s = await apiFetch<{ staf: Staf }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ noIdStaf, kataLaluan }),
    });
    setStaf(s.staf);
  }, []);

  const logKeluar = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setStaf(null);
  }, []);

  return (
    <Ctx.Provider value={{ staf, memuat, logMasuk, logKeluar, semula }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth mesti digunakan dalam AuthProvider");
  return c;
}
