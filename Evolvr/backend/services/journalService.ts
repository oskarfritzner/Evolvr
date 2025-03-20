import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { JournalEntry, DailyJournal, JournalType } from "../types/JournalEntry";
import { levelService } from "./levelService";

// XP constants per type
const XP_REWARDS = {
  [JournalType.GRATITUDE]: 50,
  [JournalType.GOALS]: 75,
  [JournalType.REFLECTION]: 100,
};

export const journalService = {
  async saveEntry(userId: string, entry: Partial<JournalEntry>): Promise<void> {
    try {
      const now = new Date();
      const dateId = now.toISOString().split("T")[0];
      const timestamp = Timestamp.now();

      // Get or create daily journal document
      const dailyJournalRef = doc(db, "users", userId, "journals", dateId);
      const dailyJournalDoc = await getDoc(dailyJournalRef);

      const dailyJournal: DailyJournal = dailyJournalDoc.exists()
        ? (dailyJournalDoc.data() as DailyJournal)
        : {
            date: dateId,
            userId,
            entries: [],
            createdAt: timestamp,
            updatedAt: timestamp,
            xpAwardedTypes: [],
          };

      // Check if XP can be awarded for this type today
      const canAwardXP = !dailyJournal.xpAwardedTypes.includes(entry.type!);

      const newEntry: JournalEntry = {
        id: timestamp.toDate().getTime().toString(),
        userId,
        type: entry.type!,
        timestamp,
        content: entry.content!,
        xpAwarded: canAwardXP,
      };

      // Update daily journal
      await setDoc(dailyJournalRef, {
        ...dailyJournal,
        entries: [...dailyJournal.entries, newEntry],
        updatedAt: timestamp,
        xpAwardedTypes: canAwardXP
          ? [...dailyJournal.xpAwardedTypes, entry.type!]
          : dailyJournal.xpAwardedTypes,
      });

      // Award XP if eligible
      if (canAwardXP) {
        const xp = XP_REWARDS[entry.type!];
        const xpGains = {
          mental: xp * 0.6,
          intellectual: xp * 0.4,
        };
        await levelService.addXP(userId, xpGains, "normal");
      }
    } catch (error) {
      console.error("Error saving journal entry:", error);
      throw error;
    }
  },

  async getDailyEntries(userId: string, date: string): Promise<JournalEntry[]> {
    try {
      const dailyJournalRef = doc(db, "users", userId, "journals", date);
      const dailyJournalDoc = await getDoc(dailyJournalRef);

      if (!dailyJournalDoc.exists()) return [];

      const dailyJournal = dailyJournalDoc.data() as DailyJournal;
      return dailyJournal.entries;
    } catch (error) {
      console.error("Error getting daily entries:", error);
      throw error;
    }
  },

  async getJournalHistory(
    userId: string,
    startDate: string,
    endDate: string,
    pageSize: number = 10
  ): Promise<DailyJournal[]> {
    try {
      const journalsRef = collection(db, "users", userId, "journals");
      const q = query(
        journalsRef,
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "desc"),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as DailyJournal);
    } catch (error) {
      console.error("Error getting journal history:", error);
      throw error;
    }
  },

  async getTodayXPStatus(userId: string): Promise<JournalType[]> {
    try {
      const today = new Date().toISOString().split("T")[0];
      const dailyJournalRef = doc(db, "users", userId, "journals", today);
      const dailyJournalDoc = await getDoc(dailyJournalRef);

      if (!dailyJournalDoc.exists()) return [];

      const dailyJournal = dailyJournalDoc.data() as DailyJournal;
      return dailyJournal.xpAwardedTypes;
    } catch (error) {
      console.error("Error getting today's XP status:", error);
      return [];
    }
  },
};
