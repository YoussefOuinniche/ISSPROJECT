import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { configureMobileApiRuntime } from "@/lib/api/runtime";
import { ThemeProvider } from "@/constants/theme";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: "#F7F8FA" },
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
        name="onboarding"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen
        name="learn/[id]"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false, presentation: "card", animation: "fade" }}
      />
      <Stack.Screen
        name="profile-completion"
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
      <Stack.Screen
        name="job-detail"
        options={{ headerShown: false, presentation: "card", animation: "slide_from_right" }}
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
  });

  useEffect(() => {
    configureMobileApiRuntime().catch(() => {});

    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutNav />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
