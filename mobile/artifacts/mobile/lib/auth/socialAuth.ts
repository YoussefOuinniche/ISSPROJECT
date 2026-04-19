import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { getMobileApiBaseUrl, storeMobileAccessToken } from "@/lib/api/runtime";
import {
  getMobileSupabase,
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = "google" | "github";

type SocialAuthOutcome =
  | { status: "success"; message: string }
  | { status: "cancelled"; message: string }
  | { status: "error"; message: string };

type SocialExchangeResponse = {
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    refreshToken?: string;
  };
  error?: string;
};

const SOCIAL_AUTH_CALLBACK_URL = "nexapath://auth/callback";
let lastHandledCallbackUrl: string | null = null;

function parseCallbackUrl(rawUrl: string) {
  const normalizedUrl = rawUrl.replace("#", "?");
  const parsed = Linking.parse(normalizedUrl);
  const queryParams = parsed.queryParams ?? {};

  const readParam = (key: string) => {
    const value = queryParams[key];
    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0];
    }

    return null;
  };

  return {
    code: readParam("code"),
    error: readParam("error"),
    errorDescription: readParam("error_description"),
  };
}

async function exchangeBackendToken(accessToken: string, provider: SocialProvider) {
  const response = await fetch(`${getMobileApiBaseUrl()}/api/auth/social`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accessToken,
      provider,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as SocialExchangeResponse;
  if (!response.ok || !payload?.data?.token) {
    throw new Error(payload?.error || payload?.message || "Unable to exchange social session for app token.");
  }

  await storeMobileAccessToken(payload.data.token);
}

export function getSocialAuthCallbackUrl() {
  return SOCIAL_AUTH_CALLBACK_URL;
}

export async function beginSocialAuth(provider: SocialProvider): Promise<SocialAuthOutcome> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: getSupabaseConfigError(),
    };
  }

  const mobileSupabase = getMobileSupabase();
  const { data, error } = await mobileSupabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: SOCIAL_AUTH_CALLBACK_URL,
      skipBrowserRedirect: true,
      scopes: provider === "github" ? "read:user user:email" : "openid email profile",
      queryParams:
        provider === "google"
          ? {
              access_type: "offline",
              prompt: "consent",
            }
          : undefined,
    },
  });

  if (error) {
    return {
      status: "error",
      message: error.message,
    };
  }

  if (!data?.url) {
    return {
      status: "error",
      message: "Unable to start social authentication.",
    };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, SOCIAL_AUTH_CALLBACK_URL);
  if (result.type === "cancel" || result.type === "dismiss") {
    return {
      status: "cancelled",
      message: "Sign-in was cancelled.",
    };
  }

  if (result.type !== "success" || !result.url) {
    return {
      status: "error",
      message: "The social sign-in flow did not complete.",
    };
  }

  return finalizeSocialAuthCallback(result.url, provider);
}

export async function finalizeSocialAuthCallback(
  callbackUrl: string,
  fallbackProvider?: SocialProvider
): Promise<SocialAuthOutcome> {
  if (!callbackUrl) {
    return {
      status: "error",
      message: "Missing authentication callback URL.",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: getSupabaseConfigError(),
    };
  }

  if (lastHandledCallbackUrl === callbackUrl) {
    return {
      status: "success",
      message: "Authentication already completed.",
    };
  }

  const { code, error, errorDescription } = parseCallbackUrl(callbackUrl);
  if (error) {
    return {
      status: "error",
      message: errorDescription || error,
    };
  }

  if (!code) {
    return {
      status: "error",
      message: "Missing authorization code in callback URL.",
    };
  }

  const mobileSupabase = getMobileSupabase();
  const { data, error: exchangeError } = await mobileSupabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return {
      status: "error",
      message: exchangeError.message,
    };
  }

  const provider =
    (data.session?.user?.app_metadata?.provider as SocialProvider | undefined) ||
    fallbackProvider;
  const accessToken = data.session?.access_token;

  if (!provider || !accessToken) {
    return {
      status: "error",
      message: "The social session is incomplete.",
    };
  }

  await exchangeBackendToken(accessToken, provider);
  lastHandledCallbackUrl = callbackUrl;

  return {
    status: "success",
    message: "Signed in successfully.",
  };
}
