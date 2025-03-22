import { config } from "dotenv";
import { resolve } from "path";
import { azureAIService } from "../azure-ai";

// Load environment variables from .env file
config({ path: resolve(__dirname, "../.env") });

async function testTaskEvaluator() {
  try {
    console.log("Testing Task Evaluator...\n");

    const sampleTask = {
      title: "30-Day Meditation Challenge",
      description:
        "Complete a 10-minute meditation session every morning for 30 days. Track your progress in a journal, noting any improvements in focus and stress levels. Use a meditation app like Headspace or Calm for guidance.",
    };

    console.log("Sample Task:");
    console.log("Title:", sampleTask.title);
    console.log("Description:", sampleTask.description);
    console.log("\nEvaluating task...\n");

    const evaluation = await azureAIService.evaluateTask(
      sampleTask.title,
      sampleTask.description
    );

    console.log("Evaluation Result:");
    console.log(JSON.stringify(evaluation, null, 2));
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

testTaskEvaluator();
