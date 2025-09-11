# ChatCraft Backend Implementation Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Authentication](#authentication)
6. [Message Encryption](#message-encryption)
7. [Error Handling](#error-handling)
8. [Testing](#testing)
9. [Environment Configuration](#environment-configuration)
10. [Deployment](#deployment)

## Overview

ChatCraft is a secure messaging platform built with Node.js, TypeScript, and PostgreSQL. The application provides real-time chat functionality with end-to-end encryption for message content, user authentication, and contact management.

### Key Features
- User registration and authentication
- Secure messaging with end-to-end encryption
- Conversation management
- Contact management
- User metrics

## Architecture

The backend follows a modular architecture organized by domain:

```
server/
├── prisma/             # Database schema and migrations
├── src/
│   ├── app.ts          # Express application setup
│   ├── server.ts       # Server entry point
│   ├── config/         # Configuration files
│   ├── domain/         # Domain-specific modules
│   │   ├── ai/         # AI service for chat assistance
│   │   ├── auth/       # Authentication services
│   │   ├── contacts/   # Contact management
│   │   ├── conversations/ # Conversation management
│   │   ├── crypto/     # Encryption services
│   │   ├── messages/   # Message handling
│   │   └── users/      # User management
│   └── middleware/     # Express middleware
└── __tests__/          # Test files
```

### Domain-Driven Design

The application follows domain-driven design principles, with each domain having its own:
- Service: Business logic implementation
- Controller: Request handling and response formatting
- Routes: API endpoint definitions
- Types: TypeScript type definitions

## Database Schema

The database uses PostgreSQL with Prisma as the ORM. Key models include:

### User
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String?
  passwordHash  String
  createdAt     DateTime @default(now())
  participants  ConversationParticipant[]
  messages      Message[] @relation("UserMessages")
}
```

### Conversation
```prisma
model Conversation {
  id             String   @id @default(uuid())
  isGroup        Boolean  @default(false)
  retentionDays  Int      @default(30)
  createdAt      DateTime @default(now())
  participants   ConversationParticipant[]
  messages       Message[]
  @@index([createdAt])
}
```

### ConversationParticipant
```prisma
model ConversationParticipant {
  id             String @id @default(uuid())
  conversationId String
  userId         String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  user           User         @relation(fields: [userId], references: [id])
  @@unique([conversationId, userId])
  @@index([userId])
}
```

### Message
```prisma
model Message {
  id             String   @id @default(uuid())
  conversationId String
  senderId       String
  type           String   @default("text")
  // encrypted payload
  ciphertext     Bytes
  nonce          Bytes
  createdAt      DateTime @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  sender         User         @relation("UserMessages", fields: [senderId], references: [id])
  @@index([conversationId, createdAt(sort: Desc)])
}
```

## API Endpoints

### Authentication Endpoints

#### Register a New User
- **Method**: `POST`
- **URL**: `/api/auth/register`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "Test User"
  }
  ```
- **Response**: `201 Created` with user object and JWT token cookie

#### Login
- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123"
  }
  ```
- **Response**: `200 OK` with user object and JWT token cookie

#### Get Current User
- **Method**: `GET`
- **URL**: `/api/auth/me`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `200 OK` with user object

#### Logout
- **Method**: `POST`
- **URL**: `/api/auth/logout`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `200 OK` with success message

### User Endpoints

#### Get User by ID
- **Method**: `GET`
- **URL**: `/api/users/{userId}`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `200 OK` with user object

#### Update User
- **Method**: `PATCH`
- **URL**: `/api/users`
- **Headers**: `Authorization: Bearer {token}`
- **Body**:
  ```json
  {
    "name": "Updated Name"
  }
  ```
- **Response**: `200 OK` with updated user object

### Conversation Endpoints

#### Get All Conversations
- **Method**: `GET`
- **URL**: `/api/conversations`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `200 OK` with array of conversations

#### Create New Conversation
- **Method**: `POST`
- **URL**: `/api/conversations`
- **Headers**: `Authorization: Bearer {token}`
- **Body**:
  ```json
  {
    "participantUserId": "{userId}"
  }
  ```
- **Response**: `201 Created` with conversation object

#### Get Conversation by ID
- **Method**: `GET`
- **URL**: `/api/conversations/{conversationId}`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `200 OK` with conversation object

### Messages Endpoints

#### Get Messages for a Conversation
- **Method**: `GET`
- **URL**: `/api/conversations/{conversationId}/messages`
- **Headers**: `Authorization: Bearer {token}`
- **Query Parameters**:
  - `limit`: Maximum number of messages to return
  - `before`: ISO timestamp for pagination
- **Response**: `200 OK` with array of messages

#### Create New Message
- **Method**: `POST`
- **URL**: `/api/conversations/{conversationId}/messages`
- **Headers**: `Authorization: Bearer {token}`
- **Body**:
  ```json
  {
    "content": "Hello, this is a test message!"
  }
  ```
- **Response**: `201 Created` with message object

### Contacts Endpoints

#### Get All Contacts
- **Method**: `GET`
- **URL**: `/api/contacts`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `200 OK` with array of contacts

#### Add New Contact
- **Method**: `POST`
- **URL**: `/api/contacts`
- **Headers**: `Authorization: Bearer {token}`
- **Body**:
  ```json
  {
    "contactEmail": "contact@example.com",
    "alias": "Optional Contact Name"
  }
  ```
- **Response**: `201 Created` with contact object

### Metrics Endpoints

#### Get User Metrics
- **Method**: `GET`
- **URL**: `/api/metrics`
- **Headers**: `Authorization: Bearer {token}`
- **Response**: `200 OK` with metrics object

## Authentication

Authentication is implemented using JSON Web Tokens (JWT):

1. **Token Generation**: When a user registers or logs in, a JWT is generated using the `jsonwebtoken` library.
2. **Token Storage**: The token is stored as an HTTP-only cookie for security.
3. **Token Verification**: Protected routes use middleware to verify the token.

### JWT Secret

The JWT secret is stored in the environment variables as `JWT_SECRET`. This should be a secure, random string in production.

### Authentication Middleware

```typescript
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authentication required');
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret);
    
    // Add user to request object
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }
};
```

## Message Encryption

Messages are encrypted using AES-256-CBC encryption to ensure privacy:

### Encryption Process

1. **Key Management**: A 32-byte (256-bit) encryption key is stored as a hex string in environment variables.
2. **Encryption**: When a message is sent, the content is encrypted with a random 16-byte initialization vector (IV).
3. **Storage**: The ciphertext and IV are stored in the database.
4. **Decryption**: When messages are retrieved, they are decrypted using the stored IV.

### CryptoService Implementation

```typescript
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
```

### Robust Error Handling in Message Decryption

The MessagesService implements robust error handling for decryption:

```typescript
content: (() => {
  try {
    // Ensure nonce is properly formatted - must be exactly 16 bytes for AES-CBC
    let nonceBuffer: Buffer;
    if (Buffer.isBuffer(message.nonce)) {
      nonceBuffer = message.nonce;
    } else {
      try {
        nonceBuffer = Buffer.from(typeof message.nonce === 'string' 
          ? message.nonce 
          : Buffer.from(message.nonce).toString('base64'), 'base64');
      } catch (e) {
        console.error('Failed to convert nonce to buffer:', e);
        return '[Decryption failed: Invalid nonce format]';
      }
    }
    
    // Validate nonce length
    if (nonceBuffer.length !== 16) {
      console.error(`Invalid nonce length: ${nonceBuffer.length}, expected 16 bytes`);
      return '[Decryption failed: Invalid nonce length]';
    }
    
    // Prepare ciphertext buffer
    let ciphertextBuffer: Buffer;
    if (Buffer.isBuffer(message.ciphertext)) {
      ciphertextBuffer = message.ciphertext;
    } else {
      try {
        ciphertextBuffer = Buffer.from(typeof message.ciphertext === 'string' 
          ? message.ciphertext 
          : Buffer.from(message.ciphertext).toString('base64'), 'base64');
      } catch (e) {
        console.error('Failed to convert ciphertext to buffer:', e);
        return '[Decryption failed: Invalid ciphertext format]';
      }
    }
    
    return cryptoService.decrypt(ciphertextBuffer, nonceBuffer);
  } catch (error) {
    console.error('Message decryption error:', error);
    return '[Decryption failed]';
  }
})()
```

## Error Handling

The application implements a standardized error handling approach:

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [] // Optional additional details
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired token
- `VALIDATION_ERROR`: Invalid input data
- `USER_EXISTS`: User with this email already exists
- `USER_NOT_FOUND`: User not found
- `INVALID_CREDENTIALS`: Invalid email or password
- `CONVERSATION_NOT_FOUND`: Conversation not found
- `NOT_PARTICIPANT`: User is not a participant in the conversation
- `CONTACT_EXISTS`: Contact already exists

### Validation

Input validation is performed using the Zod library, which provides runtime type checking and validation:

```typescript
// Create contact schema
export const createContactSchema = z.object({
  contactEmail: z.string().email('Invalid email address'),
  alias: z.string().optional(),
});

