import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { db } from "@/backend/config/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import AddFriendBtn from "../friends/addFriendBtn";
import { useAuth } from "@/context/AuthContext";
import { Post } from "@/backend/types/Post";
import { useTheme } from "@/context/ThemeContext";
import { FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import { UserData } from "@/backend/types/UserData";
import { friendService } from "@/backend/services/friendService";
import { Friend } from "@/backend/types/Friend";
import { useFocusEffect } from "@react-navigation/native";
import { Timestamp } from "firebase/firestore";

type SearchType =
  | "users"
  | "posts"
  | "tags"
  | "challenges"
  | "routines"
  | "habits";

interface SearchProps {
  type: SearchType;
  limit?: number;
}

export default function Search({ type, limit: resultLimit = 10 }: SearchProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const searchFields: Record<SearchType, string[]> = {
    users: ["username", "bio"],
    posts: ["title", "description", "hashtags"],
    tags: ["name"],
    challenges: ["title", "description"],
    routines: ["title", "description"],
    habits: ["title", "description"],
  };

  const refreshSearch = React.useCallback(() => {
    if (searchQuery) {
      handleSearch();
    }
  }, [searchQuery]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshSearch();
    }, [refreshSearch])
  );

  useEffect(() => {
    if (searchQuery) {
      handleSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery, type]);

  const handleSearch = async (loadMore = false) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    if (loading || (loadMore && !hasMore)) return;

    setLoading(true);
    setError(null);
    try {
      const searchTerm = searchQuery.toLowerCase();

      if (type === "users") {
        // Create a query using only usernameLower since we have an index for it
        const usersQuery = query(
          collection(db, "users"),
          where("usernameLower", ">=", searchTerm),
          where("usernameLower", "<=", searchTerm + "\uf8ff"),
          orderBy("usernameLower"),
          limit(resultLimit)
        );

        const usersSnapshot = await getDocs(usersQuery);

        const newResults = usersSnapshot.docs.map((doc) => {
          const data = doc.data();
          // Ensure all required fields are present with defaults
          return {
            id: doc.id,
            userId: doc.id,
            username: data.username || "",
            email: data.email || "",
            photoURL: data.photoURL || "",
            displayName: data.displayName || data.username || "",
            usernameLower: (data.username || "").toLowerCase(),
            displayNameLower: (
              data.displayName ||
              data.username ||
              ""
            ).toLowerCase(),
            onboardingComplete: data.onboardingComplete || false,
            categories: data.categories || {},
            activeTasks: data.activeTasks || [],
            userGeneratedTasks: data.userGeneratedTasks || [],
            Challenges: data.Challenges || [],
            completedTasks: data.completedTasks || [],
            overall: data.overall || { level: 1, xp: 0, prestige: 0 },
            stats: data.stats || {
              totalTasksCompleted: 0,
              currentStreak: 0,
              longestStreak: 0,
              routinesCompleted: 0,
              habitsCompleted: [],
              challengesCompleted: [],
              totalChallengesJoined: 0,
              badgesEarned: [],
              todayXP: 0,
              todayCompletedTasks: [],
              lastXPReset: Timestamp.now(),
              routineStreaks: {},
              habitStreaks: {},
            },
            progress: data.progress || [],
            challenges: data.challenges || [],
            subscription: data.subscription || {
              type: "FREE",
              startDate: Timestamp.now(),
              status: "active",
              autoRenew: false,
            },
            habits: data.habits || {},
            posts: data.posts || [],
            ...data,
          } as UserData;
        });

        setResults(newResults);
        setHasMore(usersSnapshot.docs.length === resultLimit);
        setLastDoc(usersSnapshot.docs[usersSnapshot.docs.length - 1]);
      } else if (type === "posts") {
        // For posts, we need to handle privacy
        const queries = [
          // Public posts
          query(
            collection(db, "posts"),
            where("privacy", "==", "public"),
            orderBy("createdAt", "desc"),
            limit(resultLimit)
          ),
        ];

        // If user is authenticated, add their private posts and friends-only posts
        if (user?.uid) {
          // Add user's own posts
          queries.push(
            query(
              collection(db, "posts"),
              where("userId", "==", user.uid),
              orderBy("createdAt", "desc"),
              limit(resultLimit)
            )
          );

          // Get user's friends
          const friends = await friendService.getFriendsList(user.uid);
          if (friends.length > 0) {
            // Add friends' posts that are either public or friends-only
            queries.push(
              query(
                collection(db, "posts"),
                where(
                  "userId",
                  "in",
                  friends.map((friend: Friend) => friend.userId)
                ),
                where("privacy", "in", ["public", "friends"]),
                orderBy("createdAt", "desc"),
                limit(resultLimit)
              )
            );
          }
        }

        // Execute all queries
        const snapshots = await Promise.all(queries.map((q) => getDocs(q)));

        // Combine and filter results
        const allPosts = snapshots.flatMap((snapshot) =>
          snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              } as Post)
          )
        );

        // Remove duplicates and filter by search term
        const uniquePosts = Array.from(
          new Map(allPosts.map((post) => [post.id, post])).values()
        ).filter((post: Post) => {
          const title = (post.title || "").toLowerCase();
          const description = (post.description || "").toLowerCase();
          const hashtags = (post.hashtags || []).join(" ").toLowerCase();

          return (
            title.includes(searchTerm) ||
            description.includes(searchTerm) ||
            hashtags.includes(searchTerm)
          );
        });

        // Sort by date and limit results
        const sortedPosts = uniquePosts
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
          .slice(0, resultLimit);

        setResults(sortedPosts);
        setHasMore(false);
      } else {
        // For other types, use createdAt index
        let baseQuery = query(
          collection(db, type),
          orderBy("createdAt", "desc"),
          limit(resultLimit)
        );

        if (loadMore && lastDoc) {
          baseQuery = query(baseQuery, startAfter(lastDoc));
        }

        const querySnapshot = await getDocs(baseQuery);
        const newResults = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((item) => {
            const fields = searchFields[type];
            return fields.some((field) =>
              String(item[field as keyof typeof item])
                ?.toLowerCase()
                .includes(searchTerm)
            );
          });

        setResults(loadMore ? [...results, ...newResults] : newResults);
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
        setHasMore(querySnapshot.docs.length === resultLimit);
      }
    } catch (error: any) {
      console.error("Search error:", error);
      if (error.code === "permission-denied") {
        setError(
          "You don't have permission to perform this search. Please check your authentication status."
        );
      } else {
        setError("Failed to perform search. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    switch (type) {
      case "users":
        return (
          <TouchableOpacity
            style={[
              styles.userItem,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
            onPress={() => router.push(`/(profile)/${item.id}`)}
          >
            <View style={styles.userInfo}>
              <Image
                source={{
                  uri: item.photoURL || "https://via.placeholder.com/40",
                }}
                style={styles.userAvatar}
              />
              <View style={styles.userTextInfo}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>
                  {item.username || item.displayName || "Anonymous"}
                </Text>
                {item.bio ? (
                  <Text
                    style={[styles.userBio, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.bio}
                  </Text>
                ) : null}
              </View>
            </View>
            {user && item.id !== user.uid ? (
              <AddFriendBtn
                targetUserId={item.id}
                targetUserDisplayName={
                  item.username || item.displayName || "Anonymous"
                }
                targetUserPhotoURL={item.photoURL}
                variant="small"
              />
            ) : null}
          </TouchableOpacity>
        );

      case "posts":
        return (
          <View
            style={[
              styles.postItem,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <View style={styles.postHeader}>
              <Image
                source={{
                  uri: item.userPhotoURL || "https://via.placeholder.com/40",
                }}
                style={styles.postAvatar}
              />
              <Text
                style={[styles.postUsername, { color: colors.textPrimary }]}
              >
                {item.username}
              </Text>
            </View>

            {item.title ? (
              <Text style={[styles.postTitle, { color: colors.textPrimary }]}>
                {item.title}
              </Text>
            ) : null}

            {item.imageURL ? (
              <Image
                source={{ uri: item.imageURL }}
                style={styles.postImage}
                resizeMode="cover"
              />
            ) : null}

            {item.description ? (
              <Text
                style={[styles.postDescription, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            ) : null}

            <View
              style={[
                styles.postFooter,
                {
                  borderTopColor: colors.border,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  marginTop: 12,
                  paddingTop: 12,
                },
              ]}
            >
              <View style={styles.actionGroup}>
                <TouchableOpacity style={styles.actionButton}>
                  <FontAwesome5
                    name="heart"
                    solid={item.likedBy?.includes(user?.uid || "")}
                    size={20}
                    color={
                      item.likedBy?.includes(user?.uid || "")
                        ? colors.error
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[styles.actionText, { color: colors.textSecondary }]}
                  >
                    {item.likedBy?.length || 0}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.actionButton}>
                <FontAwesome5
                  name="comment"
                  size={20}
                  color={colors.textSecondary}
                />
                {item.comments?.length > 0 ? (
                  <Text
                    style={[styles.actionText, { color: colors.textSecondary }]}
                  >
                    {item.comments.length}
                  </Text>
                ) : null}
              </TouchableOpacity>
            </View>

            {item.hashtags?.length > 0 ? (
              <View style={styles.hashtagContainer}>
                {item.hashtags.map((tag: string, index: number) => (
                  <Text
                    key={index}
                    style={[styles.hashtag, { color: colors.secondary }]}
                  >
                    {tag}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        );

      default:
        return (
          <TouchableOpacity
            style={[
              styles.item,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
              {item.title}
            </Text>
            {item.description ? (
              <Text
                numberOfLines={2}
                style={[
                  styles.itemDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {item.description}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setResults([]);
  };

  // Update the search input UI
  const searchContainerStyle = [
    styles.searchContainer,
    { backgroundColor: colors.surfaceContainerLow, borderColor: colors.border },
    searchQuery.length > 0 && styles.searchContainerActive,
  ];

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setLastDoc(null); // Reset pagination
    handleSearch().finally(() => {
      setRefreshing(false);
    });
  }, [searchQuery, type]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={searchContainerStyle}>
        <FontAwesome5
          name="search"
          size={16}
          color={colors.labelSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder={`Search ${type}...`}
          placeholderTextColor={colors.labelSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <FontAwesome5
              name="times-circle"
              size={16}
              color={colors.labelSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && results.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator style={styles.loader} color={colors.secondary} />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onEndReached={() => handleSearch(true)}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          { backgroundColor: colors.background },
        ]}
        style={{ backgroundColor: colors.background }}
        ListEmptyComponent={
          searchQuery.length >= 2 && !loading ? (
            <View style={styles.noResultsContainer}>
              <Text style={[styles.noResults, { color: colors.textSecondary }]}>
                No results found
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading && results.length > 0 ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator
                style={styles.loader}
                color={colors.secondary}
              />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  searchContainerActive: {
    borderColor: "#ddd",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  item: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userTextInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: "#666",
  },
  noResults: {
    textAlign: "center",
    marginTop: 20,
    color: "#666",
  },
  loader: {
    marginVertical: 20,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  postItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginVertical: 8,
  },
  postDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  postFooter: {
    flexDirection: "row",
    gap: 16,
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  hashtagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  hashtag: {
    fontSize: 14,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  loaderContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  noResultsContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
