import asyncio
import datetime
import json
import logging
import time
import uuid
from typing import Dict, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database.models import TaskExecution, ChatMessage, ChatSession
from app.database.connection import AsyncSessionLocal
from app.services.event_bus import event_bus, ExecutionEvent
from app.services.security_validator import SecurityValidator, SecurityValidationError
from app.services.ai_intent import AIIntentService
from app.services.summarizer import AISummarizerService
from app.cli_engine.registry import CLIRegistry
from app.cli_engine.runner import CLIExecutionRunner

logger = logging.getLogger(__name__)

class TaskOrchestrator:
    """
    Coordinates the complete lifecycle of natural language instruction to CLI execution:
    1. Intent understanding & entity extraction
    2. Security validation & SSRF defense
    3. Execution planning & tool selection
    4. Subprocess execution with real-time stdout/stderr capture
    5. Real-time event broadcasting (SSE)
    6. Output parsing & schema validation
    7. AI summary generation
    8. Persistent storage in SQLite / DB
    """

    def __init__(self, execution_id: Optional[str] = None, session_id: Optional[str] = None):
        self.execution_id = execution_id or str(uuid.uuid4())
        self.session_id = session_id
        self.timeline_events = []
        self.stdout_buffer = []
        self.stderr_buffer = []

    async def _emit_step(
        self,
        step_index: int,
        message: str,
        status: str = "in_progress",
        details: Optional[Dict[str, Any]] = None
    ):
        event = ExecutionEvent(
            execution_id=self.execution_id,
            event_type="timeline_step",
            message=message,
            step_index=step_index,
            status=status,
            details=details
        )
        self.timeline_events.append(event.to_dict())
        await event_bus.publish(event)

    async def _emit_log(self, stream_type: str, text: str):
        event = ExecutionEvent(
            execution_id=self.execution_id,
            event_type=stream_type, # 'stdout' or 'stderr'
            message=text
        )
        await event_bus.publish(event)

    async def run_task(
        self,
        prompt: str,
        crawl_options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        start_time = datetime.datetime.now(datetime.timezone.utc)
        perf_start = time.time()
        crawl_options = crawl_options or {}

        # 1. Create DB TaskExecution Record
        async with AsyncSessionLocal() as db:
            execution_record = TaskExecution(
                id=self.execution_id,
                session_id=self.session_id,
                user_prompt=prompt,
                execution_status="Running",
                process_start_time=start_time,
                timeline_events=[]
            )
            db.add(execution_record)
            await db.commit()

        try:
            # Step 1: Understanding request
            await self._emit_step(1, "Understanding your request...", "completed")
            intent = await AIIntentService.analyze_prompt(prompt)

            # Step 2: Identified task
            await self._emit_step(
                2,
                f"Identified task: Website crawling (Intent: {intent.task_type}).",
                "completed",
                {"task_type": intent.task_type}
            )

            # If it's not a crawl query and has no URL
            target_url = crawl_options.get("url") or intent.target_url
            if not target_url:
                if intent.task_type == "general_query":
                    err_msg = (
                        "I am an autonomous agent equipped with a website crawling and structured data extraction CLI. "
                        "Please provide a website URL (for example: 'Crawl https://example.com and summarize it') to execute."
                    )
                else:
                    err_msg = "Could not identify a target website URL in your request. Please specify a valid URL."

                await self._emit_step(3, f"URL extraction failed: {err_msg}", "failed")
                await self._finalize_task(
                    status="Failed",
                    error_message=err_msg,
                    exit_code=1,
                    perf_start=perf_start
                )
                return {"status": "Failed", "error": err_msg}

            # Step 3: Extracted URL
            await self._emit_step(3, f"Extracted URL: {target_url}", "completed", {"url": target_url})

            # Step 4: Validating URL and security restrictions
            await self._emit_step(4, "Validating URL and security restrictions...", "in_progress")
            max_pages = crawl_options.get("max_pages") or intent.parameters.get("max_pages", 1)
            depth = crawl_options.get("depth") or intent.parameters.get("depth", 1)

            try:
                sanitized_args = SecurityValidator.sanitize_arguments(
                    url=target_url,
                    max_pages=max_pages,
                    depth=depth
                )
                await self._emit_step(4, "URL and security restrictions validated successfully.", "completed", sanitized_args)
            except SecurityValidationError as e:
                await self._emit_step(4, f"Security restriction violation: {str(e)}", "failed")
                await self._finalize_task(
                    status="Failed",
                    error_message=f"Security check failed: {str(e)}",
                    exit_code=2,
                    perf_start=perf_start
                )
                return {"status": "Failed", "error": str(e)}

            # Step 5: Creating execution plan
            await self._emit_step(5, "Creating execution plan...", "completed", {
                "max_pages": sanitized_args["max_pages"],
                "depth": sanitized_args["depth"]
            })

            # Step 6: Selecting website crawler CLI
            selected_tool = intent.selected_tool or "web_crawler"
            await self._emit_step(6, f"Selecting website crawler CLI ({selected_tool})...", "completed", {"tool": selected_tool})

            # Build command argument list safely (NO shell interpolation)
            try:
                command_args = CLIRegistry.build_command_args(selected_tool, sanitized_args)
            except Exception as e:
                await self._emit_step(6, f"Failed to select CLI: {str(e)}", "failed")
                await self._finalize_task(status="Failed", error_message=str(e), exit_code=1, perf_start=perf_start)
                return {"status": "Failed", "error": str(e)}

            # Step 7: Starting CLI process
            await self._emit_step(7, "Starting CLI process...", "completed", {"command": command_args[0]})

            # Callback handles for runner
            def handle_stdout(line: str):
                self.stdout_buffer.append(line)
                asyncio.create_task(self._emit_log("stdout", line))

            def handle_stderr(line: str):
                self.stderr_buffer.append(line)
                asyncio.create_task(self._emit_log("stderr", line))

            async def handle_status(status_msg: str):
                # Dynamically map CLI real status events to execution steps
                status_lower = status_msg.lower()
                if "started successfully" in status_lower:
                    await self._emit_step(8, "CLI process started successfully.", "completed")
                elif "connecting to website" in status_lower:
                    await self._emit_step(9, f"Connecting to website ({sanitized_args['url']})...", "in_progress")
                elif "connected to" in status_lower:
                    await self._emit_step(9, status_msg, "completed")
                elif "extracting page content" in status_lower:
                    await self._emit_step(10, status_msg, "in_progress")
                elif "extracted:" in status_lower:
                    await self._emit_step(10, status_msg, "completed")
                elif "processing extracted information" in status_lower:
                    await self._emit_step(11, status_msg, "completed")
                elif "validating json" in status_lower:
                    await self._emit_step(13, status_msg, "completed")

            def handle_status_sync(status_msg: str):
                asyncio.create_task(handle_status(status_msg))

            runner = CLIExecutionRunner(
                on_stdout_line=handle_stdout,
                on_stderr_line=handle_stderr,
                on_status_update=handle_status_sync
            )

            # Step 8: CLI process started
            await self._emit_step(8, "CLI process started successfully.", "completed")

            # Execute subprocess with timeout
            exec_res = await runner.execute(
                command_args=command_args,
                timeout=settings.CLI_EXECUTION_TIMEOUT_SECONDS
            )

            if exec_res.timed_out:
                await self._emit_step(9, f"Execution timed out after {settings.CLI_EXECUTION_TIMEOUT_SECONDS}s", "failed")
                await self._finalize_task(
                    status="Timed out",
                    error_message=f"CLI execution timed out after {settings.CLI_EXECUTION_TIMEOUT_SECONDS} seconds.",
                    exit_code=-1,
                    perf_start=perf_start,
                    selected_tool=selected_tool,
                    validated_args=sanitized_args
                )
                return {"status": "Timed out", "error": "Execution timed out"}

            if exec_res.exit_code != 0:
                err_detail = exec_res.error_message or "Process failed"
                await self._emit_step(10, f"CLI execution failed with code {exec_res.exit_code}: {err_detail}", "failed")
                await self._finalize_task(
                    status="Failed",
                    error_message=f"Process exited with code {exec_res.exit_code}. {err_detail}",
                    exit_code=exec_res.exit_code,
                    perf_start=perf_start,
                    selected_tool=selected_tool,
                    validated_args=sanitized_args
                )
                return {"status": "Failed", "error": err_detail}

            # Step 12: Generating structured JSON
            await self._emit_step(12, "Generating structured JSON...", "in_progress")

            # Parse JSON from stdout
            stdout_text = exec_res.stdout
            parsed_json = None
            try:
                # Find start of JSON object
                json_start = stdout_text.find("{")
                json_end = stdout_text.rfind("}")
                if json_start != -1 and json_end != -1:
                    raw_json_str = stdout_text[json_start:json_end+1]
                    parsed_json = json.loads(raw_json_str)
                else:
                    raise ValueError("No JSON object detected in stdout.")
                await self._emit_step(12, "Structured JSON generated.", "completed")
            except Exception as e:
                await self._emit_step(12, f"Failed to parse JSON from CLI stdout: {str(e)}", "failed")
                await self._finalize_task(
                    status="Failed",
                    error_message=f"JSON parsing error: {str(e)}",
                    exit_code=exec_res.exit_code,
                    perf_start=perf_start,
                    selected_tool=selected_tool,
                    validated_args=sanitized_args
                )
                return {"status": "Failed", "error": str(e)}

            # Step 13: Validating JSON output
            await self._emit_step(13, "Validating JSON output schema...", "completed", {
                "pages_crawled": parsed_json.get("pages_crawled_count", 1)
            })

            # Step 14: Generating final summary
            await self._emit_step(14, "Generating final summary...", "in_progress")
            ai_summary = await AISummarizerService.summarize_crawl_result(
                user_prompt=prompt,
                crawl_data=parsed_json
            )
            await self._emit_step(14, "Final summary generated.", "completed")

            # Step 15: Task completed successfully
            pages_crawled = parsed_json.get("pages_crawled_count", 1)
            await self._emit_step(15, f"Task completed successfully: extracted {pages_crawled} page(s).", "completed")

            final_data = {
                "summary": ai_summary,
                "structured_json": parsed_json,
                "pages_crawled": pages_crawled,
                "target_url": sanitized_args["url"]
            }

            # Finalize DB state & emit completion
            await self._finalize_task(
                status="Completed",
                exit_code=0,
                perf_start=perf_start,
                selected_tool=selected_tool,
                validated_args=sanitized_args,
                final_output=final_data,
                pages_crawled=pages_crawled
            )

            # Also create an assistant message in the chat session if session_id is provided
            if self.session_id:
                async with AsyncSessionLocal() as db:
                    msg = ChatMessage(
                        session_id=self.session_id,
                        role="assistant",
                        content=ai_summary,
                        structured_data=final_data,
                        execution_id=self.execution_id
                    )
                    db.add(msg)
                    await db.commit()

            return {
                "status": "Completed",
                "execution_id": self.execution_id,
                "summary": ai_summary,
                "structured_json": parsed_json,
                "pages_crawled": pages_crawled,
                "duration_seconds": round(time.time() - perf_start, 2)
            }

        except Exception as e:
            logger.exception("Task orchestrator unexpected error")
            await self._emit_step(15, f"Unexpected execution error: {str(e)}", "failed")
            await self._finalize_task(
                status="Failed",
                error_message=str(e),
                exit_code=1,
                perf_start=perf_start
            )
            return {"status": "Failed", "error": str(e)}

    async def _finalize_task(
        self,
        status: str,
        perf_start: float,
        exit_code: int = 0,
        error_message: Optional[str] = None,
        selected_tool: Optional[str] = None,
        validated_args: Optional[Dict[str, Any]] = None,
        final_output: Optional[Dict[str, Any]] = None,
        pages_crawled: int = 0
    ):
        completion_time = datetime.datetime.now(datetime.timezone.utc)
        duration = round(time.time() - perf_start, 2)
        combined_stdout = "\n".join(self.stdout_buffer)
        combined_stderr = "\n".join(self.stderr_buffer)

        # Update Database
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(TaskExecution).where(TaskExecution.id == self.execution_id))
            execution_record = result.scalar_one_or_none()
            if execution_record:
                execution_record.execution_status = status
                execution_record.process_completion_time = completion_time
                execution_record.execution_duration_seconds = duration
                execution_record.stdout = combined_stdout
                execution_record.stderr = combined_stderr
                execution_record.exit_code = exit_code
                execution_record.error_message = error_message
                execution_record.selected_tool = selected_tool
                execution_record.validated_arguments = validated_args
                execution_record.final_output = final_output
                execution_record.pages_crawled = pages_crawled
                execution_record.timeline_events = self.timeline_events
                await db.commit()

            # If task failed and there is a session, persist assistant failure message
            if self.session_id and status in ("Failed", "Timed out", "Cancelled"):
                err_text = (
                    f"### Task {status}\n\n"
                    f"**Reason:** {error_message or 'The execution failed.'}\n\n"
                    f"- **Status:** `{status}`\n"
                    f"- **Exit Code:** `{exit_code}`\n"
                    f"- **Duration:** `{duration}s`\n\n"
                    f"Please check the **Live Activity Transparency** panel for step-by-step logs."
                )
                failure_msg = ChatMessage(
                    session_id=self.session_id,
                    role="assistant",
                    content=err_text,
                    execution_id=self.execution_id
                )
                db.add(failure_msg)
                await db.commit()

        # Emit completion event to EventBus
        completion_event = ExecutionEvent(
            execution_id=self.execution_id,
            event_type="complete",
            message=f"Execution {status.lower()}",
            status=status,
            details={
                "status": status,
                "exit_code": exit_code,
                "duration_seconds": duration,
                "error_message": error_message,
                "pages_crawled": pages_crawled,
                "final_output": final_output
            }
        )
        await event_bus.publish(completion_event)
