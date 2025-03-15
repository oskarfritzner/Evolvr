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
  startAt,
  endAt,
} from "firebase/firestore";
import AddFriendBtn from "../friends/addFriendBtn";
import { useAuth } from "@/context/AuthContext";
import { Post } from "@/backend/types/Post";
import { useTheme } from "@/context/ThemeContext";
import { FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import { UserData } from "@/backend/types/UserData";

type SearchType = "users" | "posts" | "tags" | "challenges" | "routines" | "habits";

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

  const searchFields: Record<SearchType, string[]> = {
    users: ["username", "bio"],
    posts: ["title", "description", "hashtags"],
    tags: ["name"],
    challenges: ["title", "description"],
    routines: ["title", "description"],
    habits: ["title", "description"],
  };

  useEffect(() => {
    console.log("Search effect triggered:", {
      searchQuery,
      type
    });
    
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
      console.log("Searching for term:", searchTerm);

      if (type === "users") {
        // Get all users and filter client-side for now
        const allUsersQuery = query(
          collection(db, "users"),
          limit(20)
        );
        
        const allUsersSnapshot = await getDocs(allUsersQuery);
        console.log("All users in database:", allUsersSnapshot.docs.map(doc => ({
          id: doc.id,
          username: doc.data().username,
          usernameLower: doc.data().usernameLower,
          displayName: doc.data().displayName,
          email: doc.data().email
        })));

        // Filter users client-side
        const newResults = allUsersSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
            } as unknown as UserData;
          })
          .filter(user => {
            if (!user?.username) return false;
            const username = user.username.toLowerCase();
            const displayName = (user.displayName || "").toLowerCase();
            const email = (user.email || "").toLowerCase();
            
            console.log("Checking user:", {
              username,
              displayName,
              email,
              searchTerm,
              matches: {
                username: username.includes(searchTerm),
                displayName: displayName.includes(searchTerm),
                email: email.includes(searchTerm)
              }
            });
            
            return username.includes(searchTerm) || 
                   displayName.includes(searchTerm) ||
                   email.includes(searchTerm);
          });

        console.log("Filtered results:", newResults);

        setResults(newResults);
        setHasMore(false); // Disable pagination for client-side filtering
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
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter(item => {
            const fields = searchFields[type];
            return fields.some(field => 
              String(item[field as keyof typeof item])?.toLowerCase().includes(searchTerm)
            );
          });

        setResults(loadMore ? [...results, ...newResults] : newResults);
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
        setHasMore(querySnapshot.docs.length === resultLimit);
      }
    } catch (error) {
      console.error("Search error details:", {
        error,
        searchTerm: searchQuery,
        type,
        resultLimit
      });
      setError("An error occurred while searching. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    switch (type) {
      case "users":
        return (
          <TouchableOpacity 
            style={[styles.userItem, { backgroundColor: colors.surface }]}
            onPress={() => router.push(`/(modals)/user-profile?id=${item.id}`)}
          >
            <View style={styles.userInfo}>
              <Image 
                source={{ uri: item.photoURL || "https://via.placeholder.com/40" }}
                style={styles.userAvatar}
              />
              <View style={styles.userTextInfo}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>
                  {item.username || item.displayName || "Anonymous"}
                </Text>
                {item.bio && (
                  <Text 
                    style={[styles.userBio, { color: colors.textSecondary }]} 
                    numberOfLines={2}
                  >
                    {item.bio}
                  </Text>
                )}
              </View>
            </View>
            {user && item.id !== user.uid && (
              <AddFriendBtn
                targetUserId={item.id}
                targetUserDisplayName={item.username || item.displayName || "Anonymous"}
                targetUserPhotoURL={item.photoURL}
                variant="small"
              />
            )}
          </TouchableOpacity>
        );

      case "posts":
        return (
          <View style={[styles.postItem, { backgroundColor: colors.surface }]}>
            <View style={styles.postHeader}>
              <Image 
                source={{ uri: item.userPhotoURL || "https://via.placeholder.com/40" }}
                style={styles.postAvatar}
              />
              <Text style={[styles.postUsername, { color: colors.textPrimary }]}>
                {item.username}
              </Text>
            </View>

            {item.title && (
              <Text style={[styles.postTitle, { color: colors.textPrimary }]}>
                {item.title}
              </Text>
            )}

            {item.imageURL && (
              <Image 
                source={{ uri: item.imageURL }}
                style={styles.postImage}
                resizeMode="cover"
              />
            )}

            {item.description && (
              <Text 
                style={[styles.postDescription, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}

            {item.hashtags.length > 0 && (
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
            )}
          </View>
        );

      default:
        return (
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.description && (
              <Text numberOfLines={2} style={styles.itemDescription}>
                {item.description}
              </Text>
            )}
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
    { backgroundColor: colors.surface },
    searchQuery.length > 0 && styles.searchContainerActive
  ];

  return (
    <View style={styles.container}>
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
            <FontAwesome5 name="times-circle" size={16} color={colors.labelSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && results.length === 0 && (
        <ActivityIndicator style={styles.loader} color="#0000ff" />
      )}

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}

      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onEndReached={() => handleSearch(true)}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          searchQuery.length >= 2 && !loading ? (
            <Text style={styles.noResults}>No results found</Text>
          ) : null
        }
        ListFooterComponent={
          loading && results.length > 0 ? (
            <ActivityIndicator style={styles.loader} color="#0000ff" />
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
    flexDirection: 'row',
    alignItems: 'center',
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
    color: 'red',
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 8,
  },
  postDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  hashtag: {
    fontSize: 14,
    fontWeight: '500',
  },
});
