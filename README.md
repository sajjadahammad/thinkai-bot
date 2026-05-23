# ThinkAI: Lightweight Inference Logging & Chatbot System

A fullstack application implementing a conversational LLM chatbot with real-time inference metadata logging, PII redaction, and a performance analytics dashboard.

---

## 🚀 Quick Start (Docker Compose)

Start the entire system (Database, FastAPI Backend, Next.js Frontend) with a single command:

```bash
docker-compose up --build
```

- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Postgres Database**: `http://localhost:5432`

---

### 🔑 Admin Credentials

The system auto-creates an admin user on startup for accessing the **Analytics Dashboard**:

| Field | Value |
|-------|-------|
| Email | `admin@olivebot.ai` |
| Password | `adminpassword123` |

> **Note**: Change these in `backend/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) before deploying to production.

---

## 🛠️ Local Development Setup

If you prefer to run services individually:

### 1. Prerequisite: PostgreSQL
Make sure you have a running PostgreSQL database. Set the connection string in a `.env` file in the `backend/` directory:
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/olivebot
MISTRAL_API_KEY=your_mistral_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Backend (FastAPI)
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Activate your virtual environment and install packages:
   ```bash
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### 3. Frontend (Next.js)
1. Navigate to the `frontend/` directory:
   ```bash
   cd ../frontend
   ```
2. Install npm modules:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📐 Architecture Overview

```
 ┌────────────────┐         HTTP (SSE Stream)        ┌─────────────────┐
 │   Next.js UI   │ ◄──────────────────────────────  │ FastAPI Backend │
 └───────┬────────┘                                  └────────┬────────┘
         │                                                    │
         │ HTTP Log Ingest                                    │ Read/Write DB
         ▼                                                    ▼
 ┌───────────────┐               Async Ingest        ┌─────────────────┐
 │ Ingestion API │ ◄──────────────────────────────── │ PostgreSQL DB   │
 └───────────────┘                                   └─────────────────┘
```

1. **Next.js Frontend**: Renders a dark, premium chat interface matching the ThinkAI mockups, alongside a real-time Metrics Dashboard featuring interactive SVG trendlines.
2. **FastAPI Backend**: Hosts the LLM streaming connector (using LangGraph/LangChain), DB read/write services, and the decoupled ingestion endpoint.
3. **Inference Logger SDK**: A Python context manager that wraps LLM invocations inside the backend, captures usage stats and execution performance, and asynchronously pushes telemetry payloads to the ingestion pipeline.
4. **PostgreSQL Database**: Persists chat sessions, individual messages (both raw and redacted), and telemetry log records.

---

## 🗂️ Folder Structure

