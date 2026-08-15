/** 
 * Motor Preditivo FreitasWhite
 * Arquitetura Unificada: 7 Análises, Limites de 14 tempos, 120 min timeout, Janela de 6 Gatilhos.
 */
import { parseUtcDate } from "@/lib/utils";
export type Row = { id: number; roll: string; color: string; created_at: string };

export type Cycle = {
  value: number;
  analysis: 1 | 2 | 3 | 4 | 5 | 6 | 7 | number; // 1-7 main, 100+ secondary
  isSecondary?: boolean;

  triggerAt: Date;
  gaps: number[];
};

export const MAX_ZEROS = 14;
export const MAX_CYCLES = 6;
export const TIMEOUT_MINUTES = 120;

function diffMinutes(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

function collectGaps(rows: Row[], i: number, dt: Date): number[] {
  const gaps: number[] = [];
  const limit = MAX_ZEROS;
  const timeoutMs = TIMEOUT_MINUTES * 60000;
  
  for (let k = 1; i + k < rows.length && gaps.length < limit; k++) {
    const r = rows[i + k];
    if (!r) continue;
    const zdt = parseUtcDate(r.created_at);
    if (Number.isNaN(zdt.getTime())) continue;
    
    // Trava de Timeout (120 Minutos)
    if (zdt.getTime() - dt.getTime() > timeoutMs) break;

    if (Number(r.roll) === 0) {
      gaps.push(diffMinutes(dt, zdt));
    }
  }
  return gaps;
}

/** Análise 1 — pedra (0..9) sai em minuto cuja unidade == pedra. */
export function buildA1(rows: Row[]): Cycle[] {
  const out: Cycle[] = [];
  rows.forEach((r, i) => {
    const n = Number(r.roll);
    if (!Number.isFinite(n) || n < 0 || n > 9) return;
    const dt = parseUtcDate(r.created_at);
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
    const dt = parseUtcDate(rows[i].created_at);
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
    const dtPrev = parseUtcDate(rows[i - 1].created_at);
    const dt = parseUtcDate(rows[i].created_at);
    if (Number.isNaN(dt.getTime()) || Number.isNaN(dtPrev.getTime())) continue;
    if (dtPrev.getMinutes() % 10 !== cur && dt.getMinutes() % 10 !== cur) continue;
    out.push({ value: cur, analysis: 3, triggerAt: dt, gaps: collectGaps(rows, i, dt) });
  }
  return out;
}

/** Análise 4 — Primeira Pedra da Dezena (virada do minuto 00, 10, 20, 30, 40, 50). */
export function buildA4(rows: Row[]): Cycle[] {
  const out: Cycle[] = [];
  const processedKeys = new Set<string>();

  rows.forEach((r, i) => {
    const dt = parseUtcDate(r.created_at);
    if (Number.isNaN(dt.getTime())) return;
    
    const minutes = dt.getMinutes();
    // Gatilho: minutos terminados em 0 (00, 10, 20, 30, 40, 50)
    if (minutes % 10 !== 0) return;

    const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}-${dt.getHours()}-${minutes}`;
    if (processedKeys.has(key)) return;
    processedKeys.add(key);

    const n = Number(r.roll);
    if (!Number.isFinite(n) || n < 0 || n > 14) return;

    out.push({ value: n, analysis: 4, triggerAt: dt, gaps: collectGaps(rows, i, dt) });
  });
  return out;
}

/** Análise 5 — Segunda Pedra da Dezena (virada do minuto 00, 10, 20, 30, 40, 50). */
export function buildA5(rows: Row[]): Cycle[] {
  const out: Cycle[] = [];
  const processedKeys = new Set<string>();

  // Dicionário para contar pedras no mesmo minuto
  const minuteCounts = new Map<string, number>();

  rows.forEach((r, i) => {
    const dt = parseUtcDate(r.created_at);
    if (Number.isNaN(dt.getTime())) return;
    
    const minutes = dt.getMinutes();
    if (minutes % 10 !== 0) return;

    const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}-${dt.getHours()}-${minutes}`;
    const count = (minuteCounts.get(key) || 0) + 1;
    minuteCounts.set(key, count);

    // Gatilho apenas na SEGUNDA pedra enviada no minuto
    if (count !== 2) return;
    if (processedKeys.has(key)) return;
    processedKeys.add(key);

    const n = Number(r.roll);
    if (!Number.isFinite(n) || n < 0 || n > 14) return;

    out.push({ value: n, analysis: 5, triggerAt: dt, gaps: collectGaps(rows, i, dt) });
  });
  return out;
}

/** Análise 6 (O Pão) — Padrão Sanduíche (A - B - A) focando no alinhamento das pontas A. */
export function buildA6(rows: Row[]): Cycle[] {
  const out: Cycle[] = [];
  for (let i = 2; i < rows.length; i++) {
    const a1 = Number(rows[i - 2].roll);
    const a2 = Number(rows[i].roll);
    if (!Number.isFinite(a1) || !Number.isFinite(a2) || a1 !== a2 || a1 < 0 || a1 > 14) continue;
    const dt = parseUtcDate(rows[i].created_at);
    if (Number.isNaN(dt.getTime())) continue;
    out.push({ value: a2, analysis: 6, triggerAt: dt, gaps: collectGaps(rows, i, dt) });
  }
  return out;
}

/** Análise 7 (A Carne) — Padrão Sanduíche (A - B - A) focando na reação da pedra B recheio. */
export function buildA7(rows: Row[]): Cycle[] {
  const out: Cycle[] = [];
  for (let i = 2; i < rows.length; i++) {
    const a1 = Number(rows[i - 2].roll);
    const b = Number(rows[i - 1].roll);
    const a2 = Number(rows[i].roll);
    if (!Number.isFinite(a1) || !Number.isFinite(a2) || !Number.isFinite(b) || a1 !== a2 || b < 0 || b > 14) continue;
    const dt = parseUtcDate(rows[i].created_at);
    if (Number.isNaN(dt.getTime())) continue;
    out.push({ value: b, analysis: 7, triggerAt: dt, gaps: collectGaps(rows, i, dt) });
  }
  return out;
}

/** 
 * ESTRATÉGIA A8 - BRANCO DUPLO (Gatilho: 2 Brancos Seguidos - ⚪⚪)
 * deltaMinutes = (Hora_B1 + Minuto_B1 + Minuto_B2) + Pedra_Antes + Pedra_Depois
 */
export function buildA8(rows: Row[]): Cycle[] {
  const out: Cycle[] = [];
  for (let i = 2; i < rows.length - 1; i++) {
    const b1 = Number(rows[i - 1].roll);
    const b2 = Number(rows[i].roll);
    if (b1 !== 0 || b2 !== 0) continue;

    const dt1 = parseUtcDate(rows[i - 1].created_at);
    const dt2 = parseUtcDate(rows[i].created_at);
    if (Number.isNaN(dt1.getTime()) || Number.isNaN(dt2.getTime())) continue;

    const g1 = dt1.getHours();
    const g2 = dt1.getMinutes();
    const g3 = dt2.getMinutes();
    const g4 = Number(rows[i - 2].roll); // Pedra antes do 1º branco
    const g5 = Number(rows[i + 1].roll); // Pedra depois do 2º branco
    const g6 = g1 + g2 + g3;

    if (!Number.isFinite(g4) || !Number.isFinite(g5)) continue;

    const delta = g6 + g4 + g5;
    // Criamos um "gaps" fake que contém apenas o delta calculado, 
    // para o motor de auditoria tratar como projeção.
    out.push({ 
      value: 0, 
      analysis: 8, 
      triggerAt: dt2, 
      gaps: [delta] 
    });
  }
  return out;
}

/** 
 * ESTRATÉGIA A9 - PÃO DE BRANCO (Gatilho: ⚪🔴⚪ / ⚪⚫⚪)
 * deltaMinutes = 30 + Pedra_Carne + Pedra_Antes + Pedra_Depois
 */
export function buildA9(rows: Row[]): Cycle[] {
  const out: Cycle[] = [];
  for (let i = 2; i < rows.length - 2; i++) {
    const b1 = Number(rows[i - 1].roll);
    const carne = Number(rows[i].roll);
    const b2 = Number(rows[i + 1].roll);

    if (b1 !== 0 || b2 !== 0 || carne === 0) continue;

    const dtCarne = parseUtcDate(rows[i].created_at);
    if (Number.isNaN(dtCarne.getTime())) continue;

    const g1 = 30; // Peso Fixo
    const g2 = carne;
    const g3 = Number(rows[i - 2].roll); // Antes do 1º pão
    const g4 = Number(rows[i + 2].roll); // Depois do 2º pão
    
    if (!Number.isFinite(g3) || !Number.isFinite(g4)) continue;

    const delta = g1 + g2 + g3 + g4;
    out.push({ 
      value: carne, 
      analysis: 9, 
      triggerAt: dtCarne, 
      gaps: [delta] 
    });
  }
  return out;
}

/** 
 * Análises Secundárias (#1 ao #9)
 * Utilizam a mesma lógica da A1 (leitura de pedra vs unidade do minuto),
 * mas deslocadas no tempo conforme a posição no histórico.
 */
export function buildSecondary(rows: Row[], offset: number): Cycle[] {
  const out: Cycle[] = [];
  // offset 1-9 representa a posição no histórico
  // Aqui interpretamos como: a pedra que saiu a 'offset' rodadas atrás
  // deve casar com o minuto em que saiu.
  rows.forEach((r, i) => {
    if (i < offset) return;
    const targetRow = rows[i - offset]; 
    const n = Number(targetRow.roll);
    if (!Number.isFinite(n) || n < 0 || n > 9) return;
    
    const dt = parseUtcDate(r.created_at);
    if (Number.isNaN(dt.getTime())) return;
    
    // Mesma lógica do #0: se a unidade do minuto casa com a pedra
    if (dt.getMinutes() % 10 !== n) return;
    
    out.push({ 
      value: n, 
      analysis: 100 + offset, 
      triggerAt: dt, 
      gaps: collectGaps(rows, i, dt),
      isSecondary: true
    });
  });
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

export function cyclesOf(cycles: Cycle[], value: number, analysis?: number): Cycle[] {
  return cycles.filter((c) => c.value === value && (!analysis || c.analysis === analysis)).slice(-MAX_CYCLES);
}

export function fmtClock(d: Date) {
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
});
}

/** 
 * Verifica se os últimos dois gatilhos (ou um deles) daquela análise 
 * tiveram o mesmo 'value' que o gatilho atual. 
 */
export function checkHighTendency(cycles: Cycle[], value: number): boolean {
  if (cycles.length < 2) return false;
  // Pegamos os gatilhos recentes que NÃO são o atual (o atual está no final ou em aberto)
  // Mas como buildAX retorna todos, o último do array costuma ser o gatilho ativo.
  // Vamos olhar o penúltimo e o antepenúltimo se disponíveis.
  const last = cycles[cycles.length - 1];
  const penult = cycles[cycles.length - 2];
  const antepenult = cycles[cycles.length - 3];

  // Se o valor apareceu no penúltimo ou antepenúltimo gatilho da mesma análise
  return (penult?.value === value) || (antepenult?.value === value);
}
