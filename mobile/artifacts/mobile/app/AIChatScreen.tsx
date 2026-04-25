import React, { useEffect, useRef, useState, useCallback } from "react";
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
  useWindowDimensions,
  type KeyboardEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { Stack, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { AppTheme } from "@/constants/theme";
import { AnimatedSection } from "@/components/AnimatedSection";
import { ChatSession, fetchChatSessionsAI, fetchChatHistoryAI, sendChatMessageAI } from "@/lib/api/chatApi";
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
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 768;

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([buildWelcomeMessage()]);

  const [drawerOpen, setDrawerOpen] = useState(isDesktop);
  const drawerAnim = useRef(new Animated.Value(isDesktop ? 0 : -280)).current;

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [composerHeight, setComposerHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const composerOffset = useRef(new Animated.Value(0)).current;

  const topPadding = insets.top;
  const composerPaddingBottom = keyboardVisible ? Math.max(8, insets.bottom) : 0;
  const listBottomPadding = composerHeight + composerPaddingBottom + 8;

  const scrollToLatest = () => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    Animated.spring(drawerAnim, {
      toValue: drawerOpen ? 0 : -280,
      useNativeDriver: false,
      friction: 9,
      tension: 60,
    }).start();
  }, [drawerOpen, drawerAnim]);

  useEffect(() => {
    if (isDesktop && !drawerOpen) setDrawerOpen(true);
  }, [isDesktop]);

  const loadSessions = async () => {
    try {
      const allSessions = await fetchChatSessionsAI();
      setSessions(allSessions);
    } catch (e) {
      console.warn("Failed to load chat sessions:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      handleNewChat();
      loadSessions();
    }, [])
  );

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

  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    if (!isDesktop) setDrawerOpen(false);

    setActiveSessionId(sessionId);
    setInitializing(true);
    setMessages([]);
    setError(null);

    try {
      const history = await fetchChatHistoryAI(sessionId);
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([buildWelcomeMessage()]);
      }
    } catch (e) {
      console.error(e);
      setMessages([buildWelcomeMessage()]);
    } finally {
      setInitializing(false);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setError(null);
    setLoading(false);
    setMessages([buildWelcomeMessage()]);
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    setError(null);
    const tempMessageId = `local-${Date.now()}`;
    const userMessage: Message = { id: tempMessageId, text, isUser: true };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await sendChatMessageAI(text, activeSessionId);
      if (response && response.response) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${response.message_id ?? Date.now().toString()}`,
            text: response.response,
            isUser: false,
          },
        ]);
        
        if (!activeSessionId && response.session_id) {
            setActiveSessionId(response.session_id);
            loadSessions();
        }
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

  const DrawerOverlay = () => {
    if (isDesktop || !drawerOpen) return null;
    return (
      <Pressable style={styles.drawerOverlay} onPress={() => setDrawerOpen(false)} />
    );
  };

  return (
    <View style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        
        <Animated.View style={[styles.drawer, { left: drawerAnim, paddingTop: topPadding + 14, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Chat History</Text>
            {!isDesktop && (
              <Pressable onPress={() => setDrawerOpen(false)} style={styles.drawerCloseBtn}>
                <Feather name="chevron-left" size={20} color={Colors.textSecondary} />
              </Pressable>
            )}
          </View>
          <Pressable style={[styles.drawerNewBtn, { overflow: "hidden" }]} onPress={handleNewChat}>
            <LinearGradient
              colors={Colors.gradientAccentTertiary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Feather name="plus" size={16} color={Colors.background} />
            <Text style={styles.drawerNewBtnText}>New Conversation</Text>
          </Pressable>
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.drawerList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = item.id === activeSessionId;
              let dateText = "";
              if (item.updated_at || item.created_at) {
                dateText = new Date(item.updated_at || item.created_at || "").toLocaleDateString();
              }
              return (
                <Pressable
                  style={[styles.sessionItem, active && styles.sessionItemActive]}
                  onPress={() => handleSelectSession(item.id)}
                >
                  <View style={styles.sessionTitleWrap}>
                     <Feather name="message-square" size={14} color={active ? Colors.accentTertiary : Colors.textTertiary} />
                     <Text style={[styles.sessionText, active && styles.sessionTextActive]} numberOfLines={1}>
                       {item.title}
                     </Text>
                  </View>
                  {dateText ? <Text style={styles.sessionDate}>{dateText}</Text> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.drawerEmpty}>No past conversations found.</Text>
            }
          />
        </Animated.View>

        <View style={styles.mainContent}>
          <DrawerOverlay />
          <AnimatedSection style={[styles.topBar, { paddingTop: topPadding }]} variant="down">
            <View style={styles.headerRow}>
              <View style={styles.leftGroup}>
                <Pressable style={styles.menuButton} onPress={() => setDrawerOpen(!drawerOpen)}>
                  <Feather name="menu" size={20} color={Colors.textPrimary} />
                </Pressable>
                <Image
                  source={require("@/assets/images/nexapath.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.titleContainer} pointerEvents="none">
                <Text style={styles.screenTitle}>AI Assistant</Text>
              </View>
              <Pressable style={[styles.newChatButton, { overflow: "hidden" }]} onPress={handleNewChat}>
                <LinearGradient
                  colors={Colors.gradientAccentTertiary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <Feather name="edit-3" size={14} color={Colors.background} />
                <Text style={styles.newChatButtonText}>New</Text>
              </Pressable>
            </View>
          </AnimatedSection>

          <View style={styles.chatFrame}>
            {initializing ? (
              <AnimatedSection style={styles.emptyState}>
                <ActivityIndicator size="large" color={Colors.accentTertiary} />
                <Text style={styles.emptyTitle}>Loading conversation...</Text>
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
    flexDirection: "row",
    backgroundColor: Colors.background,
    position: "relative",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.borderLight,
    zIndex: 50,
  },
  drawerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 40,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  drawerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  drawerCloseBtn: {
    padding: 4,
  },
  drawerNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.textPrimary,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: AppTheme.radius.md,
    marginBottom: 20,
  },
  drawerNewBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.background,
  },
  drawerList: {
    paddingHorizontal: 16,
    gap: 4,
  },
  sessionItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: AppTheme.radius.sm,
    gap: 6,
  },
  sessionItemActive: {
    backgroundColor: Colors.backgroundSecondary,
  },
  sessionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sessionTextActive: {
    color: Colors.accentTertiary,
    fontFamily: "Inter_600SemiBold",
  },
  sessionDate: {
    fontFamily: AppTheme.fonts.medium,
    fontSize: 11,
    color: Colors.textTertiary,
    marginLeft: 22,
  },
  drawerEmpty: {
    fontFamily: AppTheme.fonts.regular,
    color: Colors.textTertiary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
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
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  titleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 96,
    height: 38,
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

