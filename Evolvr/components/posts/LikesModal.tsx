import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Image, SafeAreaView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Friend } from '@/backend/types/Friend';

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?background=random';

interface LikesModalProps {
  visible: boolean;
  onClose: () => void;
  likedBy: Friend[];
}

export default function LikesModal({ visible, onClose, likedBy }: LikesModalProps) {
  const { colors } = useTheme();

  const handleUserPress = (userId: string) => {
    onClose();
    router.push(`/(modals)/user-profile?id=${userId}`);
  };

  const renderUser = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={[styles.userRow, { backgroundColor: colors.surface }]}
      onPress={() => handleUserPress(item.userId)}
    >
      <Image
        source={{ 
          uri: item.photoURL || `${DEFAULT_AVATAR}&name=${encodeURIComponent(item.displayName)}` 
        }}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={[styles.displayName, { color: colors.textPrimary }]}>
          {item.displayName}
        </Text>
        <Text style={[styles.username, { color: colors.textSecondary }]}>
          @{item.username}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {likedBy.length} {likedBy.length === 1 ? 'Like' : 'Likes'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <FlatList
          data={likedBy}
          renderItem={renderUser}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={[
            styles.listContent,
            likedBy.length === 0 && styles.emptyListContent
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="heart-outline" 
                size={48} 
                color={colors.textSecondary} 
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No likes yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Be the first to like this post
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  listContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
}); 