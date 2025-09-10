import env from '../../config/env';
import { OpenAIProvider } from './providers/openai';

// Define message history type
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Define AI provider interface
export interface AiProvider {
  generate(opts: {
    prompt: string;
    history: Message[];
    stream?: boolean;
    temperature?: number;
  }): Promise<{ text: string; latencyMs: number }>;
}

// Define generation options
export interface GenerateOptions {
  prompt: string;
  history?: Message[];
  stream?: boolean;
  temperature?: number;
  maxHistoryLength?: number;
}

/**
 * AI service for generating responses using OpenAI
 */
export class AiService {
  private provider: AiProvider;
  private readonly MAX_HISTORY_LENGTH = 10;
  private readonly TIMEOUT_MS = 8000;
  private readonly FALLBACK_MESSAGE = "I didn't catch that—could you rephrase?";

  constructor() {
    // Initialize OpenAI provider
    this.provider = this.initializeProvider();
  }

  /**
   * Generate a response using OpenAI
   */
  async generateResponse(options: GenerateOptions): Promise<{ text: string; latencyMs: number }> {
    try {
      // Prepare history
      const history = this.prepareHistory(options.history || []);

      // Set timeout for generation
      const timeoutPromise = new Promise<{ text: string; latencyMs: number }>((_, reject) => {
        setTimeout(() => {
          reject(new Error('AI response generation timed out'));
        }, this.TIMEOUT_MS);
      });

      // Generate response with timeout
      const result = await Promise.race([
        this.provider.generate({
          prompt: options.prompt,
          history,
          stream: options.stream || false,
          temperature: options.temperature || 0.7,
        }),
        timeoutPromise,
      ]);

      return result;
    } catch (error) {
      console.error('AI generation error:', error);
      
      // Return fallback message
      return {
        text: this.FALLBACK_MESSAGE,
        latencyMs: 0,
      };
    }
  }

  /**
   * Initialize the OpenAI provider
   */
  private initializeProvider(): AiProvider {
    if (!env.ai.openaiApiKey) {
      throw new Error('OPENAI_API_KEY not provided');
    }
    return new OpenAIProvider(env.ai.openaiApiKey);
  }

  /**
   * Prepare and sanitize message history
   */
  private prepareHistory(history: Message[]): Message[] {
    // Limit history length
    const limitedHistory = history.slice(-this.MAX_HISTORY_LENGTH);
    
    // Sanitize messages (remove PII)
    return limitedHistory.map(message => ({
      role: message.role,
      content: this.sanitizeContent(message.content),
    }));
  }

  /**
   * Sanitize message content to remove PII
   */
  private sanitizeContent(content: string): string {
    // Simple regex patterns to redact common PII
    // In a production app, this would be more sophisticated
    
    // Redact email addresses
    let sanitized = content.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
    
    // Redact phone numbers (simple pattern)
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
    
    // Redact credit card numbers (simple pattern)
    sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CREDIT_CARD]');
    
    return sanitized;
  }
}

// Export singleton instance
export const aiService = new AiService();
