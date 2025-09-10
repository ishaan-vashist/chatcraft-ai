import { AiProvider, Message } from '../ai.service';

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openai.com/v1';
  private readonly model = 'gpt-4o-mini';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate a response using OpenAI's API
   */
  async generate(opts: {
    prompt: string;
    history: Message[];
    stream?: boolean;
    temperature?: number;
  }): Promise<{ text: string; latencyMs: number }> {
    const startTime = Date.now();

    try {
      // Prepare messages for the API
      const messages = this.prepareMessages(opts.prompt, opts.history);

      // Make API request
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: opts.temperature || 0.7,
          stream: opts.stream || false,
          max_tokens: 1024,
        }),
      });

      // Check for errors
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
      }

      // Handle response
      const result = await response.json() as {
        choices: Array<{
          message?: {
            content?: string;
          };
        }>;
      };
      const text = result.choices[0]?.message?.content || '';
      const latencyMs = Date.now() - startTime;

      return { text, latencyMs };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Prepare messages for the API
   */
  private prepareMessages(prompt: string, history: Message[]): any[] {
    // Start with a system message
    const messages = [
      {
        role: 'system',
        content: 'You are Relatim AI, a helpful assistant in a chat application. Be concise, friendly, and helpful.',
      },
    ];

    // Add history messages
    history.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Add the current prompt as a user message
    messages.push({
      role: 'user',
      content: prompt,
    });

    return messages;
  }
}
