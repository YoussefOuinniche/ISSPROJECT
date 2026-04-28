import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getTrending } from '../services/api';
import SkeletonCard from '../components/SkeletonCard';
import Colors from '../constants/colors';

const REFRESH_MS = 10 * 60 * 1000;
const SKELETON_COUNT = Array.from({ length: 4 }, (_, i) => i);

export default function TrendingScreen() {
  const [region, setRegion] = useState('global');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const load = useCallback(async (r) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTrending(r);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(region);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => load(region), REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [region, load]);

  const roles = data?.trending_roles ?? [];
  const skills = data?.trending_skills ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trending</Text>
        <View style={styles.toggle}>
          {(['global', 'tn']).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.toggleBtn, region === r && styles.toggleBtnActive]}
              onPress={() => setRegion(r)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  region === r && styles.toggleTextActive,
                ]}
              >
                {r === 'global' ? 'Global' : 'Tunisia'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText} numberOfLines={1}>{error}</Text>
          <TouchableOpacity onPress={() => load(region)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trending Roles</Text>
        {loading ? (
          SKELETON_COUNT.map((i) => <SkeletonCard key={i} />)
        ) : roles.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="trending-up" size={32} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No trending roles available.</Text>
          </View>
        ) : (
          roles.map((role, i) => (
            <View key={i} style={styles.roleRow}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{i + 1}</Text>
              </View>
              <Text style={styles.roleName} numberOfLines={1}>
                {role.title ?? role.name}
              </Text>
              {role.growth_pct != null ? (
                <View style={styles.growthBadge}>
                  <Text style={styles.growthText}>+{role.growth_pct}%</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trending Skills</Text>
        {loading ? (
          <View style={styles.tagCloud}>
            {SKELETON_COUNT.map((i) => (
              <View
                key={i}
                style={[
                  styles.skillSkeleton,
                  { width: 60 + (i % 3) * 28 },
                ]}
              />
            ))}
          </View>
        ) : skills.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="tag" size={32} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No trending skills available.</Text>
          </View>
        ) : (
          <View style={styles.tagCloud}>
            {skills.map((skill, i) => {
              const name = typeof skill === 'string' ? skill : skill.name;
              const pct = typeof skill === 'object' ? skill.growth_pct : null;
              const isTop = i < 3;
              return (
                <View
                  key={i}
                  style={[styles.skillChip, isTop && styles.skillChipTop]}
                >
                  <Text
                    style={[
                      styles.skillChipText,
                      isTop && styles.skillChipTopText,
                    ]}
                  >
                    {name}
                  </Text>
                  {pct != null ? (
                    <Text style={styles.skillGrowth}>+{pct}%</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background3,
    borderRadius: 20,
    padding: 3,
  },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 17 },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  toggleTextActive: { color: Colors.primary, fontWeight: '700' },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  roleName: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  growthBadge: {
    backgroundColor: Colors.successLight,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  growthText: { fontSize: 12, fontWeight: '600', color: Colors.success },
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skillChipTop: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent,
  },
  skillChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  skillChipTopText: { color: Colors.accent, fontWeight: '600' },
  skillGrowth: { fontSize: 11, color: Colors.success, fontWeight: '600' },
  skillSkeleton: {
    height: 34,
    backgroundColor: Colors.border,
    borderRadius: 20,
  },
  errorBox: {
    margin: 16,
    padding: 12,
    backgroundColor: Colors.dangerLight,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: { fontSize: 13, color: Colors.danger, flex: 1 },
  retryText: { fontSize: 13, fontWeight: '600', color: Colors.danger, marginLeft: 12 },
  emptyBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
});
