import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'expo-router'
import CategoryCard from '@/components/category/CategoryCard'
import { levelService } from '@/backend/services/levelService'
import { CategoryLevel } from '@/backend/types/Level'
import { Button } from 'react-native-paper'

interface CategoryGridProps {
  categories: Record<string, CategoryLevel>
  style?: object
  compact?: boolean
}

const CategoryGrid: React.FC<CategoryGridProps> = ({ categories, style, compact = false }) => {
  const { colors } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  const userCategories = user?.userData?.categories || levelService.getInitialLevels().categories
  const categoryEntries = Object.entries(categories)
  const visibleCategories = expanded ? categoryEntries : categoryEntries.slice(0, 4)

  console.log('User categories:', user?.userData?.categories) // Debug log
  console.log('Visible categories:', visibleCategories) // Debug log

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, style]}>
      <Text style={[styles.title, { color: colors.surface }]}>
        Life Categories
      </Text>

      <View style={styles.grid}>
        {visibleCategories.map(([id, category]) => (
          <CategoryCard
            key={id}
            id={id}
            name={getCategoryName(id)}
            icon={getCategoryIcon(id)}
            level={category.level}
            currentXP={category.xp}
            onPress={() => router.push({
              pathname: `/(categoryPages)/${id}`,
              params: { presentation: 'modal', animation: 'slide_from_bottom' }
            } as any)}
            compact={compact}
          />
        ))}
      </View>

      {categoryEntries.length > 4 && (
        <Button
          mode="text"
          onPress={() => setExpanded(!expanded)}
          style={styles.expandButton}
          labelStyle={{ color: colors.secondary, fontSize: 12 }}
        >
          {expanded ? 'Show Less' : 'Show More'}
        </Button>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  grid: Platform.select({
    web: {
      display: 'flex',
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
  expandButton: {
    marginTop: 8,
  },
})

// Helper functions for category data
const getCategoryName = (id: string): string => {
  const names: Record<string, string> = {
    physical: 'Physical',
    mental: 'Mental',
    financial: 'Financial',
    career: 'Career',
    relationships: 'Relationships',
    intellectual: 'Intellectual',
    spiritual: 'Spiritual'
  }
  return names[id] || id
}

const getCategoryIcon = (id: string): string => {
  const icons: Record<string, string> = {
    physical: 'running',
    mental: 'brain',
    financial: 'coins',
    career: 'briefcase',
    relationships: 'users',
    intellectual: 'book',
    spiritual: 'pray'
  }
  return icons[id] || 'circle'
}

export default CategoryGrid
