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
        throw new Error("A friend request already exists");
      }

      // Get sender's data
      const senderDoc = await getDoc(doc(db, "users", senderId));
      const senderData = senderDoc.data();

      if (!senderDoc.exists()) {
        throw new Error("Sender user not found");
      }

      // Get receiver's data
      const receiverDoc = await getDoc(doc(db, "users", receiverId));
      if (!receiverDoc.exists()) {
        throw new Error("Receiver user not found");
      }

      const receiverData = receiverDoc.data();
      const receiverDisplayName =
        receiverData?.username || receiverData?.displayName || "User";

      // Generate request ID
      const requestId = `fr_${senderId}_${receiverId}_${Date.now()}`;

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
      await batch.commit();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An error occurred while sending friend request");
    }
  },

  async acceptFriendRequest(
    requestId: string,
    senderData: FriendData,
    receiverData: FriendData
  ): Promise<void> {
    try {
      const requestRef = doc(db, "friendRequests", requestId);
      const requestDoc = await getDoc(requestRef);
      const request = requestDoc.data() as FriendRequest;

      if (!request) {
        throw new Error("Friend request not found");
      }

      // Add each user to the other's friends array sequentially
      const receiverRef = doc(db, "users", request.receiverId);
      const senderRef = doc(db, "users", request.senderId);

      const [receiverDoc, senderDoc] = await Promise.all([
        getDoc(receiverRef),
        getDoc(senderRef),
      ]);

      // Update receiver first
      await updateDoc(receiverRef, {
        friends: arrayUnion({
          userId: senderData.userId,
          displayName: senderData.displayName,
          username: senderData.username,
          photoURL: senderData.photoURL,
        }),
      });

      // Then update sender
      await updateDoc(senderRef, {
        friends: arrayUnion({
          userId: receiverData.userId,
          displayName: receiverData.displayName,
          username: receiverData.username,
          photoURL: receiverData.photoURL,
        }),
      });

      // Finally delete the friend request
      await deleteDoc(requestRef);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An error occurred while accepting friend request");
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
      throw error;
    }
  },

  async removeFriend(userId: string, friendId: string): Promise<void> {
    try {
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

      // Set the new arrays
      await Promise.all([
        updateDoc(userRef, { friends: updatedUserFriends }),
        updateDoc(friendRef, { friends: updatedFriendFriends }),
      ]);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An error occurred while removing friend");
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
      return [];
    }
  },

  async getFriends(userId: string): Promise<Friend[]> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data();
      return userData?.friends || [];
    } catch (error) {
      return [];
    }
  },
};
