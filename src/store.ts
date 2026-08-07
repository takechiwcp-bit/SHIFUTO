import { create } from 'zustand';
import type { AppState } from './types';

// user provided GAS URL
const API_URL = 'https://script.google.com/macros/s/AKfycbwTFt6kVq5LSmtK_IbAEezfBKq-LMTGArVs79KnwtWuYk97FDyGSFWHteMiVYUlho-NYQ/exec';

interface StoreState extends AppState {
  loading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  dispatchAction: (action: string, payload: any) => Promise<void>;
}

export const useStore = create<StoreState>((set) => ({
  Events: [],
  PositionCategories: [],
  Positions: [],
  Staff: [],
  StaffTraits: [],
  Shifts: [],
  loading: false,
  error: null,
  
  fetchData: async () => {
    try {
      const response = await fetch(API_URL);
      const result = await response.json();
      if (result.success) {
        set({
          Events: result.data.Events || [],
          PositionCategories: result.data.PositionCategories || [],
          Positions: result.data.Positions || [],
          Staff: result.data.Staff || [],
          StaffTraits: result.data.StaffTraits || [],
          Shifts: result.data.Shifts || [],
          error: null
        });
      } else {
        set({ error: result.error });
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      set({ error: err.message });
    }
  },
  
  dispatchAction: async (action, payload) => {
    try {
      // Opt out of preflight by sending text/plain which GAS doPost can read via e.postData.contents
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, payload })
      });
      const result = await response.json();
      if (result.success) {
         set({
          Events: result.data.Events || [],
          PositionCategories: result.data.PositionCategories || [],
          Positions: result.data.Positions || [],
          Staff: result.data.Staff || [],
          StaffTraits: result.data.StaffTraits || [],
          Shifts: result.data.Shifts || [],
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
  useStore.getState().fetchData();
  setInterval(() => {
    useStore.getState().fetchData();
  }, 1000);
};
