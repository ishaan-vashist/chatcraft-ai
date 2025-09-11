import crypto from 'crypto';
import env from '../../config/env';

/**
  /**
  /**
   * Encryption service for message content using AES-256-CBC
   */
export class CryptoService {
  private readonly algorithm = 'aes-256-cbc';
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
   * Encrypt a string using AES-256-CBC
   * @param plaintext The text to encrypt
   * @returns Object containing ciphertext and IV
   */
  encrypt(plaintext: string): { ciphertext: Buffer; nonce: Buffer } {
    try {
      // Generate a random IV (16 bytes for CBC)
      const nonce = crypto.randomBytes(16);
      
      // Validate IV length
      if (nonce.length !== 16) {
        throw new Error(`Invalid IV length: ${nonce.length}, expected 16 bytes`);
      }
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, nonce);
      
      // Encrypt the plaintext
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      
      // Return ciphertext and IV (nonce)
      return {
        ciphertext,
        nonce
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a ciphertext using AES-256-CBC
   * @param ciphertext The encrypted data
   * @param nonce The IV used for encryption
   * @returns Decrypted plaintext
   */
  decrypt(ciphertext: Buffer, nonce: Buffer): string {
    try {
      // Validate inputs
      if (!Buffer.isBuffer(ciphertext) || ciphertext.length === 0) {
        throw new Error('Invalid ciphertext: must be a non-empty Buffer');
      }
      
      if (!Buffer.isBuffer(nonce)) {
        throw new Error('Invalid nonce: must be a Buffer');
      }
      
      // Validate IV length for AES-CBC (must be 16 bytes)
      if (nonce.length !== 16) {
        throw new Error(`Invalid IV length: ${nonce.length}, expected 16 bytes`);
      }
      
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
