import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Text, Button, Checkbox } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';

interface Friend {
  id: string;
  name: string;
  avatar?: string;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onShare: (friendIds: string[]) => void;
  friends: Friend[];
}

export default function FriendShareModal({ visible, onDismiss, onShare, friends }: Props) {
  const { colors } = useTheme();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  const handleShare = () => {
    onShare(selectedFriends);
    setSelectedFriends([]);
    onDismiss();
  };

  const renderFriendItem = (friend: Friend) => {
    const isSelected = selectedFriends.includes(friend.id);
    
    return (
      <TouchableOpacity
        key={friend.id}
        style={[
          styles.friendItem,
          { backgroundColor: isSelected ? colors.secondary + '20' : 'transparent' }
        ]}
        onPress={() => {
          setSelectedFriends(prev => 
            prev.includes(friend.id)
              ? prev.filter(id => id !== friend.id)
              : [...prev, friend.id]
          );
        }}
      >
        <View style={styles.friendInfo}>
          {friend.avatar ? (
            <Image 
              source={{ uri: friend.avatar }} 
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.secondary + '40' }]}>
              <FontAwesome5 
                name="user" 
                size={20} 
                color={colors.secondary}
              />
            </View>
          )}
          <Text 
            style={[styles.friendName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {friend.name}
          </Text>
        </View>
        <Checkbox.Android
          status={isSelected ? 'checked' : 'unchecked'}
          color={colors.secondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Share with Friends
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {selectedFriends.length} selected
              </Text>
            </View>
            <TouchableOpacity 
              onPress={onDismiss}
              style={[styles.closeButton, { backgroundColor: colors.background }]}
            >
              <FontAwesome5 name="times" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {friends.length > 0 ? (
            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {friends.map(renderFriendItem)}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome5 
                name="user-friends" 
                size={24} 
                color={colors.textSecondary}
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No friends to share with yet
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              onPress={onDismiss}
              style={styles.button}
              textColor={colors.textSecondary}
              buttonColor={colors.surface}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleShare}
              style={styles.button}
              textColor={colors.primary}
              buttonColor={colors.secondary}
              disabled={selectedFriends.length === 0}
            >
              Share
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    maxHeight: '70%',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  button: {
    minWidth: 100,
    borderRadius: 8,
  },
}); 