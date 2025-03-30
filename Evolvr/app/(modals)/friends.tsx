import { View, StyleSheet, Animated } from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import FriendsList from "@/components/friends/FriendsList";
import { useAuth } from "@/context/AuthContext";
import { useFriends } from "@/hooks/queries/useFriends";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/errorHandlingMessages/errorMessage";

export default function FriendsModal() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { data: friends, isLoading, error } = useFriends(user?.uid);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "Friends",
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.textPrimary,
          presentation: "modal",
          headerShown: true,
        }}
      />
      
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message="Failed to load friends" fadeAnim={new Animated.Value(0)} />
      ) : (
        <FriendsList friends={friends || []} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 