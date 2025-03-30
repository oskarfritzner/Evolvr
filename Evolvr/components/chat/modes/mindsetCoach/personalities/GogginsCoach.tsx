import React from 'react';
import { BaseCoach } from '../BaseCoach';
import { useCoachingChat } from '@/hooks/useCoachingChat';

interface GogginsCoachProps {
  onClose: () => void;
}

export function GogginsCoach({ onClose }: GogginsCoachProps) {
  const { messages, isTyping, isSending, sendMessage } = useCoachingChat('goggins');

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  return (
    <BaseCoach
      onClose={onClose}
      personality="goggins"
      initialMessage="WHO'S GONNA CARRY THE BOATS?! 💪 Time to callus your mind and push beyond your limits! I don't accept excuses, only results. You're capable of 20X more than you think. What's holding you back? TELL ME NOW! STAY HARD! 💪"
      thinkingMessage="Taking souls..."
      typingMessage="Getting after it... 💪"
      onSendMessage={handleSendMessage}
      messages={messages}
      isTyping={isTyping}
      isSending={isSending}
    />
  );
} 