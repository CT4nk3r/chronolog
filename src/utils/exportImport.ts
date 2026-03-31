import {Share, Alert} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import {AppStore} from '../types';

/**
 * Serialise the full store to JSON and open the OS share sheet.
 */
export async function exportData(store: AppStore): Promise<void> {
  const json = JSON.stringify(store, null, 2);
  await Share.share({
    message: json,
    title: 'ChronoLog backup',
  });
}

/**
 * Let the user pick a .json file, parse it, and merge its contents into the
 * existing store by id (duplicates are skipped).
 *
 * Returns the merged store, or null if the user cancelled.
 */
export async function importData(
  current: AppStore,
): Promise<AppStore | null> {
  let result;
  try {
    result = await DocumentPicker.pickSingle({
      type: [DocumentPicker.types.allFiles],
    });
  } catch (err) {
    if (DocumentPicker.isCancel(err)) {
      return null;
    }
    throw err;
  }

  // React Native's fetch can read file:// URIs on both platforms.
  const response = await fetch(result.uri);
  const text = await response.text();

  let parsed: AppStore;
  try {
    parsed = JSON.parse(text) as AppStore;
  } catch {
    Alert.alert('Import failed', 'The selected file is not valid JSON.');
    return null;
  }

  if (!Array.isArray(parsed.watches) || !Array.isArray(parsed.measurements)) {
    Alert.alert('Import failed', 'The file does not contain a valid ChronoLog backup.');
    return null;
  }

  const existingWatchIds = new Set(current.watches.map(w => w.id));
  const existingMeasurementIds = new Set(current.measurements.map(m => m.id));

  const mergedWatches = [
    ...current.watches,
    ...parsed.watches.filter(w => !existingWatchIds.has(w.id)),
  ];
  const mergedMeasurements = [
    ...current.measurements,
    ...parsed.measurements.filter(m => !existingMeasurementIds.has(m.id)),
  ];

  return {watches: mergedWatches, measurements: mergedMeasurements};
}
