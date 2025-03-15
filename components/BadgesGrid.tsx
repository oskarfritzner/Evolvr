import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { Badge, BadgeProgress } from "@/backend/types/Badge";
import { badgeService } from "@/backend/services/badgeService";
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface BadgesGridProps {
  userId: string;
}

// Add this constant at the top of the file
const GOLD_COLOR = '#FFD700';

// Updated BadgesGrid
export default function BadgesGrid({ userId }: BadgesGridProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBadges = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Load data in parallel
        const [allBadges, userBadges, userData] = await Promise.all([
          badgeService.getAllBadges(),
          badgeService.getUserBadges(userId),
          badgeService.getUserData(userId)
        ]);

        if (!userData) {
          setError('User data not found');
          return;
        }

        if (!allBadges.length) {
          console.log('No badges available');
          setBadges([]);
          return;
        }

        const badgesWithProgress = allBadges
          .filter(badge => badge && badge.requirement && badge.requirement.type)
          .map(badge => ({
            badge,
            progress: badgeService.calculateBadgeProgress(badge, userData),
            isEarned: userBadges.some(ub => ub.badgeId === badge.id)
          }))
          .sort((a, b) => {
            if (a.isEarned && !b.isEarned) return -1;
            if (!a.isEarned && b.isEarned) return 1;
            return b.progress - a.progress;
          });

        setBadges(badgesWithProgress);
      } catch (error) {
        console.error("Error loading badges:", error);
        setError('Failed to load badges. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadBadges();
  }, [userId]);

  useEffect(() => {
    const debugBadges = async () => {
      if (!userId) return;
      await badgeService.checkBadgeEligibility(userId);
    };
    debugBadges();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.badgesGrid}>
        {badges.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="medal-outline" 
              size={50} 
              color={colors.textSecondary} 
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No badges available yet
            </Text>
          </View>
        ) : (
          badges.map((badgeProgress) => (
            <View 
              key={badgeProgress.badge.id} 
              style={[
                styles.badgeContainer,
                { backgroundColor: colors.surface },
                badgeProgress.isEarned && styles.earnedBadgeContainer
              ]}
            >
              <MaterialCommunityIcons
                name={badgeProgress.badge.icon}
                size={40}
                color={badgeProgress.isEarned ? GOLD_COLOR : colors.textSecondary}
                style={[
                  styles.badgeIcon,
                  { opacity: badgeProgress.isEarned ? 1 : 0.5 }
                ]}
              />
              <Text 
                style={[
                  styles.badgeName, 
                  { color: badgeProgress.isEarned ? GOLD_COLOR : colors.textPrimary }
                ]}
              >
                {badgeProgress.badge.name}
              </Text>
              <Text 
                style={[styles.badgeDescription, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {badgeProgress.badge.description}
              </Text>
              <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      backgroundColor: badgeProgress.isEarned ? GOLD_COLOR : colors.primary,
                      width: `${Math.max(badgeProgress.progress * 100, 5)}%`,
                    }
                  ]} 
                />
                <Text style={[styles.progressText, { color: colors.textPrimary }]}>
                  {badgeProgress.isEarned ? 'Completed!' : `${Math.round(badgeProgress.progress * 100)}%`}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  badgesGrid: {
    padding: 16,
    gap: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  badgeContainer: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  earnedBadgeContainer: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  badgeIcon: {
    marginBottom: 12,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  progressContainer: {
    width: '100%',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 12,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '600',
  },
});