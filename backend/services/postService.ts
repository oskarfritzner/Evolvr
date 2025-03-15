import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  Timestamp,
  getDoc,
  doc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  setDoc,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { Post } from "../types/Post";
import { uploadImage } from "@/utils/uploadImage";

interface GetFeedPostsParams {
  userIds: string[];
  limit?: number;
  cursor?: Timestamp | null;
  currentUserId: string;
}

export const postService = {
  // ... existing methods ...

  async getFeedPosts({
    userIds,
    limit: limitCount = 10,
    cursor = null,
    currentUserId,
  }: GetFeedPostsParams): Promise<Post[]> {
    try {
      // Always include current user's ID if not already in the array
      const queryUserIds = userIds.length > 0 ? userIds : [currentUserId];

      // We need to make multiple queries to handle different privacy levels
      const queries = [
        // Query 1: Public posts from the users
        query(
          collection(db, "posts"),
          where("privacy", "==", "public"),
          where("userId", "in", queryUserIds),
          orderBy("createdAt", "desc"),
          orderBy("__name__", "desc"),
          limit(limitCount)
        ),
        // Query 2: Friends-only posts if querying friends
        ...(userIds.length > 0
          ? [
              query(
                collection(db, "posts"),
                where("privacy", "==", "friends"),
                where("userId", "in", userIds),
                orderBy("createdAt", "desc"),
                orderBy("__name__", "desc"),
                limit(limitCount)
              ),
            ]
          : []),
        // Query 3: All posts from current user, using existing index
        query(
          collection(db, "posts"),
          where("userId", "==", currentUserId),
          orderBy("privacy", "asc"),
          orderBy("createdAt", "desc"),
          orderBy("__name__", "desc"),
          limit(limitCount)
        ),
      ];

      // Execute all queries
      const snapshots = await Promise.all(queries.map((q) => getDocs(q)));

      // Combine all results and map to Post type
      const allPosts = snapshots.flatMap((snapshot) =>
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            username: data.username,
            userPhotoURL: data.userPhotoURL,
            title: data.title || "",
            description: data.description || "",
            imageURL: data.imageURL || null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt || data.createdAt,
            privacy: data.privacy || "public",
            location: data.location || "",
            hashtags: data.hashtags || [],
            content: data.content || "",
            likedBy: data.likedBy || [],
            comments: data.comments || [],
            likes: data.likes || 0,
          } as Post;
        })
      );

      // Remove duplicates (in case a post appears in multiple queries)
      const uniquePosts = Array.from(
        new Map(allPosts.map((post) => [post.id, post])).values()
      );

      // Sort by createdAt and limit results
      return uniquePosts
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        .slice(0, limitCount);
    } catch (error) {
      console.error("Error getting feed posts:", error);
      console.error("Error details:", { userIds, currentUserId, error });
      throw error;
    }
  },

  async getUserPosts(userId: string, viewerId?: string): Promise<Post[]> {
    try {
      // If no viewer specified, only return public posts
      if (!viewerId) {
        const q = query(
          collection(db, "posts"),
          where("userId", "==", userId),
          where("privacy", "==", "public"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Post)
        );
      }

      // Get viewer's relationship with the user
      const viewerDoc = await getDoc(doc(db, "users", viewerId));
      const viewerData = viewerDoc.data();
      const isFriend = viewerData?.friends?.includes(userId);
      const isOwner = viewerId === userId;

      // Build privacy filter based on relationship
      const privacyFilter = ["public"];
      if (isFriend) privacyFilter.push("friends");
      if (isOwner) privacyFilter.push("private");

      const q = query(
        collection(db, "posts"),
        where("userId", "==", userId),
        where("privacy", "in", privacyFilter),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Post)
      );
    } catch (error) {
      console.error("Error getting user posts:", error);
      throw error;
    }
  },

  async toggleLike(postId: string, userId: string): Promise<void> {
    const postRef = doc(db, "posts", postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) return;

    const post = postDoc.data();
    const likes = post.likedBy || [];
    const isLiked = likes.includes(userId);

    await updateDoc(postRef, {
      likedBy: isLiked ? arrayRemove(userId) : arrayUnion(userId),
    });
  },

  async createPost(
    userId: string,
    username: string,
    userPhotoURL: string | undefined,
    title: string,
    description: string,
    imageBlob?: Blob,
    privacy: "public" | "friends" | "private" = "public"
  ): Promise<void> {
    const postRef = doc(collection(db, "posts"));
    const imageURL = imageBlob
      ? await uploadImage(imageBlob, `posts/${postRef.id}`)
      : null;

    await setDoc(postRef, {
      id: postRef.id,
      userId,
      username,
      userPhotoURL,
      title,
      description,
      imageURL,
      privacy,
      createdAt: Timestamp.now(),
      likedBy: [],
      comments: [],
    });
  },

  async addComment(
    postId: string,
    userId: string,
    username: string,
    userPhotoURL: string | undefined,
    content: string
  ): Promise<void> {
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      comments: arrayUnion({
        userId,
        username,
        userPhotoURL,
        content,
        createdAt: Timestamp.now(),
      }),
    });
  },
};
