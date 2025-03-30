import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Challenge, UserChallenge } from '@/backend/types/Challenge';
import { challengeService } from '@/backend/services/challengeService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import ChallengeCard from '@/components/challenges/ChallengeCard';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { userService } from '@/backend/services/userService';

export default function ChallengeListModal() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  // Add query for user challenges
  const { data: userChallenges = [] } = useQuery({
    queryKey: ['userChallenges', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      return challengeService.getUserChallenges(user.uid);
    },
    enabled: !!user?.uid,
  });

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const allChallenges = await challengeService.getAllChallenges();
      setChallenges(allChallenges);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Available Challenges',
          presentation: 'modal',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{
                padding: 8,
                marginLeft: 8,
                marginRight: 16
              }}
            >
              <FontAwesome5 
                name="arrow-left" 
                size={20} 
                color={colors.textPrimary} 
              />
            </TouchableOpacity>
          ),
        }} 
      />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.titleContainer}>
            <TouchableOpacity 
              style={styles.infoButton}
              onPress={() => {/* Add info modal logic */}}
            >
            </TouchableOpacity>
          </View>

          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            Join exciting challenges to push your limits and earn special rewards. Complete daily tasks, maintain streaks, and compete with others to reach your goals! 🏆
          </Text>

          <View style={styles.content}>
            {challenges.length === 0 ? (
              <View style={[styles.emptyState, { borderColor: colors.primary }]}>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No available challenges at the moment.
                </Text>
              </View>
            ) : (
              challenges.map(challenge => {
                // Check if user is participating in this challenge
                const isParticipating = userChallenges.some(
                  (userChallenge) => userChallenge.id === challenge.id
                );

                // Convert challenge to UserChallenge type if participating
                const challengeData = isParticipating 
                  ? userChallenges.find((uc) => uc.id === challenge.id)
                  : {
                      ...challenge,
                      startDate: 0,
                      active: false,
                      progress: 0,
                      taskProgress: [],
                      taskCompletions: {},
                    };

                return (
                  <ChallengeCard 
                    key={challenge.id} 
                    challenge={challengeData as UserChallenge}
                    onLeave={isParticipating ? () => router.push({
                      pathname: "/(modals)/challenge",
                      params: { id: challenge.id }
                    }) : undefined}
                  />
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  infoButton: {
    padding: 4,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
