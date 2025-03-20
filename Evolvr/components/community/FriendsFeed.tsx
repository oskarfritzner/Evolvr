import React, { useState, useCallback, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  InteractionManager
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Post from '@/components/posts/Post';
import { Post as PostType } from '@/backend/types/Post';
import { friendService } from '@/backend/services/friendService';
import { postService } from '@/backend/services/postService';
import SkeletonPlaceholder from '@/components/common/SkeletonPlaceholder';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import logger from '@/utils/logger';
import { Timestamp } from 'firebase/firestore';
import { InfiniteData } from '@tanstack/react-query';

const POSTS_PER_PAGE = 10;

// Memoized Post component wrapper
const MemoizedPost = React.memo(({ 
  post, 
  onLike, 
  onComment, 
  currentUserId,
  onPostDeleted,
  onPostUpdated,
  isCommentingDisabled
}: { 
  post: PostType;
  onLike: (postId: string) => Promise<void>;
  onComment: (postId: string, content: string) => Promise<void>;
  currentUserId: string;
  onPostDeleted: (postId: string) => void;
  onPostUpdated: () => void;
  isCommentingDisabled: boolean;
}) => (
  <Post
    post={post}
    onLike={onLike}
    onComment={onComment}
    currentUserId={currentUserId}
    onPostDeleted={() => onPostDeleted(post.id)}
    onPrivacyChanged={onPostUpdated}
    isCommentingDisabled={isCommentingDisabled}
  />
));

const FriendsFeed = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

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
        }

        // Always include the current user's ID
        const userIds = [...new Set([...friendIds, user.uid])];

        const posts = await postService.getFeedPosts({
          userIds,
          limit: POSTS_PER_PAGE,
          cursor: pageParam,
          currentUserId: user.uid,
        });

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

  // Optimistic update helper
  const updatePostInCache = useCallback((postId: string, updater: (post: PostType) => PostType) => {
    queryClient.setQueryData<InfiniteData<{ posts: PostType[]; nextCursor: Timestamp | null }>>(
      ['friendsFeed', user?.uid],
      (oldData) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map(page => ({
            ...page,
            posts: page.posts.map(post => 
              post.id === postId ? updater(post) : post
            )
          }))
        };
      }
    );
  }, [queryClient, user?.uid]);

  const handleLike = useCallback(async (postId: string) => {
    if (!user?.uid || isUpdating) return;
    
    try {
      setIsUpdating(true);
      
      // Optimistic update
      const post = data?.pages.flatMap(p => p.posts).find(p => p.id === postId);
      if (post) {
        const isLiked = post.likedBy.includes(user.uid);
        const updatedLikedBy = isLiked 
          ? post.likedBy.filter(id => id !== user.uid)
          : [...post.likedBy, user.uid];
          
        updatePostInCache(postId, (post) => ({
          ...post,
          likedBy: updatedLikedBy,
          likes: isLiked ? post.likes - 1 : post.likes + 1
        }));
      }

      await postService.toggleLike(postId, user.uid);
    } catch (error) {
      logger.error('FriendsFeed: Error liking post:', error);
      // Revert optimistic update on error
      refetch();
    } finally {
      setIsUpdating(false);
    }
  }, [user?.uid, data, updatePostInCache, refetch, isUpdating]);

  const handleComment = useCallback(async (postId: string, content: string) => {
    if (!user?.uid || !content.trim() || isUpdating) return;
    
    try {
      setIsUpdating(true);
      setActiveCommentPostId(postId);

      const newComment = {
        userId: user.uid,
        username: user.userData?.username || 'User',
        userPhotoURL: user.userData?.photoURL,
        content: content.trim(),
        createdAt: Timestamp.now()
      };

      // Optimistic update
      updatePostInCache(postId, (post) => ({
        ...post,
        comments: [...(post.comments || []), newComment]
      }));

      await postService.addComment(
        postId,
        user.uid,
        user.userData?.username || 'User',
        user.userData?.photoURL,
        content.trim()
      );

      // Clear keyboard and active post after successful comment
      Keyboard.dismiss();
      
      // Use InteractionManager to ensure smooth animation
      InteractionManager.runAfterInteractions(() => {
        setActiveCommentPostId(null);
      });

    } catch (error) {
      logger.error('FriendsFeed: Error adding comment:', error);
      // Revert optimistic update on error
      refetch();
    } finally {
      setIsUpdating(false);
    }
  }, [user?.uid, queryClient, isUpdating, updatePostInCache]);

  const handlePostDeleted = useCallback((deletedPostId: string) => {
    queryClient.setQueryData<InfiniteData<{ posts: PostType[]; nextCursor: Timestamp | null }>>(
      ['friendsFeed', user?.uid],
      (oldData) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map(page => ({
            ...page,
            posts: page.posts.filter(post => post.id !== deletedPostId)
          }))
        };
      }
    );
  }, [queryClient, user?.uid]);

  const renderPost = useCallback(({ item: post }: { item: PostType }) => (
    <MemoizedPost
      key={post.id}
      post={post}
      onLike={handleLike}
      onComment={handleComment}
      currentUserId={user?.uid || ''}
      onPostDeleted={handlePostDeleted}
      onPostUpdated={refetch}
      isCommentingDisabled={isUpdating && activeCommentPostId !== post.id}
    />
  ), [handleLike, handleComment, user?.uid, handlePostDeleted, refetch, isUpdating, activeCommentPostId]);

  const keyExtractor = useCallback((item: PostType) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!hasNextPage) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }, [hasNextPage, colors.secondary]);

  const handleScroll = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    Keyboard.dismiss();
    setActiveCommentPostId(null);
  }, []);

  if (isLoading) {
    return <FeedSkeleton />;
  }

  if (isError) {
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
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No posts from friends yet. Add some friends to see their posts!
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={allPosts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={true}
        initialNumToRender={3}
        updateCellsBatchingPeriod={50}
        onRefresh={refetch}
        refreshing={isLoading}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 0,
        }}
        onScrollBeginDrag={handleScroll}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
      />
    </KeyboardAvoidingView>
  );
};

const FeedSkeleton = React.memo(() => (
  <View style={styles.container}>
    {[...Array(3)].map((_, i) => (
      <SkeletonPlaceholder key={i} style={styles.skeletonPost}>
        <View style={styles.skeletonHeader} />
        <View style={styles.skeletonBody} />
      </SkeletonPlaceholder>
    ))}
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
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