import { Redirect, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import logger from '@/utils/logger';

export default function Index() {
  const { user, isLoading, isInitialized } = useAuth();
  const navigationState = useRootNavigationState();

  logger.dev('Index render:', {
    hasUser: !!user,
    isLoading,
    isInitialized,
    hasNavigationState: !!navigationState?.key
  });

  // Wait for auth to initialize and navigation to be ready
  if (!navigationState?.key || !isInitialized || isLoading) {
    return <LoadingSpinner />;
  }

  // Only redirect after auth is fully initialized
  if (!user) {
    logger.dev('Redirecting to sign-in:', {
      hasUser: !!user,
      isInitialized,
      isLoading
    });
    return <Redirect href="/(auth)/sign-in" />;
  }

  // User exists - go to dashboard
  return <Redirect href="/(tabs)/dashboard" />;
} 