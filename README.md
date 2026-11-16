# WorkElate AI — CLI-Powered Autonomous Agent Chat Application

> A production-quality AI chat application that converts natural-language instructions into real executable tasks by invoking controlled CLI tools through the backend, featuring live activity transparency and real-time execution streaming.

[![Python 3.13](https://img.shields.io/badge/Python-3.13-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Tests Passing](https://img.shields.io/badge/Tests-13%2F13%20Passed-brightgreen.svg)]()

---

## Quick Start

### 1. One-Click Launch (Windows)
Double-click `run_app.bat` or run:
```powershell
.\run_demo.ps1
```

### 2. Manual Launch
**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Visit **http://localhost:5173** in your browser.

---

## Key Features

1. **Real CLI Subprocess Invocation**: Executes standalone CLI tools (`app.crawler.cli`) via `asyncio.create_subprocess_exec` without shell interpolation.
2. **Live AI Activity Transparency Panel**: Real-time 15-step chronological timeline streamed over Server-Sent Events (SSE).
3. **Developer Technical Logs**: Detailed view recording execution ID, tool, stdout, stderr, process duration, and exit codes.
4. **Structured Multi-Tab Results**: Tabbed output for AI Summary, Extracted Content, Crawled Pages, JSON Viewer, and CLI Logs, with Copy and Download JSON actions.
5. **Anti-SSRF & DNS Security**: Prevents access to loopback (`127.0.0.1`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud metadata IP addresses (`169.254.169.254`).
6. **Task Execution History**: Persistent SQLite database storing prompts, timelines, exit codes, and durations, with rerun capabilities.

---

## Comprehensive Project Documentation

Detailed documentation is available in the [`/docs`](file:///c:/Users/vishw/Downloads/workelate/docs) directory:

| Document | Purpose |
| :--- | :--- |
| [docs/README.md](file:///c:/Users/vishw/Downloads/workelate/docs/README.md) | Complete project overview, architecture, security, and setup |
| [docs/DEPLOYMENT.md](file:///c:/Users/vishw/Downloads/workelate/docs/DEPLOYMENT.md) | Production deployment guide (Docker, Render, Railway, Fly.io, VPS) |
| [docs/AI_CONTEXT.md](file:///c:/Users/vishw/Downloads/workelate/docs/AI_CONTEXT.md) | Mandatory context for future AI IDEs and coding assistants |
| [docs/ARCHITECTURE.md](file:///c:/Users/vishw/Downloads/workelate/docs/ARCHITECTURE.md) | System architecture, sequence diagrams, and security boundaries |
| [docs/API_DOCUMENTATION.md](file:///c:/Users/vishw/Downloads/workelate/docs/API_DOCUMENTATION.md) | REST endpoints, parameters, SSE specifications, and schemas |
| [docs/TASKS.md](file:///c:/Users/vishw/Downloads/workelate/docs/TASKS.md) | Implementation checklist and verified status |
| [docs/CHANGELOG.md](file:///c:/Users/vishw/Downloads/workelate/docs/CHANGELOG.md) | Chronological development history and test results |
| [docs/DEVELOPMENT_LOG.md](file:///c:/Users/vishw/Downloads/workelate/docs/DEVELOPMENT_LOG.md) | Detailed AI development journal and decision record |

---

## Running the Automated Test Suite

```bash
python -m pytest backend/tests -v
```

All 13 unit and end-to-end integration tests run and pass cleanly.
