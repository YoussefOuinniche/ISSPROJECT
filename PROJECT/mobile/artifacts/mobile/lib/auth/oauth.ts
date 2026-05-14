import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";

import {
  configureMobileApiRuntime,
  getMobileApiBaseUrl,
  storeMobileAccessToken,
} from "@/lib/api/runtime";

export type OAuthProvider = "google" | "github";

type OAuthConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function readExtraString(key: string): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const value = extra[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readOAuthConfig(): OAuthConfig {
  const supabaseUrl = readExtraString("supabaseUrl") ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = readExtraString("supabaseAnonKey") ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in the mobile .env file.");
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    supabaseAnonKey,
  };
}

function parseAuthParams(url: string): URLSearchParams {
  const queryIndex = url.indexOf("?");
  const hashIndex = url.indexOf("#");
  const query = queryIndex >= 0
    ? url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined)
    : "";
  const hash = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";
  return new URLSearchParams([query, hash].filter(Boolean).join("&"));
}

async function warmBackendProfile(accessToken: string): Promise<void> {
  await configureMobileApiRuntime();
  const baseUrl = getMobileApiBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/user/profile`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OAuth worked, but backend profile setup failed (${response.status}). ${body}`.trim());
  }
}

export async function signInWithOAuthProvider(provider: OAuthProvider): Promise<void> {
  const { supabaseUrl, supabaseAnonKey } = readOAuthConfig();
  const redirectTo = AuthSession.makeRedirectUri({
    scheme: "mobile",
    path: "auth/callback",
  });

  const authUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
  authUrl.searchParams.set("provider", provider);
  authUrl.searchParams.set("redirect_to", redirectTo);
  authUrl.searchParams.set("apikey", supabaseAnonKey);

  const result = await WebBrowser.openAuthSessionAsync(authUrl.toString(), redirectTo);
  if (result.type !== "success") {
    throw new Error("Sign in was cancelled.");
  }

  const params = parseAuthParams(result.url);
  const errorDescription = params.get("error_description") ?? params.get("error");
  if (errorDescription) throw new Error(errorDescription);

  const accessToken = params.get("access_token");
  if (!accessToken) {
    throw new Error("Supabase did not return an access token. Check the provider redirect URL in Supabase.");
  }

  await storeMobileAccessToken(accessToken);
  await warmBackendProfile(accessToken);
}
