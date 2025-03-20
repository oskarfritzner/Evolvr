import { Stack } from 'expo-router';
import { useTheme } from "@/context/ThemeContext";

export default function AuthLayout() {
  const { colors } = useTheme();
  
  return (
    <Stack 
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: {
          backgroundColor: colors.background
        },
        presentation: 'card',
      }}
    >
      <Stack.Screen 
        name="sign-in"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="register"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="onboarding"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
} 