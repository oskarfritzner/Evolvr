import { useQuery } from "@tanstack/react-query";
import { friendService } from "@/backend/services/friendService";
import { Friend } from "@/backend/types/Friend";

export function useFriends(userId?: string) {
  return useQuery<Friend[], Error>({
    queryKey: ["friends", userId],
    queryFn: () => {
      if (!userId) throw new Error("No user ID provided");
      return friendService.getFriends(userId);
    },
    enabled: !!userId,
  });
}