export type CreateContactRequest = z.infer<typeof createContactSchema>;
```

## Testing

The application uses Jest for testing:

### Test Types

1. **Unit Tests**: Test individual functions and methods
2. **Integration Tests**: Test API endpoints and database interactions
3. **End-to-End Tests**: Test complete user flows

### Test Structure

Tests are organized by domain, mirroring the application structure:

```
__tests__/
├── domain/
│   ├── ai/
│   ├── auth/
│   ├── contacts/
│   ├── conversations/
│   ├── crypto/
│   ├── messages/
│   └── users/
├── integration/
│   ├── auth.routes.test.ts
│   ├── contacts.routes.test.ts
│   ├── conversations.routes.test.ts
│   └── messages.routes.test.ts
└── utils/
    ├── mocks.ts
    └── prisma-mock.ts
```

### Mocking

The tests use Jest's mocking capabilities to mock:
- Database interactions using Prisma
- External services like OpenAI
- Environment variables
- Encryption/decryption

Example of mocking Prisma:

```typescript
// Import the mock first to ensure it's loaded before any other imports
import { mockPrisma } from '../utils/prisma-mock';

// Mock modules
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
  };
});
```

## Environment Configuration

Environment variables are managed using dotenv and validated with Zod:

```typescript
// Define environment variable schema with validation
const envSchema = z.object({
  // Server
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  ENCRYPTION_KEY_HEX: z.string().length(64), // 32 bytes in hex = 64 chars
  
  // AI
  OPENAI_API_KEY: z.string(),
});

// Parse and validate environment variables
const env = envSchema.parse(process.env);
```

### Required Environment Variables

- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment (development, production, test)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT signing
- `ENCRYPTION_KEY_HEX`: 64-character hex string (32 bytes) for AES-256 encryption
- `OPENAI_API_KEY`: API key for OpenAI services

## Deployment

The application can be deployed using various methods:

### Docker Deployment

A Docker Compose configuration is provided for easy deployment:

```yaml
version: '3'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: chatcraft
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: ./server
    depends_on:
      - db
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/chatcraft
      - JWT_SECRET=your_jwt_secret_here
      - ENCRYPTION_KEY_HEX=your_32_byte_hex_key_here
      - OPENAI_API_KEY=your_openai_api_key_here
    ports:
      - "4000:4000"

volumes:
  postgres_data:
```

### Production Considerations

1. **Security**:
   - Use HTTPS in production
   - Set secure and HTTP-only cookies
   - Store sensitive environment variables securely

2. **Performance**:
   - Implement database connection pooling
   - Consider caching for frequently accessed data
   - Use a process manager like PM2

3. **Monitoring**:
   - Implement logging with a service like Winston
   - Set up error tracking
   - Monitor server health and performance
