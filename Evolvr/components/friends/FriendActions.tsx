import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { friendService } from '@/backend/services/friendService';
import { useTheme } from '@/context/ThemeContext';
import { FriendData } from '@/backend/types/Friend';
import CustomAlert from '../common/CustomAlert';

interface FriendActionsProps {
  friend: FriendData;
  userId: string;
  onActionComplete: () => void;
}

export default function FriendActions({ friend, userId, onActionComplete }: FriendActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const { colors } = useTheme();

  const handleRemoveFriend = () => {
    console.log("Remove friend button clicked", { friend, userId });
    setShowAlert(true);
  };

  const handleBlockUser = () => {
    Alert.alert(
      "Block User",
      `Are you sure you want to block ${friend.displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await friendService.blockUser(userId, friend.userId);
              onActionComplete();
              setShowMenu(false);
            } catch (error) {
              console.error("Error blocking user:", error);
              Alert.alert("Error", "Failed to block user. Please try again.");
            }
          }
        }
      ]
    );
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => {
          console.log("Menu button clicked");
          setShowMenu(!showMenu);
        }}
        style={styles.menuButton}
      >
        <FontAwesome5 name="ellipsis-v" size={16} color={colors.textPrimary} />
      </TouchableOpacity>

      {showMenu && (
        <View style={[styles.menu, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleRemoveFriend}
          >
            <FontAwesome5 name="user-minus" size={16} color={colors.error} />
            <Text style={[styles.menuText, { color: colors.labelSecondary }]}>
              Remove Friend
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleBlockUser}
          >
            <FontAwesome5 name="ban" size={16} color={colors.error} />
            <Text style={[styles.menuText, { color: colors.labelSecondary }]}>
              Block User
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <CustomAlert
        visible={showAlert}
        title="Remove Friend"
        message={`Are you sure you want to remove ${friend.displayName} from your friends?`}
        buttons={[
          {
            text: "Cancel",
            onPress: () => setShowAlert(false),
            style: "cancel"
          },
          {
            text: "Remove",
            onPress: async () => {
              try {
                await friendService.removeFriend(userId, friend.userId);
                onActionComplete();
                setShowMenu(false);
              } catch (error) {
                console.error("Error removing friend:", error);
              }
            },
            style: "destructive"
          }
        ]}
        onDismiss={() => setShowAlert(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    padding: 8,
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: 40,
    width: 160,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
  },
}); 