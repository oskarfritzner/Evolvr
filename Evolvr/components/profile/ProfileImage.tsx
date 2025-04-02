import React, { memo } from 'react';
import { Image, StyleSheet } from 'react-native';

interface ProfileImageProps {
  photoURL: string | undefined;
}

const styles = StyleSheet.create({
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 60,
  },
});

export const ProfileImage = memo(({ photoURL }: ProfileImageProps) => {
  return (
    <Image
      source={{ uri: photoURL || "https://via.placeholder.com/120" }}
      style={styles.profileImage}
    />
  );
}); 