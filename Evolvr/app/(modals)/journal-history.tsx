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
import { Button, Surface, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import DateTimePicker from '@react-native-community/datetimepicker';

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
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [startDate, endDate]);

  // Fetch journal entries
  const { data: journalEntries, isLoading } = useQuery({
    queryKey: ['journalHistory', user?.uid, startDate, endDate],
    queryFn: async () => {
      if (!user?.uid) return [];
      const { startDate: start, endDate: end } = getDateRange();
      return journalService.getJournalHistory(user.uid, start, end, 50);
    },
    enabled: !!user?.uid,
    refetchInterval: 1000 * 60, // Refresh every minute
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 30, // Data becomes stale after 30 seconds
  });

  const filteredEntries = journalEntries?.filter(daily => 
    daily.entries.some(entry => 
      selectedTypes.length === 0 || selectedTypes.includes(entry.type)
    )
  );

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

  const handleDateChange = (event: any, selectedDate: Date | undefined, isStart: boolean) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
      setShowEndPicker(false);
    }

    if (selectedDate) {
      if (isStart) {
        if (selectedDate > endDate) {
          setEndDate(selectedDate);
        }
        setStartDate(selectedDate);
      } else {
        if (selectedDate < startDate) {
          setStartDate(selectedDate);
        }
        setEndDate(selectedDate);
      }
    }
  };

  const closePickers = () => {
    setShowStartPicker(false);
    setShowEndPicker(false);
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

      <View style={styles.datePickerContainer}>
        <View style={styles.dateInputContainer}>
          <TouchableOpacity 
            onPress={() => {
              setShowEndPicker(false);
              setShowStartPicker(true);
            }}
            style={[styles.dateInput, { backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.textPrimary }}>
              {format(startDate, 'MMM dd, yyyy')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.dateSeperator, { color: colors.textSecondary }]}>to</Text>
          <TouchableOpacity 
            onPress={() => {
              setShowStartPicker(false);
              setShowEndPicker(true);
            }}
            style={[styles.dateInput, { backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.textPrimary }}>
              {format(endDate, 'MMM dd, yyyy')}
            </Text>
          </TouchableOpacity>
        </View>

        {Platform.OS === 'ios' && (showStartPicker || showEndPicker) && (
          <Modal
            transparent={true}
            animationType="fade"
            visible={showStartPicker || showEndPicker}
            onRequestClose={closePickers}
          >
            <TouchableWithoutFeedback onPress={closePickers}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={[styles.pickerContainer, { backgroundColor: colors.surface }]}>
                    <View style={styles.modalHeader}>
                      <View style={[styles.dragHandle, { backgroundColor: colors.textSecondary }]} />
                      <TouchableOpacity 
                        onPress={closePickers}
                        style={styles.doneButton}
                      >
                        <Text style={[styles.doneButtonText, { color: colors.secondary }]}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={showStartPicker ? startDate : endDate}
                      mode="date"
                      display="spinner"
                      onChange={(event, date) => handleDateChange(event, date, showStartPicker)}
                      maximumDate={new Date()}
                      minimumDate={showStartPicker ? subDays(new Date(), 365) : startDate}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        {Platform.OS === 'android' && (
          <>
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(event, date) => handleDateChange(event, date, true)}
                maximumDate={new Date()}
                minimumDate={subDays(new Date(), 365)}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={(event, date) => handleDateChange(event, date, false)}
                maximumDate={new Date()}
                minimumDate={startDate}
              />
            )}
          </>
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
  },
  dateInput: {
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  dateSeperator: {
    fontSize: 16,
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
    marginBottom: 8,
  },
  entryType: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  entryTime: {
    fontSize: 14,
    marginLeft: 'auto',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    padding: 16,
    paddingTop: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  doneButton: {
    position: 'absolute',
    right: 0,
    padding: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 