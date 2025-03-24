import { config } from "dotenv";
import { resolve } from "path";
import { AIService } from "../aiService";

// Initialize AIService with environment variable
const aiService = new AIService();

// Load environment variables from .env file
config();

async function testUserGeneratedTask() {
  try {
    console.log("Testing Task Creation...\n");

    const testTask = {
      title: "Create a balanced meal plan",
      description:
        "Plan and prepare healthy dinners for the week, including vegetables, lean proteins, and whole grains. Track portions and meal times in a food journal.",
    };

    console.log("Creating task:");
    console.log("Title:", testTask.title);
    console.log("Description:", testTask.description);
    console.log("\nProcessing...\n");

    // First, evaluate the task
    const evaluation = await aiService.evaluateTask(
      testTask.title,
      testTask.description
    );

    console.log("Evaluation Result:");
    console.log(JSON.stringify(evaluation, null, 2));

    // Simulate task creation
    if (evaluation.isValid && evaluation.safetyCheck?.passed) {
      const task = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: evaluation.title,
        description: evaluation.description,
        categories: evaluation.categories,
        categoryXp: evaluation.categoryXp,
        tags: evaluation.tags,
        completed: false,
        status: "PENDING",
      };

      console.log("\nTask would be created with:");
      console.log("Task ID:", task.id);
      console.log("Categories:", task.categories);
      console.log("XP Awards:", task.categoryXp);
      console.log("Tags:", task.tags);
    } else {
      console.log("\nTask creation failed!");
      console.log("Feedback:", evaluation.feedback);
      if (evaluation.safetyCheck) {
        console.log("\nSafety Check Failed!");
        console.log("Concerns:", evaluation.safetyCheck.concerns);
        console.log("Suggestions:", evaluation.safetyCheck.suggestions);
      }
    }
  } catch (error) {
    console.error("Test failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    }
  }
}

testUserGeneratedTask();
