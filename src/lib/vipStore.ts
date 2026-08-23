import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VipState {
  isVip: boolean;
  memberName: string | null;
  setVip: (status: boolean, name?: string | null) => void;
  logout: () => void;
}

export const useVipStore = create<VipState>()(
  persist(
    (set) => ({
      isVip: false,
      memberName: null,
      setVip: (status, name = null) => set({ isVip: status, memberName: name }),
      logout: () => set({ isVip: false, memberName: null }),
    }),
    {
      name: 'vip-storage',
    }
  )
);
