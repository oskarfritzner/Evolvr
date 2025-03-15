import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { CategoryLevel } from '@/backend/types/Level';
import CategoryProgressCard from './CategoryProgressCard';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/backend/services/userService';
import { LoadingSpinner } from '../LoadingSpinner';
import { levelService } from '@/backend/services/levelService';

interface CategoryCardSliderProps {
  onCategoryPress: (category: string) => void;
}

export default function CategoryCardSlider({ onCategoryPress }: CategoryCardSliderProps) {
  const router = useRouter();
  const { user } = useAuth();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return {};
      const userData = await userService.getUserData(user.uid);
      return userData?.categories || {};
    },
    enabled: !!user?.uid,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Sort categories by progress percentage
  const sortedCategories = Object.entries(categories || {})
    .filter(([key]) => key !== "tasks")
    .map(([category, data]) => ({
      category,
      data: {
        level: data.level || 1,
        xp: data.xp || 0
      }
    }))
    .sort((a, b) => {
      const progressA = levelService.getCategoryLevelProgress(a.data.xp, a.data.level);
      const progressB = levelService.getCategoryLevelProgress(b.data.xp, b.data.level);
      return progressB - progressA;
    });

  const handleCategoryPress = (categoryId: string) => {
    router.push(`/(categoryPages)/${categoryId}` as any);
  };

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      {sortedCategories.map(({ category, data }) => (
        <CategoryProgressCard
          key={category}
          category={category}
          data={data}
          onPress={() => handleCategoryPress(category)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
});
