import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/context/ThemeContext'
import ProgressBar from '@/components/ProgressBar'

export default function TodaysProgress() {
  const { colors } = useTheme()

  return (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Today's Progress</Text>
      <View style={styles.progressItem}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textPrimary }]}>Daily Tasks</Text>
          <Text style={[styles.progressValue, { color: colors.textSecondary }]}>5/8</Text>
        </View>
        <ProgressBar progress={0.625} color={colors.secondary} />
      </View>
      <View style={styles.progressItem}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textPrimary }]}>Habits</Text>
          <Text style={[styles.progressValue, { color: colors.textSecondary }]}>3/5</Text>
        </View>
        <ProgressBar progress={0.6} color={colors.secondary} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  progressItem: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 14,
  },
})
