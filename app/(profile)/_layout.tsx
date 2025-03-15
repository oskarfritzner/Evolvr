import { Stack } from "expo-router"
import { useTheme } from "@/context/ThemeContext"
import { StyleSheet } from 'react-native'
import { useClientLayoutEffect } from '@/hooks/utils/useClientLayoutEffect';

export default function SettingsLayout() {
  const { colors } = useTheme()

  useClientLayoutEffect(() => {
    // Handle any layout effects for profile transitions
  }, []);

  const styles = StyleSheet.create({
    header: {
      backgroundColor: 'transparent',
      borderBottomWidth: 0,
    }
  })

  return (
    <Stack screenOptions={{ 
      headerShown: true,
      headerTransparent: true, // Make header background transparent
      headerBlurEffect: 'dark', // Dark blur effect
      headerTintColor: colors.secondary,
      headerTitleStyle: {
        color: colors.textPrimary,
      },
      headerBackTitle: '', // Remove back button text
      headerShadowVisible: false,
      headerStyle: styles.header,
      contentStyle: {
        borderTopWidth: 0, // Remove top border of content
      }
    }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="settings" 
        options={{ 
          headerTitle: 'Settings' // Remove title to only show back button
        }} 
      />
    </Stack>
  )
} 