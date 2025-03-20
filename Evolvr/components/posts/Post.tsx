import React, { memo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image as RNImage, Alert, Modal, Animated, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/context/ThemeContext';
import { Post as PostType, Comment as CommentType } from '@/backend/types/Post';
import { FontAwesome5 } from '@expo/vector-icons';
import { router, useRouter } from 'expo-router';
import LikesModal from './LikesModal';
import { Friend } from '@/backend/types/Friend';
import { formatDistance } from 'date-fns';
import { postService } from '@/backend/services/postService';
import ConfirmationDialog from '../common/ConfirmationDialog';
import { BottomSheetModal, BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const blurhash =
  'L6PZfSi_.AyE_3t7t7R**0o#DgR4'; // Default blurhash for loading state

interface PostProps {
  post: PostType;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => Promise<void>;
  onImagePress?: (imageUrl: string) => void;
  currentUserId?: string;
  onPostDeleted?: () => void;
  onPrivacyChanged?: () => void;
  isCommentingDisabled?: boolean;
}

const Post = memo(({ post: initialPost, onLike, onComment, onImagePress, currentUserId, onPostDeleted, onPrivacyChanged, isCommentingDisabled = false }: PostProps) => {
  const { colors } = useTheme();
  const { width } = Dimensions.get('window');
  const insets = useSafeAreaInsets();
  const imageWidth = width - 32; // Full width minus padding
  const [imageHeight, setImageHeight] = useState(width * 0.75); // Default 4:3 ratio
  const [imageLoading, setImageLoading] = useState(true);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [post, setPost] = useState(initialPost);
  const [isDeleted, setIsDeleted] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const commentSheetRef = useRef<BottomSheetModal>(null);
  const router = useRouter();

  // Theme-dependent styles
  const themedStyles = {
    container: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden' as const,
    },
    header: {
      borderBottomColor: colors.border,
    },
    commentRow: {
      backgroundColor: colors.background,
      borderBottomColor: colors.border,
    },
  };

  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  useEffect(() => {
    if (post.imageURL) {
      RNImage.getSize(
        post.imageURL,
        (width: number, height: number) => {
          const aspectRatio = width / height;
          const calculatedHeight = imageWidth / aspectRatio;
          setImageHeight(Math.min(calculatedHeight, width)); // Cap height at screen width
        },
        (error: Error) => {
          console.error('Error getting image size:', error);
          setImageHeight(width * 0.75); // Fallback to 4:3 ratio
        }
      );
    }
  }, [post.imageURL, imageWidth]);

  // Create a simplified Friend object if likedByDetails is not available
  const getLikedByUsers = (): Friend[] => {
    if (post.likedByDetails && post.likedByDetails.length > 0) {
      return post.likedByDetails;
    }
    // If likedByDetails is not available, create a basic Friend object from likedBy
    return post.likedBy?.map(userId => ({
      userId,
      username: 'User',  // Default username
      displayName: 'User',  // Default display name
      photoURL: undefined  // No photo URL available
    })) || [];
  };

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

  const handleLikeButtonLongPress = () => {
    if (post.likedBy?.length > 0) {
      setShowLikesModal(true);
    }
  };

  const handleComment = () => {
    commentSheetRef.current?.present();
  };

  const handleSubmitComment = async () => {
    if (!post.id || !newComment.trim() || isSubmitting || isCommentingDisabled) return;
    
    setIsSubmitting(true);
    try {
      await onComment(post.id, newComment.trim());
      setNewComment('');
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikesPress = () => {
    if (post.likedBy?.length > 0) {
      setShowLikesModal(true);
    }
  };

  const isLiked = currentUserId && post.likedBy?.includes(currentUserId) || false;
  const likeCount = post.likedBy?.length || 0;
  const commentCount = post.comments?.length || 0;

  // Get last 8 comments
  const visibleComments = post.comments?.slice(-8) || [];

  // Add useEffect to log state changes
  useEffect(() => {
    console.log('Post state:', {
      likedBy: post.likedBy,
      likedByDetails: post.likedByDetails,
      showLikesModal,
      likeCount,
      likedByUsers: getLikedByUsers()
    });
  }, [post.likedBy, post.likedByDetails, showLikesModal, likeCount]);

  const isOwner = currentUserId === post.userId;

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

  const handlePrivacyChange = async (newPrivacy: "public" | "friends" | "private") => {
    if (!post.id || isUpdating) return;
    
    try {
      setIsUpdating(true);
      await postService.updatePostPrivacy(post.id, newPrivacy);
      
      // Update local state immediately
      setPost(prevPost => ({
        ...prevPost,
        privacy: newPrivacy
      }));
      
      setShowPrivacyModal(false);
      if (onPrivacyChanged) {
        onPrivacyChanged();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update post privacy. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post.id || isUpdating) return;
    
    try {
      setIsUpdating(true);
      await postService.deletePost(post.id);
      setShowDeleteConfirm(false);
      
      // Animate the post out
      setIsDeleted(true);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Call onPostDeleted after animation completes
        if (onPostDeleted) {
          onPostDeleted();
        }
      });
    } catch (error) {
      Alert.alert("Error", "Failed to delete post. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Add this near the header section of the post
  const renderOptionsMenu = () => {
    if (!isOwner) return null;

    return (
      <View style={styles.optionsContainer}>
        <View style={styles.optionsButtons}>
          <TouchableOpacity
            onPress={() => setShowPrivacyModal(true)}
            style={[styles.optionButton, { backgroundColor: colors.surface }]}
          >
            <FontAwesome5 
              name={getPrivacyIcon(post.privacy)} 
              size={16} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowDeleteConfirm(true)}
            style={[styles.optionButton, { backgroundColor: colors.surface }]}
          >
            <FontAwesome5 
              name="trash-alt" 
              size={16} 
              color={colors.error} 
            />
          </TouchableOpacity>
        </View>

        <Modal
          visible={showPrivacyModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPrivacyModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPrivacyModal(false)}
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
                    post.privacy === privacy && { backgroundColor: colors.background }
                  ]}
                  onPress={() => {
                    handlePrivacyChange(privacy as "public" | "friends" | "private");
                    setShowPrivacyModal(false);
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
                  {post.privacy === privacy && (
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
      </View>
    );
  };

  const handleUserPress = (userId: string) => {
    router.push(`/(profile)/${userId}`);
  };

  const renderComment = ({ item: comment }: { item: CommentType }) => (
    <TouchableOpacity
      style={[styles.commentRow, { backgroundColor: colors.background }]}
      onPress={() => handleUserPress(comment.userId)}
    >
      <Image
        source={{ uri: comment.userPhotoURL }}
        style={styles.commentAvatar}
        placeholder={blurhash}
      />
      <View style={styles.commentContent}>
        <Text style={[styles.commentUsername, { color: colors.textPrimary }]}>
          {comment.username}
        </Text>
        <Text style={[styles.commentText, { color: colors.textPrimary }]}>
          {comment.content}
        </Text>
        <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
          {formatDistance(comment.createdAt.toDate(), new Date(), { addSuffix: true })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderPostContent = () => (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => handleUserPress(post.userId)}
        >
          <Image
            source={{ uri: post.userPhotoURL || "https://via.placeholder.com/40" }}
            style={styles.avatar}
          />
          <Text style={[styles.username, { color: colors.textPrimary }]}>
            {post.username}
          </Text>
        </TouchableOpacity>
        {renderOptionsMenu()}
      </View>

      {post.imageURL && (
        <View style={[styles.imageContainer, { backgroundColor: colors.background }]}>
          <Image
            source={{ uri: post.imageURL }}
            style={[
              styles.previewImage,
              { opacity: imageLoading ? 0.7 : 1 }
            ]}
            placeholder={blurhash}
            transition={300}
            contentFit="cover"
            cachePolicy="memory-disk"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />
          {imageLoading && (
            <View style={[styles.imageLoadingContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>
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
          <View style={styles.actionGroup}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleLike}
              onLongPress={handleLikeButtonLongPress}
              delayLongPress={500}
            >
              <FontAwesome5 
                name="heart"
                solid={isLiked}
                size={20} 
                color={isLiked ? colors.error : colors.textSecondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleLikesPress}
              disabled={likeCount === 0}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[
                styles.actionText, 
                { 
                  color: colors.textSecondary,
                  opacity: likeCount === 0 ? 0.5 : 1 
                }
              ]}>
                {likeCount} {likeCount === 1 ? 'like' : 'likes'}
              </Text>
            </TouchableOpacity>
          </View>

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

  if (isDeleted) {
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.deletedContainer}>
            <Text style={[styles.deletedText, { color: colors.textSecondary }]}>
              Post deleted
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <>
      <View style={[styles.container, themedStyles.container]}>
        <View style={[styles.header, themedStyles.header]}>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => handleUserPress(post.userId)}
          >
            <Image
              source={{ uri: post.userPhotoURL || "https://via.placeholder.com/40" }}
              style={styles.avatar}
            />
            <Text style={[styles.username, { color: colors.textPrimary }]}>
              {post.username}
            </Text>
          </TouchableOpacity>
          {renderOptionsMenu()}
        </View>

        {post.imageURL && (
          <TouchableOpacity
            onPress={handleImagePress}
            activeOpacity={0.9}
            style={[styles.imageContainer, { backgroundColor: colors.background }]}
          >
            <Image
              source={{ uri: post.imageURL }}
              style={[
                styles.image,
                {
                  width: imageWidth,
                  height: imageHeight,
                  opacity: imageLoading ? 0.7 : 1,
                }
              ]}
              placeholder={blurhash}
              transition={300}
              contentFit="cover"
              cachePolicy="memory-disk"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
            />
            {imageLoading && (
              <View style={[styles.imageLoadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
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
            <View style={styles.actionGroup}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleLike}
                onLongPress={handleLikeButtonLongPress}
                delayLongPress={500}
              >
                <FontAwesome5 
                  name="heart"
                  solid={isLiked}
                  size={20} 
                  color={isLiked ? colors.error : colors.textSecondary} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleLikesPress}
                disabled={likeCount === 0}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[
                  styles.actionText, 
                  { 
                    color: colors.textSecondary,
                    opacity: likeCount === 0 ? 0.5 : 1 
                  }
                ]}>
                  {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                </Text>
              </TouchableOpacity>
            </View>

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

      <BottomSheetModal
        ref={commentSheetRef}
        snapPoints={['50%', '90%']}
        index={0}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        keyboardBehavior="extend"
        keyboardBlurBehavior="none"
        android_keyboardInputMode="adjustResize"
        enableDynamicSizing
      >
        <View style={[styles.commentSheet, { paddingBottom: insets.bottom }]}>
          <Text style={[styles.commentSheetTitle, { color: colors.textPrimary }]}>
            {post.title || 'Comments'}
          </Text>
          
          <BottomSheetFlatList
            data={post.comments || []}
            renderItem={renderComment}
            keyExtractor={(item, index) => `${item.userId}-${index}`}
            contentContainerStyle={styles.commentsList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderPostContent}
            ListEmptyComponent={
              <Text style={[styles.emptyComments, { color: colors.textSecondary }]}>
                No comments yet. Be the first to comment!
              </Text>
            }
          />

          <View style={[styles.commentInput, { backgroundColor: colors.background }]}>
            <BottomSheetTextInput
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { 
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: isCommentingDisabled ? 0.5 : 1
              }]}
              multiline
              maxLength={1000}
              editable={!isCommentingDisabled}
            />
            <TouchableOpacity
              style={[styles.sendButton, { 
                backgroundColor: colors.primary,
                opacity: !newComment.trim() || isSubmitting || isCommentingDisabled ? 0.5 : 1 
              }]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting || isCommentingDisabled}
            >
              <FontAwesome5 
                name="paper-plane" 
                size={16} 
                color={colors.labelPrimary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>

      <LikesModal
        visible={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        likedBy={getLikedByUsers()}
      />

      <ConfirmationDialog
        visible={showDeleteConfirm}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        onConfirm={handleDeletePost}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="Delete"
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  location: {
    fontSize: 13,
    marginTop: 2,
  },
  imageContainer: {
    width: '100%',
    marginVertical: 0,
    position: 'relative',
  },
  image: {
    width: '100%',
    borderRadius: 0,
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
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
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentsSection: {
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  commentsList: {
    paddingHorizontal: 16,
  },
  commentContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentContent: {
    flex: 1,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionsContainer: {
    position: 'relative',
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
  deletedContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  commentSheet: {
    flex: 1,
    padding: 16,
  },
  commentSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyComments: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
  postPreview: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 0,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export default Post; 