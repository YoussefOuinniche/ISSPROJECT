'use no memo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated as RNAnimated,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Polyline, Rect, Stop } from 'react-native-svg';
import Reanimated, {
  FadeInDown,
  FadeInLeft,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SERIF, SANS, SANS_MED, SANS_REG } from '@/constants/theme';
import { getBottomContentPadding } from '@/lib/layout';
import {
  getHomeData,
  searchJobsWithAi,
  type HomeData,
  type TrendingJob,
  type JobSearchResult,
} from '@/lib/api/mobileApi';

const { width: SW } = Dimensions.get('window');
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const STAR_POSITIONS = [
  { cx: 28, cy: 18, r: 1.4, op: 0.72 },
  { cx: 68, cy: 11, r: 1.0, op: 0.50 },
  { cx: 102, cy: 28, r: 1.4, op: 0.84 },
  { cx: 148, cy: 16, r: 0.9, op: 0.60 },
  { cx: 180, cy: 7, r: 1.4, op: 0.68 },
  { cx: 222, cy: 24, r: 1.0, op: 0.55 },
  { cx: 258, cy: 14, r: 1.4, op: 0.90 },
  { cx: 298, cy: 20, r: 1.0, op: 0.62 },
  { cx: 332, cy: 9, r: 1.4, op: 0.72 },
  { cx: 358, cy: 32, r: 1.0, op: 0.48 },
  { cx: 48, cy: 40, r: 0.8, op: 0.42 },
  { cx: 310, cy: 42, r: 0.8, op: 0.38 },
];

function fmtSalary(tnd: number | null) {
  if (!tnd) return null;
  return `${Math.round(tnd / 1000)}k`;
}

