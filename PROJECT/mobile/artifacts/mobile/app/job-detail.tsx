/**
 * Job Detail Screen
 * Tapped from home page job cards.
 * Shows full job info.
 */
'use no memo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SANS, SANS_MED, SANS_REG, type AppTheme } from '@/constants/theme';
import { getDemandHistory, getJobInfo, type TrendingJob, type JobInfo } from '@/lib/api/mobileApi';

type Job = TrendingJob;

const { width: SW } = Dimensions.get('window');

// ─── Demand line chart ─────────────────────────────────────────────────────────
function DemandChart({ slug, theme }: { slug: string; theme: AppTheme }) {
  const [chartData, setChartData] = useState<{
    dates: string[]; values: number[];
    dataSource?: 'live' | 'estimated'; currentOpenings?: number; growthPct?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDemandHistory(slug)
      .then(setChartData)
      .catch(() => setChartData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const W = SW - 40;
  const H = 140;
  const PAD = { top: 18, right: 12, bottom: 32, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const ch = makeChartStyles(theme);

  if (loading) {
    return (
      <View style={ch.card}>
        <View style={ch.topLine} />
        <Text style={ch.label}>DEMAND HISTORY · LOADING</Text>
        <View style={{ height: H, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={ch.loadingText}>Fetching market data...</Text>
        </View>
      </View>
    );
  }

  if (!chartData || chartData.values.length < 2) {
    return (
      <View style={ch.card}>
        <View style={ch.topLine} />
        <Text style={ch.label}>DEMAND HISTORY · NO DATA</Text>
        <View style={{ height: 60, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={ch.loadingText}>No history available yet</Text>
        </View>
      </View>
    );
  }

  const vals = chartData.values;
  const dates = chartData.dates;
  const isLive = chartData.dataSource === 'live';
  const currentOpenings = chartData.currentOpenings;
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  const pts = vals.map((v, i) => ({
    x: PAD.left + (i / (vals.length - 1)) * chartW,
    y: PAD.top + chartH - ((v - minV) / range) * chartH,
  }));

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cp1x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.4;
    const cp1y = pts[i - 1].y;
    const cp2x = pts[i].x - (pts[i].x - pts[i - 1].x) * 0.4;
    const cp2y = pts[i].y;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pts[i].x} ${pts[i].y}`;
  }
  const fillD = d + ` L ${pts[pts.length - 1].x} ${PAD.top + chartH} L ${pts[0].x} ${PAD.top + chartH} Z`;

  const trend = vals[vals.length - 1] - vals[0];
  const trendColor = trend >= 0 ? theme.accent : theme.warm;
  const labelIdxs = [0, Math.floor(vals.length / 2), vals.length - 1];
  const gridStroke = theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={ch.card}>
      <View style={ch.topLine} />
      <View style={ch.header}>
        <View style={{ gap: 2 }}>
          <Text style={ch.label}>DEMAND · 30 DAYS</Text>
          {currentOpenings != null && (
            <Text style={ch.subLabel}>
              {currentOpenings} live postings today
              {' · '}
              <Text style={{ color: isLive ? theme.accent : theme.textTertiary }}>
                {isLive ? '● LIVE' : '○ EST.'}
              </Text>
            </Text>
          )}
        </View>
        <View style={[ch.trendBadge, { borderColor: trendColor + '50', backgroundColor: trendColor + '15' }]}>
          <Feather name={trend >= 0 ? 'trending-up' : 'trending-down'} size={10} color={trendColor} />
          <Text style={[ch.trendText, { color: trendColor }]}>
            {trend >= 0 ? '+' : ''}{Math.round((trend / (vals[0] || 1)) * 100)}%
          </Text>
        </View>
      </View>

      <Svg width={W} height={H}>
        <Defs>
          <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={trendColor} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={trendColor} stopOpacity="0" />
          </SvgGradient>
        </Defs>

        {[0, 0.5, 1].map((f, i) => {
          const y = PAD.top + f * chartH;
          const v = Math.round(maxV - f * range);
          return (
            <React.Fragment key={i}>
              <Line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y} stroke={gridStroke} strokeWidth={1} />
              <SvgText x={PAD.left - 6} y={y + 4} fill={theme.textTertiary} fontSize={8} fontFamily={SANS_REG} textAnchor="end">
                {v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}
              </SvgText>
            </React.Fragment>
          );
        })}

        {labelIdxs.map((idx) => (
          <SvgText key={idx} x={pts[idx].x} y={PAD.top + chartH + 14} fill={theme.textTertiary} fontSize={7} fontFamily={SANS_REG} textAnchor="middle">
            {dates[idx]?.slice(5) ?? ''}
          </SvgText>
        ))}

        <Path d={fillD} fill="url(#areaGrad)" />
        <Path d={d} stroke={trendColor} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4} fill={trendColor} />
        <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={7} fill={trendColor} fillOpacity={0.25} />
      </Svg>
    </View>
  );
}

function makeChartStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 20, marginBottom: 16,
      backgroundColor: theme.surface,
      borderWidth: 1, borderColor: theme.border,
      borderRadius: 18, overflow: 'hidden',
      paddingTop: 14,
    },
    topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, backgroundColor: theme.accent + '80' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
    label: { fontFamily: SANS_MED, fontSize: 9, color: theme.textTertiary, letterSpacing: 1.2 },
    subLabel: { fontFamily: SANS_REG, fontSize: 9, color: theme.textTertiary },
    loadingText: { fontFamily: SANS_REG, fontSize: 12, color: theme.textSecondary },
    trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
    trendText: { fontFamily: SANS_MED, fontSize: 9 },
  });
}

function StatBlock({ icon, label, value, color, theme }: { icon: string; label: string; value: string; color: string; theme: AppTheme }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color + '20' }}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Text style={{ fontSize: 14, fontFamily: SANS, color: theme.text, textAlign: 'center' }}>{value}</Text>
      <Text style={{ fontSize: 10, fontFamily: SANS_REG, color: theme.textTertiary, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export default function JobDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ data: string }>();
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  let job: Job | null = null;
  try {
    job = params.data ? JSON.parse(params.data) : null;
  } catch {
    job = null;
  }

  useEffect(() => {
    if (job?.slug) {
      getJobInfo(job.slug).then(setJobInfo).catch(() => {});
    }
  }, [job?.slug]);

  useEffect(() => {
    setHeroImageFailed(false);
  }, [job?.image_url]);

  const DEMAND_LABELS: Record<string, { label: string; color: string }> = {
    surging:  { label: 'Surging 🔥', color: theme.warm },
    high:     { label: 'High demand', color: theme.accent },
    moderate: { label: 'Moderate', color: theme.gold },
    low:      { label: 'Low demand', color: theme.textTertiary },
  };

  const s = makeStyles(theme);

  if (!job) {
    return (
      <View style={[s.screen, s.center, { backgroundColor: theme.bg }]}>
        <Feather name="alert-circle" size={40} color={theme.warm} />
        <Text style={s.errTxt}>Could not load job details.</Text>
        <TouchableOpacity style={[s.backBtn2, { backgroundColor: theme.accent }]} onPress={() => router.back()}>
          <Text style={[s.backBtn2Txt, { color: theme.textOnAccent }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const demandInfo = DEMAND_LABELS[job.demand_index] ?? DEMAND_LABELS.moderate;
  const hasHeroImage = Boolean(job.image_url && !heroImageFailed);
  const salaryTnd = job.avg_salary_tnd
    ? `${Math.round(job.avg_salary_tnd / 1000).toLocaleString()}k TND / year`
    : 'Not disclosed';
  const salaryMonthly = job.avg_salary_tnd
    ? `≈ ${Math.round(job.avg_salary_tnd / 12 / 1000 * 10) / 10}k TND / month`
    : null;

  return (
    <View style={[s.screen, { backgroundColor: theme.bg }]}>

      {/* ── Back button (floating over image) ──────────────────────────────── */}
      <TouchableOpacity
        style={[s.backBtn, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Feather name="arrow-left" size={18} color="#FFFFFF" />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
      >
        {/* ── Hero image ───────────────────────────────────────────────────── */}
        <View style={s.hero}>
          {hasHeroImage ? (
            <Image
              source={{ uri: job.image_url }}
              contentFit="cover"
              style={StyleSheet.absoluteFillObject}
              transition={400}
              onError={() => setHeroImageFailed(true)}
            />
          ) : (
            <LinearGradient
              colors={[theme.panel2, theme.panel3, theme.bg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.55)', theme.bg]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFillObject} />
          <LinearGradient colors={[theme.accent + '50', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.heroCyanStrip} />

          <Reanimated.View entering={FadeInUp.delay(100).springify()} style={[s.heroContent, { paddingTop: insets.top + 60 }]}>
            <View style={s.heroBadges}>
              <View style={s.catBadge}>
                <Text style={s.catBadgeTxt}>{job.category}</Text>
              </View>
              <View style={[s.demandBadge, { borderColor: demandInfo.color + '60', backgroundColor: demandInfo.color + '25' }]}>
                <Text style={[s.demandTxt, { color: demandInfo.color }]}>{demandInfo.label}</Text>
              </View>
            </View>
            {job.seniority_level ? (
              <Text style={s.seniorityLabel}>{job.seniority_level.toUpperCase()}</Text>
            ) : null}
            <Text style={s.heroTitle}>{job.title}</Text>
          </Reanimated.View>
        </View>

        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <Reanimated.View entering={FadeInDown.delay(150).springify()} style={s.statsRow}>
          <StatBlock icon="credit-card" label="Annual Salary" value={salaryTnd} color={theme.accent} theme={theme} />
          {job.growth_pct ? (
            <StatBlock icon="trending-up" label="Growth" value={`+${job.growth_pct}%`} color={theme.accent} theme={theme} />
          ) : null}
          {job.openings ? (
            <StatBlock
              icon="briefcase"
              label="Openings"
              value={job.openings >= 1000 ? `${(job.openings / 1000).toFixed(1)}k` : String(job.openings)}
              color={theme.gold}
              theme={theme}
            />
          ) : null}
        </Reanimated.View>

        {/* ── Demand history chart ──────────────────────────────────────────── */}
        <DemandChart slug={job.slug} theme={theme} />

        {/* ── Monthly salary hint ───────────────────────────────────────────── */}
        {salaryMonthly ? (
          <Reanimated.View entering={FadeInDown.delay(200).springify()} style={s.monthlyCard}>
            <Feather name="calendar" size={16} color={theme.accent} />
            <View>
              <Text style={s.monthlyLabel}>Monthly equivalent</Text>
              <Text style={[s.monthlyVal, { color: theme.accent }]}>{salaryMonthly}</Text>
            </View>
          </Reanimated.View>
        ) : null}

        {/* ── About this role ───────────────────────────────────────────────── */}
        <Reanimated.View entering={FadeInDown.delay(250).springify()} style={s.section}>
          <Text style={s.sectionTitle}>About This Role</Text>
          <View style={s.descCard}>
            {job.description ? (
              <Text style={s.descTxt}>{job.description}</Text>
            ) : (
              <Text style={s.descTxtMuted}>
                {`${job.title} is one of the most sought-after roles in the ${job.category} industry. ` +
                 `Professionals in this field work at the intersection of technology and business, ` +
                 `driving innovation and delivering measurable impact.`}
              </Text>
            )}
          </View>
        </Reanimated.View>

        {/* ── Market overview ───────────────────────────────────────────────── */}
        <Reanimated.View entering={FadeInDown.delay(310).springify()} style={s.section}>
          <Text style={s.sectionTitle}>Market Overview</Text>
          <View style={s.marketGrid}>
            <View style={s.marketCard}>
              <Feather name="globe" size={18} color={theme.accent} />
              <Text style={s.marketCardTitle}>Global Demand</Text>
              <Text style={[s.marketCardVal, { color: demandInfo.color }]}>{demandInfo.label}</Text>
            </View>
            <View style={s.marketCard}>
              <Feather name="bar-chart-2" size={18} color={theme.accent} />
              <Text style={s.marketCardTitle}>YoY Growth</Text>
              <Text style={[s.marketCardVal, { color: theme.accent }]}>{job.growth_pct ? `+${job.growth_pct}%` : 'N/A'}</Text>
            </View>
            {jobInfo?.remote_friendly != null && (
              <View style={s.marketCard}>
                <Feather name="wifi" size={18} color={theme.gold} />
                <Text style={s.marketCardTitle}>Remote</Text>
                <Text style={[s.marketCardVal, { color: jobInfo.remote_friendly ? theme.accent : theme.textSecondary }]}>
                  {jobInfo.remote_friendly ? 'Friendly' : 'On-site'}
                </Text>
              </View>
            )}
            {jobInfo?.avg_interview_rounds && (
              <View style={s.marketCard}>
                <Feather name="users" size={18} color={theme.warm} />
                <Text style={s.marketCardTitle}>Interviews</Text>
                <Text style={[s.marketCardVal, { color: theme.text }]}>{jobInfo.avg_interview_rounds} rounds</Text>
              </View>
            )}
          </View>
        </Reanimated.View>

        {/* ── Required skills ───────────────────────────────────────────────── */}
        {jobInfo && jobInfo.required_skills.length > 0 && (
          <Reanimated.View entering={FadeInDown.delay(340).springify()} style={s.section}>
            <Text style={s.sectionTitle}>Required Skills</Text>
            <View style={s.pillGrid}>
              {jobInfo.required_skills.map((skill, i) => (
                <View key={i} style={[s.pill, { borderColor: theme.accent + '50', backgroundColor: theme.accent + '12' }]}>
                  <Text style={[s.pillTxt, { color: theme.accent }]}>{skill}</Text>
                </View>
              ))}
            </View>
            {jobInfo.tools.length > 0 && (
              <View style={[s.pillGrid, { marginTop: 8 }]}>
                {jobInfo.tools.map((tool, i) => (
                  <View key={i} style={[s.pill, { borderColor: theme.gold + '50', backgroundColor: theme.gold + '10' }]}>
                    <Text style={[s.pillTxt, { color: theme.gold }]}>{tool}</Text>
                  </View>
                ))}
              </View>
            )}
          </Reanimated.View>
        )}

        {/* ── Career path ────────────────────────────────────────────────────── */}
        {jobInfo && jobInfo.career_path.length > 0 && (
          <Reanimated.View entering={FadeInDown.delay(360).springify()} style={s.section}>
            <Text style={s.sectionTitle}>Career Path</Text>
            <View style={s.careerCard}>
              {jobInfo.career_path.map((step, i) => (
                <View key={i} style={s.careerStep}>
                  <View style={[s.careerDot, { backgroundColor: i === 0 ? theme.textTertiary : i === jobInfo.career_path.length - 1 ? theme.accent : theme.primary }]} />
                  {i < jobInfo.career_path.length - 1 && <View style={[s.careerLine, { backgroundColor: theme.border }]} />}
                  <Text style={s.careerStepTxt}>{step}</Text>
                </View>
              ))}
              {jobInfo.experience_years && (
                <Text style={s.careerExp}>Typical experience: {jobInfo.experience_years} years</Text>
              )}
            </View>
          </Reanimated.View>
        )}

      </ScrollView>
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1 },
    center: { alignItems: 'center', justifyContent: 'center', gap: 14 },
    errTxt: { color: theme.textSecondary, fontSize: 15, fontFamily: SANS_MED, textAlign: 'center' },
    backBtn2: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
    backBtn2Txt: { fontFamily: SANS, fontSize: 15 },

    backBtn: {
      position: 'absolute', left: 18, zIndex: 20,
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center', justifyContent: 'center',
    },

    hero: { height: 320, position: 'relative' },
    heroCyanStrip: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 2 },
    heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 24, zIndex: 3 },
    heroBadges: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    catBadge: { backgroundColor: 'rgba(27,43,95,0.75)', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    catBadgeTxt: { fontSize: 12, fontFamily: SANS, color: '#FFFFFF' },
    demandBadge: { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
    demandTxt: { fontSize: 12, fontFamily: SANS },
    seniorityLabel: { fontSize: 11, fontFamily: SANS, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.2, marginBottom: 6 },
    heroTitle: { fontSize: 26, fontFamily: SANS, color: '#FFFFFF', lineHeight: 34, letterSpacing: -0.4 },

    statsRow: {
      flexDirection: 'row', marginHorizontal: 20, marginTop: 20, marginBottom: 12,
      backgroundColor: theme.surface, borderRadius: 20, padding: 16,
      borderWidth: 1, borderColor: theme.border,
      gap: 4,
    },

    monthlyCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      marginHorizontal: 20, marginBottom: 8, padding: 14, borderRadius: 18,
      borderWidth: 1, borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    monthlyLabel: { fontSize: 11, fontFamily: SANS_REG, color: theme.textTertiary, marginBottom: 2 },
    monthlyVal: { fontSize: 14, fontFamily: SANS },

    section: { marginHorizontal: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 17, fontFamily: SANS, color: theme.text, marginBottom: 12, letterSpacing: -0.2 },
    descCard: { borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
    descTxt: { fontSize: 14, fontFamily: SANS_REG, color: theme.textSecondary, lineHeight: 22 },
    descTxtMuted: { fontSize: 14, fontFamily: SANS_REG, color: theme.textTertiary, lineHeight: 22, fontStyle: 'italic' },

    marketGrid: { flexDirection: 'row', gap: 10 },
    marketCard: {
      flex: 1, borderRadius: 18, padding: 16,
      borderWidth: 1, borderColor: theme.border, gap: 8,
      backgroundColor: theme.surface,
    },
    marketCardTitle: { fontSize: 12, fontFamily: SANS_MED, color: theme.textSecondary },
    marketCardVal: { fontSize: 17, fontFamily: SANS },

    pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    pillTxt: { fontSize: 12, fontFamily: SANS_MED },

    careerCard: {
      borderRadius: 18, padding: 20,
      borderWidth: 1, borderColor: theme.border,
      backgroundColor: theme.surface, gap: 0,
    },
    careerStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingBottom: 16 },
    careerDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, flexShrink: 0 },
    careerLine: { position: 'absolute', left: 4, top: 15, width: 2, height: 24 },
    careerStepTxt: { flex: 1, fontSize: 14, fontFamily: SANS_REG, color: theme.textSecondary, lineHeight: 20 },
    careerExp: { fontSize: 12, fontFamily: SANS_REG, color: theme.textTertiary, marginTop: 4, fontStyle: 'italic' },
  });
}
