import { useQuery } from "@tanstack/react-query";
import { useGetCurrentUser } from "@workspace/api-client-react";
import React, {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedSection } from "../../components/AnimatedSection";
import { AiInsightPanel } from "../../components/home/AiInsightPanel";
import { HomeHeader } from "../../components/home/HomeHeader";
import { ProjectStrip } from "../../components/home/ProjectStrip";
import { RoleHero } from "../../components/home/RoleHero";
import { SalaryLandscape } from "../../components/home/SalaryLandscape";
import { SkillsCluster } from "../../components/home/SkillsCluster";
import {
  DEFAULT_HOME_COUNTRY_CODES,
  HOME_COUNTRY_OPTIONS,
  HOME_ROLE_OPTIONS,
  MAX_HOME_COUNTRIES,
  MIN_HOME_COUNTRIES,
  getCountryNames,
  resolveInitialHomeRole,
  sortCountryCodes,
} from "../../constants/homeIntelligence";
import Colors from "../../constants/colors";
import { alpha } from "../../constants/theme";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useAIProfile } from "../../hooks/useAIProfile";
import { getBottomContentPadding } from "../../lib/layout";
import { getAiRoleSnapshot } from "../../services/aiRoleSnapshot";

function buildGreeting(fullName: string | null | undefined) {
  const hour = new Date().getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = typeof fullName === "string" ? fullName.trim().split(/\s+/)[0] : "";
  return firstName ? `${salutation}, ${firstName}` : salutation;
}

function HomeLoadingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={Colors.textPrimary} size="large" />
      <Text style={styles.stateTitle}>Generating live role briefing</Text>
      <Text style={styles.stateText}>Your local Qwen 2.5 3B model is preparing the market snapshot.</Text>
    </View>
  );
}

function HomeErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.stateTitle}>Role briefing unavailable</Text>
      <Text style={styles.stateText}>{message}</Text>
      <Text onPress={onRetry} style={styles.retryButton}>
        Retry
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const currentUserQuery = useGetCurrentUser();
  const { profile, summary, explicitProfile } = useAIProfile();
  const [didChooseRole, setDidChooseRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState(() =>
    resolveInitialHomeRole([
      explicitProfile?.target_role,
      summary?.target_role,
      profile?.target_role,
      profile?.learning_roadmap?.role,
    ])
  );
  const [selectedCountryCodes, setSelectedCountryCodes] = useState<string[]>([
    ...DEFAULT_HOME_COUNTRY_CODES,
  ]);

  const currentUserEnvelope =
    currentUserQuery.data && typeof currentUserQuery.data === "object" && "data" in currentUserQuery.data
      ? (currentUserQuery.data.data as unknown as Record<string, unknown>)
      : {};
  const currentUser =
    currentUserEnvelope.user && typeof currentUserEnvelope.user === "object"
      ? (currentUserEnvelope.user as Record<string, unknown>)
      : {};

  const preferredRole = useMemo(
    () =>
      resolveInitialHomeRole([
        explicitProfile?.target_role,
        summary?.target_role,
        profile?.target_role,
        profile?.learning_roadmap?.role,
      ]),
    [
      explicitProfile?.target_role,
      profile?.learning_roadmap?.role,
      profile?.target_role,
      summary?.target_role,
    ]
  );

  useEffect(() => {
    if (didChooseRole || !preferredRole || preferredRole === selectedRole) {
      return;
    }

    setSelectedRole(preferredRole);
  }, [didChooseRole, preferredRole, selectedRole]);

  const selectedCountryNames = useMemo(
    () => getCountryNames(selectedCountryCodes),
    [selectedCountryCodes]
  );
  const selectedCountriesKey = useMemo(
    () => selectedCountryNames.join("|"),
    [selectedCountryNames]
  );
  const debouncedRole = useDebouncedValue(selectedRole, 260);
  const debouncedCountriesKey = useDebouncedValue(selectedCountriesKey, 260);
  const debouncedCountryNames = useMemo(
    () => debouncedCountriesKey.split("|").filter(Boolean),
    [debouncedCountriesKey]
  );
  const isSelectionDebouncing =
    debouncedRole !== selectedRole || debouncedCountriesKey !== selectedCountriesKey;

  const snapshotQuery = useQuery({
    queryKey: ["home-role-snapshot", debouncedRole, debouncedCountriesKey],
    queryFn: ({ signal }) =>
      getAiRoleSnapshot({
        role: debouncedRole,
        countries: debouncedCountryNames,
      }, {
        signal,
      }),
    enabled: Boolean(debouncedRole) && debouncedCountryNames.length >= MIN_HOME_COUNTRIES,
    staleTime: 1000 * 60 * 8,
    gcTime: 1000 * 60 * 30,
    retry: false,
    placeholderData: (previousData) => previousData,
  });

  const greeting = buildGreeting(
    typeof currentUser.full_name === "string" ? currentUser.full_name : null
  );
  const handleRetry = () => {
    void snapshotQuery.refetch();
  };

  const handleRoleSelect = (role: string) => {
    setDidChooseRole(true);
    startTransition(() => {
      setSelectedRole(role);
    });
  };

  const handleCountryToggle = (code: string) => {
    startTransition(() => {
      setSelectedCountryCodes((current) => {
        const selected = current.includes(code);

        if (selected) {
          if (current.length <= MIN_HOME_COUNTRIES) {
            return current;
          }

          return current.filter((entry) => entry !== code);
        }

        if (current.length >= MAX_HOME_COUNTRIES) {
          return current;
        }

        return sortCountryCodes([...current, code]);
      });
    });
  };

  if (snapshotQuery.isPending && !snapshotQuery.data) {
    return (
      <View style={styles.container}>
        <HomeLoadingState />
      </View>
    );
  }

  if (snapshotQuery.isError && !snapshotQuery.data) {
    return (
      <View style={styles.container}>
        <HomeErrorState
          message={
            snapshotQuery.error instanceof Error
              ? snapshotQuery.error.message
              : "Unable to generate the role briefing."
          }
          onRetry={handleRetry}
        />
      </View>
    );
  }

  const snapshot = snapshotQuery.data;
  if (!snapshot) {
    return (
      <View style={styles.container}>
        <HomeErrorState
          message="No role briefing available."
          onRetry={handleRetry}
        />
      </View>
    );
  }

  const contentCountriesKey = snapshot.countries.map((country) => country.name).join("-");
  const contentKey = `${snapshot.role}:${contentCountriesKey}:${snapshot.meta.generated_at ?? "live"}`;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 22,
            paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }) + 18,
          },
        ]}
        refreshControl={
          <RefreshControl
            onRefresh={() => snapshotQuery.refetch()}
            refreshing={snapshotQuery.isFetching}
            tintColor={Colors.textPrimary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <AnimatedSection delay={0} variant="down">
          <HomeHeader
            countryOptions={HOME_COUNTRY_OPTIONS}
            greeting={greeting}
            isRefreshing={snapshotQuery.isFetching || isSelectionDebouncing}
            maxCountries={MAX_HOME_COUNTRIES}
            onSelectRole={handleRoleSelect}
            onToggleCountry={handleCountryToggle}
            roleOptions={HOME_ROLE_OPTIONS}
            selectedCountryCodes={selectedCountryCodes}
            selectedRole={selectedRole}
          />
        </AnimatedSection>

        {snapshotQuery.isError ? (
          <Text style={styles.inlineAlert}>
            Latest refresh failed. Showing the previous successful briefing.
          </Text>
        ) : snapshot.meta.degraded ? (
          <Text style={styles.inlineAlert}>
            Live output was partially recovered. The briefing stays usable and will refresh on the next clean response.
          </Text>
        ) : null}

        <AnimatedSection delay={40} key={`${contentKey}-hero`} variant="down">
          <RoleHero snapshot={snapshot} />
        </AnimatedSection>

        <AnimatedSection delay={80} key={`${contentKey}-salary`} variant="down">
          <SalaryLandscape countries={snapshot.countries} />
        </AnimatedSection>

        <AnimatedSection delay={120} key={`${contentKey}-skills`} variant="down">
          <SkillsCluster skills={snapshot.skills} />
        </AnimatedSection>

        <AnimatedSection delay={160} key={`${contentKey}-projects`} variant="down">
          <ProjectStrip projects={snapshot.projects} />
        </AnimatedSection>

        <AnimatedSection delay={200} key={`${contentKey}-insight`} variant="down">
          <AiInsightPanel
            generatedAt={snapshot.meta.generated_at}
            insight={snapshot.insight}
            model={snapshot.meta.model}
          />
        </AnimatedSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    flex: 1,
  },
  content: {
    gap: 28,
    paddingHorizontal: 20,
  },
  centerState: {
    alignItems: "center",
    backgroundColor: Colors.background,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stateTitle: {
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: -0.7,
    lineHeight: 28,
    marginTop: 18,
    textAlign: "center",
  },
  stateText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 280,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 999,
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 18,
    marginTop: 22,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  inlineAlert: {
    backgroundColor: alpha(Colors.textPrimary, 0.04),
    borderColor: alpha(Colors.textPrimary, 0.08),
    borderRadius: 14,
    borderWidth: 1,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
