import {
  doc,
  updateDoc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
  arrayUnion,
  deleteField,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import {
  UserType,
  SubscriptionData,
  AffiliateData,
  AdminFeatures,
} from "../types/UserData";

export const subscriptionService = {
  async upgradeToPermium(
    userId: string,
    affiliateCode?: string
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);

      // If affiliate code provided, validate and record it
      let referredBy: string | undefined;
      if (affiliateCode) {
        const affiliatesRef = collection(db, "users");
        const q = query(
          affiliatesRef,
          where("affiliateData.code", "==", affiliateCode)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          referredBy = snapshot.docs[0].id;
          // Update affiliate's referrals
          await updateDoc(doc(db, "users", referredBy), {
            "affiliateData.referrals": arrayUnion(userId),
          });
        }
      }

      const subscription: SubscriptionData = {
        type: UserType.PREMIUM,
        startDate: new Date(),
        status: "active",
        autoRenew: true,
        affiliateCode,
        referredBy,
      };

      // Update user with premium features
      await updateDoc(userRef, {
        subscription,
        premiumFeatures: {
          customThemes: true,
          dataExport: true,
          advancedAnalytics: true,
          prioritySupport: true,
          adsDisabled: true,
          maxChallenges: 10,
          maxRoutines: 20,
        },
      });
    } catch (error) {
      console.error("Error upgrading to premium:", error);
      throw error;
    }
  },

  async becomeAffiliate(userId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      // Check if user is premium
      if (userData?.subscription?.type !== UserType.PREMIUM) {
        throw new Error("Must be a premium user to become an affiliate");
      }

      // Generate unique affiliate code
      const affiliateCode = `${userData.username}-${Math.random()
        .toString(36)
        .substr(2, 6)}`;

      const affiliateData: AffiliateData = {
        code: affiliateCode,
        referrals: [],
        earnings: 0,
        paymentHistory: [],
      };

      await updateDoc(userRef, {
        "subscription.type": UserType.AFFILIATE,
        affiliateData,
      });
    } catch (error) {
      console.error("Error becoming affiliate:", error);
      throw error;
    }
  },

  async checkSubscriptionStatus(userId: string): Promise<boolean> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      if (!userData?.subscription) return false;

      const { endDate, status } = userData.subscription;
      if (status !== "active") return false;
      if (endDate && new Date(endDate) < new Date()) {
        // Subscription expired
        await updateDoc(userRef, {
          "subscription.status": "expired",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking subscription:", error);
      return false;
    }
  },

  async promoteToAdmin(
    userId: string,
    adminLevel: 1 | 2 | 3,
    promotedBy: string
  ): Promise<void> {
    try {
      const promoterRef = doc(db, "users", promotedBy);
      const promoterDoc = await getDoc(promoterRef);
      const promoterData = promoterDoc.data();

      // Check if promoter is an admin with sufficient access level
      if (
        !promoterData?.adminFeatures?.accessLevel ||
        promoterData.adminFeatures.accessLevel <= adminLevel
      ) {
        throw new Error("Insufficient permissions to promote user");
      }

      const userRef = doc(db, "users", userId);

      const subscription: SubscriptionData = {
        type: UserType.ADMIN,
        startDate: new Date(),
        status: "active",
        autoRenew: true,
      };

      // Set admin features based on level
      const adminFeatures: AdminFeatures = {
        canManageUsers: adminLevel >= 2,
        canManageContent: adminLevel >= 1,
        canViewAnalytics: adminLevel >= 1,
        canManageAffiliates: adminLevel >= 2,
        accessLevel: adminLevel,
      };

      // Update user with admin status and features
      await updateDoc(userRef, {
        subscription,
        adminFeatures,
        premiumFeatures: {
          customThemes: true,
          dataExport: true,
          advancedAnalytics: true,
          prioritySupport: true,
          adsDisabled: true,
          maxChallenges: Infinity,
          maxRoutines: Infinity,
        },
      });
    } catch (error) {
      console.error("Error promoting to admin:", error);
      throw error;
    }
  },

  async revokeAdminStatus(userId: string, revokedBy: string): Promise<void> {
    try {
      const revokerRef = doc(db, "users", revokedBy);
      const revokerDoc = await getDoc(revokerRef);
      const revokerData = revokerDoc.data();

      // Check if revoker has sufficient permissions
      if (
        !revokerData?.adminFeatures?.accessLevel ||
        revokerData.adminFeatures.accessLevel < 3
      ) {
        throw new Error("Insufficient permissions to revoke admin status");
      }

      const userRef = doc(db, "users", userId);

      // Reset to FREE user
      await updateDoc(userRef, {
        subscription: {
          type: UserType.FREE,
          startDate: new Date(),
          status: "active",
          autoRenew: false,
        },
        adminFeatures: deleteField(), // Remove admin features
        premiumFeatures: deleteField(), // Remove premium features
      });
    } catch (error) {
      console.error("Error revoking admin status:", error);
      throw error;
    }
  },
};
