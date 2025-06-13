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
import {
  JournalEntry,
  DailyJournal,
  JournalType,
  ReflectionEntry,
  GratitudeEntry,
  GoalsEntry,
} from "../types/JournalEntry";
import { levelService } from "./levelService";
import { encryptionService } from "./encryptionService";

// XP constants per type
const XP_REWARDS = {
  [JournalType.GRATITUDE]: 50,
  [JournalType.GOALS]: 75,
  [JournalType.REFLECTION]: 100,
};

type JournalContent = GratitudeEntry | GoalsEntry | ReflectionEntry;

export const journalService = {
  async saveEntry(
    userId: string,
    entry: Omit<JournalEntry, "id" | "userId" | "timestamp" | "xpAwarded">,
    isEncrypted: boolean = false
  ): Promise<void> {
    try {
      const currentDate = new Date().toISOString().split("T")[0];
      const journalRef = doc(db, "users", userId, "journals", currentDate);

      // Get existing journal or create new one
      const journalDoc = await getDoc(journalRef);
      let journalData = journalDoc.exists() ? journalDoc.data() : null;

      if (!journalData) {
        journalData = {
          date: currentDate,
          userId,
          entries: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          xpAwardedTypes: [],
        };
      }

      // Prepare the entry
      const journalEntry: JournalEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Timestamp.now(),
        userId,
        xpAwarded: false,
      };

      // Encrypt if needed
      if (isEncrypted) {
        const contentString = JSON.stringify(journalEntry.content);
        const encryptedContent = await encryptionService.encrypt(
          contentString,
          userId
        );
        journalEntry.content = encryptedContent as unknown as JournalContent;
        journalEntry.isEncrypted = true;
      }

      // Add to entries array
      journalData.entries.push(journalEntry);
      journalData.updatedAt = Timestamp.now();

      // Save to Firestore
      await setDoc(journalRef, journalData);
    } catch (error) {
      console.error("Error saving journal entry:", error);
      throw new Error("Failed to save journal entry");
    }
  },

  async getDailyEntries(userId: string, date: string): Promise<JournalEntry[]> {
    try {
      const dailyJournalRef = doc(db, "users", userId, "journals", date);
      const dailyJournalDoc = await getDoc(dailyJournalRef);

      if (!dailyJournalDoc.exists()) {
        return [];
      }

      const dailyJournal = dailyJournalDoc.data();
      const entries = dailyJournal.entries as JournalEntry[];

      // Decrypt entries if they are encrypted
      const decryptedEntries = await Promise.all(
        entries.map(async (entry) => {
          if (entry.isEncrypted) {
            const key = await encryptionService.getKey(userId);
            if (key) {
              const decryptedContent = await encryptionService.decrypt(
                entry.content as unknown as string,
                key
              );
              return {
                ...entry,
                content: JSON.parse(decryptedContent) as JournalContent,
              };
            }
          }
          return entry;
        })
      );

      return decryptedEntries;
    } catch (error) {
      console.error("Error getting daily entries:", error);
      throw new Error("Failed to get daily entries");
    }
  },

  async getJournalHistory(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyJournal[]> {
    try {
      const dailyJournalsRef = collection(db, "users", userId, "journals");
      const q = query(dailyJournalsRef, orderBy("date", "desc"));

      const querySnapshot = await getDocs(q);
      const dailyJournals: DailyJournal[] = [];

      for (const doc of querySnapshot.docs) {
        const journalDoc = doc.data();

        // Convert the document to DailyJournal format
        const dailyJournal: DailyJournal = {
          date: journalDoc.date,
          userId: journalDoc.userId,
          entries: journalDoc.entries || [],
          createdAt: journalDoc.createdAt || Timestamp.now(),
          updatedAt: journalDoc.updatedAt || Timestamp.now(),
          xpAwardedTypes: journalDoc.xpAwardedTypes || [],
        };

        // Decrypt entries if they are encrypted
        const decryptedEntries = await Promise.all(
          dailyJournal.entries.map(async (entry) => {
            if (entry.isEncrypted) {
              try {
                const decryptedContent = await encryptionService.decrypt(
                  entry.content as unknown as string,
                  userId
                );
                return {
                  ...entry,
                  content: JSON.parse(decryptedContent) as JournalContent,
                };
              } catch (error) {
                console.error("Error decrypting entry:", error);
                return entry;
              }
            }
            return entry;
          })
        );

        dailyJournal.entries = decryptedEntries;
        dailyJournals.push(dailyJournal);
      }

      // Filter by date range
      const filteredJournals = dailyJournals.filter((journal) => {
        const journalDate = journal.date;
        return journalDate >= startDate && journalDate <= endDate;
      });

      return filteredJournals;
    } catch (error) {
      console.error("Error getting journal history:", error);
      throw new Error("Failed to get journal history");
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
