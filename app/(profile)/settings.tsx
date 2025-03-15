import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { router, Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/backend/services/userService';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Settings() {
  const { colors, setTheme, theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  const themes = ['modern'] as const;

  const settingItems = [
    {
      title: 'Theme',
      icon: 'color-palette',
      onPress: toggleTheme,
      value: theme,
    },
    {
      title: 'Notifications',
      icon: 'notifications',
      onPress: () => console.log('Notifications pressed'),
    },
    {
      title: 'Privacy',
      icon: 'lock-closed',
      onPress: () => console.log('Privacy pressed'),
    },
    {
      title: 'Help & Support',
      icon: 'help-circle',
      onPress: () => console.log('Help pressed'),
    },
    {
      title: 'Delete Account',
      icon: 'trash',
      onPress: handleDeleteAccount,
      danger: true,
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

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) return;
              await userService.deleteAccount(user.uid);
              router.replace('/sign-in');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  }

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
              <TouchableOpacity 
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
              </TouchableOpacity>
            ),
          }}
        />

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          <View style={styles.contentContainer}>
            {/* Theme Selector */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Select Theme
              </Text>
              <View style={styles.themeButtons}>
                {themes.map((themeName) => (
                  <TouchableOpacity
                    key={themeName}
                    style={[
                      styles.themeButton,
                      { 
                        backgroundColor: theme === themeName ? colors.secondary : colors.surface,
                        borderColor: colors.border,
                      }
                    ]}
                    onPress={() => setTheme(themeName as any)}
                  >
                    <Text
                      style={[
                        styles.themeButtonText,
                        { color: theme === themeName ? colors.surface : colors.textPrimary },
                      ]}
                    >
                      {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              {settingItems.map((item, index) => (
                <React.Fragment key={item.title}>
                  <TouchableOpacity
                    style={[
                      styles.settingItem,
                      { borderBottomColor: index < settingItems.length - 1 ? colors.border : 'transparent' }
                    ]}
                    onPress={item.onPress}
                  >
                    <View style={styles.settingItemContent}>
                      <View style={styles.icon}>
                        <Ionicons
                          name={item.icon as any}
                          size={24}
                          color={item.danger ? colors.error : colors.textPrimary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.settingItemText,
                          {
                            color: item.danger ? colors.error : colors.textPrimary,
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
                  </TouchableOpacity>
                  {index < settingItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </View>
          </View>
        </ScrollView>
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
    marginTop: 46,
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
});
