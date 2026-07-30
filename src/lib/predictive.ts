export type Row = { id: number; roll: string; color: string; created_at: string };

export type Cycle = {
  value: number;
  analysis: 1 | 2 | 3;
  triggerAt: Date;
  gaps: number[];
};

export const MAX_ZEROS = 14;
export const MAX_CYCLES = 14;

function diffMinutes(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function collectGaps(rows: Row[], i: number, dt: Date): number[] {
  const gaps: number[] = [];
  for (let k = 1; i + k < rows.length && gaps.length < MAX_ZEROS; k++) {
    if (Number(rows[i + k].roll) !== 0) continue;
    const zdt = new Date(rows[i + k].created_at);
    if (Number.isNaN(zdt.getTime())) continue;
    gaps.push(diffMinutes(dt, zdt));
  }
  return gaps;
}

/** Análise 1 — pedra (0..9) sai em minuto cuja unidade == pedra. */
export function buildA1(rows: Row[]): Cycle[] {
  const out: Cycle[] = [];
  rows.forEach((r, i) => {
    const n = Number(r.roll);
    if (!Number.isFinite(n) || n < 0 || n > 9) return;
    const dt = new Date(r.created_at);
    if (Number.isNaN(dt.getTime())) return;
    if (dt.getMinutes() % 10 !== n) return;
    out.push({ value: n, analysis: 1, triggerAt: dt, gaps: collectGaps(rows, i, dt) });
  });
  return out;
}

/** Análise 2 — pedras iguais consecutivas (0..14), gatilho na segunda. */
export function buildA2(rows: Row[]): Cycle[] {
  const out: Cycle[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = Number(rows[i - 1].roll);
    const cur = Number(rows[i].roll);
    if (!Number.isFinite(cur) || cur < 0 || cur > 14 || cur !== prev) continue;
    const dt = new Date(rows[i].created_at);
    if (Number.isNaN(dt.getTime())) continue;
    out.push({ value: cur, analysis: 2, triggerAt: dt, gaps: collectGaps(rows, i, dt) });
  }
  return out;
}

/** Análise 3 — repetição consecutiva (0..9) com unidade do minuto casada. */
export function buildA3(rows: Row[]): Cycle[] {
  const out: Cycle[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = Number(rows[i - 1].roll);
    const cur = Number(rows[i].roll);
    if (!Number.isFinite(cur) || cur < 0 || cur > 9 || cur !== prev) continue;
    const dtPrev = new Date(rows[i - 1].created_at);
    const dt = new Date(rows[i].created_at);
    if (Number.isNaN(dt.getTime()) || Number.isNaN(dtPrev.getTime())) continue;
    if (dtPrev.getMinutes() % 10 !== cur && dt.getMinutes() % 10 !== cur) continue;
    out.push({ value: cur, analysis: 3, triggerAt: dt, gaps: collectGaps(rows, i, dt) });
  }
  return out;
}

export type Group = { m: number; label: string; count: number; pct: number };

/** Top N por presença única de linha, janela (M-1, M, M+1), com dedup. */
export function computeTop(cycles: Cycle[], topN: number): Group[] {
  const rowSets = cycles.map((c) => new Set(c.gaps));
  const totalRows = cycles.length;
  if (!totalRows) return [];
  let maxGap = 0;
  for (const rs of rowSets) for (const v of rs) if (v > maxGap) maxGap = v;

  const candidates: Group[] = [];
  for (let m = 0; m <= maxGap + 1; m++) {
    let hasM = false;
    let hasMinus = false;
    let hasPlus = false;
    let count = 0;
    for (const rs of rowSets) {
      const inM = rs.has(m);
      const inMinus = m > 0 && rs.has(m - 1);
      const inPlus = rs.has(m + 1);
      if (inM || inMinus || inPlus) {
        count++;
        if (inM) hasM = true;
        if (inMinus) hasMinus = true;
        if (inPlus) hasPlus = true;
      }
    }
    if (!count) continue;
    const parts: string[] = [];
    if (hasMinus) parts.push(`${m - 1}`);
    if (hasM) parts.push(`${m}`);
    if (hasPlus) parts.push(`${m + 1}`);
    candidates.push({ m, label: parts.join(" - "), count, pct: (count / totalRows) * 100 });
  }
  candidates.sort((a, b) => b.count - a.count || a.m - b.m);

  const picked: Group[] = [];
  const used = new Set<number>();
  for (const cand of candidates) {
    const nums = [cand.m - 1, cand.m, cand.m + 1];
    if (nums.some((n) => used.has(n))) continue;
    picked.push(cand);
    nums.forEach((n) => used.add(n));
    if (picked.length >= topN) break;
  }
  return picked;
}

/** Última ocorrência (ciclo mais recente) por valor, para uma análise. */
export function latestByValue(cycles: Cycle[]): Map<number, Cycle> {
  const map = new Map<number, Cycle>();
  for (const c of cycles) {
    const cur = map.get(c.value);
    if (!cur || c.triggerAt.getTime() > cur.triggerAt.getTime()) map.set(c.value, c);
  }
  return map;
}

export function cyclesOf(cycles: Cycle[], value: number): Cycle[] {
  return cycles.filter((c) => c.value === value).slice(-MAX_CYCLES);
}

export function fmtClock(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
