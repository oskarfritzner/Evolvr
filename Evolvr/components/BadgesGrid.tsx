import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface BadgesGridProps {
  userId: string;
}

export default function BadgesGrid({ userId }: BadgesGridProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.comingSoonContainer}>
        <MaterialCommunityIcons 
          name="medal-outline" 
          size={80} 
          color={colors.textSecondary} 
        />
        <Text style={[styles.comingSoonTitle, { color: colors.textPrimary }]}>
          Badges Coming Soon!
        </Text>
        <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
          Earn badges for your achievements and showcase your progress. Stay tuned for this exciting feature!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  comingSoonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
  },
});