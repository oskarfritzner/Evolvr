export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type CoachPersonality = "default" | "goggins" | "pete";
