import React from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, Text } from 'react-native';
import { TaskFiltersProps } from './types';
import { createStyles } from './styles';

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategorySelect,
  colors
}) => {
  const styles = createStyles(colors, false);

  const categories = [
    'All',
    'Health',
    'Productivity',
    'Learning',
    'Fitness',
    'Mindfulness',
    'Social',
    'Finance',
    'Creativity',
    'Lifestyle'
  ];

  return (
    <View>
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.surface,
              color: colors.textPrimary,
              borderColor: colors.border,
            }
          ]}
          placeholder="Search tasks..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              {
                backgroundColor: selectedCategory === category
                  ? colors.secondary
                  : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }
            ]}
            onPress={() => onCategorySelect(category === 'All' ? null : category)}
          >
            <Text
              style={[
                styles.chipLabel,
                {
                  color: selectedCategory === category
                    ? colors.primary
                    : colors.textSecondary,
                }
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}; 