import asyncio
import json
import uuid
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.config import settings
from app.database.connection import init_db, get_db, AsyncSessionLocal
from app.database.models import ChatSession, ChatMessage, TaskExecution
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionDetail
)
from app.schemas.execution import (
    TaskExecutionResponse,
    TaskExecutionSummary
)
from app.cli_engine.registry import CLIRegistry
from app.services.event_bus import event_bus
from app.services.task_orchestrator import TaskOrchestrator

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database
    await init_db()
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-Quality CLI-Powered AI Agent with Live Activity Transparency",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Health & Tool Discovery
# -----------------------------------------------------------------------------
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "llm_configured": bool(settings.GEMINI_API_KEY)
    }

@app.get("/api/tools")
async def list_tools():
    """Returns approved backend tools in the CLI registry."""
    return {"tools": CLIRegistry.list_commands()}

# -----------------------------------------------------------------------------
# Chat Sessions
# -----------------------------------------------------------------------------
@app.post("/api/sessions", response_model=ChatSessionResponse)
async def create_session(data: ChatSessionCreate, db: AsyncSession = Depends(get_db)):
    session = ChatSession(title=data.title or "New Chat")
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

@app.get("/api/sessions", response_model=List[ChatSessionResponse])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChatSession).order_by(desc(ChatSession.updated_at)))
    sessions = result.scalars().all()
    return sessions

@app.get("/api/sessions/{session_id}", response_model=ChatSessionDetail)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Fetch messages
    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = msg_result.scalars().all()
    
    return ChatSessionDetail(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages_count=len(messages),
        messages=messages
    )

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
    return {"status": "deleted", "session_id": session_id}

