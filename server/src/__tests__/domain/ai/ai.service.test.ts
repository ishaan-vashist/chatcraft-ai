// Mock modules first
jest.mock('../../../config/env', () => {
  return {
    __esModule: true,
    default: {
      ai: {
        openaiApiKey: 'test-api-key'
      }
    }
  };
});

// Mock the actual env module for specific tests
const mockEnvModule = jest.requireActual('../../../config/env');


jest.mock('../../../domain/ai/providers/openai');

// Import after mocks
import mockEnv from '../../utils/env-mock';
import { AiService, Message } from '../../../domain/ai/ai.service';
import { OpenAIProvider } from '../../../domain/ai/providers/openai';

describe('AiService', () => {
  let aiService: AiService;
  let mockOpenAIProvider: jest.Mocked<OpenAIProvider>;
  
  // Mock environment setup
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup environment
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: 'test-api-key'
    };
    
    // Mock OpenAI provider
    mockOpenAIProvider = new OpenAIProvider('') as jest.Mocked<OpenAIProvider>;
    (OpenAIProvider as jest.Mock).mockImplementation(() => mockOpenAIProvider);
    
    // Create service instance
    aiService = new AiService();
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('constructor', () => {
    it('should initialize with OpenAI provider', () => {
      expect(OpenAIProvider).toHaveBeenCalledWith('test-api-key');
    });
    
    it('should throw error if OpenAI API key is not provided', () => {
      // Mock the env module to return undefined for openaiApiKey
      jest.resetModules();
      
      // Save original module
      const originalModule = jest.requireMock('../../../config/env');
      
      // Override the mock for this test
      jest.doMock('../../../config/env', () => ({
        __esModule: true,
        default: {
          ai: {
            openaiApiKey: undefined
          }
        }
      }), { virtual: true });
      
      // Re-import the AiService to use the new mock
      const { AiService } = require('../../../domain/ai/ai.service');
      
      // Should throw when creating service
      expect(() => new AiService()).toThrow('OPENAI_API_KEY not provided');
      
      // Restore original mock
      jest.doMock('../../../config/env', () => originalModule, { virtual: true });
    });
  });
  
  describe('generateResponse', () => {
    const mockPrompt = 'Hello, how are you?';
    const mockHistory: Message[] = [
      { role: 'user', content: 'Hi there' },
      { role: 'assistant', content: 'Hello! How can I help you?' }
    ];
    
    it('should generate response successfully', async () => {
      // Mock provider response
      const mockResponse = { text: 'I am doing well, thank you!', latencyMs: 500 };
      mockOpenAIProvider.generate.mockResolvedValue(mockResponse);
      
      // Call generateResponse
      const result = await aiService.generateResponse({ prompt: mockPrompt, history: mockHistory });
      
      // Verify provider was called with correct parameters
      expect(mockOpenAIProvider.generate).toHaveBeenCalledWith({
        prompt: mockPrompt,
        history: mockHistory.slice(-10), // Default MAX_HISTORY_LENGTH is 10
        stream: false,
        temperature: 0.7
      });
      
      // Verify result
      expect(result).toEqual(mockResponse);
    });
    
    it('should handle provider errors', async () => {
      // Mock provider error (without timeout)
      mockOpenAIProvider.generate.mockRejectedValue(new Error('API error'));
      
      // Call generateResponse
      const result = await aiService.generateResponse({ prompt: mockPrompt });
      
      // Verify fallback message is returned
      expect(result).toEqual({
        text: "I didn't catch that—could you rephrase?",
        latencyMs: 0
      });
    });
    
    it('should handle provider errors', async () => {
      // Mock provider error
      mockOpenAIProvider.generate.mockRejectedValue(new Error('API error'));
      
      // Call generateResponse
      const result = await aiService.generateResponse({ prompt: mockPrompt });
      
      // Verify fallback message is returned
      expect(result).toEqual({
        text: "I didn't catch that—could you rephrase?",
        latencyMs: 0
      });
    });
    
    it('should limit history length', async () => {
      // Create history with more than MAX_HISTORY_LENGTH items
      const longHistory: Message[] = Array(15).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`
      }));
      
      // Mock provider response
      mockOpenAIProvider.generate.mockResolvedValue({ text: 'Response', latencyMs: 100 });
      
      // Call generateResponse
      await aiService.generateResponse({ prompt: mockPrompt, history: longHistory });
      
      // Verify only the last 10 messages were passed to the provider
      const calledHistory = mockOpenAIProvider.generate.mock.calls[0][0].history;
      expect(calledHistory.length).toBe(10);
      expect(calledHistory[0].content).toBe('Message 6');
      expect(calledHistory[9].content).toBe('Message 15');
    });
    
    it('should sanitize content to remove PII', async () => {
      // Create history with PII
      const historyWithPII: Message[] = [
        { role: 'user', content: 'My email is user@example.com' },
        { role: 'assistant', content: 'I will not store your email' },
        { role: 'user', content: 'My phone number is 123-456-7890' },
        { role: 'user', content: 'My credit card is 1234 5678 9012 3456' }
      ];
      
      // Mock provider response
      mockOpenAIProvider.generate.mockResolvedValue({ text: 'Response', latencyMs: 100 });
      
      // Call generateResponse
      await aiService.generateResponse({ prompt: mockPrompt, history: historyWithPII });
      
      // Verify PII was sanitized
      const calledHistory = mockOpenAIProvider.generate.mock.calls[0][0].history;
      expect(calledHistory[0].content).toBe('My email is [EMAIL]');
      expect(calledHistory[2].content).toBe('My phone number is [PHONE]');
      expect(calledHistory[3].content).toBe('My credit card is [CREDIT_CARD]');
    });
    
    it('should use provided temperature', async () => {
      // Mock provider response
      mockOpenAIProvider.generate.mockResolvedValue({ text: 'Response', latencyMs: 100 });
      
      // Call generateResponse with custom temperature
      await aiService.generateResponse({ 
        prompt: mockPrompt,
        temperature: 0.3
      });
      
      // Verify temperature was passed to provider
      expect(mockOpenAIProvider.generate).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.3 })
      );
    });
    
    it('should handle streaming option', async () => {
      // Mock provider response
      mockOpenAIProvider.generate.mockResolvedValue({ text: 'Response', latencyMs: 100 });
      
      // Call generateResponse with streaming enabled
      await aiService.generateResponse({ 
        prompt: mockPrompt,
        stream: true
      });
      
      // Verify stream option was passed to provider
      expect(mockOpenAIProvider.generate).toHaveBeenCalledWith(
        expect.objectContaining({ stream: true })
      );
    });
  });
  
  describe('sanitizeContent', () => {
    it('should redact email addresses', () => {
      // Create service instance with access to private method
      const service = new AiService();
      const sanitizeContent = (service as any).sanitizeContent.bind(service);
      
      // Test email redaction
      const result = sanitizeContent('Contact me at user@example.com or admin@test.co.uk');
      expect(result).toBe('Contact me at [EMAIL] or [EMAIL]');
    });
    
    it('should redact phone numbers', () => {
      // Create service instance with access to private method
      const service = new AiService();
      const sanitizeContent = (service as any).sanitizeContent.bind(service);
      
      // Test phone number redaction
      const result = sanitizeContent('Call me at 123-456-7890 or 987.654.3210');
      expect(result).toBe('Call me at [PHONE] or [PHONE]');
    });
    
    it('should redact credit card numbers', () => {
      // Create service instance with access to private method
      const service = new AiService();
      const sanitizeContent = (service as any).sanitizeContent.bind(service);
      
      // Test credit card redaction
      const result = sanitizeContent('Payment with 1234 5678 9012 3456 or 1234-5678-9012-3456');
      expect(result).toBe('Payment with [CREDIT_CARD] or [CREDIT_CARD]');
    });
    
    it('should handle multiple types of PII in one string', () => {
      // Create service instance with access to private method
      const service = new AiService();
      const sanitizeContent = (service as any).sanitizeContent.bind(service);
      
      // Test multiple PII types
      const result = sanitizeContent(
        'Contact: user@example.com, 123-456-7890, card: 1234 5678 9012 3456'
      );
      expect(result).toBe(
        'Contact: [EMAIL], [PHONE], card: [CREDIT_CARD]'
      );
    });
    
    it('should not modify strings without PII', () => {
      // Create service instance with access to private method
      const service = new AiService();
      const sanitizeContent = (service as any).sanitizeContent.bind(service);
      
      // Test string without PII
      const input = 'This is a normal message without any PII';
      const result = sanitizeContent(input);
      expect(result).toBe(input);
    });
  });
});
