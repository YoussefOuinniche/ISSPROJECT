import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { getTrends, getTrendingJobsFromWeb, searchJobsWithAi, type JobSearchResult } from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";

const DOMAINS = ["All Domains", "AI/ML", "Cloud", "DevOps", "Security", "Software Engineering", "Web Development"];

function JobCard({ job }: { job: JobSearchResult }) {
  return (
    <Pressable
      style={styles.jobCard}
      onPress={() => job.url && Linking.openURL(job.url).catch(() => {})}
    >
      <View style={styles.jobCardTop}>
        <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
        <View style={[styles.sourceBadge]}>
          <Text style={styles.sourceBadgeText}>{job.source.replace("www.", "")}</Text>
        </View>
      </View>
      {job.company ? <Text style={styles.jobCompany}>{job.company}</Text> : null}
      <View style={styles.jobMeta}>
        {job.location ? (
          <View style={styles.jobMetaItem}>
            <Feather name="map-pin" size={12} color={Colors.textTertiary} />
            <Text style={styles.jobMetaText}>{job.location}</Text>
          </View>
        ) : null}
        {job.salary ? (
          <View style={styles.jobMetaItem}>
            <Feather name="dollar-sign" size={12} color={Colors.success} />
            <Text style={[styles.jobMetaText, { color: Colors.success }]}>{job.salary}</Text>
          </View>
        ) : null}
      </View>
      {job.description ? (
        <Text style={styles.jobDesc} numberOfLines={2}>{job.description}</Text>
      ) : null}
      {job.url ? (
        <View style={styles.applyBtn}>
          <Text style={styles.applyBtnText}>View Job</Text>
          <Feather name="external-link" size={12} color={Colors.primary} />
        </View>
      ) : null}
    </Pressable>
  );
}

function TrendCard({ item }: { item: { id: string; skill: string; growth: string; demand: number; category: string; color: string } }) {
  return (
    <View style={styles.trendCard}>
      <View style={styles.trendCardTop}>
        <Feather name="trending-up" size={13} color={Colors.success} />
        <Text style={styles.trendGrowth}>{item.growth}</Text>
      </View>
      <Text style={styles.trendSkill} numberOfLines={2}>{item.skill}</Text>
      <View style={styles.trendFooter}>
        <Text style={styles.trendDemandLabel}>Demand</Text>
        <Text style={[styles.trendDemandValue, { color: item.color }]}>{item.demand}/100</Text>
      </View>
    </View>
  );
}

