import React, { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getJobById } from '../services/api';
import { isFavorite, removeFavorite, saveFavorite } from '../utils/favorites';
import Colors from '../constants/colors';

export default function JobDetailScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, fav] = await Promise.all([
          getJobById(jobId),
          isFavorite(jobId),
        ]);
        if (!cancelled) {
          setJob(data);
          setSaved(fav);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [jobId]);

  const handleSave = useCallback(async () => {
    if (!job) return;
    if (saved) {
      await removeFavorite(job.id);
      setSaved(false);
    } else {
      await saveFavorite(job);
      setSaved(true);
    }
  }, [job, saved]);

  const handleOpenURL = useCallback(() => {
    if (job?.source_url) Linking.openURL(job.source_url);
  }, [job]);

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingSpinner} />
        <Text style={styles.loadingText}>Loading job...</Text>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={40} color={Colors.danger} />
        <Text style={styles.errorMsg}>{error ?? 'Job not found'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const skills = job.ai_tags?.skills ?? [];
  const seniority = job.ai_tags?.seniority;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backRow}
      >
        <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.company}>{job.company}</Text>

        <View style={styles.infoGroup}>
          {job.location ? (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{job.location}</Text>
            </View>
          ) : null}

          {job.salary_range ? (
            <View style={styles.infoRow}>
              <Feather name="dollar-sign" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{job.salary_range}</Text>
            </View>
          ) : null}

          {job.date_posted ? (
            <View style={styles.infoRow}>
              <Feather name="calendar" size={14} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                {new Date(job.date_posted).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.badgeRow}>
          {seniority ? (
            <View style={styles.seniorityBadge}>
              <Text style={styles.seniorityText}>{seniority}</Text>
            </View>
          ) : null}
          <View
            style={[
              styles.remoteBadge,
              job.is_remote ? styles.remoteOn : styles.remoteOff,
            ]}
          >
            <Text
              style={[
                styles.remoteText,
                job.is_remote ? styles.remoteOnText : styles.remoteOffText,
              ]}
            >
              {job.is_remote ? 'Remote' : 'On-site'}
            </Text>
          </View>
        </View>

        {(job.tags ?? []).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tags</Text>
            <View style={styles.tagRow}>
              {job.tags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Required Skills</Text>
            <View style={styles.tagRow}>
              {skills.map((skill, i) => (
                <View key={i} style={styles.skillTag}>
                  <Text style={styles.skillTagText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {job.ai_summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>AI Summary</Text>
            <Text style={styles.summary}>{job.ai_summary}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, saved ? styles.btnSaved : styles.btnSave]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Feather
            name="bookmark"
            size={18}
            color={saved ? Colors.accent : '#FFFFFF'}
          />
          <Text style={[styles.actionBtnText, saved && styles.btnSavedText]}>
            {saved ? 'Saved' : 'Save Job'}
          </Text>
        </TouchableOpacity>

        {job.source_url ? (
          <TouchableOpacity
            style={styles.btnView}
            onPress={handleOpenURL}
            activeOpacity={0.8}
          >
            <Feather name="external-link" size={18} color={Colors.accent} />
            <Text style={styles.btnViewText}>View Original</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  loadingSpinner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: Colors.primary,
    borderTopColor: 'transparent',
  },
  loadingText: { fontSize: 15, color: Colors.textSecondary },
  errorMsg: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  backLink: { fontSize: 14, color: Colors.accent, fontWeight: '600' },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingTop: 8,
  },
  backText: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
    lineHeight: 30,
  },
  company: { fontSize: 16, color: Colors.textSecondary, marginBottom: 16 },
  infoGroup: { gap: 8, marginBottom: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 14, color: Colors.textSecondary },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  seniorityBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  seniorityText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  remoteBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  remoteOn: { backgroundColor: Colors.accentLight },
  remoteOff: { backgroundColor: Colors.background3 },
  remoteText: { fontSize: 12, fontWeight: '600' },
  remoteOnText: { color: Colors.accent },
  remoteOffText: { color: Colors.textSecondary },
  section: { marginTop: 18 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textTertiary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: Colors.background3,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontSize: 12, color: Colors.textSecondary },
  skillTag: {
    backgroundColor: Colors.accentLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  skillTagText: { fontSize: 12, color: Colors.accent, fontWeight: '500' },
  summary: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  actions: { gap: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  btnSave: { backgroundColor: Colors.primary },
  btnSaved: {
    backgroundColor: Colors.accentLight,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  actionBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  btnSavedText: { color: Colors.accent },
  btnView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  btnViewText: { fontSize: 16, fontWeight: '600', color: Colors.accent },
});
