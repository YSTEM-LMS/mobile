/**
 * (tabs)/_layout.tsx — Bottom Tab Navigator
 * UI/UX design by Sandith Hewage (Y STEM and Chess)
 */

import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { theme } from '@/design/theme';
import { fontSizes, fontWeights, palette, spacing } from '@/design/tokens';

type TabIconProps = { focused: boolean; label: string; emoji: string };

function TabIcon({ focused, emoji }: TabIconProps) {
  return (
    <Text
      style={{
        fontSize: 20,
        opacity: focused ? 1 : 0.45,
        transform: [{ scale: focused ? 1.05 : 1 }],
      }}
    >
      {emoji}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.ink,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: {
          fontSize: fontSizes.caption - 1,
          fontWeight: fontWeights.semibold,
          marginTop: -2,
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceStrong,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: spacing.xs,
          height: 60,
        },
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: (props) => <TabIcon {...props} label="Home" emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: (props) => (
            <TabIcon {...props} label="Learn" emoji="📚" />
          ),
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          title: 'Play',
          tabBarIcon: (props) => <TabIcon {...props} label="Play" emoji="♟" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: (props) => (
            <TabIcon {...props} label="Profile" emoji="👤" />
          ),
        }}
      />
    </Tabs>
  );
}
