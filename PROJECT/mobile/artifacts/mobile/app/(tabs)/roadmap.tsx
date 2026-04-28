'use no memo';
/**
 * Roadmap screen — full-screen procedural 3D mountain.
 * The mountain renders edge-to-edge with transparent overlays:
 *   • Top bar  — title, role badge, compact progress
 *   • Bottom panel (BlurView) — current checkpoint details + action buttons
 *   • Progress dots strip — one dot per step
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Path, Rect, Stop } from 'react-native-svg';

import { useTheme, SERIF, SANS, SANS_MED, SANS_REG } from '@/constants/theme';
import {
  ProceduralMountain3D,
  type CheckpointDef,
} from '@/components/roadmap/ProceduralMountain3D';
import {
  fetchProfileId,
  getRoadmapWithSteps,
  updateRoadmapStepStatus,
  type RoadmapWithSteps,
  type RoadmapStep,
} from '@/services/supabaseService';
import { getBottomContentPadding } from '@/lib/layout';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Tiny SVG mountain for loading / empty states ─────────────────────────────
function MiniMountain({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const W = SW - 80, H = 120;
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <SvgGrad id="skyG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.sky1} />
          <Stop offset="1" stopColor={theme.sky2} />
        </SvgGrad>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill="url(#skyG)" />
      <Path
        d={`M0,${H} L${W*0.15},${H*0.45} L${W*0.32},${H*0.60} L${W*0.50},${H*0.18} L${W*0.68},${H*0.55} L${W*0.85},${H*0.38} L${W},${H*0.52} L${W},${H} Z`}
        fill={theme.mtn1}
      />
      <Path
        d={`M0,${H} L${W*0.22},${H*0.70} L${W*0.42},${H*0.78} L${W*0.60},${H*0.58} L${W*0.80},${H*0.72} L${W},${H*0.62} L${W},${H} Z`}
        fill={theme.mtn2}
      />
      <Circle cx={W*0.50} cy={H*0.15} r={3.5} fill={theme.warm} opacity={0.9} />
      <Path
        d={`M${W*0.22},${H*0.90} C${W*0.38},${H*0.65} ${W*0.46},${H*0.42} ${W*0.50},${H*0.18}`}
        stroke={theme.pathColor} strokeWidth={1.5} strokeDasharray="4,5"
        fill="none" strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Step status helpers ──────────────────────────────────────────────────────
function statusColor(status: RoadmapStep['status'], theme: ReturnType<typeof useTheme>) {
  return {
    locked:      theme.textTertiary,
    available:   theme.accent,
    in_progress: theme.warm,
    completed:   theme.primary,
    skipped:     theme.textTertiary,
  }[status] ?? theme.textTertiary;
}

function statusIcon(status: RoadmapStep['status']): React.ComponentProps<typeof Feather>['name'] {
  return ({
    locked:      'lock',
    available:   'play-circle',
    in_progress: 'loader',
    completed:   'check-circle',
    skipped:     'skip-forward',
  } as const)[status] ?? 'lock';
}

function formatH(h: number | null) {
  if (!h) return '';
  return h < 1 ? `${Math.round(h * 60)}min` : `${h}h`;
}

function parseDesc(desc: string | null): { body: string; why: string | null } {
  if (!desc) return { body: '', why: null };
  const parts = desc.split('\n\nWhy needed: ');
  return { body: parts[0]?.trim() ?? '', why: parts[1]?.trim() ?? null };
}

// ─── Animated progress bar ────────────────────────────────────────────────────
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(pct, { duration: 900 }); }, [pct]);
  const barStyle = useAnimatedStyle(() => ({ width: `${w.value}%` as any }));
  return (
    <View style={pb.track}>
      <Reanimated.View style={[pb.fill, { backgroundColor: color }, barStyle]} />
    </View>
  );
}
const pb = StyleSheet.create({
  track: { height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.20)' },
  fill:  { height: 3, borderRadius: 2 },
});

// ─── Bottom panel — current checkpoint detail ─────────────────────────────────
function CheckpointPanel({
  step,
  stepIndex,
  totalSteps,
  completedSteps,
  onStart,
  onComplete,
  onPrev,
  onNext,
  theme,
  insetBottom,
}: {
  step: RoadmapStep | null;
  stepIndex: number;
  totalSteps: number;
  completedSteps: number;
  onStart: () => void;
  onComplete: () => void;
  onPrev: () => void;
  onNext: () => void;
  theme: ReturnType<typeof useTheme>;
  insetBottom: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelH = useSharedValue(0);
  const panelStyle = useAnimatedStyle(() => ({ maxHeight: panelH.value }));

  useEffect(() => {
    panelH.value = withSpring(expanded ? 340 : 0, { damping: 18, stiffness: 100 });
  }, [expanded]);

  // Swipe left/right on the non-scroll area to navigate steps
  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.8,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) onNext();
        else if (g.dx > 40) onPrev();
      },
    })
  ).current;

  if (!step) return null;

  const { body, why } = parseDesc(step.description);
  const isCompleted   = step.status === 'completed';
  const isLocked      = step.status === 'locked' || step.status === 'skipped';
  const canStart      = step.status === 'available';
  const canComplete   = step.status === 'in_progress' || step.status === 'available';
  const color         = statusColor(step.status, theme);

  return (
    <View style={styles.panelWrap}>
      <Reanimated.View entering={FadeInUp.delay(300).springify()}>
      <BlurView intensity={85} tint="dark" style={styles.panel}>

        {/* Drag handle — also triggers expand */}
        <Pressable onPress={() => setExpanded(e => !e)} style={styles.handleWrap}>
          <View style={styles.handle} />
        </Pressable>

        {/* Swipeable zone: dots + step header */}
        <View {...swipePan.panHandlers}>
          {/* Step navigation dots */}
          <View style={styles.dotStrip}>
            {Array.from({ length: totalSteps }, (_, i) => {
              const done    = i < completedSteps;
              const current = i === stepIndex;
              const dotColor = done ? '#4ade80' : current ? '#fbbf24' : 'rgba(255,255,255,0.25)';
              return (
                <View
                  key={i}
                  style={[styles.dot, { backgroundColor: dotColor, width: current ? 16 : 6 }]}
                />
              );
            })}
          </View>

          {/* Step header */}
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumBadge, { borderColor: color + '60', backgroundColor: color + '18' }]}>
              <Text style={[styles.stepNum, { color }]}>
                {isCompleted ? '✓' : String(step.step_order).padStart(2, '0')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle} numberOfLines={2}>{step.title}</Text>
              <View style={styles.stepMeta}>
                <Feather name={statusIcon(step.status)} size={11} color={color} />
                <Text style={[styles.stepStatus, { color }]}>
                  {{ locked: 'Locked', available: 'Available', in_progress: 'In Progress',
                     completed: 'Completed', skipped: 'Skipped' }[step.status]}
                </Text>
                {step.duration_hours ? (
                  <Text style={styles.stepDur}>· {formatH(step.duration_hours)}</Text>
                ) : null}
              </View>
            </View>
            <Pressable onPress={() => setExpanded(e => !e)} style={styles.chevronBtn}>
              <Feather name={expanded ? 'chevron-down' : 'chevron-up'} size={18} color="rgba(255,255,255,0.55)" />
            </Pressable>
          </View>

          {/* Prominent complete button — always visible when step is actionable */}
          {canComplete && (
            <Pressable style={styles.completeBtn} onPress={onComplete}>
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.completeBtnGrad}
              >
                <Feather name="check-circle" size={16} color="#fff" />
                <Text style={styles.completeBtnTxt}>Complete this step</Text>
              </LinearGradient>
            </Pressable>
          )}
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Feather name="check-circle" size={14} color="#4ade80" />
              <Text style={styles.completedBadgeTxt}>Step completed</Text>
            </View>
          )}
        </View>

        {/* Expandable details */}
        <Reanimated.View style={[{ overflow: 'hidden' }, panelStyle]}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20 }}>
            {body ? (
              <Text style={styles.stepBody}>{body}</Text>
            ) : null}
            {why ? (
              <View style={[styles.whyBox, { borderLeftColor: color }]}>
                <Text style={styles.whyLabel}>WHY NEEDED</Text>
                <Text style={styles.whyText}>{why}</Text>
              </View>
            ) : null}
            {step.skills?.name ? (
              <View style={[styles.skillChip, { borderColor: color + '50', backgroundColor: color + '15' }]}>
                <Feather name="layers" size={11} color={color} />
                <Text style={[styles.skillChipTxt, { color }]}>{step.skills.name}</Text>
              </View>
            ) : null}
            {step.courses?.title ? (
              <Pressable
                style={styles.courseRow}
                onPress={() => { if (step.courses?.url) Linking.openURL(step.courses.url).catch(() => null); }}
              >
                <Feather name="external-link" size={12} color="rgba(255,255,255,0.65)" />
                <Text style={styles.courseTxt} numberOfLines={1}>{step.courses.title}</Text>
              </Pressable>
            ) : null}
            <View style={{ height: 8 }} />
          </ScrollView>
        </Reanimated.View>

        {/* Navigation row */}
        <View style={[styles.actionRow, { paddingBottom: Math.max(insetBottom, 16) }]}>
          <View style={styles.navBtns}>
            <Pressable
              style={[styles.navBtn, stepIndex === 0 && styles.navBtnDisabled]}
              onPress={onPrev}
              disabled={stepIndex === 0}
            >
              <Feather name="chevron-left" size={20} color={stepIndex === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)'} />
            </Pressable>
            <Text style={styles.navCount}>{stepIndex + 1} / {totalSteps}</Text>
            <Pressable
              style={[styles.navBtn, stepIndex === totalSteps - 1 && styles.navBtnDisabled]}
              onPress={onNext}
              disabled={stepIndex === totalSteps - 1}
            >
              <Feather name="chevron-right" size={20} color={stepIndex === totalSteps - 1 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)'} />
            </Pressable>
          </View>

          {/* Secondary start button (only shown in action row) */}
          {canStart && (
            <View style={styles.actionBtns}>
              <Pressable style={[styles.actionBtn, styles.startBtn]} onPress={onStart}>
                <Feather name="play" size={14} color="#fff" />
                <Text style={styles.actionBtnTxt}>Start</Text>
              </Pressable>
            </View>
          )}
        </View>
      </BlurView>
      </Reanimated.View>
    </View>
  );
}

