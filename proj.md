# Relatim Chat — Project Implementation Plan (Task-1)

## 0) Goal & Scope
Build a WhatsApp-style AI messaging app with:
- Left sidebar tabs: Chat, Contacts
- Top bar: Message, Dashboard (optional but recommended)
- 1:1 messaging, real-time updates, AI assistant thread
- PostgreSQL as the database (local dev)
- Public GitHub repo with clear README + architecture notes

**Non-Goals (for MVP):** media uploads, groups, E2E client crypto, search, emoji/reactions, read receipts.

---

## 1) Architecture (MVP)
- **Frontend**: React + Vite + TypeScript + Tailwind + TanStack Query + Socket.IO client
- **Backend**: Node.js + Express + TypeScript, Socket.IO, Prisma (Postgres)
- **DB**: Postgres (Docker), Prisma migrations
- **Auth**: JWT (httpOnly cookie), bcrypt
- **AI**: Provider-agnostic `AiService` (primary: Groq Llama-3.1-70B; fallback: OpenAI gpt-4o-mini)
- **Privacy**: Server-side AES-256-GCM encryption at rest for message content (config on/off)
- **Observability**: pino logger, request IDs, basic metrics endpoint
- **Validation/Security**: Zod schema validation, Helmet, CORS, rate limiting

---

## 2) Repository Layout
```
relatim-chat/
  README.md
  .env.example
  docker-compose.yml
  package.json                # root scripts (convenience)
  /server
    package.json
    tsconfig.json
    src/
      app.ts                  # express bootstrap + socket.io
      server.ts               # listen()
      config/env.ts
      config/security.ts      # helmet, cors, limiter
      db/prisma.ts
      db/seed.ts
      domain/
        auth/
          auth.controller.ts
          auth.routes.ts
          auth.service.ts
          auth.types.ts
          auth.middleware.ts
        users/
        contacts/
        conversations/
        messages/
        ai/
          ai.service.ts       # provider-agnostic interface
          providers/groq.ts
          providers/openai.ts
        crypto/crypto.service.ts
        metrics/metrics.controller.ts
      sockets/
        index.ts              # io init + namespaces
        events.ts             # contracts + handlers
      middleware/error.ts
      utils/pagination.ts
    prisma/
      schema.prisma
      migrations/
  /web
    package.json
    tsconfig.json
    index.html
    src/
      main.tsx
      App.tsx
      lib/api.ts
      lib/socket.ts
      lib/queryClient.ts
      lib/auth.ts
      components/
        layout/TopBar.tsx
        layout/LeftTabs.tsx
        chat/ChatList.tsx
        chat/MessageThread.tsx
        chat/Composer.tsx
        contacts/ContactsList.tsx
        common/Loading.tsx
      pages/
        ChatPage.tsx
        ContactsPage.tsx
        DashboardPage.tsx      # optional
        LoginPage.tsx
        RegisterPage.tsx
      state/auth.store.ts
      styles/tailwind.css
```

---

## 3) Environment & DevOps
**docker-compose.yml** (Postgres + Adminer)
- postgres: 15-16, persistent volume
- adminer: quick DB browsing

