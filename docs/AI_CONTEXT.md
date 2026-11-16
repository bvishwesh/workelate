# AI_CONTEXT.md — Context for Future AI Coding Assistants

Before modifying this project, read this file and README.md completely. Inspect the existing codebase before making changes. Do not recreate existing features, replace working implementations unnecessarily, or assume a feature exists just because it is documented. Verify the actual code.

---

## 1. What the Project Does & Why It Was Built
WorkElate is a production-quality AI agent chat application built to bridge the gap between LLM natural language understanding and real, controlled backend CLI execution.

Instead of generating text through an LLM and hallucinating results, WorkElate:
1. Parses natural language instructions (e.g. *"Crawl https://example.com and summarize it"*).
2. Screens input for security (anti-SSRF, DNS resolution, private IP blocking).
3. Spawns an approved, whitelisted CLI tool via `asyncio.create_subprocess_exec` without shell interpolation.
4. Streams live stdout, stderr, and chronological execution steps to the user via Server-Sent Events (SSE).
5. Captures the exit code and structured output.
6. Synthesizes an executive markdown summary from the actual crawled content.
7. Stores the execution persistently in SQLite (with a clean SQLAlchemy architecture for PostgreSQL).

---

## 2. Technology Stack & Key Dependencies

### Backend
- **Python 3.13**
- **FastAPI**: REST API, asynchronous execution, and Server-Sent Events (`StreamingResponse`).
- **SQLAlchemy 2.0 (Async) + aiosqlite + greenlet**: Database ORM and persistent storage.
- **httpx & BeautifulSoup4**: Real web scraping and DOM extraction engine.
- **google-generativeai**: Gemini API for intent parsing and summarization (with deterministic fallback).
- **pydantic & pydantic-settings (V2)**: Strict data validation and environment configuration.
- **pytest & pytest-asyncio**: Comprehensive unit and integration test suite.

### Frontend
- **React 18 + TypeScript + Vite**: Modern, responsive SPA with fast HMR.
- **Tailwind CSS**: Dark charcoal developer theme with purple/blue accents.
- **Lucide React**: Iconography.
- **react-markdown & remark-gfm**: Markdown parsing for AI responses and tables.

---

## 3. Important Files and Directory Layout

```
workelate/
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI REST and SSE endpoints
│   │   ├── config.py                 # Pydantic BaseSettings & configuration
│   │   ├── database/
│   │   │   ├── connection.py         # SQLAlchemy engine, session maker, init_db
│   │   │   └── models.py             # ChatSession, ChatMessage, TaskExecution models
│   │   ├── schemas/
│   │   │   ├── chat.py               # Pydantic schemas for sessions & messages
│   │   │   └── execution.py          # Schemas for timeline events, tasks, logs
│   │   ├── services/
│   │   │   ├── security_validator.py # URL validation, Anti-SSRF, IP resolution, secret redaction
│   │   │   ├── ai_intent.py          # Gemini API + deterministic rule-based intent parser
│   │   │   ├── summarizer.py         # Gemini API + extractive structured summarizer
│   │   │   ├── event_bus.py          # Async pub-sub bus for real-time SSE event broadcast
│   │   │   └── task_orchestrator.py  # End-to-end task coordinator
│   │   ├── cli_engine/
│   │   │   ├── registry.py           # Whitelisted command registry (prevents arbitrary execution)
│   │   │   └── runner.py             # Subprocess execution manager (stdout/stderr streaming, timeouts)
│   │   └── crawler/
│   │       ├── cli.py                # Standalone CLI entrypoint (`python -m app.crawler.cli`)
│   │       └── engine.py             # Asynchronous web crawler using httpx & BeautifulSoup4
│   ├── tests/
│   │   ├── test_security.py          # Unit tests for SSRF, private IPs, schemes, sanitization
│   │   ├── test_crawler.py           # Unit tests for HTML parser and metadata extraction
│   │   ├── test_cli_runner.py        # Subprocess runner, timeout, and exit code tests
│   │   ├── test_api.py               # REST API endpoints and session lifecycle tests
│   │   └── test_end_to_end.py        # Full end-to-end crawler execution and persistence test
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ActivityPanel.tsx     # 15-step chronological timeline & technical logs
│   │   │   ├── StructuredResultView.tsx # Multi-tab viewer (Summary, Extracted, Pages, JSON, Logs)
│   │   │   ├── ChatMessage.tsx       # Message bubbles, markdown, inspect buttons
│   │   │   ├── ChatInput.tsx         # Multiline input, example pills, config modal trigger
│   │   │   ├── ChatSidebar.tsx       # Sessions list, new chat, search, execution history modal
│   │   │   ├── CrawlConfigModal.tsx  # Max pages & depth slider modal
│   │   │   └── ExecutionHistoryModal.tsx # Task execution history inspector & retry
│   │   ├── hooks/
│   │   │   └── useSSE.ts             # EventSource hook listening to /api/executions/:id/stream
│   │   ├── services/
│   │   │   └── api.ts                # Fetch client for all backend REST APIs
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript interfaces
│   │   ├── App.tsx                   # Main layout and state coordinator
│   │   ├── index.css                 # Tailwind CSS styles & custom scrollbars
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docs/                             # Dedicated documentation directory
│   ├── README.md                     # Main project documentation
│   ├── AI_CONTEXT.md                 # Context for future AI IDEs (this file)
│   ├── CHANGELOG.md                  # Chronological change history
│   ├── TASKS.md                      # Development progress checklist
│   ├── ARCHITECTURE.md               # Architecture specification and Mermaid diagrams
│   ├── API_DOCUMENTATION.md          # REST & SSE endpoint reference
│   └── DEVELOPMENT_LOG.md            # Detailed AI developer journal
├── .env.example                      # Sample configuration file
├── run_app.bat                       # Windows double-click launcher
├── run_demo.ps1                      # PowerShell launcher
└── README.md                         # Root README pointing to docs
```

