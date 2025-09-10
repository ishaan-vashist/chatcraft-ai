import crypto from 'crypto';
import env from '../../config/env';

/**
 * Encryption service for message content using AES-256-GCM
 */
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    // Convert hex key to Buffer
    this.key = Buffer.from(env.encryption.keyHex, 'hex');
    
    // Validate key length (32 bytes for AES-256)
    if (this.key.length !== 32) {
      throw new Error('Invalid encryption key length. Must be 32 bytes (64 hex characters)');
    }
  }

  /**
   * Encrypt a string using AES-256-GCM
   * @param plaintext The text to encrypt
   * @returns Object containing ciphertext and nonce
   */
  encrypt(plaintext: string): { ciphertext: Buffer; nonce: Buffer } {
    // Generate a random nonce (12 bytes is recommended for GCM)
    const nonce = crypto.randomBytes(12);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.key, nonce);
    
    // Encrypt the plaintext
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    
    // Return ciphertext and nonce
    return {
      ciphertext,
      nonce,
    };
  }

  /**
   * Decrypt a ciphertext using AES-256-GCM
   * @param ciphertext The encrypted data
   * @param nonce The nonce used for encryption
   * @returns Decrypted plaintext
   */
  decrypt(ciphertext: Buffer, nonce: Buffer): string {
    try {
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, nonce);
      
      // Decrypt the ciphertext
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      
      // Return plaintext as string
      return plaintext.toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Decryption failed]';
    }
  }
}

// Export singleton instance
export const cryptoService = new CryptoService();
