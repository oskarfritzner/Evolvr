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
  increment,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { Post } from "../types/Post";
import { uploadImage } from "@/utils/uploadImage";
import { Friend } from "../types/Friend";
import { auth } from "@/backend/config/firebase";
import { storage } from "@/backend/config/firebase";
import { ref, deleteObject } from "firebase/storage";
import { deleteDoc } from "firebase/firestore";

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
            likedByDetails: data.likedByDetails || [],
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
      // If viewing own posts, return all posts regardless of privacy
      if (viewerId === userId) {
        const q = query(
          collection(db, "posts"),
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              likedBy: doc.data().likedBy || [],
              likedByDetails: doc.data().likedByDetails || [],
              comments: doc.data().comments || [],
              likes: doc.data().likes || 0,
            } as Post)
        );

        return posts;
      }

      // For other viewers, we need to check friendship status
      let areMutualFriends = false;
      if (viewerId) {
        // Check for mutual friendship
        const [viewerDoc, userDoc] = await Promise.all([
          getDoc(doc(db, "users", viewerId)),
          getDoc(doc(db, "users", userId)),
        ]);

        const viewerData = viewerDoc.data();
        const userData = userDoc.data();

        // Check if they are mutual friends by checking if their IDs are in each other's friends arrays
        const viewerFriends = viewerData?.friends || [];
        const userFriends = userData?.friends || [];

        // Extract just the userIds from the friend objects
        const viewerFriendIds = viewerFriends.map(
          (friend: any) => friend.userId
        );
        const userFriendIds = userFriends.map((friend: any) => friend.userId);

        const viewerHasUser = viewerFriendIds.includes(userId);
        const userHasViewer = userFriendIds.includes(viewerId);
        areMutualFriends = viewerHasUser && userHasViewer;
      }

      // Get all posts first
      const postsQuery = query(
        collection(db, "posts"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(postsQuery);
      const allPosts = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          likedBy: data.likedBy || [],
          likedByDetails: data.likedByDetails || [],
          comments: data.comments || [],
          likes: data.likes || 0,
        } as Post;
      });

      // Filter posts based on privacy and friendship status
      const filteredPosts = allPosts.filter((post) => {
        let shouldShow = false;

        switch (post.privacy) {
          case "public":
            shouldShow = true;
            break;
          case "friends":
            shouldShow = areMutualFriends;
            break;
          case "private":
            shouldShow = false;
            break;
          default:
            shouldShow = false;
        }

        return shouldShow;
      });

      return filteredPosts;
    } catch (error) {
      throw error;
    }
  },

  async toggleLike(postId: string, userId: string): Promise<void> {
    try {
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) return;

      const post = postDoc.data();
      const likes = post.likedBy || [];
      const isLiked = likes.includes(userId);

      // Get user data for the like
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (!userData) return;

      const userDetails: Friend = {
        userId,
        username: userData.username || "User",
        displayName: userData.displayName || userData.username || "User",
        photoURL: userData.photoURL,
      };

      if (isLiked) {
        // Remove like
        await updateDoc(postRef, {
          likedBy: arrayRemove(userId),
          likedByDetails: arrayRemove(userDetails),
          likes: increment(-1),
        });
      } else {
        // Add like
        await updateDoc(postRef, {
          likedBy: arrayUnion(userId),
          likedByDetails: arrayUnion(userDetails),
          likes: increment(1),
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      throw error;
    }
  },

  async getLikedByDetails(postId: string): Promise<Friend[]> {
    try {
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) return [];

      const post = postDoc.data();
      return post.likedByDetails || [];
    } catch (error) {
      console.error("Error getting liked by details:", error);
      return [];
    }
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
      likedByDetails: [],
      comments: [],
      content: description || "",
      likes: 0,
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

  async updatePostPrivacy(
    postId: string,
    privacy: "public" | "friends" | "private"
  ): Promise<void> {
    try {
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        throw new Error("Post not found");
      }

      // Verify the user owns the post (this should also be enforced by security rules)
      const post = postDoc.data();
      if (post.userId !== auth.currentUser?.uid) {
        throw new Error("Unauthorized to update this post");
      }

      await updateDoc(postRef, {
        privacy,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error updating post privacy:", error);
      throw error;
    }
  },

  async deletePost(postId: string): Promise<void> {
    try {
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        throw new Error("Post not found");
      }

      // Verify the user owns the post (this should also be enforced by security rules)
      const post = postDoc.data();
      if (post.userId !== auth.currentUser?.uid) {
        throw new Error("Unauthorized to delete this post");
      }

      // If post has an image, delete it from storage
      if (post.imageURL) {
        const imageRef = ref(storage, `posts/${postId}`);
        try {
          await deleteObject(imageRef);
        } catch (error) {
          console.error("Error deleting post image:", error);
          // Continue with post deletion even if image deletion fails
        }
      }

      await deleteDoc(postRef);
    } catch (error) {
      console.error("Error deleting post:", error);
      throw error;
    }
  },
};
