import OpenAI from "openai";
import { categories } from "@/constants/categories";

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
    const systemPrompt = `You are a task evaluator for the Evolvr self-improvement app. Evaluate tasks for quality, safety, and alignment with personal growth.

Available Categories: ${categories.map((c) => `${c.name}(${c.id})`).join(", ")}

XP Guidelines:
- Quick(10-20): Simple, under 30min
- Medium(30-50): 30min-2hrs
- Hard(60-80): 2+ hrs
- Major(90-100): Long-term goals

Safety & Quality Checks:
1. Task must be safe and healthy (no harmful activities)
2. Must promote positive growth (no destructive behaviors)
3. Should be specific and measurable
4. Must align with self-improvement
5. Should not involve:
   - Harmful substances or activities
   - Excessive or unhealthy behaviors
   - Dangerous physical challenges
   - Activities that could harm mental health
   - Illegal or unethical actions
   - Extreme dietary restrictions
   - Risky social behaviors

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

If the task fails safety checks, set isValid to false and provide constructive feedback for improvement.`;

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
          evaluation.categories = evaluation.categories.filter((cat) =>
            categories.some((c) => c.name === cat)
          );

          evaluation.categoryXp = Object.entries(evaluation.categoryXp)
            .filter(([cat]) => categories.some((c) => c.name === cat))
            .reduce(
              (acc, [cat, xp]) => ({
                ...acc,
                [cat]: Math.min(Math.max(Math.round(xp), 10), 100),
              }),
              {}
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
}
