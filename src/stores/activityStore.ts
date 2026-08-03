import { create } from "zustand";
import { api, type ActivityLogEntry } from "../lib/api";

interface ActivityStore {
  entries: ActivityLogEntry[];
  loading: boolean;
  /** Idempotent restore from persisted data. Replaces all entries. */
  restore: (entries: ActivityLogEntry[]) => void;
  /** Append a new realtime entry (from activityDetector). */
  push: (entry: ActivityLogEntry) => void;
  /** Fetch from SQLite and restore. */
  loadFromDb: (deviceId: number) => Promise<void>;
  clear: () => void;
}

export const useActivityStore = create<ActivityStore>((set) => ({
  entries: [],
  loading: false,

  restore: (entries) => set({ entries }),

  push: (entry) =>
    set((state) => ({
      entries: [entry, ...state.entries].slice(0, 1000)
    })),

  loadFromDb: async (deviceId) => {
    set({ loading: true });
    try {
      const entries = await api.getLogs(deviceId, 1000, 0);
      console.log(`[activityStore] loadFromDb: loaded ${entries.length} entries for device ${deviceId}`);
      // Merge: keep any entries pushed during the await window (newer than DB fetch)
      set((state) => {
        const dbTs = new Set(entries.map((e) => e.ts));
        const concurrent = state.entries.filter((e) => !dbTs.has(e.ts));
        return { entries: [...entries, ...concurrent] };
      });
    } catch (e) {
      console.warn("[activityStore] loadFromDb failed:", e);
    } finally {
      set({ loading: false });
    }
  },

  clear: () => set({ entries: [] })
}));

