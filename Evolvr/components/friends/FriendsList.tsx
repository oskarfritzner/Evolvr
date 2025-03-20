import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { friendService } from "@/backend/services/friendService";
import { FriendData } from "@/backend/types/Friend";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import FriendActions from "./FriendActions";

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=random';

interface FriendsListProps {
  friends: FriendData[];
}

export default function FriendsList({ friends }: FriendsListProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const renderFriend = ({ item }: { item: FriendData }) => (
    <TouchableOpacity
      style={[styles.friendItem, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/(profile)/${item.userId}`)}
    >
      <View style={styles.friendContent}>
        <Image
          source={{ 
            uri: item.photoURL || `${DEFAULT_AVATAR}&name=${encodeURIComponent(item.displayName)}` 
          }}
          style={styles.avatar}
        />
        <View style={styles.friendInfo}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>
            {item.displayName}
          </Text>
          <Text style={[styles.username, { color: colors.textSecondary }]}>
            @{item.username}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <FontAwesome5 name="fire" size={12} color={colors.secondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                Level {item.level || 1}
              </Text>
            </View>
            <View style={styles.statItem}>
              <FontAwesome5 name="medal" size={12} color={colors.secondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {item.badges?.length || 0} Badges
              </Text>
            </View>
          </View>
        </View>
        {item.userId && (
          <FriendActions
            friend={item}
            userId={item.userId}
            onActionComplete={() => {}}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Friends',
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={{ marginLeft: 16 }}
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
      
      {friends.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome5 name="user-friends" size={50} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No friends yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Connect with others to share your fitness journey!
          </Text>
          <TouchableOpacity
            style={[styles.findButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/community")}
          >
            <Text style={styles.findButtonText}>Find Friends</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  friendItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  friendContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  friendInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: "500",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.8,
  },
  findButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  findButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
}); 