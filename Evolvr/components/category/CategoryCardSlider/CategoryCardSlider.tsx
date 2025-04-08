import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { CategoryLevel } from '@/backend/types/Level';
import CategoryProgressCard from './CategoryProgressCard';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { levelService } from '@/backend/services/levelService';
import { useUserData } from '@/hooks/queries/useUserData';

interface CategoryCardSliderProps {
  onCategoryPress: (category: string) => void;
}

const DEFAULT_CATEGORY_DATA: CategoryLevel = {
  level: 1,
  xp: 0
};

export default function CategoryCardSlider({ onCategoryPress }: CategoryCardSliderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: userData, isLoading } = useUserData(user?.uid);

  // Get categories from userData
  const categories = userData?.categories;

  // Show loading spinner only if we don't have any data
  if (isLoading && !categories) {
    return <LoadingSpinner />;
  }

  // If no categories are available, don't render anything
  if (!categories) {
    return null;
  }

  // Sort categories by progress percentage
  const sortedCategories = Object.entries(categories)
    .filter(([key]) => key !== "tasks" && !!categories[key]) // Filter out null categories
    .map(([category, data]) => ({
      category,
      data: {
        level: data?.level || DEFAULT_CATEGORY_DATA.level,
        xp: data?.xp || DEFAULT_CATEGORY_DATA.xp
      }
    }))
    .sort((a, b) => {
      const progressA = levelService.getCategoryLevelProgress(a.data.xp, a.data.level);
      const progressB = levelService.getCategoryLevelProgress(b.data.xp, b.data.level);
      return progressB - progressA;
    });

  const handleCategoryPress = (categoryId: string) => {
    router.push({
      pathname: `/(categoryPages)/${categoryId}`,
      params: { presentation: 'modal', animation: 'slide_from_bottom' }
    } as any);
  };

  // If no sorted categories are available, don't render anything
  if (sortedCategories.length === 0) {
    return null;
  }

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
