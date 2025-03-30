import React from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Platform, Animated, FlatList } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useState } from "react";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import PostGrid from "@/components/posts/PostGrid";
import BadgesGrid from "@/components/BadgesGrid";
import { useProfileData } from "@/hooks/queries/useProfileData";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import ErrorMessage from "@/components/errorHandlingMessages/errorMessage";
import { useAuth } from "@/context/AuthContext";

export default function UserProfilePage() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'posts' | 'badges'>('posts');
  
  const { data: profileData, isLoading, error } = useProfileData(id);
  const isOwnProfile = user?.uid === id;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    centered: {
      justifyContent: "center",
      alignItems: "center",
    },
    header: {
      backgroundColor: colors.surface,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 40,
      left: 16,
      zIndex: 10,
      padding: 8,
    },
    profileSection: {
      alignItems: "center",
      paddingHorizontal: 20,
    },
    profileImageContainer: {
      width: '100%',
      position: 'relative',
      alignItems: 'center',
      marginBottom: 16,
    },
    profileImageWrapper: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
    },
    profileImage: {
      width: 150,
      height: 150,
      borderRadius: 60,
    },
    levelIndicator: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      left: 180,
    },
    levelLine: {
      width: 30,
      height: 2,
      backgroundColor: colors.textPrimary,
      marginRight: 8,
    },
    levelBadge: {
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      flexDirection: 'column',
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    levelNumber: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    levelLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    name: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    bio: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 16,
    },
    noPostsContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    noPostsText: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 12,
    },
    addFriendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 8,
    },
    addFriendText: {
      color: colors.labelPrimary,
      fontSize: 16,
      fontWeight: '500',
    },
    tabContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: Platform.OS === 'ios' ? 16 : 24,
      paddingHorizontal: 16,
      borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 0,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Platform.OS === 'ios' ? 12 : 14,
      borderBottomWidth: 2,
    },
    tabText: {
      fontSize: 15,
      fontWeight: '600',
    },
    contentContainer: {
      maxWidth: 680,
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: Platform.OS === 'ios' ? 8 : 16,
    }
  });

  const handleBack = () => {
    router.back();
  };

  const renderPostsContent = () => {
    if (isOwnProfile) {
      return <PostGrid userId={id} />;
    }

    if (!profileData?.isFriend) {
      return (
        <View style={styles.noPostsContainer}>
          <Text style={[styles.noPostsText, { color: colors.textSecondary }]}>
            Add {profileData?.userData?.username || 'this user'} as a friend to see their posts
          </Text>
          <TouchableOpacity 
            style={styles.addFriendButton}
            onPress={() => router.push('/friends')}
          >
            <FontAwesome5 name="user-plus" size={16} color={colors.labelPrimary} />
            <Text style={styles.addFriendText}>Add Friend</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return <PostGrid userId={id} isFriend={true} />;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <LoadingSpinner />
      </View>
    );
  }

  if (error || !profileData?.userData) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <ErrorMessage 
          message={error?.message || "Failed to load profile"} 
          fadeAnim={new Animated.Value(1)} 
        />
      </View>
    );
  }

  const { userData } = profileData;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 200,
        }}
      />
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={handleBack}
      >
        <Ionicons 
          name="arrow-back" 
          size={24} 
          color={colors.textPrimary} 
        />
      </TouchableOpacity>

      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => (
          <>
            <View style={styles.header}>
              <View style={styles.profileSection}>
                <View style={styles.profileImageContainer}>
                  <View style={styles.profileImageWrapper}>
                    <Image
                      source={{ uri: userData.photoURL || "https://via.placeholder.com/120" }}
                      style={styles.profileImage}
                    />
                    <View style={styles.levelIndicator}>
                      <View style={styles.levelLine} />
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelNumber}>
                          {userData.overall?.level || 1}
                        </Text>
                        <Text style={styles.levelLabel}>
                          LEVEL
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <Text style={styles.name}>{userData.username || "Anonymous"}</Text>
                <Text style={styles.bio}>{userData.bio || "No bio yet"}</Text>
              </View>
            </View>

            <View style={[styles.tabContainer, { maxWidth: 680, alignSelf: 'center', width: '100%' }]}>
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  { borderBottomColor: activeTab === 'posts' ? colors.secondary : 'transparent' }
                ]}
                onPress={() => setActiveTab('posts')}
              >
                <Text style={[styles.tabText, { color: colors.textPrimary }]}>Posts</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  { borderBottomColor: activeTab === 'badges' ? colors.secondary : 'transparent' }
                ]}
                onPress={() => setActiveTab('badges')}
              >
                <Text style={[styles.tabText, { color: colors.textPrimary }]}>Badges</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contentContainer}>
              {activeTab === 'posts' ? (
                renderPostsContent()
              ) : (
                <BadgesGrid userId={id} />
              )}
            </View>
          </>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
} 