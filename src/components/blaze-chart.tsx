import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BlazeResult } from "@/lib/blaze-data";

interface BlazeChartProps {
  results: BlazeResult[];
}

export function BlazeChart({ results }: BlazeChartProps) {
  const data = [...results].reverse().map((r) => ({
    rodada: `#${r.round}`,
    multiplicador: r.multiplier,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução dos multiplicadores</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="rodada"
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                domain={[0, "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "var(--radius)",
                  color: "var(--card-foreground)",
                }}
                itemStyle={{ color: "var(--primary)" }}
                formatter={(value: number) => [`${value.toFixed(2)}x`, "Multiplicador"]}
              />
              <Line
                type="monotone"
                dataKey="multiplicador"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--primary)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
