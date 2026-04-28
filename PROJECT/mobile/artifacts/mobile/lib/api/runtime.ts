import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const ACCESS_TOKEN_KEY = "sp.accessToken";
const SIGNED_OUT_KEY = "sp.signedOut";
const CACHED_API_URL_KEY = "sp.apiBaseUrl";
const BACKEND_PORT = 5000;
const HEALTH_PATH = "/health";
const PING_TIMEOUT_MS = 4000;

let configured = false;
let resolvedApiBaseUrl = `http://localhost:${BACKEND_PORT}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readExpoExtraString(key: string): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const value = extra[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Get the Expo dev-server host (e.g. "192.168.1.42:8081") */
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

/** Derive the backend URL from the Expo dev server IP */
function deriveExpoBaseUrl(): string | null {
  if (Platform.OS === "web") return null;
  const hostWithPort = readExpoHostWithPort();
  if (!hostWithPort) return null;
  const host = hostWithPort.split(":")[0]?.trim();
  if (!host) return null;
  return `http://${host}:${BACKEND_PORT}`;
}

/** Ping a URL's /health endpoint, return true if reachable within timeout */
async function pingUrl(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const res = await fetch(`${baseUrl}${HEALTH_PATH}`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(id);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

/**
 * Try a list of candidate URLs in order and return the first one that responds.
 * Falls back to the last candidate if none respond (so the app still has a URL).
 */
async function findWorkingUrl(candidates: string[]): Promise<string> {
  for (const url of candidates) {
    if (!url) continue;
    const ok = await pingUrl(url);
    if (ok) {
      console.info("[mobileApi] reachable:", url);
      return url;
    }
    console.info("[mobileApi] unreachable:", url);
  }
  // None responded — return first non-empty candidate so requests at least fail
  // with a meaningful error rather than crashing on a null URL.
  return candidates.find(Boolean) ?? `http://localhost:${BACKEND_PORT}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function configureMobileApiRuntime(): Promise<void> {
  if (configured) return;
  configured = true;

  // 1. Explicit override from app.json extra (dev override, usually absent)
  const extraUrl = readExpoExtraString("apiBaseUrl");

  // 2. URL auto-detected from the running Expo dev server
  const expoUrl = deriveExpoBaseUrl();

  // 3. Previously cached working URL from AsyncStorage
  const cachedUrl = await AsyncStorage.getItem(CACHED_API_URL_KEY).catch(() => null);

  // 4. Bootstrap token for unauthenticated calls
  const bootstrapToken = readExpoExtraString("apiToken");

  // Build candidate list in priority order, removing duplicates/nulls
  const candidates = [...new Set(
    [extraUrl, expoUrl, cachedUrl, `http://localhost:${BACKEND_PORT}`].filter(Boolean) as string[]
  )];

  console.info("[mobileApi] candidates", candidates);

  const workingUrl = await findWorkingUrl(candidates);
  resolvedApiBaseUrl = workingUrl;

  // Cache the working URL so next launch is instant
  await AsyncStorage.setItem(CACHED_API_URL_KEY, workingUrl).catch(() => {});

  console.info("[mobileApi] configured →", workingUrl);

  setBaseUrl(workingUrl);
  setAuthTokenGetter(async () => {
    const storedToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (storedToken) return storedToken;
    const wasSignedOut = await AsyncStorage.getItem(SIGNED_OUT_KEY);
    if (wasSignedOut === "1") return null;
    return bootstrapToken;
  });
}

/** Force re-detection (call this if you get repeated network errors) */
export async function resetApiRuntime(): Promise<void> {
  configured = false;
  await AsyncStorage.removeItem(CACHED_API_URL_KEY).catch(() => {});
  await configureMobileApiRuntime();
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
