import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import CreatePost from "@/components/posts/create-post";

export default function CreatePostModal() {
  const { colors } = useTheme();
  const router = useRouter();

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handlePostCreated = useCallback(() => {
    router.replace("/(tabs)/profile");
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "Create Post",
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.textPrimary,
          presentation: "modal",
          headerShown: false, // Hide header since CreatePost has its own
        }}
      />
      <CreatePost 
        visible={true}
        onClose={handleClose}
        onPostCreated={handlePostCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 