// Store leve para compartilhar sinais entre /sinais e /historico via localStorage.
export type StoredSignal = {
  id: string;
  color: "red" | "black" | "white";
  entry: number;
  targetIso: string; // ISO UTC do horário do sinal
  outcome: "pending" | "green" | "red";
  matchedIso?: string; // ISO UTC do resultado que bateu (se green)
};

const KEY = "freitas.signals.v1";
const EVENT = "freitas:signals";

function read(): StoredSignal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSignal[]) : [];
  } catch {
    return [];
  }
}

let cache: StoredSignal[] = [];
let hydrated = false;

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  cache = read();
}

export function setSignals(next: StoredSignal[]) {
  if (typeof window === "undefined") return;
  ensureHydrated();
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT));
}

export function getSignals(): StoredSignal[] {
  ensureHydrated();
  return cache;
}

export function subscribeSignals(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onChange = () => {
    cache = read();
    listener();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) onChange();
  });
  return () => {
    window.removeEventListener(EVENT, onChange);
  };
}
