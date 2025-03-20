import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import type Task from "@/backend/types/Task";

interface CategoryStats {
  level: number;
  xp: number;
}

interface UserCategories {
  [key: string]: CategoryStats;
}

const XP_PER_LEVEL = 1000;

export const getCategoryStats = async (
  userId: string
): Promise<UserCategories | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) return null;

    return userDoc.data().categories;
  } catch (error) {
    throw error;
  }
};

export const updateCategoryXP = async (
  userId: string,
  categoryId: string,
  xpToAdd: number
): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return false;

    const categories = userDoc.data().categories || {};
    const currentStats = categories[categoryId] || {
      level: 1,
      xp: 0,
      prestige: 1,
    };

    // Calculate new XP and level
    let newXP = currentStats.xp + xpToAdd;
    let newLevel = currentStats.level;
    let newPrestige = currentStats.prestige;

    // Handle level up
    while (newXP >= XP_PER_LEVEL) {
      newXP -= XP_PER_LEVEL;
      newLevel++;

      // Handle prestige (at level 100)
      if (newLevel > 100) {
        newLevel = 1;
        newXP = 0;
        newPrestige++;
      }
    }

    // Update the category stats
    await updateDoc(userRef, {
      [`categories.${categoryId}`]: {
        level: newLevel,
        xp: newXP,
        prestige: newPrestige,
      },
    });

    return true;
  } catch (error) {
    console.error("Error updating category XP:", error);
    return false;
  }
};

export const getCategoryTasks = async (categoryId: string): Promise<Task[]> => {
  try {
    const tasksRef = collection(db, "tasks");
    const q = query(
      tasksRef,
      where("categoryXp", "array-contains", categoryId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Task[];
  } catch (error) {
    console.error("Error fetching category tasks:", error);
    return [];
  }
};
