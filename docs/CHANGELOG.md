# CHANGELOG — Development History

All notable changes to the WorkElate AI application are documented in this file in reverse chronological order.

---

## [1.0.2] — 2026-11-16

### Fix for Input Stuck in "Running" State
- **Decoupled Active Execution from Inspection**: Separated `activeStreamId` (active live task) from `inspectedExecutionId` (viewed task details) in `App.tsx`. Selecting an existing chat session now inspects past results without starting a live SSE stream.
- **Backend Completed Task Handling in SSE**: Updated `/api/executions/{id}/stream` to check the database on connection. If the execution has already reached a terminal state (`Completed`, `Failed`, `Timed out`, `Cancelled`), it replays events and immediately terminates the stream with a `complete` event instead of waiting indefinitely.
- **SSE Safety Timeout & Stop Handler**: Added a safety timer and an explicit `stop()` method to `useSSE.ts`. Wired `onStop` directly to `ChatInput.tsx` to ensure users can abort stuck streaming states at any time.

---

## [1.0.1] — 2026-11-16

### Bug Fixes & Live Feedback Improvements
- **Windows Async Subprocess Fix**: Fixed Windows `NotImplementedError` raised when uvicorn was running with `WindowsSelectorEventLoopPolicy` by refactoring `CLIExecutionRunner` to use thread-safe `subprocess.Popen` execution with unbuffered stdout/stderr streaming.
- **In-Flight Live Chat Indicator**: Added immediate in-flight assistant response in `App.tsx` and `ChatMessage.tsx`, updating the message in the chat with real-time timeline steps as they execute.
- **Stale Closure Resolution in SSE Hook**: Wrapped `useSSE` callbacks in `useRef` and tracked `currentSessionIdRef` so session messages reload reliably upon task completion even on initial conversations.
- **Failure Message Persistence**: Updated `TaskOrchestrator` to persist assistant failure messages into `chat_messages` so errors, timeouts, or policy blocks are displayed with full explanations in chat.

---

## [1.0.0] — 2026-11-16

### Initial Release & Full Implementation

#### Features Implemented
- **CLI Subprocess Execution Engine**: Implemented `CLIExecutionRunner` and whitelisted `CLIRegistry` executing standalone CLI tools via `asyncio.create_subprocess_exec` without shell interpolation.
- **Autonomous Website Crawler CLI**: Built standalone `app.crawler.cli` using `httpx` and `BeautifulSoup4` extracting page titles, metadata, OpenGraph tags, H1-H3 headings, paragraphs, and links.
- **Live AI Activity Transparency Panel**: Created 15-step chronological timeline in frontend UI receiving real-time Server-Sent Events (SSE) updates from the backend execution engine.
- **Developer Technical Logs View**: Implemented detailed technical log panel recording execution ID, timestamp, tool, validated parameters, process start/end times, stdout, stderr, exit code, and sanitized output.
- **Anti-SSRF & Security Validator**: Enforced HTTP/HTTPS protocol restrictions, DNS hostname resolution checks, blocking loopback and private subnets (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`).
- **AI Intent Understanding & Summarization**: Integrated Gemini API (`google.generativeai`) with a robust deterministic fallback for offline/local execution.
- **Persistent Database Storage**: Designed SQLAlchemy 2.0 Async models (`ChatSession`, `ChatMessage`, `TaskExecution`) with SQLite default and PostgreSQL migration compatibility.
- **Structured Multi-Tab Results**: Created interactive tabs for AI Summary, Extracted Content, Crawled Pages, JSON Viewer, and CLI Logs, complete with Copy and Download JSON buttons.
- **Task Execution History Dashboard**: Built history modal to revisit previous executions, inspect parameters and technical logs, and rerun tasks.

#### Files Created
- `backend/app/config.py`
- `backend/app/main.py`
- `backend/app/database/connection.py`
- `backend/app/database/models.py`
- `backend/app/schemas/chat.py`
- `backend/app/schemas/execution.py`
- `backend/app/services/security_validator.py`
- `backend/app/services/event_bus.py`
- `backend/app/services/ai_intent.py`
- `backend/app/services/summarizer.py`
- `backend/app/services/task_orchestrator.py`
- `backend/app/cli_engine/registry.py`
- `backend/app/cli_engine/runner.py`
- `backend/app/crawler/engine.py`
- `backend/app/crawler/cli.py`
- `backend/tests/test_security.py`
- `backend/tests/test_crawler.py`
- `backend/tests/test_cli_runner.py`
- `backend/tests/test_api.py`
- `backend/tests/test_end_to_end.py`
- `backend/requirements.txt`
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/tailwind.config.js`
- `frontend/postcss.config.js`
- `frontend/index.html`
- `frontend/src/index.css`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/services/api.ts`
- `frontend/src/hooks/useSSE.ts`
- `frontend/src/components/ActivityPanel.tsx`
- `frontend/src/components/StructuredResultView.tsx`
- `frontend/src/components/ChatMessage.tsx`
- `frontend/src/components/ChatInput.tsx`
- `frontend/src/components/ChatSidebar.tsx`
- `frontend/src/components/CrawlConfigModal.tsx`
- `frontend/src/components/ExecutionHistoryModal.tsx`
- `docs/README.md`
- `docs/AI_CONTEXT.md`
- `docs/CHANGELOG.md`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/API_DOCUMENTATION.md`
- `docs/DEVELOPMENT_LOG.md`
- `.env.example`
- `README.md`
- `run_app.bat`
- `run_demo.ps1`

#### Dependencies Added
- Backend: `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`, `httpx`, `beautifulsoup4`, `sqlalchemy`, `aiosqlite`, `greenlet`, `google-generativeai`, `pytest`, `pytest-asyncio`.
- Frontend: `react`, `react-dom`, `vite`, `typescript`, `tailwindcss`, `lucide-react`, `react-markdown`, `remark-gfm`.

#### Bugs Fixed
- Fixed missing `greenlet` dependency required by SQLAlchemy async engine under Python 3.13.
- Fixed URL validation edge case in `SecurityValidator` where URLs with arbitrary schemes (e.g. `javascript:`, `ftp:`) were erroneously prefixed with `https://`.
- Fixed pytest-asyncio fixture scope error by directly initializing database in async tests.
- Replaced deprecated `datetime.datetime.utcnow()` with `datetime.datetime.now(datetime.timezone.utc)`.

#### Tests Performed & Results
- Unit test suite (`backend/tests/`): 12 tests passed (Security, Crawler Engine, Subprocess Runner, API Lifecycle).
- Integration test (`test_end_to_end.py`): Live crawl of `https://example.com` verified end-to-end with exit code 0, JSON validation, and SQLite persistence.
- Frontend build (`npm run build`): Completed with 0 TypeScript or Vite bundling errors.
