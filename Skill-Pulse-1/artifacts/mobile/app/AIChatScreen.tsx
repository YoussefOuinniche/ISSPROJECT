import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  type KeyboardEvent,
} from "react-native";
import { Stack, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { sendChatMessageAI, fetchChatHistoryAI } from "@/lib/api/chatApi";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { refreshProfile, useAIProfile } from "@/hooks/useAIProfile";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  createdAt?: string;
}

export default function AIChatScreen() {
  const { summary, explicitProfile } = useAIProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const composerOffset = useRef(new Animated.Value(0)).current;
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const assistantTargetRole =
    explicitProfile?.target_role ||
    summary?.target_role ||
    summary?.top_goal ||
    null;
  const assistantUrgentGaps =
    Array.isArray(summary?.urgent_gaps) ? summary.urgent_gaps.slice(0, 2) : [];
  const assistantNextStep = summary?.next_step || null;
  const composerPaddingBottom = keyboardVisible
    ? Math.max(12, insets.bottom + 8)
    : Math.max(16, insets.bottom + 56);
  const listBottomPadding = composerHeight + composerPaddingBottom + 22;

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await fetchChatHistoryAI();
        if (history && history.length > 0) {
          // Sort chronologically (assuming backend returns them in order or needs sorting)
          setMessages(history);
        } else {
          // Introduce the assistant if no history exists
          setMessages([
            {
              id: "1",
              text: "Hi! I am the SkillPulse AI Career Assistant. How can I help you today?",
              isUser: false,
            },
          ]);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
        setMessages([
          {
            id: "1",
            text: "Hi! I am the SkillPulse AI Career Assistant. How can I help you today?",
            isUser: false,
          },
        ]);
      } finally {
        setInitializing(false);
      }
    };
    
    loadHistory();
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const animateComposer = (toValue: number, duration?: number) => {
      Animated.timing(composerOffset, {
        toValue,
        duration: duration ?? 250,
        useNativeDriver: false,
      }).start();
    };

    const handleShow = (event: KeyboardEvent) => {
      setKeyboardVisible(true);
      const keyboardHeight = Math.max(0, event.endCoordinates.height - insets.bottom);
      animateComposer(keyboardHeight, event.duration);
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    };

    const handleHide = (event?: KeyboardEvent) => {
      setKeyboardVisible(false);
      animateComposer(0, event?.duration);
    };

    const showSubscription = Keyboard.addListener(showEvent, handleShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [composerOffset, insets.bottom]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    setError(null);
    const tempMessageId = `local-${Date.now()}`;
    const userMessage: Message = { id: tempMessageId, text, isUser: true };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await sendChatMessageAI(text);
      if (response && response.response) {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === tempMessageId && response.message_id
              ? { ...item, id: response.message_id }
              : item
          )
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${response.message_id ?? Date.now().toString()}`,
            text: response.response,
            isUser: false,
          },
        ]);

        void Promise.allSettled([
          refreshProfile(),
          queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/user/dashboard"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/user/skill-gaps"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/user/recommendations"] }),
        ]);
      } else {
        throw new Error("No response received from the AI.");
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to communicate with AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTitle: "AI Assistant",
          headerTitleStyle: { color: Colors.textPrimary, fontWeight: "600" },
          headerStyle: { backgroundColor: Colors.surface },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Feather name="arrow-left" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          ),
          headerShadowVisible: false,
        }} 
      />
      <LinearGradient colors={[Colors.backgroundSecondary, Colors.background]} style={styles.container}>
        <LinearGradient
          colors={["rgba(43,230,246,0.18)", "rgba(102,180,255,0.04)"]}
          style={[styles.glowOrb, styles.glowOrbTop]}
        />
        <LinearGradient
          colors={["rgba(62,140,255,0.14)", "rgba(43,230,246,0.02)"]}
          style={[styles.glowOrb, styles.glowOrbBottom]}
        />

        <View style={styles.chatArea}>
          {(assistantTargetRole || assistantNextStep || assistantUrgentGaps.length > 0) ? (
            <View style={styles.contextCard}>
              <Text style={styles.contextEyebrow}>AI context</Text>
              {assistantTargetRole ? (
                <Text style={styles.contextLine}>Target role: {assistantTargetRole}</Text>
              ) : null}
              {assistantUrgentGaps.length > 0 ? (
                <Text style={styles.contextLine}>
                  Urgent gaps: {assistantUrgentGaps.join(", ")}
                </Text>
              ) : null}
              {assistantNextStep ? (
                <Text style={styles.contextHint}>Next step: {assistantNextStep}</Text>
              ) : null}
            </View>
          ) : null}

          {initializing ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.emptyTitle}>Loading History...</Text>
            </View>
          ) : messages.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={48} color={Colors.border} />
              <Text style={styles.emptyTitle}>Start a Conversation</Text>
              <Text style={styles.emptySubtitle}>Ask about skills, gaps, or your next career move.</Text>
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
                  {error && <Text style={styles.errorText}>{error}</Text>}
                </View>
              )}
            />
          )}
        </View>

        <Animated.View
          onLayout={(event) => {
            setComposerHeight(event.nativeEvent.layout.height);
          }}
          style={[
            styles.inputDock,
            {
              bottom: composerOffset,
              paddingBottom: composerPaddingBottom,
            },
          ]}
        >
          <ChatInput onSend={handleSend} disabled={loading || initializing} />
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  container: {
    flex: 1,
    position: "relative",
  },
  headerButton: {
    padding: 8,
    marginLeft: -8,
  },
  chatArea: {
    flex: 1,
    minHeight: 0,
  },
  contextCard: {
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 4,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contextEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  contextLine: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  contextHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 24,
    paddingBottom: 18,
  },
  listFooter: {
    paddingBottom: 6,
  },
  errorText: {
    color: Colors.danger,
    textAlign: "center",
    marginTop: 14,
    fontSize: 14,
    backgroundColor: Colors.dangerLight,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  glowOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  glowOrbTop: {
    width: 220,
    height: 220,
    top: 24,
    right: -80,
  },
  glowOrbBottom: {
    width: 260,
    height: 260,
    bottom: 90,
    left: -120,
  },
  inputDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
});
