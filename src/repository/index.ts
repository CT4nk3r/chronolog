import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppStore} from '../types';

const STORAGE_KEY = '@chronolog/store';

const emptyStore: AppStore = {watches: [], measurements: []};

/**
 * Load the full store from AsyncStorage.
 * Returns an empty store if nothing has been saved yet.
 */
export async function load(): Promise<AppStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {...emptyStore};
    }
    return JSON.parse(raw) as AppStore;
  } catch {
    return {...emptyStore};
  }
}

/**
 * Persist the full store to AsyncStorage.
 */
export async function save(store: AppStore): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/**
 * Remove all ChronoLog data from AsyncStorage.
 */
export async function clear(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
