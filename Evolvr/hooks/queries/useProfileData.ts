import { useQuery } from "@tanstack/react-query";
import { userService } from "@/backend/services/userService";
import { postService } from "@/backend/services/postService";
import { friendService } from "@/backend/services/friendService";
import type { UserData, UserStats } from "@/backend/types/UserData";
import type { Post } from "@/backend/types/Post";
import { useAuth } from "@/context/AuthContext";

interface ProfileData {
  userData: UserData;
  posts: Post[];
  stats: UserStats;
  isFriend: boolean;
}

export function useProfileData(userId?: string) {
  const { user } = useAuth();
  const currentUserId = user?.uid;

  return useQuery<ProfileData, Error>({
    queryKey: ["profile", userId, currentUserId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID provided");

      // Get user data
      const userData = await userService.getUserData(userId);
      if (!userData) throw new Error("User not found");

      // Check mutual friendship status if viewing another user's profile
      let isFriend = false;
      if (currentUserId && userId !== currentUserId) {
        const [userFriends, currentUserFriends] = await Promise.all([
          friendService.getFriends(userId),
          friendService.getFriends(currentUserId),
        ]);

        // Check if both users have each other as friends
        const isUserFriendWithViewer = userFriends.some(
          (friend) => friend.userId === currentUserId
        );
        const isViewerFriendWithUser = currentUserFriends.some(
          (friend) => friend.userId === userId
        );
        isFriend = isUserFriendWithViewer && isViewerFriendWithUser;
      }

      // Get posts based on privacy settings and friendship status
      const posts = await postService.getUserPosts(userId, currentUserId);

      // Get user stats
      const stats = await userService.getUserStats(userId);

      return {
        userData,
        posts,
        stats,
        isFriend,
      };
    },
    enabled: !!userId,
    retry: 1,
  });
}
