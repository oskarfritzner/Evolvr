import { Stack, useRouter } from 'expo-router';
import { useTheme } from "@/context/ThemeContext";
import { Platform, TouchableOpacity } from 'react-native';
import { useClientLayoutEffect } from '@/hooks/utils/useClientLayoutEffect';
import { FontAwesome5 } from '@expo/vector-icons';

export default function ModalsLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  
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
      <Stack.Screen 
        name="journal-history"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="terms-of-service"
        options={{
          headerShown: true,
          title: 'Terms of Service',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="privacy-policy"
        options={{
          headerShown: true,
          title: 'Privacy Policy',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="theme-selector"
        options={{
          headerShown: true,
          title: 'Select Theme',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="goals"
        options={{
          headerShown: true,
          title: 'Goals',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen 
        name="journal"
        options={{
          headerShown: true,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
} 