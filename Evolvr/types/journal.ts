export type JournalType = "reflection" | "gratitude" | "goals";

interface ReflectionContent {
  content: string;
  mood: number;
  keywords: string[];
}

interface GratitudeContent {
  items: string[];
}

interface GoalsContent {
  goals: string[];
}

export type JournalContent =
  | string
  | ReflectionContent
  | GratitudeContent
  | GoalsContent;

export interface JournalEntry {
  id: string;
  userId: string;
  type: JournalType;
  content: JournalContent;
  timestamp: string | { seconds: number; nanoseconds: number };
  isEncrypted?: boolean;
}
