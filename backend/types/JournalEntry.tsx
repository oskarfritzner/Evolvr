import { Timestamp } from "firebase/firestore";

// Single Journal Entry
export interface JournalEntry {
  id: string;
  userId: string;
  date: string;
  content: string;
  mood: number;
  keywords: string[];
  promptsUsed: string[];
  wordCount: number;
  timestamp: Timestamp;
  aiAnalysis?: {
    sentiment: number;
    themes: string[];
    suggestions: string[];
  };
}

// Daily Journal Document
export interface DailyJournal {
  date: string; // ISO date format
  userId: string;
  entries: JournalEntry[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}