import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Pressable, TouchableOpacity } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { routineService } from '@/backend/services/routineServices'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import RoutineCard from './RoutineCard'
import CreateRoutine from './CreateRoutine'
import { useToast } from '@/context/ToastContext'
import ConfirmationDialog from '@/components/shared/ConfirmationDialog'
import { Router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { MotiView } from 'moti'
import { Routine } from '@/types'
import RoutineItem from './RoutineItem'
import { FilterButton } from '../common/FilterButton'
import NoData from '../common/NoData'

export interface RoutineGridProps {
  compact?: boolean
  onItemPress?: (routine: any) => void
  sharedWithMe?: boolean
}

export default function RoutineGrid({ 
  compact = false, 
  onItemPress,
  sharedWithMe = false,
}: RoutineGridProps) {
  const { colors } = useTheme()
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [deleteRoutineId, setDeleteRoutineId] = useState<string | null>(null)
  const [editRoutine, setEditRoutine] = useState<Routine | null>(null)
  const [filter, setFilter] = useState<'all' | 'current'>('all')
  const navigation = useNavigation()
  const router = useRoute() as Router

  useEffect(() => {
    if (router && router.params?.routineId) {
      const routineId = router.params.routineId as string
      navigation.navigate('routineDetails', { routineId })
    }
  }, [router?.params?.routineId, navigation])

  const { data: routines, isLoading, error, refetch } = useQuery(
    ['routines', user?.uid],
    () => routineService.getUserRoutines(user?.uid),
    {
      enabled: !!user?.uid,
      onError: (err) => {
        toast.show({
          message: 'Failed to load routines',
          type: 'error',
        })
        console.error('Failed to load routines:', err)
      },
    }
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleDelete = async () => {
    if (!deleteRoutineId) return

    try {
      await routineService.deleteRoutine(deleteRoutineId)
      await queryClient.invalidateQueries(['routines', user?.uid])
      toast.show({
        message: 'Routine deleted successfully',
        type: 'success',
      })
    } catch (error) {
      toast.show({
        message: 'Failed to delete routine',
        type: 'error',
      })
      console.error('Failed to delete routine:', error)
    } finally {
      setDeleteRoutineId(null)
    }
  }

  const handleRoutineCreated = () => {
    setCreateModalVisible(false)
    queryClient.invalidateQueries(['routines', user?.uid])
  }

  const activeRoutines = routines?.filter(routine => !routine.archivedAt) || []

  const filteredRoutines = activeRoutines.filter(routine => {
    if (filter === 'current') {
      return !routine.archivedAt
    }
    return true
  })

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  // Main content
  const content = (
    <View style={[styles.container, { backgroundColor: colors.background }, compact ? styles.compactContainer : {}]}>
      <View style={[styles.contentView, compact ? styles.compactContent : {}]}>
        <Text style={[styles.title, { color: colors.text }]}>My Routines</Text>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.routinesContainer, compact ? styles.compactRoutinesContainer : {}]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}
        >
          {activeRoutines.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {sharedWithMe
                  ? "No routines have been shared with you yet."
                  : "You haven't created any routines yet."}
              </Text>
              {!sharedWithMe && !compact && (
                <TouchableOpacity
                  style={[styles.createButton, { backgroundColor: colors.primary }]}
                  onPress={() => setCreateModalVisible(true)}
                >
                  <Text style={[styles.createButtonText, { color: colors.background }]}>
                    Create Routine
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.routinesGrid}>
              {activeRoutines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  sharedWithMe={sharedWithMe}
                  onPress={() => onItemPress?.(routine)}
                  onDelete={sharedWithMe ? undefined : () => setDeleteRoutineId(routine.id)}
                  compact={compact}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {!compact && !sharedWithMe && activeRoutines.length > 0 && (
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: colors.primary }]}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add" size={24} color={colors.background} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  // Render modals separately from the main content to avoid nesting issues
  return (
    <>
      {content}
      
      {deleteRoutineId && (
        <ConfirmationDialog
          visible={!!deleteRoutineId}
          title="Delete Routine"
          message="Are you sure you want to delete this routine? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDelete}
          onCancel={() => setDeleteRoutineId(null)}
        />
      )}
      
      <CreateRoutine
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onRoutineCreated={handleRoutineCreated}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  compactContainer: {
    padding: 8,
  },
  contentView: {
    flex: 1,
  },
  compactContent: {
    paddingVertical: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  routinesContainer: {
    paddingBottom: 20,
  },
  compactRoutinesContainer: {
    paddingBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  createButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routinesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    padding: 16,
    borderRadius: 50,
  },
})
