import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform, useWindowDimensions, Modal } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Routine, RoutineTask } from '@/backend/types/Routine';
import { Card } from 'react-native-paper';
import { FontAwesome5 } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { ParticipantData } from '@/backend/types/Participant';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { routineService } from '@/backend/services/routineServices';
import { SafeAreaView } from 'react-native-safe-area-context';

interface RoutineStatsModalProps {
  visible: boolean;
  onClose: () => void;
  routine: Routine;
  participants: ParticipantData[];
}

interface TaskStats {
  totalCompletions: number;
  missedDays: number;
  lastCompleted: Timestamp | null;
  streakCount: number;
  perParticipant: {
    [userId: string]: {
      completed: number;
      missed: number;
      streak: number;
      lastCompleted: Timestamp | null;
      completionRate: number;
    };
  };
}

export function RoutineStatsModal({ visible, onClose, routine, participants }: RoutineStatsModalProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  // Query for real-time routine data
  const { data: currentRoutine } = useQuery({
    queryKey: ['routine', routine.id, 'stats'],
    queryFn: () => routineService.getRoutine(routine.id),
    enabled: visible,
    refetchInterval: 5000,
    initialData: routine,
  });

  const getTaskCompletionStats = (task: RoutineTask): TaskStats => {
    const today = new Date();
    const startDate = task.createdAt?.toDate() || today;
    const daysSinceCreation = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    const completions = Object.entries(task.completions || {});
    const perParticipant: TaskStats['perParticipant'] = {};
    
    // Initialize stats for all routine participants
    routine.participants.forEach(participantId => {
      const participantCompletions = completions.filter(([_, dayCompletions]) =>
        dayCompletions.some(completion => completion.completedBy === participantId)
      ).length;

      perParticipant[participantId] = {
        completed: participantCompletions,
        missed: Math.max(0, daysSinceCreation - participantCompletions),
        streak: calculateStreak(task.completions || {}, participantId),
        lastCompleted: getLastCompletion(task.completions || {}, participantId),
        completionRate: Math.min(100, (participantCompletions / Math.max(1, daysSinceCreation)) * 100)
      };
    });

    return {
      totalCompletions: completions.length,
      missedDays: Math.max(0, daysSinceCreation - completions.length),
      lastCompleted: completions[completions.length - 1]?.[1][0]?.completedAt || null,
      streakCount: task.streak || 0,
      perParticipant
    };
  };

  // Helper function to calculate streak
  const calculateStreak = (completions: Record<string, any[]>, userId: string): number => {
    const dates = Object.entries(completions)
      .filter(([_, dayCompletions]) => 
        dayCompletions.some(completion => completion.completedBy === userId)
      )
      .map(([date]) => new Date(date))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    for (let i = 0; i < dates.length - 1; i++) {
      const diff = Math.abs(dates[i].getTime() - dates[i + 1].getTime());
      if (diff <= 24 * 60 * 60 * 1000) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  // Helper function to get last completion
  const getLastCompletion = (completions: Record<string, any[]>, userId: string): Timestamp | null => {
    const userCompletions = Object.entries(completions)
      .filter(([_, dayCompletions]) => 
        dayCompletions.some(completion => completion.completedBy === userId)
      )
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

    return userCompletions[0]?.[1][0]?.completedAt || null;
  };

  // Convert tasks map to array and sort by completion rate
  const sortedTasks = Object.values(currentRoutine?.tasks ?? {}).sort((a, b) => {
    const statsA = getTaskCompletionStats(a);
    const statsB = getTaskCompletionStats(b);
    const avgCompletionRateA = Object.values(statsA.perParticipant).reduce((sum, p) => sum + p.completionRate, 0) / routine.participants.length;
    const avgCompletionRateB = Object.values(statsB.perParticipant).reduce((sum, p) => sum + p.completionRate, 0) / routine.participants.length;
    return avgCompletionRateB - avgCompletionRateA;
  });

  // Invalidate query when modal closes
  useEffect(() => {
    if (!visible) {
      queryClient.invalidateQueries({ queryKey: ['routine', routine.id, 'stats'] });
    }
  }, [visible, routine.id]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.background + 'F2' }]}>
        <View 
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.background,
              width: isDesktop ? '80%' : '100%',
              maxWidth: isDesktop ? 800 : undefined,
              borderRadius: isDesktop ? 12 : 0,
            }
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={[styles.header, { backgroundColor: colors.surface }]}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Routine Statistics
              </Text>
              <Pressable 
                onPress={onClose} 
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && { opacity: 0.7 }
                ]}
              >
                <FontAwesome5 name="times" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView 
              style={styles.content}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.overallStats, { backgroundColor: colors.surface }]}>
                <StatItem
                  icon="calendar-check"
                  label="Total Tasks"
                  value={sortedTasks.length}
                  color={colors.textPrimary}
                />
                <StatItem
                  icon="users"
                  label="Participants"
                  value={participants.length}
                  color={colors.secondary}
                />
                <StatItem
                  icon="fire"
                  label="Current Streak"
                  value={routine.metadata?.currentStreak || 0}
                  color={colors.warning}
                />
              </View>

              {sortedTasks.map((task, taskIndex) => {
                const stats = getTaskCompletionStats(task);
                
                return (
                  <Card 
                    key={`task-${task.id}-${taskIndex}`} 
                    style={[styles.taskCard, { 
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    }]}
                  >
                    <View style={styles.taskHeader}>
                      <Text style={[styles.taskTitle, { color: colors.textPrimary }]}>
                        {task.title}
                      </Text>
                      <Text style={[styles.taskCompletion, { color: colors.textSecondary }]}>
                        {stats.totalCompletions} completions
                      </Text>
                    </View>

                    {Object.entries(stats.perParticipant).map(([userId, pStats], participantIndex) => {
                      const participant = participants.find(p => p.id === userId);
                      if (!participant) return null;

                      return (
                        <View 
                          key={`participant-${userId}-${participantIndex}-${task.id}`} 
                          style={[
                            styles.participantStats, 
                            { 
                              backgroundColor: colors.background,
                              borderColor: colors.border,
                            }
                          ]}
                        >
                          <View style={styles.participantHeader}>
                            <Image
                              source={{ uri: participant.photoURL || 'https://via.placeholder.com/40' }}
                              style={styles.participantImage}
                            />
                            <Text style={[styles.participantName, { color: colors.textPrimary }]}>
                              {participant.username}
                            </Text>
                          </View>
                          
                          <View style={styles.participantMetrics}>
                            <StatItem
                              icon="check"
                              label="Completed"
                              value={pStats.completed}
                              color={colors.success}
                            />
                            <StatItem
                              icon="times"
                              label="Missed"
                              value={pStats.missed}
                              color={colors.error}
                            />
                            <StatItem
                              icon="fire"
                              label="Streak"
                              value={pStats.streak}
                              color={colors.warning}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </Card>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

interface StatItemProps {
  icon: string;
  label: string;
  value: number;
  color: string;
}

function StatItem({ icon, label, value, color }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <FontAwesome5 name={icon} size={16} color={color} />
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    margin: Platform.OS === 'ios' ? 0 : 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  overallStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  taskCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  taskCompletion: {
    fontSize: 14,
    opacity: 0.8,
  },
  participantStats: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  completionRate: {
    fontSize: 16,
    fontWeight: '600',
  },
  participantMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
    padding: 8,
    minWidth: 80,
  },
  statLabel: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
}); 