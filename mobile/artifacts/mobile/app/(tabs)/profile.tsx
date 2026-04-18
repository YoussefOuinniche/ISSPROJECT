import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { AnimatedSection } from "@/components/AnimatedSection";
import { MotionPressable } from "@/components/MotionPressable";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SkillBar } from "@/components/ui/SkillBar";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import { useAIProfile } from "@/hooks/useAIProfile";
import { getBottomContentPadding } from "@/lib/layout";
import { computeProfileCompleteness } from "@/lib/profileScore";
import { clearMobileAccessToken } from "@/lib/api/runtime";
import {
  useGetCurrentUser,
  useGetUserDashboard,
  useLogoutAuth,
} from "@workspace/api-client-react";

function MenuItem({
  icon,
  label,
  sublabel,
  color = Colors.textSecondary,
  onPress,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: `${color}1A` }]}>
        <Feather name={icon as never} size={18} color={color} />
      </View>
      <View style={styles.menuLabelWrap}>
        <Text style={styles.menuLabel}>{label}</Text>
        {sublabel ? <Text style={styles.menuSublabel}>{sublabel}</Text> : null}
      </View>
      <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
    </Pressable>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <View style={styles.infoRow}>
      {icon && <Feather name={icon as never} size={14} color={Colors.textTertiary} style={styles.infoRowIcon} />}
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const logoutMutation = useLogoutAuth();

  const { data: currentUserResponse } = useGetCurrentUser();
  const { data: dashboardResponse, refetch } = useGetUserDashboard();
  const { profile: aiProfile, summary: aiSummary } = useAIProfile();

  const currentUserEnvelope =
    currentUserResponse && typeof currentUserResponse === "object" && "data" in currentUserResponse
      ? (currentUserResponse.data as unknown as Record<string, unknown>)
      : {};

  const currentUser =
    currentUserEnvelope.user && typeof currentUserEnvelope.user === "object"
      ? (currentUserEnvelope.user as Record<string, unknown>)
      : {};

  const dashboard =
    dashboardResponse && typeof dashboardResponse === "object" && "data" in dashboardResponse
      ? (dashboardResponse.data as unknown as Record<string, unknown>)
      : {};

  const profile =
    dashboard.profile && typeof dashboard.profile === "object"
      ? (dashboard.profile as Record<string, unknown>)
      : {};

  const fullName = String(
    profile.full_name ?? currentUser.full_name ?? currentUser.email ?? "NexaPath User"
  );
  const title = String(profile.title ?? "Career Builder");
  const company = String(profile.domain ?? "NexaPath");
  const email = String(currentUser.email ?? "No email available");
  
  // Format joined date beautifully
  const rawJoinDate = String(currentUser.created_at || new Date().toISOString());
  const joinDateObj = new Date(rawJoinDate);
  const joined = !isNaN(joinDateObj.getTime()) 
    ? joinDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : "Recently";

  // Bio or fallback intro
  const bio = String(profile.bio || "No bio added yet. Tell us about your journey.");
  const experienceLevel = String(profile.experience_level || "Not specified").replace("_", " ");

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const skills = Array.isArray(dashboard.skills)
    ? dashboard.skills
        .map((item) =>
          typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {}
        )
        .map((skill, index) => {
          const rawLevel =
            typeof skill.proficiency_level === "number"
              ? skill.proficiency_level
              : typeof skill.level === "number"
              ? skill.level
              : 0;
          const level =
            rawLevel <= 5 ? Math.round((rawLevel / 5) * 100) : Math.max(0, Math.min(100, rawLevel));

          return {
            id: String(skill.id ?? `skill-${index}`),
            name: String(skill.name ?? skill.full_name ?? `Skill ${index + 1}`),
            level,
          };
        })
    : [];

  const skillScore = computeProfileCompleteness(profile, skills);
  
  // AI Derived goals
  const aiTopGoal =
    aiSummary?.top_goal ||
    String(profile.explicit_target_role || "") ||
    (Array.isArray(aiProfile?.goals) && aiProfile.goals.length > 0 ? aiProfile.goals[0] : "Set your target role");
  
  const aiTopSkills = Array.isArray(aiProfile?.skills) ? aiProfile.skills.slice(0, 4) : [];

  const isTablet = width >= 760;
  const isWide = width >= 980;
  const horizontalPadding = width >= 1200 ? 34 : width >= 980 ? 28 : 20;
  const topPadding = Platform.OS === "web" ? insets.top + 54 : insets.top + 10;

  const onSignOut = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Clear local session even if remote logout fails.
    }

    await clearMobileAccessToken();
    queryClient.clear();
    router.replace("/login");
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding,
            paddingHorizontal: horizontalPadding,
            paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedSection style={styles.header} variant="up">
          <View style={styles.headerSide}>
            <Image
              source={require("@/assets/images/logo-nexapath.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerTitleWrap} pointerEvents="none">
            <Text style={styles.screenTitle}>My Profile</Text>
          </View>
          <Pressable style={styles.settingsBtn} onPress={() => router.push("/settings")}>
            <Feather name="settings" size={20} color={Colors.textSecondary} />
          </Pressable>
        </AnimatedSection>

        {/* SECTION A: Identity Header */}
        <AnimatedSection delay={40}>
          <GlassCard style={styles.heroCard} padding={isTablet ? 24 : 20} radius={24}>
            <View style={styles.heroTopRow}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials || "NP"}</Text>
                </View>
                <View style={styles.statusDot} />
              </View>
              
              <MotionPressable
                onPress={() => router.push("/settings")}
                containerStyle={styles.editBtn}
              >
                <Feather name="edit-3" size={14} color={Colors.textPrimary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </MotionPressable>
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{fullName}</Text>
              <Text style={styles.heroTitle}>{title}</Text>
              
              <View style={styles.heroBadgeRow}>
                <Badge label={company} variant="neutral" size="sm" />
                <Badge label={`${skills.length} Skills Logged`} variant="primary" size="sm" />
              </View>

              <Text style={styles.heroBio}>{bio}</Text>
            </View>
          </GlassCard>
        </AnimatedSection>

        {/* SECTION B: Main Information */}
        <AnimatedSection delay={80}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <GlassCard style={styles.infoCard} padding={16} radius={20}>
            <InfoRow icon="mail" label="Email Address" value={email} />
            <View style={styles.divider} />
            <InfoRow icon="briefcase" label="Experience" value={experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)} />
            <View style={styles.divider} />
            <InfoRow icon="calendar" label="Member Since" value={joined} />
            <View style={styles.divider} />
            <InfoRow icon="target" label="Target Goal" value={aiTopGoal} />
          </GlassCard>
        </AnimatedSection>

        <View style={[styles.gridContainer, isWide && styles.gridWide]}>
          {/* SECTION D: Stats / Activity */}
          <AnimatedSection delay={120} style={[styles.gridCell, isWide && styles.gridCellWide]}>
            <Text style={styles.sectionTitle}>Activity Score</Text>
            <GlassCard style={styles.statsCard} padding={20} radius={20}>
              <View style={styles.scoreLayout}>
                <ScoreRing
                  score={skillScore}
                  size={96}
                  strokeWidth={8}
                  primaryColor={Colors.accentTertiary}
                  trackColor={Colors.backgroundSecondary}
                  label="SCORE"
                />
                <View style={styles.statsDetails}>
                  <Text style={styles.statsHeading}>Profile Strength</Text>
                  <Text style={styles.statsDesc}>
                    Keep adding skills and running AI evaluations to boost your ranking.
                  </Text>
                  <View style={styles.statsMetricRow}>
                    <Feather name="trending-up" size={14} color={Colors.success} />
                    <AnimatedCounter
                      value={Math.max(1, Math.round(skillScore / 18))}
                      prefix="+"
                      style={styles.statsMetricValue}
                    />
                    <Text style={styles.statsMetricLabel}>pts this week</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          </AnimatedSection>

          {/* SECTION C: Skills / Interests */}
          <AnimatedSection delay={160} style={[styles.gridCell, isWide && styles.gridCellWide]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Top Skills</Text>
              <Pressable onPress={() => router.push("/(tabs)/skills")}>
                <Text style={styles.actionText}>Manage</Text>
              </Pressable>
            </View>
            <GlassCard style={styles.skillsCard} padding={16} radius={20}>
              {skills.length > 0 ? (
                <>
                  <View style={styles.skillsList}>
                    {skills.slice(0, 4).map((skill, index) => (
                      <View key={skill.id} style={[styles.skillItem, index > 0 && styles.skillItemBorder]}>
                        <SkillBar
                          label={skill.name}
                          current={skill.level}
                          color={
                            skill.level >= 80
                              ? Colors.success
                              : skill.level >= 60
                              ? Colors.primary
                              : Colors.accentTertiary
                          }
                          height={6}
                        />
                      </View>
                    ))}
                  </View>
                  
                  {aiTopSkills.length > 0 && (
                    <View style={styles.aiRecommendedContainer}>
                      <Text style={styles.aiRecommendedLabel}>
                        <Feather name="cpu" size={12} color={Colors.accentTertiary} /> AI Focus Areas
                      </Text>
                      <View style={styles.aiTagRow}>
                        {aiTopSkills.map((st) => (
                          <Badge key={st.skill_name} label={st.skill_name} variant="neutral" size="sm" />
                        ))}
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Feather name="target" size={32} color={Colors.border} />
                  <Text style={styles.emptyText}>No skills tracked yet.</Text>
                  <MotionPressable containerStyle={[styles.emptyBtn, { overflow: "hidden" }]} onPress={() => router.push("/(tabs)/skills")}>
                    <LinearGradient
                      colors={Colors.gradientAccentTertiary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={[styles.emptyBtnText, { zIndex: 1 }]}>Add Skills</Text>
                  </MotionPressable>
                </View>
              )}
            </GlassCard>
          </AnimatedSection>
        </View>

        {/* SECTION E: Settings / Actions */}
        <AnimatedSection delay={200}>
          <Text style={styles.sectionTitle}>Account & Settings</Text>
          <GlassCard style={styles.menuCard} padding={4} radius={20}>
            <MenuItem
              icon="sliders"
              label="Preferences"
              sublabel="App settings and notifications"
              color={Colors.primary}
              onPress={() => router.push("/settings")}
            />
            <MenuItem
              icon="star"
              label="Saved Recommendations"
              sublabel="View your past AI insights"
              color={Colors.warning}
              onPress={() => router.push("/recommendations")}
            />
            <MenuItem
              icon="shield"
              label="Privacy & Security"
              sublabel="Manage sessions and tokens"
              color={Colors.success}
              onPress={() => router.push("/settings")}
            />
            <MenuItem
              icon="log-out"
              label="Sign Out"
              sublabel="End your current session"
              color={Colors.danger}
              onPress={onSignOut}
            />
          </GlassCard>
        </AnimatedSection>

        <AnimatedSection delay={240}>
          <MotionPressable containerStyle={styles.refreshBtn} onPress={() => refetch()}>
            <Feather name="refresh-cw" size={16} color={Colors.textSecondary} />
            <Text style={styles.refreshBtnText}>Synchronize Data</Text>
          </MotionPressable>
        </AnimatedSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    gap: 20, // Increased gap for better separation of sections
  },
  header: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerSide: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  logo: {
    width: 38,
    height: 38,
  },
  headerTitleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.2,
    fontSize: 24,
    color: Colors.textPrimary,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  
  // SECTION TITLE
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: -4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 2,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  actionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accentTertiary,
    marginRight: 4,
  },

  // HERO CARD
  heroCard: {
    marginTop: 4,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accentTertiary,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
  },
  statusDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: Colors.surface,
    backgroundColor: Colors.success,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  heroInfo: {
    gap: 4,
  },
  heroName: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  heroTitle: {
    fontSize: 16,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  heroBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  heroBio: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },

  // INFO CARD
  infoCard: {
    gap: 0,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoRowIcon: {
    marginRight: 10,
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  infoValue: {
    flex: 1.5,
    textAlign: "right",
    fontSize: 14,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },

  // GRID FOR STATS/SKILLS
  gridContainer: {
    gap: 20,
  },
  gridWide: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gridCell: {
    width: "100%",
  },
  gridCellWide: {
    width: "48%",
  },

  // STATS CARD
  statsCard: {
    minHeight: 160,
  },
  scoreLayout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
  },
  statsDetails: {
    flex: 1,
    paddingTop: 4,
  },
  statsHeading: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statsDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  statsMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.success}1A`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statsMetricValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
  },
  statsMetricLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.success,
  },

  // SKILLS CARD
  skillsCard: {
    minHeight: 160,
  },
  skillsList: {
    gap: 0,
  },
  skillItem: {
    paddingVertical: 10,
  },
  skillItemBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  aiRecommendedContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  aiRecommendedLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  aiTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  emptyBtn: {
    backgroundColor: Colors.accentTertiary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  emptyBtnText: {
    color: Colors.background,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  // MENU CARD
  menuCard: {
    marginTop: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabelWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textPrimary,
  },
  menuSublabel: {
    fontSize: 12,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textTertiary,
    marginTop: 1,
  },
  
  // REFRESH
  refreshBtn: {
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 10,
  },
  refreshBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Newsreader_500Medium",
  },
});
