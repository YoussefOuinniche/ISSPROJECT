'use no memo';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SANS, SANS_MED, SANS_REG, useTheme } from '@/constants/theme';
import { getBottomContentPadding } from '@/lib/layout';
import {
  ensureStepResources,
  fetchProfileId,
  getRoadmapWithSteps,
  shareCompletedRoadmap,
  updateRoadmapStepStatus,
  type RoadmapStep,
  type RoadmapWithSteps,
  type StepResource,
  type StepResourceProvider,
} from '@/services/supabaseService';

function statusColor(status: RoadmapStep['status'], theme: ReturnType<typeof useTheme>) {
  return {
    locked: theme.textTertiary,
    available: theme.accent,
    in_progress: theme.warm,
    completed: theme.primary,
    skipped: theme.textTertiary,
  }[status] ?? theme.textTertiary;
}

function statusIcon(status: RoadmapStep['status']): React.ComponentProps<typeof Feather>['name'] {
  return ({
    locked: 'lock',
    available: 'play-circle',
    in_progress: 'loader',
    completed: 'check-circle',
    skipped: 'skip-forward',
  } as const)[status] ?? 'circle';
}

function statusLabel(status: RoadmapStep['status']) {
  return ({
    locked: 'Locked',
    available: 'Available',
    in_progress: 'In Progress',
    completed: 'Completed',
    skipped: 'Skipped',
  } as const)[status] ?? 'Pending';
}

function formatHours(hours: number | null) {
  if (!hours) return '';
  return hours < 1 ? `${Math.round(hours * 60)}min` : `${hours}h`;
}

function parseDescription(description: string | null) {
  if (!description) return { body: '', why: '' };
  const [body, why] = description.split('\n\nWhy needed: ');
  return { body: body?.trim() ?? '', why: why?.trim() ?? '' };
}

const PROVIDER_META: Record<StepResourceProvider, { label: string; color: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  coursera: { label: 'Coursera', color: '#0056d2', icon: 'book-open' },
  udemy: { label: 'Udemy', color: '#a435f0', icon: 'monitor' },
  youtube: { label: 'YouTube', color: '#ff0000', icon: 'play-circle' },
  edx: { label: 'edX', color: '#022b3a', icon: 'book' },
  other: { label: 'Resource', color: '#64748b', icon: 'link' },
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

function LoadingView({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.centered, { backgroundColor: theme.bg }]}>
      <ActivityIndicator color={theme.accent} size="large" />
      <Text style={[styles.stateText, { color: theme.textSecondary }]}>Loading your roadmap...</Text>
    </View>
  );
}

