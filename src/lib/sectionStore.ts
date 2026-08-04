import { useSyncExternalStore } from "react";

export type SectionId =
  | "historico"
  | "analise"
  | "sinais"
  | "estrategias"
  | "videos"
  | "blaze"
  | "hostman";

let currentSection: SectionId = "historico";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return currentSection;
}

export function setSection(s: SectionId) {
  if (s === currentSection) return;
  currentSection = s;
  listeners.forEach((l) => l());
}

export function useSection() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
