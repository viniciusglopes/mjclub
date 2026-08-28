import type { Slot, WorkSchedule } from "./types";

/**
 * O Brasil não adota mais horário de verão desde 2019, então America/Sao_Paulo
 * é um offset fixo de -03:00. Isso deixa a montagem de horários determinística
 * sem precisar de biblioteca de fuso.
 */
export const SP_OFFSET = "-03:00";

/** Intervalo entre horários oferecidos, em minutos. */
export const SLOT_STEP_MIN = 15;

export type Busy = { startsAt: string; endsAt: string };

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHhmm(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** `2026-09-01` + 540 → `2026-09-01T09:00:00-03:00`. */
export function isoAt(dateISO: string, minutes: number): string {
  return `${dateISO}T${minutesToHhmm(minutes)}:00${SP_OFFSET}`;
}

/**
 * Formata um instante no mesmo formato que `isoAt`.
 *
 * Todo horário guardado usa o offset de São Paulo, nunca `Z`: assim o texto
 * do início e o do fim são comparáveis entre si e `startsWith(data)` continua
 * identificando o dia do atendimento.
 */
export function toSpIso(instant: Date): string {
  const local = new Date(instant.getTime() - 3 * 60 * 60_000);
  return `${local.toISOString().slice(0, 19)}${SP_OFFSET}`;
}

/** Data corrente em São Paulo, no formato `YYYY-MM-DD`. */
export function todayInSP(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Dia da semana (0 = domingo) de uma data `YYYY-MM-DD` em São Paulo. */
export function weekdayOf(dateISO: string): number {
  return new Date(`${dateISO}T12:00:00${SP_OFFSET}`).getUTCDay();
}

/** As próximas `count` datas a partir de hoje, em `YYYY-MM-DD`. */
export function nextDates(count: number, from: Date = new Date()): string[] {
  const base = new Date(`${todayInSP(from)}T12:00:00${SP_OFFSET}`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/**
 * Monta os horários livres de um profissional em um dia.
 *
 * Fatia cada janela da grade semanal de `SLOT_STEP_MIN` em `SLOT_STEP_MIN`,
 * descarta o que não cabe até o fim do expediente, o que colide com um
 * atendimento ativo e o que já passou.
 */
export function buildSlots(params: {
  dateISO: string;
  durationMin: number;
  schedules: WorkSchedule[];
  busy: Busy[];
  now?: Date;
}): Slot[] {
  const { dateISO, durationMin, schedules, busy, now = new Date() } = params;
  const weekday = weekdayOf(dateISO);
  const windows = schedules.filter((s) => s.weekday === weekday);
  if (windows.length === 0) return [];

  const busyRanges = busy.map((b) => ({
    start: new Date(b.startsAt).getTime(),
    end: new Date(b.endsAt).getTime(),
  }));

  const nowMs = now.getTime();
  const slots: Slot[] = [];

  for (const w of windows) {
    const open = hhmmToMinutes(w.startTime);
    const close = hhmmToMinutes(w.endTime);

    for (let m = open; m + durationMin <= close; m += SLOT_STEP_MIN) {
      const startsAt = isoAt(dateISO, m);
      const startMs = new Date(startsAt).getTime();
      const endMs = startMs + durationMin * 60_000;

      if (startMs <= nowMs) continue;
      if (busyRanges.some((b) => startMs < b.end && endMs > b.start)) continue;

      slots.push({ startsAt, label: minutesToHhmm(m) });
    }
  }

  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
