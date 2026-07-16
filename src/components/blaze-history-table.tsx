import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BlazeResult } from "@/lib/blaze-data";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

interface BlazeHistoryTableProps {
  results: BlazeResult[];
}

function colorLabel(color: BlazeResult["color"]) {
  switch (color) {
    case "red":
      return "Vermelho";
    case "black":
      return "Preto";
    case "white":
      return "Branco";
  }
}

function colorBadgeVariant(color: BlazeResult["color"]) {
  switch (color) {
    case "red":
      return "destructive";
    case "black":
      return "secondary";
    case "white":
      return "outline";
  }
}

export function BlazeHistoryTable({ results }: BlazeHistoryTableProps) {
  return (
    <ScrollArea className="h-[420px] rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Rodada</TableHead>
            <TableHead>Horário</TableHead>
            <TableHead>Multiplicador</TableHead>
            <TableHead>Cor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.id}>
              <TableCell className="font-medium">#{result.round}</TableCell>
              <TableCell>
                {format(new Date(result.createdAt), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              </TableCell>
              <TableCell>{result.multiplier.toFixed(2)}x</TableCell>
              <TableCell>
                <Badge variant={colorBadgeVariant(result.color)}>
                  {colorLabel(result.color)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
