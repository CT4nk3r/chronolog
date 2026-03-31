import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {useStore} from '../store';
import {useTheme} from '../components/ThemeContext';
import {exportData, importData} from '../utils/exportImport';

export default function SettingsScreen() {
  const {colors, isDark, toggleTheme} = useTheme();
  const {watches, measurements, clearAll, replaceAll} = useStore();

  const handleExport = async () => {
    try {
      await exportData({watches, measurements});
    } catch (err) {
      Alert.alert('Export failed', String(err));
    }
  };

  const handleImport = async () => {
    try {
      const merged = await importData({watches, measurements});
      if (merged) {
        replaceAll(merged.watches, merged.measurements);
        Alert.alert('Import complete', 'Data merged successfully.');
      }
    } catch (err) {
      Alert.alert('Import failed', String(err));
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear all data',
      'This will permanently delete all watches and measurements. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => clearAll(),
        },
      ],
    );
  };

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>Appearance</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={toggleTheme}
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          accessibilityRole="button">
          <Text style={styles.rowText}>{isDark ? '☀️  Light mode' : '🌙  Dark mode'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Data</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={handleExport}
          accessibilityLabel="Export data as JSON"
          accessibilityRole="button">
          <Text style={styles.rowText}>📤  Export data (JSON)</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.row}
          onPress={handleImport}
          accessibilityLabel="Import data from JSON file"
          accessibilityRole="button">
          <Text style={styles.rowText}>📥  Import data (JSON)</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Danger zone</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={handleClear}
          accessibilityLabel="Clear all data"
          accessibilityRole="button">
          <Text style={[styles.rowText, {color: colors.danger}]}>
            🗑️  Clear all data
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        ChronoLog — fully offline watch drift tracker{'\n'}
        {watches.length} watch{watches.length !== 1 ? 'es' : ''},{' '}
        {measurements.length} measurement{measurements.length !== 1 ? 's' : ''}
      </Text>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: colors.background},
    content: {padding: 16, paddingBottom: 48},
    sectionHeader: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginTop: 24,
      marginBottom: 8,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 10,
      overflow: 'hidden',
    },
    row: {paddingHorizontal: 16, paddingVertical: 14},
    rowText: {color: colors.text, fontSize: 16},
    divider: {height: 1, backgroundColor: colors.border, marginLeft: 16},
    footer: {
      color: colors.subtext,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 40,
      lineHeight: 18,
    },
  });
}
