import { BaseAIService } from "./BaseAIService";
import { UserData } from "@/backend/types/UserData";
import { ChatMessage, CoachPersonality } from "../types/CoachingTypes";
import { COACH_SYSTEM_PROMPTS } from "../prompts/coachPrompts";

export class MindsetCoachService extends BaseAIService {
  async getMindsetCoachResponse(
    userId: string,
    message: string,
    userData: UserData,
    personality: CoachPersonality = "default"
  ): Promise<ChatMessage> {
    const systemPrompt = COACH_SYSTEM_PROMPTS[personality];

    // Define personality-specific token limits
    const maxTokens = {
      default: 150, // Concise, supportive responses
      goggins: 100, // Short, intense responses
      pete: 120, // Balanced, precise responses
    }[personality];

    try {
      const response = await this.createChatCompletion(
        [
          {
            role: "system",
            content:
              systemPrompt +
              "\n\nIMPORTANT: Keep all responses under 100 words and focus on one key point per message.",
          },
          { role: "user", content: message },
        ],
        { maxTokens }
      );

      return {
        role: "assistant",
        content: response.choices[0].message?.content || "",
      };
    } catch (error) {
      console.error("AI Coach Response Error:", error);
      throw error;
    }
  }
}
