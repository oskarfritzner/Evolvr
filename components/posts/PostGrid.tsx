import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, TextInput, Modal } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Post } from "@/backend/types/Post";
import { postService } from "@/backend/services/postService";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { formatDistance } from "date-fns";
import { useRouter } from "expo-router";
import CreatePost from "@/components/posts/create-post";

interface PostGridProps {
  userId?: string;  // Optional, if not provided uses current user
}

export default function PostGrid({ userId }: PostGridProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [commentText, setCommentText] = useState("");
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const loadPosts = async () => {
    const targetUserId = userId || user?.uid;
    if (!targetUserId) return;
    
    try {
      const userPosts = await postService.getUserPosts(targetUserId, user?.uid);
      setPosts(userPosts);
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handleLike = async (postId: string) => {
    if (!user?.uid) return;
    try {
      await postService.toggleLike(postId, user.uid);
      loadPosts(); // Refresh posts to update likes
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleComment = async (postId: string) => {
    if (!user?.uid || !commentText.trim()) return;
    try {
      await postService.addComment(
        postId,
        user.uid,
        user.userData?.username || "User",
        user.userData?.photoURL,
        commentText.trim()
      );
      setCommentText("");
      loadPosts(); // Refresh posts to show new comment
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => 
      prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]
    );
    setActiveCommentPost(postId);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Loading posts...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!userId && (
        <>
          <CreatePost 
            visible={showCreatePost}
            onClose={() => setShowCreatePost(false)}
            onPostCreated={() => {
              loadPosts(); // Refresh posts after creation
            }}
          />
        </>
      )}

      {posts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            No posts yet
          </Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {posts.map((post) => (
            <View 
              key={post.id}
              style={[styles.post, { backgroundColor: colors.surface }]}
            >
              <View style={styles.postHeader}>
                <Image 
                  source={{ uri: post.userPhotoURL || "https://via.placeholder.com/40" }}
                  style={styles.postAvatar}
                />
                <View>
                  <Text style={[styles.postUsername, { color: colors.textPrimary }]}>
                    {post.username}
                  </Text>
                  <Text style={[styles.postTime, { color: colors.textSecondary }]}>
                    {formatDistance(post.createdAt.toDate(), new Date())}
                  </Text>
                </View>
              </View>

              {post.title && (
                <Text style={[styles.postTitle, { color: colors.textPrimary }]}>
                  {post.title}
                </Text>
              )}

              {post.imageURL && (
                <TouchableOpacity onPress={() => setSelectedImage(post.imageURL || null)}>
                  <Image 
                    source={{ uri: post.imageURL }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}

              {post.description && (
                <Text style={[styles.postContent, { color: colors.textPrimary }]}>
                  {post.description}
                </Text>
              )}

              <View style={styles.postFooter}>
                <TouchableOpacity 
                  style={styles.likeButton}
                  onPress={() => post.id && handleLike(post.id)}
                >
                  <FontAwesome
                    name={post.likedBy?.includes(user?.uid || '') ? "heart" : "heart-o"}
                    size={20}
                    color={post.likedBy?.includes(user?.uid || '') ? colors.error : colors.textPrimary}
                  />
                  <Text style={[styles.likeCount, { color: colors.textPrimary }]}>
                    {post.likedBy?.length || 0}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.commentButton}
                  onPress={() => post.id && toggleComments(post.id)}
                >
                  <FontAwesome 
                    name="comment-o" 
                    size={20} 
                    color={colors.textPrimary} 
                  />
                  <Text style={[styles.commentCount, { color: colors.textPrimary }]}>
                    {post.comments?.length || 0}
                  </Text>
                </TouchableOpacity>
              </View>

              {expandedComments.includes(post.id || '') && (
                <View style={styles.commentsSection}>
                  {post.comments?.map((comment, index) => (
                    <View key={index} style={styles.commentItem}>
                      <Image
                        source={{ uri: comment.userPhotoURL || "https://via.placeholder.com/30" }}
                        style={styles.commentAvatar}
                      />
                      <View style={styles.commentContent}>
                        <Text style={[styles.commentUsername, { color: colors.textPrimary }]}>
                          {comment.username}
                        </Text>
                        <Text style={[styles.commentText, { color: colors.textPrimary }]}>
                          {comment.content}
                        </Text>
                        <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
                          {formatDistance(comment.createdAt.toDate(), new Date())}
                        </Text>
                      </View>
                    </View>
                  ))}

                  <View style={styles.commentInputContainer}>
                    <TextInput
                      value={commentText}
                      onChangeText={setCommentText}
                      placeholder="Add a comment..."
                      placeholderTextColor={colors.textSecondary}
                      style={[styles.commentInput, { 
                        backgroundColor: colors.background,
                        color: colors.textPrimary 
                      }]}
                    />
                    <TouchableOpacity
                      onPress={() => post.id && handleComment(post.id)}
                      style={[styles.sendButton, { backgroundColor: colors.secondary }]}
                      disabled={!commentText.trim()}
                    >
                      <FontAwesome name="send" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!selectedImage} transparent={true} onRequestClose={() => setSelectedImage(null)}>
        <TouchableOpacity 
          style={styles.modalView} 
          onPress={() => setSelectedImage(null)}
          activeOpacity={1}
        >
          <Image 
            source={{ uri: selectedImage || '' }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
  post: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  postUsername: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  postTime: {
    fontSize: 14,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 8,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  postFooter: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 16,
  },
  likeCount: {
    fontSize: 16,
  },
  commentCount: {
    fontSize: 16,
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontWeight: '600',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    marginTop: 2,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    marginTop: 12,
  },
  commentInput: {
    flex: 1,
    padding: 8,
    borderRadius: 20,
    fontSize: 14,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  modalView: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});