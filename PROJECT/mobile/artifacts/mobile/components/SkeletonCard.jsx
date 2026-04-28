import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export default function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.8],
  });

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.line, styles.lineTitle, { opacity }]} />
      <Animated.View style={[styles.line, styles.lineCompany, { opacity }]} />
      <View style={styles.tagRow}>
        <Animated.View style={[styles.chip, { opacity }]} />
        <Animated.View style={[styles.chip, styles.chipMed, { opacity }]} />
        <Animated.View style={[styles.chip, styles.chipShort, { opacity }]} />
      </View>
      <Animated.View style={[styles.line, styles.lineMeta, { opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  line: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 10,
  },
  lineTitle: { height: 18, width: '68%' },
  lineCompany: { height: 14, width: '42%' },
  lineMeta: { height: 12, width: '28%', marginBottom: 0 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  chip: { backgroundColor: '#E5E7EB', borderRadius: 20, height: 24, width: 72 },
  chipMed: { width: 56 },
  chipShort: { width: 64 },
});
