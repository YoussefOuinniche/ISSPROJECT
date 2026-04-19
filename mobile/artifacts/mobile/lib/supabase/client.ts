import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let mobileSupabaseClient: SupabaseClient | null = null;

function readExpoExtraString(key: string): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const value = extra[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readPublicEnv(name: string): string | null {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readSupabaseConfig() {
  return {
    url: readPublicEnv("EXPO_PUBLIC_SUPABASE_URL") ?? readExpoExtraString("supabaseUrl"),
    anonKey:
      readPublicEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY") ?? readExpoExtraString("supabaseAnonKey"),
  };
}

export function isSupabaseConfigured() {
  const config = readSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

export function getSupabaseConfigError() {
  return "Missing Expo env values: EXPO_PUBLIC_SUPABASE_URL and/or EXPO_PUBLIC_SUPABASE_ANON_KEY";
}

export function getMobileSupabase() {
  if (mobileSupabaseClient) {
    return mobileSupabaseClient;
  }

  const config = readSupabaseConfig();
  if (!config.url || !config.anonKey) {
    throw new Error(getSupabaseConfigError());
  }

  mobileSupabaseClient = createClient(config.url, config.anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });

  return mobileSupabaseClient;
}