**.env.example**
```
# Server
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/relatim
JWT_SECRET=change_me
ENCRYPTION_KEY_HEX=32_byte_hex_key_here  # for AES-256-GCM (64 hex chars)

# AI
AI_PROVIDER=groq
GROQ_API_KEY=...
OPENAI_API_KEY=...

# Web
VITE_API_BASE_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

**Root scripts**
- `dev`: concurrently run web + server (with ts-node-dev / vite)
- `db:reset`: prisma migrate reset + seed

---

## 4) Data Model (Prisma outline)
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

model Conversation {
  id             String   @id @default(uuid())
  isGroup        Boolean  @default(false)
  retentionDays  Int      @default(30)
  createdAt      DateTime @default(now())
  participants   ConversationParticipant[]
  messages       Message[]
  @@index([createdAt])
}

model ConversationParticipant {
  id             String @id @default(uuid())
  conversationId String
  userId         String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  user           User         @relation(fields: [userId], references: [id])
  @@unique([conversationId, userId])
  @@index([userId])
}

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
**Indexes**: messages (conversationId, createdAt DESC) for keyset pagination.

---

## 5) API Design (REST)
Auth (public)
- `POST /auth/register`  {email, name?, password}
- `POST /auth/login`     {email, password}
- `GET /auth/me`         (returns user) — requires auth

Contacts (auth)
- `GET /contacts`                        → list your contacts
- `POST /contacts` {contactEmail, alias?}
- (Optional) `DELETE /contacts/:id`

Conversations (auth)
- `GET /conversations`                               → list for user (with last message preview)
- `POST /conversations` {participantUserId}          → create or reuse 1:1
- `GET /conversations/:id/messages?before=<cursor>&limit=30`
- `POST /conversations/:id/messages` {content}       → creates + emits

AI (auth; handled server-side)
- AI is a “system user”. When posting to a convo with AI user as other participant, server calls `AiService`, persists reply, emits to room.

Metrics (auth; optional)
- `GET /metrics` → { totalUsers, totalMessages, messagesToday, aiMessageCount, avgAiLatencyMs }

**Validation:** Zod per route.  
**Errors:** consistent JSON: `{ error: { code, message, details? } }`.

---

## 6) Socket Contracts (Socket.IO)
**Connection**
- Client connects with auth token (query or auth handshake).
- Server verifies JWT; attaches userId.

**Rooms**
- `room:join` { conversationId }
- `room:leave` { conversationId }

**Messaging**
- Client → `message:send` { conversationId, content }
- Server validates, persists, and emits:
- Server → `message:new` { message } (full message DTO)
- (Optional) typing: `typing:start|stop` { conversationId }

**DTO: Message**
```ts
type MessageDTO = {
  id: string
  conversationId: string
  senderId: string
  type: 'text'
  content: string        // decrypted server-side before emit
  createdAt: string
};
```

---

## 7) AI Service (Provider-agnostic)
**Interface**
```ts
export interface AiProvider {
  generate(opts: {
    prompt: string,
    history: {role:'user'|'assistant'|'system', content:string}[],
    stream?: boolean,
    temperature?: number
  }): Promise<{ text: string, latencyMs: number }>
}
```
- `AiService` chooses provider by `AI_PROVIDER`
- Default: Groq Llama-3.1-70B Instruct; Fallback: OpenAI gpt-4o-mini
- History truncated to last N messages; redact obvious PII (regex) before send
- Timeout 8s; fallback “I didn’t catch that—could you rephrase?”

**Streaming (nice-to-have)**: stream partial tokens to client via `message:partial` then finalize with `message:new`.

---

## 8) Privacy & Security
- **At rest encryption**: AES-256-GCM (nonce per message). Toggle via env flag if needed.
- **In transit**: HTTPS (document for prod), secure cookies (httpOnly, sameSite)
- **Auth**: JWT (short-lived access, optional refresh later)
- **Rate limiting**: IP-based for auth and message send
- **Retention**: `retentionDays` per conversation, nightly cleanup job
- **Delete**: per-message and per-conversation delete endpoints (soft delete not required for MVP)

---

## 9) Pagination & Performance
- **Message history**: keyset pagination using `createdAt < cursor`
- **Conversation list**: include `lastMessage` via subquery/CTE or cache column (updated by trigger); start simple with a query + index
- **Indexes**: as listed in schema
- **N+1**: use joins/selects sized for UI needs (avoid overfetch)

---

## 10) Testing & Seed
- **Unit**: auth.service, conversations.service, ai.service (mock provider)
- **Integration**: auth flows, create convo, send message, list messages
- **Seed script**: creates: user A, user B, AI user; sample messages; one convo with AI

---

## 11) Frontend Routing & UX
Routes
- `/login`, `/register`
- `/chat` → left tabs visible; default to first conversation
- `/contacts`
- `/dashboard` (optional)

UX details
- Chat list with last message preview + timestamp
- Thread auto-scroll to bottom on new message
- Composer with multiline textarea and Cmd/Ctrl+Enter to send
- Contacts: add by email → auto-create 1:1 chat
- AI Chat: pre-seeded “Relatim AI” contact (badge)

---

## 12) README Outline
- Project intro + screenshots
- Quick start (docker compose up; `pnpm i && pnpm dev` at root)
- .env setup
- Prisma migrate + seed
- Architecture diagram (simple boxes: Web ↔ API/Socket ↔ Postgres; AiProvider)
- ERD & main endpoints
- Trade-offs & how to extend (groups, media, presence, search)
- Privacy controls (encryption, retention)

---

## 13) Acceptance Criteria (MVP)
- Register/login works; protected routes enforced
- Create/view contacts; start 1:1 chat
- Send/receive messages in real time
- AI conversation returns a reply and renders in thread
- Message history paginates smoothly
- Clean README with run steps and architecture notes
- Optional: `/dashboard` shows 3–4 metrics without lag
