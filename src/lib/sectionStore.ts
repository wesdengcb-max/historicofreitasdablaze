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
let currentSection: SectionId = "dashboard";

// Initialize currentSection from localStorage as soon as this module loads on the client
if (typeof window !== "undefined") {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    currentSection = saved as SectionId;
  }
}

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
