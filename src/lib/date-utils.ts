
const spSecondsFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function spTimeWithSeconds(spin: { createdAt?: string; time: string }): string {
  const raw = (spin.createdAt ?? "").trim();
  if (!raw) return spin.time;
  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
  const d = new Date(hasTz ? raw : `${raw.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return spin.time;
  return spSecondsFormatter.format(d);
}

export function spYmd(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function spToUtcIso(ymd: string, hms: string): string {
  const time = hms.length === 5 ? `${hms}:00` : hms;
  return new Date(`${ymd}T${time}-03:00`).toISOString();
}

export function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + delta);
  return base.toISOString().slice(0, 10);
}

export type FilterId = "hoje" | "ontem" | "7d" | "30d" | "custom";

export function computeRange(
  filter: FilterId,
  customStart: string,
  customEnd: string,
  timeStart: string,
  timeEnd: string,
): { start: string | null; end: string | null; includesNow: boolean } {
  const today = spYmd();
  const now = new Date().toISOString();
  const tStart = timeStart || "00:00";
  const tEnd = timeEnd || "23:59:59.999";

  if (filter === "hoje") {
    return {
      start: spToUtcIso(today, tStart),
      end: spToUtcIso(today, tEnd),
      includesNow: true,
    };
  }
  if (filter === "ontem") {
    const y = addDaysYmd(today, -1);
    return { start: spToUtcIso(y, tStart), end: spToUtcIso(y, tEnd), includesNow: false };
  }
  if (filter === "7d") {
    return { start: spToUtcIso(addDaysYmd(today, -6), tStart), end: now, includesNow: true };
  }
  if (filter === "30d") {
    return { start: spToUtcIso(addDaysYmd(today, -29), tStart), end: now, includesNow: true };
  }
  
  if (!customStart && !customEnd) return { start: null, end: null, includesNow: true };
  const s = customStart || customEnd;
  const e = customEnd || customStart;
  return {
    start: spToUtcIso(s, tStart),
    end: spToUtcIso(e, tEnd),
    includesNow: new Date(spToUtcIso(e, tEnd)).getTime() >= Date.now(),
  };
}
