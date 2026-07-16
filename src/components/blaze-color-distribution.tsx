import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { computeStats } from "@/lib/blaze-data";

interface BlazeColorDistributionProps {
  stats: ReturnType<typeof computeStats>;
}

export function BlazeColorDistribution({ stats }: BlazeColorDistributionProps) {
  const total = stats.total || 1;
  const redPct = Math.round((stats.redCount / total) * 100);
  const blackPct = Math.round((stats.blackCount / total) * 100);
  const whitePct = Math.round((stats.whiteCount / total) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de cores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-rose-500">Vermelho</span>
            <span className="text-muted-foreground">
              {stats.redCount} ({redPct}%)
            </span>
          </div>
          <Progress value={redPct} className="h-2 bg-muted [&>div]:bg-rose-500" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Preto</span>
            <span className="text-muted-foreground">
              {stats.blackCount} ({blackPct}%)
            </span>
          </div>
          <Progress value={blackPct} className="h-2 bg-muted" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-white">Branco</span>
            <span className="text-muted-foreground">
              {stats.whiteCount} ({whitePct}%)
            </span>
          </div>
          <Progress value={whitePct} className="h-2 bg-muted [&>div]:bg-white" />
        </div>
      </CardContent>
    </Card>
  );
}
