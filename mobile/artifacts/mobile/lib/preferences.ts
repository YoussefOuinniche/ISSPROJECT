import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "nexapath.preferences.v1";

export type AppPreferences = {
  weeklyReviewReminders: boolean;
  marketTrendAlerts: boolean;
  openRecommendationsAfterRefresh: boolean;
  reduceMotion: boolean;
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  weeklyReviewReminders: true,
  marketTrendAlerts: true,
  openRecommendationsAfterRefresh: false,
  reduceMotion: false,
};

export async function loadAppPreferences(): Promise<AppPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return {
      ...DEFAULT_APP_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_APP_PREFERENCES;
  }
}

export async function saveAppPreferences(preferences: AppPreferences) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
