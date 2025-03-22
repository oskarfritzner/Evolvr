import React from "react";
import { Stack } from "expo-router";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "@/backend/config/firebase";
import { RoutineProvider } from '@/context/RoutineContext';
import { TaskProvider } from '@/context/TaskContext';
import Toast from 'react-native-toast-message';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeServices } from '@/backend/services/initServices';
import { ClientSideLayoutEffect } from '@/components/layout/ClientSideLayoutEffect';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

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

// Create a client-side only Toast wrapper
function ClientSideToast() {
  const canUseDOM = typeof window !== 'undefined';
  if (!canUseDOM) return null;
  
  return <Toast />;
}

export default function RootLayout() {
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