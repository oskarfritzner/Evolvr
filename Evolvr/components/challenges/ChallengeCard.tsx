import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Challenge } from '@/backend/types/Challenge';
import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { UserChallenge } from '@/backend/types/Challenge';

interface Props {
  challenge: UserChallenge;
  onLeave?: () => void;
}

export default function ChallengeCard({ challenge, onLeave }: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => router.push({
        pathname: "/(modals)/challenge",
        params: { id: challenge.id }
      })}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {challenge.title}
        </Text>
        {onLeave && (
          <TouchableOpacity
            onPress={onLeave}
            style={styles.deleteButton}
          >
            <FontAwesome5 name="sign-out-alt" size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
        {challenge.description}
      </Text>

      <View style={styles.metadata}>
        <View style={styles.metaItem}>
          <FontAwesome5 
            name="calendar-day" 
            size={14} 
            color={colors.labelSecondary}
            style={styles.metaIcon}
          />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {challenge.duration} days
          </Text>
        </View>

        <View style={styles.metaItem}>
          <FontAwesome5 
            name="signal" 
            size={14} 
            color={colors.labelSecondary}
            style={styles.metaIcon}
          />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {challenge.difficulty}
          </Text>
        </View>
      </View>

      {challenge.category && challenge.category.length > 0 && (
        <View style={styles.categories}>
          {challenge.category.map(cat => (
            <View 
              key={cat} 
              style={[styles.categoryChip, { backgroundColor: colors.secondary + '20' }]}
            >
              <Text style={[styles.categoryText, { color: colors.secondary }]}>
                {cat}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: Platform.select({
    web: {
      flex: 1,
      minWidth: 300,
      maxWidth: '100%',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    default: {
      width: '100%',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
  }),
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
  },
  metadata: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 14,
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
  deleteButton: {
    padding: 8,
  },
});