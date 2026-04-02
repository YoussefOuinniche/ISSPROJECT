import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const ACCESS_TOKEN_KEY = "sp.accessToken";
const SIGNED_OUT_KEY = "sp.signedOut";
const FALLBACK_API_BASE_URL = "http://localhost:4000";

let configured = false;
let resolvedApiBaseUrl = FALLBACK_API_BASE_URL;

function readExpoExtraString(key: string): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const value = extra[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readExpoHostWithPort(): string | null {
  const expoConfigHost = (Constants.expoConfig as Record<string, unknown> | null)?.hostUri;
  if (typeof expoConfigHost === "string" && expoConfigHost.trim().length > 0) {
    return expoConfigHost.trim();
  }

  const expoGoConfig = (Constants as unknown as { expoGoConfig?: Record<string, unknown> }).expoGoConfig;
  const debuggerHost = expoGoConfig?.debuggerHost;
  if (typeof debuggerHost === "string" && debuggerHost.trim().length > 0) {
    return debuggerHost.trim();
  }

  return null;
}

function deriveLanApiBaseUrl(): string | null {
  if (Platform.OS === "web") {
    return null;
  }

  const hostWithPort = readExpoHostWithPort();
  if (!hostWithPort) {
    return null;
  }

  const host = hostWithPort.split(":")[0]?.trim();
  if (!host) {
    return null;
  }

  return `http://${host}:4000`;
}

export function configureMobileApiRuntime() {
  if (configured) return;

  configured = true;
  const apiBaseUrl =
    readExpoExtraString("apiBaseUrl") ?? deriveLanApiBaseUrl() ?? FALLBACK_API_BASE_URL;
  const bootstrapToken = readExpoExtraString("apiToken");
  resolvedApiBaseUrl = apiBaseUrl;

  console.info("[mobileApi] configured", {
    platform: Platform.OS,
    apiBaseUrl,
    hasBootstrapToken: Boolean(bootstrapToken),
  });

  setBaseUrl(apiBaseUrl);
  setAuthTokenGetter(async () => {
    const storedToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (storedToken) {
      return storedToken;
    }

    const wasSignedOut = await AsyncStorage.getItem(SIGNED_OUT_KEY);
    if (wasSignedOut === "1") {
      return null;
    }

    return bootstrapToken;
  });
}

export async function storeMobileAccessToken(token: string) {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, token],
    [SIGNED_OUT_KEY, "0"],
  ]);
}

export async function clearMobileAccessToken() {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY]);
  await AsyncStorage.setItem(SIGNED_OUT_KEY, "1");
}

export async function getMobileAccessToken() {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getMobileApiBaseUrl() {
  return resolvedApiBaseUrl;
}
