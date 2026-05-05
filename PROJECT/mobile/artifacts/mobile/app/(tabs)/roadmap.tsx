'use no memo';
/**
 * Roadmap screen - full-screen real-world 3D mountain.
 * Mapbox renders satellite imagery over DEM terrain with transparent overlays:
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
  RealWorldMountain3D,
  type CheckpointDef,
} from '@/components/roadmap/RealWorldMountain3D';
import {
  ensureStepResources,
  fetchProfileId,
  getRoadmapWithSteps,
  updateRoadmapStepStatus,
  type RoadmapStep,
  type RoadmapWithSteps,
  type StepResource,
  type StepResourceProvider,
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

// djb2 hash — gives each roadmap UUID a unique, well-distributed seed so
// users with different roadmaps get visibly different mountains.
function hashSeed(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 42;
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

// ─── Resource provider styling ────────────────────────────────────────────────
const PROVIDER_META: Record<StepResourceProvider, { label: string; color: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  coursera: { label: 'Coursera', color: '#0056d2', icon: 'book-open' },
  udemy:    { label: 'Udemy',    color: '#a435f0', icon: 'monitor' },
  youtube:  { label: 'YouTube',  color: '#ff0000', icon: 'play-circle' },
  edx:      { label: 'edX',      color: '#022b3a', icon: 'book' },
  other:    { label: 'Resource', color: '#64748b', icon: 'link' },
};

// ─── Bottom sheet — three-snap drawer (peek / mid / full) ─────────────────────
type SheetSnap = 'peek' | 'mid' | 'full';

function CheckpointSheet({
  step,
  stepIndex,
  totalSteps,
  completedSteps,
  steps,
  snap,
  onSnapChange,
  onStart,
  onComplete,
  onPrev,
  onNext,
  onPickStep,
  viewMode,
  onExitFocus,
  theme,
  insetBottom,
}: {
  step: RoadmapStep | null;
  stepIndex: number;
  totalSteps: number;
  completedSteps: number;
  steps: RoadmapStep[];
  snap: SheetSnap;
  onSnapChange: (s: SheetSnap) => void;
  onStart: () => void;
  onComplete: () => void;
  onPrev: () => void;
  onNext: () => void;
  onPickStep: (i: number) => void;
  viewMode: 'overview' | 'focused';
  onExitFocus: () => void;
  theme: ReturnType<typeof useTheme>;
  insetBottom: number;
}) {
  const PEEK = 132;
  const MID  = Math.round(SH * 0.50);
  const FULL = Math.round(SH * 0.86);

  const heightOf = (s: SheetSnap) => (s === 'peek' ? PEEK : s === 'mid' ? MID : FULL);

  const sheetH = useSharedValue(heightOf(snap));
  const dragStartH = useRef(heightOf(snap));
  // Refs so the panResponder's persistent closures see fresh values without
  // re-creating PanResponder.create() on every parent re-render.
  const onSnapChangeRef = useRef(onSnapChange);
  useEffect(() => { onSnapChangeRef.current = onSnapChange; }, [onSnapChange]);

  useEffect(() => {
    sheetH.value = withSpring(heightOf(snap), { damping: 22, stiffness: 180, mass: 0.8 });
  }, [snap]);

  const sheetStyle = useAnimatedStyle(() => ({ height: sheetH.value }));

  const dragPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => { dragStartH.current = sheetH.value; },
      onPanResponderMove: (_, g) => {
        const next = Math.max(PEEK, Math.min(FULL, dragStartH.current - g.dy));
        sheetH.value = next;
      },
      onPanResponderRelease: (_, g) => {
        const final = Math.max(PEEK, Math.min(FULL, dragStartH.current - g.dy));
        // Snap to nearest of the three points, biased by velocity.
        const v = -g.vy * 200;
        const projected = final + v;
        const distances: Array<[SheetSnap, number]> = [
          ['peek', Math.abs(projected - PEEK)],
          ['mid',  Math.abs(projected - MID)],
          ['full', Math.abs(projected - FULL)],
        ];
        distances.sort((a, b) => a[1] - b[1]);
        const next = distances[0][0];
        // Always animate directly so the sheet doesn't stick mid-drag when
        // the chosen snap matches the current parent state (no re-render →
        // no useEffect → no spring otherwise).
        sheetH.value = withSpring(heightOf(next), { damping: 22, stiffness: 180, mass: 0.8 });
        onSnapChangeRef.current(next);
      },
    })
  ).current;

  // Swipe left/right on the header area for prev/next step navigation.
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
  const isCompleted = step.status === 'completed';
  const canStart    = step.status === 'available';
  const canComplete = step.status === 'in_progress' || step.status === 'available';
  const color       = statusColor(step.status, theme);
  const resources   = ensureStepResources(step);

  return (
    <Reanimated.View style={[styles.panelWrap, sheetStyle]}>
      <BlurView intensity={85} tint="dark" style={[styles.panel, { flex: 1 }]}>

        {/* Drag handle — drag up/down to change snap */}
        <View {...dragPan.panHandlers} style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {/* Header: dots + step badge + back-to-overview pill (when focused) */}
        <View {...swipePan.panHandlers}>
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
            {viewMode === 'focused' ? (
              <Pressable onPress={onExitFocus} style={styles.backPill} accessibilityLabel="Back to roadmap">
                <Feather name="map" size={12} color="#fbbf24" />
                <Text style={styles.backPillTxt}>Roadmap</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => onSnapChange(snap === 'full' ? 'peek' : 'full')}
                style={styles.viewAllPill}
                accessibilityLabel="View all steps"
              >
                <Feather name={snap === 'full' ? 'chevron-down' : 'list'} size={12} color="rgba(255,255,255,0.85)" />
                <Text style={styles.viewAllPillTxt}>{snap === 'full' ? 'Close' : 'All steps'}</Text>
              </Pressable>
            )}
          </View>

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

        {/* Scrollable body — content depends on snap state */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(insetBottom, 16) + 80 }}
          showsVerticalScrollIndicator={false}
        >
          {snap === 'full' ? (
            <StepList
              steps={steps}
              activeIndex={stepIndex}
              completedSteps={completedSteps}
              theme={theme}
              onPick={(i) => onPickStep(i)}
            />
          ) : (
            <>
              {body ? <Text style={styles.stepBody}>{body}</Text> : null}
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
              <ResourceGrid resources={resources} />
            </>
          )}
        </ScrollView>

        {/* Pinned action row at the bottom of the sheet */}
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
  );
}

