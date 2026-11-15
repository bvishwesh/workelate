import asyncio
import json
import time
from typing import Dict, List, Any, Optional

class ExecutionEvent:
    def __init__(
        self,
        execution_id: str,
        event_type: str, # 'timeline_step', 'stdout', 'stderr', 'status_change', 'complete', 'error'
        message: str,
        step_index: Optional[int] = None,
        status: str = "in_progress", # pending, in_progress, completed, failed
        details: Optional[Dict[str, Any]] = None
    ):
        self.execution_id = execution_id
        self.event_type = event_type
        self.message = message
        self.step_index = step_index
        self.status = status
        self.details = details or {}
        self.timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        self.timestamp_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "execution_id": self.execution_id,
            "event_type": self.event_type,
            "message": self.message,
            "step_index": self.step_index,
            "status": self.status,
            "details": self.details,
            "timestamp": self.timestamp,
            "timestamp_iso": self.timestamp_iso
        }

    def to_sse(self) -> str:
        data_json = json.dumps(self.to_dict())
        return f"event: {self.event_type}\ndata: {data_json}\n\n"

class EventBus:
    """
    In-memory async pub-sub event bus for broadcasting live execution events.
    Supports SSE and WebSocket subscribers per execution_id.
    """

    def __init__(self):
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}
        self._history: Dict[str, List[ExecutionEvent]] = {}

    def subscribe(self, execution_id: str) -> asyncio.Queue:
        if execution_id not in self._subscribers:
            self._subscribers[execution_id] = []
        queue = asyncio.Queue()
        self._subscribers[execution_id].append(queue)

        # If there's existing history, replay it immediately to the new subscriber
        if execution_id in self._history:
            for past_event in self._history[execution_id]:
                queue.put_nowait(past_event)

        return queue

    def unsubscribe(self, execution_id: str, queue: asyncio.Queue):
        if execution_id in self._subscribers:
            if queue in self._subscribers[execution_id]:
                self._subscribers[execution_id].remove(queue)
            if not self._subscribers[execution_id]:
                del self._subscribers[execution_id]

    async def publish(self, event: ExecutionEvent):
        # Store in event history
        if event.execution_id not in self._history:
            self._history[event.execution_id] = []
        self._history[event.execution_id].append(event)

        # Broadcast to all active queues for this execution
        if event.execution_id in self._subscribers:
            for queue in list(self._subscribers[event.execution_id]):
                await queue.put(event)

    def get_events(self, execution_id: str) -> List[Dict[str, Any]]:
        return [e.to_dict() for e in self._history.get(execution_id, [])]

    def clear(self, execution_id: str):
        self._history.pop(execution_id, None)
        self._subscribers.pop(execution_id, None)

event_bus = EventBus()
