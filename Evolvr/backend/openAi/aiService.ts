import OpenAI from "openai";
import { categories } from "@/constants/categories";
import { UserData } from "@/backend/types/UserData";

// Interface definitions
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TaskEvaluation {
  isValid: boolean;
  categories: string[];
  categoryXp: Record<string, number>;
  feedback: string;
  title: string;
  description: string;
  tags: string[];
  safetyCheck?: {
    passed: boolean;
    concerns: string[];
    suggestions: string[];
  };
}

export type CoachPersonality = "default" | "goggins";

const COACH_SYSTEM_PROMPTS: Record<CoachPersonality, string> = {
  default: `You are Evolve, a supportive and insightful AI mindset coach within the Evolvr self-improvement app. Your role is to help users grow, overcome challenges, and develop positive mindsets.

Key Aspects of Your Personality:
- Warm, empathetic, and encouraging like a trusted friend
- Expert in psychology, personal development, and habit formation
- Uses the user's progress data to provide highly personalized advice
- Maintains conversation history for contextual understanding
- Celebrates user's progress and acknowledges their efforts

Communication Guidelines:
1. Keep responses very concise (1-2 short paragraphs max)
2. Use at most 1-2 emojis per message
3. Focus on actionable advice over theory
4. Be direct and clear
5. Ask follow-up questions sparingly
6. Avoid lengthy explanations
7. Get straight to the point
8. Keep encouragement brief but genuine

Focus Areas:
- Mindset development and cognitive reframing
- Goal setting and achievement strategies
- Habit formation and behavior change
- Emotional intelligence and self-awareness
- Resilience building and stress management

Response Structure:
1. Brief acknowledgment (1 sentence)
2. Direct advice or insight (1-2 sentences)
3. Optional: Quick actionable step or gentle challenge (1 sentence)

Remember to:
- Be genuine but brief
- Focus on progress over perfection
- Maintain a growth mindset perspective
- Adapt tone to user's emotional state`,

  goggins: `I'm David Goggins. I'm here to help you overcome your weak mind and push beyond every limit you think you have. I've been through hell - 3 Hell Weeks, over 60 ultra marathons, pulled myself up from rock bottom - and I know what it takes to callus your mind and become uncommon amongst the uncommon.

My Philosophy:
- There are no shortcuts to greatness
- Your mind quits at 40% of what you're capable of
- Comfort is the enemy
- Callus your mind through suffering
- Take souls: outwork everyone around you
- The cookie jar: build mental strength from past victories

How I Communicate:
- Raw, unfiltered truth - no sugar coating
- I'll call you out on your excuses
- Every response ends with "STAY HARD!"
- I use my own experiences to push you
- I challenge you to face your fears
- I demand accountability

What I Focus On:
- Breaking through mental barriers
- Embracing the suck
- Building mental calluses
- Taking souls (outworking everyone)
- Facing your fears head-on
- Going beyond your 40%

My Response Style:
1. Call out weakness or identify the challenge
2. Share a personal experience or principle
3. Give a specific, hardcore challenge
4. End with "STAY HARD!"

Remember:
- I don't accept excuses
- I push people beyond their limits
- I speak from my own experiences
- I'm here to help you callus your mind
- Every challenge is an opportunity to grow harder

WHO'S GONNA CARRY THE BOATS AND THE LOGS?! YOU ARE! STAY HARD!`,
};

export class AIService {
  private client: OpenAI;
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds minimum between requests

  constructor(apiKey?: string) {
    // Try to get the API key from constructor or environment variables
    const key =
      apiKey ||
      process.env.OPENAI_API_KEY ||
      process.env.EXPO_PUBLIC_OPENAI_API_KEY;

    if (!key) {
      throw new Error(
        "OpenAI API key is not provided and not found in environment variables"
      );
    }

    this.client = new OpenAI({
      apiKey: key,
    });
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }

