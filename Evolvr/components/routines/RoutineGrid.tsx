import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  useNavigation,
  useRoute,
  RouteProp,
  ParamListBase,
} from "@react-navigation/native";
import { routineService } from "@/backend/services/routineServices";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import RoutineCard from "./RoutineCard";
import CreateRoutine from "./CreateRoutine";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { FontAwesome5 } from "@expo/vector-icons";
import { MotiView } from "moti";

interface Routine {
  id: string;
  title: string;
  description?: string;
  archivedAt?: string | null;
  participants: string[];
  invites: string[];
  tasks: any[];
  createdBy: string;
  createdAt: number;
  active: boolean;
  [key: string]: any; // For any other fields
}

interface RouteParams {
  routineId?: string;
}

export interface RoutineGridProps {
  compact?: boolean;
  onItemPress?: (routine: Routine) => void;
  sharedWithMe?: boolean;
}

const useToast = () => {
  return {
    show: ({ message, type }: { message: string; type: string }) => {
      console.log(`[${type}]: ${message}`);
    },
  };
};

const RoutineGrid = ({
  compact = false,
  onItemPress,
  sharedWithMe = false,
}: RoutineGridProps) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [deleteRoutineId, setDeleteRoutineId] = useState<string | null>(null);
  const [editRoutine, setEditRoutine] = useState<Routine | null>(null);
  const [filter, setFilter] = useState<"all" | "current">("all");
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const params = route.params as RouteParams | undefined;

  useEffect(() => {
    if (params?.routineId) {
      const routineId = params.routineId;
      (navigation as any).navigate("routineDetails", { routineId });
    }
  }, [params?.routineId, navigation]);

  const {
    data: routinesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["routines", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      return routineService.getUserRoutines(user.uid);
    },
    enabled: !!user?.uid,
  });

  useEffect(() => {
    if (error) {
      toast.show({
        message: "Failed to load routines",
        type: "error",
      });
      console.error("Failed to load routines:", error);
    }
  }, [error]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (!deleteRoutineId || !user?.uid) return;

    try {
      await routineService.deleteRoutine(user.uid, deleteRoutineId);

      await queryClient.invalidateQueries({
        queryKey: ["routines", user?.uid],
      });

      toast.show({
        message: "Routine deleted successfully",
        type: "success",
      });
    } catch (error) {
      toast.show({
        message: "Failed to delete routine",
        type: "error",
      });
      console.error("Failed to delete routine:", error);
    } finally {
      setDeleteRoutineId(null);
    }
  };

  const handleRoutineCreated = () => {
    setCreateModalVisible(false);
    queryClient.invalidateQueries({
      queryKey: ["routines", user?.uid],
    });
  };

  const routines = Array.isArray(routinesData) ? routinesData : [];

  const activeRoutines = routines.filter(
    (routine: Routine) => !routine.archivedAt
  );

  const filteredRoutines = activeRoutines.filter((routine: Routine) => {
    if (filter === "current") {
      return !routine.archivedAt;
    }
    return true;
  });

  const webGridStyle =
    Platform.OS === "web"
      ? ({
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "16px",
          width: "100%",
        } as any)
      : {};

  if (isLoading && !refreshing) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.surfaceContainerLow },
        ]}
      >
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  const content = (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.secondary }]}>
          Routines
        </Text>
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          style={[styles.addButton, { backgroundColor: colors.secondary }]}
        >
          <FontAwesome5 name="plus" size={16} color={colors.surface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {activeRoutines.length === 0 ? (
          <TouchableOpacity
            style={[styles.emptyState, { borderColor: colors.textSecondary }]}
            onPress={() => setCreateModalVisible(true)}
            accessibilityLabel="Create your first routine"
            accessibilityRole="button"
          >
            <Text
              style={[styles.emptyStateText, { color: colors.textSecondary }]}
            >
              No routines created yet. Tap to create one!
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.routinesGrid}>
            {activeRoutines.map((routine: Routine) => (
              <MotiView
                key={routine.id}
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <RoutineCard
                  routine={routine}
                  sharedWithMe={sharedWithMe}
                  onPress={() => onItemPress?.(routine)}
                  onDelete={() => setDeleteRoutineId(routine.id)}
                  compact={compact}
                />
              </MotiView>
            ))}
          </View>
        )}
      </ScrollView>

      <CreateRoutine
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onRoutineCreated={handleRoutineCreated}
      />

      <ConfirmationDialog
        visible={!!deleteRoutineId}
        title="Delete Routine"
        message="Are you sure you want to delete this routine? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteRoutineId(null)}
      />
    </View>
  );

  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    padding: Platform.OS === "ios" ? 10 : 8,
    borderRadius: 20,
    width: Platform.OS === "ios" ? 40 : 36,
    height: Platform.OS === "ios" ? 40 : 36,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    flexGrow: 1,
  },
  routinesGrid: {
    gap: 16,
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

export default RoutineGrid;
