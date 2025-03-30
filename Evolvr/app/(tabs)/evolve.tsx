import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import ActiveTasksList from "@/components/tasks/activeTasksList";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserData } from "@/hooks/queries/useUserData";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Create a client with shorter stale times
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Reduce retry attempts
      staleTime: 1000, // 1 second
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function EvolveContent() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { data: userData, isLoading: userLoading } = useUserData(user?.uid);
  const insets = useSafeAreaInsets();

  if (userLoading || !user) return <LoadingSpinner />;

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? insets.top : 16,
      paddingBottom: 16,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header} />
        <View style={styles.contentContainer}>
          <ActiveTasksList />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function Evolve() {
  return (
    <QueryClientProvider client={queryClient}>
      <EvolveContent />
    </QueryClientProvider>
  );
}