export default function TrendsScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All Domains");
  const [trendRows, setTrendRows] = useState<Record<string, unknown>[]>([]);
  const [webJobs, setWebJobs] = useState<JobSearchResult[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [jobLoading, setJobLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<JobSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const loadTrends = async () => {
    setTrendLoading(true);
    try {
      const rows = await getTrends();
      setTrendRows(rows);
    } catch { /* silent */ } finally {
      setTrendLoading(false);
    }
  };

  const loadTrendingJobs = async () => {
    setJobLoading(true);
    try {
      const jobs = await getTrendingJobsFromWeb("global", 15);
      setWebJobs(jobs);
    } catch { /* silent */ } finally {
      setJobLoading(false);
    }
  };

  useEffect(() => {
    loadTrends();
    loadTrendingJobs();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults(null);
    try {
      const results = await searchJobsWithAi(searchQuery.trim(), 15);
      setSearchResults(results);
    } catch { /* silent */ } finally {
      setSearching(false);
    }
  };

  const trends = useMemo(
    () =>
      trendRows.map((item, idx) => {
        const demand = 60 + ((idx * 7) % 35);
        const category = String((item as any).domain ?? "General");
        return {
          id: String((item as any).id ?? `trend-${idx}`),
          skill: String((item as any).title ?? `Trend ${idx + 1}`),
          growth: `+${Math.max(6, Math.round(demand / 7))}%`,
          demand,
          category,
          color: demand >= 80 ? Colors.success : Colors.primary,
        };
      }),
    [trendRows]
  );

  const filteredTrends = useMemo(() => {
    let list = trends;
    if (selectedDomain !== "All Domains") {
      list = list.filter((t) => t.category.toLowerCase().includes(selectedDomain.toLowerCase()));
    }
    if (searchQuery.trim() && !searchResults) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.skill.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return list;
  }, [trends, selectedDomain, searchQuery, searchResults]);

  const jobsToShow = searchResults ?? webJobs;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
          paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }) + 20,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Trends</Text>
        <Pressable style={styles.refreshBtn} onPress={() => { loadTrends(); loadTrendingJobs(); }}>
          <Feather name="refresh-cw" size={18} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={Colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, skills, or roles..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(""); setSearchResults(null); }}>
              <Feather name="x" size={16} color={Colors.textTertiary} />
            </Pressable>
          )}
        </View>
        {searchQuery.trim().length > 0 && (
          <Pressable style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
            {searching ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchBtnText}>Search</Text>}
          </Pressable>
        )}
      </View>

      {/* Domain Filter */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Choose Domain</Text>
        <Text style={styles.sectionCount}>{DOMAINS.length - 1} DOMAINS</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.domainScroll}>
        {DOMAINS.map((domain) => (
          <Pressable
            key={domain}
            style={[styles.domainChip, selectedDomain === domain && styles.domainChipActive]}
            onPress={() => setSelectedDomain(domain)}
          >
            <Text style={[styles.domainChipText, selectedDomain === domain && styles.domainChipTextActive]}>
              {domain}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Trending Skills */}
      {!searchResults && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Skills</Text>
            <Feather name="bar-chart-2" size={18} color={Colors.textSecondary} />
          </View>
          {trendLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendScroll}>
              {filteredTrends.length === 0 ? (
                <Text style={styles.emptyText}>No trends for this domain</Text>
              ) : (
                filteredTrends.slice(0, 8).map((trend) => <TrendCard key={trend.id} item={trend} />)
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* Live Jobs */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {searchResults ? `Results for "${searchQuery}"` : "Trending Jobs"}
        </Text>
        <Text style={styles.sectionCount}>
          {jobsToShow.length} JOBS
        </Text>
      </View>

      {jobLoading && !searchResults ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
      ) : jobsToShow.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="briefcase" size={32} color={Colors.border} />
          <Text style={styles.emptyText}>No jobs found. Try a different search.</Text>
        </View>
      ) : (
        jobsToShow.map((job, idx) => <JobCard key={`${job.title}-${idx}`} job={job} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  screenTitle: { fontSize: 26, fontWeight: "800", color: Colors.textPrimary, letterSpacing: -0.5 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },

  searchContainer: { flexDirection: "row", gap: 8, marginBottom: 16 },
  searchBar: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, height: 46,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  searchBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingHorizontal: 16, height: 46, alignItems: "center", justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  sectionCount: { fontSize: 12, fontWeight: "700", color: Colors.primary },

  domainScroll: { gap: 8, paddingBottom: 16 },
  domainChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  domainChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  domainChipText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  domainChipTextActive: { color: "#FFFFFF" },

  trendScroll: { gap: 10, paddingBottom: 16 },
  trendCard: {
    width: 130, backgroundColor: Colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  trendCardTop: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  trendGrowth: { color: Colors.success, fontSize: 12, fontWeight: "700" },
  trendSkill: { color: Colors.textPrimary, fontSize: 14, fontWeight: "700", marginBottom: 10 },
  trendFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  trendDemandLabel: { fontSize: 11, color: Colors.textTertiary },
  trendDemandValue: { fontSize: 12, fontWeight: "700" },

  jobCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  jobCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  jobTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginRight: 8 },
  sourceBadge: {
    backgroundColor: Colors.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  sourceBadgeText: { fontSize: 10, fontWeight: "700", color: Colors.primary },
  jobCompany: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  jobMeta: { flexDirection: "row", gap: 12, marginBottom: 8 },
  jobMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  jobMetaText: { fontSize: 12, color: Colors.textTertiary },
  jobDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 10 },
  applyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  applyBtnText: { fontSize: 13, fontWeight: "600", color: Colors.primary },

  emptyCard: { alignItems: "center", padding: 32, gap: 12 },
  emptyText: { color: Colors.textTertiary, fontSize: 14, textAlign: "center" },
});
