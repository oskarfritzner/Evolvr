import React from 'react';
import { BaseCoach } from '../BaseCoach';
import { useCoachingChat } from '@/hooks/useCoachingChat';

interface PeteCoachProps {
  onClose: () => void;
}

export function PeteCoach({ onClose }: PeteCoachProps) {
  const { messages, isTyping, isSending, sendMessage } = useCoachingChat('pete');

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  return (
    <BaseCoach
      onClose={onClose}
      personality="pete"
      initialMessage="Well... it's quite remarkable that you're here. That's a sign you're willing to face the chaos voluntarily, and that's no small thing. 🦞 What meaningful challenge are you wrestling with today? Remember, the truth is the path forward, so speak carefully and precisely about what's troubling you."
      thinkingMessage="Finding order..."
      typingMessage="Contemplating the chaos... 🦞"
      onSendMessage={handleSendMessage}
      messages={messages}
      isTyping={isTyping}
      isSending={isSending}
    />
  );
} 