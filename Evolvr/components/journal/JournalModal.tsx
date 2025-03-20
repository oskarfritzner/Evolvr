import React from 'react';
import { router } from 'expo-router';
import { JournalType } from '@/backend/types/JournalEntry';

interface JournalModalProps {
  visible: boolean;
  onClose: () => void;
  initialType?: JournalType | null;
}

export function JournalModal({ visible, onClose, initialType }: JournalModalProps) {
  React.useEffect(() => {
    if (visible) {
      router.push({
        pathname: '/(modals)/journal',
        params: { initialType }
      });
    }
  }, [visible, initialType]);

  return null;
} 