import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedSection } from "../../components/AnimatedSection";
import Colors from "../../constants/colors";
import {
  IT_MARKET_COUNTRIES,
  IT_MARKET_ROLES,
  type ITMarketCountry,
  getSalaryByCountry,
} from "../../constants/itMarketFeed";
import { getBottomContentPadding } from "../../lib/layout";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [selectedCountry, setSelectedCountry] = useState<ITMarketCountry>("United States");
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const feedItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return IT_MARKET_ROLES
      .map((role) => {
        const salaries = getSalaryByCountry(role);
        const featuredSalary = salaries.find((entry) => entry.country === selectedCountry) ?? salaries[0];

        return {
          ...role,
          salaries,
          featuredSalary,
        };
      })
      .filter((item) => {
        if (!normalizedQuery) {
          return true;
        }

        const searchableText = [
          item.role,
          item.definition,
          item.marketNote,
          ...item.requiredSkills,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .sort((a, b) => b.featuredSalary.maxAnnualUsd - a.featuredSalary.maxAnnualUsd);
  }, [searchQuery, selectedCountry]);

  const refreshEdition = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 420);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 18,
            paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }) + 18,
          },
        ]}
        refreshControl={
          <RefreshControl
            onRefresh={refreshEdition}
            refreshing={refreshing}
            tintColor={Colors.textPrimary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <AnimatedSection delay={0} variant="down">
          <View style={styles.searchHeader}>
            <View style={styles.searchHeaderTopRow}>
              <Image
                source={require("@/assets/images/logo-nexapath.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.searchTitle}>IT Market Feed</Text>
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search roles, skills, or keywords"
              placeholderTextColor={Colors.textTertiary}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </AnimatedSection>

        <AnimatedSection delay={20} variant="down">
          <View style={styles.countryPanel}>
            <Text style={styles.countryPanelTitle}>Country Lens</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countryWrap}>
              {IT_MARKET_COUNTRIES.map((country) => {
                const active = selectedCountry === country;
                return (
                  <Pressable
                    key={country}
                    style={[styles.countryChip, active && styles.countryChipActive]}
                    onPress={() => setSelectedCountry(country)}
                  >
                    <Text style={[styles.countryChipText, active && styles.countryChipTextActive]}>
                      {country}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </AnimatedSection>

        {feedItems.length === 0 ? (
          <AnimatedSection delay={40} variant="down">
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>No matches in the feed</Text>
              <Text style={styles.emptyStateText}>Try another keyword or clear your search to see all roles.</Text>
            </View>
          </AnimatedSection>
        ) : (
          feedItems.map((item, index) => (
            <AnimatedSection key={item.id} delay={40 + index * 16} variant="down">
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTag}>Role Desk</Text>
                  <Text style={styles.cardTagMuted}>{selectedCountry} lens</Text>
                </View>

                <Text style={styles.roleTitle}>{item.role}</Text>
                <Text style={styles.definition}>{item.definition}</Text>

                <Text style={styles.sectionTitle}>Required Skills</Text>
                <View style={styles.skillWrap}>
                  {item.requiredSkills.map((skill) => (
                    <View key={`${item.id}-${skill}`} style={styles.skillChip}>
                      <Text style={styles.skillChipText}>{skill}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>Salary Wire (USD annual)</Text>
                <View style={styles.featuredSalaryRow}>
                  <Text style={styles.featuredSalaryCountry}>{item.featuredSalary.country}</Text>
                  <Text style={styles.featuredSalaryValue}>{item.featuredSalary.salaryRange}</Text>
                </View>

                <View style={styles.salaryGrid}>
                  {item.salaries.map((salary) => (
                    <View key={`${item.id}-${salary.country}`} style={styles.salaryCell}>
                      <Text style={styles.salaryCountry}>{salary.country}</Text>
                      <Text style={styles.salaryValue}>{salary.salaryRange}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.roleFooter}>
                  <Text style={styles.marketNote}>Market note: {item.marketNote}</Text>
                  <Pressable
                    style={styles.openButton}
                    onPress={() =>
                      router.push({
                        pathname: "/learn/[id]",
                        params: {
                          id: item.id,
                          role: item.role,
                        },
                      })
                    }
                  >
                    <Text style={styles.openButtonText}>Open Roadmap</Text>
                    <Feather name="arrow-right" size={14} color={Colors.background} />
                  </Pressable>
                </View>
              </View>
            </AnimatedSection>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 18,
  },
  searchHeader: {
    gap: 10,
  },
  searchHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 38,
    height: 38,
  },
  searchTitle: {
    fontSize: 22,
    color: Colors.textPrimary,
    letterSpacing: -0.6,
    fontFamily: "Inter_700Bold",
  },
  searchInput: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  countryPanel: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    backgroundColor: Colors.backgroundSecondary,
  },
  countryPanelTitle: {
    fontSize: 13,
    marginBottom: 10,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: "Inter_600SemiBold",
  },
  countryWrap: {
    gap: 8,
    paddingRight: 4,
  },
  countryChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  countryChipActive: {
    borderColor: Colors.accentTertiary,
    backgroundColor: Colors.accentTertiary,
  },
  countryChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  countryChipTextActive: {
    color: Colors.textInverse,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    padding: 16,
    gap: 10,
  },
  emptyStateCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    padding: 16,
  },
  emptyStateTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  emptyStateText: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Newsreader_400Regular",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTag: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: Colors.accentTertiary,
  },
  cardTagMuted: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  roleTitle: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.7,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  definition: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    fontFamily: "Newsreader_400Regular",
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
  },
  skillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skillChipText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  featuredSalaryRow: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: Colors.accentTertiary,
    borderRadius: 12,
    backgroundColor: Colors.accentTertiaryLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredSalaryCountry: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  featuredSalaryValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  salaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  salaryCell: {
    width: "48%",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.backgroundSecondary,
  },
  salaryCountry: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
  },
  salaryValue: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  marketNote: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontFamily: "Newsreader_500Medium",
  },
  roleFooter: {
    marginTop: 2,
    gap: 10,
  },
  openButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 24,
    backgroundColor: Colors.accentTertiary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  openButtonText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
  },
});
