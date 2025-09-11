import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { createMockPrisma } from './mocks';

// Create a single mock instance to be shared across all tests
export const mockPrisma = createMockPrisma();

// Mock the PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

// Export the mock for use in tests
export type MockPrismaClient = DeepMockProxy<PrismaClient>;
