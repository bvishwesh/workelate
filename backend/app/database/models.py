import datetime
import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.connection import Base

def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), default="New Chat")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    messages: Mapped[List["ChatMessage"]] = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")
    executions: Mapped[List["TaskExecution"]] = relationship("TaskExecution", back_populates="session", cascade="all, delete-orphan", order_by="TaskExecution.created_at.desc()")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20)) # 'user', 'assistant', 'system'
    content: Mapped[str] = mapped_column(Text)
    structured_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    execution_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")

class TaskExecution(Base):
    __tablename__ = "task_executions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("chat_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    user_prompt: Mapped[str] = mapped_column(Text)
    detected_intent: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    execution_plan: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    selected_tool: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    validated_arguments: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    
    process_start_time: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    process_completion_time: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    execution_duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    stdout: Mapped[Optional[str]] = mapped_column(Text, default="", nullable=True)
    stderr: Mapped[Optional[str]] = mapped_column(Text, default="", nullable=True)
    exit_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    execution_status: Mapped[str] = mapped_column(String(30), default="Pending") # Running, Completed, Failed, Partially completed, Timed out, Cancelled
    
    pages_crawled: Mapped[int] = mapped_column(Integer, default=0)
    final_output: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timeline_events: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list, nullable=True)
    
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    session: Mapped[Optional["ChatSession"]] = relationship("ChatSession", back_populates="executions")
