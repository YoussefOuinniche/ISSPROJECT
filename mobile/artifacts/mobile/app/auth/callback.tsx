import { router } from "expo-router";
import * as Linking from "expo-linking";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AuthBackground } from "@/components/AuthBackground";
import Colors from "@/constants/colors";
import { finalizeSocialAuthCallback } from "@/lib/auth/socialAuth";

export default function AuthCallbackScreen() {
  const handledUrlRef = useRef<string | null>(null);
  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    let mounted = true;

    const complete = async (incomingUrl: string | null) => {
      if (!mounted || !incomingUrl || handledUrlRef.current === incomingUrl) {
        return;
      }

      handledUrlRef.current = incomingUrl;
      const outcome = await finalizeSocialAuthCallback(incomingUrl);
      if (!mounted) {
        return;
      }

      if (outcome.status === "success") {
        router.replace("/(tabs)");
        return;
      }

      setMessage(outcome.message);
      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    };

    Linking.getInitialURL()
      .then((url) => complete(url))
      .catch(() => undefined);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void complete(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return (
    <AuthBackground>
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator color={Colors.accentTertiary} size="small" />
          <Text style={styles.title}>Finalizing secure login</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.52)",
  },
  title: {
    color: "#111111",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  message: {
    color: "#425164",
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
