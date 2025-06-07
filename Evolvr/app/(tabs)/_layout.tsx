import React from "react";
import { Tabs } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Redirect } from "expo-router";
import { View, StyleSheet, Image, Platform } from "react-native";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface TabBarIconProps {
  focused: boolean;
  color: string;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to sign in if not authenticated
  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          height: Platform.OS === "ios" ? 85 : 65,
          paddingBottom: Platform.OS === "ios" ? 30 : 10,
          paddingTop: 10,
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: false,
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused, color }: TabBarIconProps) => (
            <View style={[styles.iconContainer, focused && styles.activeIcon]}>
              <FontAwesome5
                name="th-large"
                size={24}
                color={color}
                solid={focused}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="evolve"
        options={{
          tabBarIcon: ({ focused, color }: TabBarIconProps) => (
            <View style={[styles.iconContainer, focused && styles.activeIcon]}>
              <FontAwesome5
                name="bolt"
                size={24}
                color={color}
                solid={focused}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          tabBarIcon: ({ focused, color }: TabBarIconProps) => (
            <View style={[styles.iconContainer, focused && styles.activeIcon]}>
              <FontAwesome5
                name="users"
                size={24}
                color={color}
                solid={focused}
              />
            </View>
          ),
          tabBarAccessibilityLabel: "Community Tab",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused, color }: TabBarIconProps) => (
            <View style={[styles.iconContainer, focused && styles.activeIcon]}>
              {user?.userData?.photoURL ? (
                <Image
                  source={{ uri: user.userData.photoURL }}
                  style={[
                    styles.avatar,
                    { borderColor: color },
                    focused && styles.activeAvatar,
                  ]}
                />
              ) : (
                <FontAwesome5
                  name="user-circle"
                  size={24}
                  color={color}
                  solid={focused}
                />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  activeIcon: {
    transform: [{ scale: 1.1 }],
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
  activeAvatar: {
    transform: [{ scale: 1.1 }],
    borderWidth: 2,
  },
});
