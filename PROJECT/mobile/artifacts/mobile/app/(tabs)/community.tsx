'use no memo';

import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SANS, SANS_MED, SANS_REG, useTheme } from '@/constants/theme';
import { getBottomContentPadding } from '@/lib/layout';
import {
  getCommunityRoadmapShares,
  type CommunityRoadmapShare,
} from '@/services/supabaseService';

function displayName(share: CommunityRoadmapShare) {
  return share.profiles?.full_name || 'NexaPath learner';
}

function roleName(share: CommunityRoadmapShare) {
  return share.ai_roadmaps?.job_roles?.title || share.profiles?.title || 'Completed roadmap';
}

export default function CommunityScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [shares, setShares] = useState<CommunityRoadmapShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      setShares(await getCommunityRoadmapShares());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load community roadmaps.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 76 : 18),
            paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.textTertiary }]}>NEXAPATH</Text>
          <Text style={[styles.title, { color: theme.text }]}>Community</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Finished roadmaps shared by other learners.
          </Text>
        </View>

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={theme.accent} size="large" />
            <Text style={[styles.stateText, { color: theme.textSecondary }]}>Loading shared roadmaps...</Text>
          </View>
        ) : error ? (
          <View style={[styles.stateCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            <Feather name="alert-circle" size={22} color={theme.warm} />
            <Text style={[styles.stateTitle, { color: theme.text }]}>Community unavailable</Text>
            <Text style={[styles.stateText, { color: theme.textSecondary }]}>{error}</Text>
            <Pressable style={[styles.retryButton, { backgroundColor: theme.accent }]} onPress={() => load()}>
              <Text style={[styles.retryText, { color: theme.textOnAccent }]}>Try again</Text>
            </Pressable>
          </View>
        ) : shares.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            <Feather name="users" size={24} color={theme.accent} />
            <Text style={[styles.stateTitle, { color: theme.text }]}>No shared roadmaps yet</Text>
            <Text style={[styles.stateText, { color: theme.textSecondary }]}>
              Complete your roadmap, then share it from the Roadmap tab.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {shares.map((share) => (
              <View key={share.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: theme.accent + '18', borderColor: theme.accent + '35' }]}>
                    <Feather name="check-circle" size={18} color={theme.accent} />
                  </View>
                  <View style={styles.cardTitleWrap}>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{share.title}</Text>
                    <Text style={[styles.cardMeta, { color: theme.textTertiary }]} numberOfLines={1}>
                      {displayName(share)} · {roleName(share)}
                    </Text>
                  </View>
                </View>
                {share.summary ? (
                  <Text style={[styles.summary, { color: theme.textSecondary }]} numberOfLines={3}>
                    {share.summary}
                  </Text>
                ) : null}
                <View style={styles.footer}>
                  <View style={[styles.badge, { backgroundColor: theme.primary + '16', borderColor: theme.primary + '35' }]}>
                    <Text style={[styles.badgeText, { color: theme.primary }]}>
                      {share.completed_steps}/{share.total_steps} steps
                    </Text>
                  </View>
                  <Text style={[styles.date, { color: theme.textTertiary }]}>
                    {new Date(share.shared_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: { marginBottom: 18 },
  eyebrow: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 1.6, marginBottom: 6 },
  title: { fontFamily: SANS, fontSize: 32, letterSpacing: 0, marginBottom: 8 },
  subtitle: { fontFamily: SANS_REG, fontSize: 14, lineHeight: 21 },
  list: { gap: 12 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontFamily: SANS, fontSize: 16, lineHeight: 22 },
  cardMeta: { fontFamily: SANS_REG, fontSize: 12, marginTop: 3 },
  summary: { fontFamily: SANS_REG, fontSize: 13, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: SANS_MED, fontSize: 11 },
  date: { fontFamily: SANS_REG, fontSize: 11 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  stateCard: { borderWidth: 1, borderRadius: 18, padding: 20, alignItems: 'center', gap: 12 },
  stateTitle: { fontFamily: SANS, fontSize: 18 },
  stateText: { fontFamily: SANS_REG, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  retryButton: { minHeight: 44, borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontFamily: SANS, fontSize: 14 },
});
