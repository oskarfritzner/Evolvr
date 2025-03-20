import { View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

export default function CreatePostModal() {
  const { colors } = useTheme();

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
          headerShown: true,
        }}
      />
      {/* Add your create post form here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 