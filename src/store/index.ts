import {create} from 'zustand';
import {Watch, Measurement, DriftEntry} from '../types';
import {newId} from '../utils/uuid';
import {recalculateEntries} from '../utils/driftCalc';
import * as repository from '../repository';

interface StoreState {
  watches: Watch[];
  measurements: Measurement[];
  hydrated: boolean;

  // Selectors
  getDriftEntries: (watchId: string) => DriftEntry[];

  // Hydration
  hydrate: () => Promise<void>;

  // Watch actions
  addWatch: (name: string, movementType: string, targetAccuracySeconds: number) => void;
  updateWatch: (id: string, updates: Partial<Omit<Watch, 'id'>>) => void;
  deleteWatch: (id: string) => void;

  // Measurement actions
  addMeasurement: (payload: Omit<Measurement, 'id'>) => void;
  updateMeasurement: (id: string, updates: Partial<Omit<Measurement, 'id' | 'watchId'>>) => void;
  deleteMeasurement: (id: string) => void;

  // Import / Settings
  replaceAll: (watches: Watch[], measurements: Measurement[]) => void;
  clearAll: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  watches: [],
  measurements: [],
  hydrated: false,

  getDriftEntries: (watchId: string): DriftEntry[] => {
    const {measurements} = get();
    const forWatch = measurements.filter(m => m.watchId === watchId);
    return recalculateEntries(forWatch);
  },

  hydrate: async () => {
    const data = await repository.load();
    set({
      watches: data.watches,
      measurements: data.measurements,
      hydrated: true,
    });
  },

  addWatch: (name, movementType, targetAccuracySeconds) => {
    const watch: Watch = {id: newId(), name, movementType, targetAccuracySeconds};
    set(state => {
      const watches = [...state.watches, watch];
      repository.save({watches, measurements: state.measurements});
      return {watches};
    });
  },

  updateWatch: (id, updates) => {
    set(state => {
      const watches = state.watches.map(w => (w.id === id ? {...w, ...updates} : w));
      repository.save({watches, measurements: state.measurements});
      return {watches};
    });
  },

  deleteWatch: id => {
    set(state => {
      const watches = state.watches.filter(w => w.id !== id);
      const measurements = state.measurements.filter(m => m.watchId !== id);
      repository.save({watches, measurements});
      return {watches, measurements};
    });
  },

  addMeasurement: payload => {
    const measurement: Measurement = {id: newId(), ...payload};
    set(state => {
      const measurements = [...state.measurements, measurement].sort(
        (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
      );
      repository.save({watches: state.watches, measurements});
      return {measurements};
    });
  },

  updateMeasurement: (id, updates) => {
    set(state => {
      const measurements = state.measurements
        .map(m => (m.id === id ? {...m, ...updates} : m))
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      repository.save({watches: state.watches, measurements});
      return {measurements};
    });
  },

  deleteMeasurement: id => {
    set(state => {
      const measurements = state.measurements.filter(m => m.id !== id);
      repository.save({watches: state.watches, measurements});
      return {measurements};
    });
  },

  replaceAll: (watches, measurements) => {
    set({watches, measurements});
    repository.save({watches, measurements});
  },

  clearAll: async () => {
    await repository.clear();
    set({watches: [], measurements: []});
  },
}));
