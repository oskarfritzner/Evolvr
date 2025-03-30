import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { CoachPersonality } from '@/backend/openAi/aiService';
import { FontAwesome5 } from '@expo/vector-icons';

// Define the prop types for the PersonalitySelector component
interface PersonalitySelectorProps {
  selectedPersonality: CoachPersonality; // Currently selected coach personality
  onSelect: (personality: CoachPersonality) => void; // Callback when a personality is selected
  onClose: () => void; // Callback to close the selector
}

// Mapping of personality keys to their display names
const COACH_PERSONALITIES: Record<CoachPersonality, string> = {
  default: "Evolve Coach",
  goggins: "Stay Hard Mode",
  pete: "Order & Meaning"
};

// PersonalitySelector Component: Displays a list of personalities for the user to choose from
export default function PersonalitySelector({ 
  selectedPersonality, // Currently selected personality
  onSelect, // Function to handle personality selection
  onClose // Function to close the selector
}: PersonalitySelectorProps) {
  
  // Get the current theme colors from the context
  const { colors } = useTheme();

  return (
    <View 
      style={[styles.container, { 
        backgroundColor: colors.surfaceContainer, // Set background color from theme
        borderColor: colors.border, // Set border color from theme
      }]}
    >
      {Object.entries(COACH_PERSONALITIES).map(([key, name]) => (
        // Render each personality as a touchable item
        <TouchableOpacity
          key={key} // Use personality key as unique identifier
          style={[styles.personalityItem, { borderBottomColor: colors.border }]} // Apply styles
          onPress={() => {
            onSelect(key as CoachPersonality); // Trigger the onSelect callback with the chosen personality
            onClose(); // Close the selector after selection
          }}
        >
          {/* Display the name of the personality */}
          <Text style={[styles.personalityItemText, { color: colors.textPrimary }]}>
            {name}
          </Text>
          {/* If the personality is selected, show a check icon */}
          {selectedPersonality === key && (
            <FontAwesome5 
              name="check" 
              size={12} 
              color={colors.textPrimary} 
              style={styles.checkIcon} // Style for the check icon
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Styles for the component
const styles = StyleSheet.create({
  container: {
    position: 'absolute', // Position the container absolutely
    top: 60, // Position from the top
    right: 16, // Position from the right
    borderRadius: 8, // Rounded corners
    borderWidth: 1, // Border thickness
    overflow: 'hidden', // Hide overflow content
    zIndex: 1000, // Ensure it is on top of other elements
    elevation: 5, // Elevation for shadow on Android
    shadowColor: "#000", // Shadow color
    shadowOffset: {
      width: 0,
      height: 2, // Slight drop shadow
    },
    shadowOpacity: 0.15, // Light shadow opacity
    shadowRadius: 3, // Shadow spread
    width: 150, // Fixed width
  },
  personalityItem: {
    flexDirection: 'row', // Arrange content in a row
    alignItems: 'center', // Center items vertically
    paddingVertical: 12, // Vertical padding
    paddingHorizontal: 16, // Horizontal padding
    borderBottomWidth: 1, // Divider between items
  },
  personalityItemText: {
    fontSize: 14, // Text size
    fontWeight: '500', // Medium weight
    flex: 1, // Take up available space
  },
  checkIcon: {
    marginLeft: 8, // Space between text and icon
  },
});