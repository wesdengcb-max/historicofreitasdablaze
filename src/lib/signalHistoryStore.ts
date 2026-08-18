import { create } from 'zustand';
import { PredictiveSignal } from './signalsStore';

interface SignalHistoryStore {
  history: (PredictiveSignal & { timestamp: number })[];
  addSignal: (signal: PredictiveSignal) => void;
  updateSignal: (key: string, updates: Partial<PredictiveSignal>) => void;
  removeSignal: (key: string) => void;
}

export const useSignalHistoryStore = create<SignalHistoryStore>((set) => ({
  history: [],
  addSignal: (signal) => set((state) => {
    if (state.history.some(s => s.key === signal.key)) return state;
    return { history: [ { ...signal, timestamp: Date.now() }, ...state.history ].slice(0, 50) };
  }),
  updateSignal: (key, updates) => set((state) => ({
    history: state.history.map(s => s.key === key ? { ...s, ...updates, timestamp: Date.now() } : s)
  })),
  removeSignal: (key) => set((state) => ({
    history: state.history.filter(s => s.key !== key)
  }))
}));
