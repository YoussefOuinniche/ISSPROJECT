'use no memo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import Reanimated, {
  FadeInDown,
  FadeInLeft,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SANS, SANS_MED, SANS_REG } from '@/constants/theme';
import { getBottomContentPadding } from '@/lib/layout';
import {
  getHomeData,
  searchJobsWithAi,
  type HomeData,
  type TrendingJob,
  type JobSearchResult,
} from '@/lib/api/mobileApi';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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
  if (!roadmap) return { num: '001', label: 'Plan Ready' };
  const { progress_pct, estimated_weeks } = roadmap;
  const totalDays = (estimated_weeks ?? 12) * 7;
  const currentDay = Math.max(1, Math.round((progress_pct / 100) * totalDays));
  const num = String(currentDay).padStart(3, '0');
  if (progress_pct < 5) return { num, label: 'Plan Ready' };
  if (progress_pct < 25) return { num, label: 'Getting Started' };
  if (progress_pct < 50) return { num, label: 'Building Momentum' };
  if (progress_pct < 75) return { num, label: 'Strong Progress' };
  return { num, label: 'Nearly Done' };
}

// ─── Progress Hero Illustration ───────────────────────────────────────────────
function BrandHero({ firstName, theme }: { firstName: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[bh.card, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
      <View style={bh.copy}>
        <Text style={[bh.kicker, { color: theme.accent }]}>TODAY</Text>
        <Text style={[bh.title, { color: theme.text }]}>Focus your next step</Text>
        <Text style={[bh.body, { color: theme.textSecondary }]}>
          One useful action at a time, {firstName}.
        </Text>
      </View>
      <View style={[bh.symbolBadge, { backgroundColor: theme.accent + '14', borderColor: theme.accent + '32' }]}>
        <Feather name="sunrise" size={26} color={theme.accent} />
      </View>
    </View>
  );
}

const bh = StyleSheet.create({
  card: {
    minHeight: 154,
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  copy: { flex: 1 },
  kicker: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 1.3, marginBottom: 8 },
  title: { fontFamily: SANS, fontSize: 24, lineHeight: 30, marginBottom: 8 },
  body: { fontFamily: SANS_REG, fontSize: 13, lineHeight: 20 },
  symbolBadge: {
    width: 74,
    height: 74,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

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
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(job.image_url && !imageFailed);

  return (
    <Reanimated.View entering={FadeInLeft.delay(index * 70).springify().damping(18)} style={anim}>
      <Pressable
        style={[jc.card, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}
        onPressIn={() => { scale.value = withSpring(0.98); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => router.push({ pathname: '/job-detail', params: { data: JSON.stringify(job) } })}
      >
        <View style={[jc.imageCell, { backgroundColor: theme.accent + '14', borderColor: theme.accent + '30' }]}>
          {hasImage ? (
            <>
              <Image
                source={{ uri: job.image_url }}
                contentFit="cover"
                style={StyleSheet.absoluteFillObject}
                transition={250}
                onError={() => setImageFailed(true)}
              />
              <LinearGradient
                colors={['rgba(3,7,18,0.08)', 'rgba(3,7,18,0.44)']}
                style={StyleSheet.absoluteFillObject}
              />
            </>
          ) : (
            <Feather name="briefcase" size={20} color={theme.accent} />
          )}
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
  imageCell: {
    width: 64,
    height: 76,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    overflow: 'hidden',
  },
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
          <View style={s.brandRow}>
            <View style={[s.headerSymbolBadge, { backgroundColor: theme.accent + '14', borderColor: theme.accent + '32' }]}>
              <Feather name="compass" size={20} color={theme.accent} />
            </View>
            <View>
            <Text style={[s.brandEye, { color: theme.textTertiary }]}>NEXAPATH</Text>
            <Text style={[s.brandTitle, { color: theme.text }]}>Home</Text>
            </View>
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

        {/* ── Progress Hero ── */}
        <BrandHero firstName={firstName} theme={theme} />

        {/* ── TODAY'S STEP — conditional on roadmap ── */}
        {roadmap ? (
          <Reanimated.View entering={FadeInDown.delay(80).springify()}>
            <View style={[s.planCard, { backgroundColor: theme.surfaceCard, borderColor: theme.border }]}>
              {/* Accent top bar */}
              <View style={[s.planTopBar, { backgroundColor: theme.accent }]} />
              <View style={s.planInner}>
                <View style={s.planHeadRow}>
                  <View>
                    <Text style={[s.planEye, { color: theme.accent }]}>TODAY'S STEP</Text>
                    <Text style={[s.planTitle, { color: theme.text }]}>One focused task.{'\n'}Every single day.</Text>
                  </View>
                  <View style={[s.streakBadge, { backgroundColor: theme.warmLight, borderColor: theme.warm + '50' }]}>
                    <Text style={[s.streakNum, { color: theme.warm }]}>{roadmap.completed_steps}</Text>
                    <Text style={[s.streakLabel, { color: theme.warm + 'AA' }]}>DAY{'\n'}STREAK</Text>
                  </View>
                </View>
                <Text style={[s.planDesc, { color: theme.textSecondary }]}>
                  15 minutes. One concept. You start fresh every morning — that's the whole deal.
                </Text>
                <Pressable
                  style={[s.planBtn, { backgroundColor: theme.accent }]}
                  onPress={() => router.push('/(tabs)/roadmap')}
                >
                  <Text style={[s.planBtnText, { color: theme.textOnAccent }]}>Begin today's step</Text>
                </Pressable>
              </View>
            </View>

            {/* ── Last 7 Days ── */}
            <Reanimated.View entering={FadeInDown.delay(140).springify()}>
              <View style={[s.weekCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                <View style={s.weekHeader}>
                  <Text style={[s.weekTitle, { color: theme.text }]}>Steps completed</Text>
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
                <Text style={[s.pathTitle, { color: theme.text }]}>Map your plan.{'\n'}Start clean.</Text>
                <Text style={[s.pathDesc, { color: theme.textSecondary }]}>
                  Chat with NexaPath AI to build your personalized learning roadmap. Takes about 5 minutes.
                </Text>
                <Pressable
                  style={[s.pathBtn, { backgroundColor: theme.warm }]}
                  onPress={() => router.push('/onboarding-chat')}
                >
                  <Feather name="map" size={15} color="#FFF" />
                  <Text style={s.pathBtnText}>Build my roadmap</Text>
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
    brandTitle: { fontFamily: SANS, fontSize: 34, letterSpacing: 0 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerSymbolBadge: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
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

    planCard: {
      marginHorizontal: 16, marginTop: 16, marginBottom: 4,
      borderRadius: 18, borderWidth: 1, overflow: 'hidden',
    },
    planTopBar: { height: 3 },
    planInner: { padding: 18 },
    planHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    planEye: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 },
    planTitle: { fontFamily: SANS, fontSize: 20, letterSpacing: 0, lineHeight: 26 },
    streakBadge: {
      alignItems: 'center',
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 12, borderWidth: 1,
    },
    streakNum: { fontFamily: SANS, fontSize: 22, lineHeight: 26 },
    streakLabel: { fontFamily: SANS_MED, fontSize: 8, letterSpacing: 1, textAlign: 'center', marginTop: 2 },
    planDesc: { fontFamily: SANS_REG, fontSize: 13, lineHeight: 20, marginBottom: 16 },
    planBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 14, borderRadius: 12,
    },
    planBtnText: { fontFamily: SANS, fontSize: 15, letterSpacing: 0 },

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
