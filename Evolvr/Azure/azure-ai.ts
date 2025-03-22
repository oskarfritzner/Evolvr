import { AzureOpenAI } from "openai";
import { categories } from "@/constants/categories";

// Configuration object with deployment-specific settings
const AZURE_CONFIG = {
  apiKey:
    "LWJOTNvZYzqqVOoLH7WZvJ4qVpUW7O4qWudJQzGjrweCAzpwVXQ2JQQJ99BCACfhMk5XJ3w3AAAAACOGpr6A",
  endpoint: "https://osfr0-m8kph947-swedencentral.cognitiveservices.azure.com",
  deployment: "gpt-4",
  apiVersion: "2024-02-01",
};

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

class AzureAIService {
  private client: AzureOpenAI;
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds minimum between requests

  constructor() {
    this.client = new AzureOpenAI(AZURE_CONFIG);
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
        model: AZURE_CONFIG.deployment,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Title: ${title}\nDesc: ${description}` },
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
      });

      const result = response.choices[0].message?.content || "";
      const evaluation = JSON.parse(result) as TaskEvaluation;

      // Only validate categories and XP if the task passed safety checks
      if (evaluation.isValid && evaluation.safetyCheck?.passed) {
        evaluation.categories = evaluation.categories.filter((cat) =>
          categories.some((c) => c.id === cat)
        );

        evaluation.categoryXp = Object.entries(evaluation.categoryXp)
          .filter(([cat]) => categories.some((c) => c.id === cat))
          .reduce(
            (acc, [cat, xp]) => ({
              ...acc,
              [cat]: Math.min(Math.max(Math.round(xp), 10), 100),
            }),
            {}
          );
      }

      return evaluation;
    } catch (error) {
      console.error("Azure OpenAI Error:", error);
      if (error instanceof Error && error.message.includes("429")) {
        throw new Error("Rate limit exceeded. Please try again in a minute.");
      }
      throw new Error("Failed to evaluate task");
    }
  }
}

export const azureAIService = new AzureAIService();
