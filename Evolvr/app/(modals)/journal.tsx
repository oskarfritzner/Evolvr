import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Button } from 'react-native-paper';
import { useTheme } from '@/context/ThemeContext';
import { JournalType } from '@/backend/types/JournalEntry';
import ReflectionEditor from '@/components/journal/ReflectionEditor';
import GratitudeEditor from '@/components/journal/GratitudeEditor';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

export default function JournalPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const { initialType } = useLocalSearchParams<{ initialType?: JournalType }>();
  const [selectedType, setSelectedType] = useState<JournalType>(
    initialType || JournalType.REFLECTION
  );

  const handleClose = () => {
    router.back();
  };

  const renderEditor = () => {
    switch (selectedType) {
      case JournalType.REFLECTION:
        return <ReflectionEditor onClose={handleClose} />;
      case JournalType.GRATITUDE:
        return <GratitudeEditor onClose={handleClose} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerTitle: selectedType === JournalType.REFLECTION ? "Journal" : "Gratitude",
          headerTitleStyle: { 
            color: colors.textPrimary,
            fontSize: 20,
            fontWeight: '600',
          },
          headerStyle: { 
            backgroundColor: colors.background 
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()}
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
            >
              <FontAwesome5 name="arrow-left" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/journal-history')}
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
            >
              <FontAwesome5 name="history" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Button
          mode={selectedType === JournalType.REFLECTION ? 'contained' : 'outlined'}
          onPress={() => setSelectedType(JournalType.REFLECTION)}
          style={[
            styles.typeButton,
            selectedType === JournalType.REFLECTION && { backgroundColor: colors.secondary }
          ]}
          labelStyle={{ 
            color: selectedType === JournalType.REFLECTION ? colors.primary : colors.textSecondary 
          }}
          textColor={selectedType === JournalType.REFLECTION ? colors.primary : colors.textSecondary}
        >
          Reflection
        </Button>
        <Button
          mode={selectedType === JournalType.GRATITUDE ? 'contained' : 'outlined'}
          onPress={() => setSelectedType(JournalType.GRATITUDE)}
          style={[
            styles.typeButton,
            selectedType === JournalType.GRATITUDE && { backgroundColor: colors.secondary }
          ]}
          labelStyle={{ 
            color: selectedType === JournalType.GRATITUDE ? colors.primary : colors.textSecondary 
          }}
          textColor={selectedType === JournalType.GRATITUDE ? colors.primary : colors.textSecondary}
        >
          Gratitude
        </Button>
      </View>

      {renderEditor()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    borderRadius: 12,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  typeButton: {
    flex: 1,
    borderRadius: 8,
  },
  headerButton: {
    padding: 12,
    borderRadius: 24,
    marginHorizontal: 16,
  },
}); 