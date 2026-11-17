# WorkElate AI — CLI-Powered Autonomous Agent Chat Application

WorkElate is a production-grade, full-stack AI chat application that converts natural-language instructions into real, verifiable CLI tasks through a controlled backend execution engine.

---

## 🚀 Live Cloud Deployment

- **🌐 Live Web Application**: [https://workelate-agent.onrender.com/](https://workelate-agent.onrender.com/)
- **🩺 API Health Endpoint**: [https://workelate-agent.onrender.com/api/health](https://workelate-agent.onrender.com/api/health)
- **📖 Swagger API Documentation**: [https://workelate-agent.onrender.com/docs](https://workelate-agent.onrender.com/docs)
- **🐙 GitHub Repository**: [https://github.com/bvishwesh/workelate](https://github.com/bvishwesh/workelate)

---

## 1. Project Overview & Problem Statement

### Problem Statement
Most AI chatbots today are simple LLM wrappers that generate text responses without performing actual computation or work. When users ask an AI to "crawl this website and extract data", typical chat interfaces simply hallucinate content or summarize their static training memory. The user cannot verify whether actual execution occurred, what tools ran, or if security boundaries were respected.

### Project Objectives
1. **Real Subprocess Execution**: Invoke an approved, standalone CLI crawler subprocess on the host system without shell interpolation.
2. **Live AI Activity Transparency**: Display a 15-step chronological execution timeline powered by real backend events over Server-Sent Events (SSE).
3. **Developer Technical Logs**: Expose real-time stdout, stderr, process IDs, exit codes, and durations while strictly scrubbing sensitive credentials.
4. **Structured Multi-Tab Results**: Return AI executive summaries, extracted DOM components (headings, paragraphs, metadata, links), crawled pages tables, and downloadable JSON.
5. **Rigorous Security**: Prevent Server-Side Request Forgery (SSRF), shell injection, internal network scanning, and prompt injection from untrusted web pages.
6. **AI IDE Handoff Documentation**: Maintain complete, persistent documentation in `/docs` allowing seamless handover across AI coding environments.

---

## 2. Technology Stack

### Backend
- **Language**: Python 3.13
- **Web Framework**: FastAPI (Async REST + Server-Sent Events)
- **Database & ORM**: SQLite with SQLAlchemy 2.0 (Async) + `aiosqlite` + `greenlet`
- **Crawler CLI**: Custom standalone CLI powered by `httpx` and `BeautifulSoup4`
- **AI Services**: Google Gemini API (`google-generativeai`) with a deterministic rule-based fallback
- **Validation**: Pydantic V2 & `pydantic-settings`
- **Testing**: `pytest`, `pytest-asyncio`, `pytest-mock`

### Frontend
- **Framework**: React 18 with TypeScript and Vite
- **Styling**: Tailwind CSS (dark charcoal developer theme with purple/blue accents)
- **Icons**: Lucide React
- **Markdown & Code**: `react-markdown` with `remark-gfm`
- **Real-Time Streaming**: Native Server-Sent Events (`EventSource`) via custom `useSSE` hook

---

## 3. Architecture & Workflows

### Architecture Diagram
```mermaid
graph TD
    User([User Browser]) -->|HTTP / SSE| UI[React 18 + Tailwind UI]
    UI -->|POST /api/chat| API[FastAPI Server]
    API -->|SSE Stream| UI

    subgraph Backend Core
        API --> Intent[AI Intent Service]
        Intent --> Security[Security Validator (SSRF & DNS)]
        Security --> Orchestrator[Task Orchestrator]
        Orchestrator --> Registry[Approved CLI Registry]
        Registry --> Runner[Subprocess Runner]
        Orchestrator --> EventBus[Async Event Bus]
        EventBus -->|Live SSE| UI
    end

    subgraph CLI Subprocess
        Runner -->|asyncio.create_subprocess_exec| CLIProcess[Crawler CLI Subprocess]
        CLIProcess -->|HTTP GET| Target[(Target Website)]
        CLIProcess -->|stderr: [STATUS]| Runner
        CLIProcess -->|stdout: JSON| Runner
    end

    subgraph Persistence
        Orchestrator --> DB[(SQLite Database)]
        DB --> API
    end
```

### 15-Step Execution Timeline
Whenever a user submits a task (e.g. *"Crawl https://example.com and summarize it"*), the backend broadcasts real-time updates for each stage:
1. `Understanding your request...`
2. `Identified task: Website crawling.`
3. `Extracted URL: https://example.com`
4. `Validating URL and security restrictions...`
5. `Creating execution plan...`
6. `Selecting website crawler CLI...`
7. `Starting CLI process...`
8. `CLI process started successfully.`
9. `Connecting to website...`
10. `Extracting page content...`
11. `Processing extracted information...`
12. `Generating structured JSON...`
13. `Validating JSON output...`
14. `Generating final summary...`
15. `Task completed successfully.`

---

## 4. Security Measures

1. **Anti-SSRF Protection**:
   - Only `http://` and `https://` schemes permitted.
   - Hostnames are resolved to IP addresses before initiating requests.
   - Loopback (`127.0.0.1`, `::1`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), and cloud metadata endpoints (`metadata.google.internal`) are blocked.
2. **Subprocess Isolation**:
   - Commands are invoked directly via `asyncio.create_subprocess_exec` without shell interpolation (`shell=False`), preventing shell injection.
3. **Approved Command Registry**:
   - The backend will only execute tools defined in `CLIRegistry`.
4. **Execution Limits & Timeouts**:
   - Subprocesses have a hard timeout limit of 60 seconds.
   - Crawl depth is bounded to 3; page limit is bounded to 15.
5. **Untrusted Data Isolation**:
   - Crawled website content is isolated from system instructions to prevent prompt injection attacks.
6. **Log Sanitization**:
   - API keys, passwords, and Bearer tokens are scrubbed from stdout and stderr logs.

---

## 5. Environment Variables

Create a `.env` file in the root or `backend/` directory (see `.env.example`):

```bash
# Server
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]

# Database
DATABASE_URL=sqlite+aiosqlite:///./workelate.db

# Optional Gemini API Key (offline fallback used if omitted)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# Execution limits
CLI_EXECUTION_TIMEOUT_SECONDS=60
MAX_CRAWL_DEPTH=3
MAX_CRAWL_PAGES=15
```

---

## 6. Installation & Quick Start

### Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Node.js 18+ and npm

### 1. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 3. Start Backend & Frontend

#### Option A: One-Click Launcher (Windows)
Double-click `run_app.bat` or run:
```powershell
.\run_demo.ps1
```

#### Option B: Manual Startup
Terminal 1 (Backend):
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Open your browser to:
- **Frontend UI**: [http://localhost:5173](http://localhost:5173) (or `http://localhost:8000` in production unified mode)
- **Backend API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

For comprehensive production deployment on Docker, Render, Railway, Fly.io, or Linux VPS, see [docs/DEPLOYMENT.md](file:///c:/Users/vishw/Downloads/workelate/docs/DEPLOYMENT.md).

---

## 7. Testing Instructions

### Run Automated Backend Test Suite
From the root directory:
```bash
python -m pytest backend/tests -v
```
Tests cover:
- `test_security.py`: Anti-SSRF, loopback/private IP blocking, scheme validation, argument sanitization.
- `test_crawler.py`: DOM parsing, OpenGraph metadata, heading extraction, internal/external links.
- `test_cli_runner.py`: Subprocess execution, real-time stdout/stderr capture, timeout enforcement.
- `test_api.py`: FastAPI health, tool discovery, session lifecycle.
- `test_end_to_end.py`: Complete live crawl of `https://example.com` with exit code 0 and DB persistence.

### Run Crawler CLI Standalone
You can run the crawler CLI independently from terminal:
```bash
python -m backend.app.crawler.cli --url https://example.com --max-pages 1 --depth 1
```

---

## 8. Known Limitations & Future Improvements

1. **Client-Rendered JavaScript Sites**: Currently uses `httpx` + `BeautifulSoup4` for high-performance scraping. Future updates can introduce an optional Playwright headless browser mode for dynamic single-page applications.
2. **PostgreSQL Migration**: The SQLAlchemy models are fully compatible with PostgreSQL. In production, simply switch `DATABASE_URL` to `postgresql+asyncpg://...`.
3. **Multi-User Authentication**: Future releases can add JWT/OAuth2 user management.
