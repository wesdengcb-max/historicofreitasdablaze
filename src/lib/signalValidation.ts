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
  const signalGenerationTime = signal.generatedAt;
  const signalDate = new Date(signal.entryDate);
  const signalStartTime = signalDate.getTime();
  const signalEndTime = signalStartTime + 60_000;
  const gale1EndTime = signalStartTime + 120_000;

  // Cor alvo baseada nos símbolos
  const targetColor = signal.symbols.startsWith("🔴") ? 1 : (signal.symbols.startsWith("⚫️") ? 2 : 0);
  const targetColorName = targetColor === 1 ? "VERMELHO" : (targetColor === 2 ? "PRETO" : "BRANCO");

  // Filtra resultados que ocorreram estritamente APÓS a geração do sinal
  // e dentro da janela máxima permitida (Sinal + Gale 1)
  const allPosteriorResults = latestResults
    .filter(r => {
      const resDate = new Date(r.created_at);
      const resTime = resDate.getTime();
      return resTime > signalGenerationTime && resTime < (gale1EndTime + 30000); // 30s de margem de segurança para o DB
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // Ordem cronológica ASC

  const resultsBeforeSignal = latestResults
    .filter(r => {
      const resDate = new Date(r.created_at);
      const resTime = resDate.getTime();
      return resTime <= signalGenerationTime && resTime >= (signalStartTime - 60000);
    });

  console.log(`\n========== VALIDAÇÃO DO SINAL ==========`);
  console.log(`SINAL:`);
  console.log(`horário exibido: ${signal.time}`);
  console.log(`timestamp exato: ${signalGenerationTime} (${new Date(signalGenerationTime).toISOString()})`);
  console.log(`cor esperada: ${targetColorName} (${targetColor})`);

  console.log(`RESULTADOS ANTES DO SINAL:`);
  if (resultsBeforeSignal.length === 0) {
    console.log("(Nenhum resultado recente antes do sinal)");
  }
  resultsBeforeSignal.forEach(r => {
    console.log(`ID: ${r.id} | created_at: ${r.created_at} | roll: ${r.roll} | color: ${r.color} -> AÇÃO: IGNORADO`);
  });

  // Identificação do Gale 0 e Gale 1 baseada na cronologia real
  // Gale 0: Primeiro resultado após a geração do sinal dentro do minuto do sinal
  const gale0 = allPosteriorResults.find(r => {
    const resTime = new Date(r.created_at).getTime();
    return resTime >= signalStartTime && resTime < signalEndTime;
  });

  // Gale 1: Primeiro resultado após o Gale 0 (ou após o minuto do sinal se não houve Gale 0) dentro do minuto do Gale 1
  const gale1 = allPosteriorResults.find(r => {
    const resTime = new Date(r.created_at).getTime();
    const isAfterGale0 = gale0 ? (new Date(r.created_at).getTime() > new Date(gale0.created_at).getTime()) : true;
    return resTime >= signalEndTime && resTime < gale1EndTime && isAfterGale0;
  });

  console.log(`RESULTADOS DEPOIS DO SINAL:`);
  if (gale0) {
    console.log(`GALE 0: ID: ${gale0.id} | created_at: ${gale0.created_at} | roll: ${gale0.roll} | color: ${gale0.color}`);
  } else {
    console.log(`GALE 0: (Aguardando ou não encontrado no minuto)`);
  }

  if (gale1) {
    console.log(`GALE 1: ID: ${gale1.id} | created_at: ${gale1.created_at} | roll: ${gale1.roll} | color: ${gale1.color}`);
  } else {
    console.log(`GALE 1: (Aguardando ou não encontrado no minuto)`);
  }

  // Lógica de decisão
  const isWhite = (r: any) => r && (Number(r.color) === 0 || Number(r.roll) === 0);
  const isTarget = (r: any) => r && Number(r.color) === targetColor;

  // GREEN se Gale 0 ou Gale 1 baterem
  if (isTarget(gale0) || isWhite(gale0)) {
    const reason = `Sucesso no G0 (ID: ${gale0.id})`;
    console.log(`DECISÃO: GREEN`);
    console.log(`MOTIVO: ${reason}`);
    console.log(`==========================================`);
    return { status: "green", signal, expectedColor: targetColor, gale0, gale1, reason };
  }

  if (isTarget(gale1) || isWhite(gale1)) {
    const reason = `Sucesso no G1 (ID: ${gale1.id})`;
    console.log(`DECISÃO: GREEN`);
    console.log(`MOTIVO: ${reason}`);
    console.log(`==========================================`);
    return { status: "green", signal, expectedColor: targetColor, gale0, gale1, reason };
  }

  // RED se o tempo expirou e não houve sucesso
  const spTimeStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const now = new Date(spTimeStr).getTime();
  const expiryTime = gale1EndTime + 10000; // 10s após o fim do G1

  if (now > expiryTime) {
    const reason = gale1 ? "Gale 1 finalizado sem sucesso" : "Janela expirada sem resultados compatíveis";
    console.log(`DECISÃO: RED`);
    console.log(`MOTIVO: ${reason}`);
    console.log(`==========================================`);
    return { status: "red", signal, expectedColor: targetColor, gale0, gale1, reason };
  }

  // Caso contrário, WAIT
  console.log(`DECISÃO: WAIT`);
  console.log(`MOTIVO: Aguardando resultados da janela`);
  console.log(`==========================================`);
  return { status: "wait", signal, expectedColor: targetColor, gale0, gale1, reason: "Aguardando" };
}
