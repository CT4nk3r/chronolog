import React, {useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
  Alert,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {useStore} from '../store';
import {useTheme} from '../components/ThemeContext';
import DriftChart from '../components/DriftChart';
import {
  buildDriftEntries,
  latestDriftRate,
  rollingSevenDayAverage,
  allTimeAverage,
} from '../utils/driftCalc';
import type {RootStackParamList} from '../navigation';
import type {DriftEntry} from '../types';

type RouteT = RouteProp<RootStackParamList, 'WatchDetail'>;
type Nav = StackNavigationProp<RootStackParamList, 'WatchDetail'>;

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function WatchDetailScreen() {
  const route = useRoute<RouteT>();
  const navigation = useNavigation<Nav>();
  const {watchId} = route.params;
  const {colors} = useTheme();
  const {watches, measurements} = useStore();
  const {width} = useWindowDimensions();

  const watch = watches.find(w => w.id === watchId);
  const watchMeasurements = useMemo(
    () => measurements.filter(m => m.watchId === watchId),
    [measurements, watchId],
  );

  const entries: DriftEntry[] = useMemo(
    () => buildDriftEntries(watchMeasurements),
    [watchMeasurements],
  );

  // Display list newest-first
  const displayEntries = useMemo(() => [...entries].reverse(), [entries]);

  const latest = latestDriftRate(entries);
  const rolling7 = rollingSevenDayAverage(entries);
  const allTime = allTimeAverage(entries);

  const styles = makeStyles(colors);

  if (!watch) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Watch not found.</Text>
      </SafeAreaView>
    );
  }

  const renderStatRow = (label: string, value: string) => (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={displayEntries}
        keyExtractor={item => item.measurement.id}
        ListHeaderComponent={
          <View>
            {/* Watch info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Movement</Text>
              <Text style={styles.sectionValue}>{watch.movementType || '—'}</Text>
              <Text style={styles.sectionTitle}>Target accuracy</Text>
              <Text style={styles.sectionValue}>
                ±{watch.targetAccuracySeconds} s/day
              </Text>
            </View>

            {/* Stats */}
            <View style={styles.section}>
              {renderStatRow(
                'Latest drift',
                latest !== null ? `${latest.toFixed(2)} s/day` : '—',
              )}
              {renderStatRow(
                'Rolling 7-day avg',
                rolling7 !== null ? `${rolling7.toFixed(2)} s/day` : '—',
              )}
              {renderStatRow(
                'All-time avg',
                allTime !== null ? `${allTime.toFixed(2)} s/day` : '—',
              )}
            </View>

            {/* Chart */}
            <View style={styles.chartWrapper}>
              <DriftChart entries={entries} width={width - 32} height={200} />
            </View>

            <Text style={styles.listHeader}>Measurements</Text>
          </View>
        }
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.entryRow}
            onPress={() =>
              navigation.navigate('AddEditMeasurement', {
                watchId,
                measurementId: item.measurement.id,
              })
            }
            accessibilityLabel={`Edit measurement from ${formatTimestamp(item.measurement.timestamp)}`}
            accessibilityRole="button">
            <View style={styles.entryLeft}>
              <Text style={styles.entryDate}>
                {formatTimestamp(item.measurement.timestamp)}
              </Text>
              <Text style={styles.entryDeviation}>
                {item.measurement.deviationSeconds >= 0 ? '+' : ''}
                {item.measurement.deviationSeconds}s
              </Text>
              {item.measurement.note ? (
                <Text style={styles.entryNote}>{item.measurement.note}</Text>
              ) : null}
            </View>
            <Text style={styles.entryDrift}>
              {item.driftPerDay !== null ? `${item.driftPerDay.toFixed(2)} s/day` : '—'}
            </Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.emptyText} accessibilityLabel="No measurements yet">
            No measurements yet.
          </Text>
        }
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate('AddEditMeasurement', {watchId, measurementId: undefined})
        }
        accessibilityLabel="Add a new measurement"
        accessibilityRole="button">
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: colors.background},
    errorText: {color: colors.danger, fontSize: 16, padding: 16},
    section: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 10,
      padding: 12,
    },
    sectionTitle: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginTop: 8,
    },
    sectionValue: {color: colors.text, fontSize: 16, marginTop: 2},
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    statLabel: {color: colors.subtext, fontSize: 14},
    statValue: {color: colors.text, fontSize: 14, fontWeight: '600'},
    chartWrapper: {
      marginHorizontal: 16,
      marginTop: 16,
      padding: 8,
      backgroundColor: colors.card,
      borderRadius: 10,
    },
    listHeader: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginHorizontal: 16,
      marginTop: 24,
      marginBottom: 4,
    },
    listContent: {paddingBottom: 100},
    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.card,
    },
    entryLeft: {flex: 1},
    entryDate: {color: colors.text, fontSize: 15},
    entryDeviation: {color: colors.subtext, fontSize: 13, marginTop: 2},
    entryNote: {color: colors.subtext, fontSize: 12, fontStyle: 'italic', marginTop: 2},
    entryDrift: {color: colors.primary, fontSize: 13, fontWeight: '500'},
    separator: {height: 1, backgroundColor: colors.border, marginLeft: 16},
    emptyText: {color: colors.subtext, fontSize: 15, textAlign: 'center', marginTop: 24},
    fab: {
      position: 'absolute',
      right: 24,
      bottom: 32,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: {width: 0, height: 3},
    },
    fabText: {color: '#FFFFFF', fontSize: 28, lineHeight: 32},
  });
}
