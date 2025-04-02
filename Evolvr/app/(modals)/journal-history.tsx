import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { journalService } from '@/backend/services/journalService';
import { DailyJournal, JournalType } from '@/backend/types/JournalEntry';
import { FontAwesome5 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, isAfter, isBefore, parseISO } from 'date-fns';
import { Stack, router } from 'expo-router';
import { Button, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// Mood emoji mapping
const MOOD_EMOJIS = ['😢', '😕', '😐', '🙂', '😊'];

type JournalTypeInfo = {
  label: string;
  icon: string;
};

const JOURNAL_TYPE_LABELS: Record<JournalType.GRATITUDE | JournalType.REFLECTION, JournalTypeInfo> = {
  [JournalType.GRATITUDE]: { label: 'Gratitude', icon: 'heart' },
  [JournalType.REFLECTION]: { label: 'Reflection', icon: 'book' },
} as const;

export default function JournalHistory() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [selectedTypes, setSelectedTypes] = useState<JournalType[]>([]);
  const [startDate, setStartDate] = useState(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Calculate date range based on selected dates
  const getDateRange = useCallback(() => {
    // Format dates to YYYY-MM-DD format for consistent comparison
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    };
  }, [startDate, endDate]);

  // Fetch journal entries
  const { data: journalEntries, isLoading } = useQuery({
    queryKey: ['journalHistory', user?.uid, getDateRange().startDate, getDateRange().endDate],
    queryFn: async () => {
      if (!user?.uid) return [];
      const { startDate: start, endDate: end } = getDateRange();
      return journalService.getJournalHistory(user.uid, start, end, 50);
    },
    enabled: !!user?.uid,
    refetchInterval: false, // Don't auto-refresh
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const filteredEntries = journalEntries?.filter(daily => {
    const dailyDate = daily.date;
    const { startDate: start, endDate: end } = getDateRange();
    
    // Check if the entry date is within the selected range
    return dailyDate >= start && dailyDate <= end;
  });

  const renderJournalEntry = ({ item: daily }: { item: DailyJournal }) => (
    <Surface style={[styles.entryCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.dateHeader, { color: colors.textPrimary }]}>
        {format(new Date(daily.date), 'MMMM d, yyyy')}
      </Text>
      
      {daily.entries
        .filter(entry => entry.type === JournalType.REFLECTION || entry.type === JournalType.GRATITUDE)
        .map((entry, index) => {
          const typeInfo = JOURNAL_TYPE_LABELS[entry.type as JournalType.REFLECTION | JournalType.GRATITUDE];
          
          if (entry.type === JournalType.GRATITUDE) {
            const gratitudeItems = (entry.content as { items: string[] }).items;
            return (
              <View key={entry.id} style={styles.entryItem}>
                <View style={styles.entryHeader}>
                  <FontAwesome5 
                    name={typeInfo.icon} 
                    size={16} 
                    color={colors.primary} 
                  />
                  <Text style={[styles.entryType, { color: colors.textPrimary }]}>
                    {typeInfo.label}
                  </Text>
                  <Text style={[styles.entryTime, { color: colors.textSecondary }]}>
                    {format(entry.timestamp.toDate(), 'h:mm a')}
                  </Text>
                </View>
                <View style={styles.gratitudeList}>
                  {gratitudeItems.map((item, idx) => (
                    <Text 
                      key={idx}
                      style={[styles.gratitudeItem, { color: colors.textSecondary }]}
                    >
                      {idx + 1}. {item}
                    </Text>
                  ))}
                </View>
              </View>
            );
          }

          // For reflection entries
          const content = typeof entry.content === 'string' 
            ? entry.content 
            : 'content' in entry.content 
              ? entry.content.content
              : JSON.stringify(entry.content);

          // Get mood from reflection entry
          const mood = typeof entry.content === 'object' && 'mood' in entry.content 
            ? entry.content.mood as number
            : null;

          return (
            <View key={entry.id} style={styles.entryItem}>
              <View style={styles.entryHeader}>
                <View style={styles.headerLeft}>
                  <FontAwesome5 
                    name={typeInfo.icon} 
                    size={16} 
                    color={colors.primary} 
                  />
                  <Text style={[styles.entryType, { color: colors.textPrimary }]}>
                    {typeInfo.label}
                  </Text>
                  {mood !== null && (
                    <Text style={styles.moodEmoji}>
                      {MOOD_EMOJIS[mood - 1]}
                    </Text>
                  )}
                </View>
                <Text style={[styles.entryTime, { color: colors.textSecondary }]}>
                  {format(entry.timestamp.toDate(), 'h:mm a')}
                </Text>
              </View>
              <Text 
                style={[styles.entryContent, { color: colors.textSecondary }]}
                numberOfLines={3}
              >
                {content}
              </Text>
            </View>
          );
        })}
    </Surface>
  );

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date, isStart = true) => {
    if (event.type === 'set' && selectedDate) {
      if (isStart) {
        setStartDate(selectedDate);
        if (Platform.OS === 'android') {
          setShowStartPicker(false);
        }
      } else {
        setEndDate(selectedDate);
        if (Platform.OS === 'android') {
          setShowEndPicker(false);
        }
      }
    } else if (event.type === 'dismissed') {
      if (isStart) {
        setShowStartPicker(false);
      } else {
        setShowEndPicker(false);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerTitle: "Journal History",
          headerTitleStyle: {
            color: colors.textPrimary,
            fontSize: 20,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
            >
              <FontAwesome5 name="arrow-left" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={[styles.datePickerContainer, { backgroundColor: colors.background }]}>
        <View style={styles.dateInputContainer}>
          <Button
            mode="outlined"
            onPress={() => setShowStartPicker(true)}
            style={[
              styles.dateButton,
              { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }
            ]}
            labelStyle={[
              styles.dateButtonLabel,
              { color: colors.textPrimary }
            ]}
            contentStyle={styles.dateButtonContent}
          >
            {format(startDate, 'MMM dd, yyyy')}
          </Button>
          <Text style={[styles.dateSeperator, { color: colors.textSecondary }]}>to</Text>
          <Button
            mode="outlined"
            onPress={() => setShowEndPicker(true)}
            style={[
              styles.dateButton,
              { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
              }
            ]}
            labelStyle={[
              styles.dateButtonLabel,
              { color: colors.textPrimary }
            ]}
            contentStyle={styles.dateButtonContent}
          >
            {format(endDate, 'MMM dd, yyyy')}
          </Button>
        </View>

        {Platform.OS === 'ios' ? (
          (showStartPicker || showEndPicker) && (
            <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
              <DateTimePicker
                testID="dateTimePicker"
                value={showStartPicker ? startDate : endDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => handleDateChange(event, date, showStartPicker)}
                maximumDate={new Date()}
                minimumDate={showStartPicker ? subDays(new Date(), 365) : startDate}
                textColor={colors.textPrimary}
              />
              <Button
                mode="text"
                onPress={() => {
                  setShowStartPicker(false);
                  setShowEndPicker(false);
                }}
                style={styles.doneButton}
                labelStyle={{ color: colors.primary }}
              >
                Done
              </Button>
            </View>
          )
        ) : (
          (showStartPicker || showEndPicker) && (
            <DateTimePicker
              testID="dateTimePicker"
              value={showStartPicker ? startDate : endDate}
              mode="date"
              display="default"
              onChange={(event, date) => handleDateChange(event, date, showStartPicker)}
              maximumDate={new Date()}
              minimumDate={showStartPicker ? subDays(new Date(), 365) : startDate}
            />
          )
        )}
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filteredEntries}
          renderItem={renderJournalEntry}
          keyExtractor={item => item.date}
          contentContainerStyle={styles.list}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No journal entries found for the selected date range.
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 12,
    borderRadius: 24,
    marginLeft: 16,
  },
  datePickerContainer: {
    padding: 16,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dateButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 45,
  },
  dateButtonContent: {
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButtonLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  dateSeperator: {
    fontSize: 16,
    paddingHorizontal: 8,
    fontWeight: '500',
  },
  pickerContainer: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  doneButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  list: {
    padding: 16,
  },
  entryCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  entryItem: {
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryType: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  entryTime: {
    fontSize: 14,
  },
  moodEmoji: {
    fontSize: 16,
    marginLeft: 8,
  },
  entryContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  gratitudeList: {
    paddingLeft: 8,
  },
  gratitudeItem: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 