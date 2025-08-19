## Real-time Chat Backend (Node.js + Express + Socket.IO + TypeScript + MySQL)

A production-ready backend for a real-time chat application with authentication, chat rooms (public/private), real-time messaging, presence (online/offline + last seen), rate limiting, and secure access control. Built with Node.js, Express, TypeScript, Socket.IO, and MySQL using Prisma ORM.

### Features
- JWT authentication (register/login), passwords hashed with bcrypt
- Chat rooms: create public/private, join via room ID/invite code, list a user's rooms
- Real-time messaging with Socket.IO; message history persisted in MySQL
- Presence: online/offline tracking and last seen timestamps
- Typing indicators per room
- Security: basic message rate limiting (5 msgs / 10s per user/room), input validation, access control for private rooms

### Tech Stack
- Node.js (Express)
- Socket.IO
- TypeScript
- MySQL (Prisma ORM)
- Jest for integration tests (socket.io-client)

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- MySQL 8+ (local or remote)

### 1) Clone and install
- Copy env template and fill with your values

```bash
cp .env.example .env
```

- Install dependencies and init Prisma (the scripts below will be available after scaffolding)

```bash
npm install
npx prisma generate
```

### 2) Database setup
- Ensure DATABASE_URL is set in `.env` (see `.env.example`)
- Run initial migration to create tables

```bash
npx prisma migrate dev --name init
```

### 3) Run the server
- Development (with auto-reload)

```bash
npm run dev
```

- Production build and start

```bash
npm run build
npm start
```

Server will start on `http://localhost:3000` by default (configurable via `PORT`).

### 4) Run tests

```bash
npm test
```

---

## Environment Variables
See `.env.example` for the complete list.
- `DATABASE_URL` (required) — MySQL connection string, e.g. `mysql://user:pass@localhost:3306/chat_app`
- `JWT_SECRET` (required) — strong random secret for signing tokens
- `PORT` — default `3000`
- `CORS_ORIGIN` — e.g. `http://localhost:5173` for local frontend
- `MESSAGE_RATE_LIMIT` — messages allowed per window (default 5)
- `MESSAGE_RATE_WINDOW_MS` — window in ms (default 10000)

---

## API Overview

Base URL: `/api`

Auth
- `POST /api/auth/register` — { name, email, password }
- `POST /api/auth/login` — { email, password } → { token }

Rooms
- `GET /api/rooms` — list rooms for the authenticated user
- `POST /api/rooms` — { name, isPrivate? } → creates room with inviteCode
- `POST /api/rooms/:roomId/join` — { inviteCode? } → joins a room (invite required if private)
- `GET /api/rooms/:roomId/messages?cursor=&limit=` — paginated message history

JWT: send `Authorization: Bearer <token>` header.

---

## Socket.IO Events
Client emits
- `join_room` — payload: { roomId }
- `send_message` — payload: { roomId, content }
- `typing` — payload: { roomId, isTyping }
- `message_delivered` — payload: { messageId }
- `message_read` — payload: { messageId }

Server emits
- `receive_message` — payload: { id, roomId, senderId, content, createdAt }
- `user_status` — payload: { userId, status: 'online' | 'offline', lastSeen? }
- `typing` — forwarded to other users in the room
- `message_status` — payload: { messageId, userId, deliveredAt?, readAt? }

Presence: The server tracks socket connections per user. On disconnect, `lastSeen` is saved and status becomes `offline`.

---

## Data Model (Prisma)

Tables: `users`, `rooms`, `room_members`, `messages`, `message_receipts`

- User
  - id (PK), email (unique), passwordHash, name, lastSeen, createdAt, updatedAt
- Room
  - id (PK), name, isPrivate, inviteCode (unique), createdById, createdAt
- RoomMember
  - id (PK), roomId (FK), userId (FK), joinedAt; unique (roomId, userId)
- Message
  - id (PK), roomId (FK), senderId (FK), content, createdAt
- MessageReceipt
  - id (PK), messageId (FK), userId (FK), deliveredAt, readAt; unique (messageId, userId)

---

## Security & Rate Limiting
- Validate payloads, sanitize strings
- Access control: only members can join/send/list a private room; invite required to join
- Rate limit messages: default 5 per 10s per user per room (configurable via env)
- Message receipts: clients can emit `message_delivered` / `message_read`; server persists and broadcasts `message_status`

---

## Project Structure
```
.
├─ prisma/
│  └─ schema.prisma
├─ src/
│  ├─ index.ts              # Express + HTTP + Socket.IO bootstrap + static frontend
│  ├─ config/env.ts         # env loader and config
│  ├─ middleware/auth.ts    # JWT auth middleware
│  ├─ routes/
│  │  ├─ auth.ts
│  │  ├─ rooms.ts
│  │  └─ members.ts
│  ├─ socket/
│  │  ├─ index.ts           # socket event handlers (join_room, send_message, typing, presence, logging)
│  │  └─ receipts.ts        # message_delivered/read handling
│  ├─ services/
│  │  ├─ rateLimiter.ts     # in-memory message rate limiter
│  │  └─ presence.ts        # online tracking
│  └─ types/
│     └─ express.d.ts       # Request user typing
├─ public/                  # simple test UI (toasts, members list, load older)
├─ tests/
│  ├─ message-delivery.test.js
│  └─ message-receipts.test.js
├─ tsconfig.json
├─ package.json
└─ .env
```


---

## Docker

### One command (docker-compose)

1) Create .env with your secrets (JWT_SECRET, optionally CORS_ORIGIN)
2) Run:

```bash
docker compose up --build
```

This will start:
- MySQL 8 on port 3306 with volume `dbdata`
- API on port 3000, serving the test UI at `/`

Environment used by the API container (set in docker-compose.yml):
- DATABASE_URL=mysql://root:password@db:3306/chat_app
- JWT_SECRET (fallback to devsecret)
- CORS_ORIGIN (fallback http://localhost:5173)

The API container waits for the DB, runs `prisma migrate deploy`, then starts the server.

### Dockerfile (production build)

We provide a Dockerfile that:
- Installs dependencies
- Generates Prisma client
- Builds TypeScript
- Runs `prisma migrate deploy` on container start

Build and run manually:
```bash
docker build -t chat-backend .
docker run --env-file .env -p 3000:3000 chat-backend
```

---

## Scripts
- `dev` — start with ts-node-dev
- `build` — compile TypeScript to `dist`
- `start` — run compiled server
- `test` — build then run Jest integration tests

---

## Development Notes
- Use Prisma Client for DB access. Generate client after changing schema: `npx prisma generate`
- Prefer parameterized queries via Prisma to avoid SQL injection and to simplify transactions
- Add tests for routes and socket handlers as needed (e.g., Jest + supertest + socket.io-client)

---

## Scripts (after scaffolding)
- `dev` — start with ts-node-dev
- `build` — compile TypeScript to `dist`
- `start` — run compiled server