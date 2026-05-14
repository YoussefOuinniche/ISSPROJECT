'use no memo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  Keyboard,
  Platform,
  type KeyboardEvent,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { SANS, SANS_MED, SANS_REG, useTheme } from '@/constants/theme';
import { sendChatMessageAI, fetchChatHistoryAI } from '@/lib/api/chatApi';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { refreshProfile } from '@/hooks/useAIProfile';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  createdAt?: string;
}

type Mode = 'fresh' | 'history';

export default function AIChatScreen() {
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<Mode>('fresh');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);
  const [hasHistory, setHasHistory] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const composerOffset = useSharedValue(0);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const composerPaddingBottom = keyboardVisible
    ? Math.max(12, insets.bottom + 8)
    : Math.max(16, insets.bottom + 56);
  const listBottomPadding = composerHeight + composerPaddingBottom + 22;

  const autoStartedRef = useRef(false);

  // On mount: probe history (for the "Past chats" affordance) and always
  // auto-start the guided questionnaire so the user lands on Q1 rather than
  // a blank screen — even if they have prior conversations they can still
  // open via the header chip.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const history = await fetchChatHistoryAI();
        if (!cancelled) setHasHistory(Array.isArray(history) && history.length > 0);
      } catch {
        if (!cancelled) setHasHistory(false);
      }
      if (cancelled) return;

      const pending = await AsyncStorage.getItem('@nexapath_pending_chat').catch(() => null);
      if (cancelled) return;

      if (autoStartedRef.current) return;
      autoStartedRef.current = true;

      if (pending) {
        await AsyncStorage.removeItem('@nexapath_pending_chat').catch(() => null);
        setTimeout(() => handleSend(pending), 300);
      } else {
        setTimeout(() => kickoffGuidedFlow(), 250);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kickoffGuidedFlow = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const response = await sendChatMessageAI(
        "Hi — I want to build my personalised career roadmap. Please begin the assessment.",
      );
      if (response?.response) {
        setMessages([
          {
            id: `assistant-${response.message_id ?? Date.now()}`,
            text: response.response,
            isUser: false,
          },
        ]);
        setHasHistory(true);
        void Promise.allSettled([
          refreshProfile(),
          queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/user/dashboard'] }),
        ]);
      } else {
        throw new Error('No response received from the AI.');
      }
    } catch (err) {
      // Local fallback so the user is never stranded on a blank screen.
      setMessages([
        {
          id: 'welcome-local',
          text: "Hi — I'm NexaPath AI. I'll guide you through a short assessment to build your career roadmap.\n\nLet's start: **what's your name?**",
          isUser: false,
        },
      ]);
      setError(err instanceof Error ? err.message : 'Could not reach the assistant.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = (event: KeyboardEvent) => {
      setKeyboardVisible(true);
      const kh = Math.max(0, event.endCoordinates.height - insets.bottom);
      composerOffset.value = withTiming(kh, { duration: event.duration ?? 250 });
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
    };
    const handleHide = (event?: KeyboardEvent) => {
      setKeyboardVisible(false);
      composerOffset.value = withTiming(0, { duration: event?.duration ?? 250 });
    };

    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, [composerOffset, insets.bottom]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setError(null);
    setMode('fresh');
    const tempId = `local-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, text, isUser: true }]);
    setLoading(true);
    try {
      const response = await sendChatMessageAI(text);
      if (response?.response) {
        setMessages((prev) =>
          prev.map((item) => item.id === tempId && response.message_id ? { ...item, id: response.message_id } : item),
        );
        setMessages((prev) => [
          ...prev,
          { id: `assistant-${response.message_id ?? Date.now()}`, text: response.response, isUser: false },
        ]);
        setHasHistory(true);
        void Promise.allSettled([
          refreshProfile(),
          queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/user/dashboard'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/user/skill-gaps'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/user/recommendations'] }),
        ]);
      } else {
        throw new Error('No response received from the AI.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to communicate with AI.');
    } finally {
      setLoading(false);
    }
  };

  const openHistory = async () => {
    if (loadingHistory) return;
    setLoadingHistory(true);
    setError(null);
    try {
      const history = await fetchChatHistoryAI();
      setMessages(Array.isArray(history) ? history : []);
      setMode('history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load past conversations.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const startFreshChat = () => {
    setMessages([]);
    setMode('fresh');
    setError(null);
    setTimeout(() => kickoffGuidedFlow(), 200);
  };

  const inputDockStyle = useAnimatedStyle(() => ({
    bottom: composerOffset.value,
  }));

  const showEmptyState = messages.length === 0 && !loading && !loadingHistory;
  const inHistoryMode = mode === 'history';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerStyle: { backgroundColor: theme.bg },
          headerShadowVisible: false,
          headerLeft: () => (
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()} style={[styles.headerBackBtn, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                <Feather name="arrow-left" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              <View style={[styles.headerIconWrap, { backgroundColor: theme.accent + '14', borderColor: theme.accent + '32' }]}>
                <Feather name="cpu" size={14} color={theme.accent} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: theme.text }]}>AI Assistant</Text>
                <Text style={[styles.headerSub, { color: theme.textTertiary }]}>
                  {inHistoryMode ? 'Viewing past conversation' : 'Fresh chat'}
                </Text>
              </View>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerRight}>
              {inHistoryMode ? (
                <TouchableOpacity
                  onPress={startFreshChat}
                  style={[styles.historyChip, { backgroundColor: theme.accent, borderColor: theme.accent }]}
                >
                  <Feather name="edit-3" size={12} color={theme.textOnAccent} />
                  <Text style={[styles.historyChipText, { color: theme.textOnAccent }]}>New chat</Text>
                </TouchableOpacity>
              ) : hasHistory ? (
                <TouchableOpacity
                  onPress={openHistory}
                  style={[styles.historyChip, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}
                  disabled={loadingHistory}
                >
                  <Feather name="clock" size={12} color={theme.textSecondary} />
                  <Text style={[styles.historyChipText, { color: theme.textSecondary }]}>
                    {loadingHistory ? 'Loading…' : 'Past chats'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ),
        }}
      />

      <View style={[styles.container, { backgroundColor: theme.bg }]}>

        <View style={styles.chatArea}>
          {loading && messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Reanimated.View entering={ZoomIn.springify()} style={[styles.emptyIconWrap, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '30' }]}>
                <Feather name="cpu" size={28} color={theme.accent} />
              </Reanimated.View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Preparing your assessment…</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
                The AI is warming up — this can take ~30 seconds the first time the local model loads.
              </Text>
              <TypingIndicator />
            </View>
          ) : showEmptyState ? (
            <View style={styles.emptyState}>
              <Reanimated.View entering={ZoomIn.springify()} style={[styles.emptyIconWrap, { backgroundColor: theme.accent + '10', borderColor: theme.accent + '30' }]}>
                <Feather name="cpu" size={28} color={theme.accent} />
              </Reanimated.View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Ask NexaPath AI</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
                Roadmap planning, skill gaps, interview prep, what to learn next — start fresh below.
              </Text>
              {hasHistory && !inHistoryMode ? (
                <TouchableOpacity
                  onPress={openHistory}
                  style={[styles.emptyHistoryBtn, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}
                  disabled={loadingHistory}
                >
                  <Feather name="clock" size={14} color={theme.accent} />
                  <Text style={[styles.emptyHistoryBtnText, { color: theme.accent }]}>
                    {loadingHistory ? 'Loading past chats…' : 'Open past conversations'}
                  </Text>
                  <Feather name="chevron-right" size={14} color={theme.accent} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              style={styles.list}
              data={messages}
              keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={({ item }) => <ChatBubble text={item.text} isUser={item.isUser} />}
              contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentInsetAdjustmentBehavior="always"
              automaticallyAdjustKeyboardInsets
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListHeaderComponent={inHistoryMode ? (
                <View style={[styles.historyBanner, { backgroundColor: theme.bg2, borderColor: theme.borderSubtle }]}>
                  <Feather name="clock" size={12} color={theme.textSecondary} />
                  <Text style={[styles.historyBannerText, { color: theme.textSecondary }]}>
                    Past conversation — tap “New chat” to start over.
                  </Text>
                </View>
              ) : null}
              ListFooterComponent={() => (
                <View style={styles.listFooter}>
                  {loading && <TypingIndicator />}
                  {error && (
                    <Reanimated.View entering={FadeInUp.duration(300)}>
                      <View style={[styles.errorBanner, { borderColor: '#EF444440', backgroundColor: '#EF444412' }]}>
                        <LinearGradient colors={['rgba(239,68,68,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} />
                        <Feather name="alert-circle" size={14} color="#EF4444" />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    </Reanimated.View>
                  )}
                </View>
              )}
            />
          )}
        </View>

        <Reanimated.View
          onLayout={(event) => setComposerHeight(event.nativeEvent.layout.height)}
          style={[styles.inputDock, inputDockStyle, { paddingBottom: composerPaddingBottom, backgroundColor: theme.surface, borderTopColor: theme.borderSubtle }]}
        >
          <ChatInput onSend={handleSend} disabled={loading || loadingHistory} />
        </Reanimated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, position: 'relative' },

  // Header
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', paddingRight: 14, gap: 8 },
  headerBackBtn: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  headerIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: { fontFamily: SANS, fontSize: 14, letterSpacing: 0.1 },
  headerSub: { fontFamily: SANS_REG, fontSize: 11, marginTop: 1 },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  historyChipText: { fontFamily: SANS_MED, fontSize: 11 },

  // Chat area
  chatArea: { flex: 1, minHeight: 0 },

  // History banner (in-list)
  historyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  historyBannerText: { fontFamily: SANS_MED, fontSize: 11 },

  // List
  list: { flex: 1, minHeight: 0 },
  listContent: {
    flexGrow: 1, justifyContent: 'flex-end',
    paddingHorizontal: 10, paddingTop: 16, paddingBottom: 18,
  },
  listFooter: { paddingBottom: 6 },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'center', marginTop: 14,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  errorText: { fontFamily: SANS_MED, color: '#EF4444', fontSize: 11 },

  // Input dock
  inputDock: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
    borderTopWidth: 1,
  },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
    borderWidth: 1,
  },
  emptyTitle: { fontFamily: SANS, fontSize: 18, textAlign: 'center', letterSpacing: 0.2 },
  emptySubtitle: { fontFamily: SANS_REG, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyHistoryBtnText: { fontFamily: SANS_MED, fontSize: 13 },
});
