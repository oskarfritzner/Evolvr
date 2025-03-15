import { Stack } from 'expo-router';
import { useTheme } from "@/context/ThemeContext";
import { Platform } from 'react-native';
import { useClientLayoutEffect } from '@/hooks/utils/useClientLayoutEffect';

export default function ModalsLayout() {
  const { colors } = useTheme();
  
  useClientLayoutEffect(() => {
    // Handle modal animation setup if needed
  }, []);

  return (
    <Stack 
      screenOptions={{
        presentation: 'modal',
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.textPrimary,
        animation: 'slide_from_bottom',
        gestureEnabled: true,
        gestureDirection: 'vertical',
        animationTypeForReplace: 'push',
      }}
    >
      <Stack.Screen 
        name="create-post" 
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="friends"
        options={{
          headerShown: true,
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="notifications"
        options={{
          headerShown: true
        }}
      />
      <Stack.Screen 
        name="user-profile" 
        options={{
          animation: 'slide_from_right',
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="challenge-list" 
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: true
        }}
      />
      <Stack.Screen 
        name="challenge"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: true
        }}
      />
    </Stack>
  );
} 