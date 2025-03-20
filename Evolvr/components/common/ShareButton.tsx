import React from 'react';
import { Share, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';

interface ShareButtonProps {
  title: string;
  message: string;
  contentId: string;
  contentType: 'challenge' | 'routine' | 'badge';
}

export default function ShareButton({ title, message }: ShareButtonProps) {
  const { colors } = useTheme();

  const handleShare = async () => {
    try {
      await Share.share({
        title,
        message,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <IconButton
      icon="share-variant"
      size={24}
      iconColor={colors.labelPrimary}
      onPress={handleShare}
    />
  );
} 