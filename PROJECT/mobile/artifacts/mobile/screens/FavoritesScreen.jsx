import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { getFavorites, removeFavorite } from '../utils/favorites';
import JobCard from '../components/JobCard';
import Colors from '../constants/colors';

export default function FavoritesScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    const favs = await getFavorites();
    setFavorites(favs);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFavorites();
    const unsubscribe = navigation.addListener('focus', loadFavorites);
    return unsubscribe;
  }, [navigation, loadFavorites]);

  const handleRemove = useCallback(async (jobId) => {
    await removeFavorite(jobId);
    setFavorites((prev) => prev.filter((f) => f.id !== jobId));
  }, []);

  const renderRightActions = useCallback(
    () => (
      <View style={styles.deleteAction}>
        <Feather name="trash-2" size={20} color="#FFFFFF" />
        <Text style={styles.deleteText}>Remove</Text>
      </View>
    ),
    []
  );

  const renderItem = useCallback(
    ({ item }) => (
      <Swipeable
        renderRightActions={renderRightActions}
        onSwipeableOpen={() => handleRemove(item.id)}
        overshootRight={false}
      >
        <JobCard
          job={item}
          onPress={() =>
            navigation.navigate('JobDetail', { jobId: item.id })
          }
          onSave={() => handleRemove(item.id)}
          isSaved
        />
      </Swipeable>
    ),
    [navigation, handleRemove, renderRightActions]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Saved Jobs</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Jobs</Text>
        <Text style={styles.headerCount}>
          {favorites.length} saved
        </Text>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          favorites.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bookmark" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No saved jobs</Text>
            <Text style={styles.emptyText}>
              Tap the bookmark icon on any job to save it here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 15, color: Colors.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  headerCount: { fontSize: 14, color: Colors.textTertiary },
  list: { paddingVertical: 8 },
  listEmpty: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  deleteAction: {
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 6,
    marginRight: 16,
    borderRadius: 12,
    gap: 4,
  },
  deleteText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },
});
