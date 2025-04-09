import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userService } from "@/backend/services/userService";
import type { ProgressSnapshot } from "@/backend/types/UserData";

type MutationContext = {
  previousProgress: ProgressSnapshot[] | undefined;
};

export function useProgressData(userId?: string) {
  const queryClient = useQueryClient();

  const { data: progress, ...queryInfo } = useQuery<ProgressSnapshot[]>({
    queryKey: ["progress", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID provided");
      const cached = await AsyncStorage.getItem(`progress-${userId}`);
      if (cached) {
        return JSON.parse(cached) as ProgressSnapshot[];
      }
      return await userService.getProgressData(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const addProgressMutation = useMutation<
    void,
    Error,
    ProgressSnapshot,
    MutationContext
  >({
    mutationFn: async (newSnapshot) => {
      if (!userId) throw new Error("No user ID provided");
      await userService.recordDailyProgress(userId, newSnapshot);
    },
    onMutate: async (newSnapshot) => {
      await queryClient.cancelQueries({ queryKey: ["progress", userId] });
      const previousProgress = queryClient.getQueryData<ProgressSnapshot[]>([
        "progress",
        userId,
      ]);

      queryClient.setQueryData<ProgressSnapshot[]>(
        ["progress", userId],
        (old) => (old ? [...old, newSnapshot] : [newSnapshot])
      );

      return { previousProgress } as MutationContext;
    },
    onError: (err, newSnapshot, context) => {
      queryClient.setQueryData(["progress", userId], context?.previousProgress);
    },
    onSettled: () => {
      // Only invalidate if the mutation was successful
      if (!addProgressMutation.isError) {
        queryClient.invalidateQueries({ queryKey: ["progress", userId] });
      }
    },
  });

  return {
    progress,
    addProgress: addProgressMutation.mutate,
    isLoading: queryInfo.isLoading,
    isError: queryInfo.isError,
  };
}
