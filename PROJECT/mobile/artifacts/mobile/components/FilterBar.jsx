import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Colors from '../constants/colors';

const COUNTRIES = [
  { label: 'Global', value: 'global' },
  { label: 'Tunisia', value: 'tn' },
];

export default function FilterBar({ filters, onFilterChange }) {
  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {COUNTRIES.map((c) => {
          const active = filters.country === c.value;
          return (
            <TouchableOpacity
              key={c.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onFilterChange({ country: c.value })}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.remoteRow}>
        <Text style={styles.remoteLabel}>Remote only</Text>
        <Switch
          value={!!filters.remote}
          onValueChange={(val) => onFilterChange({ remote: val })}
          trackColor={{ false: Colors.border, true: Colors.accent }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={Colors.border}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  chips: { flexDirection: 'row', gap: 8, flex: 1 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.background3,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.accent, fontWeight: '600' },
  remoteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remoteLabel: { fontSize: 12, color: Colors.textSecondary },
});
