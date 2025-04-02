import React, { useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Modal, SafeAreaView, Animated, TextInput, ScrollView, ActionSheetIOS } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { postService } from '@/backend/services/postService';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { useQueryClient } from '@tanstack/react-query';
import { Post } from '@/backend/types/Post';
import { Timestamp } from 'firebase/firestore';
import Toast from 'react-native-toast-message';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

// Add privacy type
type Privacy = 'public' | 'friends' | 'private';

// Add a helper function to check if we're on web
const isWeb = Platform.OS === 'web';

// Memoized header component
const Header = memo(({ 
  onClose, 
  onSubmit, 
  isDisabled, 
  isLoading, 
  colors 
}: { 
  onClose: () => void;
  onSubmit: () => void;
  isDisabled: boolean;
  isLoading: boolean;
  colors: any;
}) => (
  <View style={[styles.header, { 
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  }]}>
    <TouchableOpacity 
      style={styles.closeButton} 
      onPress={onClose}
    >
      <Ionicons name="close" size={24} color={colors.textPrimary} />
    </TouchableOpacity>
    
    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
      Create Post
    </Text>

    <TouchableOpacity 
      onPress={onSubmit}
      disabled={isDisabled || isLoading}
      style={[styles.submitButton, {
        backgroundColor: isDisabled ? colors.border : colors.primary,
        opacity: isLoading ? 0.7 : 1,
      }]}
    >
      <Text style={[styles.submitButtonText, { color: colors.labelPrimary }]}>
        {isLoading ? 'Posting...' : 'Post'}
      </Text>
    </TouchableOpacity>
  </View>
));

// Memoized privacy selector component
const PrivacySelector = memo(({ 
  privacy, 
  onPrivacyChange,
  colors 
}: {
  privacy: Privacy;
  onPrivacyChange: (privacy: Privacy) => void;
  colors: any;
}) => {
  const getPrivacyIcon = () => {
    switch(privacy) {
      case 'public': return 'globe';
      case 'friends': return 'user-friends';
      case 'private': return 'lock';
      default: return 'globe';
    }
  };

  const getPrivacyLabel = () => {
    switch(privacy) {
      case 'public': return 'Everyone';
      case 'friends': return 'Friends';
      case 'private': return 'Only me';
      default: return 'Everyone';
    }
  };

  return (
    <TouchableOpacity
      onPress={() => {
        const options: Privacy[] = ['public', 'friends', 'private'];
        const currentIndex = options.indexOf(privacy);
        const nextIndex = (currentIndex + 1) % options.length;
        onPrivacyChange(options[nextIndex]);
      }}
      style={[styles.privacySelector, { backgroundColor: colors.background }]}
    >
      <FontAwesome5 
        name={getPrivacyIcon()} 
        size={14} 
        color={colors.textSecondary}
      />
      <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
        {getPrivacyLabel()}
      </Text>
      <FontAwesome5 
        name="chevron-down" 
        size={10} 
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );
});