function seedSparkline(slug: string, growthPct: number | null, points = 10): number[] {
  const seed = (slug || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = 100;
  const growth = growthPct ?? 8;
  return Array.from({ length: points }, (_, i) => {
    const trend = 1 + (growth / 100) * (i / (points - 1));
    const noise = ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280 * 0.18 - 0.09;
    return Math.max(1, base * trend * (1 + noise));
  });
}

function getDayLabel(roadmap: HomeData['roadmap']): { num: string; label: string } {
  if (!roadmap) return { num: '001', label: 'First Light' };
  const { progress_pct, estimated_weeks } = roadmap;
  const totalDays = (estimated_weeks ?? 12) * 7;
  const currentDay = Math.max(1, Math.round((progress_pct / 100) * totalDays));
  const num = String(currentDay).padStart(3, '0');
  if (progress_pct < 5) return { num, label: 'First Light' };
  if (progress_pct < 25) return { num, label: 'Early Climb' };
  if (progress_pct < 50) return { num, label: 'Mid Ascent' };
  if (progress_pct < 75) return { num, label: 'High Terrain' };
  return { num, label: 'Near Summit' };
}

// ─── Mountain Hero Illustration ───────────────────────────────────────────────
function MountainHero({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const H = 210;
  const W = SW;
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'flex' }}>
      <Defs>
        <SvgGradient id="skyDark" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.sky1} stopOpacity="1" />
          <Stop offset="1" stopColor={theme.sky2} stopOpacity="1" />
        </SvgGradient>
        <SvgGradient id="quoteOverlay" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.bg} stopOpacity="0" />
          <Stop offset="1" stopColor={theme.bg} stopOpacity="0.92" />
        </SvgGradient>
      </Defs>

      {/* Sky */}
      <Rect x={0} y={0} width={W} height={H} fill="url(#skyDark)" />

      {/* Stars */}
      {STAR_POSITIONS.map((s, i) => (
        <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={theme.starColor} opacity={s.op} />
      ))}

      {/* Far mountains (deepest) */}
      <Path
        d={`M0,${H} L${W * 0.05},${H * 0.52} L${W * 0.12},${H * 0.60} L${W * 0.20},${H * 0.43} L${W * 0.28},${H * 0.53} L${W * 0.36},${H * 0.37} L${W * 0.44},${H * 0.48} L${W * 0.52},${H * 0.33} L${W * 0.60},${H * 0.44} L${W * 0.68},${H * 0.30} L${W * 0.76},${H * 0.42} L${W * 0.84},${H * 0.27} L${W * 0.92},${H * 0.38} L${W},${H * 0.32} L${W},${H} Z`}
        fill={theme.mtn1}
      />

      {/* Mid mountains */}
      <Path
        d={`M0,${H} L${W * 0.08},${H * 0.63} L${W * 0.18},${H * 0.72} L${W * 0.28},${H * 0.55} L${W * 0.38},${H * 0.67} L${W * 0.48},${H * 0.50} L${W * 0.57},${H * 0.62} L${W * 0.66},${H * 0.46} L${W * 0.75},${H * 0.58} L${W * 0.84},${H * 0.43} L${W * 0.92},${H * 0.54} L${W},${H * 0.48} L${W},${H} Z`}
        fill={theme.mtn2}
      />

      {/* Near mountains */}
      <Path
        d={`M0,${H} L${W * 0.10},${H * 0.76} L${W * 0.22},${H * 0.83} L${W * 0.34},${H * 0.70} L${W * 0.46},${H * 0.79} L${W * 0.58},${H * 0.67} L${W * 0.70},${H * 0.76} L${W * 0.82},${H * 0.65} L${W * 0.92},${H * 0.74} L${W},${H * 0.68} L${W},${H} Z`}
        fill={theme.mtn3}
      />

      {/* Foreground */}
      <Path
        d={`M0,${H} L${W * 0.15},${H * 0.88} L${W * 0.32},${H * 0.92} L${W * 0.50},${H * 0.85} L${W * 0.68},${H * 0.90} L${W * 0.85},${H * 0.84} L${W},${H * 0.87} L${W},${H} Z`}
        fill={theme.mtn4}
      />

      {/* Dotted climbing path → tallest peak ~(84%, 27%) */}
      <Path
        d={`M${W * 0.22},${H * 0.96} C${W * 0.42},${H * 0.72} ${W * 0.64},${H * 0.52} ${W * 0.84},${H * 0.30}`}
        stroke={theme.pathColor}
        strokeWidth={1.8}
        strokeDasharray="5,7"
        fill="none"
        strokeLinecap="round"
      />

      {/* Peak marker dot */}
      <Circle cx={W * 0.84} cy={H * 0.27} r={4} fill={theme.warm} opacity={0.9} />
      <Circle cx={W * 0.84} cy={H * 0.27} r={7} fill={theme.warm} opacity={0.18} />

      {/* Bottom gradient overlay for text readability */}
      <Rect x={0} y={H * 0.5} width={W} height={H * 0.5} fill="url(#quoteOverlay)" />
    </Svg>
  );
}

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function MiniSparkline({ slug, growth, color }: { slug: string; growth: number | null; color: string }) {
  const W = 58, H = 26;
  const vals = seedSparkline(slug, growth);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - 2 - ((v - min) / range) * (H - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <Svg width={W} height={H}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Search result card ───────────────────────────────────────────────────────
function SearchResultCard({ result, index, theme }: { result: JobSearchResult; index: number; theme: ReturnType<typeof useTheme> }) {
  return (
    <Reanimated.View entering={FadeInLeft.delay(index * 40).springify().damping(20)}>
      <View style={[sCard.wrap, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
        <View style={sCard.top}>
          <Text style={[sCard.title, { color: theme.text }]} numberOfLines={1}>{result.title}</Text>
          <Text style={[sCard.badge, { color: theme.accent, borderColor: theme.accent + '50' }]}>{result.source.toUpperCase()}</Text>
        </View>
        <View style={sCard.meta}>
          {result.company ? <Text style={[sCard.sub, { color: theme.textTertiary }]} numberOfLines={1}>{result.company}</Text> : null}
          {result.location ? <Text style={[sCard.sub, { color: theme.textTertiary }]} numberOfLines={1}>{result.location}</Text> : null}
        </View>
        {result.salary ? <Text style={[sCard.salary, { color: theme.accent }]}>{result.salary}</Text> : null}
        {result.description ? <Text style={[sCard.desc, { color: theme.textSecondary }]} numberOfLines={2}>{result.description}</Text> : null}
      </View>
    </Reanimated.View>
  );
}

const sCard = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { flex: 1, fontFamily: SANS_MED, fontSize: 13, marginRight: 8 },
  badge: { fontFamily: SANS_MED, fontSize: 9, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  sub: { fontFamily: SANS_REG, fontSize: 11 },
  salary: { fontFamily: SANS, fontSize: 12, marginBottom: 4 },
  desc: { fontFamily: SANS_REG, fontSize: 11, lineHeight: 16 },
});

// ─── Job card ─────────────────────────────────────────────────────────────────
function JobCard({ job, index, theme }: { job: TrendingJob; index: number; theme: ReturnType<typeof useTheme> }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const growthUp = (job.growth_pct ?? 0) >= 0;
  const growthColor = growthUp ? theme.accent : '#EF4444';

  return (
    <Reanimated.View entering={FadeInLeft.delay(index * 70).springify().damping(18)} style={anim}>
      <Pressable
        style={[jc.card, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => router.push({ pathname: '/job-detail', params: { data: JSON.stringify(job) } })}
      >
        <View style={jc.thumb}>
          <Image source={{ uri: job.image_url }} contentFit="cover" style={StyleSheet.absoluteFillObject} transition={300} />
          <View style={jc.thumbOverlay} />
        </View>
        <View style={jc.info}>
          <Text style={[jc.cat, { color: theme.textTertiary }]} numberOfLines={1}>
            {job.category?.toUpperCase() ?? 'ROLE'}
          </Text>
          <Text style={[jc.title, { color: theme.text }]} numberOfLines={2}>{job.title}</Text>
          <View style={jc.meta}>
            {job.seniority_level && (
              <Text style={[jc.level, { color: theme.accent + 'CC' }]}>{job.seniority_level.toUpperCase()}</Text>
            )}
            {job.openings ? (
              <Text style={[jc.opens, { color: theme.textTertiary }]}>
                {job.openings >= 1000 ? `${(job.openings / 1000).toFixed(0)}k` : job.openings} open
              </Text>
            ) : null}
          </View>
        </View>
        <View style={jc.growth}>
          <MiniSparkline slug={job.slug ?? job.id} growth={job.growth_pct ?? null} color={growthColor} />
          {job.growth_pct ? (
            <Text style={[jc.growthNum, { color: growthColor }]}>
              {job.growth_pct > 0 ? '+' : ''}{job.growth_pct}%
            </Text>
          ) : null}
          {job.avg_salary_tnd ? (
            <Text style={[jc.salary, { color: theme.textSecondary }]}>{fmtSalary(job.avg_salary_tnd)} TND</Text>
          ) : null}
        </View>
      </Pressable>
    </Reanimated.View>
  );
}

const jc = StyleSheet.create({
  card: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, overflow: 'hidden', minHeight: 76, marginBottom: 8 },
  thumb: { width: 64, height: 76, flexShrink: 0 },
  thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  cat: { fontFamily: SANS_MED, fontSize: 9, letterSpacing: 0.6, marginBottom: 3 },
  title: { fontFamily: SANS_MED, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  meta: { flexDirection: 'row', gap: 8 },
  level: { fontFamily: SANS_MED, fontSize: 9, letterSpacing: 0.4 },
  opens: { fontFamily: SANS_REG, fontSize: 9 },
  growth: { paddingRight: 12, paddingVertical: 8, alignItems: 'flex-end', gap: 2, minWidth: 72 },
  growthNum: { fontFamily: SANS, fontSize: 11 },
  salary: { fontFamily: SANS_REG, fontSize: 9 },
});

// ─── Salary row ───────────────────────────────────────────────────────────────
function SalaryRow({ job, rank, delay, theme }: { job: TrendingJob; rank: number; delay: number; theme: ReturnType<typeof useTheme> }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Reanimated.View entering={FadeInDown.delay(delay).springify()} style={anim}>
      <Pressable
        style={[sr.row, { borderBottomColor: theme.borderSubtle }]}
        onPressIn={() => { scale.value = withSpring(0.985); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => router.push({ pathname: '/job-detail', params: { data: JSON.stringify(job) } })}
      >
        <Text style={[sr.rank, { color: rank <= 3 ? theme.accent : theme.textTertiary }]}>
          {String(rank).padStart(2, '0')}
        </Text>
        <View style={sr.info}>
          <Text style={[sr.title, { color: theme.text }]} numberOfLines={1}>{job.title}</Text>
          <Text style={[sr.sub, { color: theme.textTertiary }]}>{job.category}</Text>
        </View>
        <View style={sr.right}>
          <Text style={[sr.num, { color: theme.text }]}>{job.avg_salary_tnd ? `${Math.round(job.avg_salary_tnd / 1000)}k` : '—'}</Text>
          {job.growth_pct ? (
            <Text style={[sr.growth, { color: theme.accent }]}>+{job.growth_pct}%</Text>
          ) : null}
        </View>
      </Pressable>
    </Reanimated.View>
  );
}

const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, borderBottomWidth: 1 },
  rank: { fontFamily: SANS_MED, fontSize: 11, width: 24 },
  info: { flex: 1 },
  title: { fontFamily: SANS_MED, fontSize: 13, marginBottom: 2 },
  sub: { fontFamily: SANS_REG, fontSize: 10 },
  right: { alignItems: 'flex-end', gap: 2 },
  num: { fontFamily: SANS, fontSize: 16 },
  growth: { fontFamily: SANS_MED, fontSize: 10 },
});

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ label, meta, live, theme }: {
  label: string; meta?: string; live?: boolean; theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={sh.row}>
      <View style={sh.left}>
        {live && <View style={[sh.dot, { backgroundColor: theme.accent }]} />}
        <Text style={[sh.label, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      {meta ? <Text style={[sh.meta, { color: theme.textTertiary }]}>{meta}</Text> : null}
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontFamily: SANS_MED, fontSize: 11, letterSpacing: 0.5 },
  meta: { fontFamily: SANS_REG, fontSize: 10 },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<JobSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  const load = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setData(await getHomeData());
    } catch { /* silently fail */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSearch = useCallback(async (q: string) => {
    const query = q.trim();
    if (!query) { setSearchActive(false); setSearchResults([]); return; }
    setSearchActive(true);
    setSearchLoading(true);
    try { setSearchResults(await searchJobsWithAi(query, 12)); }
    catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  }, []);

  const firstName = data?.user_name?.split(' ')[0] ?? 'Explorer';
  const roadmap = data?.roadmap ?? null;
  const globalJobs = data?.trending_global ?? data?.trending_jobs ?? [];
  const tnJobs = data?.trending_tn ?? [];
  const trending = globalJobs.slice(0, 6);
  const topSalary = [...globalJobs].sort((a, b) => (b.avg_salary_tnd ?? 0) - (a.avg_salary_tnd ?? 0)).slice(0, 5);
  const dayInfo = getDayLabel(roadmap);

  const s = makeStyles(theme);

  return (
    <View style={[s.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom) }}
      >

        {/* ── Brand Header ── */}
        <View style={[s.header, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={[s.brandEye, { color: theme.textTertiary }]}>NEXAPATH</Text>
            <Text style={[s.brandTitle, { color: theme.text }]}>Lace up.</Text>
          </View>
          <View style={s.headerIcons}>
            <Pressable
              style={[s.iconBtn, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}
              onPress={() => {}}
            >
              <Feather name="search" size={18} color={theme.textSecondary} />
            </Pressable>
            <Pressable
              style={[s.iconBtn, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}
              onPress={() => {}}
            >
              <Feather name="bell" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* ── Day badge ── */}
        <View style={s.dayBadgeRow}>
          <View style={[s.dayBadge, { backgroundColor: theme.warmLight, borderColor: theme.warm + '40' }]}>
            <View style={[s.dayDiamond, { backgroundColor: theme.warm }]} />
            <Text style={[s.dayText, { color: theme.warm }]}>Day {dayInfo.num}  ·  {dayInfo.label.toUpperCase()}</Text>
          </View>
        </View>

        {/* ── Mountain Hero ── */}
        <View style={s.heroWrap}>
          <MountainHero theme={theme} />
          {/* Quote overlay */}
          <View style={s.quoteOverlay}>
            <Text style={[s.quoteMain, { color: theme.text }]}>
              The mountain doesn't move.
            </Text>
            <Text style={[s.quoteSub, { color: theme.textSecondary }]}>
              You do. One step at a time, {firstName}.
            </Text>
          </View>
        </View>

        {/* ── TODAY'S CLIMB — conditional on roadmap ── */}
        {roadmap ? (
          <Reanimated.View entering={FadeInDown.delay(80).springify()}>
            <View style={[s.climbCard, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
              {/* Accent top bar */}
              <View style={[s.climbTopBar, { backgroundColor: theme.accent }]} />
              <View style={s.climbInner}>
                <View style={s.climbHeadRow}>
                  <View>
                    <Text style={[s.climbEye, { color: theme.accent }]}>TODAY'S CLIMB</Text>
                    <Text style={[s.climbTitle, { color: theme.text }]}>One small step.{'\n'}Every single day.</Text>
                  </View>
                  <View style={[s.streakBadge, { backgroundColor: theme.warmLight, borderColor: theme.warm + '50' }]}>
                    <Text style={[s.streakNum, { color: theme.warm }]}>{roadmap.completed_steps}</Text>
                    <Text style={[s.streakLabel, { color: theme.warm + 'AA' }]}>DAY{'\n'}STREAK</Text>
                  </View>
                </View>
                <Text style={[s.climbDesc, { color: theme.textSecondary }]}>
                  15 minutes. One concept. You start fresh every morning — that's the whole deal.
                </Text>
                <Pressable
                  style={[s.climbBtn, { backgroundColor: theme.accent }]}
                  onPress={() => router.push('/(tabs)/roadmap')}
                >
                  <Text style={[s.climbBtnText, { color: theme.textOnAccent }]}>Begin today's climb  →</Text>
                </Pressable>
              </View>
            </View>

            {/* ── Last 7 Days ── */}
            <Reanimated.View entering={FadeInDown.delay(140).springify()}>
              <View style={[s.weekCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                <View style={s.weekHeader}>
                  <Text style={[s.weekTitle, { color: theme.text }]}>Climbs completed</Text>
                  <Text style={[s.weekCount, { color: theme.textTertiary }]}>0 / 7</Text>
                </View>
                <View style={s.weekDots}>
                  {DAYS.map((d, i) => (
                    <View key={i} style={s.weekDayWrap}>
                      <View style={[s.weekDot, { borderColor: theme.border }]} />
                      <Text style={[s.weekDayLabel, { color: theme.textTertiary }]}>{d}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.motivationRow}>
                  <Feather name="star" size={12} color={theme.warm} />
                  <Text style={[s.motivationText, { color: theme.textSecondary }]}>
                    Your first step is the hardest. Tomorrow's will be easier.
                  </Text>
                </View>
              </View>
            </Reanimated.View>
          </Reanimated.View>
        ) : (
          /* ── No roadmap — create path CTA ── */
          <Reanimated.View entering={FadeInDown.delay(80).springify()}>
            <View style={[s.pathCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[s.pathTopBar, { backgroundColor: theme.warm }]} />
              <View style={s.pathInner}>
                <Text style={[s.pathEye, { color: theme.warm }]}>YOUR PATH AWAITS</Text>
                <Text style={[s.pathTitle, { color: theme.text }]}>Map your climb.{'\n'}Start your journey.</Text>
                <Text style={[s.pathDesc, { color: theme.textSecondary }]}>
                  Chat with NexaPath AI to build your personalized learning roadmap. Takes about 5 minutes.
                </Text>
                <Pressable
                  style={[s.pathBtn, { backgroundColor: theme.warm }]}
                  onPress={() => router.push('/onboarding-chat')}
                >
                  <Feather name="map" size={15} color="#FFF" />
                  <Text style={s.pathBtnText}>Build my path  →</Text>
                </Pressable>
              </View>
            </View>
          </Reanimated.View>
        )}

        {/* ── AI Job Search ── */}
        <Reanimated.View entering={FadeInDown.delay(180).springify()}>
          <View style={[s.searchBox, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
            <View style={[s.searchAccent, { backgroundColor: theme.accent }]} />
            <Text style={[s.searchLabel, { color: theme.textTertiary }]}>AI Job Search</Text>
            <View style={s.searchRow}>
              <Feather name="search" size={14} color={theme.accent} />
              <TextInput
                style={[s.searchInput, { color: theme.text, borderBottomColor: theme.borderSubtle }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search any role, skill, or keyword..."
                placeholderTextColor={theme.textTertiary}
                returnKeyType="search"
                onSubmitEditing={() => onSearch(searchQuery)}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchActive ? (
                <Pressable
                  style={[s.searchXBtn, { backgroundColor: theme.bg2 }]}
                  onPress={() => { setSearchQuery(''); setSearchActive(false); setSearchResults([]); }}
                >
                  <Feather name="x" size={13} color={theme.textSecondary} />
                </Pressable>
              ) : (
                <Pressable style={[s.searchRunBtn, { backgroundColor: theme.accent }]} onPress={() => onSearch(searchQuery)}>
                  <Text style={[s.searchRunTxt, { color: theme.textOnAccent }]}>Go</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Reanimated.View>

        {/* ── Search results ── */}
        {searchActive && (
          <View style={s.searchResults}>
            <SectionHeader
              label={`Results for "${searchQuery}"`}
              meta={searchLoading ? '' : `${searchResults.length} found`}
              theme={theme}
            />
            {searchLoading
              ? <ActivityIndicator color={theme.accent} style={{ paddingVertical: 24 }} />
              : searchResults.length === 0
                ? <Text style={[s.empty, { color: theme.textTertiary }]}>No results — try a different query</Text>
                : searchResults.map((r, i) => <SearchResultCard key={`${r.title}-${i}`} result={r} index={i} theme={theme} />)
            }
          </View>
        )}

        {/* ── Global Trending ── */}
        <View style={s.section}>
          <SectionHeader label="Global Trending" meta={`${trending.length} roles`} live theme={theme} />
          {trending.map((job, i) => <JobCard key={job.id} job={job} index={i} theme={theme} />)}
          {trending.length === 0 && !loading && (
            <Text style={[s.empty, { color: theme.textTertiary }]}>Pull to refresh to load jobs</Text>
          )}
        </View>

        {/* ── Tunisia Market ── */}
        {(tnJobs.length > 0 || !loading) && (
          <View style={[s.section, { marginTop: 8 }]}>
            <SectionHeader
              label="Tunisia Market  🇹🇳"
              meta={`${tnJobs.length} roles`}
              live
              theme={theme}
            />
            {tnJobs.map((job, i) => <JobCard key={`tn-${job.id}`} job={job} index={i} theme={theme} />)}
            {tnJobs.length === 0 && !loading && (
              <View style={[s.tnEmpty, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                <Text style={[s.tnEmptyTitle, { color: theme.textSecondary }]}>Tunisia data loading...</Text>
                <Text style={[s.tnEmptyDesc, { color: theme.textTertiary }]}>
                  Market data is aggregated from live job boards. Pull to refresh.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Top Salary ── */}
        {topSalary.length > 0 && (
          <View style={[s.section, { marginTop: 8 }]}>
            <SectionHeader label="Top Salary  ·  TND" theme={theme} />
            <View style={[s.salaryCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
              {topSalary.map((job, i) => (
                <SalaryRow key={job.id} job={job} rank={i + 1} delay={i * 60 + 300} theme={theme} />
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingBottom: 6,
    },
    brandEye: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 2.5, marginBottom: 4 },
    brandTitle: { fontFamily: SANS, fontSize: 40, letterSpacing: -1.5 },
    headerIcons: { flexDirection: 'row', gap: 8, paddingTop: 6 },
    iconBtn: {
      width: 40, height: 40, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1,
    },

    // Day badge
    dayBadgeRow: { paddingHorizontal: 20, marginBottom: 14 },
    dayBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 7,
      alignSelf: 'flex-start',
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 100, borderWidth: 1,
    },
    dayDiamond: { width: 6, height: 6, borderRadius: 2, transform: [{ rotate: '45deg' }] },
    dayText: { fontFamily: SANS_MED, fontSize: 11, letterSpacing: 0.6 },

    // Hero
    heroWrap: { marginHorizontal: 0, marginBottom: 0, position: 'relative' },
    quoteOverlay: {
      position: 'absolute',
      bottom: 16, left: 22, right: 22,
    },
    quoteMain: {
      fontFamily: SERIF, fontSize: 22, fontStyle: 'italic', lineHeight: 30,
      letterSpacing: 0.2, marginBottom: 4,
    },
    quoteSub: {
      fontFamily: SERIF, fontSize: 14, fontStyle: 'italic', lineHeight: 20,
    },

    // Today's Climb card
    climbCard: {
      marginHorizontal: 16, marginTop: 16, marginBottom: 4,
      borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    },
    climbTopBar: { height: 3 },
    climbInner: { padding: 18 },
    climbHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    climbEye: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 },
    climbTitle: { fontFamily: SANS, fontSize: 20, letterSpacing: -0.4, lineHeight: 26 },
    streakBadge: {
      alignItems: 'center',
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 12, borderWidth: 1,
    },
    streakNum: { fontFamily: SANS, fontSize: 22, lineHeight: 26 },
    streakLabel: { fontFamily: SANS_MED, fontSize: 8, letterSpacing: 1, textAlign: 'center', marginTop: 2 },
    climbDesc: { fontFamily: SANS_REG, fontSize: 13, lineHeight: 20, marginBottom: 16 },
    climbBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 14, borderRadius: 12,
    },
    climbBtnText: { fontFamily: SANS, fontSize: 15, letterSpacing: 0.2 },

    // Last 7 days
    weekCard: {
      marginHorizontal: 16, marginTop: 10, marginBottom: 4,
      borderRadius: 18, borderWidth: 1, padding: 16,
    },
    weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    weekTitle: { fontFamily: SANS_MED, fontSize: 14 },
    weekCount: { fontFamily: SANS_MED, fontSize: 12 },
    weekDots: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    weekDayWrap: { alignItems: 'center', gap: 6 },
    weekDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5 },
    weekDayLabel: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 0.4 },
    motivationRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    motivationText: { fontFamily: SANS_REG, fontSize: 12, flex: 1, lineHeight: 18, fontStyle: 'italic' },

    // No roadmap CTA
    pathCard: {
      marginHorizontal: 16, marginTop: 16, marginBottom: 4,
      borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    },
    pathTopBar: { height: 3 },
    pathInner: { padding: 20 },
    pathEye: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 1.5, marginBottom: 8 },
    pathTitle: { fontFamily: SANS, fontSize: 22, letterSpacing: -0.4, lineHeight: 28, marginBottom: 10 },
    pathDesc: { fontFamily: SANS_REG, fontSize: 13, lineHeight: 20, marginBottom: 18 },
    pathBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
      paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12,
    },
    pathBtnText: { fontFamily: SANS, fontSize: 14, color: '#FFF', letterSpacing: 0.2 },

    // Search
    searchBox: {
      marginHorizontal: 16, marginTop: 16, marginBottom: 4,
      borderRadius: 14, borderWidth: 1, padding: 14, overflow: 'hidden',
    },
    searchAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: 14 },
    searchLabel: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 1, marginBottom: 10 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchInput: {
      flex: 1, fontFamily: SANS_REG, fontSize: 13,
      borderBottomWidth: 1, paddingVertical: 4,
    },
    searchRunBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
    searchRunTxt: { fontFamily: SANS_MED, fontSize: 12 },
    searchXBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    searchResults: { paddingHorizontal: 16, marginTop: 12 },

    // Sections
    section: { paddingHorizontal: 16, marginTop: 22 },
    empty: { fontFamily: SANS_REG, fontSize: 12, textAlign: 'center', paddingVertical: 28 },

    // Tunisia empty
    tnEmpty: { borderRadius: 12, borderWidth: 1, padding: 16 },
    tnEmptyTitle: { fontFamily: SANS_MED, fontSize: 12, marginBottom: 6 },
    tnEmptyDesc: { fontFamily: SANS_REG, fontSize: 11, lineHeight: 17 },

    // Salary card
    salaryCard: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  });
}
