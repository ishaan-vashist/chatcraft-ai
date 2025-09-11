# ChatCraft API Postman Test Collection

This document provides a comprehensive guide for testing the ChatCraft API using Postman. It includes test cases for all endpoints, required parameters, expected responses, and authentication requirements.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Authentication Endpoints](#authentication-endpoints)
3. [User Endpoints](#user-endpoints)
4. [Conversation Endpoints](#conversation-endpoints)
5. [Messages Endpoints](#messages-endpoints)
6. [Contacts Endpoints](#contacts-endpoints)
7. [Metrics Endpoints](#metrics-endpoints)

## Environment Setup

Create a Postman environment with the following variables:

| Variable | Initial Value | Description |
|----------|--------------|-------------|
| `baseUrl` | `http://localhost:4000` | Base URL for the API |
| `token` | _empty_ | JWT token for authentication |
| `userId` | _empty_ | Current user ID |
| `conversationId` | _empty_ | Current conversation ID |

## Authentication Endpoints

### Register a New User

**Request:**
- Method: `POST`
- URL: `{{baseUrl}}/api/auth/register`
- Headers:
  - Content-Type: `application/json`
- Body:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Test User"
}
```

**Tests:**
```javascript
// Test successful registration
pm.test("Status code is 201", function() {
  pm.response.to.have.status(201);
});

pm.test("Response has user object", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('user');
  pm.expect(responseJson.user).to.have.property('id');
  pm.expect(responseJson.user).to.have.property('email');
  pm.expect(responseJson.user).to.have.property('name');
});

// Store user ID for later tests
if (pm.response.code === 201) {
  const responseJson = pm.response.json();
  pm.environment.set("userId", responseJson.user.id);
}

// Check for token cookie
pm.test("Token cookie is set", function() {
  pm.expect(pm.cookies.has('token')).to.be.true;
});
```

**Negative Tests:**
1. **Email Already Exists**
   - Use the same email again
   - Expected status: `409`
   - Expected response: Error with code `USER_EXISTS`

2. **Invalid Email Format**
   - Use invalid email format (e.g., "notanemail")
   - Expected status: `400`
   - Expected response: Error with code `VALIDATION_ERROR`

3. **Password Too Short**
   - Use a short password (e.g., "123")
   - Expected status: `400`
   - Expected response: Error with code `VALIDATION_ERROR`

### Login

**Request:**
- Method: `POST`
- URL: `{{baseUrl}}/api/auth/login`
- Headers:
  - Content-Type: `application/json`
- Body:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Tests:**
```javascript
// Test successful login
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});

pm.test("Response has user object", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('user');
  pm.expect(responseJson.user).to.have.property('id');
  pm.expect(responseJson.user).to.have.property('email');
  pm.expect(responseJson.user).to.have.property('name');
});

// Store user ID for later tests
if (pm.response.code === 200) {
  const responseJson = pm.response.json();
  pm.environment.set("userId", responseJson.user.id);
}

// Check for token cookie
pm.test("Token cookie is set", function() {
  pm.expect(pm.cookies.has('token')).to.be.true;
});
```

**Negative Tests:**
1. **Invalid Email**
   - Use non-existent email
   - Expected status: `401`
   - Expected response: Error with code `INVALID_CREDENTIALS`

2. **Invalid Password**
   - Use incorrect password
   - Expected status: `401`
   - Expected response: Error with code `INVALID_CREDENTIALS`

### Get Current User

**Request:**
- Method: `GET`
- URL: `{{baseUrl}}/api/auth/me`
- Headers:
  - Authorization: `Bearer {{token}}`

**Tests:**
```javascript
// Test successful user retrieval
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});

pm.test("Response has user object", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('user');
  pm.expect(responseJson.user).to.have.property('id');
  pm.expect(responseJson.user).to.have.property('email');
  pm.expect(responseJson.user).to.have.property('name');
});

// Verify user ID matches stored ID
pm.test("User ID matches stored ID", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson.user.id).to.equal(pm.environment.get("userId"));
});
```

**Negative Tests:**
1. **No Authentication**
   - Remove Authorization header
   - Expected status: `401`
   - Expected response: Error with code `UNAUTHORIZED`

2. **Invalid Token**
   - Use invalid token
   - Expected status: `401`
   - Expected response: Error with code `INVALID_TOKEN`

### Logout

**Request:**
- Method: `POST`
- URL: `{{baseUrl}}/api/auth/logout`
- Headers:
  - Authorization: `Bearer {{token}}`

**Tests:**
```javascript
// Test successful logout
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});

pm.test("Response has success message", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('message');
  pm.expect(responseJson.message).to.equal('Logged out successfully');
});

