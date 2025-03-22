import { Stack } from "expo-router"
import { useTheme } from "@/context/ThemeContext"
import { StyleSheet } from 'react-native'
import { useClientLayoutEffect } from '@/hooks/utils/useClientLayoutEffect';

export default function ProfileLayout() {
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
    <Stack 
      screenOptions={{ 
        headerShown: true,
        headerTransparent: true,
        headerBlurEffect: 'dark',
        headerTintColor: colors.secondary,
        headerTitleStyle: {
          color: colors.textPrimary,
        },
        headerBackTitle: '',
        headerShadowVisible: false,
        headerStyle: styles.header,
        contentStyle: {
          borderTopWidth: 0,
        },
        animation: 'fade',
        animationDuration: 200,
        presentation: 'card',
      }}
    >
      <Stack.Screen 
        name="[id]"
        options={{ 
          headerShown: false,
          headerTitle: '',
        }} 
      />
    </Stack>
  )
} 