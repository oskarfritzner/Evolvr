import { config } from "dotenv";
import { resolve } from "path";
import { AIService } from "../aiService";

// Load environment variables from .env file
const envPath = resolve(__dirname, "../../../.env");
console.log("Loading .env file from:", envPath);
config({ path: envPath });

// Create a new instance of AIService with the API key
const aiService = new AIService(
  "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"
);

// Debug environment variables
console.log("Environment variables loaded:");
console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Set" : "Not set");
console.log(
  "EXPO_PUBLIC_OPENAI_API_KEY:",
  process.env.EXPO_PUBLIC_OPENAI_API_KEY ? "Set" : "Not set"
);
console.log(
  "Available env vars:",
  Object.keys(process.env).filter((key) => key.includes("OPENAI"))
);

async function testTaskEvaluator() {
  try {
    console.log("\nTesting Task Evaluator...\n");

    const sampleTask = {
      title: "30-Day Meditation Challenge",
      description:
        "Complete a 10-minute meditation session every morning for 30 days. Track your progress in a journal, noting any improvements in focus and stress levels. Use a meditation app like Headspace or Calm for guidance.",
    };

    console.log("Sample Task:");
    console.log("Title:", sampleTask.title);
    console.log("Description:", sampleTask.description);
    console.log("\nEvaluating task...\n");

    const evaluation = await aiService.evaluateTask(
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
