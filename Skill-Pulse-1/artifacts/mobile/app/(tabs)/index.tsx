import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { getBottomContentPadding } from '@/lib/layout';
import { useAIProfile } from '@/hooks/useAIProfile';
import { ProfileEvolvingCard, EvolvingTrait } from '@/components/profile/ProfileEvolvingCard';

const ProgressBar = ({ progress }: { progress: number }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progress, anim]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressBarBg}>
      <Animated.View style={[styles.progressBarFill, { width }]} />
    </View>
  );
};

const StatCard = ({ icon, title, value }: { icon: any; title: string; value: string | number }) => (
  <View style={styles.statCard}>
    <View style={styles.statIconContainer}>
      <Feather name={icon} size={20} color={Colors.primaryDark} />
    </View>
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  </View>
);

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { profile, summary, explicitProfile, loading, error, refreshProfile } = useAIProfile();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (profile) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [profile, fadeAnim]);

  const handleRefresh = () => {
    refreshProfile();
  };

  const ai = profile;
  const confidence = typeof ai?.confidence === 'number' ? ai.confidence : 0;
  const confidencePercent = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
  const skills = Array.isArray(ai?.skills) ? ai.skills : [];
  const gaps = Array.isArray(ai?.skill_gaps) ? ai.skill_gaps : [];
  const recommendations = Array.isArray(ai?.recommendations) ? ai.recommendations : [];
  const goals = Array.isArray(ai?.goals) ? ai.goals : [];
  const interests = Array.isArray(ai?.interests) ? ai.interests : [];
  const experienceYears = typeof ai?.experience_years === 'number' ? ai.experience_years : null;
  const targetRole =
    summary?.target_role ||
    explicitProfile?.target_role ||
    ai?.target_role ||
    goals[0] ||
    'Set a target role';
  const summaryStrengths =
    Array.isArray(summary?.strengths) && summary.strengths.length > 0
      ? summary.strengths
      : skills.slice(0, 3).map((skill) => skill.skill_name);
  const urgentGaps =
    Array.isArray(summary?.urgent_gaps) && summary.urgent_gaps.length > 0
      ? summary.urgent_gaps
      : gaps.slice(0, 3).map((gap) => gap.skill_name);
  const nextStep =
    summary?.next_step ||
    (recommendations[0]?.content || recommendations[0]?.title) ||
    null;
  const profileCompletionHint =
    summary?.profile_completion_hint ||
    'Chat with the AI Assistant to automatically discover more goals and interests based on your profile!';

  const renderSkillBadge = (level: string) => {
    const lv = level.toLowerCase();
    let color = Colors.skillBeginner;
    if (lv === 'intermediate') color = Colors.skillIntermediate;
    if (lv === 'advanced') color = Colors.skillAdvanced;
    if (lv === 'expert') color = Colors.skillExpert;
    
    return (
      <View style={[styles.badge, { borderColor: color, backgroundColor: color + '15' }]}>
        <View style={[styles.badgeDot, { backgroundColor: color }]} />
        <Text style={[styles.badgeText, { color }]}>{level}</Text>
      </View>
    );
  };

  const evolvingTraits: EvolvingTrait[] = useMemo(() => {
    const traits: EvolvingTrait[] = [];

    skills.slice(0, 2).forEach((skill, index) => {
      traits.push({
        id: `skill-${index}-${skill.skill_name}`,
        category: 'skill',
        label: skill.skill_name,
        state: confidencePercent >= 70 ? 'confirmed' : 'new',
      });
    });

    goals.slice(0, 1).forEach((goal, index) => {
      traits.push({
        id: `goal-${index}-${goal}`,
        category: 'goal',
        label: String(goal),
        state: 'updated',
      });
    });

    interests.slice(0, 1).forEach((interest, index) => {
      traits.push({
        id: `interest-${index}-${interest}`,
        category: 'interest',
        label: String(interest),
        state: 'new',
      });
    });

    if (typeof experienceYears === 'number' && experienceYears > 0) {
      traits.push({
        id: 'experience-years',
        category: 'experience',
        label: `${experienceYears} years of experience`,
        state: 'confirmed',
      });
    }

    return traits.slice(0, 4);
  }, [confidencePercent, experienceYears, goals, interests, skills]);

  if (loading && !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-triangle" size={48} color={Colors.danger} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refreshProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.surface, Colors.backgroundSecondary, Colors.background]}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom), paddingTop: insets.top + 20 }}
        refreshControl={<RefreshControl refreshing={loading && !!profile} onRefresh={handleRefresh} tintColor={Colors.primary} />}
      >
        <Animated.View style={[{ opacity: fadeAnim }, styles.content]}>
          
          <View style={styles.header}>
            <Text style={styles.greeting}>AI Profile Insights</Text>
            <Text style={styles.subtitle}>Your personalized career roadmap</Text>
          </View>

          {/* Main Confidence Card */}
          <LinearGradient colors={Colors.gradientPrimary} style={styles.confidenceCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.confHeader}>
              <Feather name="award" size={24} color={Colors.textInverse} />
              <Text style={styles.confTitle}>AI Profile Confidence</Text>
            </View>
            <View style={styles.confScoreWrap}>
              <Text style={styles.confScore}>{confidencePercent}%</Text>
              <Text style={styles.confScoreLabel}>Match</Text>
            </View>
            <ProgressBar progress={confidencePercent} />
          </LinearGradient>

          {/* Experience & Goals Row */}
          <View style={styles.row}>
            <StatCard icon="briefcase" title="Experience" value={`${ai?.experience_years || 0} yrs`} />
            <StatCard icon="target" title="Career Goals" value={ai?.goals?.length || 0} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Focus Right Now</Text>
            <View style={styles.focusGrid}>
              <View style={styles.focusCard}>
                <Text style={styles.focusLabel}>Target role</Text>
                <Text style={styles.focusValue}>{targetRole}</Text>
              </View>
              <View style={styles.focusCard}>
                <Text style={styles.focusLabel}>Next step</Text>
                <Text style={styles.focusBody}>
                  {nextStep || "Generate a roadmap or ask the AI assistant for the next concrete move."}
                </Text>
              </View>
            </View>
          </View>

          {/* AI Evolving Profile Card */}
          <ProfileEvolvingCard traits={evolvingTraits} />

          {summaryStrengths.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Strengths</Text>
              <View style={styles.chipRow}>
                {summaryStrengths.map((strength) => (
                  <View key={strength} style={styles.strengthChip}>
                    <Feather name="check-circle" size={14} color={Colors.success} />
                    <Text style={styles.strengthChipText}>{strength}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {urgentGaps.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Urgent Gaps</Text>
              <View style={styles.card}>
                {urgentGaps.map((gap, index) => (
                  <View key={`${gap}-${index}`} style={[styles.urgentGapRow, index !== urgentGaps.length - 1 && styles.borderBottom]}>
                    <View style={styles.urgentGapIcon}>
                      <Feather name="alert-triangle" size={15} color={Colors.warning} />
                    </View>
                    <Text style={styles.urgentGapText}>{gap}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Top Skills Section */}
          {skills.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Skills</Text>
              <View style={styles.card}>
                {skills.map((s, i) => (
                  <View key={i} style={[styles.skillRow, i !== skills.length - 1 && styles.borderBottom]}>
                    <Text style={styles.skillText}>{s.skill_name}</Text>
                    {renderSkillBadge(s.proficiency_level)}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Skill Gaps Section */}
          {gaps.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Identified Gaps</Text>
                <Feather name="trending-up" size={20} color={Colors.warning} />
              </View>
              <View style={styles.card}>
                {gaps.map((g, i) => (
                  <View key={i} style={[styles.gapRow, i !== gaps.length - 1 && styles.borderBottom]}>
                    <View style={styles.gapHeader}>
                      <Text style={styles.gapName}>{g.skill_name}</Text>
                      <Text style={styles.gapDomain}>{g.domain}</Text>
                    </View>
                    <Text style={styles.gapReason}>{g.reason}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended For You</Text>
              {recommendations.map((rec, i) => (
                <View key={i} style={[styles.card, styles.recCard]}>
                  <View style={styles.recIconWrap}>
                    <Feather name={rec.type.toLowerCase().includes('course') ? 'book-open' : 'briefcase'} size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.recContent}>
                    <View style={styles.recHeader}>
                      <Text style={styles.recTitle}>{rec.title}</Text>
                      {rec.priority === 'high' && (
                        <View style={styles.priorityBadge}>
                          <Text style={styles.priorityText}>High</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.recText}>{rec.content}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Empty Goals / Interests hint */}
          {goals.length === 0 && (
            <View style={styles.emptyHint}>
              <Feather name="message-circle" size={24} color={Colors.textTertiary} />
              <Text style={styles.emptyHintText}>
                {profileCompletionHint}
              </Text>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, padding: 24 },
  content: { paddingHorizontal: 20 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 15, color: Colors.textSecondary },
  
  confidenceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  confHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  confTitle: { color: Colors.textInverse, fontSize: 16, fontWeight: '600', opacity: 0.9 },
  confScoreWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 24 },
  confScore: { fontSize: 48, fontWeight: '800', color: Colors.textInverse, letterSpacing: -1 },
  confScoreLabel: { fontSize: 16, color: Colors.textInverse, opacity: 0.8, marginBottom: 8 },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.surface, borderRadius: 4 },

  row: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  focusGrid: { gap: 12 },
  focusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  focusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  focusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  focusBody: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  statTitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  section: { marginBottom: 24 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  strengthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.successLight,
  },
  strengthChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  
  card: { backgroundColor: Colors.surface, borderRadius: 20, padding: 16, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  
  skillRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  skillText: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  gapRow: { paddingVertical: 12 },
  gapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  gapName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  gapDomain: { fontSize: 12, color: Colors.textTertiary, backgroundColor: Colors.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  gapReason: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 4 },
  urgentGapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  urgentGapIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningLight,
  },
  urgentGapText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  recCard: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  recIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  recContent: { flex: 1 },
  recHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  recTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1, marginRight: 8 },
  recText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  priorityBadge: { backgroundColor: Colors.dangerLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  priorityText: { color: Colors.danger, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  emptyHint: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.borderLight, borderStyle: 'dashed', marginTop: 8 },
  emptyHintText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  errorText: { marginTop: 16, fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: 100 },
  retryText: { color: Colors.textInverse, fontWeight: '600', fontSize: 16 },
});
