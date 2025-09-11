# ChatCraft Frontend Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication Integration](#authentication-integration)
4. [API Client Setup](#api-client-setup)
5. [Core Features Implementation](#core-features-implementation)
6. [State Management](#state-management)
7. [Real-time Communication](#real-time-communication)
8. [UI Components](#ui-components)
9. [Error Handling](#error-handling)
10. [Testing](#testing)

## Overview

This document provides guidance for integrating a frontend application with the ChatCraft backend API. It covers authentication flows, API integration patterns, state management recommendations, and implementation details for core features.

## Getting Started

### Recommended Technology Stack

For optimal integration with the ChatCraft backend, we recommend:

- **Framework**: React with TypeScript
- **State Management**: Redux Toolkit or React Query
- **Styling**: Tailwind CSS or styled-components
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form with Zod validation

### Project Structure

A recommended project structure for the frontend:

```
frontend/
├── public/
├── src/
│   ├── api/                # API client and services
│   ├── assets/             # Static assets
│   ├── components/         # Reusable UI components
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── contacts/
│   │   ├── layout/
│   │   └── shared/
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── pages/              # Page components
│   ├── store/              # State management
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── App.tsx
│   └── index.tsx
├── package.json
└── tsconfig.json
```

### Environment Setup

Create an `.env` file with the following variables:

```
REACT_APP_API_URL=http://localhost:4000
REACT_APP_WEBSOCKET_URL=ws://localhost:4000
```

## Authentication Integration

### Authentication Flow

1. **Registration**:
   - Collect user email, password, and name
   - Submit to `/api/auth/register`
   - Store returned JWT token in secure HTTP-only cookie

2. **Login**:
   - Collect user email and password
   - Submit to `/api/auth/login`
   - Store returned JWT token in secure HTTP-only cookie

3. **Authentication State**:
   - On app load, call `/api/auth/me` to check if user is authenticated
   - Store user data in application state
   - Implement protected routes that redirect to login if not authenticated

4. **Logout**:
   - Call `/api/auth/logout`
   - Clear user data from application state
   - Redirect to login page

### Authentication Context

Create an authentication context to manage user state:

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/user';
import { authService } from '../api/services/auth.service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const response = await authService.getCurrentUser();
        setUser(response.user);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const response = await authService.register(email, password, name);
      setUser(response.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Protected Route Component

Create a component to protect routes that require authentication:

```typescript
// src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};
```

## API Client Setup

### API Client Configuration

Create a base API client using Axios:

```typescript
// src/api/client.ts
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for cookies
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // You can add auth token here if not using cookies
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Handle common errors
        if (error.response?.status === 401) {
          // Redirect to login or refresh token
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

### API Services

Create service modules for each API domain:

```typescript
// src/api/services/auth.service.ts
import { apiClient } from '../client';
import { User, LoginRequest, RegisterRequest } from '../../types/user';

interface AuthResponse {
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/login', { email, password });
  },

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/register', { email, password, name });
  },

  async getCurrentUser(): Promise<AuthResponse> {
    return apiClient.get<AuthResponse>('/api/auth/me');
  },

  async logout(): Promise<void> {
    return apiClient.post<void>('/api/auth/logout');
  },
};
```

```typescript
// src/api/services/conversations.service.ts
import { apiClient } from '../client';
import { Conversation, CreateConversationRequest } from '../../types/conversation';

interface ConversationsResponse {
  conversations: Conversation[];
}

interface ConversationResponse {
  conversation: Conversation;
}

export const conversationsService = {
  async getConversations(): Promise<ConversationsResponse> {
    return apiClient.get<ConversationsResponse>('/api/conversations');
  },

  async getConversation(id: string): Promise<ConversationResponse> {
    return apiClient.get<ConversationResponse>(`/api/conversations/${id}`);
  },

  async createConversation(data: CreateConversationRequest): Promise<ConversationResponse> {
    return apiClient.post<ConversationResponse>('/api/conversations', data);
  },
};
```

```typescript
// src/api/services/messages.service.ts
import { apiClient } from '../client';
import { Message, CreateMessageRequest } from '../../types/message';

interface MessagesResponse {
  messages: Message[];
}

interface MessageResponse {
  message: Message;
}

export const messagesService = {
  async getMessages(conversationId: string, limit = 20, before?: string): Promise<MessagesResponse> {
    const params = { limit, ...(before && { before }) };
    return apiClient.get<MessagesResponse>(`/api/conversations/${conversationId}/messages`, { params });
  },

  async createMessage(conversationId: string, data: CreateMessageRequest): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>(`/api/conversations/${conversationId}/messages`, data);
  },
};
```

```typescript
// src/api/services/contacts.service.ts
import { apiClient } from '../client';
import { Contact, CreateContactRequest } from '../../types/contact';

interface ContactsResponse {
  contacts: Contact[];
}

interface ContactResponse {
  contact: Contact;
}

export const contactsService = {
  async getContacts(): Promise<ContactsResponse> {
    return apiClient.get<ContactsResponse>('/api/contacts');
  },

  async addContact(data: CreateContactRequest): Promise<ContactResponse> {
    return apiClient.post<ContactResponse>('/api/contacts', data);
  },
};
```

```typescript
// src/api/services/metrics.service.ts
import { apiClient } from '../client';
import { Metrics } from '../../types/metrics';

interface MetricsResponse {
  metrics: Metrics;
}

export const metricsService = {
  async getMetrics(): Promise<MetricsResponse> {
    return apiClient.get<MetricsResponse>('/api/metrics');
  },
};
```

## Core Features Implementation

### TypeScript Type Definitions

Create TypeScript interfaces for all API models:

```typescript
// src/types/user.ts
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}
```

```typescript
// src/types/conversation.ts
export interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  participants: Participant[];
  lastMessage?: Message;
}

export interface Participant {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface CreateConversationRequest {
  participantUserId: string;
}
```

```typescript
// src/types/message.ts
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface CreateMessageRequest {
  content: string;
}
```

```typescript
// src/types/contact.ts
export interface Contact {
  id: string;
  userId: string;
  contactId: string;
  contactEmail: string;
  contactName: string | null;
  alias: string | null;
  createdAt: string;
}

export interface CreateContactRequest {
  contactEmail: string;
  alias?: string;
}
```

```typescript
// src/types/metrics.ts
export interface Metrics {
  messageCount: number;
  conversationCount: number;
  contactCount: number;
}
```

```typescript
// src/types/error.ts
export interface ApiError {
  code: string;
  message: string;
  details?: any[];
}
```

### Conversations Feature

Implement the conversations feature with React components:

```typescript
// src/components/chat/ConversationList.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { conversationsService } from '../../api/services/conversations.service';
import { Conversation } from '../../types/conversation';

export const ConversationList: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await conversationsService.getConversations();
        setConversations(response.conversations);
      } catch (err) {
        setError('Failed to load conversations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  if (loading) return <div>Loading conversations...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="conversation-list">
      <h2>Conversations</h2>
      {conversations.length === 0 ? (
        <p>No conversations yet. Start a new one!</p>
      ) : (
        <ul>
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link to={`/conversations/${conversation.id}`}>
                {conversation.name || 'Unnamed Conversation'}
                <span className="timestamp">{new Date(conversation.createdAt).toLocaleString()}</span>
                {conversation.lastMessage && (
                  <p className="preview">{conversation.lastMessage.content}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/conversations/new" className="button">
        New Conversation
      </Link>
    </div>
  );
};
```

### Messages Feature

Implement the messages feature:

```typescript
// src/components/chat/MessageList.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { messagesService } from '../../api/services/messages.service';
import { Message } from '../../types/message';
import { useAuth } from '../../contexts/AuthContext';

export const MessageList: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      try {
        const response = await messagesService.getMessages(conversationId);
        setMessages(response.messages);
      } catch (err) {
        setError('Failed to load messages');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) return <div>Loading messages...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <p>No messages yet. Start the conversation!</p>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.senderId === user?.id ? 'sent' : 'received'}`}
          >
            <div className="message-content">{message.content}</div>
            <div className="message-meta">
              <span className="sender">{message.sender.name || message.sender.email}</span>
              <span className="timestamp">{new Date(message.createdAt).toLocaleString()}</span>
            </div>
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
```

```typescript
// src/components/chat/MessageInput.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { messagesService } from '../../api/services/messages.service';

interface MessageInputProps {
  onMessageSent?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onMessageSent }) => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !conversationId) return;

    setSending(true);
    setError(null);

    try {
      await messagesService.createMessage(conversationId, { content });
      setContent('');
      if (onMessageSent) onMessageSent();
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="message-input">
      {error && <div className="error">{error}</div>}
      <div className="input-container">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
        />
        <button type="submit" disabled={!content.trim() || sending}>
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
};
```

## State Management

### Using React Query

React Query is recommended for data fetching and caching:

```typescript
// src/hooks/useConversations.ts
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { conversationsService } from '../api/services/conversations.service';
import { CreateConversationRequest } from '../types/conversation';

export const useConversations = () => {
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery('conversations', async () => {
    const response = await conversationsService.getConversations();
    return response.conversations;
  });

  const createConversationMutation = useMutation(
    (data: CreateConversationRequest) => conversationsService.createConversation(data),
    {
      onSuccess: () => {
        // Invalidate and refetch conversations query
        queryClient.invalidateQueries('conversations');
      },
    }
  );

  return {
    conversations: conversationsQuery.data || [],
    isLoading: conversationsQuery.isLoading,
    isError: conversationsQuery.isError,
    error: conversationsQuery.error,
    createConversation: createConversationMutation.mutate,
    isCreating: createConversationMutation.isLoading,
  };
};
```

```typescript
// src/hooks/useMessages.ts
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { messagesService } from '../api/services/messages.service';
import { CreateMessageRequest } from '../types/message';

export const useMessages = (conversationId: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['messages', conversationId];

  const messagesQuery = useQuery(queryKey, async () => {
    const response = await messagesService.getMessages(conversationId);
    return response.messages;
  });

  const createMessageMutation = useMutation(
    (data: CreateMessageRequest) => messagesService.createMessage(conversationId, data),
    {
      onSuccess: () => {
        // Invalidate and refetch messages query
        queryClient.invalidateQueries(queryKey);
      },
    }
  );

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    error: messagesQuery.error,
    sendMessage: createMessageMutation.mutate,
    isSending: createMessageMutation.isLoading,
  };
};
```

## Real-time Communication

Implement real-time messaging using WebSockets:

```typescript
// src/services/websocket.service.ts
import { Message } from '../types/message';

type MessageHandler = (message: Message) => void;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(private url: string) {}

  connect() {
    if (this.socket) return;

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          this.messageHandlers.forEach((handler) => handler(data.message));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.socket = null;

      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, 1000 * Math.pow(2, this.reconnectAttempts)); // Exponential backoff
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }
}

export const websocketService = new WebSocketService(
  process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:4000'
);
```

## Error Handling

Implement consistent error handling across the application:

```typescript
// src/utils/error-handler.ts
import { AxiosError } from 'axios';
import { ApiError } from '../types/error';

export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError && error.response?.data?.error) {
    const apiError: ApiError = error.response.data.error;
    return apiError.message || 'An unknown error occurred';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
};

export const extractErrorCode = (error: unknown): string | null => {
  if (error instanceof AxiosError && error.response?.data?.error) {
    const apiError: ApiError = error.response.data.error;
    return apiError.code || null;
  }
  
  return null;
};
```

## Testing

Implement frontend tests using React Testing Library and Jest:

```typescript
// src/components/auth/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';
import { authService } from '../../api/services/auth.service';

// Mock the auth service
jest.mock('../../api/services/auth.service');

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form', () => {
    render(<LoginForm onSuccess={() => {}} />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('submits form with valid data', async () => {
    const mockLogin = authService.login as jest.Mock;
    mockLogin.mockResolvedValueOnce({ user: { id: '1', email: 'test@example.com', name: 'Test User' } });
    
    const onSuccess = jest.fn();
    render(<LoginForm onSuccess={onSuccess} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  test('shows error message on login failure', async () => {
    const mockLogin = authService.login as jest.Mock;
    mockLogin.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
      },
    });
    
    render(<LoginForm onSuccess={() => {}} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });
});
```

## Conclusion

This frontend integration guide provides a comprehensive framework for building a React frontend that integrates with the ChatCraft backend API. By following these patterns and best practices, you can create a robust, type-safe, and maintainable frontend application.

Key takeaways:

1. Use TypeScript for type safety and better developer experience
2. Implement proper authentication with protected routes
3. Create a well-structured API client with service modules
4. Use React Query or similar for efficient data fetching and caching
5. Implement real-time communication with WebSockets
6. Handle errors consistently throughout the application
7. Write tests for critical components and functionality

With these guidelines, you should be able to build a fully-featured frontend for the ChatCraft application that provides a great user experience while maintaining code quality and maintainability.
```
