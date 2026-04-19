import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
  Newsreader_700Bold,
} from "@expo-google-fonts/newsreader";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { configureMobileApiRuntime } from "@/lib/api/runtime";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: "#07112F" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen
        name="login"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="signup"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="auth/callback"
        options={{ headerShown: false, presentation: "transparentModal", animation: "fade" }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen
        name="learn/[id]"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="roles/[slug]"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="role-details"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="settings/account"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="settings/career"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="settings/skills"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="settings/security"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="settings/preferences"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="settings/support"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="recommendations"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="ai-assistant"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Newsreader_700Bold,
  });

  useEffect(() => {
    configureMobileApiRuntime();

    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