const CreatePost: React.FC<Props> = ({ visible, onClose, onPostCreated }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized handlers
  const handlePrivacyChange = useCallback((newPrivacy: Privacy) => {
    setPrivacy(newPrivacy);
  }, []);

  const handleImagePick = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission needed',
          text2: 'Please allow access to your photo library'
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to pick image'
      });
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission needed',
          text2: 'Please allow access to your camera'
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to take photo'
      });
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user?.uid || !title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let imageBlob;
      if (image) {
        const response = await fetch(image);
        imageBlob = await response.blob();
        
        if (imageBlob.size > 5 * 1024 * 1024) {
          throw new Error('Image size too large. Please choose an image under 5MB.');
        }
      }

      await postService.createPost(
        user.uid,
        user.userData?.username || "User",
        user.userData?.photoURL,
        title.trim(),
        description.trim(),
        imageBlob,
        privacy
      );

      // Clear form
      setTitle("");
      setDescription("");
      setImage(null);
      setPrivacy("public");

      Toast.show({
        type: "success",
        text1: "Post created successfully",
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["communityFeed"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      onClose();
      onPostCreated?.();
    } catch (error) {
      console.error("Error creating post:", error);
      setError(error instanceof Error ? error.message : "Failed to create post");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error instanceof Error ? error.message : "Failed to create post"
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, title, description, image, privacy, isSubmitting, onClose, onPostCreated, queryClient]);

  const showImageOptions = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleTakePhoto();
          } else if (buttonIndex === 2) {
            handleImagePick();
          }
        }
      );
    } else if (isWeb) {
      handleImagePick();
    } else {
      setShowOptionsModal(true);
    }
  }, [handleTakePhoto, handleImagePick]);

  const isDisabled = !title && !description && !image;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <SafeAreaView style={styles.modalContainer}>
            <Header 
              onClose={onClose}
              onSubmit={handleSubmit}
              isDisabled={isDisabled}
              isLoading={isSubmitting}
              colors={colors}
            />

            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
              >
                {/* User Info */}
                <View style={[styles.userInfo, { backgroundColor: colors.surface }]}>
                  <ExpoImage
                    source={{ uri: user?.userData?.photoURL || undefined }}
                    style={styles.userAvatar}
                    placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.userDetails}>
                    <View style={styles.userHeader}>
                      <Text style={[styles.userName, { color: colors.textPrimary }]}>
                        {user?.userData?.username || 'User'}
                      </Text>
                      <PrivacySelector 
                        privacy={privacy}
                        onPrivacyChange={handlePrivacyChange}
                        colors={colors}
                      />
                    </View>
                  </View>
                </View>

                {/* Input Fields */}
                <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                  <TextInput
                    style={[styles.titleInput, { 
                      color: colors.textPrimary,
                      backgroundColor: colors.background,
                    }]}
                    placeholder="Add a title..."
                    placeholderTextColor={colors.textSecondary}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                  />
                  
                  <TextInput
                    style={[styles.descriptionInput, { 
                      color: colors.textPrimary,
                      backgroundColor: colors.background,
                    }]}
                    placeholder="What's on your mind?"
                    placeholderTextColor={colors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    maxLength={2000}
                  />
                </View>

                {/* Image Section */}
                {image ? (
                  <View style={[styles.imagePreviewContainer, { backgroundColor: colors.surface }]}>
                    <Image source={{ uri: image }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={[styles.removeImage, { backgroundColor: colors.surface }]}
                      onPress={() => setImage(null)}
                    >
                      <MaterialIcons name="close" size={24} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.addImageButton, { 
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    }]}
                    onPress={showImageOptions}
                  >
                    <MaterialIcons 
                      name="add-photo-alternate" 
                      size={32} 
                      color={colors.textPrimary} 
                    />
                    <Text style={[styles.addImageText, { color: colors.textPrimary }]}>
                      {isWeb ? 'Choose Photo' : 'Add Photo'}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </KeyboardAvoidingView>

            {/* Image Options Modal */}
            {!isWeb && (
              <Modal
                visible={showOptionsModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowOptionsModal(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowOptionsModal(false)}
                >
                  <View style={[styles.optionsContainer, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity
                      style={[styles.optionButton, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setShowOptionsModal(false);
                        handleTakePhoto();
                      }}
                    >
                      <MaterialIcons name="camera-alt" size={24} color={colors.primary} />
                      <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                        Take Photo
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.optionButton}
                      onPress={() => {
                        setShowOptionsModal(false);
                        handleImagePick();
                      }}
                    >
                      <MaterialIcons name="photo-library" size={24} color={colors.primary} />
                      <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                        Choose from Library
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>
            )}
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  privacyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    gap: 12,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    padding: 16,
    borderRadius: 12,
  },
  descriptionInput: {
    fontSize: 16,
    minHeight: 120,
    padding: 16,
    borderRadius: 12,
    textAlignVertical: 'top',
  },
  imagePreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeImage: {
    position: 'absolute',
    right: 24,
    top: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addImageButton: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default memo(CreatePost); 