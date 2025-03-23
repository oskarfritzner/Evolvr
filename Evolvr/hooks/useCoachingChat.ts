import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  coachingService,
  CoachingMessage,
} from "@/backend/services/coachingService";
import { useAuth } from "@/context/AuthContext";
import Toast from "react-native-toast-message";

export function useCoachingChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["coaching", user?.uid],
    queryFn: () => {
      if (!user?.uid) throw new Error("User not authenticated");
      return coachingService.getSessionHistory(user.uid);
    },
    enabled: !!user?.uid,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!user?.uid) throw new Error("User not authenticated");
      setIsTyping(true);
      return coachingService.sendMessage(user.uid, message);
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData<CoachingMessage[]>(
        ["coaching", user?.uid],
        (old = []) => {
          // Ensure proper ordering by timestamp
          const updatedMessages = [...old, newMessage].sort((a, b) => {
            const aTime = a.timestamp?.toMillis() || 0;
            const bTime = b.timestamp?.toMillis() || 0;
            return aTime - bTime;
          });
          return updatedMessages;
        }
      );

      // Show success toast for certain types of responses
      if (
        newMessage.content.includes("completed") ||
        newMessage.content.includes("great job") ||
        newMessage.content.includes("congratulations")
      ) {
        Toast.show({
          type: "success",
          text1: "Keep it up! 🌟",
          text2: "You're making great progress on your journey.",
          visibilityTime: 3000,
        });
      }
    },
    onSettled: () => {
      setIsTyping(false);
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      Toast.show({
        type: "error",
        text1: "Message not sent",
        text2: "Please try again in a moment",
        visibilityTime: 3000,
      });
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("User not authenticated");
      return coachingService.clearSession(user.uid);
    },
    onSuccess: () => {
      queryClient.setQueryData(["coaching", user?.uid], []);
      Toast.show({
        type: "success",
        text1: "Chat cleared",
        text2: "Starting fresh with your mindset coach",
        visibilityTime: 3000,
      });
    },
    onError: (error) => {
      console.error("Error clearing chat:", error);
      Toast.show({
        type: "error",
        text1: "Could not clear chat",
        text2: "Please try again later",
        visibilityTime: 3000,
      });
    },
  });

  return {
    messages,
    isLoading,
    isTyping,
    isSending: sendMessageMutation.isPending,
    isClearing: clearChatMutation.isPending,
    sendMessage: sendMessageMutation.mutate,
    clearChat: clearChatMutation.mutate,
  };
}
