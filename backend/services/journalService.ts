import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/backend/config/firebase";
import { JournalEntry } from "../types/JournalEntry";
import { levelService } from "./levelService";

// XP constants
const WORD_XP_MULTIPLIER = 0.5;
const MOOD_XP_BONUS = 20;
const PROMPT_XP_BONUS = 15;
const MAX_JOURNAL_XP = 200;

// Categories to which journaling contributes XP
const JOURNAL_CATEGORIES = ["mental", "intellectual"];

export const journalService = {
  calculateXP(entry: Partial<JournalEntry>): number {
    let xp = (entry.wordCount || 0) * WORD_XP_MULTIPLIER; // Base XP from word count

    if (entry.mood) {
      xp += MOOD_XP_BONUS; // Mood bonus
    }
    if (entry.promptsUsed && entry.promptsUsed.length > 0) {
      xp += entry.promptsUsed.length * PROMPT_XP_BONUS; // Prompt bonus
    }

    // Cap at MAX_JOURNAL_XP
    return Math.min(xp, MAX_JOURNAL_XP);
  },

  async saveEntry(userId: string, entry: Partial<JournalEntry>): Promise<void> {
    try {
      const now = new Date();
      const dateId = now.toISOString().split("T")[0];
      const timestamp = Timestamp.now();

      // Create unique ID with full timestamp
      const entryId = timestamp.toDate().getTime().toString();

      const newEntry: JournalEntry = {
        id: entryId,
        userId,
        date: dateId,
        content: entry.content || "",
        mood: entry.mood ?? 3,
        keywords: entry.keywords || [],
        promptsUsed: entry.promptsUsed || [],
        wordCount: entry.wordCount ?? 0,
        timestamp,
      };

      // Save entry as its own document
      await setDoc(
        doc(db, "users", userId, "journalEntries", entryId),
        newEntry
      );

      // Calculate and award XP
      const xp = this.calculateXP(newEntry);
      const xpGains = JOURNAL_CATEGORIES.reduce((acc, category) => {
        acc[category] = xp / JOURNAL_CATEGORIES.length;
        return acc;
      }, {} as Record<string, number>);

      await levelService.addXP(userId, xpGains, "normal");
    } catch (error) {
      console.error("Error saving journal entry:", error);
      throw error;
    }
  },

  extractKeywords(text: string): string[] {
    // Very basic keyword extraction
    const words = text.toLowerCase().split(/\W+/);
    const commonWords = new Set([
      "the",
      "be",
      "to",
      "of",
      "and",
      "a",
      "in",
      "that",
      "have",
      "i",
      "it",
    ]);

    // Filter out short or common words, then deduplicate & limit
    return [
      ...new Set(
        words.filter((word) => word.length > 3 && !commonWords.has(word))
      ),
    ].slice(0, 5);
  },

  async getDailyEntries(userId: string, date: string): Promise<JournalEntry[]> {
    try {
      const entriesRef = collection(db, "users", userId, "journalEntries");
      const q = query(entriesRef, where("date", "==", date));
      const querySnapshot = await getDocs(q);

      const entries: JournalEntry[] = [];
      querySnapshot.forEach((doc) => {
        entries.push(doc.data() as JournalEntry);
      });

      // Sort by timestamp descending (newest first)
      return entries.sort(
        (a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()
      );
    } catch (error) {
      console.error("Error getting daily entries:", error);
      throw error;
    }
  },
};
