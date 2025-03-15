import { useQuery } from "@tanstack/react-query";
import { userService } from "@/backend/services/userService";
import { postService } from "@/backend/services/postService";
import type { UserData, UserStats } from "@/backend/types/UserData";
import type { Post } from "@/backend/types/Post";

interface ProfileData {
  userData: UserData;
  posts: Post[];
  stats: UserStats;
}

export function useProfileData(userId?: string) {
  return useQuery<ProfileData, Error>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID provided");
      const userData = await userService.getUserData(userId);
      if (!userData) throw new Error("User not found");
      const posts = await postService.getUserPosts(userId);
      const stats = await userService.getUserStats(userId);
      return { userData, posts, stats };
    },
    enabled: !!userId,
    retry: 1,
  });
}
