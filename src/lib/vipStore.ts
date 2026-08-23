import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VipState {
  isVip: boolean;
  memberName: string | null;
  vipLevel: 'member' | 'admin' | null;
  setVip: (status: boolean, name?: string | null, level?: 'member' | 'admin' | null) => void;
  logout: () => void;
}

export const useVipStore = create<VipState>()(
  persist(
    (set) => ({
      isVip: false,
      memberName: null,
      vipLevel: null,
      setVip: (status, name = null, level = 'member') => set({ isVip: status, memberName: name, vipLevel: level }),
      logout: () => set({ isVip: false, memberName: null, vipLevel: null }),
    }),
    {
      name: 'vip-storage',
    }
  )
);
