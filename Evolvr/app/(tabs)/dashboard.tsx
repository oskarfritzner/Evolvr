import React, { useEffect, useState } from 'react';
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
  const { user } = useAuth();
  console.log('[Dashboard] Auth state:', {
    hasUser: !!user,
    userId: user?.uid,
    timestamp: new Date().toISOString()
  });

  const { data: userData, isLoading: userLoading, error: userError } = useUserData(user?.uid);
  console.log('[Dashboard] useUserData result:', {
    hasUserData: !!userData,
    userLoading,
    userError: !!userError,
    userId: user?.uid,
    timestamp: new Date().toISOString()
  });

  const { progress: progressData, isLoading: progressLoading } = useProgressData(user?.uid);
  const router = useRouter();
  const queryClient = useQueryClient();

  const loading = userLoading || progressLoading;
  const [journalModalVisible, setJournalModalVisible] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [selectedJournalType, setSelectedJournalType] = useState<JournalType | null>(null);

  // Move static styles here after colors is defined
  const staticStyles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
  });

  useClientLayoutEffect(() => {
    // Handle any dashboard layout calculations
    // This is especially important for the CategoryCardSlider
  }, [user?.userData?.categories]);

  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid) {
        queryClient.invalidateQueries({ queryKey: ['categories', user.uid] });
      }
    }, [user?.uid])
  );

  // Check if it's the user's first visit after onboarding
  useEffect(() => {
    const checkWelcomeModal = async () => {
      try {
        if (!userData?.userId) return;
        
        // Check for the should_show_welcome flag
        const shouldShowWelcome = await AsyncStorage.getItem(`should_show_welcome_${userData.userId}`);
        if (shouldShowWelcome === 'true') {
          setShowWelcomeModal(true);
          // Remove the flag immediately to prevent showing again
          await AsyncStorage.removeItem(`should_show_welcome_${userData.userId}`);
        }
      } catch (error) {
        logger.error('Error checking welcome modal state:', error);
      }
    };

    checkWelcomeModal();
  }, [userData?.userId]);

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
  };

  // Add safety check for user authentication
  useEffect(() => {
    if (!user) {
      // If no user, redirect to sign in
      router.replace('/(auth)/sign-in');
      return;
    }
  }, [user]);

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

  // Replace progress data log with more concise version
  logger.dev('Progress data:', {
    hasData: !!progressData,
    categories: progressData ? Object.keys(progressData) : [],
    timestamp: new Date().toISOString()
  });


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
              onCategoryPress={(category: string) => {
                router.push(`/(categoryPages)/${category}` as any);
              }}
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
            onClose={handleWelcomeModalClose} 
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