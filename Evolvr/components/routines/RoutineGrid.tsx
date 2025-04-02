import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import type { Routine } from '@/backend/types/Routine';
import RoutineCard from './RoutineCard';
import  CreateRoutine  from '@/components/routines/CreateRoutine';
import { useRoutines } from '@/hooks/queries/useRoutines';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useClientLayoutEffect } from '@/hooks/utils/useClientLayoutEffect';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';
import Toast from 'react-native-toast-message';
import { useQueryClient } from '@tanstack/react-query';
import { routineService } from '@/backend/services/routineServices';

interface Props {
  compact?: boolean;
  style?: ViewStyle;
}

const RoutineGrid: React.FC<Props> = ({ compact, style }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [deleteRoutineId, setDeleteRoutineId] = useState<string | null>(null);
  
  const { routines, isLoading } = useRoutines(user?.uid);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user?.uid) {
      queryClient.prefetchQuery({
        queryKey: ['routines', user.uid],
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000
      });
    }
  }, [user?.uid]);

  useClientLayoutEffect(() => {
    // Handle any grid layout calculations or animations
  }, [compact, routines?.length]);

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.secondary }]}>
            Your Routines
          </Text>
          <View style={[styles.addButton, { backgroundColor: colors.secondary }]} />
        </View>
        <View style={[styles.content, compact && styles.compactContent]}>
          <LoadingSpinner />
        </View>
      </View>
    );
  }

  const handleRoutinePress = (routine: Routine) => {
    setSelectedRoutine(routine);
    setCreateModalVisible(true);
  };

  const handleCreateNew = () => {
    setSelectedRoutine(null);
    setCreateModalVisible(true);
  };

  const activeRoutines = routines?.filter(routine => routine.active) || [];

  const handleDelete = async () => {
    if (!user?.uid || !deleteRoutineId) return;
    
    try {
      // Debug log
      console.log('Delete attempt:', {
        userId: user.uid,
        routineId: deleteRoutineId,
        hasCompletedOnboarding: !!user?.userData,
        isAuthenticated: !!user
      });
      
      await routineService.deleteRoutine(user.uid, deleteRoutineId);
      queryClient.invalidateQueries({ queryKey: ['routines', user.uid] });
      Toast.show({
        type: 'success',
        text1: 'Routine deleted successfully'
      });
    } catch (error) {
      console.error('Delete error details:', {
        error,
        userId: user.uid,
        routineId: deleteRoutineId
      });
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete routine'
      });
    } finally {
      setDeleteRoutineId(null);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.secondary }]}>
          Your Routines
        </Text>
        <TouchableOpacity
          onPress={handleCreateNew}
          style={[styles.addButton, { backgroundColor: colors.secondary }]}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome5 name="plus" size={16} color={colors.surface} />
        </TouchableOpacity>
      </View>

      <View style={[styles.content, compact && styles.compactContent]}>
        {activeRoutines.length === 0 ? (
          <TouchableOpacity
            style={[styles.emptyState, { borderColor: colors.textSecondary }]}
            onPress={handleCreateNew}
            accessibilityLabel="Create your first routine"
            accessibilityRole="button"
          >
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No active routines. Tap to create one!
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[
            styles.routinesContainer,
            compact && styles.compactRoutinesContainer
          ]}>
            {activeRoutines.map((routine) => (
              <View 
                key={routine.id} 
                style={[
                  styles.routineCardWrapper,
                  Platform.select({
                    web: { minWidth: 300, maxWidth: 400 }
                  })
                ]}
              >
                <RoutineCard
                  routine={routine}
                  onPress={() => handleRoutinePress(routine)}
                  onDelete={() => setDeleteRoutineId(routine.id)}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {createModalVisible && (
        <CreateRoutine
          visible={true}
          onClose={() => setCreateModalVisible(false)}
          routine={selectedRoutine}
        />
      )}

      {!!deleteRoutineId && (
        <ConfirmationDialog
          visible={true}
          title="Delete Routine"
          message="Are you sure you want to delete this routine? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteRoutineId(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 16 : 12,
    paddingHorizontal: 8,
    zIndex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.6,
  },
  addButton: {
    padding: Platform.OS === 'ios' ? 10 : 8,
    borderRadius: 20,
    width: Platform.OS === 'ios' ? 40 : 36,
    height: Platform.OS === 'ios' ? 40 : 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    width: '100%',
    position: 'relative',
    zIndex: 0,
  },
  compactContent: {
    flex: 1,
  },
  routinesContainer: Platform.select({
    web: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      padding: 16,
      justifyContent: 'flex-start',
      alignItems: 'stretch',
    },
    default: {
      flexDirection: 'column',
      gap: 12,
      padding: 12,
    },
  }),
  compactRoutinesContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  routineCardWrapper: Platform.select({
    web: {
      flex: 1,
      maxWidth: '48%', // Just under 50% to account for gap
      minWidth: 300,
    },
    default: {
      width: '100%',
    },
  }),
  emptyState: {
    margin: 16,
    padding: Platform.OS === 'ios' ? 24 : 20,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: Platform.OS === 'ios' ? 15 : 14,
    textAlign: 'center',
    lineHeight: Platform.OS === 'ios' ? 22 : 20,
  },
});

export default RoutineGrid;
