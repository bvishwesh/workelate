# Backend API Documentation — WorkElate AI

Base URL: `http://localhost:8000`

---

## 1. System & Discovery

### `GET /api/health`
Checks backend service health, version, and LLM configuration state.

- **Request**: No parameters.
- **Response**:
```json
{
  "status": "healthy",
  "service": "WorkElate AI Agent",
  "version": "1.0.0",
  "environment": "development",
  "llm_configured": false
}
```

### `GET /api/tools`
Lists all approved CLI tools registered in the controlled command registry.

- **Request**: No parameters.
- **Response**:
```json
{
  "tools": [
    {
      "name": "web_crawler",
      "description": "Autonomous website crawler and structured HTML/metadata extractor",
      "executable": "C:\\Python\\python.exe",
      "base_args": ["-m", "app.crawler.cli"],
      "allowed_flags": ["--url", "--max-pages", "--depth", "--timeout", "--format", "--output"],
      "default_timeout": 60
    }
  ]
}
```

---

## 2. Chat Sessions

### `POST /api/sessions`
Creates a new conversation session.

- **Request Body**:
```json
{
  "title": "Exploration of Python.org"
}
```
- **Response**:
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title": "Exploration of Python.org",
  "created_at": "2026-11-16T13:00:00Z",
  "updated_at": "2026-11-16T13:00:00Z",
  "messages_count": 0
}
```

### `GET /api/sessions`
Lists all chat sessions ordered by latest activity.

- **Response**: Array of `ChatSessionResponse` objects.

### `GET /api/sessions/{session_id}`
Retrieves a specific chat session along with all historical messages and structured outputs.

- **Path Parameter**: `session_id` (string UUID)
- **Response**:
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title": "Exploration of Python.org",
  "created_at": "2026-11-16T13:00:00Z",
  "updated_at": "2026-11-16T13:05:00Z",
  "messages_count": 2,
  "messages": [
    {
      "id": "msg-1",
      "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "role": "user",
      "content": "Crawl https://example.com and summarize it.",
      "structured_data": null,
      "execution_id": "exec-1",
      "created_at": "2026-11-16T13:00:01Z"
    },
    {
      "id": "msg-2",
      "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "role": "assistant",
      "content": "### Summary for Example Domain...",
      "structured_data": {
        "summary": "...",
        "structured_json": { "target_url": "https://example.com", "pages": [...] },
        "pages_crawled": 1,
        "target_url": "https://example.com"
      },
      "execution_id": "exec-1",
      "created_at": "2026-11-16T13:00:05Z"
    }
  ]
}
```

### `DELETE /api/sessions/{session_id}`
Deletes a chat session and cascades deletion of messages.

---

## 3. Chat Messaging & Task Execution

### `POST /api/chat`
Submits a user prompt, launches task orchestration in the background, and returns an execution ID immediately for real-time tracking.

- **Request Body**:
```json
{
  "content": "Crawl https://example.com and summarize it.",
  "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "crawl_options": {
    "max_pages": 1,
    "depth": 1
  }
}
```
- **Response**:
```json
{
  "execution_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "Running",
  "message": "Task queued for execution"
}
```

---

## 4. Real-Time Streaming & Logs

### `GET /api/executions/{execution_id}/stream`
Server-Sent Events (SSE) endpoint providing live status updates, chronological timeline steps, stdout, stderr, and completion alerts.

- **Path Parameter**: `execution_id` (string UUID)
- **Response**: `text/event-stream`
- **Events Emitted**:
  - `event: connected` — Handshake established
  - `event: timeline_step` — Chronological progress update (Steps 1 to 15)
  - `event: stdout` — Line from CLI process standard output
  - `event: stderr` — Line from CLI process standard error
  - `event: complete` — Terminal status reached (Completed, Failed, Timed out)

**Example SSE Event**:
```text
event: timeline_step
data: {"execution_id":"9b1deb4d","event_type":"timeline_step","message":"Connecting to website...","step_index":9,"status":"in_progress","details":{},"timestamp":"2026-11-16 13:00:02"}
```

---

## 5. Task History & Detail

### `GET /api/executions`
Fetches persistent task execution history with status filtering.

- **Query Parameters**:
  - `limit` (int, default: 20): Maximum records
  - `status` (string, optional): Filter by `Completed`, `Failed`, `Running`, etc.
- **Response**: Array of `TaskExecutionSummary` objects.

### `GET /api/executions/{execution_id}`
Returns complete task execution record, including validated parameters, full stdout/stderr, timeline events, duration, exit code, and JSON output.

- **Path Parameter**: `execution_id` (string UUID)

### `POST /api/executions/{execution_id}/retry`
Reruns an existing execution with the original parameters.

- **Response**:
```json
{
  "new_execution_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "original_execution_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "Running"
}
```
