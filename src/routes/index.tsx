import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { History, AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { generateMockHistory, computeStats } from "@/lib/blaze-data";
import { BlazeStats } from "@/components/blaze-stats";
import { BlazeChart } from "@/components/blaze-chart";
import { BlazeHistoryTable } from "@/components/blaze-history-table";
import { BlazeColorDistribution } from "@/components/blaze-color-distribution";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [results, setResults] = useState(() => generateMockHistory(100));

  const stats = useMemo(() => computeStats(results), [results]);

  const handleRefresh = () => {
    setResults(generateMockHistory(100));
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Histórico Blaze</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Visualize estatísticas, multiplicadores e distribuição de cores das rodadas
              registradas.
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar dados
          </Button>
        </header>

        <Alert variant="default" className="border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle>Aviso importante</AlertTitle>
          <AlertDescription>
            Este projeto é apenas um visualizador de dados históricos. Resultados anteriores não
            garantem resultados futuros. Apostas envolvem risco e não há ferramenta capaz de prever
            o resultado de jogos de azar.
          </AlertDescription>
        </Alert>

        <BlazeStats stats={stats} />

        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
            <TabsTrigger value="chart">Gráfico</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <BlazeChart results={results} />
              </div>
              <div>
                <BlazeColorDistribution stats={stats} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <BlazeHistoryTable results={results} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
