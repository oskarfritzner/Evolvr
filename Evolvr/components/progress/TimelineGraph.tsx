import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ProgressSnapshot } from '@/backend/types/UserData';
import { categories } from '@/constants/categories';
import { Timestamp } from 'firebase/firestore';
import { LineChart } from 'react-native-chart-kit';

interface TimelineGraphProps {
  snapshots: ProgressSnapshot[];
  selectedCategories?: string[];
  timeRange?: '7d' | '30d' | '90d' | 'all';
}

export default function TimelineGraph({ 
  snapshots = [],
  selectedCategories = [], 
  timeRange = '7d' 
}: TimelineGraphProps) {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width;

  if (!snapshots || snapshots.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.noDataText, { color: colors.textPrimary }]}>
          No progress data available
        </Text>
      </View>
    );
  }

  const filteredSnapshots = useMemo(() => {
    const timeRangeInDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      'all': 365 // or any large number
    }[timeRange];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeRangeInDays);

    return snapshots
      .filter(snapshot => {
        const date = snapshot.timestamp instanceof Timestamp 
          ? snapshot.timestamp.toDate() 
          : new Date(snapshot.timestamp);
        return date > cutoffDate;
      })
      .sort((a, b) => {
        const dateA = a.timestamp instanceof Timestamp ? a.timestamp.toDate() : new Date(a.timestamp);
        const dateB = b.timestamp instanceof Timestamp ? b.timestamp.toDate() : new Date(b.timestamp);
        return dateA.getTime() - dateB.getTime();
      });
  }, [snapshots, timeRange]);

  if (!filteredSnapshots || filteredSnapshots.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.noDataText, { color: colors.textPrimary }]}>
          No data available for selected time range
        </Text>
      </View>
    );
  }

  const chartData = useMemo(() => {
    const labels = filteredSnapshots.map(snapshot => {
      const date = snapshot.timestamp instanceof Timestamp 
        ? snapshot.timestamp.toDate() 
        : new Date(snapshot.timestamp);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    // Create datasets for each selected category and overall
    const datasets = [];

    // Add overall level dataset
    datasets.push({
      data: filteredSnapshots.map(snapshot => snapshot.overall.level),
      color: () => colors.primary,
      strokeWidth: 2,
      legend: 'Overall'
    });

    // Add selected categories datasets
    const categoryColors = {
      physical: '#FF6B6B',
      mental: '#4ECDC4',
      intellectual: '#45B7D1',
      spiritual: '#96CEB4',
      financial: '#FFEEAD',
      career: '#D4A5A5',
      relationships: '#9B6B8D'
    };

    selectedCategories.forEach(categoryId => {
      datasets.push({
        data: filteredSnapshots.map(snapshot => snapshot.categories[categoryId].level),
        color: () => categoryColors[categoryId as keyof typeof categoryColors],
        strokeWidth: 2,
        legend: categories.find(c => c.id === categoryId)?.name || categoryId
      });
    });

    return {
      labels,
      datasets,
      legend: ['Overall', ...selectedCategories.map(id => 
        categories.find(c => c.id === id)?.name || id
      )]
    };
  }, [filteredSnapshots, selectedCategories, colors]);

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => colors.textPrimary,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Progress Timeline</Text>
      {Platform.OS !== 'web' ? (
        <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={false}
          withOuterLines={true}
          withDots={true}
          withShadow={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={true}
        />
      ) : (
        <View style={[styles.chart, { height: 220, backgroundColor: colors.surface }]}>
          <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
            Timeline chart not available on web
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    padding: 20,
  }
});