```text
olivebot/
|-- backend/
|   |-- app/
|   |   |-- api/            # FastAPI routers, endpoint modules, and dependencies
|   |   |-- core/           # App config, database setup, security, and logging SDK
|   |   |-- models/         # SQLAlchemy ORM models for persisted entities
|   |   |-- schemas/        # Pydantic request/response schemas
|   |   |-- services/       # Agent, document, and PII redaction business logic
|   |   `-- main.py         # FastAPI application entry point
|   |-- Dockerfile          # Backend container definition
|   |-- requirements.txt    # Python dependencies
|   `-- README.md           # Backend-specific notes
|-- frontend/
|   |-- src/
|   |   |-- app/            # Next.js App Router pages, layout, and global styles
|   |   |-- components/     # Chat UI, dashboard widgets, providers, and shared UI
|   |   |-- hooks/          # React hooks for chat, conversations, and dashboard data
|   |   |-- lib/            # Shared utilities and API helpers
|   |   |-- services/       # Auth/chat API client wrappers
|   |   |-- store/          # Client-side chat state management
|   |   |-- styles/         # Markdown and content styling
|   |   `-- types/          # Shared TypeScript types
|   |-- public/             # Static frontend assets
|   |-- Dockerfile          # Frontend container definition
|   |-- package.json        # Node scripts and dependencies
|   `-- README.md           # Frontend-specific notes
|-- docker-compose.yml      # Local orchestration for frontend, backend, and Postgres
|-- README.md               # Root project overview and setup guide
`-- skills-lock.json        # Local agent skill metadata
```

The backend is organized as a layered FastAPI service: API endpoints stay thin, shared configuration lives in `core`, database tables live in `models`, validation contracts live in `schemas`, and reusable business logic lives in `services`. The frontend follows the Next.js App Router structure, with route-level pages in `src/app` and reusable chat/dashboard building blocks under `src/components`.

---

## 📂 Database Schema Design

Three core tables model the system state:

### 1. `conversations`
- `id` (UUID, Primary Key): Unique chat session ID.
- `title` (VARCHAR): Auto-generated summary of the user's initial prompt.
- `created_at`/`updated_at` (TIMESTAMP WITH TIME ZONE).

### 2. `messages`
- `id` (UUID, Primary Key): Unique message ID.
- `conversation_id` (UUID, Foreign Key): Links to conversation (ON DELETE CASCADE).
- `role` (VARCHAR): `user` or `assistant`.
- `content` (TEXT): PII-redacted message content (safe for standard logs/previews).
- `raw_content` (TEXT): Raw unredacted message content (secured).

### 3. `inference_logs`
- `id` (UUID, Primary Key): Unique telemetry log ID.
- `conversation_id` (UUID, Foreign Key, Nullable).
- `message_id` (UUID, Foreign Key, Nullable).
- `model`/`provider` (VARCHAR): Details of the execution model.
- `latency_ms` (INTEGER): Roundtrip duration to complete generation.
- `prompt_tokens`/`completion_tokens`/`total_tokens` (INTEGER).
- `status_code` (INTEGER): HTTP status of LLM request.
- `error_message` (TEXT, Nullable).
- `input_preview`/`output_preview` (TEXT): First 500 characters of PII-redacted text.

---

## 🛡️ PII Redaction Strategy

To protect sensitive user data, a dedicated **PIIRedactor** is integrated into the message and logging pipeline:
1. **Hybrid Redaction Engine**: Attempts to import `presidio-analyzer` / `presidio-anonymizer` for machine learning-based PII detection. If unavailable, it falls back to a high-performance Regular Expression engine.
2. **Standard Mappings**: Detects and replaces:
   - **Credit Cards** (`[CREDIT_CARD]`)
   - **Emails** (`[EMAIL]`)
   - **Phone Numbers** (`[PHONE]`)
   - **Social Security Numbers / SSNs** (`[SSN]`)
   - **IP Addresses** (`[IP_ADDRESS]`)
3. **Log Safeguards**: Both `input_preview` and `output_preview` stored in `inference_logs` are strictly redacted *prior* to ingestion, ensuring the dashboards never display sensitive information.

---

## ⚡ Technical Tradeoffs & Architectural Notes

### 1. Decoupled Ingestion Flow
To ensure log capturing never blocks chatbot response times:
- The **Inference Logger SDK** executes `httpx.post` calls to the ingestion API within Python's asynchronous event loop (`asyncio.create_task`), completely decoupling it from the client streaming response.
- The **Ingestion API** (`/api/v1/logs`) operates as a separate endpoint, allowing it to scale independently or run behind a task queue/event broker in production.

### 2. Custom SVG Rendering vs Third-Party Charts
Instead of loading heavy, peer-dependency-conflict-prone React charts like Recharts (which often fail on React 19 / Next.js 16 projects), we built lightweight, responsive, native **SVG-based chart components**. This results in:
- Instant page loads and zero bundle overhead.
- No peer dependency warning flags.
- Complete visual control matching the ThinkAI dark gradient mockup.

### 3. Streaming Cancellation Grace
If a user hits the "Stop" button in the UI, the frontend calls `.abort()` on the active connection. The backend intercepts `asyncio.CancelledError`, immediately records the partially generated response in the database, and reports the event telemetry successfully.

---

## 📈 Scaling Considerations
1. **Log Brokering**: In a high-traffic environment, direct API calls to `/api/v1/logs` can be routed through an event streaming bus (e.g. Apache Kafka or RabbitMQ) to buffer writes to PostgreSQL.
2. **Read/Write Splitting**: Since dashboard queries aggregate large amounts of data, we should utilize read-replicas for analytical queries (`/dashboard/metrics`) while keeping transactional writes on the primary PostgreSQL master node.
3. **Partitioning**: Partitioning `inference_logs` by month/day will keep database indexes performant as log volume grows into millions of entries.

---

## 🛑 Failure Handling

1. **SDK Fire-and-Forget Logging**: The inference logger SDK sends telemetry via `asyncio.create_task` — if the log ingestion endpoint is down, the chat response still completes normally. Failed log deliveries are caught and printed to server logs without interrupting the user experience.
2. **Database Initialization Graceful Degradation**: On startup, if the database is unreachable, the server prints a warning but still boots. Chat and telemetry will fail on write, but the health endpoint remains responsive for container orchestrators.
3. **Streaming Cancellation Recovery**: If a user aborts mid-stream, `asyncio.CancelledError` is caught — the partial response is saved to the database, and the telemetry log records the incomplete generation event.
4. **LLM Provider Failover**: If an API key is missing or invalid, the backend returns a clear error message to the frontend instead of crashing. The UI displays this to the user.
5. **PII Redaction Fallback**: If the Presidio ML engine fails to load, the system seamlessly falls back to high-performance regex-based PII detection without any downtime.

---

## 🔮 What We Would Improve With More Time

1. **Social Authentication**: Add OAuth 2.0 login via Google, GitHub, and Microsoft for seamless onboarding without manual signup.
2. **WebSocket Streaming**: Replace SSE with WebSocket connections for bidirectional real-time communication and lower latency.
3. **Kubernetes Deployment**: Add Helm charts and K8s manifests for production-grade orchestration with auto-scaling, health probes, and rolling deployments.
4. **Rate Limiting & API Key Rotation**: Implement per-user rate limiting and automatic API key rotation for LLM providers.
5. **Multi-Language PII Detection**: Extend PII redaction beyond English to support multilingual content detection.
6. **Conversation Search & Export**: Full-text search across conversations and export chat history as PDF/Markdown.
7. **Webhook Notifications**: Push alerts for error spikes, latency anomalies, or budget thresholds via Slack/email.
8. **Fine-Grained RBAC**: Role-based access control with team workspaces, shared conversations, and audit logs.
9. **Local Vector Embeddings**: Use a Python embedding library to generate vectors locally, reducing dependency on hosted embedding models and avoiding token spend. We did not include this in the current build because the required packages can add over 1 GB to the deployment size.
