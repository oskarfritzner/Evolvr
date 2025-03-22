import { AzureOpenAI } from "openai";

const client = new AzureOpenAI({
  apiKey:
    "LWJOTNvZYzqqVOoLH7WZvJ4qVpUW7O4qWudJQzGjrweCAzpwVXQ2JQQJ99BCACfhMk5XJ3w3AAAAACOGpr6A",
  endpoint: "https://osfr0-m8kph947-swedencentral.cognitiveservices.azure.com",
  deployment: "gpt-4",
  apiVersion: "2024-02-01",
});

async function testAzureConnection() {
  try {
    console.log("Testing Azure OpenAI connection with configuration:", {
      endpoint:
        "https://osfr0-m8kph947-swedencentral.cognitiveservices.azure.com",
      deploymentName: "gpt-4",
      modelVersion: "turbo-2024-04-09",
    });

    const response = await client.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: "Hi" }],
      temperature: 0.7,
      max_tokens: 100,
      top_p: 1,
    });

    console.log("Response:", response.choices[0].message);
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

testAzureConnection();
