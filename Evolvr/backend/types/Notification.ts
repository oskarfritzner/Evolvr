import { Timestamp } from "firebase/firestore";
import { Routine } from "./Routine";

export enum NotificationType {
  FRIEND_REQUEST = "FRIEND_REQUEST",
  FRIEND_ACCEPTED = "FRIEND_ACCEPTED",
  ROUTINE_INVITE = "ROUTINE_INVITE",
  ROUTINE_DELETED = "ROUTINE_DELETED",
  ROUTINE_UPDATED = "ROUTINE_UPDATED",
  CHALLENGE_INVITE = "CHALLENGE_INVITE",
  CHALLENGE_COMPLETED = "CHALLENGE_COMPLETED",
  LEVEL_UP = "LEVEL_UP",
  ACHIEVEMENT = "ACHIEVEMENT",
  SYSTEM = "SYSTEM",
}

export interface BaseNotification {
  id: string;
  type: NotificationType;
  userId: string;
  read: boolean;
  createdAt: Timestamp;
  responded?: boolean;
  respondedAt?: Timestamp;
}

export interface FriendRequestNotification extends BaseNotification {
  type: NotificationType.FRIEND_REQUEST;
  senderId: string;
  senderDisplayName: string;
  senderPhotoURL?: string;
  status?: "PENDING" | "ACCEPTED" | "DECLINED";
  receiverId: string;
  receiverDisplayName: string;
  receiverPhotoURL?: string;
  responded: boolean;
}

export interface ChallengeInviteNotification extends BaseNotification {
  type: NotificationType.CHALLENGE_INVITE;
  challengeId: string;
  challengeName: string;
  inviterId: string;
  inviterName: string;
  responded: boolean;
  receiverId: string;
  receiverDisplayName: string;
  receiverPhotoURL?: string;
}

export interface AchievementNotification extends BaseNotification {
  type: NotificationType.ACHIEVEMENT;
  achievementId: string;
  achievementName: string;
  description: string;
}

export interface RoutineInviteNotification extends BaseNotification {
  type: NotificationType.ROUTINE_INVITE;
  routineId: string;
  routineName: string;
  inviterId: string;
  inviterName: string;
  inviterPhotoURL?: string;
  status?: "accepted" | "declined";
  routine: {
    title: string;
    description?: string;
    tasks: {
      id: string;
      title: string;
      days: number[];
      description?: string;
    }[];
  };
}

export interface RoutineDeletedNotification extends BaseNotification {
  type: NotificationType.ROUTINE_DELETED;
  routineId: string;
  routineTitle: string;
  creatorId: string;
  routine: Routine;
  responded: boolean;
  status?: "continued" | "dismissed";
}

export interface RoutineUpdatedNotification extends BaseNotification {
  type: NotificationType.ROUTINE_UPDATED;
  routineId: string;
  routineName: string;
  updatedBy: string;
  message: string;
}

export type Notification =
  | RoutineInviteNotification
  | FriendRequestNotification
  | RoutineDeletedNotification
  | RoutineUpdatedNotification
  | ChallengeInviteNotification
  | AchievementNotification;
