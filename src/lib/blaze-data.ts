export interface BlazeResult {
  id: string;
  round: number;
  multiplier: number;
  color: "red" | "black" | "white";
  createdAt: string;
}

function generateId(round: number) {
  return `blaze-${round.toString().padStart(6, "0")}`;
}

function randomMultiplier(): number {
  const r = Math.random();
  if (r < 0.45) return Number((1 + Math.random() * 0.99).toFixed(2));
  if (r < 0.75) return Number((2 + Math.random() * 3).toFixed(2));
  if (r < 0.9) return Number((5 + Math.random() * 10).toFixed(2));
  return Number((15 + Math.random() * 85).toFixed(2));
}

function randomColor(): BlazeResult["color"] {
  const r = Math.random();
  if (r < 0.495) return "red";
  if (r < 0.99) return "black";
  return "white";
}

export function generateMockHistory(count = 100): BlazeResult[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const round = count - i;
    return {
      id: generateId(round),
      round,
      multiplier: randomMultiplier(),
      color: randomColor(),
      createdAt: new Date(now.getTime() - i * 60_000).toISOString(),
    };
  });
}

export function computeStats(results: BlazeResult[]) {
  const multipliers = results.map((r) => r.multiplier);
  const avg =
    multipliers.reduce((sum, m) => sum + m, 0) / (multipliers.length || 1);
  const highest = multipliers.length ? Math.max(...multipliers) : 0;
  const lowest = multipliers.length ? Math.min(...multipliers) : 0;

  const colorCounts = results.reduce(
    (acc, r) => {
      acc[r.color] += 1;
      return acc;
    },
    { red: 0, black: 0, white: 0 },
  );

  return {
    total: results.length,
    averageMultiplier: Number(avg.toFixed(2)),
    highestMultiplier: Number(highest.toFixed(2)),
    lowestMultiplier: Number(lowest.toFixed(2)),
    redCount: colorCounts.red,
    blackCount: colorCounts.black,
    whiteCount: colorCounts.white,
  };
}
