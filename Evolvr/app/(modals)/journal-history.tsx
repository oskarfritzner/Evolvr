import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { journalService } from "@/backend/services/journalService";
import {
  DailyJournal,
  JournalType,
  JournalEntry,
} from "@/backend/types/JournalEntry";
import { FontAwesome5 } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, isAfter, isBefore, parseISO } from "date-fns";
import { Stack, router } from "expo-router";
import { Button, Surface, Portal, Dialog } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import DateTimePicker from "@react-native-community/datetimepicker";
import { JournalEntryCard } from "@/components/journal/JournalEntryCard";

// Mood emoji mapping
const MOOD_EMOJIS = ["😢", "😕", "😐", "🙂", "😊"];

type JournalTypeInfo = {
  label: string;
  icon: string;
};

const JOURNAL_TYPE_LABELS: Record<
  JournalType.GRATITUDE | JournalType.REFLECTION,
  JournalTypeInfo
> = {
  [JournalType.GRATITUDE]: { label: "Gratitude", icon: "heart" },
  [JournalType.REFLECTION]: { label: "Reflection", icon: "book" },
} as const;

export default function JournalHistory() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const [selectedTypes, setSelectedTypes] = useState<JournalType[]>([]);
  const [startDate, setStartDate] = useState(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  // Calculate date range based on selected dates
  const getDateRange = useCallback(() => {
    // Format dates to YYYY-MM-DD format for consistent comparison
    const formatDate = (date: Date) => {
      return date.toISOString().split("T")[0];
    };

    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };
  }, [startDate, endDate]);

  // Fetch journal entries
  const { data: journals, isLoading } = useQuery({
    queryKey: [
      "journals",
      user?.uid,
      getDateRange().startDate,
      getDateRange().endDate,
    ],
    queryFn: () =>
      journalService.getJournalHistory(
        user!.uid,
        getDateRange().startDate,
        getDateRange().endDate
      ),
    enabled: !!user?.uid,
  });

  const filteredEntries = journals?.filter((daily) => {
    const dailyDate = daily.date;
    const { startDate: start, endDate: end } = getDateRange();

    // Check if the entry date is within the selected range
    return dailyDate >= start && dailyDate <= end;
  });

  const renderJournalEntry = ({ item: daily }: { item: DailyJournal }) => (
    <Surface style={[styles.entryCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.dateHeader, { color: colors.textPrimary }]}>
        {format(new Date(daily.date), "MMMM d, yyyy")}
      </Text>

      {daily.entries
        .filter(
          (entry) =>
            entry.type === JournalType.REFLECTION ||
            entry.type === JournalType.GRATITUDE
        )
        .map((entry, index) => {
          const typeInfo =
            JOURNAL_TYPE_LABELS[
              entry.type as JournalType.REFLECTION | JournalType.GRATITUDE
            ];

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
                  <Text
                    style={[styles.entryType, { color: colors.textPrimary }]}
                  >
                    {typeInfo.label}
                  </Text>
                  <Text
                    style={[styles.entryTime, { color: colors.textSecondary }]}
                  >
                    {format(entry.timestamp.toDate(), "h:mm a")}
                  </Text>
                </View>
                <View style={styles.gratitudeList}>
                  {gratitudeItems.map((item, idx) => (
                    <Text
                      key={idx}
                      style={[
                        styles.gratitudeItem,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {idx + 1}. {item}
                    </Text>
                  ))}
                </View>
              </View>
            );
          }

          // For reflection entries
          const content =
            typeof entry.content === "string"
              ? entry.content
              : "content" in entry.content
              ? entry.content.content
              : JSON.stringify(entry.content);

          // Get mood from reflection entry
          const mood =
            typeof entry.content === "object" && "mood" in entry.content
              ? (entry.content.mood as number)
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
                  <Text
                    style={[styles.entryType, { color: colors.textPrimary }]}
                  >
                    {typeInfo.label}
                  </Text>
                  {mood !== null && (
                    <Text style={styles.moodEmoji}>
                      {MOOD_EMOJIS[mood - 1]}
                    </Text>
                  )}
                </View>
                <Text
                  style={[styles.entryTime, { color: colors.textSecondary }]}
                >
                  {format(entry.timestamp.toDate(), "h:mm a")}
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

  const handleDateChange = (
    event: any,
    selectedDate: Date | undefined,
    isStart = true
  ) => {
    if (Platform.OS === "android") {
      setShowStartPicker(false);
      setShowEndPicker(false);
    }

    if (selectedDate) {
      if (isStart) {
        setTempStartDate(selectedDate);
        if (Platform.OS === "ios") {
          setStartDate(selectedDate);
        }
      } else {
        setTempEndDate(selectedDate);
        if (Platform.OS === "ios") {
          setEndDate(selectedDate);
        }
      }
    }
  };

  const handleWebDateChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    isStart = true
  ) => {
    const date = new Date(event.target.value);
    if (isStart) {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  };

  const handleConfirmDate = (isStart = true) => {
    if (isStart) {
      setStartDate(tempStartDate);
    } else {
      setEndDate(tempEndDate);
    }
    setShowStartPicker(false);
    setShowEndPicker(false);
  };

  const renderDatePicker = (isStart = true) => {
    if (Platform.OS === "web") {
      return (
        <View style={styles.webDateInputContainer}>
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
            {isStart ? "From" : "To"}
          </Text>
          <input
            type="date"
            value={format(isStart ? startDate : endDate, "yyyy-MM-dd")}
            onChange={(e) => handleWebDateChange(e, isStart)}
            max={format(isStart ? endDate : new Date(), "yyyy-MM-dd")}
            min={format(
              isStart ? subDays(new Date(), 365) : startDate,
              "yyyy-MM-dd"
            )}
            style={{
              padding: "8px",
              borderRadius: "8px",
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              color: colors.textPrimary,
              fontSize: "14px",
              width: "100%",
            }}
          />
        </View>
      );
    }

    if (Platform.OS === "ios") {
      return (
        <Portal>
          <Dialog
            visible={isStart ? showStartPicker : showEndPicker}
            onDismiss={() => {
              setShowStartPicker(false);
              setShowEndPicker(false);
            }}
            style={[styles.dialog, { backgroundColor: colors.surface }]}
          >
            <Dialog.Title style={{ color: colors.textPrimary }}>
              Select {isStart ? "Start" : "End"} Date
            </Dialog.Title>
            <Dialog.Content>
              <DateTimePicker
                testID="dateTimePicker"
                value={isStart ? tempStartDate : tempEndDate}
                mode="date"
                display="spinner"
                onChange={(event, date) =>
                  handleDateChange(event, date, isStart)
                }
                maximumDate={isStart ? endDate : new Date()}
                minimumDate={isStart ? subDays(new Date(), 365) : startDate}
                textColor={colors.textPrimary}
                style={styles.datePicker}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={() => {
                  setShowStartPicker(false);
                  setShowEndPicker(false);
                }}
              >
                Cancel
              </Button>
              <Button onPress={() => handleConfirmDate(isStart)}>
                Confirm
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      );
    }

    return (
      (isStart ? showStartPicker : showEndPicker) && (
        <DateTimePicker
          testID="dateTimePicker"
          value={isStart ? tempStartDate : tempEndDate}
          mode="date"
          display="default"
          onChange={(event, date) => handleDateChange(event, date, isStart)}
          maximumDate={isStart ? endDate : new Date()}
          minimumDate={isStart ? subDays(new Date(), 365) : startDate}
        />
      )
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!journals?.length) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text>No journal entries found for this period.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <Stack.Screen
        options={{
          headerTitle: "Journal History",
          headerTitleStyle: {
            color: colors.textPrimary,
            fontSize: 20,
            fontWeight: "600",
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
              <FontAwesome5
                name="arrow-left"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={[styles.content, isLargeScreen && styles.contentLarge]}>
        <View
          style={[
            styles.datePickerContainer,
            { backgroundColor: colors.background },
          ]}
        >
          {Platform.OS === "web" ? (
            <View style={styles.webDateContainer}>
              <View style={styles.webDatePickerRow}>
                {renderDatePicker(true)}
                <View style={styles.webDateArrowContainer}>
                  <FontAwesome5
                    name="arrow-right"
                    size={16}
                    color={colors.textSecondary}
                    style={styles.webDateArrow}
                  />
                </View>
                {renderDatePicker(false)}
              </View>
            </View>
          ) : (
            <View style={styles.dateInputContainer}>
              <View style={styles.dateInputWrapper}>
                <Text
                  style={[styles.dateLabel, { color: colors.textSecondary }]}
                >
                  From
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => setShowStartPicker(true)}
                  style={[
                    styles.dateButton,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  labelStyle={[
                    styles.dateButtonLabel,
                    { color: colors.textPrimary },
                  ]}
                  contentStyle={styles.dateButtonContent}
                >
                  {format(startDate, "MMM dd, yyyy")}
                </Button>
              </View>
              <View style={styles.dateArrowContainer}>
                <FontAwesome5
                  name="arrow-right"
                  size={16}
                  color={colors.textSecondary}
                  style={styles.dateArrow}
                />
              </View>
              <View style={styles.dateInputWrapper}>
                <Text
                  style={[styles.dateLabel, { color: colors.textSecondary }]}
                >
                  To
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => setShowEndPicker(true)}
                  style={[
                    styles.dateButton,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  labelStyle={[
                    styles.dateButtonLabel,
                    { color: colors.textPrimary },
                  ]}
                  contentStyle={styles.dateButtonContent}
                >
                  {format(endDate, "MMM dd, yyyy")}
                </Button>
              </View>
            </View>
          )}
        </View>

        {Platform.OS !== "web" && (
          <>
            {renderDatePicker(true)}
            {renderDatePicker(false)}
          </>
        )}

        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <View>
              {item.entries
                .sort((a, b) => {
                  const timestampA =
                    typeof a.timestamp === "string"
                      ? new Date(a.timestamp).getTime()
                      : a.timestamp.seconds * 1000;
                  const timestampB =
                    typeof b.timestamp === "string"
                      ? new Date(b.timestamp).getTime()
                      : b.timestamp.seconds * 1000;
                  return timestampB - timestampA; // Descending order (newest first)
                })
                .map((entry) => (
                  <JournalEntryCard key={entry.id} entry={entry} />
                ))}
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentLarge: {
    maxWidth: 1024,
    alignSelf: "center",
    width: "100%",
    padding: 24,
  },
  headerButton: {
    padding: 12,
    borderRadius: 24,
    marginLeft: 16,
  },
  datePickerContainer: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  dateInputWrapper: {
    flex: 1,
    minWidth: 140, // Ensure minimum width for buttons
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  dateArrowContainer: {
    justifyContent: "center",
    paddingTop: 24,
    width: 24, // Fixed width for arrow container
  },
  dateArrow: {
    marginHorizontal: 4,
  },
  dateButton: {
    flex: 1,
    borderRadius: 8,
    height: 44,
  },
  dateButtonContent: {
    height: 44,
  },
  dateButtonLabel: {
    fontSize: 14,
    fontWeight: "500",
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
    alignSelf: "flex-end",
    marginTop: 8,
  },
  list: {
    padding: 16,
  },
  listLarge: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  entryItem: {
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  entryType: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  entryTime: {
    fontSize: 12,
  },
  moodEmoji: {
    fontSize: 14,
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
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: "center",
  },
  dialog: {
    borderRadius: 12,
  },
  datePicker: {
    height: 200,
  },
  webDateContainer: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  webDatePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  webDateInputContainer: {
    flex: 1,
    minWidth: 140,
    maxWidth: 250,
  },
  webDateArrowContainer: {
    paddingTop: 24,
    width: 24,
  },
  webDateArrow: {
    marginHorizontal: 4,
  },
});
