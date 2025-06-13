import { JournalEntry, JournalType } from "@/backend/types/JournalEntry";
import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { format } from "date-fns";

interface JournalEntryCardProps {
  entry: JournalEntry;
}

function getDateFromTimestamp(ts: any): Date {
  if (!ts) return new Date();
  if (typeof ts === "string" || typeof ts === "number") return new Date(ts);
  if (typeof ts === "object" && typeof ts.seconds === "number") {
    return new Date(ts.seconds * 1000);
  }
  return new Date();
}

const getEmoji = (entry: JournalEntry) => {
  if (
    entry.type === "reflection" &&
    typeof entry.content === "object" &&
    "mood" in entry.content
  ) {
    const mood = entry.content.mood;
    switch (mood) {
      case 1:
        return "😢";
      case 2:
        return "😕";
      case 3:
        return "😐";
      case 4:
        return "🙂";
      case 5:
        return "😊";
      default:
        return "✨";
    }
  }

  // Default emojis for other types
  switch (entry.type) {
    case "gratitude":
      return "🙏";
    case "goals":
      return "🎯";
    default:
      return "📝";
  }
};

const getTitle = (entry: JournalEntry) => {
  switch (entry.type) {
    case "reflection":
      return "Daily Reflection";
    case "gratitude":
      return "Gratitude Entry";
    case "goals":
      return "Goals & Progress";
    default:
      return "Journal Entry";
  }
};

const getContent = (entry: JournalEntry): string => {
  const content = entry.content;

  if (typeof content === "string") {
    return content;
  }

  if (entry.type === "reflection" && "content" in content) {
    return content.content;
  }

  if (entry.type === "gratitude" && "items" in content) {
    return content.items.join("\n• ");
  }

  if (entry.type === "goals" && "goals" in content) {
    return (content as { goals: string[] }).goals.join("\n• ");
  }

  return "";
};

export function JournalEntryCard({ entry }: JournalEntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useTheme();

  return (
    <Pressable
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={() => setIsExpanded(!isExpanded)}
    >
      <View style={styles.header}>
        <Text style={[styles.emoji, { color: colors.textPrimary }]}>
          {getEmoji(entry)}
        </Text>
        <View style={styles.headerContent}>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {format(getDateFromTimestamp(entry.timestamp), "MMM d, yyyy")}
          </Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {getTitle(entry)}
          </Text>
        </View>
      </View>
      {isExpanded && (
        <View style={styles.content}>
          <Text style={[styles.entryText, { color: colors.textPrimary }]}>
            {getContent(entry)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  entryText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