---

## 4. How Frontend and Backend Communicate

1. **Submission**: Frontend calls `POST /api/chat` with `{ content, session_id, crawl_options }`.
2. **Immediate Acknowledgment**: Backend persists the user message and creates a `TaskExecution` row with status `Running`, returning `{ execution_id, session_id }` immediately.
3. **Real-time SSE Stream**: Frontend connects to `GET /api/executions/{execution_id}/stream` using the `useSSE` hook.
4. **Live Events**: The backend emits:
   - `timeline_step`: Updates the 15-step chronological checklist.
   - `stdout`: Streams raw JSON output line-by-line.
   - `stderr`: Streams CLI `[STATUS]` messages in real-time.
   - `complete`: Final event indicating terminal state (`Completed`, `Failed`, `Timed out`).
5. **Final Sync**: Upon completion, the frontend refetches `/api/sessions/{session_id}` to display the AI markdown summary and structured data tabs.

---

## 5. How CLI Execution Works

- **No `shell=True`**: Commands are executed directly as process arguments using `asyncio.create_subprocess_exec`.
- **Command Whitelist**: All executables and argument patterns are strictly registered in `CLIRegistry`. No arbitrary binaries can be invoked.
- **Standalone CLI**: The crawler can be invoked manually from terminal:
  `python -m app.crawler.cli --url https://example.com --max-pages 1 --depth 1`
- **Output Channels**:
  - `stderr`: Used for operational status lines (`[STATUS] Connecting...`, `[STATUS] Extracting...`).
  - `stdout`: Used exclusively for the final serialized JSON document.
  - `exit code`: `0` on success, `1` on crawl error, `2` on security validation error.

---

## 6. Security Features Implemented

1. **Anti-SSRF Validation**: Blocks localhost (`127.0.0.1`, `::1`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and AWS/GCP metadata (`169.254.169.254`).
2. **Safe Crawl Bounds**: Hard-capped to a maximum of 15 pages and depth 3 to prevent runaway spiders.
3. **Subprocess Timeout**: 60-second execution deadline terminates lingering processes.
4. **Secret Redaction**: Standard error/output logs are sanitized to strip API keys or auth tokens before broadcast or storage.
5. **Untrusted Data Isolation**: All crawled content is treated as untrusted text, preventing prompt injections.

---

## 7. Current Development Stage & Implemented Features

### Fully Implemented & Tested
- [x] Controlled CLI Execution Engine with asynchronous subprocess spawning.
- [x] Standalone website crawler CLI (`httpx` + `BeautifulSoup4`).
- [x] Anti-SSRF and DNS security validation.
- [x] AI Intent Understanding (Gemini API with robust rule fallback).
- [x] AI Summarizer (Gemini API with structured fallback).
- [x] Server-Sent Events (SSE) real-time event bus.
- [x] Persistent SQLite database via SQLAlchemy Async.
- [x] Modern Dark Minimalist React Frontend with Lucide icons.
- [x] 15-step Live Activity Transparency Panel with status badges.
- [x] Multi-tab structured result view (Summary, Extracted Content, Pages, JSON, CLI Logs).
- [x] Copy and Download JSON buttons.
- [x] Task Execution History Modal with rerun capabilities.
- [x] 100% passing test suite across security, crawler, CLI runner, REST API, and end-to-end integration.

### Instructions for Continuing Development
1. When adding new CLI tools:
   - Register them in `backend/app/cli_engine/registry.py` with allowed flags.
   - Implement parameter validators in `backend/app/services/security_validator.py`.
   - Update `AIIntentService` in `backend/app/services/ai_intent.py` to classify the new tool.
2. When deploying to production:
   - Switch `DATABASE_URL` in `.env` to PostgreSQL (e.g. `postgresql+asyncpg://user:pass@host/db`).
   - Set `ENVIRONMENT=production` and configure `CORS_ORIGINS`.
   - Provide a valid `GEMINI_API_KEY`.
