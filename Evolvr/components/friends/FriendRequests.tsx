import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { FriendRequest, FriendData } from '@/backend/types/Friend';
import { friendService } from '@/backend/services/friendService';
import { useAuth } from '@/context/AuthContext';

interface FriendRequestsProps {
  requests: FriendRequest[];
  onAccept: () => void;
  onRefresh: () => void;
}

export default function FriendRequests({ requests, onAccept, onRefresh }: FriendRequestsProps) {
  const { user } = useAuth();

  const handleAccept = async (request: FriendRequest) => {
    if (!user) return;

    try {
      const senderData: FriendData = {
        userId: request.senderId,
        displayName: request.senderDisplayName,
        username: request.senderDisplayName,
        photoURL: request.senderPhotoURL,
      };

      const receiverData: FriendData = {
        userId: user.uid,
        displayName: user.userData?.username || 'Unknown',
        username: user.userData?.username || 'Unknown',
        photoURL: user.userData?.photoURL || undefined,
      };

      await friendService.acceptFriendRequest(request.id, senderData, receiverData);
      onAccept();
      onRefresh();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestItem}>
      <Text style={styles.requestName}>
        {item.senderDisplayName}
      </Text>
      <TouchableOpacity 
        style={styles.acceptButton}
        onPress={() => handleAccept(item)}
      >
        <Text style={styles.acceptButtonText}>Accept</Text>
      </TouchableOpacity>
    </View>
  );

  if (requests.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Friend Requests</Text>
      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '500',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
}); 