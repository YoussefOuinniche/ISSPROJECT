import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type KeyboardEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { AnimatedSection } from "@/components/AnimatedSection";
import { sendChatMessageAI, fetchChatHistoryAI } from "@/lib/api/chatApi";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  createdAt?: string;
}

function buildWelcomeMessage(): Message {
  return {
    id: `welcome-${Date.now()}`,
    text: "Hi. Ask me anything about skills, roadmap, interview prep, or career growth.",
    isUser: false,
  };
}

export default function AIChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const composerOffset = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const topPadding = insets.top;
  const composerPaddingBottom = keyboardVisible ? Math.max(8, insets.bottom) : 0;
  const listBottomPadding = composerHeight + composerPaddingBottom + 8;

  const scrollToLatest = () => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    let mounted = true;

    const loadHistory = async () => {
      try {
        const history = await fetchChatHistoryAI();
        if (!mounted) return;

        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([buildWelcomeMessage()]);
        }
      } catch (loadError) {
        console.error("Failed to load chat history:", loadError);
        if (mounted) {
          setMessages([buildWelcomeMessage()]);
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };

    loadHistory();

    return () => {
      mounted = false;
    };
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
      scrollToLatest();
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

  useEffect(() => {
    if (messages.length > 0) {
      scrollToLatest();
    }
  }, [messages.length]);

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
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${response.message_id ?? Date.now().toString()}`,
            text: response.response,
            isUser: false,
          },
        ]);
      } else {
        throw new Error("No response received from the AI.");
      }
    } catch (sendError: unknown) {
      console.error(sendError);
      setError(sendError instanceof Error ? sendError.message : "Failed to communicate with AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setError(null);
    setLoading(false);
    setMessages([buildWelcomeMessage()]);
  };

  return (
    <View style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <AnimatedSection style={[styles.topBar, { paddingTop: topPadding }]} variant="down">
          <View style={styles.headerRow}>
            <Image
              source={require("@/assets/images/logo-nexapath.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.titleContainer} pointerEvents="none">
              <Text style={styles.screenTitle}>AI Assistant</Text>
            </View>
            <Pressable style={styles.newChatButton} onPress={handleNewChat}>
              <Feather name="edit-3" size={14} color={Colors.background} />
              <Text style={styles.newChatButtonText}>New</Text>
            </Pressable>
          </View>
        </AnimatedSection>

        <View style={styles.chatFrame}>
          {initializing ? (
            <AnimatedSection style={styles.emptyState}>
              <ActivityIndicator size="large" color={Colors.accentTertiary} />
              <Text style={styles.emptyTitle}>Loading chat session...</Text>
            </AnimatedSection>
          ) : (
            <FlatList
              ref={flatListRef}
              style={styles.list}
              data={messages}
              keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={({ item, index }) => (
                <ChatBubble text={item.text} isUser={item.isUser} index={index} />
              )}
              contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentInsetAdjustmentBehavior="always"
              automaticallyAdjustKeyboardInsets
              onContentSizeChange={scrollToLatest}
              onLayout={scrollToLatest}
              ListFooterComponent={() => (
                <View style={styles.listFooter}>
                  {loading && <TypingIndicator />}
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    position: "relative",
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  titleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 32,
    height: 32,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.1,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 24,
    backgroundColor: Colors.accentTertiary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  newChatButtonText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
  },
  chatFrame: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 12,
  },
  listFooter: {
    paddingBottom: 4,
  },
  errorText: {
    color: Colors.danger,
    textAlign: "center",
    marginTop: 14,
    fontSize: 13,
    fontFamily: "Newsreader_500Medium",
    backgroundColor: Colors.dangerLight,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
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
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginTop: 16,
  },
});
