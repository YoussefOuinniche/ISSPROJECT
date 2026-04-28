import React, { useCallback, useEffect, useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import JobCard from '../components/JobCard';
import SkeletonCard from '../components/SkeletonCard';
import FilterBar from '../components/FilterBar';
import { useJobs } from '../context/JobsContext';
import Colors from '../constants/colors';

const SKELETON_KEYS = Array.from({ length: 6 }, (_, i) => `sk-${i}`);

export default function JobListScreen({ navigation }) {
  const { state, fetchJobs, loadMore, setFilters, toggleFavorite } = useJobs();
  const { jobs, loading, error, filters, favorites } = state;
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchJobs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearch = useCallback(
    (text) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setFilters({ keyword: text });
      }, 300);
    },
    [setFilters]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <JobCard
        job={item}
        onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
        onSave={() => toggleFavorite(item)}
        isSaved={!!favorites.find((f) => f.id === item.id)}
      />
    ),
    [navigation, toggleFavorite, favorites]
  );

  const renderFooter = useCallback(() => {
    if (!loading || jobs.length === 0) return null;
    return <SkeletonCard />;
  }, [loading, jobs.length]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Feather name="briefcase" size={48} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>No jobs found</Text>
        <Text style={styles.emptyText}>
          Try adjusting your filters or search query.
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Jobs</Text>
      </View>

      <View style={styles.searchRow}>
        <Feather
          name="search"
          size={16}
          color={Colors.textTertiary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, skills, companies..."
          placeholderTextColor={Colors.textTertiary}
          onChangeText={handleSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <FilterBar
        filters={filters}
        onFilterChange={(change) => setFilters(change)}
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText} numberOfLines={1}>
            {error}
          </Text>
          <TouchableOpacity onPress={() => fetchJobs(true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading && jobs.length === 0 ? (
        <FlatList
          data={SKELETON_KEYS}
          keyExtractor={(key) => key}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            jobs.length === 0 && styles.listEmpty,
          ]}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          onRefresh={() => fetchJobs(true)}
          refreshing={loading && jobs.length > 0}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, height: 36 },
  list: { paddingVertical: 8 },
  listEmpty: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: { fontSize: 13, color: Colors.danger, flex: 1 },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger,
    marginLeft: 12,
  },
});
