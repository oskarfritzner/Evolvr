import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from "react-native"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/context/AuthContext"
import { JournalType } from '@/backend/types/JournalEntry';
import RoutineGrid from '@/components/routines/RoutineGrid';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import ChallengeGrid from '@/components/challenges/ChallengeGrid';

import { JournalModal } from '@/components/journal/JournalModal';
import AllHabits from '@/components/habit/AllHabits';
import CategoryCardSlider from '@/components/category/CategoryCardSlider/CategoryCardSlider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserData } from '@/hooks/queries/useUserData';
import { useProgressData } from '@/hooks/queries/useProgressData';
import logger from '@/utils/logger';
import { useClientLayoutEffect } from '@/hooks/utils/useClientLayoutEffect';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { WelcomeModal } from '@/components/modals/WelcomeModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QuickActionsBtnsBar from '@/components/quickActions/QuickActionsBtnsBar';

export default function Dashboard() {
  const { colors } = useTheme();
  const { user, isInitialized } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  // Define all state hooks first, before any other hooks
  const [journalModalVisible, setJournalModalVisible] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [selectedJournalType, setSelectedJournalType] = useState<JournalType | null>(null);

  // Only fetch user data when we have a user AND auth is initialized
  const { data: userData, isLoading: userLoading, error: userError } = useUserData(
    user && isInitialized ? user.uid : undefined
  );

  // Only fetch progress data when we have user data
  const { progress: progressData, isLoading: progressLoading } = useProgressData(
    userData ? user?.uid : undefined
  );
  
  // Create all callbacks in the same order every time
  const handleCategoryPress = useCallback((category: string) => {
    router.push(`/(categoryPages)/${category}` as any);
  }, [router]);

  const loading = useMemo(() => 
    userLoading || progressLoading || !isInitialized, 
    [userLoading, progressLoading, isInitialized]
  );

  // Static styles
  const staticStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
  });

  // Only run layout effect when categories actually change - properly memoized
  const categoriesKey = userData?.categories ? Object.keys(userData.categories).join(',') : '';
  useClientLayoutEffect(() => {
    if (!userData?.categories) return;
    // Handle layout calculations
  }, [categoriesKey]);

  // Properly memoize the focus effect callback
  const handleFocusEffect = useCallback(() => {
    // Only invalidate categories if they exist and we need fresh data
    if (user?.uid && userData?.categories) {
      // Check if the data is stale before invalidating
      const categoriesQueryData = queryClient.getQueryState(['categories', user.uid]);
      if (categoriesQueryData && categoriesQueryData.dataUpdatedAt < Date.now() - 1000 * 60 * 5) {
        queryClient.invalidateQueries({ 
          queryKey: ['categories', user.uid],
          exact: true 
        });
      }
    }
  }, [user?.uid, userData?.categories, queryClient]);

  // Only invalidate categories on focus if they exist
  useFocusEffect(handleFocusEffect);

  // Check welcome modal only when user ID changes
  useEffect(() => {
    if (!userData?.userId) return;
    
    const checkWelcomeModal = async () => {
      try {
        const shouldShowWelcome = await AsyncStorage.getItem(`should_show_welcome_${userData.userId}`);
        if (shouldShowWelcome === 'true') {
          setShowWelcomeModal(true);
          await AsyncStorage.removeItem(`should_show_welcome_${userData.userId}`);
        }
      } catch (error) {
        logger.error('Error checking welcome modal state:', error);
      }
    };

    checkWelcomeModal();
  }, [userData?.userId]);

  // Redirect if no user and auth is initialized
  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/(auth)/sign-in');
    }
  }, [user, isInitialized, router]);

  // Log progress data in a useEffect to ensure consistent log placement
  useEffect(() => {
    if (progressData) {
      logger.dev('Progress data:', {
        hasData: !!progressData,
        categories: progressData ? Object.keys(progressData) : [],
        timestamp: new Date().toISOString()
      });
    }
  }, [progressData]);

  // Show loading spinner while data is loading
  if (loading) {
    return (
      <SafeAreaView style={[staticStyles.safeArea]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LoadingSpinner />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle errors gracefully with retry option
  if (userError) {
    return (
      <SafeAreaView style={[staticStyles.safeArea]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={[styles(colors).errorText, { marginBottom: 10 }]}>
            Unable to load your dashboard data
          </Text>
          <TouchableOpacity 
            onPress={() => queryClient.invalidateQueries({ queryKey: ['userData', user?.uid] })}
            style={[styles(colors).button, { backgroundColor: colors.secondary }]}
          >
            <Text style={{ color: colors.surface }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Add null check for user data
  if (!userData) {
    return (
      <SafeAreaView style={[staticStyles.safeArea]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Setting up your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[staticStyles.safeArea]} edges={['top']}>
      <ScrollView 
        style={[staticStyles.container, { backgroundColor: colors.surface }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles(colors).container, { backgroundColor: colors.surface }]}>
          {/* Header Section */}
          <View style={styles(colors).header}>
            <Text style={[styles(colors).headerText, { color: colors.textPrimary }]}>
              Welcome back, {userData?.username || 'User'}
            </Text>
            <Text style={[styles(colors).headerSubtitle, { color: colors.textSecondary }]}>
              Evolve your life by completing tasks and challenges, Setting routines or work on new habits!
            </Text>
          </View>

          <QuickActionsBtnsBar />

          {/* Category Progress Cards */}
          {userData?.categories && (
            <CategoryCardSlider 
              onCategoryPress={handleCategoryPress}
            />
          )}
          
          {/* Main Content Cards */}
          <View style={styles(colors).cardsContainer}>
            {/* Routines Section */}
            <View style={styles(colors).card}>
              <RoutineGrid compact={true} />
            </View>

            {/* Habits Section */}
            <View style={styles(colors).card}>
              <AllHabits compact={true} />
            </View>

            {/* Challenges Section */}
            <View style={styles(colors).card}>
              <ChallengeGrid compact={true} />
            </View>
          </View>

          <JournalModal 
            visible={journalModalVisible}
            onClose={() => {
              setJournalModalVisible(false);
              setSelectedJournalType(null);
            }}
            initialType={selectedJournalType}
          />

          {/* Welcome Modal which open the first time the user enters after onboarding*/}

          <WelcomeModal 
            visible={showWelcomeModal} 
            onClose={() => {
              setShowWelcomeModal(false);
            }} 
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Platform.OS === 'ios' ? 16 : 12,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  header: {
    padding: 16,
    backgroundColor: "transparent",
    borderRadius: 12,
    marginBottom: 18,
    paddingTop: 20,
  },
  headerText: {
    fontSize: Platform.OS === 'ios' ? 22 : 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    paddingTop: 8,
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 5,
    borderRadius: 12,
    marginBottom: 10,
    marginLeft: 12,
    gap: 8,
  },
  quickActionButton: {
    flex: 0,
    minWidth: 100,
    borderRadius: 6
  },
  cardsContainer: Platform.select({
    web: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      padding: 16,
    },
    default: {
      flexDirection: 'column',
      gap: 12,
      padding: 12,
    },
  }),
  card: Platform.select({
    web: {
      flex: 1,
      minWidth: 300,
      borderRadius: 12,
      padding: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
    default: {
      width: '100%',
      borderRadius: 12,
      padding: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
    },
  }),
  section: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
    color: colors.error,
  },
  button: {
    padding: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary,
  },
});