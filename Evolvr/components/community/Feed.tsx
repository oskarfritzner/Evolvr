import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Post from '@/components/posts/Post';
import { Post as PostType } from '@/backend/types/Post';
import { friendService } from '@/backend/services/friendService';
import { postService } from '@/backend/services/postService';

const FriendsFeed = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const loadFriendsPosts = async () => {
    if (!user) return;
    
    try {
      // Get friends list
      const friends = await friendService.getFriendsList(user.uid);
      const friendIds = friends.map(friend => friend.userId);
      
      // Get posts from all friends and the user
      const allPosts: PostType[] = [];
      
      // Add user's own posts
      const userPosts = await postService.getUserPosts(user.uid);
      allPosts.push(...userPosts);
      
      // Add friends' posts
      for (const friendId of friendIds) {
        const friendPosts = await postService.getUserPosts(friendId);
        // Only include public and friends posts from friends
        const visiblePosts = friendPosts.filter(post => 
          post.privacy === 'public' || post.privacy === 'friends'
        );
        allPosts.push(...visiblePosts);
      }

      // Sort posts by creation date, newest first
      const sortedPosts = allPosts.sort((a, b) => 
        b.createdAt.toMillis() - a.createdAt.toMillis()
      );

      setPosts(sortedPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriendsPosts();
  }, [user]);

  const handleLike = async (postId: string) => {
    if (!user?.uid) return;
    try {
      await postService.toggleLike(postId, user.uid);
      loadFriendsPosts(); // Refresh posts to update likes
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleComment = async (postId: string, content: string) => {
    if (!user?.uid) return;
    try {
      await postService.addComment(
        postId,
        user.uid,
        user.userData?.username || 'User',
        user.userData?.photoURL,
        content
      );
      loadFriendsPosts(); // Refresh posts to show new comment
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingText: {
      color: colors.textSecondary,
      textAlign: 'center',
      padding: 20,
    },
    errorText: {
      color: colors.error,
      textAlign: 'center',
      padding: 20,
    },
    emptyText: {
      color: colors.textSecondary,
      textAlign: 'center',
      padding: 20,
    }
  });

  if (loading) {
    return <Text style={styles.loadingText}>Loading posts...</Text>;
  }

  if (posts.length === 0) {
    return (
      <Text style={styles.emptyText}>
        No posts from friends yet. Add some friends to see their posts!
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id || ''}
        renderItem={({ item }) => (
          <Post
            post={item}
            onLike={handleLike}
            onComment={handleComment}
            onImagePress={setSelectedImage}
            currentUserId={user?.uid}
          />
        )}
      />
    </View>
  );
};

export default FriendsFeed; 