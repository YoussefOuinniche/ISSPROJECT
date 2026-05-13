'use no memo';

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetCurrentUser } from '@workspace/api-client-react';

import { getMobileAccessToken } from '@/lib/api/runtime';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const currentUserQuery = useGetCurrentUser();

  useEffect(() => {
    let mounted = true;
    getMobileAccessToken()
      .then((token) => {
        if (mounted) setHasStoredSession(Boolean(token));
      })
      .finally(() => {
        if (mounted) setIsBooting(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const canAutoEnter = (() => {
    const envelope =
      currentUserQuery.data && typeof currentUserQuery.data === 'object' && 'data' in currentUserQuery.data
        ? (currentUserQuery.data.data as unknown as Record<string, unknown>)
        : {};
    return Boolean(envelope.user);
  })();

  useEffect(() => {
    if (isBooting) return;
    if (!hasStoredSession) {
      router.replace('/login');
      return;
    }
    if (currentUserQuery.isLoading) return;
    router.replace(canAutoEnter ? '/(tabs)' : '/login');
  }, [isBooting, hasStoredSession, canAutoEnter, currentUserQuery.isLoading]);

  return (
    <LinearGradient
      colors={['#03071A', '#071225']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.hero}>
        <View style={styles.logoFrame}>
          <Image source={require('@/assets/images/logo-Photoroom.png')} contentFit="contain" style={styles.logo} />
        </View>
        <Text style={styles.title}>NexaPath</Text>
        <Text style={styles.tagline}>Your AI-powered career navigator</Text>
        <ActivityIndicator color="#35DDEB" style={styles.loader} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  logoFrame: {
    width: 124,
    height: 124,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 102, height: 102 },
  title: {
    color: '#F3FAFF',
    fontSize: 42,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0,
  },
  tagline: {
    color: 'rgba(202, 226, 245, 0.72)',
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0,
  },
  loader: { marginTop: 10 },
});
