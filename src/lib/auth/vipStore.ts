import { useSyncExternalStore } from "react";

const STORAGE_KEY = "freitas_white_vip_status";
const NAME_KEY = "freitas_white_member_name";

let isVip = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) === "true" : false;
let memberName = typeof window !== "undefined" ? localStorage.getItem(NAME_KEY) : null;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return isVip;
}

function getNameSnapshot() {
  return memberName;
}

export function setVipStatus(status: boolean, name: string | null = null) {
  isVip = status;
  memberName = name;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(status));
    if (name) {
      localStorage.setItem(NAME_KEY, name);
    } else {
      localStorage.removeItem(NAME_KEY);
    }
  }
  listeners.forEach((l) => l());
}

export function useVipStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useMemberName() {
  return useSyncExternalStore(subscribe, getNameSnapshot, () => null);
}

export function logoutVip() {
  setVipStatus(false, null);
}
