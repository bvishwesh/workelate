import subprocess
import threading
import time
import os
import sys
import asyncio
from typing import Dict, Any, List, Optional, Callable
from app.services.security_validator import SecurityValidator

class CLIExecutionResult:
    def __init__(
        self,
        command: List[str],
        exit_code: int,
        stdout: str,
        stderr: str,
        duration_seconds: float,
        timed_out: bool = False,
        cancelled: bool = False,
        error_message: Optional[str] = None
    ):
        self.command = command
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr
        self.duration_seconds = duration_seconds
        self.timed_out = timed_out
        self.cancelled = cancelled
        self.error_message = error_message

    def to_dict(self) -> Dict[str, Any]:
        return {
            "command": " ".join(self.command),
            "exit_code": self.exit_code,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "duration_seconds": round(self.duration_seconds, 2),
            "timed_out": self.timed_out,
            "cancelled": self.cancelled,
            "error_message": self.error_message
        }

class CLIExecutionRunner:
    """
    Subprocess execution manager.
    Runs approved commands safely using subprocess.Popen without shell interpolation (shell=False).
    Works across all OS platforms and asyncio loop implementations (including Windows SelectorEventLoop).
    Streams stdout and stderr line-by-line in real-time, enforcing timeouts and capturing exit codes.
    """

    def __init__(
        self,
        on_stdout_line: Optional[Callable[[str], None]] = None,
        on_stderr_line: Optional[Callable[[str], None]] = None,
        on_status_update: Optional[Callable[[str], None]] = None
    ):
        self.on_stdout_line = on_stdout_line or (lambda line: None)
        self.on_stderr_line = on_stderr_line or (lambda line: None)
        self.on_status_update = on_status_update or (lambda status: None)
        self._current_process: Optional[subprocess.Popen] = None
        self._cancelled = False

    def cancel(self):
        """Cancels running process."""
        self._cancelled = True
        if self._current_process and self._current_process.poll() is None:
            try:
                self._current_process.terminate()
            except Exception:
                pass

    async def execute(
        self,
        command_args: List[str],
        cwd: Optional[str] = None,
        timeout: int = 60
    ) -> CLIExecutionResult:
        loop = asyncio.get_running_loop()

        def _run_subprocess_sync() -> CLIExecutionResult:
            start_time = time.time()
            stdout_lines: List[str] = []
            stderr_lines: List[str] = []

            proc_cwd = cwd
            if not proc_cwd:
                # Backend root
                proc_cwd = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))

            env = os.environ.copy()
            # Ensure backend root is in PYTHONPATH
            existing_pythonpath = env.get("PYTHONPATH", "")
            env["PYTHONPATH"] = proc_cwd + (os.pathsep + existing_pythonpath if existing_pythonpath else "")
            # Ensure unbuffered output from Python
            env["PYTHONUNBUFFERED"] = "1"

            try:
                self._current_process = subprocess.Popen(
                    command_args,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    cwd=proc_cwd,
                    env=env,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    bufsize=1
                )
            except Exception as e:
                import traceback
                tb = traceback.format_exc()
                duration = time.time() - start_time
                return CLIExecutionResult(
                    command=command_args,
                    exit_code=-1,
                    stdout="",
                    stderr=f"Process launch error: {str(e)}\n{tb}",
                    duration_seconds=duration,
                    error_message=f"Failed to start CLI process: {str(e)}"
                )

            # Threads to read stdout and stderr in real-time
            def read_stdout():
                try:
                    for line in iter(self._current_process.stdout.readline, ""):
                        if not line:
                            break
                        trimmed = line.strip()
                        if trimmed:
                            sanitized = SecurityValidator.sanitize_log_output(trimmed)
                            stdout_lines.append(sanitized)
                            loop.call_soon_threadsafe(self.on_stdout_line, sanitized)
                except Exception:
                    pass
                finally:
                    if self._current_process and self._current_process.stdout:
                        self._current_process.stdout.close()

            def read_stderr():
                try:
                    for line in iter(self._current_process.stderr.readline, ""):
                        if not line:
                            break
                        trimmed = line.strip()
                        if trimmed:
                            sanitized = SecurityValidator.sanitize_log_output(trimmed)
                            stderr_lines.append(sanitized)
                            loop.call_soon_threadsafe(self.on_stderr_line, sanitized)
                            if sanitized.startswith("[STATUS]"):
                                status_msg = sanitized.replace("[STATUS]", "").strip()
                                loop.call_soon_threadsafe(self.on_status_update, status_msg)
                except Exception:
                    pass
                finally:
                    if self._current_process and self._current_process.stderr:
                        self._current_process.stderr.close()

            t_out = threading.Thread(target=read_stdout, daemon=True)
            t_err = threading.Thread(target=read_stderr, daemon=True)
            t_out.start()
            t_err.start()

            timed_out = False
            try:
                exit_code = self._current_process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                timed_out = True
                self.cancel()
                try:
                    self._current_process.kill()
                    self._current_process.wait(timeout=5)
                except Exception:
                    pass
                exit_code = -1

            t_out.join(timeout=3)
            t_err.join(timeout=3)

            duration = time.time() - start_time
            combined_stdout = "\n".join(stdout_lines)
            combined_stderr = "\n".join(stderr_lines)

            if timed_out:
                return CLIExecutionResult(
                    command=command_args,
                    exit_code=-1,
                    stdout=combined_stdout,
                    stderr=combined_stderr + f"\n[ERROR] Execution timed out after {timeout} seconds.",
                    duration_seconds=duration,
                    timed_out=True,
                    error_message=f"CLI execution timed out after {timeout} seconds"
                )

            return CLIExecutionResult(
                command=command_args,
                exit_code=exit_code,
                stdout=combined_stdout,
                stderr=combined_stderr,
                duration_seconds=duration,
                cancelled=self._cancelled,
                error_message=f"Process exited with code {exit_code}" if exit_code != 0 else None
            )

        return await asyncio.to_thread(_run_subprocess_sync)
