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
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { AnimatedSection } from "@/components/AnimatedSection";
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

function trackAssistantEvent(event: string, payload: Record<string, unknown> = {}) {
  // TODO(analytics): Replace console markers with production analytics SDK events.
  console.info("[Telemetry][Assistant]", event, payload);
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
  const assistantHighPrioritySkills =
    Array.isArray(summary?.high_priority_skills) ? summary.high_priority_skills.slice(0, 2) : [];
  const assistantNextStep = summary?.recommended_next_step || summary?.next_step || null;
  const marketPromptSeed = assistantHighPrioritySkills[0] || assistantUrgentGaps[0] || null;
  const marketPrompt = marketPromptSeed
    ? `Use market demand data to create a 2-week plan for ${marketPromptSeed}${assistantTargetRole ? ` toward ${assistantTargetRole}` : ""}.`
    : assistantNextStep
    ? `I have this suggested next step: ${assistantNextStep}. Refine it using current market demand trends.`
    : "What does current market demand suggest I should prioritize next?";
  const composerPaddingBottom = keyboardVisible
    ? Math.max(8, insets.bottom)
    : 0;
  const listBottomPadding = composerHeight + composerPaddingBottom + 8;

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
    <View style={styles.safeArea}>
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
      <View style={styles.container}>
        
        

        <View style={styles.chatArea}>
          {initializing ? (
            <AnimatedSection style={styles.emptyState}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.emptyTitle}>Loading History...</Text>
            </AnimatedSection>
          ) : messages.length === 0 && !loading ? (
            <AnimatedSection style={styles.emptyState}>
              <Feather name="message-circle" size={48} color={Colors.border} />
              <Text style={styles.emptyTitle}>Start a Conversation</Text>
              <Text style={styles.emptySubtitle}>Ask about skills, gaps, or your next career move.</Text>
              <View style={styles.suggestionGrid}>
                <TouchableOpacity style={styles.suggestionChip} onPress={() => handleSend("What skills should I learn next?")}>
                  <Text style={styles.suggestionText}>What should I learn next?</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionChip} onPress={() => handleSend("How can I close my skill gaps?")}>
                  <Text style={styles.suggestionText}>Fix my skill gaps</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.suggestionChip} onPress={() => handleSend("Help me prepare for an interview.")}>
                  <Text style={styles.suggestionText}>Interview prep</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.suggestionChip}
                  onPress={() => {
                    trackAssistantEvent("market_prompt_used", {
                      hasTargetRole: Boolean(assistantTargetRole),
                      promptSeed: marketPromptSeed || null,
                    });
                    handleSend(marketPrompt);
                  }}
                >
                  <Text style={styles.suggestionText}>Market priority plan</Text>
                </TouchableOpacity>
              </View>
            </AnimatedSection>
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
      </View>
    </View>
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
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contextEyebrow: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  contextLine: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textPrimary,
    fontWeight: "500",
    marginBottom: 2,
  },
  contextHint: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textTertiary,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  listFooter: {
    paddingBottom: 4,
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
  
  
  
  inputDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  suggestionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
  },
  suggestionChip: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
});
