import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from "@/context/ThemeContext";
import { FontAwesome5 } from "@expo/vector-icons";
import Search from "@/components/community/search";
import FriendsFeed from '@/components/community/FriendsFeed';
import { useAuth } from "@/context/AuthContext";
import { useCommunityData } from "@/hooks/queries/useCommunityData";

type FeedType = "friends" | "all" | "search";

const Community: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [feedType, setFeedType] = useState<FeedType>("friends");
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { data: feedData, isLoading } = useCommunityData(user?.uid, feedType);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    contentWrapper: {
      flex: 1,
      maxWidth: 680,
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: isMobile ? 0 : 16,
    },
    header: {
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'stretch' : 'center',
      padding: isMobile ? 16 : 15,
      paddingTop: Platform.OS === 'ios' ? 8 : 16,
      backgroundColor: colors.primary,
      borderRadius: isMobile ? 0 : 10,
      marginBottom: 10,
      gap: isMobile ? 16 : 0,
      marginTop: 10,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.textPrimary,
      paddingHorizontal: isMobile ? 4 : 0,
    },
    feedToggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      padding: isMobile ? 0 : 8,
    },
    toggleButton: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.surface,
      opacity: 0.7,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: Platform.OS === 'ios' ? 1 : 0,
      borderColor: colors.border,
    },
    activeToggle: {
      opacity: 1,
      backgroundColor: colors.primary,
      borderColor: colors.secondary,
    },
    toggleText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "500",
    },
    feedContainer: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: isMobile ? 0 : 10,
      marginBottom: Platform.OS === 'ios' ? 0 : 15,
      overflow: 'hidden',
    },
    globalFeedText: {
      padding: 20,
      color: colors.textSecondary,
      textAlign: 'center',
    }
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.contentWrapper}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Community</Text>
            <View style={styles.feedToggle}>
              <TouchableOpacity 
                style={[
                  styles.toggleButton,
                  feedType === "friends" && styles.activeToggle
                ]}
                onPress={() => setFeedType("friends")}
              >
                <FontAwesome5 
                  name="user-friends" 
                  size={isMobile ? 16 : 14} 
                  color={colors.textPrimary} 
                />
                <Text style={styles.toggleText}>Friends</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.toggleButton,
                  feedType === "all" && styles.activeToggle
                ]}
                onPress={() => setFeedType("all")}
              >
                <FontAwesome5 
                  name="globe" 
                  size={isMobile ? 16 : 14} 
                  color={colors.textPrimary} 
                />
                <Text style={styles.toggleText}>Everyone</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.toggleButton,
                  feedType === "search" && styles.activeToggle
                ]}
                onPress={() => setFeedType("search")}
              >
                <FontAwesome5 
                  name="search" 
                  size={isMobile ? 16 : 14} 
                  color={colors.textPrimary} 
                />
                <Text style={styles.toggleText}>Find Users</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.feedContainer}>
            {feedType === "search" ? (
              <Search type="users" limit={20} />
            ) : feedType === "friends" ? (
              <FriendsFeed />
            ) : (
              <Text style={styles.globalFeedText}>
                Global feed coming soon...
              </Text>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Community;