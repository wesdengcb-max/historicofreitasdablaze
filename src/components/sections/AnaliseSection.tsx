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
  triggerMinute: number;
  gaps: number[]; // minutos até cada um dos próximos N zeros
  pending: number; // zeros ainda esperando (para completar ZEROS_PER_CYCLE)
  elapsed: number; // minutos desde o gatilho (útil quando pending > 0)
};

const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const MIN_CYCLES = 10;
const ZEROS_PER_CYCLE = 10;
const TOP_N = 5;

function diffMinutes(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}

/**
 * Para cada dígito 0..9, coleta ciclos: gatilho é "número N caiu num minuto
 * cuja unidade == N". Para cada gatilho, mede os minutos até os próximos
 * ZEROS_PER_CYCLE zeros.
 */
function buildCycles(rows: Row[], now: Date): Record<number, Cycle[]> {
  const zeroIdx: number[] = [];
  rows.forEach((r, i) => {
    if (Number(r.roll) === 0) zeroIdx.push(i);
  });

  const out: Record<number, Cycle[]> = {};
  for (const n of NUMBERS) out[n] = [];

  rows.forEach((r, i) => {
    const n = Number(r.roll);
    if (!Number.isFinite(n) || n < 0 || n > 9) return;
    const dt = new Date(r.created_at);
    if (Number.isNaN(dt.getTime())) return;
    if (dt.getMinutes() % 10 !== n) return;

    // primeiro índice em zeroIdx cujo valor > i (busca binária)
    let lo = 0;
    let hi = zeroIdx.length - 1;
    let start = zeroIdx.length;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (zeroIdx[mid] > i) {
        start = mid;
        hi = mid - 1;
      } else lo = mid + 1;
    }

    const gaps: number[] = [];
    for (let k = start; k < zeroIdx.length && gaps.length < ZEROS_PER_CYCLE; k++) {
      gaps.push(diffMinutes(dt, new Date(rows[zeroIdx[k]].created_at)));
    }

    const list = out[n];
    list.push({
      index: list.length + 1,
      triggerAt: dt,
      triggerMinute: dt.getMinutes(),
      gaps,
      pending: ZEROS_PER_CYCLE - gaps.length,
      elapsed: diffMinutes(dt, now),
    });
  });

  return out;
}

function fmtTime(d: Date) {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  const stats = useMemo(() => {
    const s: Record<
      number,
      { total: number; fullyCompleted: number; totalGaps: number; avg: number | null }
    > = {};
    for (const n of NUMBERS) {
      const list = cycles[n];
      const totalGaps = list.reduce((a, c) => a + c.gaps.length, 0);
      const fullyCompleted = list.filter((c) => c.gaps.length >= ZEROS_PER_CYCLE).length;
      const sum = list.reduce((a, c) => a + c.gaps.reduce((x, y) => x + y, 0), 0);
      const avg = totalGaps ? Math.round(sum / totalGaps) : null;
      s[n] = { total: list.length, fullyCompleted, totalGaps, avg };
    }
    return s;
  }, [cycles]);

  const list = cycles[selected] ?? [];
  const stat = stats[selected];
  const eligible = stat.fullyCompleted >= MIN_CYCLES;

  // Frequência de cada minuto (todos os gaps de todos os ciclos do dígito).
  const frequency = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of list) for (const g of c.gaps) map.set(g, (map.get(g) ?? 0) + 1);
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return {
      total,
      items: Array.from(map.entries())
        .map(([minutes, count]) => ({ minutes, count, pct: total ? (count / total) * 100 : 0 }))
        .sort((a, b) => b.count - a.count || a.minutes - b.minutes),
    };
  }, [list]);

  const topN = frequency.items.slice(0, TOP_N);
  const chartData = topN.map((it) => ({ label: `${it.minutes} min`, count: it.count, minutes: it.minutes }));


  return (
    <main className="mx-auto flex w-full max-w-[1366px] flex-col gap-5 px-3 py-8 sm:gap-6 sm:px-8 sm:py-10">
      <Card delay={0.03}>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Catalogador de latência
        </div>
        <h2 className="text-lg font-semibold text-foreground sm:text-xl">
          Ciclos de espera até o branco (0)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Gatilho: o número sai num minuto cuja unidade é igual a ele (ex.: 1 no
          minuto 51). Contamos os minutos até o próximo 0. Só é considerado
          relevante quem tiver pelo menos {MIN_CYCLES} ciclos completos.
        </p>

        <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {NUMBERS.map((n) => {
            const st = stats[n];
            const ok = st.fullyCompleted >= MIN_CYCLES;
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
                  {st.fullyCompleted}/{st.total}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {st.avg !== null ? `${st.avg} min` : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card delay={0.08}>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Ciclos do número {selected}
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {stat.total} gatilhos · {stat.fullyCompleted} completos ({ZEROS_PER_CYCLE}/{ZEROS_PER_CYCLE}) · {frequency.total} zeros coletados
              {stat.avg !== null ? ` · média ${stat.avg} min` : ""}
            </h3>
          </div>
          {!eligible && stat.total > 0 && (
            <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
              precisa {MIN_CYCLES}+ ciclos completos
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
        ) : frequency.total === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
            Ainda sem zeros registrados após gatilhos do número {selected}.
          </div>
        ) : (
          <>
            <div className="h-72 w-full rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 16, bottom: 4, left: -12 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                    label={{ value: "Ocorrências", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
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
                Top {TOP_N} · minutos que mais se repetem
              </div>
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Tempo até o 0</th>
                    <th className="px-3 py-2 text-right font-medium">Quantidade</th>
                    <th className="px-3 py-2 text-right font-medium">Assertividade</th>
                  </tr>
                </thead>
                <tbody>
                  {topN.map((it, i) => (
                    <tr
                      key={it.minutes}
                      className={`border-b border-white/5 last:border-0 ${i === 0 ? "bg-emerald-500/5" : ""}`}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 text-foreground">{it.minutes} min</td>
                      <td className="px-3 py-2 text-right text-foreground">{it.count}x</td>
                      <td className="px-3 py-2 text-right text-emerald-300">{it.pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
              <div className="border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Detalhe dos ciclos ({ZEROS_PER_CYCLE} zeros por gatilho)
              </div>
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Gatilho</th>
                    <th className="px-3 py-2 text-right font-medium">Min.</th>
                    <th className="px-3 py-2 text-left font-medium">Minutos até cada 0</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list
                    .slice()
                    .reverse()
                    .map((c) => (
                      <tr key={`${c.index}-${c.triggerAt.getTime()}`} className="border-b border-white/5 last:border-0">
                        <td className="px-3 py-2 text-muted-foreground">{c.index}</td>
                        <td className="px-3 py-2 text-foreground">{fmtTime(c.triggerAt)}</td>
                        <td className="px-3 py-2 text-right text-foreground">
                          {String(c.triggerMinute).padStart(2, "0")}
                        </td>
                        <td className="px-3 py-2 text-foreground">
                          {c.gaps.length ? c.gaps.map((g) => `${g}`).join(" · ") : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {c.pending === 0 ? (
                            <span className="text-emerald-300">Completo</span>
                          ) : (
                            <span className="text-amber-300">
                              {c.gaps.length}/{ZEROS_PER_CYCLE} · {c.elapsed} min decorridos
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

    </main>
  );
}
