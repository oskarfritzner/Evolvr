import { Timestamp } from "firebase/firestore";

export enum JournalType {
  GRATITUDE = 'gratitude',
  GOALS = 'goals',
  REFLECTION = 'reflection'
}

export interface GratitudeEntry {
  items: string[];  // Array of 3 gratitude items
}

export interface SmartGoal {
  id: string;
  description: string;
  isCompleted: boolean;
  measurable?: string;  // How will progress be measured
  deadline?: string;    // Target completion date
  steps?: string[];     // Breaking down the goal into actionable steps
}

export interface GoalsEntry {
  daily: SmartGoal[];
  monthly: SmartGoal[];
  yearly: SmartGoal[];
}

export interface ReflectionEntry {
  content: string;
  mood: number;
  keywords: string[];
}

// Base interface for all journal entries
export interface JournalEntry {
  id: string;
  userId: string;
  type: JournalType;
  timestamp: Timestamp;
  xpAwarded: boolean;
  content: GratitudeEntry | GoalsEntry | ReflectionEntry;
}

// Daily Journal Document (groups all entries for a day)
export interface DailyJournal {
  date: string; // ISO date format
  userId: string;
  entries: JournalEntry[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  xpAwardedTypes: JournalType[]; // Track which types have awarded XP today
}