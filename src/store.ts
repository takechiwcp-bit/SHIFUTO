import { create } from 'zustand';
import type { AppState } from './types';

// user provided GAS URL
const API_URL = 'https://script.google.com/macros/s/AKfycbwTFt6kVq5LSmtK_IbAEezfBKq-LMTGArVs79KnwtWuYk97FDyGSFWHteMiVYUlho-NYQ/exec';

interface StoreState extends AppState {
  activeEventId: string | null;
  loading: boolean;
  error: string | null;
  isLoading: boolean;
  setActiveEventId: (id: string | null) => void;
  fetchData: () => Promise<void>;
  dispatchAction: (action: string, payload: any) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  Events: [],
  PositionCategories: [],
  Positions: [],
  Staff: [],
  StaffTraits: [],
  Shifts: [],
  activeEventId: null,
  loading: false,
  error: null,
  isLoading: true,
  
  setActiveEventId: (id) => {
    set({ activeEventId: id, isLoading: true });
    get().fetchData();
  },
  
  fetchData: async () => {
    try {
      const { activeEventId } = get();
      const url = activeEventId ? `${API_URL}?eventId=${activeEventId}` : API_URL;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        const positions = result.data.Positions || [];
        const validShifts = (result.data.Shifts || []).filter((s: any) => {
          const p = positions.find((pos: any) => pos.id === s.positionId);
          if (!p) return false;
          if (s.slotIndex >= p.requiredPeople) return false;
          return true;
        });
        set({
          Events: result.data.Events || [],
          PositionCategories: result.data.PositionCategories || [],
          Positions: positions,
          Staff: result.data.Staff || [],
          StaffTraits: result.data.StaffTraits || [],
          Shifts: validShifts,
          error: null,
          isLoading: false
        });
      } else {
        set({ error: result.error, isLoading: false });
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      set({ error: err.message, isLoading: false });
    }
  },
  
  dispatchAction: async (action, payload) => {
    try {
      const { activeEventId } = get();
      // Opt out of preflight by sending text/plain which GAS doPost can read via e.postData.contents
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, payload, activeEventId })
      });
      const result = await response.json();
      if (result.success) {
         const positions = result.data.Positions || [];
         const validShifts = (result.data.Shifts || []).filter((s: any) => {
           const p = positions.find((pos: any) => pos.id === s.positionId);
           if (!p) return false;
           if (s.slotIndex >= p.requiredPeople) return false;
           return true;
         });
         set({
          Events: result.data.Events || [],
          PositionCategories: result.data.PositionCategories || [],
          Positions: positions,
          Staff: result.data.Staff || [],
          StaffTraits: result.data.StaffTraits || [],
          Shifts: validShifts,
          error: null
        });
      } else {
         set({ error: result.error });
      }
    } catch (err: any) {
       console.error("Dispatch Error:", err);
       set({ error: err.message });
    }
  }
}));

// Setup polling
let pollingStarted = false;
export const startPolling = () => {
  if (pollingStarted) return;
  pollingStarted = true;
  
  const poll = async () => {
    await useStore.getState().fetchData();
    setTimeout(poll, 1500); // 1.5秒待機してから次のリクエストを送る（詰まり防止）
  };
  
  poll();
};
