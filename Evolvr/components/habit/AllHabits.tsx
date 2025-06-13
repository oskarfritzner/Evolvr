import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import HabitGrid from "./HabitGrid";
import { useAuth } from "@/context/AuthContext";
import { FontAwesome5 } from "@expo/vector-icons";
import SetHabit from "./SetHabit";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useHabits } from "@/hooks/queries/useHabits";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  compact?: boolean;
}

export default function AllHabits({ compact = false }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const queryClient = useQueryClient();

  const { habits, isLoading, createHabit, refetchHabits, userData } = useHabits(
    user?.uid
  );

  const handleHabitCreated = async (habitData: any) => {
    await createHabit(habitData);
    // Force refetch of active tasks
    queryClient.invalidateQueries({ queryKey: ["activeTasks", user?.uid] });
    setModalVisible(false);
  };

  useEffect(() => {
    // Refetch habits when component mounts
    refetchHabits();
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.secondary }]}>
            Habits
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={[styles.addButton, { backgroundColor: colors.secondary }]}
          >
            <FontAwesome5 name="plus" size={16} color={colors.surface} />
          </TouchableOpacity>
        </View>

        {!habits?.length ? (
          <TouchableOpacity
            style={[styles.emptyState, { borderColor: colors.textSecondary }]}
            onPress={() => setModalVisible(true)}
            accessibilityLabel="Create your first habit"
            accessibilityRole="button"
          >
            <Text
              style={[styles.emptyStateText, { color: colors.textSecondary }]}
            >
              No habits created yet. Tap to create one!
            </Text>
          </TouchableOpacity>
        ) : (
          <HabitGrid
            habits={habits}
            onRefresh={refetchHabits}
            missedHabits={userData?.missedHabits || []}
          />
        )}
      </View>

      <SetHabit
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onHabitCreated={handleHabitCreated}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 4,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1.6,
  },
  addButton: {
    padding: 8,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    margin: 16,
    padding: Platform.OS === "ios" ? 24 : 20,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    fontSize: Platform.OS === "ios" ? 15 : 14,
    textAlign: "center",
    lineHeight: Platform.OS === "ios" ? 22 : 20,
  },
});
