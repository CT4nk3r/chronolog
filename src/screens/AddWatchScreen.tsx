import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useStore} from '../store';
import {useTheme} from '../components/ThemeContext';

export default function AddWatchScreen() {
  const navigation = useNavigation();
  const {addWatch} = useStore();
  const {colors} = useTheme();

  const [name, setName] = useState('');
  const [movementType, setMovementType] = useState('');
  const [targetAccuracy, setTargetAccuracy] = useState('10');

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Validation', 'Watch name is required.');
      return;
    }
    const accuracy = parseFloat(targetAccuracy);
    if (isNaN(accuracy) || accuracy < 0) {
      Alert.alert('Validation', 'Target accuracy must be a positive number.');
      return;
    }
    addWatch(trimmedName, movementType.trim(), accuracy);
    navigation.goBack();
  };

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Watch name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Seiko SKX007"
        placeholderTextColor={colors.subtext}
        accessibilityLabel="Watch name"
        returnKeyType="next"
      />

      <Text style={styles.label}>Movement type</Text>
      <TextInput
        style={styles.input}
        value={movementType}
        onChangeText={setMovementType}
        placeholder="e.g. NH35"
        placeholderTextColor={colors.subtext}
        accessibilityLabel="Movement type"
        returnKeyType="next"
      />

      <Text style={styles.label}>Target accuracy (s/day) *</Text>
      <TextInput
        style={styles.input}
        value={targetAccuracy}
        onChangeText={setTargetAccuracy}
        placeholder="10"
        placeholderTextColor={colors.subtext}
        keyboardType="decimal-pad"
        accessibilityLabel="Target accuracy in seconds per day"
        returnKeyType="done"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        accessibilityLabel="Save watch"
        accessibilityRole="button">
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {flex: 1, backgroundColor: colors.background},
    content: {padding: 16},
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