# -----------------------------------------------------------------------------
# Chat Execution & Real-time Task Orchestration
# -----------------------------------------------------------------------------
@app.post("/api/chat")
async def handle_chat_message(
    payload: ChatMessageCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a user prompt, stores the user message, and launches task orchestrator.
    Returns immediately with execution_id and session_id for SSE streaming.
    """
    session_id = payload.session_id
    if not session_id:
        # Create session if none provided
        auto_title = payload.content[:35] + ("..." if len(payload.content) > 35 else "")
        new_session = ChatSession(title=auto_title)
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)
        session_id = new_session.id
    else:
        # Update session title if default
        result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        session = result.scalar_one_or_none()
        if session and session.title == "New Chat":
            session.title = payload.content[:35] + ("..." if len(payload.content) > 35 else "")
            await db.commit()

    execution_id = str(uuid.uuid4())

    # Record User Message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=payload.content,
        execution_id=execution_id
    )
    db.add(user_msg)
    await db.commit()

    # Launch task orchestrator in background
    orchestrator = TaskOrchestrator(execution_id=execution_id, session_id=session_id)
    background_tasks.add_task(
        orchestrator.run_task,
        prompt=payload.content,
        crawl_options=payload.crawl_options
    )

    return {
        "execution_id": execution_id,
        "session_id": session_id,
        "status": "Running",
        "message": "Task queued for execution"
    }

# -----------------------------------------------------------------------------
# Server-Sent Events (SSE) Real-Time Stream
# -----------------------------------------------------------------------------
@app.get("/api/executions/{execution_id}/stream")
async def stream_execution_events(execution_id: str, db: AsyncSession = Depends(get_db)):
    """
    Real-time Server-Sent Events (SSE) endpoint.
    Streams timeline updates, stdout, stderr, and completion statuses.
    If execution is already completed/failed in DB, immediately replays and closes.
    """
    # Check if execution already completed or failed in DB
    result = await db.execute(select(TaskExecution).where(TaskExecution.id == execution_id))
    existing = result.scalar_one_or_none()

    if existing and existing.execution_status in ("Completed", "Failed", "Timed out", "Cancelled"):
        async def already_completed_generator():
            yield f"event: connected\ndata: {{\"status\":\"connected\",\"execution_id\":\"{execution_id}\"}}\n\n"
            if existing.timeline_events:
                for ev in existing.timeline_events:
                    ev_dict = ev if isinstance(ev, dict) else ev.to_dict()
                    yield f"event: timeline_step\ndata: {json.dumps(ev_dict)}\n\n"
            comp_payload = {
                "status": existing.execution_status,
                "exit_code": existing.exit_code,
                "duration_seconds": existing.execution_duration_seconds,
                "error_message": existing.error_message,
                "pages_crawled": existing.pages_crawled,
                "final_output": existing.final_output
            }
            yield f"event: complete\ndata: {json.dumps({'event_type': 'complete', 'status': existing.execution_status, 'details': comp_payload})}\n\n"

        return StreamingResponse(
            already_completed_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "close",
                "X-Accel-Buffering": "no"
            }
        )

    queue = event_bus.subscribe(execution_id)

    async def event_generator():
        try:
            # Send initial keepalive/handshake
            yield "event: connected\ndata: {\"status\":\"connected\",\"execution_id\":\"" + execution_id + "\"}\n\n"
            
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield event.to_sse()
                    if event.event_type == "complete" or event.status in ("Completed", "Failed", "Timed out", "Cancelled"):
                        # Keep open briefly to flush any remaining logs
                        await asyncio.sleep(0.3)
                        break
                except asyncio.TimeoutError:
                    # Check DB to see if process ended while waiting
                    async with AsyncSessionLocal() as check_db:
                        res = await check_db.execute(select(TaskExecution).where(TaskExecution.id == execution_id))
                        curr = res.scalar_one_or_none()
                        if curr and curr.execution_status in ("Completed", "Failed", "Timed out", "Cancelled"):
                            comp_payload = {
                                "status": curr.execution_status,
                                "exit_code": curr.exit_code,
                                "duration_seconds": curr.execution_duration_seconds,
                                "error_message": curr.error_message,
                                "pages_crawled": curr.pages_crawled,
                                "final_output": curr.final_output
                            }
                            yield f"event: complete\ndata: {json.dumps({'event_type': 'complete', 'status': curr.execution_status, 'details': comp_payload})}\n\n"
                            break
                    # Send keepalive comment to keep connection alive
                    yield ": keepalive\n\n"
        finally:
            event_bus.unsubscribe(execution_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# -----------------------------------------------------------------------------
# Task Execution History & Logs
# -----------------------------------------------------------------------------
@app.get("/api/executions", response_model=List[TaskExecutionSummary])
async def list_executions(
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(TaskExecution).order_by(desc(TaskExecution.created_at)).limit(limit)
    if status:
        query = query.where(TaskExecution.execution_status == status)
    result = await db.execute(query)
    executions = result.scalars().all()
    return executions

@app.get("/api/executions/{execution_id}", response_model=TaskExecutionResponse)
async def get_execution_detail(execution_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TaskExecution).where(TaskExecution.id == execution_id))
    execution = result.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution

@app.post("/api/executions/{execution_id}/retry")
async def retry_execution(
    execution_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TaskExecution).where(TaskExecution.id == execution_id))
    past_exec = result.scalar_one_or_none()
    if not past_exec:
        raise HTTPException(status_code=404, detail="Execution not found")

    new_execution_id = str(uuid.uuid4())
    orchestrator = TaskOrchestrator(
        execution_id=new_execution_id,
        session_id=past_exec.session_id
    )
    background_tasks.add_task(
        orchestrator.run_task,
        prompt=past_exec.user_prompt,
        crawl_options=past_exec.validated_arguments or {}
    )

    return {
        "new_execution_id": new_execution_id,
        "original_execution_id": execution_id,
        "session_id": past_exec.session_id,
        "status": "Running"
    }

# -----------------------------------------------------------------------------
# Frontend Static Files (Production Mode)
# -----------------------------------------------------------------------------
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not hijack unmatched /api routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
