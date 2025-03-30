import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { DefaultCoach } from './personalities/DefaultCoach';
import { GogginsCoach } from './personalities/GogginsCoach';
import { PeteCoach } from './personalities/PeteCoach';
import { CoachPersonality } from '@/backend/openAi/aiService';
import PersonalitySelector from './PersonalitySelector';

interface MindsetCoachProps {
  onClose: () => void;
}

const COACH_PERSONALITIES: Record<CoachPersonality, string> = {
  default: "Evolve Coach",
  goggins: "Stay Hard Mode",
  pete: "Order & Meaning"
};

export function MindsetCoach({ onClose }: MindsetCoachProps) {
  const { colors } = useTheme();
  const [coachPersonality, setCoachPersonality] = useState<CoachPersonality>("default");
  const [showPersonalitySelector, setShowPersonalitySelector] = useState(false);

  const renderCoach = () => {
    switch (coachPersonality) {
      case 'goggins':
        return <GogginsCoach onClose={onClose} />;
      case 'pete':
        return <PeteCoach onClose={onClose} />;
      default:
        return <DefaultCoach onClose={onClose} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={[styles.dropdownTrigger, { backgroundColor: colors.surfaceContainer }]}
        onPress={() => setShowPersonalitySelector(true)}
      >
        <Text style={[styles.dropdownTriggerText, { color: colors.textPrimary }]}>
          {COACH_PERSONALITIES[coachPersonality]}
        </Text>
        <FontAwesome5 
          name={showPersonalitySelector ? "chevron-up" : "chevron-down"} 
          size={12} 
          color={colors.textPrimary} 
        />
      </TouchableOpacity>

      {showPersonalitySelector && (
        <>
          <TouchableOpacity 
            style={styles.backdrop} 
            onPress={() => setShowPersonalitySelector(false)} 
          />
          <PersonalitySelector
            selectedPersonality={coachPersonality}
            onSelect={setCoachPersonality}
            onClose={() => setShowPersonalitySelector(false)}
          />
        </>
      )}
      {renderCoach()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  dropdownTriggerText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 999,
  },
}); 