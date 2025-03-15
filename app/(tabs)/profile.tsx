import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import PostGrid from "@/components/posts/PostGrid";
import BadgesGrid from "@/components/BadgesGrid";
import { notificationService } from "@/backend/services/notificationService";
import CreatePost from "@/components/posts/create-post";

export default function Profile() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'posts' | 'badges'>('posts');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const userData = user?.userData;
  const stats = userData?.stats || {
    currentStreak: 0,
    longestStreak: 0,
  };

  useEffect(() => {
    if (!user) return;
    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid,
      (notifications) => {
        const count = notifications.filter(n => 
          !n.read && 
          (!('responded' in n) || !n.responded)
        ).length;
        setUnreadCount(count);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    header: {
      padding: 20,
      paddingTop: Platform.OS === 'ios' ? 10 : 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      borderBottomWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconButton: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
    profileSection: {
      position: 'relative',
      alignItems: 'center',
      marginBottom: 16,
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
      left: 160,
    },
    levelLine: {
      width: 25,
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
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
    },
    bio: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 20,
      paddingHorizontal: 32,
    },
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginTop: 20,
      marginBottom: 10,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      marginHorizontal: 4,
    },
    tabText: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    badge: {
      position: 'absolute',
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: '#fff',
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '600',
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        showsVerticalScrollIndicator={false}
      >
        <CreatePost 
          visible={showCreatePost}
          onClose={() => setShowCreatePost(false)}
          onPostCreated={() => {
            // Optionally refresh posts if needed
          }}
        />

        {/* Header Section */}
        <View style={[styles.header, { backgroundColor: colors.primary, borderBottomColor: colors.border }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.background + '40' }]}
                onPress={() => {
                  setTimeout(() => {
                    router.push("/(modals)/friends");
                  }, 300);
                }}
              >
                <FontAwesome5 name="user-friends" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.background + '40' }]}
                onPress={() => router.push("/(modals)/notifications")}
              >
                <FontAwesome5 name="bell" size={20} color={colors.textPrimary} />
                {unreadCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.error }]}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.background + '40' }]}
                onPress={() => router.push("/settings")}
              >
                <FontAwesome5 name="cog" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImageWrapper}>
                <Image
                  source={{ uri: userData?.photoURL || "https://via.placeholder.com/120" }}
                  style={styles.profileImage}
                />
                <View style={styles.levelIndicator}>
                  <View style={styles.levelLine} />
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelNumber}>
                      {userData?.overall?.level || 1}
                    </Text>
                    <Text style={styles.levelLabel}>
                      LEVEL
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <Text style={[styles.name, { color: colors.textPrimary }]}>
            {userData?.username || "User"}
          </Text>
          <Text style={[styles.bio, { color: colors.textSecondary }]}>
            {userData?.bio || "No bio yet"}
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'posts' && { borderBottomWidth: 2, borderColor: colors.secondary }
            ]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'posts' ? colors.textPrimary : colors.textSecondary }
            ]}>
              Posts
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              activeTab === 'badges' && { borderBottomWidth: 2, borderColor: colors.secondary }
            ]}
            onPress={() => setActiveTab('badges')}
          >
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'badges' ? colors.textPrimary : colors.textSecondary }
            ]}>
              Badges
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'posts' ? (
            <PostGrid />
          ) : (
            user?.uid ? <BadgesGrid userId={user.uid} /> : null
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.secondary }]}
        onPress={() => setShowCreatePost(true)}
      >
        <FontAwesome5 name="plus" size={20} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}