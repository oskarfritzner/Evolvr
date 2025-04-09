import React, { useEffect } from "react";
import { Stack, SplashScreen } from "expo-router";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "@/backend/config/firebase";
import { RoutineProvider } from '@/context/RoutineContext';
import { TaskProvider } from '@/context/TaskContext';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeServices } from '@/backend/services/initServices';
import { ClientSideLayoutEffect } from '@/components/layout/ClientSideLayoutEffect';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { LogBox } from "react-native";
import { View, Text, StyleSheet } from "react-native";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Initialize services
initializeServices();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Create a custom theme that matches your app's theme
const paperTheme = {
  ...MD3LightTheme,
  // Add any custom theme properties here
};

// Shared toast styles
const toastStyles = StyleSheet.create({
  container: {
    height: 60,
    width: '90%',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
  },
  text1: {
    fontSize: 15,
    fontWeight: '500',
  },
  text2: {
    fontSize: 13,
  }
});

// Configure Toast
const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{
        ...toastStyles.container,
        borderLeftColor: paperTheme.colors.primary,
        backgroundColor: '#FFFFFF'
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={toastStyles.text1}
      text2Style={toastStyles.text2}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{
        ...toastStyles.container,
        borderLeftColor: paperTheme.colors.error,
        backgroundColor: '#FFFFFF'
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={toastStyles.text1}
      text2Style={toastStyles.text2}
    />
  ),
  warning: (props: any) => (
    <BaseToast
      {...props}
      style={{
        ...toastStyles.container,
        borderLeftColor: '#F4D03F',
        backgroundColor: '#FFFFFF'
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={toastStyles.text1}
      text2Style={toastStyles.text2}
    />
  ),
};

// Ignore specific warnings
LogBox.ignoreLogs([
  'Animated: `useNativeDriver`',
]); 

// Create a client-side only Toast wrapper
function ClientSideToast() {
  const canUseDOM = typeof window !== 'undefined';
  if (!canUseDOM) return null;
  
  return <Toast config={toastConfig} />;
}

export default function RootLayout() {
  useEffect(() => {
    // Hide the splash screen once everything is initialized
    SplashScreen.hideAsync();
  }, []);

  return (
    <ClientSideLayoutEffect
      effect={() => {
        // Your layout effect code here
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <ThemeProvider>
              <PaperProvider theme={paperTheme}>
                <AuthProvider>
                  <TaskProvider>
                    <RoutineProvider>
                      <BottomSheetModalProvider>
                        <Stack screenOptions={{ headerShown: false }}>
                          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                          <Stack.Screen name="(modals)" options={{ headerShown: false }} />
                          <Stack.Screen name="(profile)" options={{ headerShown: false }} />
                          <Stack.Screen name="(categoryPages)" options={{ headerShown: false }} />
                          <Stack.Screen name="index" options={{ headerShown: false }} />
                        </Stack>
                        <ClientSideToast />
                      </BottomSheetModalProvider>
                    </RoutineProvider>
                  </TaskProvider>
                </AuthProvider>
              </PaperProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ClientSideLayoutEffect>
  );
}