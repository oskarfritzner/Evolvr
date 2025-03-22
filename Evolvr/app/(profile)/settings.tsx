import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity as RNTouchableOpacity, TextInput, Modal, Animated, LayoutAnimation, GestureResponderEvent } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/backend/services/userService';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/backend/config/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import theme styles and themes from ThemeContext
const themeStyles = ['light', 'dark', 'system'] as const;
type Theme = typeof themeStyles[number];

const themes = {
  light: {},
  dark: {}
} as const;

export default function Settings() {
  const { colors, setTheme, theme, systemTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [themeAnimation] = useState(new Animated.Value(0));
  const insets = useSafeAreaInsets();

  const toggleThemeSelector = (forceClose = false) => {
    if (!forceClose && !showThemeSelector) {
      setShowThemeSelector(true);
    }
    
    Animated.spring(themeAnimation, {
      toValue: forceClose ? 0 : 1,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
      velocity: 8,
      restSpeedThreshold: 100,
      restDisplacementThreshold: 40,
    }).start(() => {
      if (forceClose) {
        setShowThemeSelector(false);
      }
    });
  };

  function getThemeIcon(themeName: Theme) {
    switch (themeName) {
      case 'light':
        return 'sunny';
      case 'dark':
        return 'moon';
      case 'system':
        return 'phone-portrait';
      default:
        return 'color-palette';
    }
  }

  async function handleDeleteConfirm() {
    if (!password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Password is required'
      });
      return;
    }

    setIsDeleting(true);
    try {
      console.log('Starting account deletion process');
      
      // Get current user
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        throw new Error('No user email found');
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        password
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Delete account
      console.log('Attempting to delete account for user:', user?.uid);
      if (user?.uid) {
        await userService.deleteAccount(user.uid);
        console.log('Account deleted successfully');
        await signOut();
        router.replace('/sign-in');
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.code === 'auth/wrong-password' 
          ? 'Incorrect password'
          : 'Failed to delete account. Please try again or contact support.'
      });
    } finally {
      setIsDeleting(false);
      setShowPasswordModal(false);
      setPassword('');
    }
  }

  function handleDeleteAccount() {
    console.log('Delete account button pressed');
    if (!user?.uid) {
      console.log('No user ID found');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'User not found'
      });
      return;
    }
    setShowConfirmModal(true);
  }

  const handleThemePress = () => {
    toggleThemeSelector();
  };

  const settingItems = [
    {
      title: 'Theme',
      icon: 'color-palette',
      onPress: handleThemePress,
      value: theme === 'system' 
        ? `System (${systemTheme.charAt(0).toUpperCase() + systemTheme.slice(1)})` 
        : theme.charAt(0).toUpperCase() + theme.slice(1),
    },
    {
      title: 'Edit Profile',
      icon: 'person',
      onPress: () => router.push('/(modals)/edit-profile'),
    },
    {
      title: 'Notifications',
      icon: 'notifications',
      onPress: () => setShowNotificationModal(true),
    },
    {
      title: 'Privacy',
      icon: 'lock-closed',
      onPress: () => router.push('/(modals)/privacy-policy'),
    },
    {
      title: 'Terms of Service',
      icon: 'document-text',
      onPress: () => {
        console.log('Navigating to terms of service...');
        router.push('/(modals)/terms-of-service');
      },
    },
    {
      title: 'Help & Support',
      icon: 'help-circle',
      onPress: () => setShowSupportModal(true),
    },
    {
      title: 'Delete Account',
      icon: 'trash',
      onPress: handleDeleteAccount,
      danger: true,
      disabled: isDeleting,
    },
    {
      title: 'Log Out',
      icon: 'log-out',
      onPress: () => {
        signOut();
        router.replace('/sign-in');
      },
      danger: true,
    },
  ];

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Settings',
            headerStyle: {
              backgroundColor: colors.surface,
            },
            headerTintColor: colors.textPrimary,
            headerLeft: () => (
              <RNTouchableOpacity 
                onPress={() => {
                  setTimeout(() => {
                    router.back();
                  }, 50);
                }}
                style={styles.closeButton}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={colors.textPrimary} 
                />
              </RNTouchableOpacity>
            ),
          }}
        />

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          <View style={styles.contentContainer}>
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              {settingItems.map((item, index) => (
                <View key={item.title}>
                  <RNTouchableOpacity
                    style={[
                      styles.settingItem,
                      { borderBottomColor: index < settingItems.length - 1 ? colors.border : 'transparent' }
                    ]}
                    onPress={item.onPress}
                    disabled={item.disabled}
                    activeOpacity={0.7}
                  >
                    <View style={styles.settingItemContent}>
                      <View style={styles.icon}>
                        {item.title === 'Delete Account' && isDeleting ? (
                          <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                          <Ionicons
                            name={item.icon as any}
                            size={24}
                            color={item.danger ? colors.error : colors.textPrimary}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.settingItemText,
                          {
                            color: item.danger ? colors.error : colors.textPrimary,
                            opacity: item.disabled ? 0.5 : 1,
                          },
                        ]}
                      >
                        {item.title}
                      </Text>
                    </View>
                    {item.value && (
                      <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                        {item.value}
                      </Text>
                    )}
                  </RNTouchableOpacity>
                  
                  {index < settingItems.length - 1 && <Divider />}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Notification Coming Soon Modal */}
        <Modal
          visible={showNotificationModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNotificationModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Coming Soon!
              </Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                Push notifications are coming soon to help you stay on track with your daily check-ins and tasks. Stay tuned for updates!
              </Text>
              <View style={styles.modalButtons}>
                <RNTouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.secondary }]}
                  onPress={() => setShowNotificationModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.surface }]}>
                    Got it
                  </Text>
                </RNTouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Support Modal */}
        <Modal
          visible={showSupportModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSupportModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Help & Support
              </Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                For support inquiries, please contact us at:
              </Text>
              <Text style={[styles.supportEmail, { color: colors.secondary }]}>
                oskar@fritzit.io
              </Text>
              <Text style={[styles.modalText, { color: colors.textSecondary, marginTop: 12 }]}>
                We typically respond within 24 hours during business days.
              </Text>
              <View style={styles.modalButtons}>
                <RNTouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.secondary }]}
                  onPress={() => setShowSupportModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.surface }]}>
                    Close
                  </Text>
                </RNTouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Confirmation Modal */}
        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Delete Account
              </Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                Are you sure you want to delete your account? This action cannot be undone.
              </Text>
              <View style={styles.modalButtons}>
                <RNTouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.surface }]}
                  onPress={() => setShowConfirmModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                    Cancel
                  </Text>
                </RNTouchableOpacity>
                <RNTouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.error }]}
                  onPress={() => {
                    setShowConfirmModal(false);
                    setShowPasswordModal(true);
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: colors.surface }]}>
                    Delete
                  </Text>
                </RNTouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Password Modal */}
        <Modal
          visible={showPasswordModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowPasswordModal(false);
            setPassword('');
          }}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Confirm Password
              </Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                Please enter your password to delete your account
              </Text>
              <TextInput
                style={[styles.passwordInput, { 
                  backgroundColor: colors.background,
                  color: colors.textPrimary,
                  borderColor: colors.border
                }]}
                placeholder="Enter password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <View style={styles.modalButtons}>
                <RNTouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.surface }]}
                  onPress={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                    Cancel
                  </Text>
                </RNTouchableOpacity>
                <RNTouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.error }]}
                  onPress={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: colors.surface }]}>
                      Delete
                    </Text>
                  )}
                </RNTouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Theme Selector Modal */}
        <Modal
          visible={showThemeSelector}
          transparent
          statusBarTranslucent
          animationType="none"
          onRequestClose={() => toggleThemeSelector(true)}
        >
          <RNTouchableOpacity 
            style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]} 
            activeOpacity={1}
            onPress={() => toggleThemeSelector(true)}
          >
            <Animated.View
              style={[
                styles.themeSelector,
                {
                  position: 'absolute',
                  bottom: insets.bottom,
                  left: 0,
                  right: 0,
                  backgroundColor: colors.surface,
                  opacity: themeAnimation,
                  transform: [{
                    translateY: themeAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [200, 0],
                    }),
                  }],
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: -2,
                  },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: 25,
                },
              ]}
            >
              <View style={styles.themeHeader}>
                <Text style={[styles.themeTitle, { color: colors.textPrimary, fontSize: 18, fontWeight: '600' }]}>
                  Select Theme
                </Text>
                <View style={styles.themeDivider} />
              </View>
              {themeStyles.map((themeName) => (
                <RNTouchableOpacity
                  key={themeName}
                  style={[
                    styles.themeOption,
                    { 
                      backgroundColor: theme === themeName ? colors.secondary + '15' : 'transparent',
                      borderRadius: 12,
                      margin: 8,
                      marginHorizontal: 16,
                    },
                  ]}
                  onPress={() => {
                    setTheme(themeName);
                    toggleThemeSelector(true);
                  }}
                >
                  <View style={styles.themeContent}>
                    <View style={[styles.themeIconContainer, { 
                      backgroundColor: theme === themeName ? colors.secondary + '20' : 'rgba(0,0,0,0.05)',
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                    }]}>
                      <Ionicons
                        name={getThemeIcon(themeName)}
                        size={22}
                        color={theme === themeName ? colors.secondary : colors.textPrimary}
                      />
                    </View>
                    <View style={styles.themeTextContainer}>
                      <Text
                        style={[
                          styles.themeTitle,
                          { color: theme === themeName ? colors.secondary : colors.textPrimary },
                        ]}
                      >
                        {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                      </Text>
                      {themeName === 'system' && (
                        <Text style={[styles.systemInfo, { color: colors.textSecondary }]}>
                          Currently using {systemTheme} mode
                        </Text>
                      )}
                    </View>
                  </View>
                  {theme === themeName && (
                    <Ionicons
                      name="checkmark"
                      size={22}
                      color={colors.secondary}
                      style={styles.checkmark}
                    />
                  )}
                </RNTouchableOpacity>
              ))}
              <View style={{ height: 16 }} />
            </Animated.View>
          </RNTouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
    marginTop: 66,
  },
  section: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    padding: 16,
    paddingBottom: 0,
  },
  closeButton: {
    marginLeft: 16,
    padding: 8,
    borderRadius: 20,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  themeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
  },
  themeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  settingItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 16,
    marginLeft: 8,
  },
  icon: {
    width: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  passwordInput: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeSelector: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    justifyContent: 'space-between',
  },
  themeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  themeTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  systemInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  checkmark: {
    marginLeft: 8,
  },
  supportEmail: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  themeHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  themeDivider: {
    position: 'absolute',
    top: 8,
    left: '50%',
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 2,
    transform: [{ translateX: -20 }],
  },
});
