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

  return useQuery<Post[], Error>({
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
  });
}
