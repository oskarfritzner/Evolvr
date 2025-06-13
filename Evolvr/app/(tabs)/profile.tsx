import React, { useState, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import PostGrid from "@/components/posts/PostGrid";
import BadgesGrid from "@/components/BadgesGrid";
import { notificationService } from "@/backend/services/notificationService";
import CreatePost from "@/components/posts/create-post";
import { UserData } from "@/backend/types/UserData";
import { ProfileImage } from "@/components/profile/ProfileImage";
import { ProfileContent } from "@/components/profile/ProfileContent";
import { useNotificationCount } from "@/hooks/useNotificationCount";

// Define the colors type based on the theme context
type ThemeColors = ReturnType<typeof useTheme>["colors"];

interface ProfileHeaderProps {
  userData: UserData | undefined;
  unreadCount: number;
  onNotificationsPress: () => void;
  onFriendsPress: () => void;
  onSettingsPress: () => void;
}

interface ProfileTabsProps {
  activeTab: "posts" | "badges";
  onTabChange: (tab: "posts" | "badges") => void;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
    width: "100%",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  header: {
    width: "100%",
    paddingTop: Platform.OS === "ios" ? 16 : 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    padding: 12,
    borderRadius: 12,
  },
  profileSection: {
    position: "relative",
    alignItems: "center",
    marginBottom: 16,
  },
  profileImageContainer: {
    width: "100%",
    position: "relative",
    alignItems: "center",
    marginBottom: 16,
  },
  profileImageWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 60,
  },
  levelIndicator: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    left: 160,
  },
  levelLine: {
    width: 25,
    height: 2,
    marginRight: 8,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "column",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelNumber: {
    fontSize: 16,
    fontWeight: "800",
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 32,
  },
  tabsContainer: {
    flexDirection: "row",
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
    fontWeight: "600",
    textAlign: "center",
  },
  tabsWrapper: {
    width: "100%",
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  content: {
    flex: 1,
    width: "100%",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  maxWidthContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 800,
    alignSelf: "center",
  },
  responsiveContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
  },
});

// Memoized header component with proper comparison
const ProfileHeader = memo(
  ({
    userData,
    unreadCount,
    onNotificationsPress,
    onFriendsPress,
    onSettingsPress,
  }: ProfileHeaderProps) => {
    const { colors } = useTheme();

    return (
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.background + "40" },
              ]}
              onPress={onFriendsPress}
            >
              <FontAwesome5
                name="user-friends"
                size={20}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: colors.background + "40" },
              ]}
              onPress={onNotificationsPress}
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
              style={[
                styles.iconButton,
                { backgroundColor: colors.background + "40" },
              ]}
              onPress={onSettingsPress}
            >
              <FontAwesome5 name="cog" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImageWrapper}>
              <ProfileImage photoURL={userData?.photoURL} />
              <View style={styles.levelIndicator}>
                <View
                  style={[
                    styles.levelLine,
                    { backgroundColor: colors.textPrimary },
                  ]}
                />
                <View
                  style={[
                    styles.levelBadge,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Text
                    style={[styles.levelNumber, { color: colors.textPrimary }]}
                  >
                    {userData?.overall?.level || 1}
                  </Text>
                  <Text
                    style={[styles.levelLabel, { color: colors.textSecondary }]}
                  >
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
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.userData?.photoURL === nextProps.userData?.photoURL &&
      prevProps.userData?.username === nextProps.userData?.username &&
      prevProps.userData?.bio === nextProps.userData?.bio &&
      prevProps.userData?.overall?.level ===
        nextProps.userData?.overall?.level &&
      prevProps.unreadCount === nextProps.unreadCount
    );
  }
);

// Memoized tabs component
const ProfileTabs = memo(({ activeTab, onTabChange }: ProfileTabsProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === "posts" && {
            borderBottomWidth: 2,
            borderColor: colors.secondary,
          },
        ]}
        onPress={() => onTabChange("posts")}
      >
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === "posts"
                  ? colors.textPrimary
                  : colors.textSecondary,
            },
          ]}
        >
          Posts
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === "badges" && {
            borderBottomWidth: 2,
            borderColor: colors.secondary,
          },
        ]}
        onPress={() => onTabChange("badges")}
      >
        <Text
          style={[
            styles.tabText,
            {
              color:
                activeTab === "badges"
                  ? colors.textPrimary
                  : colors.textSecondary,
            },
          ]}
        >
          Badges
        </Text>
      </TouchableOpacity>
    </View>
  );
});

export default function Profile() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"posts" | "badges">("posts");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const { width } = useWindowDimensions();

  const unreadCount = useNotificationCount(user?.uid);
  const userData: UserData | undefined = user?.userData || undefined;

  const memoizedCallbacks = useMemo(
    () => ({
      handleNotificationsPress: () => router.push("/(modals)/notifications"),
      handleFriendsPress: () => router.push("/(modals)/friends"),
      handleSettingsPress: () => router.push("/(profile)/settings"),
      handleTabChange: (tab: "posts" | "badges") => setActiveTab(tab),
    }),
    [router]
  );

  const handleCreatePostClose = useCallback(() => setShowCreatePost(false), []);
  const handlePostCreated = useCallback(
    () => router.replace("/(tabs)/profile"),
    [router]
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.container}>
        <CreatePost
          visible={showCreatePost}
          onClose={handleCreatePostClose}
          onPostCreated={handlePostCreated}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[1]}
        >
          <View style={styles.maxWidthContainer}>
            <ProfileHeader
              userData={userData}
              unreadCount={unreadCount}
              onNotificationsPress={memoizedCallbacks.handleNotificationsPress}
              onFriendsPress={memoizedCallbacks.handleFriendsPress}
              onSettingsPress={memoizedCallbacks.handleSettingsPress}
            />

            <View
              style={[
                styles.tabsWrapper,
                {
                  backgroundColor: colors.background,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <ProfileTabs
                activeTab={activeTab}
                onTabChange={memoizedCallbacks.handleTabChange}
              />
            </View>

            <View style={styles.responsiveContainer}>
              <ProfileContent activeTab={activeTab} userId={user?.uid} />
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.secondary }]}
          onPress={() => setShowCreatePost(true)}
        >
          <FontAwesome5 name="plus" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
