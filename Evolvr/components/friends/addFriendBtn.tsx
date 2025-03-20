import React, { useState, useEffect } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { friendService } from "@/backend/services/friendService";
import { useAuth } from "@/context/AuthContext";
import { FriendRequestStatus } from "@/backend/types/Friend";

interface AddFriendBtnProps {
  targetUserId: string;
  targetUserDisplayName: string;
  targetUserPhotoURL?: string;
  onRequestSent?: () => void;
  variant?: "primary" | "small";
}

export default function AddFriendBtn({
  targetUserId,
  targetUserDisplayName,
  targetUserPhotoURL,
  onRequestSent,
  variant = "primary",
}: AddFriendBtnProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<FriendRequestStatus | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    checkFriendRequestStatus();
  }, [targetUserId, user?.uid]);

  const checkFriendRequestStatus = async () => {
    if (!user) return;
    try {
      const status = await friendService.getFriendRequestStatus(user.uid, targetUserId);
      setRequestStatus(status);
    } catch (error) {
      console.error("Error checking friend request status:", error);
    }
  };

  const handleAddFriend = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await friendService.sendFriendRequest(
        user.uid,
        targetUserId,
        user.userData?.username || "Anonymous",
        user.userData?.photoURL || undefined
      );
      setRequestStatus(FriendRequestStatus.PENDING);
      onRequestSent?.();
    } catch (error) {
      console.error("Error sending friend request:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (requestStatus === FriendRequestStatus.ACCEPTED) {
    return null; // Don't show button if they're already friends
  }

  if (isLoading) {
    return (
      <TouchableOpacity 
        style={[styles.button, variant === "small" && styles.smallButton]} 
        disabled
      >
        <ActivityIndicator size="small" color="#fff" />
      </TouchableOpacity>
    );
  }

  if (requestStatus === FriendRequestStatus.PENDING) {
    return (
      <TouchableOpacity 
        style={[styles.button, styles.pendingButton, variant === "small" && styles.smallButton]}
        disabled
      >
        <Text style={[styles.text, variant === "small" && styles.smallText]}>
          Pending
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, variant === "small" && styles.smallButton]}
      onPress={handleAddFriend}
    >
      <Text style={[styles.text, variant === "small" && styles.smallText]}>
        Add Friend
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingButton: {
    backgroundColor: "#9E9E9E",
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  smallText: {
    fontSize: 14,
  },
});