function ErrorView({
  message,
  onRetry,
  theme,
}: {
  message: string;
  onRetry: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.centered, { backgroundColor: theme.bg, paddingHorizontal: 24 }]}>
      <View style={[styles.stateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Feather name="alert-triangle" size={28} color={theme.warm} />
        <Text style={[styles.stateHeading, { color: theme.text }]}>Something went wrong</Text>
        <Text style={[styles.stateText, { color: theme.textSecondary, textAlign: 'center' }]}>{message}</Text>
        <Pressable style={[styles.primaryButton, { backgroundColor: theme.accent }]} onPress={onRetry}>
          <Text style={[styles.primaryButtonText, { color: theme.textOnAccent }]}>Try again</Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyView({ theme, insetTop }: { theme: ReturnType<typeof useTheme>; insetTop: number }) {
  return (
    <View style={[styles.screen, { backgroundColor: theme.bg, paddingTop: insetTop + (Platform.OS === 'web' ? 67 : 12) }]}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: theme.textTertiary }]}>NEXAPATH</Text>
        <Text style={[styles.title, { color: theme.text }]}>Learning Roadmap</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Build a weekly plan from your profile and skill goals.
        </Text>
      </View>
      <View style={[styles.stateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.warmLight }]}>
          <Feather name="map" size={24} color={theme.warm} />
        </View>
        <Text style={[styles.stateHeading, { color: theme.text }]}>No roadmap yet</Text>
        <Text style={[styles.stateText, { color: theme.textSecondary, textAlign: 'center' }]}>
          Run the assessment and NexaPath will generate your first learning plan.
        </Text>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/ai-assistant')}
        >
          <Text style={[styles.primaryButtonText, { color: theme.textOnAccent }]}>Create my plan</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ResourceGrid({ resources }: { resources: StepResource[] }) {
  if (!resources.length) return null;

  return (
    <View style={styles.resourceWrap}>
      <Text style={styles.sectionLabel}>Learn On</Text>
      {resources.map((resource, index) => {
        const meta = PROVIDER_META[resource.provider] ?? PROVIDER_META.other;
        return (
          <Pressable
            key={`${resource.provider}-${index}`}
            style={[styles.resourceCard, { borderColor: `${meta.color}44`, backgroundColor: `${meta.color}12` }]}
            onPress={() => Linking.openURL(resource.url).catch(() => null)}
          >
            <View style={styles.resourceTop}>
              <Feather name={meta.icon} size={14} color={meta.color} />
              <Text style={[styles.resourceProvider, { color: meta.color }]}>{meta.label}</Text>
              {resource.free ? <Text style={styles.freeBadge}>Free</Text> : null}
            </View>
            <Text style={styles.resourceTitle} numberOfLines={2}>{resource.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StepCard({
  step,
  index,
  total,
  active,
  theme,
  onSelect,
}: {
  step: RoadmapStep;
  index: number;
  total: number;
  active: boolean;
  theme: ReturnType<typeof useTheme>;
  onSelect: () => void;
}) {
  const color = statusColor(step.status, theme);

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.stepCard,
        {
          backgroundColor: theme.surface,
          borderColor: active ? color : theme.border,
        },
      ]}
    >
      <View style={[styles.stepNumber, { borderColor: `${color}66`, backgroundColor: `${color}18` }]}>
        <Text style={[styles.stepNumberText, { color }]}>
          {step.status === 'completed' ? '✓' : String(index + 1).padStart(2, '0')}
        </Text>
      </View>
      <View style={styles.stepCardBody}>
        <Text style={[styles.stepTitle, { color: theme.text }]} numberOfLines={2}>{step.title}</Text>
        <View style={styles.stepMeta}>
          <Feather name={statusIcon(step.status)} size={12} color={color} />
          <Text style={[styles.stepStatus, { color }]}>{statusLabel(step.status)}</Text>
          {step.duration_hours ? <Text style={[styles.stepDuration, { color: theme.textTertiary }]}>• {formatHours(step.duration_hours)}</Text> : null}
        </View>
      </View>
      <Text style={[styles.stepCount, { color: theme.textTertiary }]}>{index + 1}/{total}</Text>
    </Pressable>
  );
}

function StepDetail({
  step,
  index,
  total,
  theme,
  onStart,
  onComplete,
}: {
  step: RoadmapStep;
  index: number;
  total: number;
  theme: ReturnType<typeof useTheme>;
  onStart: () => void;
  onComplete: () => void;
}) {
  const color = statusColor(step.status, theme);
  const { body, why } = parseDescription(step.description);
  const resources = ensureStepResources(step);
  const canStart = step.status === 'available';
  const canComplete = step.status === 'available' || step.status === 'in_progress';

  return (
    <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.detailHeader}>
        <View style={[styles.detailIcon, { backgroundColor: `${color}18` }]}>
          <Feather name={statusIcon(step.status)} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.detailKicker, { color }]}>Step {index + 1} of {total}</Text>
          <Text style={[styles.detailTitle, { color: theme.text }]}>{step.title}</Text>
        </View>
      </View>

      {body ? <Text style={[styles.detailBody, { color: theme.textSecondary }]}>{body}</Text> : null}
      {why ? (
        <View style={[styles.whyBox, { borderLeftColor: color, backgroundColor: theme.bg2 }]}>
          <Text style={[styles.whyLabel, { color }]}>Why it matters</Text>
          <Text style={[styles.whyText, { color: theme.textSecondary }]}>{why}</Text>
        </View>
      ) : null}

      {step.skills?.name ? (
        <View style={[styles.skillChip, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}>
          <Feather name="layers" size={12} color={color} />
          <Text style={[styles.skillChipText, { color }]}>{step.skills.name}</Text>
        </View>
      ) : null}

      <ResourceGrid resources={resources} />

      <View style={styles.actions}>
        {canStart ? (
          <Pressable style={[styles.actionButton, { backgroundColor: theme.accent }]} onPress={onStart}>
            <Feather name="play" size={16} color={theme.textOnAccent} />
            <Text style={[styles.actionButtonText, { color: theme.textOnAccent }]}>Start</Text>
          </Pressable>
        ) : null}
        {canComplete ? (
          <Pressable style={[styles.actionButton, { backgroundColor: '#22c55e' }]} onPress={onComplete}>
            <Feather name="check-circle" size={16} color="#fff" />
            <Text style={[styles.actionButtonText, { color: '#fff' }]}>Complete</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function RoadmapScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [roadmap, setRoadmap] = useState<RoadmapWithSteps | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'shared' | 'error'>('idle');
  const [shareError, setShareError] = useState<string | null>(null);

  const loadRoadmap = useCallback(async (opts: { silent?: boolean } = {}) => {
    try {
      if (!opts.silent) setError(null);
      let pid = profileId;
      if (!pid) {
        pid = await fetchProfileId();
        setProfileId(pid);
      }
      if (!pid) {
        if (!opts.silent) setError('Profile not found. Please log in again.');
        return;
      }
      const nextRoadmap = await getRoadmapWithSteps(pid);
      setRoadmap(nextRoadmap);
      if (nextRoadmap && !opts.silent) {
        const nextIndex = nextRoadmap.steps.findIndex(step => step.status !== 'completed');
        setSelectedIndex(nextIndex >= 0 ? nextIndex : Math.max(0, nextRoadmap.steps.length - 1));
      }
    } catch (err) {
      if (!opts.silent) setError(err instanceof Error ? err.message : 'Failed to load roadmap');
    } finally {
      setInitialLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap]);

  async function handleStatusChange(stepId: string, status: RoadmapStep['status']) {
    setRoadmap(prev => {
      if (!prev) return prev;
      const nowIso = new Date().toISOString();
      return {
        ...prev,
        steps: prev.steps.map(step =>
          step.id === stepId
            ? { ...step, status, completed_at: status === 'completed' ? nowIso : step.completed_at }
            : step,
        ),
      };
    });

    try {
      await updateRoadmapStepStatus(stepId, status);
    } catch {
      loadRoadmap({ silent: true });
    }
  }

  if (initialLoading && !roadmap) return <LoadingView theme={theme} />;
  if (error && !roadmap) return <ErrorView message={error} onRetry={loadRoadmap} theme={theme} />;
  if (!roadmap) return <EmptyView theme={theme} insetTop={insets.top} />;

  const steps = roadmap.steps;
  const totalSteps = steps.length;
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progress = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const activeStep = steps[selectedIndex] ?? steps[0] ?? null;
  const isComplete = totalSteps > 0 && completedSteps === totalSteps;

  async function handleShareRoadmap() {
    if (!roadmap || shareState === 'sharing') return;
    setShareState('sharing');
    setShareError(null);

    const completedTitles = roadmap.steps
      .filter((s) => s.status === 'completed')
      .map((s) => `• ${s.title}`)
      .join('\n');
    const shareBody =
      `${roadmap.title}\n` +
      `${completedSteps}/${totalSteps} steps complete (${progress}%)\n\n` +
      (completedTitles ? `Completed:\n${completedTitles}\n\n` : '') +
      `Built with NexaPath.`;

    let communityOk = false;
    if (isComplete) {
      try {
        await shareCompletedRoadmap(roadmap);
        communityOk = true;
      } catch (err) {
        setShareError(err instanceof Error ? err.message : 'Community share unavailable');
      }
    }

    try {
      await Share.share({
        message: shareBody,
        title: `${roadmap.title} · NexaPath roadmap`,
      });
      setShareState(communityOk ? 'shared' : 'idle');
    } catch (err) {
      if (communityOk) {
        setShareState('shared');
      } else {
        setShareState('error');
        setShareError(err instanceof Error ? err.message : 'Could not share');
      }
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <LinearGradient
        colors={theme.isDark ? ['#071225', '#0d1b2f'] : ['#eef4ff', '#f8fbff']}
        style={[styles.hero, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12) }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: theme.textTertiary }]}>NEXAPATH</Text>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>{roadmap.title}</Text>
            {roadmap.job_roles?.title ? (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {roadmap.job_roles.title}
              </Text>
            ) : null}
          </View>
          <View style={[styles.progressBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.progressPercent, { color: theme.text }]}>{progress}%</Text>
            <Text style={[styles.progressLabel, { color: theme.textTertiary }]}>{completedSteps}/{totalSteps}</Text>
          </View>
        </View>
        <ProgressBar value={progress} color={theme.primary} />
        <Pressable
          style={[styles.shareButton, { backgroundColor: theme.accent }]}
          onPress={handleShareRoadmap}
          disabled={shareState === 'sharing'}
        >
          <Feather name={shareState === 'shared' ? 'check-circle' : 'share-2'} size={15} color={theme.textOnAccent} />
          <Text style={[styles.shareButtonText, { color: theme.textOnAccent }]}>
            {shareState === 'sharing'
              ? 'Sharing...'
              : shareState === 'shared'
                ? 'Shared to Community'
                : isComplete ? 'Share to Community' : 'Share Progress'}
          </Text>
        </Pressable>
        {isComplete ? (
          <Pressable
            style={[styles.shareButton, styles.nextRoadmapBtn]}
            onPress={() => router.push('/ai-assistant')}
          >
            <Feather name="plus-circle" size={15} color="#FFFFFF" />
            <Text style={[styles.shareButtonText, { color: '#FFFFFF' }]} numberOfLines={1}>Generate your next roadmap</Text>
          </Pressable>
        ) : null}
        {shareError ? (
          <Text style={[styles.shareError, { color: theme.warm }]} numberOfLines={2}>{shareError}</Text>
        ) : null}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getBottomContentPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeStep ? (
          <StepDetail
            step={activeStep}
            index={selectedIndex}
            total={totalSteps}
            theme={theme}
            onStart={() => handleStatusChange(activeStep.id, 'in_progress')}
            onComplete={() => {
              handleStatusChange(activeStep.id, 'completed');
              setSelectedIndex(index => Math.min(totalSteps - 1, index + 1));
            }}
          />
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.text }]}>All Steps</Text>
        {steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            total={totalSteps}
            active={index === selectedIndex}
            theme={theme}
            onSelect={() => setSelectedIndex(index)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 18,
  },
  eyebrow: {
    fontFamily: SANS_MED,
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: SANS,
    fontSize: 29,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: SANS_REG,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  progressBadge: {
    minWidth: 78,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  progressPercent: {
    fontFamily: SANS,
    fontSize: 20,
  },
  progressLabel: {
    fontFamily: SANS_MED,
    fontSize: 11,
    marginTop: 2,
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(120,140,170,0.22)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 7,
    borderRadius: 999,
  },
  shareButton: {
    minHeight: 44,
    borderRadius: 14,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
  },
  nextRoadmapBtn: {
    backgroundColor: '#16A34A',
  },
  shareButtonText: {
    fontFamily: SANS,
    fontSize: 14,
  },
  shareError: {
    fontFamily: SANS_REG,
    fontSize: 12,
    marginTop: 8,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    gap: 12,
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    marginHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateHeading: {
    fontFamily: SANS,
    fontSize: 19,
  },
  stateText: {
    fontFamily: SANS_REG,
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 13,
    marginTop: 4,
  },
  primaryButtonText: {
    fontFamily: SANS,
    fontSize: 14,
  },
  detailCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailKicker: {
    fontFamily: SANS_MED,
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailTitle: {
    fontFamily: SANS,
    fontSize: 19,
    lineHeight: 25,
  },
  detailBody: {
    fontFamily: SANS_REG,
    fontSize: 14,
    lineHeight: 22,
  },
  whyBox: {
    borderLeftWidth: 3,
    borderRadius: 14,
    padding: 14,
  },
  whyLabel: {
    fontFamily: SANS_MED,
    fontSize: 11,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  whyText: {
    fontFamily: SANS_REG,
    fontSize: 13,
    lineHeight: 20,
  },
  skillChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  skillChipText: {
    fontFamily: SANS_MED,
    fontSize: 12,
  },
  resourceWrap: {
    gap: 9,
  },
  sectionLabel: {
    fontFamily: SANS_MED,
    fontSize: 11,
    color: '#8ca3c7',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resourceCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  resourceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  resourceProvider: {
    fontFamily: SANS,
    fontSize: 12,
    flex: 1,
  },
  freeBadge: {
    fontFamily: SANS,
    fontSize: 10,
    color: '#16a34a',
    textTransform: 'uppercase',
  },
  resourceTitle: {
    fontFamily: SANS_REG,
    fontSize: 13,
    lineHeight: 18,
    color: '#d7e4f7',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonText: {
    fontFamily: SANS,
    fontSize: 14,
  },
  sectionTitle: {
    fontFamily: SANS,
    fontSize: 18,
    marginTop: 10,
    marginBottom: 2,
  },
  stepCard: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: SANS,
    fontSize: 12,
  },
  stepCardBody: {
    flex: 1,
    gap: 6,
  },
  stepTitle: {
    fontFamily: SANS,
    fontSize: 14,
    lineHeight: 19,
  },
  stepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepStatus: {
    fontFamily: SANS_MED,
    fontSize: 12,
  },
  stepDuration: {
    fontFamily: SANS_REG,
    fontSize: 12,
  },
  stepCount: {
    fontFamily: SANS_MED,
    fontSize: 11,
  },
});
