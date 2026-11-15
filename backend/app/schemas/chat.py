import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class ChatMessageCreate(BaseModel):
    session_id: Optional[str] = None
    content: str
    crawl_options: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    session_id: str
    role: str
    content: str
    structured_data: Optional[Dict[str, Any]] = None
    execution_id: Optional[str] = None
    created_at: datetime.datetime

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    messages_count: Optional[int] = 0

class ChatSessionDetail(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []
