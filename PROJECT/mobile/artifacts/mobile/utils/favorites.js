import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'skillpulse_favorites';

export const getFavorites = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const saveFavorite = async (job) => {
  const favorites = await getFavorites();
  if (!favorites.find((f) => f.id === job.id)) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites, job]));
  }
};

export const removeFavorite = async (jobId) => {
  const favorites = await getFavorites();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(favorites.filter((f) => f.id !== jobId))
  );
};

export const isFavorite = async (jobId) => {
  const favorites = await getFavorites();
  return favorites.some((f) => f.id === jobId);
};
