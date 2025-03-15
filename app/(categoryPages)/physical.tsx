import React, { useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, FlatList, StyleSheet } from "react-native"
import { useTheme } from "@/context/ThemeContext"
import { useAuth } from "@/context/AuthContext"
import { FontAwesome5 } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import ProgressBar from "@/components/ProgressBar"
import { levelService } from "@/backend/services/levelService"
import CategoryTasks from "@/components/category/CategoryTasks"
import { categoryPageStyles } from "@/styles/categoryPageStyles"
import CategoryProgressChart from '@/components/category/CategoryProgressChart'
import { showMessage } from "@/utils/showMessage"
import Toast from "react-native-toast-message"
import { SafeAreaView as SafeAreaViewRN } from 'react-native-safe-area-context'
import { CategoryPage } from "@/components/category/CategoryPage"

export default function Physical() {
  const { user } = useAuth()
  const categoryData = user?.userData?.categories?.physical

  if (!categoryData) return null

  const resources = [
    {
      id: '1',
      title: 'Workout Library',
      description: 'Browse exercises and workout routines',
      icon: 'dumbbell'
    },
    {
      id: '2',
      title: 'Nutrition Guide',
      description: 'Healthy eating tips and meal plans',
      icon: 'apple-alt'
    },
    {
      id: '3',
      title: 'Sleep Tracker',
      description: 'Monitor and improve your sleep quality',
      icon: 'bed'
    },
    {
      id: '4',
      title: 'Recovery Tips',
      description: 'Rest and recovery best practices',
      icon: 'heart'
    }
  ]

  return (
    <CategoryPage
      categoryId="physical"
      title="Physical"
      icon="running"
      color="#FF6B6B"
      description="Build strength, endurance, and overall well-being through exercise, nutrition, and healthy habits."
      categoryData={categoryData}
      resources={resources}
    />
  )
}

const styles = StyleSheet.create({
  ...categoryPageStyles,
  contentWrapper: {
    flex: 1,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
  },
  listContent: {
    width: '100%',
  },
  resourcesButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    position: 'absolute',
    right: 16,
    top: 8,
  },
  resourcesIcon: {
    marginRight: 8,
  },
  resourcesText: {
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    ...categoryPageStyles.header,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative',
  },
})
