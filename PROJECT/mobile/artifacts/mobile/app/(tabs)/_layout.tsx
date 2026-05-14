import { Tabs, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useGetCurrentUser } from '@workspace/api-client-react';
import { useTheme, SANS_MED } from '@/constants/theme';

function TabIcon({ name, focused, theme }: { name: string; focused: boolean; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[
      tabStyles.wrap,
      focused && { backgroundColor: theme.accent + '18', borderColor: theme.accent + '30', borderWidth: 1 },
    ]}>
      <Feather
        name={name as any}
        size={20}
        color={focused ? theme.tabActive : theme.tabInactive}
      />
      {focused && <View style={[tabStyles.activeLine, { backgroundColor: theme.tabActive }]} />}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 46,
    height: 40,
    borderRadius: 12,
  },
  activeLine: {
    position: 'absolute',
    bottom: 3,
    width: 16,
    height: 2.5,
    borderRadius: 2,
  },
});

export default function TabLayout() {
  const currentUserQuery = useGetCurrentUser();
  const theme = useTheme();

  useEffect(() => {
    if (!currentUserQuery.isError) return;
    router.replace('/login');
  }, [currentUserQuery.isError]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: theme.tabBg,
          borderTopWidth: 1,
          borderTopColor: theme.tabBorder,
          elevation: 0,
          shadowOpacity: 0,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: SANS_MED,
          letterSpacing: 0.4,
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} theme={theme} />,
        }}
      />
      <Tabs.Screen
        name="roadmap"
        options={{
          title: 'Roadmap',
          tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} theme={theme} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} theme={theme} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} theme={theme} />,
        }}
      />
      <Tabs.Screen name="skills" options={{ href: null }} />
      <Tabs.Screen name="learn" options={{ href: null }} />
      <Tabs.Screen name="trends" options={{ href: null }} />
    </Tabs>
  );
}
