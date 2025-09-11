// Global type definitions for Jest
import '@types/jest';

declare global {
  namespace NodeJS {
    interface Global {
      // Add any global Jest types here if needed
    }
  }
}

// This export is needed to make this a module
export {};
