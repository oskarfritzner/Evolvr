import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, TextInput, Modal, Alert, FlatList, ActivityIndicator } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Post } from "@/backend/types/Post";
import { postService } from "@/backend/services/postService";
import { FontAwesome, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { formatDistance } from "date-fns";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import CreatePost from "@/components/posts/create-post";
import ConfirmationDialog from "../common/ConfirmationDialog";
import { useQueryClient } from "@tanstack/react-query";
import PostComponent from "./Post";

interface PostGridProps {
  userId?: string;  // Optional, if not provided uses current user
  isFriend?: boolean; // Whether the viewer is friends with the profile owner
}

export default function PostGrid({ userId, isFriend }: PostGridProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [commentText, setCommentText] = useState("");
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
  }, [user?.uid, userId, isFriend]);

  useFocusEffect(
    React.useCallback(() => {
      loadPosts();
    }, [userId, user?.uid, isFriend])
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadPosts();
  }, []);

  const handleLike = async (postId: string) => {
    if (!user?.uid) return;
    try {
      await postService.toggleLike(postId, user.uid);
      loadPosts(); // Refresh posts to update likes
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleComment = async (postId: string, content: string) => {
    if (!user?.uid || !content.trim()) return;
    try {
      await postService.addComment(
        postId,
        user.uid,
        user.userData?.username || "User",
        user.userData?.photoURL,
        content.trim()
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

  const handlePrivacyChange = async (postId: string, newPrivacy: "public" | "friends" | "private") => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      await postService.updatePostPrivacy(postId, newPrivacy);
      
      // Update local state
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId ? { ...post, privacy: newPrivacy } : post
        )
      );
      
      setShowPrivacyModal(null);
    } catch (error) {
      Alert.alert("Error", "Failed to update post privacy. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      await postService.deletePost(postId);
      setShowDeleteConfirm(null);
      
      // Remove post from local state
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    } catch (error) {
      Alert.alert("Error", "Failed to delete post. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const getPrivacyIcon = (privacy: "public" | "friends" | "private") => {
    switch(privacy) {
      case "public":
        return "globe";
      case "friends":
        return "user-friends";
      case "private":
        return "lock";
    }
  };

  const getPrivacyLabel = (privacy: "public" | "friends" | "private") => {
    switch(privacy) {
      case "public":
        return "Everyone";
      case "friends":
        return "Friends";
      case "private":
        return "Only me";
    }
  };

  const renderOptionsMenu = (post: Post) => {
    const isOwnProfile = !userId || userId === user?.uid;
    if (!isOwnProfile) return null;

    return (
      <View style={styles.optionsContainer}>
        <View style={styles.optionsButtons}>
          <TouchableOpacity
            onPress={() => setShowPrivacyModal(post.id)}
            style={[styles.optionButton, { backgroundColor: colors.surface }]}
          >
            <FontAwesome5 
              name={getPrivacyIcon(post.privacy)} 
              size={16} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowDeleteConfirm(post.id)}
            style={[styles.optionButton, { backgroundColor: colors.surface }]}
          >
            <FontAwesome5 
              name="trash-alt" 
              size={16} 
              color={colors.error} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPost = ({ item: post }: { item: Post }) => (
    <PostComponent
      key={post.id}
      post={post}
      onLike={handleLike}
      onComment={(content) => handleComment(post.id, content)}
      currentUserId={user?.uid || ''}
      onPostDeleted={loadPosts}
      onPrivacyChanged={loadPosts}
    />
  );

  const renderEmptyComponent = () => {
    const isOwnProfile = !userId || userId === user?.uid;
    
    return (
      <View style={styles.centerContainer}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {isOwnProfile ? (
            "You haven't posted anything yet"
          ) : isFriend ? (
            "This user hasn't posted anything yet"
          ) : (
            "No public posts available"
          )}
        </Text>
        {isOwnProfile && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreatePost(true)}
          >
            <FontAwesome5 name="plus" size={16} color={colors.labelPrimary} />
            <Text style={[styles.createButtonText, { color: colors.labelPrimary }]}>
              Create your first post
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      paddingHorizontal: 0,
      paddingVertical: 8
    },
    contentContainer: {
      width: '100%',
      alignSelf: 'center',
    },
    centerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      minHeight: 200,
    },
    message: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 16,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
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
    optionsContainer: {
      position: 'relative',
      marginLeft: 'auto',
    },
    optionsButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    optionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    privacyModal: {
      width: '90%',
      maxWidth: 320,
      borderRadius: 12,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    privacyModalTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
      textAlign: 'center',
    },
    privacyOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 8,
      marginBottom: 8,
      gap: 12,
    },
    privacyOptionText: {
      fontSize: 16,
      flex: 1,
    },
    checkIcon: {
      marginLeft: 'auto',
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.message, { color: colors.textSecondary, marginTop: 16 }]}>
          Loading posts...
        </Text>
      </View>
    );
  }

  if (!user?.uid) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Please sign in to view posts
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(!userId || userId === user?.uid) && (
        <CreatePost 
          visible={showCreatePost}
          onClose={() => setShowCreatePost(false)}
          onPostCreated={loadPosts}
        />
      )}

      <View style={styles.contentContainer}>
        {posts.length === 0 ? (
          renderEmptyComponent()
        ) : (
          posts.map((post, index) => (
            <React.Fragment key={post.id}>
              {index > 0 && <View style={{ height: 16 }} />}
              {renderPost({ item: post })}
            </React.Fragment>
          ))
        )}
      </View>

      <Modal
        visible={!!showPrivacyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrivacyModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPrivacyModal(null)}
        >
          <View style={[styles.privacyModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.privacyModalTitle, { color: colors.textPrimary }]}>
              Post Privacy
            </Text>
            
            {["public", "friends", "private"].map((privacy) => (
              <TouchableOpacity
                key={privacy}
                style={[
                  styles.privacyOption,
                  posts.find(p => p.id === showPrivacyModal)?.privacy === privacy && 
                  { backgroundColor: colors.background }
                ]}
                onPress={() => {
                  if (showPrivacyModal) {
                    handlePrivacyChange(
                      showPrivacyModal,
                      privacy as "public" | "friends" | "private"
                    );
                  }
                }}
                disabled={isUpdating}
              >
                <FontAwesome5 
                  name={getPrivacyIcon(privacy as "public" | "friends" | "private")} 
                  size={16} 
                  color={colors.textPrimary} 
                />
                <Text style={[styles.privacyOptionText, { color: colors.textPrimary }]}>
                  {getPrivacyLabel(privacy as "public" | "friends" | "private")}
                </Text>
                {posts.find(p => p.id === showPrivacyModal)?.privacy === privacy && (
                  <FontAwesome5 
                    name="check" 
                    size={16} 
                    color={colors.primary} 
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ConfirmationDialog
        visible={!!showDeleteConfirm}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        onConfirm={() => showDeleteConfirm && handleDeletePost(showDeleteConfirm)}
        onCancel={() => setShowDeleteConfirm(null)}
        confirmText="Delete"
      />

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