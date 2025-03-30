import React from 'react';
import { BaseCoach } from '../BaseCoach';
import { useCoachingChat } from '@/hooks/useCoachingChat';

interface DefaultCoachProps {
  onClose: () => void;
}

export function DefaultCoach({ onClose }: DefaultCoachProps) {
  const { messages, isTyping, isSending, sendMessage } = useCoachingChat('default');

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  return (
    <BaseCoach
      onClose={onClose}
      personality="default"
      initialMessage="Hi! I'm Evolve, your personal mindset coach. 🌱 I'm here to support your growth journey, provide insights, and help you develop positive habits. What's on your mind today?"
      thinkingMessage="Thinking..."
      typingMessage="Evolve is typing..."
      onSendMessage={handleSendMessage}
      messages={messages}
      isTyping={isTyping}
      isSending={isSending}
    />
  );
} 