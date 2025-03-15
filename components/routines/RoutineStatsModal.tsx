import React, { useEffect } from 'react';
import { View, Text, Modal, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Routine, RoutineTask } from '@/backend/types/Routine';
import { Card } from 'react-native-paper';
import { FontAwesome5 } from '@expo/vector-icons';
import { Timestamp } from 'firebase/firestore';
import { ParticipantData } from '@/backend/types/Participant';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { routineService } from '@/backend/services/routineServices';

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
    };
  };
}

export function RoutineStatsModal({ visible, onClose, routine, participants }: RoutineStatsModalProps) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  // Query for real-time routine data
  const { data: currentRoutine } = useQuery({
    queryKey: ['routine', routine.id, 'stats'],
    queryFn: () => routineService.getRoutine(routine.id),
    enabled: visible, // Only fetch when modal is visible
    refetchInterval: 5000, // Refetch every 5 seconds while modal is open
    initialData: routine,
  });

  const getTaskCompletionStats = (task: RoutineTask): TaskStats => {
    const today = new Date();
    const startDate = task.createdAt?.toDate() || today;
    const daysSinceCreation = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const completions = Object.entries(task.completions || {});
    const perParticipant: TaskStats['perParticipant'] = {};
    
    // Initialize stats for all routine participants instead of just task participants
    routine.participants.forEach(participantId => {
      perParticipant[participantId] = {
        completed: 0,
        missed: daysSinceCreation,
        streak: 0,
        lastCompleted: null
      };
    });

    // Calculate per-participant stats
    completions.forEach(([date, dayCompletions]) => {
      dayCompletions.forEach(completion => {
        const userId = completion.completedBy;
        if (perParticipant[userId]) {
          perParticipant[userId].completed++;
          perParticipant[userId].missed--;
          perParticipant[userId].lastCompleted = completion.completedAt;
        }
      });
    });

    return {
      totalCompletions: completions.length,
      missedDays: daysSinceCreation - completions.length,
      lastCompleted: completions[completions.length - 1]?.[1][0]?.completedAt || null,
      streakCount: task.streak || 0,
      perParticipant
    };
  };

  // Convert tasks map to array and sort
  const sortedTasks = Object.values(currentRoutine?.tasks ?? {}).sort((a, b) => {
    const statsA = getTaskCompletionStats(a);
    const statsB = getTaskCompletionStats(b);
    return statsB.totalCompletions - statsA.totalCompletions;
  });

  // Invalidate query when modal closes to ensure fresh data next time
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
      <View style={[styles.modalContainer, { backgroundColor: colors.background + 'F2' }]}>
        <Card 
          style={[styles.card, { 
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
          }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Routine Statistics
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <FontAwesome5 name="times" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.content}>

            {sortedTasks.map((task) => {
              const stats = getTaskCompletionStats(task);
              
              return (
                <Card 
                  key={task.id} 
                  style={[styles.taskCard, { 
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                  }]}
                >
                  <Text style={[styles.taskTitle, { color: colors.textPrimary }]}>
                    {task.title}
                  </Text>

                  {Object.entries(stats.perParticipant).map(([userId, pStats]) => {
                    const participant = participants.find(p => p.id === userId);
                    if (!participant) return null;

                    return (
                      <View 
                        key={userId} 
                        style={[
                          styles.participantStats, 
                          { 
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderWidth: 1,
                          }
                        ]}
                      >
                        <View style={styles.participantHeader}>
                          <Image
                            source={{ uri: participant.photoURL }}
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
        </Card>
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  taskCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  participantStats: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
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
  },
  participantMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  overallStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
}); 