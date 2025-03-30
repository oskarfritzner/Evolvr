import { BaseAIService } from "./BaseAIService";
import { categories } from "@/constants/categories";
import { TaskEvaluation } from "../types/TaskEvaluation";

export class TaskEvaluationService extends BaseAIService {
  private readonly systemPrompt = `You are a friendly and supportive AI coach for the Evolvr self-improvement app. Your role is to help users create meaningful tasks that contribute to their personal growth, while keeping them safe and motivated! 🌱

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

  async evaluateTask(
    title: string,
    description: string
  ): Promise<TaskEvaluation> {
    try {
      const response = await this.createChatCompletion([
        { role: "system", content: this.systemPrompt },
        { role: "user", content: `Title: ${title}\nDesc: ${description}` },
      ]);

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
            .map((cat: string) => {
              const category = categories.find(
                (c) =>
                  c.name.toLowerCase() === cat.toLowerCase() ||
                  c.id.toLowerCase() === cat.toLowerCase()
              );
              return category?.id || cat.toLowerCase();
            })
            .filter((cat: string) => categories.some((c) => c.id === cat));

          // Convert category names to IDs in categoryXp
          evaluation.categoryXp = Object.entries(evaluation.categoryXp).reduce(
            (acc, [cat, xp]) => {
              const category = categories.find(
                (c) =>
                  c.name.toLowerCase() === cat.toLowerCase() ||
                  c.id.toLowerCase() === cat.toLowerCase()
              );
              if (category) {
                acc[category.id] = Math.min(
                  Math.max(Math.round(Number(xp)), 10),
                  100
                );
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
}
