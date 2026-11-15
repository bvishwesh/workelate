import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class TimelineEventSchema(BaseModel):
    execution_id: str
    event_type: str
    message: str
    step_index: Optional[int] = None
    status: str
    details: Optional[Dict[str, Any]] = None
    timestamp: str
    timestamp_iso: Optional[str] = None

class TaskExecutionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    session_id: Optional[str] = None
    user_prompt: str
    detected_intent: Optional[Dict[str, Any]] = None
    execution_plan: Optional[List[Dict[str, Any]]] = None
    selected_tool: Optional[str] = None
    validated_arguments: Optional[Dict[str, Any]] = None
    process_start_time: Optional[datetime.datetime] = None
    process_completion_time: Optional[datetime.datetime] = None
    execution_duration_seconds: Optional[float] = None
    stdout: Optional[str] = ""
    stderr: Optional[str] = ""
    exit_code: Optional[int] = None
    execution_status: str
    pages_crawled: int = 0
    final_output: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    timeline_events: Optional[List[Dict[str, Any]]] = []
    created_at: datetime.datetime
    updated_at: datetime.datetime

class TaskExecutionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    session_id: Optional[str] = None
    user_prompt: str
    selected_tool: Optional[str] = None
    execution_duration_seconds: Optional[float] = None
    execution_status: str
    pages_crawled: int = 0
    created_at: datetime.datetime
    exit_code: Optional[int] = None
