import { useAuth } from "@/context/AuthContext";
import { UserType } from "@/backend/types/UserData";
import type { PremiumFeatures, AdminFeatures } from "@/backend/types/UserData";

export function useSubscription() {
  const { user } = useAuth();

  const isPremium = user?.userData?.subscription?.type === UserType.PREMIUM;
  const isAffiliate = user?.userData?.subscription?.type === UserType.AFFILIATE;
  const isAdmin = user?.userData?.subscription?.type === UserType.ADMIN;

  const canAccessFeature = (feature: keyof PremiumFeatures) => {
    if (isAdmin) return true; // Admins have access to all features
    return user?.userData?.premiumFeatures?.[feature] || false;
  };

  const hasAdminAccess = (feature: keyof AdminFeatures) => {
    return user?.userData?.adminFeatures?.[feature] || false;
  };

  return {
    isPremium,
    isAffiliate,
    isAdmin,
    canAccessFeature,
    hasAdminAccess,
    subscription: user?.userData?.subscription,
    affiliateData: user?.userData?.affiliateData,
    adminFeatures: user?.userData?.adminFeatures,
  };
}
