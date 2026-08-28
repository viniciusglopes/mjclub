export const TIMEZONE = "America/Sao_Paulo";

export function formatBRL(cents: number): string {
  if (cents === 0) return "Grátis";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** `2026-09-01` → `seg, 1 de set`. */
export function formatDateLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00-03:00`);
  return d
    .toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: TIMEZONE,
    })
    .replace(/\.$/, "");
}

/** ISO completo → `01/09 às 09:00`. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: TIMEZONE,
  });
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
  return `${date} às ${time}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
}

/** Telefone só com dígitos → `(11) 98888-0002`. */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

export function onlyDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}
