import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { Challenge, ChallengeParticipation } from '@/backend/types/Challenge';
import { challengeService } from '@/backend/services/challengeService';
import { taskService } from '@/backend/services/taskService';
import { Button } from 'react-native-paper';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type Task from '@/backend/types/Task';
import Toast from 'react-native-toast-message';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/backend/config/firebase';
import { FontAwesome5 } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { userService } from '@/backend/services/userService';

interface TaskWithFrequency extends Task {
  frequency: string;
}

export default function ChallengeModal() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeTasks, setChallengeTasks] = useState<TaskWithFrequency[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const { data: userChallenges = [] } = useQuery<ChallengeParticipation[]>({
    queryKey: ['userChallenges', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      return challengeService.getUserChallenges(user.uid);
    },
    enabled: !!user?.uid,
  });
  const [isParticipating, setIsParticipating] = useState(false);

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadChallengeAndTasks(id);
    }
  }, [id]);

  useEffect(() => {
    if (challenge?.id && userChallenges) {
      const isUserParticipating = userChallenges.some((c: ChallengeParticipation) => c.id === challenge.id);
      setIsParticipating(isUserParticipating);
      console.log("Challenge participation status:", {
        challengeId: challenge.id,
        isParticipating,
        userChallengesCount: userChallenges.length
      });
    }
  }, [challenge?.id, userChallenges]);

  useEffect(() => {
    console.log("Full challenge data:", challenge);
  }, [challenge]);

  const loadChallengeAndTasks = async (challengeId: string) => {
    try {
      const challengeData = await challengeService.getChallengeById(challengeId);
      setChallenge(challengeData);

      if (challengeData?.tasks) {
        const taskPromises = challengeData.tasks.map(async (taskMeta) => {
          const [task] = await taskService.getTasksByIds([taskMeta.taskId]);
          return {
            ...task,
            frequency: taskMeta.frequency
          };
        });
        const tasksData = await Promise.all(taskPromises);
        setChallengeTasks(tasksData);
      }
    } catch (error) {
      console.error('Error loading challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async () => {
    if (!user?.uid || !challenge?.id) return;
    try {
      await challengeService.joinChallenge(user.uid, challenge.id);
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['challengeTasks', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['userData', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['activeTasks', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['userChallenges', user.uid] });

      Toast.show({
        type: 'success',
        text1: 'Challenge Joined',
        text2: 'You can now find it on your dashboard'
      });
      router.push('/(tabs)/dashboard');
    } catch (error) {
      console.error('Error joining challenge:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to join challenge',
        text2: 'Please try again'
      });
    }
  };

  const handleQuitChallenge = async () => {
    if (!user?.uid || !challenge?.id) return;
    try {
      await challengeService.quitChallenge(user.uid, challenge.id);
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['challengeTasks', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['userData', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['activeTasks', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['userChallenges', user.uid] });

      Toast.show({
        type: 'success',
        text1: 'Challenge Quit',
        text2: 'You have left the challenge'
      });

      // Force a refresh when navigating back to dashboard
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.error('Error quitting challenge:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to quit challenge',
        text2: 'Please try again'
      });
    }
  };

  const handleResetProgress = async (challengeId: string) => {
    if (!user?.uid || !challenge?.id) return;
    try {
      await challengeService.resetChallengeProgress(user.uid, challenge.id);
      Toast.show({
        type: 'success',
        text1: 'Challenge Progress Reset',
        text2: 'Your progress has been reset'
      });
      router.push('/(tabs)/dashboard');
    } catch (error) {
      console.error('Error resetting challenge progress:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to reset challenge progress',
        text2: 'Please try again'
      });
    }
  };

  const handleCompleteChallenge = async (challengeId: string) => {
    if (!user?.uid || !challenge?.id) return;
    try {
      await challengeService.quitChallenge(user.uid, challenge.id);
      Toast.show({
        type: 'success',
        text1: 'Challenge Completed',
        text2: 'Congratulations on completing the challenge!'
      });
      router.push('/(tabs)/dashboard');
    } catch (error) {
      console.error('Error completing challenge:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to complete challenge',
        text2: 'Please try again'
      });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!challenge) return null;

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: challenge?.title || 'Challenge Details',
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
          {/* Challenge Header */}
          <View style={[styles.header, { backgroundColor: colors.primary }]}>
            <Text style={[styles.description, { color: colors.textPrimary }]}>
              {challenge?.description}
            </Text>
            
            <View style={styles.metadataContainer}>
              <View style={[styles.metadataItem, { backgroundColor: colors.background + '20' }]}>
                <FontAwesome5 name="calendar-day" size={16} color={colors.textPrimary} />
                <Text style={[styles.metadataText, { color: colors.textPrimary }]}>
                  {challenge?.duration} days
                </Text>
              </View>
              
              <View style={[styles.metadataItem, { backgroundColor: colors.background + '20' }]}>
                <FontAwesome5 name="signal" size={16} color={colors.textPrimary} />
                <Text style={[styles.metadataText, { color: colors.textPrimary }]}>
                  {challenge?.difficulty}
                </Text>
              </View>
            </View>

            {challenge?.category && challenge.category.length > 0 && (
              <View style={styles.categories}>
                {challenge.category.map(cat => (
                  <View 
                    key={cat} 
                    style={[styles.categoryChip, { backgroundColor: colors.surface }]}
                  >
                    <Text style={[styles.categoryText, { color: colors.secondary }]}>
                      {cat}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Tasks Section */}
          <View style={styles.tasksSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Daily Tasks
            </Text>
            <View style={styles.tasksContainer}>
              {challengeTasks.map((task, index) => (
                <View 
                  key={task.id} 
                  style={[styles.taskCard, { backgroundColor: colors.surface }]}
                >
                  <View style={styles.taskHeader}>
                    <Text style={[styles.taskNumber, { color: colors.secondary }]}>
                      {index + 1}
                    </Text>
                    <Text style={[styles.taskTitle, { color: colors.textPrimary }]}>
                      {task.title}
                    </Text>
                  </View>
                  <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                    {task.description}
                  </Text>
                  <View style={styles.xpContainer}>
                    {Object.entries(task.categoryXp).map(([category, xp]) => 
                      xp > 0 ? (
                        <View 
                          key={category}
                          style={[styles.xpBadge, { backgroundColor: colors.secondary + '20' }]}
                        >
                          <Text style={[styles.xpText, { color: colors.secondary }]}>
                            {category}: {xp}XP
                          </Text>
                        </View>
                      ) : null
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Move buttons outside ScrollView but inside SafeAreaView */}
        <View style={[styles.buttonContainer, { backgroundColor: colors.background }]}>
          {isParticipating ? (
            <View style={styles.buttonGroup}>
              <Button
                mode="contained"
                onPress={handleQuitChallenge}
                style={[styles.button, { backgroundColor: colors.error }]}
                labelStyle={{ fontSize: 16, fontWeight: '600', letterSpacing: 0.5 }}
              >
                Quit Challenge
              </Button>
              <Button
                mode="contained"
                onPress={() => handleResetProgress(challenge?.id || '')}
                style={[styles.button, { backgroundColor: colors.warning }]}
                labelStyle={{ fontSize: 16, fontWeight: '600', letterSpacing: 0.5 }}
              >
                Reset Progress
              </Button>
            </View>
          ) : (
            <Button
              mode="contained"
              onPress={handleJoinChallenge}
              style={[styles.button, { backgroundColor: colors.secondary }]}
              labelStyle={{ fontSize: 16, fontWeight: '600', letterSpacing: 0.5 }}
            >
              Start Challenge
            </Button>
          )}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    marginBottom: 80,
  },
  header: {
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  metadataContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  metadataText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tasksSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  tasksContainer: {
    gap: 16,
  },
  taskCard: {
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  taskNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  xpContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '500',
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  button: {
    flex: 1,
    marginBottom: Platform.OS === 'ios' ? 8 : 0,
    height: 48,
    borderRadius: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
