import { ProximaListaSignal } from "./signalsStore";

export type ValidationResult = {
  status: "green" | "red" | "wait";
  signal: ProximaListaSignal;
  expectedColor: number; // 0, 1, or 2
  gale0?: { id: string; created_at: string; roll: number; color: number };
  gale1?: { id: string; created_at: string; roll: number; color: number };
  reason: string;
};

/**
 * Função central e única de validação de sinais.
 * Segue a regra rigorosa: SINAL -> TIMESTAMP DO SINAL -> RESULTADO POSTERIOR -> GALE 1 -> STATUS FINAL.
 */
export function validateSignal(
  signal: ProximaListaSignal,
  latestResults: any[] // Array de resultados do Supabase ordenados por created_at DESC
): ValidationResult {
  const signalDate = new Date(signal.entryDate);
  const signalStartTime = signalDate.getTime();
  const signalEndTime = signalStartTime + 60_000;
  const gale1EndTime = signalStartTime + 120_000;

  // Cor alvo baseada nos símbolos
  const targetColor = signal.symbols.startsWith("🔴") ? 1 : (signal.symbols.startsWith("⚫️") ? 2 : 0);
  const targetColorName = targetColor === 1 ? "VERMELHO" : (targetColor === 2 ? "PRETO" : "BRANCO");

  // Filtra resultados que ocorreram estritamente DENTRO da janela do horário do sinal (HH:mm:00 até HH:mm+1:59)
  const allWindowResults = latestResults
    .filter(r => {
      const resTime = new Date(r.created_at).getTime();
      return resTime >= signalStartTime && resTime < gale1EndTime;
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // Ordem cronológica ASC

  console.log(`\n================ TRACE SIGNAL ================`);
  console.log(`SIGNAL ID: ${signal.key}`);
  console.log(`SIGNAL CREATED AT: ${new Date(signal.generatedAt).toISOString()}`);
  console.log(`DISPLAY TIME: ${signal.time}`);
  console.log(`EXPECTED COLOR: ${targetColorName}`);
  console.log(`-----------------------------------------------`);
  console.log(`SIGNAL GENERATION`);
  console.log(`PATTERN/STRATEGY: ${signal.generationContext?.strategy || "N/A"}`);
  console.log(`HISTORICAL RECORDS USED TO GENERATE SIGNAL:`);
  signal.generationContext?.historicalRows?.forEach(r => {
    console.log(`ID: ${r.id} | created_at: ${r.created_at} | roll: ${r.roll} | color: ${r.color}`);
  });
  console.log(`-----------------------------------------------`);
  console.log(`VALIDATION`);
  console.log(`RESULTS AFTER SIGNAL WINDOW START:`);
  allWindowResults.forEach(r => {
    console.log(`ID: ${r.id} | created_at: ${r.created_at} | roll: ${r.roll} | color: ${r.color}`);
  });

  // Identificação baseada na janela do horário (HH:mm:ss)
  const gale0 = allWindowResults.find(r => {
    const resTime = new Date(r.created_at).getTime();
    return resTime >= signalStartTime && resTime < signalEndTime;
  });

  const gale1 = allWindowResults.find(r => {
    const resTime = new Date(r.created_at).getTime();
    const isAfterG0 = gale0 ? (new Date(r.created_at).getTime() > new Date(gale0.created_at).getTime()) : true;
    return resTime >= signalEndTime && resTime < gale1EndTime && isAfterG0;
  });

  console.log(`GALE 0: ${gale0?.id || "N/A"}`);
  console.log(`GALE 1: ${gale1?.id || "N/A"}`);
  console.log(`-----------------------------------------------`);

  // Lógica de decisão
  const isWhite = (r: any) => r && (Number(r.color) === 0 || Number(r.roll) === 0);
  const isTarget = (r: any) => r && Number(r.color) === targetColor;

  // Current time in SP for expiry checks
  const spTimeStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const now = new Date(spTimeStr).getTime();

  // GREEN se Gale 0 ou Gale 1 baterem
  if (isTarget(gale0) || isWhite(gale0)) {
    const reason = `Sucesso no G0 (ID: ${gale0.id})`;
    console.log(`FINAL STATUS: GREEN`);
    console.log(`REASON: ${reason}`);
    console.log(`===============================================`);
    return { status: "green", signal, expectedColor: targetColor, gale0, gale1, reason };
  }

  if (isTarget(gale1) || isWhite(gale1)) {
    const reason = `Sucesso no G1 (ID: ${gale1.id})`;
    console.log(`FINAL STATUS: GREEN`);
    console.log(`REASON: ${reason}`);
    console.log(`===============================================`);
    return { status: "green", signal, expectedColor: targetColor, gale0, gale1, reason };
  }

  // 1. Se o horário de INÍCIO do sinal ainda não chegou, é WAIT
  if (now < signalStartTime) {
    const reason = `Horário do sinal (${signal.time}) ainda não chegou.`;
    console.log(`FINAL STATUS: WAIT`);
    console.log(`REASON: ${reason}`);
    console.log(`===============================================`);
    return { status: "wait", signal, expectedColor: targetColor, reason };
  }

  // 2. Se já passou do horário do Gale 1 (HH:mm + 2 min) e não deu green
  if (now > (gale1EndTime + 5000)) {
    const reason = `Janela finalizada sem a cor esperada.`;
    console.log(`FINAL STATUS: RED`);
    console.log(`REASON: ${reason}`);
    console.log(`===============================================`);
    return { status: "red", signal, expectedColor: targetColor, gale0, gale1, reason };
  }

  // 3. Caso contrário, a janela está aberta
  const reason = "Janela aberta, aguardando resultados.";
  console.log(`FINAL STATUS: WAIT`);
  console.log(`REASON: ${reason}`);
  console.log(`===============================================`);
  return { status: "wait", signal, expectedColor: targetColor, gale0, gale1, reason };
}
