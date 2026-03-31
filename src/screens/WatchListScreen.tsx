import React, {useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {useStore} from '../store';
import {useTheme} from '../components/ThemeContext';
import {latestDriftRate, buildDriftEntries} from '../utils/driftCalc';
import type {RootStackParamList} from '../navigation';

type Nav = StackNavigationProp<RootStackParamList, 'WatchList'>;

export default function WatchListScreen() {
  const navigation = useNavigation<Nav>();
  const {colors} = useTheme();
  const {watches, measurements, hydrated, hydrate} = useStore();

  useEffect(() => {
    if (!hydrated) {
      hydrate();
    }
  }, [hydrated, hydrate]);

  const getDriftLabel = (watchId: string): string => {
    const forWatch = measurements.filter(m => m.watchId === watchId);
    if (forWatch.length < 2) {
      return forWatch.length === 1 ? `${forWatch[0].deviationSeconds}s (1 entry)` : 'No entries';
    }
    const entries = buildDriftEntries(forWatch);
    const rate = latestDriftRate(entries);
    return rate !== null ? `${rate.toFixed(2)} s/day` : '—';
  };

  const handleAddWatch = () => {
    navigation.navigate('AddWatch');
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={watches}
        keyExtractor={item => item.id}
        contentContainerStyle={watches.length === 0 ? styles.empty : undefined}
        ListEmptyComponent={
          <Text style={styles.emptyText} accessibilityLabel="No watches added yet">
            No watches yet. Add one to get started.
          </Text>
        }
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('WatchDetail', {watchId: item.id})}
            accessibilityLabel={`Open ${item.name}`}
            accessibilityRole="button">
            <View style={styles.rowLeft}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.movementType}</Text>
            </View>
            <Text style={styles.drift}>{getDriftLabel(item.id)}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddWatch}
        accessibilityLabel="Add a new watch"
        accessibilityRole="button">
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: colors.background},
    empty: {flex: 1, justifyContent: 'center', alignItems: 'center'},
    emptyText: {color: colors.subtext, fontSize: 16},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.card,
    },
    rowLeft: {flex: 1},
    name: {color: colors.text, fontSize: 17, fontWeight: '600'},
    sub: {color: colors.subtext, fontSize: 13, marginTop: 2},
    drift: {color: colors.primary, fontSize: 14, fontWeight: '500'},
    separator: {height: 1, backgroundColor: colors.border, marginLeft: 16},
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
