# ChatCraft Server Testing Guide

This document provides information on how to run tests for the ChatCraft server and what they cover.

## Table of Contents

1. [Test Setup](#test-setup)
2. [Running Tests](#running-tests)
3. [Test Categories](#test-categories)
4. [Test Coverage](#test-coverage)
5. [Writing New Tests](#writing-new-tests)
6. [Troubleshooting](#troubleshooting)

## Test Setup

The testing framework uses Jest with TypeScript support. The configuration is in `jest.config.js` at the root of the server directory.

### Prerequisites

- Node.js (version specified in package.json)
- All dependencies installed (`npm install`)

### Environment Setup

Tests use a separate `.env.test` file for environment variables. If this file doesn't exist, the tests will use values from the default setup file.

For testing, we recommend creating a `.env.test` file with the following content:

```
# Server
PORT=4001
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatcraft_test
JWT_SECRET=test-jwt-secret
ENCRYPTION_KEY_HEX=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# AI
OPENAI_API_KEY=test-api-key
```

## Running Tests

### Running All Tests

```bash
npm test
```

### Running Tests with Coverage

```bash
npm run test:coverage
```

### Running Tests in Watch Mode

```bash
npm run test:watch
```

### Running Specific Tests

```bash
# Run tests for a specific file
npm test -- src/__tests__/domain/crypto/crypto.service.test.ts

# Run tests matching a pattern
npm test -- -t "should encrypt a string"
```

## Test Categories

The test suite is organized into the following categories:

### Unit Tests

Located in `src/__tests__/domain/*/` directories, these tests focus on individual components in isolation.

- **Service Tests**: Test business logic in service classes
- **Controller Tests**: Test HTTP request/response handling
- **Utility Tests**: Test helper functions and utilities

### Integration Tests

Located in `src/__tests__/integration/` directory, these tests verify that different parts of the application work together correctly.

- **API Tests**: Test REST API endpoints
- **Socket.IO Tests**: Test real-time messaging functionality
- **Database Tests**: Test database operations

## Test Coverage

The test suite aims to cover:

1. **Core Services**:
   - Authentication and authorization
   - Message encryption/decryption
   - Conversation management
   - AI integration

2. **API Endpoints**:
   - Input validation
   - Response formatting
   - Error handling

3. **Real-time Messaging**:
   - Socket.IO connections
   - Room management
   - Message broadcasting

4. **Database Operations**:
   - CRUD operations
   - Pagination
   - Cascade deletes

## Writing New Tests

### Test File Structure

```typescript
import { ThingToTest } from '../path/to/thing';

describe('ThingToTest', () => {
  let thingToTest: ThingToTest;
  
  beforeEach(() => {
    // Setup for each test
    thingToTest = new ThingToTest();
  });
  
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = thingToTest.methodName(input);
      
      // Assert
      expect(result).toBe('expected output');
    });
  });
});
```

### Mocking Dependencies

Use Jest's mocking capabilities to isolate the component being tested:

```typescript
// Mock a module
jest.mock('../path/to/module', () => ({
  someFunction: jest.fn().mockReturnValue('mocked value')
}));

// Mock a specific method
const mockMethod = jest.spyOn(someObject, 'method')
  .mockImplementation(() => 'mocked result');
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  // Arrange
  const input = 'test';
  
  // Act
  const result = await thingToTest.asyncMethod(input);
  
  // Assert
  expect(result).toBe('expected output');
});
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env.test
   - Run `npx prisma migrate dev` to apply migrations

2. **Socket.IO Test Timeouts**:
   - Increase timeout in test configuration
   - Check for event listeners that might not be triggered

3. **Authentication Test Failures**:
   - Verify JWT_SECRET is set in .env.test
   - Check that mock tokens are formatted correctly

### Debugging Tests

To debug tests, you can use:

```bash
# Run with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand path/to/test.ts
```

Then connect to the debugger using Chrome DevTools or your IDE.
