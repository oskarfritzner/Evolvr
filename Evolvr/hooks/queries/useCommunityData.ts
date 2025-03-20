import { useQuery, useQueryClient } from "@tanstack/react-query";
import { friendService } from "@/backend/services/friendService";
import { postService } from "@/backend/services/postService";
import type { Post } from "@/backend/types/Post";
import { useEffect } from "react";

type FeedType = "friends" | "all" | "search";

export function useCommunityData(userId?: string, feedType: FeedType = "all") {
  const queryClient = useQueryClient();

  // Prefetch the other feed types
  useEffect(() => {
    if (userId) {
      if (feedType !== "friends") {
        queryClient.prefetchQuery({
          queryKey: ["communityFeed", userId, "friends"],
          queryFn: () => friendService.getFriendsFeed(userId),
        });
      }
      if (feedType !== "all") {
        queryClient.prefetchQuery({
          queryKey: ["communityFeed", userId, "all"],
          queryFn: () =>
            postService.getFeedPosts({ userIds: [], currentUserId: userId }),
        });
      }
    }
  }, [userId, feedType]);

  const query = useQuery<Post[], Error>({
    queryKey: ["communityFeed", userId, feedType],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID provided");
      switch (feedType) {
        case "friends":
          return friendService.getFriendsFeed(userId);
        case "all":
          return postService.getFeedPosts({
            userIds: [],
            currentUserId: userId,
          });
        default:
          return [];
      }
    },
    enabled: !!userId && feedType !== "search",
    staleTime: 1000 * 60, // Consider data stale after 1 minute
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

  // Function to manually invalidate and refetch data
  const refreshFeed = () => {
    if (userId) {
      // Invalidate all feed types
      queryClient.invalidateQueries({ queryKey: ["communityFeed", userId] });
      // Also invalidate profile data
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    }
  };

  return {
    ...query,
    refreshFeed,
  };
}
