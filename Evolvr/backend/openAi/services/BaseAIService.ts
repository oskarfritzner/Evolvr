import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class BaseAIService {
  protected client: OpenAI;
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds minimum between requests

  constructor(apiKey?: string) {
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

  protected async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }

  protected async createChatCompletion(
    messages: ChatCompletionMessageParam[],
    options: {
      maxTokens?: number;
      temperature?: number;
      topP?: number;
    } = {}
  ) {
    await this.enforceRateLimit();

    return this.client.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 500,
      top_p: options.topP ?? 1,
    });
  }
}
