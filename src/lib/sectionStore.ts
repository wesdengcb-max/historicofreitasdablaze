import { useSyncExternalStore } from "react";

export type SectionId =
  | "dashboard"
  | "analise"
  | "apostas"
  | "feed"
  | "sinais"
  | "estrategias"
  | "videos"
  | "blaze"
  | "hostman";

const STORAGE_KEY = "freitas-white-active-section";

// Get initial state from localStorage if available, otherwise default to dashboard
let currentSection: SectionId = (typeof window !== "undefined" 
  ? localStorage.getItem(STORAGE_KEY) as SectionId 
  : "dashboard") || "dashboard";

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
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, s);
  }
  listeners.forEach((l) => l());
}

export function useSection() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
