import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '../constants/colors';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

export default function JobCard({ job, onPress, onSave, isSaved }) {
  const topTags = (job.tags || []).slice(0, 3);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>
            {job.title}
          </Text>
          <Text style={styles.company} numberOfLines={1}>
            {job.company}
          </Text>
        </View>
        <Pressable onPress={onSave} hitSlop={10} style={styles.saveBtn}>
          <Feather
            name="bookmark"
            size={20}
            color={isSaved ? Colors.primary : Colors.textTertiary}
            style={isSaved ? styles.savedFill : undefined}
          />
        </Pressable>
      </View>

      {job.location ? (
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={12} color={Colors.textTertiary} />
          <Text style={styles.metaText}>{job.location}</Text>
        </View>
      ) : null}

      <View style={styles.tagRow}>
        {job.is_remote && (
          <View style={[styles.badge, styles.remoteBadge]}>
            <Text style={styles.remoteBadgeText}>Remote</Text>
          </View>
        )}
        {job.is_trending && (
          <View style={[styles.badge, styles.trendingBadge]}>
            <Text style={styles.trendingBadgeText}>Trending</Text>
          </View>
        )}
        {topTags.map((tag, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.date}>{timeAgo(job.date_posted)}</Text>
    </Pressable>
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
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardPressed: { opacity: 0.88 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleBlock: { flex: 1, marginRight: 8 },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
    lineHeight: 22,
  },
  company: { fontSize: 13, color: Colors.textSecondary },
  saveBtn: { paddingTop: 2 },
  savedFill: { opacity: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  remoteBadge: { backgroundColor: Colors.accentLight },
  remoteBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.accent },
  trendingBadge: { backgroundColor: Colors.warningLight },
  trendingBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.warning },
  tag: {
    backgroundColor: Colors.background3,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, color: Colors.textSecondary },
  date: { fontSize: 11, color: Colors.textTertiary },
});
