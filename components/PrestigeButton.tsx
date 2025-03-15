import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { levelService } from '@/backend/services/levelService';
import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function PrestigeButton() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [canPrestige, setCanPrestige] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    checkPrestigeAvailability();
  }, [user?.uid]);

  const checkPrestigeAvailability = async () => {
    if (!user?.uid) return;
    const available = await levelService.canPrestige(user.uid);
    setCanPrestige(available);
  };

  const handlePrestige = async () => {
    if (!user?.uid || !canPrestige || isLoading) return;

    setIsLoading(true);
    try {
      const success = await levelService.handlePrestige(user.uid);
      if (success) {
        // Show success message or animation
      }
    } catch (error) {
      console.error('Error prestiging:', error);
    } finally {
      setIsLoading(false);
      checkPrestigeAvailability();
    }
  };

  if (!canPrestige) return null;

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: colors.secondary }]}
      onPress={handlePrestige}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.surface} />
      ) : (
        <>
          <MaterialCommunityIcons name="star-shooting" size={24} color={colors.surface} />
          <Text style={[styles.text, { color: colors.surface }]}>Prestige Available!</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 