// Check that token cookie is cleared
pm.test("Token cookie is cleared", function() {
  const tokenCookie = pm.cookies.get('token');
  pm.expect(tokenCookie).to.be.oneOf([null, ""]);
});
```

**Negative Tests:**
1. **No Authentication**
   - Remove Authorization header
   - Expected status: `401`
   - Expected response: Error with code `UNAUTHORIZED`

## User Endpoints

### Get User by ID

**Request:**
- Method: `GET`
- URL: `{{baseUrl}}/api/users/{{userId}}`
- Headers:
  - Authorization: `Bearer {{token}}`

**Tests:**
```javascript
// Test successful user retrieval
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});

pm.test("Response has user object", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('user');
  pm.expect(responseJson.user).to.have.property('id');
  pm.expect(responseJson.user).to.have.property('email');
  pm.expect(responseJson.user).to.have.property('name');
});

// Verify user ID matches requested ID
pm.test("User ID matches requested ID", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson.user.id).to.equal(pm.environment.get("userId"));
});
```

**Negative Tests:**
1. **No Authentication**
   - Remove Authorization header
   - Expected status: `401`
   - Expected response: Error with code `UNAUTHORIZED`

2. **User Not Found**
   - Use non-existent user ID
   - Expected status: `404`
   - Expected response: Error with code `USER_NOT_FOUND`

### Update User

**Request:**
- Method: `PATCH`
- URL: `{{baseUrl}}/api/users`
- Headers:
  - Authorization: `Bearer {{token}}`
  - Content-Type: `application/json`
- Body:
```json
{
  "name": "Updated Name"
}
```

**Tests:**
```javascript
// Test successful user update
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});

pm.test("Response has updated user object", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('user');
  pm.expect(responseJson.user).to.have.property('id');
  pm.expect(responseJson.user).to.have.property('name', 'Updated Name');
});
```

**Negative Tests:**
1. **No Authentication**
   - Remove Authorization header
   - Expected status: `401`
   - Expected response: Error with code `UNAUTHORIZED`

2. **Invalid Input**
   - Send invalid data (e.g., empty name)
   - Expected status: `400`
   - Expected response: Error with code `VALIDATION_ERROR`

## Conversation Endpoints

### Get All Conversations

**Request:**
- Method: `GET`
- URL: `{{baseUrl}}/api/conversations`
- Headers:
  - Authorization: `Bearer {{token}}`

**Tests:**
```javascript
// Test successful conversations retrieval
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});

pm.test("Response has conversations array", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('conversations');
  pm.expect(responseJson.conversations).to.be.an('array');
});

// Store conversation ID for later tests if available
if (pm.response.code === 200) {
  const responseJson = pm.response.json();
  if (responseJson.conversations && responseJson.conversations.length > 0) {
    pm.environment.set("conversationId", responseJson.conversations[0].id);
  }
}
```

**Negative Tests:**
1. **No Authentication**
   - Remove Authorization header
   - Expected status: `401`
   - Expected response: Error with code `UNAUTHORIZED`

### Create New Conversation

**Request:**
- Method: `POST`
- URL: `{{baseUrl}}/api/conversations`
- Headers:
  - Authorization: `Bearer {{token}}`
  - Content-Type: `application/json`
- Body:
```json
{
  "participantUserId": "{{userId}}"
}
```

**Tests:**
```javascript
// Test successful conversation creation
pm.test("Status code is 201", function() {
  pm.response.to.have.status(201);
});

pm.test("Response has conversation object", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('conversation');
  pm.expect(responseJson.conversation).to.have.property('id');
  pm.expect(responseJson.conversation).to.have.property('name', 'Test Conversation');
});

// Store conversation ID for later tests
if (pm.response.code === 201) {
  const responseJson = pm.response.json();
  pm.environment.set("conversationId", responseJson.conversation.id);
}
```

**Negative Tests:**
1. **No Authentication**
   - Remove Authorization header
   - Expected status: `401`
   - Expected response: Error with code `UNAUTHORIZED`

2. **Invalid Input**
   - Send invalid data (e.g., missing name)
   - Expected status: `400`
   - Expected response: Error with code `VALIDATION_ERROR`

### Get Conversation by ID

**Request:**
- Method: `GET`
- URL: `{{baseUrl}}/api/conversations/{{conversationId}}`
- Headers:
  - Authorization: `Bearer {{token}}`

**Tests:**
```javascript
// Test successful conversation retrieval
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});

pm.test("Response has conversation object", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('conversation');
  pm.expect(responseJson.conversation).to.have.property('id');
  pm.expect(responseJson.conversation.id).to.equal(pm.environment.get("conversationId"));
});
```

**Negative Tests:**
1. **No Authentication**
   - Remove Authorization header
   - Expected status: `401`
   - Expected response: Error with code `UNAUTHORIZED`

2. **Conversation Not Found**
   - Use non-existent conversation ID
   - Expected status: `404`
   - Expected response: Error with code `CONVERSATION_NOT_FOUND`

3. **Not a Participant**
   - Use a conversation ID where the user is not a participant
   - Expected status: `403`
   - Expected response: Error with code `NOT_PARTICIPANT`

## Messages Endpoints

### Get Messages for a Conversation

**Request:**
- Method: `GET`
- URL: `{{baseUrl}}/api/conversations/{{conversationId}}/messages`
- Headers:
  - Authorization: `Bearer {{token}}`
- Query Parameters:
  - limit: `10`
  - before: `2023-01-01T00:00:00Z` (optional)

**Tests:**
```javascript
// Test successful messages retrieval
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});

