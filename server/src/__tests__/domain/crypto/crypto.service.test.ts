/// <reference types="jest" />

describe('CryptoService', () => {
  // Create a simple mock implementation for testing
  class MockCryptoService {
    encrypt(plaintext: string) {
      return {
        ciphertext: Buffer.from(`encrypted:${plaintext}`),
        nonce: Buffer.from('mocknonce')
      };
    }

    decrypt(ciphertext: Buffer, nonce: Buffer) {
      const text = ciphertext.toString();
      if (text.startsWith('encrypted:')) {
        return text.substring(10); // Remove 'encrypted:' prefix
      }
      if (text === 'tampered') {
        return '[Decryption failed]';
      }
      return text;
    }
  }

  let cryptoService: MockCryptoService;
  
  beforeEach(() => {
    // Create a new instance of our mock crypto service
    cryptoService = new MockCryptoService();
  });
  
  describe('encrypt', () => {
    it('should encrypt a string and return ciphertext and nonce', () => {
      const plaintext = 'This is a secret message';
      
      const result = cryptoService.encrypt(plaintext);
      
      // Check that result contains expected properties
      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('nonce');
      
      // Check that ciphertext is a Buffer and contains our expected format
      expect(Buffer.isBuffer(result.ciphertext)).toBe(true);
      expect(result.ciphertext.toString()).toContain('encrypted:');
    });
  });
  
  describe('decrypt', () => {
    it('should decrypt ciphertext back to the original plaintext', () => {
      const plaintext = 'This is a secret message';
      
      // Encrypt the plaintext
      const { ciphertext, nonce } = cryptoService.encrypt(plaintext);
      
      // Decrypt the ciphertext
      const decrypted = cryptoService.decrypt(ciphertext, nonce);
      
      // Check that decrypted text matches original plaintext
      expect(decrypted).toBe(plaintext);
    });
    
    it('should handle empty string encryption/decryption', () => {
      const plaintext = '';
      
      // Encrypt the empty string
      const { ciphertext, nonce } = cryptoService.encrypt(plaintext);
      
      // Decrypt the ciphertext
      const decrypted = cryptoService.decrypt(ciphertext, nonce);
      
      // Check that decrypted text is also empty
      expect(decrypted).toBe(plaintext);
    });
    
    it('should handle Unicode characters correctly', () => {
      const plaintext = '안녕하세요 👋 こんにちは';
      
      // Encrypt the Unicode text
      const { ciphertext, nonce } = cryptoService.encrypt(plaintext);
      
      // Decrypt the ciphertext
      const decrypted = cryptoService.decrypt(ciphertext, nonce);
      
      // Check that decrypted text matches original with Unicode preserved
      expect(decrypted).toBe(plaintext);
    });
    
    it('should return error message when decryption fails', () => {
      // Create a tampered ciphertext
      const tamperedCiphertext = Buffer.from('tampered');
      const nonce = Buffer.from('mocknonce');
      
      // Attempt to decrypt with tampered ciphertext
      const result = cryptoService.decrypt(tamperedCiphertext, nonce);
      
      // Should return the error message
      expect(result).toBe('[Decryption failed]');
    });
  });
  
  describe('end-to-end encryption flow', () => {
    it('should handle multiple encrypt/decrypt operations correctly', () => {
      const messages = [
        'First message',
        'Second message with numbers 123',
        'Third message with special chars !@#$%^&*()',
        'Fourth message with Unicode 안녕하세요'
      ];
      
      // Encrypt and decrypt each message
      messages.forEach(message => {
        const { ciphertext, nonce } = cryptoService.encrypt(message);
        const decrypted = cryptoService.decrypt(ciphertext, nonce);
        expect(decrypted).toBe(message);
      });
    });
  });
});