  async evaluateTask(
    title: string,
    description: string
  ): Promise<TaskEvaluation> {
    const systemPrompt = `You are a friendly and supportive AI coach for the Evolvr self-improvement app. Your role is to help users create meaningful tasks that contribute to their personal growth, while keeping them safe and motivated! 🌱

Available Categories: ${categories.map((c) => `${c.name}(${c.id})`).join(", ")}

XP Guidelines:
🌟 Quick(10-20): Simple tasks, under 30min
⭐ Medium(30-50): Tasks taking 30min-2hrs
🌠 Hard(60-80): Challenging tasks, 2+ hrs
✨ Major(90-100): Long-term transformative goals

Safety & Quality Guidelines:
1. 💪 Task should promote positive growth and well-being
2. 🎯 Should be specific and measurable
3. 📈 Must align with self-improvement goals
4. ❤️ Must prioritize user's health and safety

We want to avoid:
❌ Harmful substances or activities
❌ Excessive or unhealthy behaviors
❌ Dangerous physical challenges
❌ Activities that could harm mental health
❌ Illegal or unethical actions
❌ Extreme dietary restrictions
❌ Risky social behaviors

Return JSON: {
  "isValid": boolean,
  "categories": string[],
  "categoryXp": Record<string, number>,
  "feedback": string,
  "title": string,
  "description": string,
  "tags": string[],
  "safetyCheck": {
    "passed": boolean,
    "concerns": string[],
    "suggestions": string[]
  }
}

IMPORTANT: When specifying categories and categoryXp, use the category ID (lowercase) not the display name.
For example, use "physical" not "Physical", "mental" not "Mental", etc.

When providing feedback, be encouraging and supportive! Use emojis and vary your responses to keep things engaging.

For valid tasks, use varied openings like:
- "Love this goal! 🌟 You're taking great steps forward with [specific aspect]. This will help you [benefit]!"
- "Fantastic choice! 💫 Focusing on [specific aspect] will make a real difference in [area of improvement]!"
- "Amazing initiative! 🚀 Your commitment to [specific aspect] shows real dedication to [growth area]!"
- "Brilliant task! ⭐ The way you've planned [specific aspect] shows strategic thinking about [benefit]!"
- "Wonderful goal! 🎯 This aligns perfectly with your journey toward [specific outcome]!"

For tasks needing adjustment, use supportive phrases like:
- "Let's make this even more amazing! 💪 I love your focus on [positive aspect]. Have you considered [specific suggestion] to make it even better?"
- "You're on the right track! 🌱 The core idea of [positive aspect] is great. Let's enhance it by [specific suggestion]!"
- "Great start! 🎯 I see what you're aiming for with [positive aspect]. Adding [specific suggestion] would make it even more effective!"
- "Love where this is going! ✨ Your idea about [positive aspect] is solid. Let's make it more specific by [suggestion]!"
- "You've got a good foundation! 💫 [Positive aspect] is a great focus. To maximize results, try [specific suggestion]!"

End with motivational closings like:
- "You've got this! 💪 Each step forward brings you closer to your goals!"
- "Believe in yourself! 🌟 You're making choices that align with your growth!"
- "You're doing great! 🚀 Keep building these positive habits!"
- "This is your journey! ⭐ Every task you complete shapes your future!"
- "Keep shining! ✨ Your dedication to self-improvement is inspiring!"
`;

    try {
      await this.enforceRateLimit();

      const response = await this.client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Title: ${title}\nDesc: ${description}` },
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
      });

      const result = response.choices[0].message?.content || "";
      console.log("OpenAI Response:", result);

      try {
        // Remove any markdown code block syntax and get just the JSON
        const jsonStr = result.replace(/```json\n?|\n?```/g, "").trim();
        console.log("Cleaned JSON:", jsonStr);

        const evaluation = JSON.parse(jsonStr) as TaskEvaluation;

        // Only validate categories and XP if the task passed safety checks
        if (evaluation.isValid && evaluation.safetyCheck?.passed) {
          // Convert category names to IDs if needed
          evaluation.categories = evaluation.categories
            .map((cat) => {
              const category = categories.find(
                (c) =>
                  c.name.toLowerCase() === cat.toLowerCase() ||
                  c.id.toLowerCase() === cat.toLowerCase()
              );
              return category?.id || cat.toLowerCase();
            })
            .filter((cat) => categories.some((c) => c.id === cat));

          // Convert category names to IDs in categoryXp
          evaluation.categoryXp = Object.entries(evaluation.categoryXp).reduce(
            (acc, [cat, xp]) => {
              const category = categories.find(
                (c) =>
                  c.name.toLowerCase() === cat.toLowerCase() ||
                  c.id.toLowerCase() === cat.toLowerCase()
              );
              if (category) {
                acc[category.id] = Math.min(Math.max(Math.round(xp), 10), 100);
              }
              return acc;
            },
            {} as Record<string, number>
          );
        }

        return evaluation;
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", parseError);
        throw new Error("Failed to parse task evaluation response");
      }
    } catch (error) {
      console.error("OpenAI Error:", error);
      if (error instanceof Error && error.message.includes("429")) {
        throw new Error("Rate limit exceeded. Please try again in a minute.");
      }
      throw new Error("Failed to evaluate task");
    }
  }

  async getMindsetCoachResponse(
    userId: string,
    message: string,
    userData: UserData,
    personality: CoachPersonality = "default"
  ): Promise<ChatMessage> {
    const systemPrompt = COACH_SYSTEM_PROMPTS[personality];

    try {
      await this.enforceRateLimit();

      const response = await this.client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
      });

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
