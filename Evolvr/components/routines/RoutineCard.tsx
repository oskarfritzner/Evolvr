import React, { useState, useEffect } from 'react'
import { TouchableOpacity, Text, StyleSheet, View, Image, Platform, Pressable } from 'react-native'
import { useTheme } from '@/context/ThemeContext'
import { FontAwesome5 } from '@expo/vector-icons'
import { Routine } from '@/backend/types/Routine'
import { useAuth } from '@/context/AuthContext'
import { routineService } from '@/backend/services/routineServices'
import { ParticipantData } from '@/backend/types/Participant'
import { RoutineStatsModal } from './RoutineStatsModal'
import { LeaveRoutineModal } from './LeaveRoutineModal'

interface RoutineCardProps {
  routine: Routine
  onPress: () => void
  onDelete: () => void
}

export default function RoutineCard({ routine, onPress, onDelete }: RoutineCardProps) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [showStats, setShowStats] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  const canDelete = routine.createdBy === user?.uid;
  const canLeave = !canDelete && routine.participants.includes(user?.uid || '');

  useEffect(() => {
    const loadParticipants = async () => {
      const participantData = await routineService.getParticipants(routine.participants);
      setParticipants(participantData);
    };
    loadParticipants();
  }, [routine.participants]);

  const handleLeave = async (keepPersonal: boolean) => {
    try {
      if (user) {
        await routineService.leaveRoutine(user.uid, routine.id, keepPersonal);
      } else {
        console.error('User is not authenticated');
      }
    } catch (error) {
      console.error('Error leaving routine:', error);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { 
        backgroundColor: colors.surface,
        borderColor: colors.border,
        opacity: routine.active ? 1 : 0.6
      }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.mainContent}>
        <View style={styles.leftContent}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {routine.title}
            </Text>
          </View>
          
          {routine.description && (
            <View style={styles.descriptionContainer}>
              <Text 
                style={[styles.description, { color: colors.textSecondary }]} 
                numberOfLines={2}
              >
                {routine.description.length > 100 
                  ? routine.description.substring(0, 100) + '...'
                  : routine.description}
              </Text>
            </View>
          )}
          
          <View style={styles.participants}>
            {participants.slice(0, 3).map((participant, index) => (
              <Image 
                key={`${participant.id}-${index}`}
                source={{ uri: participant.photoURL || 'https://via.placeholder.com/32' }}
                style={[
                  styles.participantImage, 
                  { 
                    marginLeft: index > 0 ? -8 : 0,
                    borderColor: colors.surface
                  }
                ]}
              />
            ))}
            {participants.length > 3 && (
              <View style={[styles.moreParticipants, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.moreParticipantsText, { color: colors.surface }]}>
                  +{participants.length - 3}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => setShowStats(true)}
            style={styles.actionButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome5 name="chart-bar" size={14} color={colors.textSecondary} />
          </TouchableOpacity>

          {canDelete ? (
            <TouchableOpacity
              onPress={onDelete}
              style={styles.actionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome5 name="trash" size={14} color={colors.error} />
            </TouchableOpacity>
          ) : canLeave && (
            <TouchableOpacity
              onPress={() => setShowLeaveModal(true)}
              style={styles.actionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome5 name="sign-out-alt" size={14} color={colors.warning} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <RoutineStatsModal
        visible={showStats}
        onClose={() => setShowStats(false)}
        routine={routine}
        participants={participants}
      />

      <LeaveRoutineModal
        visible={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onLeave={handleLeave}
        routineTitle={routine.title}
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: Platform.select({
    web: {
      flex: 1,
      minWidth: 300,
      borderRadius: 12,
      padding: 16,
      marginBottom: 0,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
    },
    default: {
      width: '100%',
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
    },
  }),
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContent: {
    flex: 1,
    marginRight: 12,
  },
  titleContainer: {
    marginBottom: 4,
  },
  descriptionContainer: {
    marginBottom: 8,
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  participantImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  moreParticipants: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreParticipantsText: {
    fontSize: 10,
    fontWeight: '600',
  },
  title: Platform.select({
    web: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    default: {
      fontSize: 15,
      fontWeight: '600',
    },
  }),
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  description: {
    fontSize: Platform.OS === 'ios' ? 13 : 12,
    lineHeight: Platform.OS === 'ios' ? 18 : 16,
    opacity: 0.8,
  },
}); 