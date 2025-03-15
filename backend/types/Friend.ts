export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: Date;
  senderDisplayName: string;
  senderPhotoURL?: string;
  receiverDisplayName?: string;
}

export enum FriendRequestStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

// This represents the friend data stored in user's friends array
export interface FriendData {
  userId: string;
  displayName: string;
  photoURL?: string;
  username: string;
  level?: number;
  badges?: string[];
}

// Use FriendData as our Friend type
export type Friend = FriendData;
