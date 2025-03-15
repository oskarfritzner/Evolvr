import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Post from '@/components/posts/Post';
import { Post as PostType } from '@/backend/types/Post';
import { friendService } from '@/backend/services/friendService';
import { postService } from '@/backend/services/postService';
import SkeletonPlaceholder from '@/components/common/SkeletonPlaceholder';
import { useInfiniteQuery } from '@tanstack/react-query';
import logger from '@/utils/logger';
import { Timestamp } from 'firebase/firestore';

const POSTS_PER_PAGE = 10;

const FriendsFeed = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['friendsFeed', user?.uid],
    queryFn: async ({ pageParam = null }: { pageParam: Timestamp | null }) => {
      if (!user?.uid) {
        logger.warn('FriendsFeed: No user ID available');
        throw new Error('Please sign in to view posts');
      }
      
      try {
        // Get friends list if first page
        let friendIds: string[] = [];
        if (!pageParam) {
          const friends = await friendService.getFriendsList(user.uid);
          friendIds = friends.map(friend => friend.userId);
          logger.info(`FriendsFeed: Found ${friendIds.length} friends`);
        }

        // Always include the current user's ID to avoid empty array
        const userIds = [...new Set([...friendIds, user.uid])];
        logger.info(`FriendsFeed: Querying posts for users:`, userIds);

        // Get posts from friends and user
        const posts = await postService.getFeedPosts({
          userIds,
          limit: POSTS_PER_PAGE,
          cursor: pageParam,
          currentUserId: user.uid,
        });

        logger.info(`FriendsFeed: Loaded ${posts.length} posts`);

        return {
          posts,
          nextCursor: posts.length === POSTS_PER_PAGE ? posts[posts.length - 1].createdAt : null
        };
      } catch (err) {
        logger.error('FriendsFeed: Error loading posts:', err);
        throw err;
      }
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!user?.uid,
  });

  const handleLike = async (postId: string) => {
    if (!user?.uid) return;
    try {
      await postService.toggleLike(postId, user.uid);
      refetch(); // Refresh feed after like
    } catch (error) {
      logger.error('FriendsFeed: Error liking post:', error);
    }
  };

  const handleComment = (postId: string) => {
    // Navigate to comments view
  };

  const renderPost = ({ item }: { item: PostType }) => (
    <Post
      post={item}
      onLike={handleLike}
      onComment={handleComment}
      onImagePress={setSelectedImage}
      currentUserId={user?.uid}
    />
  );

  const renderFooter = () => {
    if (!hasNextPage) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  };

  if (isLoading) {
    logger.info('FriendsFeed: Loading skeleton');
    return <FeedSkeleton />;
  }

  if (isError) {
    logger.error('FriendsFeed: Render error:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error instanceof Error ? error.message : 'Error loading feed'}
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allPosts = data?.pages.flatMap(page => page.posts) ?? [];

  if (allPosts.length === 0) {
    logger.info('FriendsFeed: No posts found');
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No posts from friends yet. Add some friends to see their posts!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={allPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </View>
  );
};

const FeedSkeleton = () => (
  <View style={styles.container}>
    {[...Array(3)].map((_, i) => (
      <SkeletonPlaceholder key={i} style={styles.skeletonPost}>
        <View style={styles.skeletonHeader} />
        <View style={styles.skeletonBody} />
      </SkeletonPlaceholder>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
  },
  skeletonPost: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  skeletonHeader: {
    height: 40,
    borderRadius: 20,
    marginBottom: 12,
  },
  skeletonBody: {
    height: 200,
    borderRadius: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default FriendsFeed; 