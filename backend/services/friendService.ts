import { db } from "@/backend/config/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
  Timestamp,
  deleteDoc,
  getDoc,
  deleteField,
  arrayRemove,
  increment,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  FriendRequest,
  FriendRequestStatus,
  FriendData,
  Friend,
} from "../types/Friend";
import { NotificationType } from "../types/Notification";
import { Post } from "../types/Post";

export const friendService = {
  async sendFriendRequest(
    senderId: string,
    receiverId: string,
    senderDisplayName: string,
    senderPhotoURL?: string
  ): Promise<void> {
    try {
      console.log("Starting friend request process:", {
        senderId,
        receiverId,
        senderDisplayName,
        senderPhotoURL,
      });

      // Validate input
      if (!senderId || !receiverId) {
        throw new Error("Both sender and receiver IDs are required");
      }

      // Check if a friend request already exists
      const existingRequestsQuery = query(
        collection(db, "friendRequests"),
        where("senderId", "==", senderId),
        where("receiverId", "==", receiverId),
        where("status", "==", FriendRequestStatus.PENDING)
      );

      const existingRequests = await getDocs(existingRequestsQuery);
      if (!existingRequests.empty) {
        console.log("Friend request already exists");
        throw new Error("A friend request already exists");
      }

      // Get sender's data
      console.log("Fetching sender data...");
      const senderDoc = await getDoc(doc(db, "users", senderId));
      const senderData = senderDoc.data();

      if (!senderDoc.exists()) {
        console.error("Sender not found:", senderId);
        throw new Error("Sender user not found");
      }
      console.log("Sender data retrieved:", { senderData });

      // Get receiver's data
      console.log("Fetching receiver data...");
      const receiverDoc = await getDoc(doc(db, "users", receiverId));
      if (!receiverDoc.exists()) {
        console.error("Receiver not found:", receiverId);
        throw new Error("Receiver user not found");
      }

      const receiverData = receiverDoc.data();
      console.log("Receiver data retrieved:", { receiverData });

      const receiverDisplayName =
        receiverData?.username || receiverData?.displayName || "User";

      // Generate request ID
      const requestId = `fr_${senderId}_${receiverId}_${Date.now()}`;
      console.log("Generated request ID:", requestId);

      const timestamp = Timestamp.now();

      // Create request data
      const requestData = {
        id: requestId,
        senderId,
        receiverId,
        status: FriendRequestStatus.PENDING,
        createdAt: timestamp,
        senderDisplayName:
          senderData?.username || senderData?.displayName || senderDisplayName,
        senderPhotoURL: senderData?.photoURL || senderPhotoURL || null,
        receiverDisplayName,
      };

      // Create notification data
      const notificationData = {
        id: requestId,
        type: NotificationType.FRIEND_REQUEST,
        userId: receiverId,
        read: false,
        createdAt: timestamp,
        senderId,
        senderDisplayName: requestData.senderDisplayName,
        senderPhotoURL: requestData.senderPhotoURL,
        receiverId,
        receiverDisplayName,
        status: FriendRequestStatus.PENDING,
        responded: false,
      };

      // Use a batch write for atomicity
      const batch = writeBatch(db);

      // Add friend request document
      const friendRequestRef = doc(db, "friendRequests", requestId);
      batch.set(friendRequestRef, requestData);

      // Add notification document
      const notificationRef = doc(
        db,
        `users/${receiverId}/notifications/${requestId}`
      );
      batch.set(notificationRef, notificationData);

      // Commit the batch
      console.log("Committing batch write...");
      await batch.commit();
      console.log("Batch write successful");
    } catch (error) {
      console.error("Error in friend request process:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
      throw error;
    }
  },

  async acceptFriendRequest(
    requestId: string,
    senderData: FriendData,
    receiverData: FriendData
  ): Promise<void> {
    try {
      console.log("Starting acceptFriendRequest with:", {
        requestId,
        senderData,
        receiverData,
      });

      const requestRef = doc(db, "friendRequests", requestId);
      console.log("Getting friend request document...");
      const requestDoc = await getDoc(requestRef);
      const request = requestDoc.data() as FriendRequest;

      if (!request) {
        throw new Error("Friend request not found");
      }

      console.log("Friend request found:", request);

      // Add each user to the other's friends array sequentially
      console.log("Setting up document references...");
      const receiverRef = doc(db, "users", request.receiverId);
      const senderRef = doc(db, "users", request.senderId);

      console.log("Getting current user documents to verify...");
      const [receiverDoc, senderDoc] = await Promise.all([
        getDoc(receiverRef),
        getDoc(senderRef),
      ]);

      console.log("Current documents state:", {
        receiverExists: receiverDoc.exists(),
        senderExists: senderDoc.exists(),
        receiverFriends: receiverDoc.data()?.friends || [],
        senderFriends: senderDoc.data()?.friends || [],
      });

      // Update receiver first
      console.log("Adding sender to receiver's friends array...");
      await updateDoc(receiverRef, {
        friends: arrayUnion({
          userId: senderData.userId,
          displayName: senderData.displayName,
          username: senderData.username,
          photoURL: senderData.photoURL,
        }),
        id: requestId,
      });

      // Then update sender
      console.log("Adding receiver to sender's friends array...");
      await updateDoc(senderRef, {
        friends: arrayUnion({
          userId: receiverData.userId,
          displayName: receiverData.displayName,
          username: receiverData.username,
          photoURL: receiverData.photoURL,
        }),
        id: requestId,
      });

      // Finally delete the friend request
      console.log("Deleting friend request document...");
      await deleteDoc(requestRef);

      console.log("Friend request accepted successfully");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
      throw error;
    }
  },

  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    const q = query(
      collection(db, "friendRequests"),
      where("receiverId", "==", userId),
      where("status", "==", FriendRequestStatus.PENDING)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FriendRequest[];
  },

  async getFriendsList(userId: string): Promise<FriendData[]> {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    return userData?.friends || [];
  },

  async removeNotification(
    userId: string,
    notificationId: string
  ): Promise<void> {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      [`notifications.${notificationId}`]: deleteField(),
    });
  },

  async getFriendRequestStatus(
    userId: string,
    targetUserId: string
  ): Promise<FriendRequestStatus | null> {
    try {
      // Check if they're already friends
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data();
      if (
        userData?.friends?.some(
          (friend: FriendData) => friend.userId === targetUserId
        )
      ) {
        return FriendRequestStatus.ACCEPTED;
      }

      // Check for pending requests
      const q = query(
        collection(db, "friendRequests"),
        where("senderId", "==", userId),
        where("receiverId", "==", targetUserId),
        where("status", "==", FriendRequestStatus.PENDING)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        return FriendRequestStatus.PENDING;
      }

      return null;
    } catch (error) {
      console.error("Error getting friend request status:", error);
      return null;
    }
  },

  async declineFriendRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, "friendRequests", requestId);
      const requestDoc = await getDoc(requestRef);
      const requestData = requestDoc.data() as FriendRequest;

      // Update the notification instead of deleting it
      await updateDoc(doc(db, "users", requestData.receiverId), {
        [`notifications.${requestId}`]: {
          type: NotificationType.FRIEND_REQUEST,
          status: "DECLINED",
          read: true,
          createdAt: Timestamp.now(),
          senderId: requestData.senderId,
          senderDisplayName: requestData.senderDisplayName,
          senderPhotoURL: requestData.senderPhotoURL,
        },
      });

      // Delete the friend request document
      await deleteDoc(requestRef);
    } catch (error) {
      console.error("Error declining friend request:", error);
      throw error;
    }
  },

  async removeFriend(userId: string, friendId: string): Promise<void> {
    try {
      console.log("Starting removeFriend:", { userId, friendId });

      const userRef = doc(db, "users", userId);
      const friendRef = doc(db, "users", friendId);

      // Get both users' data
      const [userDoc, friendDoc] = await Promise.all([
        getDoc(userRef),
        getDoc(friendRef),
      ]);

      if (!userDoc.exists() || !friendDoc.exists()) {
        throw new Error("User or friend not found");
      }

      // Get current friends arrays
      const userData = userDoc.data();
      const friendData = friendDoc.data();

      // Create new arrays without the friend to remove
      const updatedUserFriends = (userData?.friends || []).filter(
        (f: FriendData) => f.userId !== friendId
      );

      const updatedFriendFriends = (friendData?.friends || []).filter(
        (f: FriendData) => f.userId !== userId
      );

      console.log("Updated arrays:", {
        updatedUserFriends,
        updatedFriendFriends,
      });

      // Set the new arrays
      await Promise.all([
        updateDoc(userRef, { friends: updatedUserFriends }),
        updateDoc(friendRef, { friends: updatedFriendFriends }),
      ]);

      console.log("Friend removal completed successfully");
    } catch (error) {
      console.error("Error in removeFriend:", error);
      throw error;
    }
  },

  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);

      // First remove from friends if they are friends
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      if (
        userData?.friends?.some((f: FriendData) => f.userId === blockedUserId)
      ) {
        await this.removeFriend(userId, blockedUserId);
      }

      // Add to blocked users array
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(blockedUserId),
      });

      // Cancel any pending friend requests
      const requests = await getDocs(
        query(
          collection(db, "friendRequests"),
          where("senderId", "in", [userId, blockedUserId]),
          where("receiverId", "in", [userId, blockedUserId])
        )
      );

      // Delete all friend requests between these users
      await Promise.all(requests.docs.map((doc) => deleteDoc(doc.ref)));
    } catch (error) {
      console.error("Error blocking user:", error);
      throw error;
    }
  },

  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        blockedUsers: arrayRemove(blockedUserId),
      });
    } catch (error) {
      console.error("Error unblocking user:", error);
      throw error;
    }
  },

  async getFriendsFeed(userId: string): Promise<Post[]> {
    try {
      const feedRef = collection(db, "posts");
      const q = query(feedRef, where("userId", "==", userId));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        userId: doc.data().userId,
        username: doc.data().username,
        hashtags: doc.data().hashtags || [],
        createdAt: doc.data().createdAt,
        content: doc.data().content,
        likes: doc.data().likes || 0,
        comments: doc.data().comments || 0,
        likedBy: doc.data().likedBy || [],
        privacy: doc.data().privacy || "public",
      })) as Post[];
    } catch (error) {
      console.error("Error getting friends feed:", error);
      return [];
    }
  },

  async getFriends(userId: string): Promise<Friend[]> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data();
      return userData?.friends || [];
    } catch (error) {
      console.error("Error getting friends:", error);
      return [];
    }
  },
};