pm.test("Response has messages array", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('messages');
  pm.expect(responseJson.messages).to.be.an('array');
});
```

**Negative Tests:**
1. **No Authentication**
   - Remove Authorization header
   - Expected status: `401`
   - Expected response: Error with code `UNAUTHORIZED`

2. **Not a Participant**
   - Use a conversation ID where the user is not a participant
   - Expected status: `403`
   - Expected response: Error with code `NOT_PARTICIPANT`

### Create New Message

**Request:**
- Method: `POST`
- URL: `{{baseUrl}}/api/conversations/{{conversationId}}/messages`
- Headers:
  - Authorization: `Bearer {{token}}`
  - Content-Type: `application/json`
- Body:
```json
{
  "content": "Hello, this is a test message!"
}
```

**Tests:**
```javascript
// Test successful message creation
pm.test("Status code is 201", function() {
  pm.response.to.have.status(201);
});

pm.test("Response has message object", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('message');
  pm.expect(responseJson.message).to.have.property('id');
  pm.expect(responseJson.message).to.have.property('content', 'Hello, this is a test message!');
  pm.expect(responseJson.message).to.have.property('senderId', pm.environment.get("userId"));
});
```

**Negative Tests:**
1. **No Authentication**
   - Remove Authorization header
   - Expected status: `401`
   - Expected response: Error with code `UNAUTHORIZED`

2. **Not a Participant**
   - Use a conversation ID where the user is not a participant
   - Expected status: `403`
   - Expected response: Error with code `NOT_PARTICIPANT`

3. **Invalid Input**
   - Send invalid data (e.g., empty content)
   - Expected status: `400`
   - Expected response: Error with code `VALIDATION_ERROR`

## Contacts Endpoints

### Get All Contacts

**Request:**
- Method: `GET`
- URL: `{{baseUrl}}/api/contacts`
- Headers:
  - Authorization: `Bearer {{token}}`

**Tests:**
```javascript
// Test successful contacts retrieval
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});

pm.test("Response has contacts array", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('contacts');
  pm.expect(responseJson.contacts).to.be.an('array');
});
```

**Negative Tests:**
1. **No Authentication**
   - Remove Authorization header
   - Expected status: `401`
   - Expected response: Error with code `UNAUTHORIZED`

### Add New Contact

**Request:**
- Method: `POST`
- URL: `{{baseUrl}}/api/contacts`
- Headers:
  - Authorization: `Bearer {{token}}`
  - Content-Type: `application/json`
- Body:
```json
{
  "contactEmail": "contact@example.com",
  "alias": "Optional Contact Name"
}
```

**Tests:**
```javascript
// Test successful contact addition
pm.test("Status code is 201", function() {
  pm.response.to.have.status(201);
});

pm.test("Response has contact object", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('contact');
  pm.expect(responseJson.contact).to.have.property('id');
  pm.expect(responseJson.contact).to.have.property('email', 'contact@example.com');
});
```

**Negative Tests:**
1. **No Authentication**
   - Remove Authorization header
   - Expected status: `401`
   - Expected response: Error with code `UNAUTHORIZED`

2. **Invalid Email**
   - Send invalid email format
   - Expected status: `400`
   - Expected response: Error with code `VALIDATION_ERROR`

3. **User Not Found**
   - Send email that doesn't belong to any user
   - Expected status: `404`
   - Expected response: Error with code `USER_NOT_FOUND`

4. **Contact Already Added**
   - Try to add the same contact again
   - Expected status: `409`
   - Expected response: Error with code `CONTACT_EXISTS`

## Metrics Endpoints

### Get User Metrics

**Request:**
- Method: `GET`
- URL: `{{baseUrl}}/api/metrics`
- Headers:
  - Authorization: `Bearer {{token}}`

**Tests:**
```javascript
// Test successful metrics retrieval
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});

pm.test("Response has metrics object", function() {
  const responseJson = pm.response.json();
  pm.expect(responseJson).to.have.property('metrics');
  pm.expect(responseJson.metrics).to.have.property('messageCount');
  pm.expect(responseJson.metrics).to.have.property('conversationCount');
  pm.expect(responseJson.metrics).to.have.property('contactCount');
});
```

**Negative Tests:**
1. **No Authentication**
   - Remove Authorization header
   - Expected status: `401`
   - Expected response: Error with code `UNAUTHORIZED`