// ─── Multi-platform resource grid ─────────────────────────────────────────────
function ResourceGrid({ resources }: { resources: StepResource[] }) {
  if (!resources.length) return null;
  return (
    <View style={styles.resourceGrid}>
      <Text style={styles.resourceLabel}>LEARN ON</Text>
      <View style={styles.resourceRow}>
        {resources.map((r, i) => {
          const meta = PROVIDER_META[r.provider] ?? PROVIDER_META.other;
          return (
            <Pressable
              key={`${r.provider}-${i}`}
              style={[styles.resourceCard, { borderColor: meta.color + '55', backgroundColor: meta.color + '12' }]}
              onPress={() => Linking.openURL(r.url).catch(() => null)}
            >
              <Feather name={meta.icon} size={14} color={meta.color} />
              <Text style={[styles.resourceCardLabel, { color: meta.color }]}>{meta.label}</Text>
              <Text style={styles.resourceCardTitle} numberOfLines={2}>{r.title}</Text>
              {r.free ? <Text style={styles.resourceFreeBadge}>FREE</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Full step list (rendered at 'full' snap) ─────────────────────────────────
function StepList({
  steps,
  activeIndex,
  completedSteps,
  theme,
  onPick,
}: {
  steps: RoadmapStep[];
  activeIndex: number;
  completedSteps: number;
  theme: ReturnType<typeof useTheme>;
  onPick: (i: number) => void;
}) {
  return (
    <View style={{ paddingTop: 4 }}>
      <Text style={styles.listLabel}>ALL STEPS · TAP TO FOCUS</Text>
      {steps.map((s, i) => {
        const done    = i < completedSteps;
        const current = i === activeIndex;
        const color   = statusColor(s.status, theme);
        return (
          <Pressable
            key={s.id}
            onPress={() => onPick(i)}
            style={[styles.listCard, current && styles.listCardActive]}
          >
            <View style={[styles.listNum, { borderColor: color + '50', backgroundColor: color + '18' }]}>
              <Text style={[styles.listNumTxt, { color }]}>
                {done ? '✓' : String(s.step_order).padStart(2, '0')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle} numberOfLines={2}>{s.title}</Text>
              <View style={styles.listMeta}>
                <Feather name={statusIcon(s.status)} size={10} color={color} />
                <Text style={[styles.listStatus, { color }]}>
                  {{ locked: 'Locked', available: 'Available', in_progress: 'In Progress',
                     completed: 'Completed', skipped: 'Skipped' }[s.status]}
                </Text>
                {s.duration_hours ? <Text style={styles.listDur}>· {formatH(s.duration_hours)}</Text> : null}
              </View>
            </View>
            <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.40)" />
          </Pressable>
        );
      })}
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

  const [roadmap,        setRoadmap]        = useState<RoadmapWithSteps | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [profileId,      setProfileId]      = useState<string | null>(null);
  const [viewedIdx,      setViewedIdx]      = useState(0); // which checkpoint the panel shows
  const [viewMode,       setViewMode]       = useState<'overview' | 'focused'>('overview');
  const [sheetSnap,      setSheetSnap]      = useState<SheetSnap>('peek');

  // Refetches do NOT flip a `loading` flag — that would unmount the GL canvas
  // and cause a black flash on every step completion. Only the very first
  // load shows <LoadingView />; subsequent fetches mutate `roadmap` in place.
  const loadRoadmap = useCallback(async (opts: { silent?: boolean } = {}) => {
    try {
      if (!opts.silent) setError(null);
      let pid = profileId;
      if (!pid) { pid = await fetchProfileId(); setProfileId(pid); }
      if (!pid) {
        if (!opts.silent) setError('Profile not found. Please log in again.');
        return;
      }
      const rm = await getRoadmapWithSteps(pid);
      setRoadmap(rm);
      if (rm && !opts.silent) {
        const idx = rm.steps.findIndex(s => s.status !== 'completed');
        setViewedIdx(idx >= 0 ? idx : rm.steps.length - 1);
      }
    } catch (err) {
      if (!opts.silent) setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setInitialLoading(false);
    }
  }, [profileId]);

  useEffect(() => { loadRoadmap(); }, []);

  // Optimistic update so the mountain canvas never unmounts on step completion.
  // The DB write fans out in the background; on failure we silently refetch
  // (still without flipping initialLoading, so still no flash).
  async function handleStatusChange(stepId: string, status: RoadmapStep['status']) {
    setRoadmap(prev => {
      if (!prev) return prev;
      const nowIso = new Date().toISOString();
      const nextSteps = prev.steps.map(s =>
        s.id === stepId
          ? { ...s, status, completed_at: status === 'completed' ? nowIso : s.completed_at }
          : s,
      );
      return { ...prev, steps: nextSteps };
    });
    try {
      await updateRoadmapStepStatus(stepId, status);
    } catch {
      // Reconcile silently if the write failed
      loadRoadmap({ silent: true });
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────────
  // Only the first load gets the loading view. After that we keep the canvas
  // mounted at all costs.
  if (initialLoading && !roadmap) return <LoadingView theme={theme} />;
  if (error && !roadmap)          return <ErrorView message={error} onRetry={loadRoadmap} theme={theme} />;
  if (!roadmap)                   return <EmptyView theme={theme} insetTop={insets.top} />;

  // ── Data helpers ──────────────────────────────────────────────────────────────
  const steps          = roadmap.steps;
  const totalSteps     = steps.length;
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const currentStep    = steps[viewedIdx] ?? null;

  // Map RoadmapStep to checkpoint metadata for the route overlay.
  const checkpoints: CheckpointDef[] = steps.map(s => ({
    id:         s.id,
    title:      s.title,
    status:     s.status,
  }));

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;

  // Stable per-roadmap selector: blend the roadmap UUID with step titles so
  // each roadmap picks a real mountain route consistently. Mapbox supplies
  // the DEM terrain and satellite imagery at runtime.
  const seed = (() => {
    if (!roadmap.id) return 42;
    const titles = steps.map(s => s.title).join('|');
    return hashSeed(`${roadmap.id}|${titles}`);
  })();

  // Focusing a step moves the Mapbox camera to that route checkpoint.
  const focusStep = (i: number) => {
    setViewedIdx(i);
    setViewMode('focused');
    setSheetSnap('mid');
  };
  const exitFocus = () => {
    setViewMode('overview');
    setSheetSnap('peek');
  };

  // ── Full-screen mountain layout ───────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0f18' }}>

      {/* ── 3D Mountain (fills entire screen) ── */}
      <RealWorldMountain3D
        steps={checkpoints}
        completedSteps={completedSteps}
        seed={seed}
        viewMode={viewMode}
        focusedStepIndex={viewMode === 'focused' ? viewedIdx : -1}
        onStepFocus={focusStep}
        onExitFocus={exitFocus}
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

      {/* ── Bottom checkpoint sheet (peek / mid / full snaps) ── */}
      <View style={styles.bottomWrap} pointerEvents="box-none">
        <CheckpointSheet
          step={currentStep}
          stepIndex={viewedIdx}
          totalSteps={totalSteps}
          completedSteps={completedSteps}
          steps={steps}
          snap={sheetSnap}
          onSnapChange={setSheetSnap}
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
          onPickStep={focusStep}
          viewMode={viewMode}
          onExitFocus={exitFocus}
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

  // ── View-mode pills ──
  backPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(251,191,36,0.14)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.45)',
  },
  backPillTxt: { fontFamily: SANS_MED, fontSize: 11, color: '#fbbf24', letterSpacing: 0.4 },
  viewAllPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  viewAllPillTxt: { fontFamily: SANS_MED, fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.4 },

  // ── Resource grid ──
  resourceGrid: { marginTop: 8, marginBottom: 8 },
  resourceLabel: {
    fontFamily: SANS_MED, fontSize: 9, color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.2, marginBottom: 8,
  },
  resourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resourceCard: {
    width: '48%',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 4,
  },
  resourceCardLabel: { fontFamily: SANS_MED, fontSize: 11, letterSpacing: 0.5 },
  resourceCardTitle: { fontFamily: SANS_REG, fontSize: 11, color: 'rgba(255,255,255,0.78)', lineHeight: 15 },
  resourceFreeBadge: {
    fontFamily: SANS_MED, fontSize: 9, color: '#4ade80',
    letterSpacing: 0.6, marginTop: 2,
  },

  // ── Full step list ──
  listLabel: {
    fontFamily: SANS_MED, fontSize: 9, color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.2, marginBottom: 10, marginTop: 4,
  },
  listCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  listCardActive: {
    borderColor: 'rgba(251,191,36,0.55)',
    backgroundColor: 'rgba(251,191,36,0.08)',
  },
  listNum: {
    width: 30, height: 30, borderRadius: 8,
    borderWidth: 1.2,
    alignItems: 'center', justifyContent: 'center',
  },
  listNumTxt: { fontFamily: SANS, fontSize: 11 },
  listTitle: { fontFamily: SANS_MED, fontSize: 13, color: '#fff', lineHeight: 18 },
  listMeta:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  listStatus: { fontFamily: SANS_MED, fontSize: 10 },
  listDur:    { fontFamily: SANS_REG, fontSize: 10, color: 'rgba(255,255,255,0.45)' },
});
