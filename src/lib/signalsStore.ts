import { create } from 'zustand';

export type ProximaListaSignal = {
  key: string;
  time: string;
  symbols: string;
  entryDate: Date;
  generatedAt: number;
  outcome?: "pending" | "green" | "red" | "waiting";
  // Audit fields
  generationContext?: {
    strategy: string;
    historicalRows: any[];
  };
};

const PROXIMA_LISTA_KEY = "freitas.proxima.lista";
const PROXIMA_LISTA_EVENT = "freitas:proxima_lista";

export const setProximaListaSignals = (signals: ProximaListaSignal[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROXIMA_LISTA_KEY, JSON.stringify(signals));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(PROXIMA_LISTA_EVENT));
};

export const getProximaListaSignals = (): ProximaListaSignal[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROXIMA_LISTA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const subscribeProximaLista = (listener: () => void): () => void => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PROXIMA_LISTA_EVENT, listener);
  window.addEventListener("storage", (e) => {
    if (e.key === PROXIMA_LISTA_KEY) listener();
  });
  return () => {
    window.removeEventListener(PROXIMA_LISTA_EVENT, listener);
  };
};

export interface PredictiveSignal {
  key: string;
  time: string;
  pct: number;
  label: string;
  confluence: string;
  medal?: string;
  outcome?: "pending" | "green" | "red";
  resultTime?: string;
  entryDate?: Date;
}

const PREDICTIVE_KEY = "freitas.predictive.signals";
const PREDICTIVE_EVENT = "freitas:predictive";

export const setPredictiveSignals = (signals: PredictiveSignal[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREDICTIVE_KEY, JSON.stringify(signals));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(PREDICTIVE_EVENT));
};

export const getPredictiveSignals = (): PredictiveSignal[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREDICTIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const subscribePredictive = (listener: () => void): () => void => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PREDICTIVE_EVENT, listener);
  window.addEventListener("storage", (e) => {
    if (e.key === PREDICTIVE_KEY) listener();
  });
  return () => {
    window.removeEventListener(PREDICTIVE_EVENT, listener);
  };
};
