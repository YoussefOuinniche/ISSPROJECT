'use no memo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useRef, useEffect } from 'react';
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
import Colors from '@/constants/colors';
import { SANS_MED, useTheme } from '@/constants/theme';
import { sendChatMessageAI, fetchChatHistoryAI } from '@/lib/api/chatApi';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { refreshProfile, useAIProfile } from '@/hooks/useAIProfile';
import {
  fetchProfileId,
  getRoadmapWithSteps,
  type RoadmapWithSteps,
} from '@/services/supabaseService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  createdAt?: string;
}

export default function AIChatScreen() {
  const theme = useTheme();
  const { summary, explicitProfile } = useAIProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);
  const [activeRoadmap, setActiveRoadmap] = useState<RoadmapWithSteps | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const composerOffset = useSharedValue(0);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const assistantTargetRole = explicitProfile?.target_role || summary?.target_role || summary?.top_goal || null;
  const assistantUrgentGaps = Array.isArray(summary?.urgent_gaps) ? summary.urgent_gaps.slice(0, 2) : [];
  const assistantNextStep = summary?.next_step || null;
  const composerPaddingBottom = keyboardVisible
    ? Math.max(12, insets.bottom + 8)
    : Math.max(16, insets.bottom + 56);
  const listBottomPadding = composerHeight + composerPaddingBottom + 22;

  useEffect(() => {
    const loadRoadmapContext = async () => {
      try {
        const pid = await fetchProfileId();
        if (pid) setActiveRoadmap(await getRoadmapWithSteps(pid));
      } catch { /* non-critical */ }
    };
    loadRoadmapContext();
  }, []);

  const WELCOME_MSG = {
    id: 'welcome',
    text: "Hi, I am your NexaPath AI career assistant.\n\nI can help with roadmap steps, skill gaps, job fit, interview prep, and what to learn next. What do you want to work on today?",
    isUser: false,
  };

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await fetchChatHistoryAI();
        const base = history && history.length > 0 ? history : [WELCOME_MSG];
        setMessages(base);
        const pending = await AsyncStorage.getItem('@nexapath_pending_chat');
        if (pending) {
          await AsyncStorage.removeItem('@nexapath_pending_chat');
          setTimeout(() => handleSend(pending), 400);
        }
      } catch {
        setMessages([WELCOME_MSG]);
      } finally {
        setInitializing(false);
      }
    };
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const inputDockStyle = useAnimatedStyle(() => ({
    bottom: composerOffset.value,
  }));

  const hasContext = assistantTargetRole || assistantNextStep || assistantUrgentGaps.length > 0 || activeRoadmap;

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
              <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
                <Feather name="arrow-left" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
              <View style={[styles.headerIconWrap, { backgroundColor: theme.accent + '14', borderColor: theme.accent + '32' }]}>
                <Feather name="cpu" size={14} color={theme.accent} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: theme.text }]}>AI Assistant</Text>
                <Text style={[styles.headerSub, { color: theme.textTertiary }]}>Roadmap-aware career guide</Text>
              </View>
            </View>
          ),
        }}
      />

      {/* Background */}
      <View style={[styles.container, { backgroundColor: theme.bg }]}>

        <View style={styles.chatArea}>
          {/* AI Context Card */}
          {hasContext ? (
            <Reanimated.View entering={FadeInDown.duration(400)} style={[styles.contextCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
              <View style={[styles.contextTopLine, { backgroundColor: theme.accent }]} />
              <Text style={[styles.contextEyebrow, { color: theme.textTertiary }]}>Assistant context</Text>
              {assistantTargetRole ? (
                <Text style={styles.contextLine}>
                  <Text style={styles.contextKey}>Target: </Text>{assistantTargetRole}
                </Text>
              ) : null}
              {assistantUrgentGaps.length > 0 ? (
                <Text style={styles.contextLine}>
                  <Text style={styles.contextKey}>Gaps: </Text>{assistantUrgentGaps.join(', ')}
                </Text>
              ) : null}
              {assistantNextStep ? (
                <Text style={[styles.contextLine, { color: Colors.textTertiary }]}>
                  <Text style={styles.contextKey}>Next: </Text>{assistantNextStep}
                </Text>
              ) : null}
              {activeRoadmap ? (() => {
                const nextStep = activeRoadmap.steps.find(
                  (s) => s.status === 'available' || s.status === 'in_progress',
                );
                const completed = activeRoadmap.steps.filter((s) => s.status === 'completed').length;
                const total = activeRoadmap.steps.length;
                return (
                  <TouchableOpacity
                    style={[styles.roadmapContextRow, { backgroundColor: theme.bg2, borderColor: theme.borderSubtle }]}
                    onPress={() => router.push('/(tabs)/roadmap')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.roadmapContextLeft}>
                      <Text style={[styles.roadmapContextTitle, { color: theme.text }]} numberOfLines={1}>{activeRoadmap.title.toUpperCase()}</Text>
                      {nextStep ? (
                        <Text style={[styles.roadmapContextNext, { color: theme.textTertiary }]} numberOfLines={1}>{nextStep.title}</Text>
                      ) : null}
                    </View>
                    <View style={[styles.roadmapContextBadge, { backgroundColor: theme.accent + '20', borderColor: theme.accent + '40' }]}>
                      <Text style={[styles.roadmapContextPct, { color: theme.accent }]}>
                        {total > 0 ? Math.round((completed / total) * 100) : 0}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })() : null}
            </Reanimated.View>
          ) : null}

          {initializing ? (
            <View style={styles.emptyState}>
              <Reanimated.View entering={ZoomIn.springify()} style={styles.loadingOrb}>
                <View style={styles.loadingCore} />
              </Reanimated.View>
              <Text style={styles.emptyTitle}>Loading chat history</Text>
            </View>
          ) : messages.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Reanimated.View entering={ZoomIn.springify()} style={styles.emptyIconWrap}>
                <Feather name="cpu" size={28} color={Colors.primary} />
              </Reanimated.View>
              <Text style={styles.emptyTitle}>Ask NexaPath AI</Text>
              <Text style={styles.emptySubtitle}>Skills, gaps, roadmap steps, and career decisions.</Text>
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
              ListFooterComponent={() => (
                <View style={styles.listFooter}>
                  {loading && <TypingIndicator />}
                  {error && (
                    <Reanimated.View entering={FadeInUp.duration(300)}>
                      <View style={styles.errorBanner}>
                        <LinearGradient colors={['rgba(239,68,68,0.15)', 'transparent']} style={StyleSheet.absoluteFillObject} />
                        <Feather name="alert-circle" size={14} color={Colors.danger} />
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
          <ChatInput onSend={handleSend} disabled={loading || initializing} />
        </Reanimated.View>
      </View>
    </SafeAreaView>
  );
}

const MONO = SANS_MED;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, position: 'relative' },

  // Header
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBackBtn: {
    width: 32, height: 32, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  headerIconWrap: {
    width: 30, height: 30, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: { fontFamily: MONO, fontSize: 14, fontWeight: '700', letterSpacing: 0 },
  headerSub: { fontFamily: MONO, fontSize: 10, marginTop: 1, letterSpacing: 0 },

  // Chat area
  chatArea: { flex: 1, minHeight: 0 },

  // Context card
  contextCard: {
    marginHorizontal: 14, marginTop: 14, marginBottom: 4,
    padding: 14, borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  contextTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  contextEyebrow: { fontFamily: MONO, fontSize: 10, letterSpacing: 0.8, marginBottom: 8 },
  contextKey: { fontFamily: MONO, color: Colors.primary, fontWeight: '700' },
  contextLine: { fontFamily: MONO, fontSize: 11, lineHeight: 18, color: Colors.textSecondary, marginBottom: 3 },

  // Roadmap context
  roadmapContextRow: {
    marginTop: 10, flexDirection: 'row', alignItems: 'center',
    borderRadius: 5, padding: 10, gap: 10,
    borderWidth: 1,
  },
  roadmapContextLeft: { flex: 1 },
  roadmapContextTitle: { fontFamily: MONO, fontSize: 11, fontWeight: '700', marginBottom: 2, letterSpacing: 0 },
  roadmapContextNext: { fontFamily: MONO, fontSize: 10 },
  roadmapContextBadge: {
    borderRadius: 3, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1,
  },
  roadmapContextPct: { fontFamily: MONO, fontSize: 11, fontWeight: '700' },

  // List
  list: { flex: 1, minHeight: 0 },
  listContent: {
    flexGrow: 1, justifyContent: 'flex-end',
    paddingHorizontal: 10, paddingTop: 24, paddingBottom: 18,
  },
  listFooter: { paddingBottom: 6 },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'center', marginTop: 14,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 5,
    borderWidth: 1, borderColor: Colors.danger + '30',
    backgroundColor: Colors.danger + '10',
  },
  errorText: { fontFamily: MONO, color: Colors.danger, fontSize: 11 },

  // Input dock
  inputDock: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
    borderTopWidth: 1,
  },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: Colors.primary + '30',
    backgroundColor: Colors.primary + '10',
  },
  emptyTitle: { fontFamily: MONO, fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center', letterSpacing: 0.5 },
  emptySubtitle: { fontFamily: MONO, fontSize: 11, color: Colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  loadingOrb: { width: 56, height: 56, borderRadius: 6, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 16, backgroundColor: Colors.primary + '15', borderWidth: 1, borderColor: Colors.primary + '30' },
  loadingCore: { width: 16, height: 16, borderRadius: 3, backgroundColor: Colors.primary },
});
