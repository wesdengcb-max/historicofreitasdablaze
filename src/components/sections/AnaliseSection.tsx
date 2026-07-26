import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { blazeSupabase as supabase } from "@/integrations/supabase/blaze-client";
import { Card } from "@/components/double/Card";

type Row = { id: number; roll: string; color: string; created_at: string };

type Cycle = {
  index: number;
  triggerAt: Date;
  triggerLabel: string;   // texto curto (ex: "51" ou "14→14")
  triggerDetail: string;  // detalhe (ex: "min 51", "repetição do 14")
  gaps: number[];         // minutos até o(s) próximo(s) 0
  pending: number;        // 0 = completo
  elapsed: number;        // minutos desde o gatilho
};

const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const ALL_NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const MIN_CYCLES = 10;
const TOP_N = 5;
const MAX_GAP_MIN = 14;         // limite p/ agrupamento de vizinhos no Top 5
const WINDOW_SIZE = 14;         // 14 posições após o gatilho (sem break no primeiro 0)
const MAX_DETAIL_ROWS = 10;     // FIFO detalhes
const MAX_PATTERN_CYCLES = 14;  // Análise 2: últimas 14 ocorrências

function diffMinutes(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

/**
 * Análise 1 — para cada dígito 0..9, coleta ciclos: gatilho é
 * "número N caiu num minuto cuja unidade == N". Para cada gatilho,
 * mede os minutos até os próximos ZEROS_PER_CYCLE zeros (≤ 14 min).
 */
function buildCycles(rows: Row[], now: Date): Record<number, Cycle[]> {
  const out: Record<number, Cycle[]> = {};
  for (const n of NUMBERS) out[n] = [];

  rows.forEach((r, i) => {
    const n = Number(r.roll);
    if (!Number.isFinite(n) || n < 0 || n > 9) return;
    const dt = new Date(r.created_at);
    if (Number.isNaN(dt.getTime())) return;
    if (dt.getMinutes() % 10 !== n) return;

    // Janela fixa de 14 posições posteriores; registra TODOS os zeros (sem break).
    const gaps: number[] = [];
    for (let k = 1; k <= WINDOW_SIZE && i + k < rows.length; k++) {
      const row = rows[i + k];
      if (Number(row.roll) !== 0) continue;
      const zdt = new Date(row.created_at);
      if (Number.isNaN(zdt.getTime())) continue;
      gaps.push(diffMinutes(dt, zdt));
    }

    const list = out[n];
    list.push({
      index: list.length + 1,
      triggerAt: dt,
      triggerLabel: `${n}`,
      triggerDetail: `min ${String(dt.getMinutes()).padStart(2, "0")}`,
      gaps,
      pending: gaps.length === 0 ? 1 : 0,
      elapsed: diffMinutes(dt, now),
    });
  });

  return out;
}

/**
 * Análise 2 — gatilho quando uma pedra (0..14) repete consecutivamente.
 * O gatilho é a SEGUNDA pedra idêntica; medimos o tempo até o próximo 0.
 * Mantemos apenas as últimas MAX_PATTERN_CYCLES ocorrências.
 */
function buildRepeatCycles(rows: Row[], now: Date): Cycle[] {
  const out: Cycle[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = Number(rows[i - 1].roll);
    const cur = Number(rows[i].roll);
    if (!Number.isFinite(cur) || cur < 0 || cur > 14) continue;
    if (cur !== prev) continue;
    const dt = new Date(rows[i].created_at);
    if (Number.isNaN(dt.getTime())) continue;

    // Janela fixa de 14 posições posteriores; sem interrupção no primeiro 0.
    const gaps: number[] = [];
    for (let k = 1; k <= WINDOW_SIZE && i + k < rows.length; k++) {
      const row = rows[i + k];
      if (Number(row.roll) !== 0) continue;
      const zdt = new Date(row.created_at);
      if (Number.isNaN(zdt.getTime())) continue;
      gaps.push(diffMinutes(dt, zdt));
    }

    out.push({
      index: 0,
      triggerAt: dt,
      triggerLabel: `${cur}→${cur}`,
      triggerDetail: `repetição do ${cur}`,
      gaps,
      pending: gaps.length === 0 ? 1 : 0,
      elapsed: diffMinutes(dt, now),
    });
    (out[out.length - 1] as Cycle & { value: number }).value = cur;
  }
  return out;
}

type GroupResult = {
  m: number;
  label: string;
  count: number;
  pct: number;
};

/**
 * Top 5 com janela de vizinhos (M-1, M, M+1) e anulação de duplicados
 * por linha. Uma linha pontua no máximo +1 por grupo.
 * Aplica dedup no ranking: números já usados não aparecem em posições
 * seguintes.
 */
function computeTop5(cycles: Cycle[]): { rows: GroupResult[]; totalRows: number } {
  const rowSets: Set<number>[] = cycles.map((c) => new Set(c.gaps));
  const totalRows = rowSets.filter((s) => s.size > 0).length;
  const candidates: GroupResult[] = [];

  for (let m = 0; m <= MAX_GAP_MIN; m++) {
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
    if (count === 0) continue;
    const parts: string[] = [];
    if (hasMinus) parts.push(`${m - 1}`);
    if (hasM) parts.push(`${m}`);
    if (hasPlus) parts.push(`${m + 1}`);
    candidates.push({
      m,
      label: parts.join(" - "),
      count,
      pct: totalRows ? (count / totalRows) * 100 : 0,
    });
  }

  candidates.sort((a, b) => b.count - a.count || a.m - b.m);

  const picked: GroupResult[] = [];
  const used = new Set<number>();
  for (const cand of candidates) {
    const nums = [cand.m - 1, cand.m, cand.m + 1];
    if (nums.some((n) => used.has(n))) continue;
    picked.push(cand);
    nums.forEach((n) => used.add(n));
    if (picked.length >= TOP_N) break;
  }
  return { rows: picked, totalRows };
}

/**
 * FIFO últimos 10 gatilhos. Se um novo gatilho compartilha o horário
 * (minuto exato) de um anterior, sobrescreve.
 */
function buildDetailRows(cycles: Cycle[]): Cycle[] {
  const map = new Map<number, Cycle>();
  for (const c of cycles) {
    map.set(c.triggerAt.getTime(), c);
  }
  const arr = Array.from(map.values());
  return arr.slice(-MAX_DETAIL_ROWS);
}

function fmtTime(d: Date) {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type PanelProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  cycles: Cycle[];
  loading: boolean;
  err: string | null;
  emptyLabel: string;
  eligible: boolean;
  eligibleHint?: string;
  showFullBadge?: boolean; // Analysis 1 usa "Completo (10/10)"
};

function AnalysisPanel({
  eyebrow,
  title,
  subtitle,
  cycles,
  loading,
  err,
  emptyLabel,
  eligible,
  eligibleHint,
  showFullBadge = true,
}: PanelProps) {
  const { rows: top5, totalRows } = useMemo(() => computeTop5(cycles), [cycles]);
  const details = useMemo(() => buildDetailRows(cycles), [cycles]);
  const fullyCompleted = cycles.filter((c) => c.pending === 0 && c.gaps.length > 0).length;
  const totalGaps = cycles.reduce((a, c) => a + c.gaps.length, 0);
  const avg = totalGaps
    ? Math.round(cycles.reduce((a, c) => a + c.gaps.reduce((x, y) => x + y, 0), 0) / totalGaps)
    : null;

  const chartData = top5.map((it) => ({ label: it.label, count: it.count }));

  return (
    <Card delay={0.05}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            {cycles.length} gatilhos · {fullyCompleted} completos · {totalGaps} zeros coletados
            {avg !== null ? ` · média ${avg} min` : ""}
          </p>
        </div>
        {!eligible && cycles.length > 0 && eligibleHint && (
          <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
            {eligibleHint}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando histórico…
        </div>
      ) : err ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {err}
        </div>
      ) : totalRows === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <>
          <div className="h-72 w-full rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 16, bottom: 4, left: -12 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  label={{
                    value: "Ocorrências",
                    angle: -90,
                    position: "insideLeft",
                    fill: "rgba(255,255,255,0.4)",
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,15,20,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v}x`, "Ocorrências"]}
                />
                <Bar dataKey="count" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
            <div className="border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Top {TOP_N} · grupos (M-1, M, M+1)
            </div>
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Minutos</th>
                  <th className="px-3 py-2 text-right font-medium">Linhas</th>
                  <th className="px-3 py-2 text-right font-medium">Assertividade</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((it, i) => (
                  <tr
                    key={`${it.m}-${i}`}
                    className={`border-b border-white/5 last:border-0 ${i === 0 ? "bg-emerald-500/5" : ""}`}
                  >
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 text-foreground">{it.label}</td>
                    <td className="px-3 py-2 text-right text-foreground">{it.count}x</td>
                    <td className="px-3 py-2 text-right text-emerald-300">{it.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
            <div className="border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Detalhes dos ciclos · últimos {MAX_DETAIL_ROWS} gatilhos · até {WINDOW_SIZE} minutos até 0
            </div>
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">Gatilho</th>
                  <th className="px-3 py-2 text-left font-medium">Detalhe</th>
                  <th className="px-3 py-2 text-left font-medium">Minutos até 0</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {details
                  .slice()
                  .reverse()
                  .map((c) => {
                    const scannedWithoutZero = c.gaps.length === 0 && c.elapsed >= WINDOW_SIZE;
                    return (
                      <tr
                        key={`${c.triggerAt.getTime()}-${c.triggerLabel}`}
                        className="border-b border-white/5 last:border-0"
                      >
                        <td className="px-3 py-2 text-muted-foreground">{c.index}</td>
                        <td className="px-3 py-2 text-foreground">{fmtTime(c.triggerAt)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.triggerDetail}</td>
                        <td className="px-3 py-2 text-foreground">
                          {c.gaps.length ? c.gaps.join(" · ") : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {c.gaps.length > 0 ? (
                            <span className="text-emerald-300">
                              {showFullBadge ? `Completo (${c.gaps.length})` : "Completo"}
                            </span>
                          ) : scannedWithoutZero ? (
                            <span className="text-red-300">sem 0 em {WINDOW_SIZE} min</span>
                          ) : (
                            <span className="text-amber-300">
                              aguardando · {c.elapsed} min
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

export function AnaliseSection() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<number>(1);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("blaze_results")
        .select("id, roll, color, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (!alive) return;
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      setRows(((data ?? []) as Row[]).slice().reverse());
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const cycles = useMemo(() => buildCycles(rows, now), [rows, now]);
  const repeatCyclesAll = useMemo(() => buildRepeatCycles(rows, now), [rows, now]);
  const repeatCycles = useMemo(() => {
    const filtered = repeatCyclesAll.filter(
      (c) => (c as Cycle & { value: number }).value === selected,
    );
    const tail = filtered.slice(-MAX_PATTERN_CYCLES);
    tail.forEach((c, i) => {
      c.index = i + 1;
    });
    return tail;
  }, [repeatCyclesAll, selected]);

  const stats = useMemo(() => {
    const s: Record<
      number,
      { total: number; fullyCompleted: number; totalGaps: number; avg: number | null }
    > = {};
    for (const n of NUMBERS) {
      const list = cycles[n];
      const totalGaps = list.reduce((a, c) => a + c.gaps.length, 0);
      const fullyCompleted = list.filter((c) => c.gaps.length > 0).length;
      const sum = list.reduce((a, c) => a + c.gaps.reduce((x, y) => x + y, 0), 0);
      const avg = totalGaps ? Math.round(sum / totalGaps) : null;
      s[n] = { total: list.length, fullyCompleted, totalGaps, avg };
    }
    return s;
  }, [cycles]);

  const isMinuteEligible = selected >= 0 && selected <= 9;
  const list = isMinuteEligible ? (cycles[selected] ?? []) : [];
  const stat = stats[selected] ?? { total: 0, fullyCompleted: 0, totalGaps: 0, avg: null };
  const eligible = isMinuteEligible && stat.fullyCompleted >= MIN_CYCLES;

  return (
    <main className="mx-auto flex w-full max-w-[1366px] flex-col gap-5 px-3 py-8 sm:gap-6 sm:px-8 sm:py-10">
      <Card delay={0.03}>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Catalogador de latência
        </div>
        <h2 className="text-lg font-semibold text-foreground sm:text-xl">
          Ciclos de espera até o branco (0) · limite {MAX_GAP_MIN} min
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Gatilho: o número sai num minuto cuja unidade é igual a ele (ex.: 1 no
          minuto 51). Contamos os minutos até o próximo 0. Só é considerado
          relevante quem tiver pelo menos {MIN_CYCLES} ciclos completos.
        </p>

        <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-[repeat(15,minmax(0,1fr))]">
          {ALL_NUMBERS.map((n) => {
            const st = stats[n] ?? { total: 0, fullyCompleted: 0, totalGaps: 0, avg: null };
            const ok = n <= 9 && st.fullyCompleted >= MIN_CYCLES;
            const isSel = selected === n;
            return (
              <button
                key={n}
                onClick={() => setSelected(n)}
                className={`flex flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition ${
                  isSel
                    ? "border-emerald-400/60 bg-emerald-500/15 text-foreground"
                    : ok
                      ? "border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
                      : "border-white/5 bg-white/[0.02] text-muted-foreground opacity-60"
                }`}
              >
                <span className="text-lg font-bold tabular-nums">{n}</span>
                <span className="mt-0.5 text-[10px] tabular-nums">
                  {n <= 9 ? `${st.fullyCompleted}/${st.total}` : "—"}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {st.avg !== null ? `${st.avg} min` : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <AnalysisPanel
        eyebrow={`Análise 1 · dígito ${selected}`}
        title={`Minutos até o 0 (gatilho por unidade do minuto)`}
        subtitle={
          isMinuteEligible
            ? `Gatilho: número ${selected} caiu em minuto terminado em ${selected}. Vizinhos ±1 min agrupados.`
            : "Gatilho de minuto aplicável apenas para pedras de 0 a 9."
        }
        cycles={list}
        loading={loading}
        err={err}
        emptyLabel={
          isMinuteEligible
            ? `Ainda sem zeros registrados após gatilhos do número ${selected}.`
            : "Gatilho de minuto aplicável apenas para pedras de 0 a 9."
        }
        eligible={eligible}
        eligibleHint={`precisa ${MIN_CYCLES}+ ciclos completos`}
      />

      <AnalysisPanel
        eyebrow={`Análise 2 · repetição da pedra ${selected}`}
        title="Tempo até o 0 após pedra repetida consecutiva"
        subtitle={`Gatilho: pedra ${selected} sai duas vezes seguidas. Últimas ${MAX_PATTERN_CYCLES} ocorrências.`}
        cycles={repeatCycles}
        loading={loading}
        err={err}
        emptyLabel={`Ainda sem repetições consecutivas da pedra ${selected} no histórico.`}
        eligible={repeatCycles.length >= MIN_CYCLES}
        eligibleHint={`precisa ${MIN_CYCLES}+ ocorrências`}
        showFullBadge={false}
      />
    </main>
  );
}
