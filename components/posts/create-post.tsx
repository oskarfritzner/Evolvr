import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Modal, SafeAreaView, Animated, TextInput, ScrollView, ActionSheetIOS } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { postService } from '@/backend/services/postService';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Camera from 'expo-image-picker';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

// Add privacy type
type Privacy = 'public' | 'friends' | 'private';

// Add a helper function to check if we're on web
const isWeb = Platform.OS === 'web';

const CreatePost: React.FC<Props> = ({ visible, onClose, onPostCreated }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const getPrivacyIcon = () => {
    switch(privacy) {
      case 'public':
        return 'globe';
      case 'friends':
        return 'user-friends';
      case 'private':
        return 'lock';
      default:
        return 'globe';
    }
  };

  const getPrivacyLabel = () => {
    switch(privacy) {
      case 'public':
        return 'Everyone';
      case 'friends':
        return 'Friends';
      case 'private':
        return 'Only me';
      default:
        return 'Everyone';
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions to make this work!');
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            takePhoto();
          } else if (buttonIndex === 2) {
            pickImage();
          }
        }
      );
    } else if (isWeb) {
      // On web, just open file picker directly
      pickImage();
    } else {
      // For Android, show modal
      setShowOptionsModal(true);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!user?.uid || (!title && !description && !image)) return;
    
    setLoading(true);
    try {
      let imageBlob;
      if (image) {
        const response = await fetch(image);
        imageBlob = await response.blob();
      }

      await postService.createPost(
        user.uid,
        user.userData?.username || 'User',
        user.userData?.photoURL,
        title,
        description,
        imageBlob,
        privacy
      );

      if (onPostCreated) {
        onPostCreated();
      }
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  const renderImageSection = () => {
    if (image) {
      return (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: image }} style={styles.image} />
          <TouchableOpacity
            style={[styles.removeImage, { backgroundColor: colors.surface }]}
            onPress={() => setImage(null)}
          >
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View>
        <TouchableOpacity
          style={[styles.addImageButton, { borderColor: colors.border }]}
          onPress={showImageOptions}
        >
          <MaterialIcons name="add-photo-alternate" size={32} color={colors.textSecondary} />
          <Text style={[styles.addImageText, { color: colors.textSecondary }]}>
            {isWeb ? 'Choose Photo' : 'Add Photo'}
          </Text>
        </TouchableOpacity>

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
                    takePhoto();
                  }}
                >
                  <MaterialIcons name="camera-alt" size={24} color={colors.textPrimary} />
                  <Text style={[styles.optionText, { color: colors.textPrimary }]}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => {
                    setShowOptionsModal(false);
                    pickImage();
                  }}
                >
                  <MaterialIcons name="photo-library" size={24} color={colors.textPrimary} />
                  <Text style={[styles.optionText, { color: colors.textPrimary }]}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={onClose}
              >
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={colors.textPrimary} 
                />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Create Post</Text>
              <TouchableOpacity 
                onPress={handleSubmit}
                disabled={loading || (!title && !description && !image)}
                style={[styles.submitButton, {
                  backgroundColor: (!title && !description && !image) ? colors.surface : colors.secondary,
                }]}
              >
                <Text style={[styles.submitButtonText, { 
                  color: (!title && !description && !image) ? colors.textSecondary : colors.textSecondary
                }]}>
                  {loading ? 'Posting...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
              >
                <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
                    Share Your Progress, Your Way
                  </Text>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Your journey is yours to shape! Stay motivated and inspire others by posting workout snapshots,
                    daily wins, or personal goals.
                  </Text>
                  <Animated.View style={{
                    maxHeight: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 200],
                    }),
                    opacity: animation,
                    overflow: 'hidden',
                  }}>
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                      Choose who sees your posts—share with everyone to motivate and connect,
                      limit to friends for a supportive circle, or keep it private as a personal progress log.
                      Every step counts—celebrate it! 🚀
                    </Text>
                  </Animated.View>
                  <TouchableOpacity onPress={toggleExpand} style={styles.expandButton}>
                    <FontAwesome5 
                      name={expanded ? "chevron-up" : "chevron-down"} 
                      size={12} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    const options: Privacy[] = ['public', 'friends', 'private'];
                    const currentIndex = options.indexOf(privacy);
                    const nextIndex = (currentIndex + 1) % options.length;
                    setPrivacy(options[nextIndex]);
                  }}
                  style={[styles.privacySelector, { backgroundColor: colors.surface }]}
                >
                  <FontAwesome5 
                    name={getPrivacyIcon()} 
                    size={16} 
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                    {getPrivacyLabel()}
                  </Text>
                  <FontAwesome5 
                    name="chevron-down" 
                    size={12} 
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                  <View style={[styles.inputWrapper, { 
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.primary 
                  }]}>
                    <TextInput
                      style={[styles.titleInput, { color: colors.textPrimary }]}
                      placeholder="Title"
                      placeholderTextColor={colors.labelSecondary}
                      value={title}
                      onChangeText={setTitle}
                    />
                  </View>
                  
                  <View style={[styles.inputWrapper, { 
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.primary 
                  }]}>
                    <TextInput
                      style={[styles.descriptionInput, { color: colors.textPrimary }]}
                      placeholder="What's on your mind?"
                      placeholderTextColor={colors.labelSecondary}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                    />
                  </View>
                </View>

                {renderImageSection()}
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
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
  inputContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  descriptionInput: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    flex: 1,
  },
  imagePreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImage: {
    position: 'absolute',
    right: 12,
    top: 12,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 8,
  },
  privacyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  expandButton: {
    alignItems: 'center',
    paddingTop: 8,
  },
  imageOptionsContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  imageOptionText: {
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

export default CreatePost; 