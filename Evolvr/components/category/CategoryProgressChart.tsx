import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import { categoryPageStyles } from '@/styles/categoryPageStyles';
import { LineChart } from 'react-native-chart-kit';

interface CategoryProgressChartProps {
  categoryId: string;
  color: string;
}

export default function CategoryProgressChart({ categoryId, color }: CategoryProgressChartProps) {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get('window').width - (Platform.OS === 'web' ? 32 : 64);

  // Sample data
  const data = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [1, 3, 5, 8, 12, 15, 18],
        color: () => color,
        strokeWidth: 2
      }
    ]
  };

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    labelColor: () => colors.textSecondary,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: color
    },
    yAxisInterval: 10,
    segments: 10,
    min: 0,
    max: 100
  };

  return (
    <View style={categoryPageStyles.chartContainer}>
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Progress History</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Last 7 days</Text>
        
        <View style={styles.chartWrapper}>
          {/* Don't render chart on web due to compatibility issues */}
          {Platform.OS !== 'web' ? (
            <LineChart
              data={data}
              width={screenWidth}
              height={320}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={true}
              withDots={true}
              withShadow={false}
              withVerticalLines={false}
              withHorizontalLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              fromZero={true}
              yAxisSuffix=""
            />
          ) : (
            <View style={[styles.chart, { height: 320, backgroundColor: colors.surface }]}>
              {/* Web fallback */}
            </View>
          )}
          
          <BlurView intensity={95} style={styles.overlay}>
            <Text style={[styles.overlayText, { color: colors.textPrimary }]}>
              Progress Chart Coming Soon! 📊
            </Text>
            <Text style={[styles.overlaySubtext, { color: colors.textSecondary }]}>
              Track your level progression over time
            </Text>
          </BlurView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: Platform.OS === 'web' ? 16 : 8,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
    minHeight: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  chartWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  overlayText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  overlaySubtext: {
    fontSize: 14,
  }
}); 