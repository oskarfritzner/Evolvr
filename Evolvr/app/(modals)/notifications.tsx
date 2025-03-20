import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import NotificationList from "@/components/notifications/NotificationList";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { notificationService } from "@/backend/services/notificationService";

export default function NotificationsModal() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) {
      notificationService.markAllAsRead(user.uid);
    }
  }, [user?.uid]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.textPrimary,
          presentation: "modal",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.closeButton}
            >
              <Ionicons 
                name="close" 
                size={24} 
                color={colors.textPrimary} 
              />
            </TouchableOpacity>
          ),
        }}
      />
      <NotificationList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    marginLeft: 16,
    padding: 4,
  },
}); 