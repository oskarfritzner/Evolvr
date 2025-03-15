import { Stack } from "expo-router"
import { useTheme } from "@/context/ThemeContext"

export default function CategoryPagesLayout() {
  const { colors } = useTheme()

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, // Set to false to remove the default header
        animation: 'slide_from_right',
        animationDuration: 200,
        presentation: 'modal',
        gestureEnabled: true,
        gestureDirection: 'horizontal'
      }}
    />
  )
} 