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
import EditRoutine from "./EditRoutine";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import { FontAwesome5 } from "@expo/vector-icons";
import { MotiView } from "moti";
import { Easing } from "react-native";

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
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [deleteRoutineId, setDeleteRoutineId] = useState<string | null>(null);
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

  const handleRoutinePress = (routine: Routine) => {
    setSelectedRoutine(routine);
    setEditModalVisible(true);
  };

  const handleRoutineUpdated = () => {
    setEditModalVisible(false);
    setSelectedRoutine(null);
    queryClient.invalidateQueries({
      queryKey: ["routines", user?.uid],
    });
  };

  const routines = Array.isArray(routinesData) ? routinesData : [];
  const activeRoutines = routines.filter(
    (routine: Routine) => !routine.archivedAt
  );

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

  return (
    <React.Fragment>
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
            <View style={styles.routinesContainer}>
              {activeRoutines.map((routine) => (
                <MotiView
                  key={routine.id}
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    opacity: {
                      type: "timing",
                      duration: 300,
                      easing: Easing.bezier(0.2, 0.65, 0.5, 0.9),
                    },
                    scale: {
                      type: "timing",
                      duration: 300,
                      easing: Easing.bezier(0.2, 0.65, 0.5, 0.9),
                    },
                  }}
                >
                  <RoutineCard
                    routine={routine}
                    onPress={() => handleRoutinePress(routine)}
                    onDelete={() => setDeleteRoutineId(routine.id)}
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
        {selectedRoutine && (
          <EditRoutine
            visible={editModalVisible}
            onClose={() => {
              setEditModalVisible(false);
              setSelectedRoutine(null);
            }}
            routine={selectedRoutine}
            onRoutineUpdated={handleRoutineUpdated}
          />
        )}
        <ConfirmationDialog
          visible={!!deleteRoutineId}
          title="Delete Routine"
          message="Are you sure you want to delete this routine? This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteRoutineId(null)}
        />
      </View>
    </React.Fragment>
  );
};

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
  scrollContent: {
    flexGrow: 1,
  },
  routinesContainer: {
    gap: 16,
  },
  routineCardWrapper: {
    width: "100%",
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
  compactRoutinesContainer: {
    // Add appropriate styles for compact container
  },
});

export default RoutineGrid;
