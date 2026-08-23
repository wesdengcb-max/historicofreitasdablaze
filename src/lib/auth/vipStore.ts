import { useSyncExternalStore } from "react";

const STATUS_KEY = "freitas_white_vip_status";
const NAME_KEY = "freitas_white_member_name";
const LEVEL_KEY = "freitas_white_vip_level";
const TOKEN_KEY = "freitas_white_vip_token";

let isVip = typeof window !== "undefined" ? localStorage.getItem(STATUS_KEY) === "true" : false;
let memberName = typeof window !== "undefined" ? localStorage.getItem(NAME_KEY) : null;
let vipLevel = (typeof window !== "undefined" ? localStorage.getItem(LEVEL_KEY) : null) as "member" | "admin" | null;
let vipToken = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  
  // Listen for storage changes from other tabs
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STATUS_KEY || e.key === LEVEL_KEY || e.key === NAME_KEY || e.key === TOKEN_KEY) {
      if (typeof window !== "undefined") {
        isVip = localStorage.getItem(STATUS_KEY) === "true";
        memberName = localStorage.getItem(NAME_KEY);
        vipLevel = localStorage.getItem(LEVEL_KEY) as "member" | "admin" | null;
        vipToken = localStorage.getItem(TOKEN_KEY);
        cb();
      }
    }
  };
  
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

function getSnapshot() {
  return isVip;
}

function getNameSnapshot() {
  return memberName;
}

function getLevelSnapshot() {
  return vipLevel;
}

function getTokenSnapshot() {
  return vipToken;
}

export function setVipStatus(status: boolean, name: string | null = null, level: "member" | "admin" | null = "member", token: string | null = null) {
  isVip = status;
  memberName = name;
  vipLevel = level;
  vipToken = token;
  
  if (typeof window !== "undefined") {
    localStorage.setItem(STATUS_KEY, String(status));
    
    if (name) localStorage.setItem(NAME_KEY, name);
    else localStorage.removeItem(NAME_KEY);
    
    if (level) localStorage.setItem(LEVEL_KEY, level);
    else localStorage.removeItem(LEVEL_KEY);

    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);

    // Force re-render of components using the store and triggers state hydration across tabs
    listeners.forEach((l) => l());
  }
}

export function useVipStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useMemberName() {
  return useSyncExternalStore(subscribe, getNameSnapshot, () => null);
}

export function useVipLevel() {
  return useSyncExternalStore(subscribe, getLevelSnapshot, () => null);
}

export function useVipToken() {
  return useSyncExternalStore(subscribe, getTokenSnapshot, () => null);
}

export function logoutVip() {
  setVipStatus(false, null, null, null);
}