// ─── Top overlay bar ─────────────────────────────────────────────────────────
function TopBar({
  title,
  roleTitle,
  completedSteps,
  totalSteps,
  insetTop,
  theme,
}: {
  title: string;
  roleTitle?: string;
  completedSteps: number;
  totalSteps: number;
  insetTop: number;
  theme: ReturnType<typeof useTheme>;
}) {
  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  return (
    <Reanimated.View entering={FadeIn.delay(100)} style={[styles.topBar, { paddingTop: insetTop + 8 }]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.28)', 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.topContent}>
        <View>
          <Text style={styles.topEyebrow}>NEXAPATH · ASCENT</Text>
          <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
          {roleTitle ? (
            <View style={styles.rolePill}>
              <View style={styles.roleDot} />
              <Text style={styles.roleTitle}>{roleTitle.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.topRight}>
          <Text style={styles.pctText}>{pct}%</Text>
          <Text style={styles.pctLabel}>{completedSteps}/{totalSteps} done</Text>
          <View style={{ width: 60, marginTop: 4 }}>
            <ProgressBar pct={pct} color="#4ade80" />
          </View>
        </View>
      </View>
    </Reanimated.View>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingView({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.centred, { backgroundColor: theme.bg }]}>
      <MiniMountain theme={theme} />
      <ActivityIndicator color={theme.accent} size="large" style={{ marginTop: 20 }} />
      <Text style={[styles.stateText, { color: theme.textSecondary }]}>Loading your route…</Text>
    </View>
  );
}

// ─── Error screen ─────────────────────────────────────────────────────────────
function ErrorView({ message, onRetry, theme }: { message: string; onRetry: () => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.centred, { backgroundColor: theme.bg, paddingHorizontal: 24 }]}>
      <View style={[styles.stateCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
        <Feather name="alert-triangle" size={28} color={theme.warm} />
        <Text style={[styles.stateHeading, { color: theme.text }]}>Something went wrong</Text>
        <Text style={[styles.stateText, { color: theme.textSecondary, textAlign: 'center' }]}>{message}</Text>
        <Pressable
          style={[styles.retryBtn, { backgroundColor: theme.accent }]}
          onPress={onRetry}
        >
          <Text style={[styles.retryTxt, { color: theme.textOnAccent }]}>Try again</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Empty screen (no roadmap yet) ───────────────────────────────────────────
function EmptyView({ theme, insetTop }: { theme: ReturnType<typeof useTheme>; insetTop: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingTop: insetTop + (Platform.OS === 'web' ? 67 : 12), paddingHorizontal: 24 }}>
        <Text style={[styles.emptyEyebrow, { color: theme.textTertiary }]}>NEXAPATH · CLIMBER LOG</Text>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Your Ascent</Text>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <MiniMountain theme={theme} />
        </View>
        <View style={[styles.stateCard, { backgroundColor: theme.surface, borderColor: theme.border, overflow: 'visible' }]}>
          <View style={[styles.cardTopLine, { backgroundColor: theme.warm }]} />
          <Text style={[styles.noRouteLabel, { color: theme.warm }]}>NO ROUTE SET</Text>
          <Text style={[styles.noRouteTitle, { color: theme.text }]}>No path{'\n'}compiled yet.</Text>
          <Text style={[styles.noRouteBody, { color: theme.textSecondary }]}>
            Run a 5-minute assessment and we'll generate a personalised weekly learning plan.
          </Text>
          <Pressable
            style={[styles.buildBtn, { backgroundColor: theme.accent }]}
            onPress={() => router.push('/onboarding-chat')}
          >
            <Text style={[styles.buildBtnTxt, { color: theme.textOnAccent }]}>Build my route  →</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RoadmapScreen() {
  const theme  = useTheme();
  const insets = useSafeAreaInsets();

  const [roadmap,    setRoadmap]    = useState<RoadmapWithSteps | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [profileId,  setProfileId]  = useState<string | null>(null);
  const [viewedIdx,  setViewedIdx]  = useState(0); // which checkpoint the panel shows

  const loadRoadmap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let pid = profileId;
      if (!pid) { pid = await fetchProfileId(); setProfileId(pid); }
      if (!pid) { setError('Profile not found. Please log in again.'); return; }
      const rm = await getRoadmapWithSteps(pid);
      setRoadmap(rm);
      // Initialise viewed index to the current checkpoint
      if (rm) {
        const idx = rm.steps.findIndex(s => s.status !== 'completed');
        setViewedIdx(idx >= 0 ? idx : rm.steps.length - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { loadRoadmap(); }, []);

  async function handleStatusChange(stepId: string, status: RoadmapStep['status']) {
    try {
      await updateRoadmapStepStatus(stepId, status);
      await loadRoadmap();
    } catch { /* silent */ }
  }

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (loading) return <LoadingView theme={theme} />;
  if (error)   return <ErrorView message={error} onRetry={loadRoadmap} theme={theme} />;
  if (!roadmap) return <EmptyView theme={theme} insetTop={insets.top} />;

  // ── Data helpers ──────────────────────────────────────────────────────────────
  const steps          = roadmap.steps;
  const totalSteps     = steps.length;
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const currentStep    = steps[viewedIdx] ?? null;

  // Map RoadmapStep → CheckpointDef for the mountain
  const checkpoints: CheckpointDef[] = steps.map(s => ({
    id:     s.id,
    title:  s.title,
    status: s.status,
  }));

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;

  // ── Full-screen mountain layout ───────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0f18' }}>

      {/* ── 3D Mountain (fills entire screen) ── */}
      <ProceduralMountain3D
        steps={checkpoints}
        completedSteps={completedSteps}
        seed={roadmap.id ? roadmap.id.charCodeAt(0) : 42}
      />

      {/* ── Top overlay (transparent gradient + title) ── */}
      <TopBar
        title={roadmap.title}
        roleTitle={roadmap.job_roles?.title}
        completedSteps={completedSteps}
        totalSteps={totalSteps}
        insetTop={topPad}
        theme={theme}
      />

      {/* ── Bottom checkpoint panel ── */}
      <View style={styles.bottomWrap} pointerEvents="box-none">
        <CheckpointPanel
          step={currentStep}
          stepIndex={viewedIdx}
          totalSteps={totalSteps}
          completedSteps={completedSteps}
          onStart={() => {
            if (currentStep) handleStatusChange(currentStep.id, 'in_progress');
          }}
          onComplete={() => {
            if (currentStep) {
              handleStatusChange(currentStep.id, 'completed');
              if (viewedIdx < totalSteps - 1) setViewedIdx(v => v + 1);
            }
          }}
          onPrev={() => setViewedIdx(v => Math.max(0, v - 1))}
          onNext={() => setViewedIdx(v => Math.min(totalSteps - 1, v + 1))}
          theme={theme}
          insetBottom={insets.bottom}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centred: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },

  // ── States ──
  stateCard: {
    borderRadius: 20, borderWidth: 1, padding: 22, alignItems: 'center', gap: 10,
  },
  stateHeading: { fontFamily: SANS, fontSize: 18, letterSpacing: -0.3 },
  stateText: { fontFamily: SANS_REG, fontSize: 13, lineHeight: 20 },
  retryBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  retryTxt: { fontFamily: SANS, fontSize: 14 },

  // ── Empty ──
  emptyEyebrow: { fontFamily: SANS_MED, fontSize: 11, letterSpacing: 1.5, marginBottom: 4 },
  emptyTitle: { fontFamily: SERIF, fontSize: 34, fontStyle: 'italic', marginBottom: 6 },
  cardTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: 20 },
  noRouteLabel: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 },
  noRouteTitle: { fontFamily: SANS, fontSize: 22, letterSpacing: -0.4, marginBottom: 8 },
  noRouteBody: { fontFamily: SANS_REG, fontSize: 14, lineHeight: 21, marginBottom: 18, textAlign: 'center' },
  buildBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center' },
  buildBtnTxt: { fontFamily: SANS, fontSize: 15 },

  // ── Top bar ──
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    zIndex: 10,
  },
  topContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topEyebrow: {
    fontFamily: SANS_MED, fontSize: 9, color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.6, marginBottom: 3,
  },
  topTitle: {
    fontFamily: SERIF, fontSize: 22, fontStyle: 'italic',
    color: '#fff', maxWidth: SW * 0.6,
  },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  roleDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fbbf24' },
  roleTitle: { fontFamily: SANS_MED, fontSize: 10, color: '#fbbf24', letterSpacing: 0.8 },
  topRight:  { alignItems: 'flex-end', paddingTop: 4 },
  pctText:  { fontFamily: SANS, fontSize: 24, color: '#4ade80', lineHeight: 28 },
  pctLabel: { fontFamily: SANS_MED, fontSize: 9, color: 'rgba(255,255,255,0.50)', letterSpacing: 0.5 },

  // ── Bottom panel ──
  bottomWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    zIndex: 20,
  },
  panelWrap: {
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.08)',
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.28)' },

  dotStrip: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
    gap: 5, paddingHorizontal: 20, marginBottom: 12,
  },
  dot: { height: 6, borderRadius: 3 },

  stepHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, gap: 12, marginBottom: 8,
  },
  stepNumBadge: {
    width: 34, height: 34, borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontFamily: SANS, fontSize: 13 },
  stepTitle: { fontFamily: SANS_MED, fontSize: 15, color: '#fff', lineHeight: 21, flex: 1 },
  stepMeta:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  stepStatus: { fontFamily: SANS_MED, fontSize: 11 },
  stepDur:    { fontFamily: SANS_REG, fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  chevronBtn: { paddingLeft: 4, paddingTop: 4 },

  stepBody: {
    fontFamily: SANS_REG, fontSize: 13, lineHeight: 20,
    color: 'rgba(255,255,255,0.70)', marginBottom: 12,
  },
  whyBox: {
    borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8,
    marginBottom: 12, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  whyLabel: { fontFamily: SANS_MED, fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5, marginBottom: 3 },
  whyText:  { fontFamily: SANS_REG, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 18 },
  skillChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    alignSelf: 'flex-start', marginBottom: 10,
  },
  skillChipTxt: { fontFamily: SANS_MED, fontSize: 11 },
  courseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8,
  },
  courseTxt: { fontFamily: SANS_MED, fontSize: 12, color: 'rgba(255,255,255,0.75)', flex: 1 },

  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)',
    gap: 12,
  },
  navBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn:  {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  navBtnDisabled: { opacity: 0.35 },
  navCount: { fontFamily: SANS_MED, fontSize: 12, color: 'rgba(255,255,255,0.55)', minWidth: 40, textAlign: 'center' },

  actionBtns: { flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  startBtn: { backgroundColor: '#3b82f6' },
  actionBtnTxt: { fontFamily: SANS_MED, fontSize: 13, color: '#fff' },

  // Complete step button (prominent, always visible when actionable)
  completeBtn: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 12,
    borderRadius: 14, overflow: 'hidden',
  },
  completeBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13,
  },
  completeBtnTxt: { fontFamily: SANS_MED, fontSize: 15, color: '#fff' },

  completedBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginHorizontal: 16, marginTop: 4, marginBottom: 12,
    paddingVertical: 11,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.30)',
    backgroundColor: 'rgba(74,222,128,0.08)',
  },
  completedBadgeTxt: { fontFamily: SANS_MED, fontSize: 14, color: '#4ade80' },
});
