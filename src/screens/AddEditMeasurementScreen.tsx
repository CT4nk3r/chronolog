import React, {useState, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {useStore} from '../store';
import {useTheme} from '../components/ThemeContext';
import type {RootStackParamList} from '../navigation';

type RouteT = RouteProp<RootStackParamList, 'AddEditMeasurement'>;

export default function AddEditMeasurementScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteT>();
  const {watchId, measurementId} = route.params;
  const {colors} = useTheme();

  const {measurements, watches, addMeasurement, updateMeasurement} = useStore();

  const existingMeasurement = useMemo(
    () =>
      measurementId ? measurements.find(m => m.id === measurementId) : undefined,
    [measurementId, measurements],
  );

  const isEditing = !!existingMeasurement;

  // Previous measurement for this watch (sorted), used for auto reference
  const previousMeasurement = useMemo(() => {
    if (isEditing) {
      // Previous is the one immediately before the current in sorted order
      const sorted = [...measurements]
        .filter(m => m.watchId === watchId)
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      const idx = sorted.findIndex(m => m.id === measurementId);
      return idx > 0 ? sorted[idx - 1] : undefined;
    }
    // For new entry: the last one for this watch
    const sorted = [...measurements]
      .filter(m => m.watchId === watchId)
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    return sorted.length > 0 ? sorted[sorted.length - 1] : undefined;
  }, [isEditing, measurements, watchId, measurementId]);

  const [measuredAt, setMeasuredAt] = useState<Date>(
    existingMeasurement
      ? new Date(existingMeasurement.timestamp)
      : new Date(),
  );
  const [showMeasuredAtPicker, setShowMeasuredAtPicker] = useState(false);

  const [deviationText, setDeviationText] = useState(
    existingMeasurement ? String(existingMeasurement.deviationSeconds) : '',
  );

  const [useCustomRef, setUseCustomRef] = useState<boolean>(
    existingMeasurement
      ? existingMeasurement.referenceTimestamp !== (previousMeasurement?.timestamp ?? '')
      : false,
  );

  const [customRefDate, setCustomRefDate] = useState<Date>(
    existingMeasurement
      ? new Date(existingMeasurement.referenceTimestamp)
      : previousMeasurement
      ? new Date(previousMeasurement.timestamp)
      : new Date(),
  );
  const [showCustomRefPicker, setShowCustomRefPicker] = useState(false);

  const [note, setNote] = useState(existingMeasurement?.note ?? '');

  const handleSave = useCallback(() => {
    const deviation = parseFloat(deviationText);
    if (isNaN(deviation)) {
      Alert.alert('Validation', 'Please enter a valid deviation (e.g. -3.5).');
      return;
    }

    const refTimestamp = useCustomRef
      ? customRefDate.toISOString()
      : previousMeasurement
      ? previousMeasurement.timestamp
      : measuredAt.toISOString();

    if (isEditing && measurementId) {
      updateMeasurement(measurementId, {
        timestamp: measuredAt.toISOString(),
        deviationSeconds: deviation,
        referenceTimestamp: refTimestamp,
        note,
      });
    } else {
      addMeasurement({
        watchId,
        timestamp: measuredAt.toISOString(),
        deviationSeconds: deviation,
        referenceTimestamp: refTimestamp,
        note,
      });
    }

    navigation.goBack();
  }, [
    deviationText,
    useCustomRef,
    customRefDate,
    previousMeasurement,
    measuredAt,
    isEditing,
    measurementId,
    updateMeasurement,
    addMeasurement,
    watchId,
    note,
    navigation,
  ]);

  const handleMeasuredAtChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowMeasuredAtPicker(false);
    }
    if (date) {
      setMeasuredAt(date);
    }
  };

  const handleCustomRefChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowCustomRefPicker(false);
    }
    if (date) {
      setCustomRefDate(date);
    }
  };

  const watchName = watches.find(w => w.id === watchId)?.name ?? watchId;
  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Watch selector — locked when editing */}
      <Text style={styles.label}>Watch</Text>
      <View style={[styles.input, styles.locked]}>
        <Text style={[styles.lockedText, {color: isEditing ? colors.subtext : colors.text}]}>
          {watchName}
        </Text>
      </View>

      {/* Measured at */}
      <Text style={styles.label}>Measured at</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowMeasuredAtPicker(true)}
        accessibilityLabel="Select measured at date and time"
        accessibilityRole="button">
        <Text style={styles.inputText}>{measuredAt.toLocaleString()}</Text>
      </TouchableOpacity>
      {showMeasuredAtPicker && (
        <DateTimePicker
          value={measuredAt}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleMeasuredAtChange}
          accessibilityLabel="Measured at date time picker"
        />
      )}

      {/* Deviation */}
      <Text style={styles.label}>Deviation (seconds)</Text>
      <TextInput
        style={styles.input}
        value={deviationText}
        onChangeText={setDeviationText}
        placeholder="-3.5"
        placeholderTextColor={colors.subtext}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel="Deviation in seconds"
        returnKeyType="done"
      />

      {/* Reference toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {useCustomRef ? 'Custom reference time' : 'Since last measurement'}
        </Text>
        <Switch
          value={useCustomRef}
          onValueChange={setUseCustomRef}
          accessibilityLabel="Toggle custom reference time"
        />
      </View>

      {!useCustomRef && previousMeasurement && (
        <Text style={styles.refHint}>
          Reference: {new Date(previousMeasurement.timestamp).toLocaleString()}
        </Text>
      )}

      {!useCustomRef && !previousMeasurement && (
        <Text style={styles.refHint}>No previous measurement — using measurement time as reference.</Text>
      )}

      {useCustomRef && (
        <>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowCustomRefPicker(true)}
            accessibilityLabel="Select custom reference date and time"
            accessibilityRole="button">
            <Text style={styles.inputText}>{customRefDate.toLocaleString()}</Text>
          </TouchableOpacity>
          {showCustomRefPicker && (
            <DateTimePicker
              value={customRefDate}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={handleCustomRefChange}
              accessibilityLabel="Custom reference date time picker"
            />
          )}
        </>
      )}

      {/* Note */}
      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        style={[styles.input, styles.noteInput]}
        value={note}
        onChangeText={setNote}
        placeholder="Any notes..."
        placeholderTextColor={colors.subtext}
        multiline
        accessibilityLabel="Optional note"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        accessibilityLabel={isEditing ? 'Save changes' : 'Save measurement'}
        accessibilityRole="button">
        <Text style={styles.buttonText}>{isEditing ? 'Save changes' : 'Add measurement'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: colors.background},
    content: {padding: 16, paddingBottom: 48},
    label: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginTop: 16,
      marginBottom: 4,
    },
    input: {
      backgroundColor: colors.card,
      color: colors.text,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
    },
    inputText: {color: colors.text, fontSize: 16},
    locked: {justifyContent: 'center'},
    lockedText: {fontSize: 16},
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    toggleLabel: {color: colors.text, fontSize: 15},
    refHint: {color: colors.subtext, fontSize: 13, marginTop: 6, marginLeft: 4},
    noteInput: {minHeight: 80, textAlignVertical: 'top'},
    button: {
      marginTop: 32,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonText: {color: '#FFFFFF', fontSize: 17, fontWeight: '600'},
  });
}
