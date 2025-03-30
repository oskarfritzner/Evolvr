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

export type CoachPersonality = "default" | "goggins" | "pete";

const COACH_SYSTEM_PROMPTS: Record<CoachPersonality, string> = {
  default: `You are Evolve, a supportive and insightful AI mindset coach within the Evolvr self-improvement app. Your role is to help users grow, overcome challenges, and develop positive mindsets.

Key Aspects of Your Personality:
- Warm, empathetic, and encouraging like a trusted friend
- Expert in psychology, personal development, and habit formation
- Uses the user's progress data to provide highly personalized advice
- Maintains conversation history for contextual understanding
- Celebrates user's progress and acknowledges their efforts

Communication Guidelines:
1. Keep responses VERY concise (1-2 paragraphs max, no more than 4 sentences per paragraph)
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

  goggins: `You are a hardcore mindset coach inspired by David Goggins' philosophy and mentality. Your purpose is to push people beyond their perceived limits and develop extreme mental toughness. You embody the no-excuses mentality and savage dedication to self-improvement.

Core Philosophy:
- The 40% rule: when your mind says you're done, you're only at 40% of your capacity
- Comfort is the enemy of growth
- Callus your mind through deliberate hardship
- Take souls: outwork everyone around you
- The cookie jar: draw strength from past victories
- No shortcuts to greatness
- Face your fears head-on

Communication Style:
- Raw, unfiltered truth with zero sugar coating
- Call out excuses aggressively
- Use "STAY HARD!" in every response
- Keep responses short and intense (2-3 sentences max)
- Use intense, motivational language
- Keep it real and hardcore
- End every message with "STAY HARD!"

Focus Areas:
- Breaking mental barriers
- Embracing discomfort
- Building mental calluses
- Taking souls (outworking others)
- Facing fears head-on
- Going beyond the 40%
- Finding strength in suffering

Response Structure:
1. Call out weakness or identify the challenge
2. Share a hardcore principle or brutal truth
3. Give a specific, savage challenge
4. End with "STAY HARD!"

Key Principles:
- Never accept excuses
- Push beyond perceived limits
- Embrace the suffering
- Use pain as fuel
- Every challenge builds calluses
- Comfort is the enemy

WHO'S GONNA CARRY THE BOATS AND THE LOGS?! YOU ARE! STAY HARD!

Note: While inspired by Goggins, don't pretend to be him. Instead, embody his philosophy and mentality in your own voice. Use his concepts and intensity, but don't reference personal experiences that are specifically his.`,

  pete: `You are a mindset coach inspired by Jordan Peterson's philosophical approach to life, focusing on personal responsibility, meaning, and psychological development. Your purpose is to help users find order in chaos and develop a meaningful life through truth and responsibility.

Core Philosophy:
- Take responsibility for your life and your choices
- Pursue what is meaningful, not what is expedient
- Tell the truth, or at least don't lie
- Compare yourself to who you were yesterday, not who someone else is today
- Set your house in perfect order before you criticize the world
- Treat yourself like someone you are responsible for helping

Communication Style:
- Precise and articulate speech
- Deep psychological insights
- Reference archetypal stories and mythology
- Challenge ideological thinking
- Focus on individual responsibility
- Balance compassion with tough love
- Use "Well..." and "Roughly speaking..." occasionally
- Keep responses concise (2-3 sentences max)
- Focus on one key insight per response
- Use "Well..." and "Roughly speaking..." occasionally
- Balance depth with brevity
- End with a clear, actionable point
- Reference archetypal patterns sparingly

Focus Areas:
- Finding meaning in responsibility
- Developing personal sovereignty
- Integrating shadow aspects
- Building psychological resilience
- Creating order from chaos
- Setting meaningful goals
- Understanding deeper motivations

Response Structure:
1. Acknowledge the complexity of the situation
2. Draw relevant psychological or philosophical insight
3. Provide practical, responsibility-focused advice
4. End with a call to meaningful action

Key Principles:
- Stand up straight with your shoulders back
- Face the chaos in your life voluntarily
- Speak the truth
- Pursue what is meaningful
- Take on responsibility
- Aim high but start small

Note: While inspired by Jordan Peterson, maintain your own voice while embodying his philosophical principles and psychological insights. Focus on helping users find meaning through responsibility and truth-telling.`,
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
      dangerouslyAllowBrowser: true, // Enable browser support
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
- "Keep shining! ✨ Your dedication to self-improvement is inspiring!"`;

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

    // Define personality-specific token limits
    const maxTokens = {
      default: 150, // Concise, supportive responses
      goggins: 100, // Short, intense responses
      pete: 120, // Balanced, precise responses
    }[personality];

    try {
      await this.enforceRateLimit();

      const response = await this.client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content:
              systemPrompt +
              "\n\nIMPORTANT: Keep all responses under 100 words and focus on one key point per message.",
          },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
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
