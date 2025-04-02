import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import PostGrid from '@/components/posts/PostGrid';
import BadgesGrid from '@/components/BadgesGrid';

interface ProfileContentProps {
  activeTab: string;
  userId?: string;
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});

export const ProfileContent = memo(({ activeTab, userId }: ProfileContentProps) => {
  return (
    <View style={styles.content}>
      {activeTab === 'posts' ? (
        <PostGrid userId={userId} />
      ) : (
        userId ? <BadgesGrid userId={userId} /> : null
      )}
    </View>
  );
}); 