import { router, Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#333333",
        tabBarActiveBackgroundColor: Colors.gradientAccentTertiary[0],
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => {
          const { style, ...pressableProps } = props as any;
          const flatStyle = StyleSheet.flatten(style);
          const isActive = !!flatStyle?.backgroundColor && flatStyle.backgroundColor !== "transparent";

          return (
            <View style={[style, { borderRadius: 10, overflow: "hidden" }]}>
              {isActive && (
                <LinearGradient
                  colors={Colors.gradientAccentTertiary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
              )}
              <Pressable
                {...pressableProps}
                android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: false }}
                style={({ pressed }) => [
                  { flex: 1 },
                  pressed && styles.tabButtonPressed,
                ]}
              />
            </View>
          );
        },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: Platform.OS === "android" ? 1 : 0.5,
          borderTopColor: "#E5E7EB",
          elevation: 0,
          shadowColor: "#000000",
          shadowOpacity: 0.04,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: -1 },
          height: isWeb ? 90 : 78,
          paddingTop: 4,
          paddingBottom: isWeb ? 10 : 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          letterSpacing: 0,
        },
        tabBarItemStyle: {
          marginHorizontal: 6,
          marginTop: 2,
          marginBottom: 6,
          paddingVertical: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="skills"
        options={{
          title: "Skills",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar" tintColor={color} size={24} />
            ) : (
              <Feather name="bar-chart-2" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="book" tintColor={color} size={24} />
            ) : (
              <Feather name="book-open" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: "Trends",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="arrow.up.right.circle" tintColor={color} size={24} />
            ) : (
              <Feather name="trending-up" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: "AI Assistant",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="sparkles" tintColor={color} size={24} />
            ) : (
              <Feather name="message-circle" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const currentUserQuery = useGetCurrentUser();

  useEffect(() => {
    if (!currentUserQuery.isError) return;
    router.replace("/login");
  }, [currentUserQuery.isError]);

  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  tabButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  tabButtonPressed: {
    opacity: 0.85,
  },
});
