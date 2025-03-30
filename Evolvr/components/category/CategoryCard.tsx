import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/context/ThemeContext'
import { FontAwesome5 } from '@expo/vector-icons'
import  ProgressBar  from '@/components/ProgressBar'
import { levelService } from '@/backend/services/levelService'

interface CategoryCardProps {
  id: string
  name: string
  icon: string
  level: number
  currentXP: number
  onPress: () => void
  compact?: boolean
}

export default function CategoryCard({
  id,
  name,
  icon,
  level,
  currentXP,
  onPress,
  compact = false
}: CategoryCardProps) {
  const { colors } = useTheme()

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { backgroundColor: colors.surface },
        compact && styles.compactCard
      ]}
      onPress={onPress}
    >
      <FontAwesome5 
        name={icon} 
        size={compact ? 16 : 24} 
        color={colors.secondary} 
      />
      <Text style={[
        styles.name, 
        { color: colors.textPrimary },
        compact && styles.compactText
      ]}>
        {name}
      </Text>
      <ProgressBar
        progress={levelService.getCategoryLevelProgress(currentXP, levelService.getXPNeededForNextLevel(level))}
        color={colors.secondary}
        style={styles.progress}
        isXPBar
        currentXP={currentXP}
        compact={compact}
      />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  compactCard: {
    width: '23%',
    padding: 8,
    borderRadius: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  compactText: {
    fontSize: 12,
    marginTop: 4,
  },
  progress: {
    width: '100%',
    marginTop: 8,
  },
}) 