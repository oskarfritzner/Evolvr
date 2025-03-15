import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { Post as PostType } from '@/backend/types/Post';
import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';

const blurhash =
  'L6PZfSi_.AyE_3t7t7R**0o#DgR4'; // Default blurhash for loading state

interface PostProps {
  post: PostType;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onImagePress?: (imageUrl: string) => void;
  currentUserId?: string;
}

const Post = memo(({ post, onLike, onComment, onImagePress, currentUserId }: PostProps) => {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const imageWidth = Math.min(width - 32, 680 - 32); // Max width of 680px with 16px padding on each side

  const handleImagePress = () => {
    if (post.imageURL && onImagePress) {
      onImagePress(post.imageURL);
    }
  };

  const handleLike = () => {
    if (post.id) {
      onLike(post.id);
    }
  };

  const handleComment = () => {
    if (post.id) {
      onComment(post.id);
    }
  };

  const isLiked = currentUserId && post.likedBy?.includes(currentUserId) || false;
  const likeCount = post.likedBy?.length || 0;
  const commentCount = post.comments?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => router.push(`/(modals)/user-profile?id=${post.userId}`)}
      >
        <Image
          source={{ uri: post.userPhotoURL || undefined }}
          style={styles.avatar}
          placeholder={blurhash}
          transition={200}
          cachePolicy="memory-disk"
        />
        <View>
          <Text style={[styles.username, { color: colors.textPrimary }]}>
            {post.username}
          </Text>
          {post.location && (
            <Text style={[styles.location, { color: colors.textSecondary }]}>
              {post.location}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {post.imageURL && (
        <TouchableOpacity
          onPress={handleImagePress}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: post.imageURL }}
            style={[styles.image, { width: imageWidth }]}
            placeholder={blurhash}
            transition={300}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        {post.title && (
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {post.title}
          </Text>
        )}
        
        {post.content && (
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {post.content}
          </Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleLike}
          >
            <FontAwesome5 
              name="heart"
              solid={isLiked}
              size={20} 
              color={isLiked ? colors.error : colors.textSecondary} 
            />
            {likeCount > 0 && (
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                {likeCount}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleComment}
          >
            <FontAwesome5 
              name="comment" 
              size={20} 
              color={colors.textSecondary} 
            />
            {commentCount > 0 && (
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                {commentCount}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  location: {
    fontSize: 13,
    marginTop: 2,
  },
  image: {
    height: undefined,
    aspectRatio: 4/3,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default Post; 