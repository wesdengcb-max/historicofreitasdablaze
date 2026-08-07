import { parseUtcDate } from "@/lib/utils";
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
import { useGatilhos, type GatilhoRow } from "@/lib/useGatilhos";

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
const MAX_ZEROS = 14;           
const MAX_DETAIL_ROWS = 10;     
const MAX_PATTERN_CYCLES = 14;
const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

function diffMinutes(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

/**
 * Gatilhos são considerados completos apenas quando atingem as 14 contagens.
 */
function cycleStatus(c: Cycle): "completo" | "ativo" {
  if (c.gaps.length >= MAX_ZEROS) return "completo";
  return "ativo";
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
  const totalRows = cycles.length;
  const candidates: GroupResult[] = [];

  let maxGap = 0;
  for (const rs of rowSets) for (const v of rs) if (v > maxGap) maxGap = v;

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
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("pt-BR", {
    timeZone: BRAZIL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

type PanelProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  loading: boolean;
  err: string | null;
  emptyLabel: string;
  eligible: boolean;
  eligibleHint?: string;
  showFullBadge?: boolean; // Analysis 1 usa "Completo (10/10)"
  analiseKey: string;      // identificador no banco (analise1/2/3)
  pedra: number | string;  // número selecionado
  now: Date;
  maxZeros?: number;
};

function AnalysisPanel({
  eyebrow,
  title,
  subtitle,
  loading,
  err,
  emptyLabel,
  eligible,
  eligibleHint,
  showFullBadge = true,
  analiseKey,
  pedra,
  now,
  maxZeros = MAX_ZEROS,
}: PanelProps) {
  const { rows: dbRows, loading: dbLoading, error: dbError } = useGatilhos(analiseKey, Number(pedra));
  
  // Força loading false se houver erro de cache para destravar a UI
  const isSyncing = dbLoading && (!dbError || !dbError.includes("schema cache"));

  // A tela assume um papel PASSIVO, apenas lendo o que está no banco.
  const windowed = useMemo<Cycle[]>(() => {
    return dbRows.map((r: GatilhoRow, i) => {
      const at = parseUtcDate(r.trigger_at);
      const gaps = r.gaps ?? [];
      
      return {
        index: i + 1,
        triggerAt: at,
        triggerLabel: `${r.pedra}`,
        triggerDetail: r.detalhe ?? `min ${String(r.minuto).padStart(2, "0")}`,
        gaps,
        pending: gaps.length >= maxZeros ? 0 : 1,
        elapsed: diffMinutes(at, now),
      };
    });
  }, [dbRows, now, maxZeros]);

  const { rows: top5, totalRows } = useMemo(() => computeTop5(windowed), [windowed]);
  const details = windowed;
  const fullyCompleted = windowed.filter((c) => c.gaps.length >= maxZeros).length;
  const totalGaps = windowed.reduce((a, c) => a + c.gaps.length, 0);
  const avg = totalGaps
    ? Math.round(windowed.reduce((a, c) => a + c.gaps.reduce((x, y) => x + y, 0), 0) / totalGaps)
    : null;

  const chartData = top5.map((it) => ({ label: it.label, count: it.count }));

  return (
    <Card className="glass-card overflow-hidden">
      <div className="p-6">
        <div className="mb-6 flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FF1F3D] mb-1 font-outfit">
              {eyebrow}
            </div>
            <h3 className="text-xl font-black text-white font-outfit uppercase tracking-tight">{title}</h3>
            {subtitle && <p className="mt-1 text-xs text-[#9CA3AF]">{subtitle}</p>}
            <p className="mt-1 text-[11px] text-[#9CA3AF] font-medium">
              {windowed.length} gatilhos (últimos {MAX_DETAIL_ROWS}) · <span className="text-white">{fullyCompleted} completos</span> ·{" "}
              <span className="text-white">{totalGaps} zeros coletados</span>
              {avg !== null ? ` · média ${avg} min` : ""}
            </p>
          </div>
        </div>
        {/* Removido aviso de ciclos insuficientes */}
      </div>

      {isSyncing ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {loading ? "Carregando estatísticas..." : "Sincronizando..."}
        </div>
      ) : err || (dbError && !dbError.includes("schema cache")) ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {err ?? dbError}
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
              Detalhes dos ciclos · últimos {MAX_DETAIL_ROWS} gatilhos · até {maxZeros} contagens até 0
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
                    const isComplete = c.gaps.length >= maxZeros;
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
                          {isComplete ? (
                            <span className="text-emerald-300">
                              {showFullBadge ? `Completo (${c.gaps.length})` : "Completo"}
                            </span>
                          ) : (
                            <span className="text-amber-300">
                              ativo · {c.gaps.length}/{maxZeros} · {c.elapsed} min
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

export default function AnaliseSection() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | string>(1);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Agora a tela é PASSIVA. Ela carrega apenas as estatísticas globais
  // lendo o que o banco já calculou.
  const [stats, setStats] = useState<Record<number, { total: number; fullyCompleted: number; avg: number | null }>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("gatilhos_analise")
          .select("id, analise, pedra, minuto, trigger_at, detalhe, gaps");
        
        if (!alive) return;
        if (error) {
          if (error.message.includes("schema cache")) {
            setErr("Sincronizando banco de dados... Por favor, aguarde alguns instantes.");
          } else {
            setErr(error.message);
          }
        } else {
          const s: Record<number, { total: number; fullyCompleted: number; totalGaps: number; sumGaps: number }> = {};
          ALL_NUMBERS.forEach(n => s[n] = { total: 0, fullyCompleted: 0, totalGaps: 0, sumGaps: 0 });

          (data as any[] ?? []).forEach(r => {
            const n = r.pedra;
            if (s[n]) {
              s[n].total++;
              const gaps = r.gaps ?? [];
              const maxNeeded = r.analise === 'analise4' ? 20 : 14;
              if (gaps.length > 0) {
                if (gaps.length >= maxNeeded) {
                  s[n].fullyCompleted++;
                }
                s[n].totalGaps += gaps.length;
                s[n].sumGaps += gaps.reduce((a: number, b: number) => a + b, 0);
              }
            }
          });

          const finalStats: Record<number, { total: number; fullyCompleted: number; avg: number | null }> = {};
          ALL_NUMBERS.forEach(n => {
            finalStats[n] = {
              total: s[n].total,
              fullyCompleted: s[n].fullyCompleted,
              avg: s[n].totalGaps ? Math.round(s[n].sumGaps / s[n].totalGaps) : null
            };
          });

          setStats(finalStats);
          setErr(null);
        }
      } catch (e) {
        if (alive) {
          setErr("Falha na conexão com o catálogo.");
          console.error("[AnaliseSection] Fetch error:", e);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const isMinuteEligible = typeof selected === 'number' && selected >= 0 && selected <= 9;
  const statKey = typeof selected === 'number' ? selected : 0;
  const stat = stats[statKey] ?? { total: 0, fullyCompleted: 0, avg: null };
  const eligible = isMinuteEligible; // Removida trava de 10 ciclos

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-8 sm:gap-6 sm:px-6 sm:py-10">
      <Card className="glass-card p-6">
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.4em] text-[#FF1F3D] font-outfit">
          Catalogador de latência
        </div>
        <h2 className="text-2xl font-black text-white sm:text-3xl font-outfit uppercase tracking-tighter">
          Ciclos de espera até o branco (0)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Gatilho: o número sai num minuto cuja unidade é igual a ele (ex.: 1 no
          minuto 51). Contamos os minutos até o próximo 0.
        </p>

        <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-[repeat(15,minmax(0,1fr))]">
          {ALL_NUMBERS.map((n) => {
            const st = stats[n] ?? { total: 0, fullyCompleted: 0, avg: null };
            const ok = n <= 9; // Removida trava visual de 10 ciclos
            const isSel = selected === n;
            return (
              <button
                key={n}
                onClick={() => setSelected(n)}
                className={`flex flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition-all duration-300 font-outfit ${
                  isSel
                    ? "border-[#FF1F3D]/60 bg-[#FF1F3D]/20 text-white shadow-[0_0_20px_rgba(255,31,61,0.2)] scale-105"
                    : ok
                      ? "border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:border-white/20"
                      : "border-white/5 bg-white/[0.01] text-[#9CA3AF] opacity-50"
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
        loading={loading}
        err={err}
        emptyLabel={
          isMinuteEligible
            ? `Ainda sem zeros registrados após gatilhos do número ${selected}.`
            : "Gatilho de minuto aplicável apenas para pedras de 0 a 9."
        }
        eligible={eligible}
        eligibleHint={`precisa ${MIN_CYCLES}+ ciclos completos`}
        analiseKey="analise1"
        pedra={selected}
        now={now}
      />

      <AnalysisPanel
        eyebrow={`Análise 2 · repetição da pedra ${selected}`}
        title="Tempo até o 0 após pedra repetida consecutiva"
        subtitle={`Gatilho: pedra ${selected} sai duas vezes seguidas. Últimas ${MAX_PATTERN_CYCLES} ocorrências.`}
        loading={loading}
        err={err}
        emptyLabel={`Ainda sem repetições consecutivas da pedra ${selected} no histórico.`}
        eligible={stat.total >= MIN_CYCLES}
        eligibleHint={`precisa ${MIN_CYCLES}+ ocorrências`}
        showFullBadge={false}
        analiseKey="analise2"
        pedra={selected}
        now={now}
      />

      <AnalysisPanel
        eyebrow={`Análise 3 · repetição + minuto casado (${selected})`}
        title="Tempo até o 0 após repetição com unidade do minuto igual"
        subtitle={
          (typeof selected === 'number' && selected <= 9)
            ? `Gatilho: pedra ${selected} repete e ao menos uma sai em minuto terminado em ${selected}. Últimas ${MAX_PATTERN_CYCLES} ocorrências.`
            : "Análise aplicável apenas para pedras de 0 a 9."
        }
        loading={loading}
        err={err}
        emptyLabel={
          (typeof selected === 'number' && selected <= 9)
            ? `Ainda sem repetições da pedra ${selected} em minuto casado.`
            : "Análise aplicável apenas para pedras de 0 a 9."
        }
        eligible={(typeof selected === 'number' && selected <= 9) && stat.total >= MIN_CYCLES}
        eligibleHint={`precisa ${MIN_CYCLES}+ ocorrências`}
        showFullBadge={false}
        analiseKey="analise3"
        pedra={selected}
        now={now}
      />

      <AnalysisPanel
        eyebrow={`Análise 4 · Primeira Pedra da Dezena`}
        title="Primeira Pedra na Virada do Minuto"
        subtitle={`Gatilho: minutos 00, 10, 20, 30, 40, 50. Analisa até 20 tempos de Branco.`}
        loading={loading}
        err={err}
        emptyLabel={`Ainda sem registros da Análise 4 no histórico.`}
        eligible={stat.total >= MIN_CYCLES}
        eligibleHint={`precisa ${MIN_CYCLES}+ ocorrências`}
        showFullBadge={true}
        analiseKey="analise4"
        pedra={selected}
        now={now}
        maxZeros={20}
      />
    </main>
  );
}
