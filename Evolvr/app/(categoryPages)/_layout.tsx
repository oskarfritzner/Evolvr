import React from 'react'
import { Stack } from "expo-router"
import { useTheme } from "@/context/ThemeContext"

export default function CategoryPagesLayout() {
  const { colors } = useTheme()

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
        gestureEnabled: true,
        gestureDirection: 'vertical',
        animationDuration: 200,
        contentStyle: {
          backgroundColor: 'transparent',
        }
      }}
    />
  )
} 