// Klien fetch yang ringkas dengan pengendalian ralat & cookies
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (res.status === 401) {
    throw new ApiError(401, "Sesi tamat. Sila log masuk semula.");
  }
  if (res.status === 403) {
    throw new ApiError(403, "Anda tiada kebenaran untuk tindakan ini.");
  }
  if (!res.ok) {
    let mesej = `Ralat (${res.status})`;
    try {
      const data = await res.json();
      mesej = data.ralat || data.mesej || mesej;
    } catch {}
    throw new ApiError(res.status, mesej);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, mesej: string) {
    super(mesej);
    this.status = status;
    this.name = "ApiError";
  }
}

// Eksport CSV daripada data jadual
export function eksportCSV(namaFail: string, lajur: string[], baris: Record<string, unknown>[]) {
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = lajur.map(escape).join(",");
  const rows = baris.map((b) => lajur.map((k) => escape(b[k])).join(","));
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFail;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Cetak halaman semasa
export function cetakHalaman() {
  window.print();
}
