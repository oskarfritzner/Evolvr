import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  coachingService,
  CoachingMessage,
} from "@/backend/services/coachingService";
import { useAuth } from "@/context/AuthContext";

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

  const sendMessage = useMutation({
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
    },
    onSettled: () => {
      setIsTyping(false);
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      // You might want to show a toast or error message here
    },
  });

  const clearChat = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("User not authenticated");
      return coachingService.clearSession(user.uid);
    },
    onSuccess: () => {
      queryClient.setQueryData(["coaching", user?.uid], []);
    },
  });

  return {
    messages,
    isLoading,
    isTyping,
    sendMessage: sendMessage.mutate,
    clearChat: clearChat.mutate,
    isSending: sendMessage.isPending,
    isClearing: clearChat.isPending,
  };
}
