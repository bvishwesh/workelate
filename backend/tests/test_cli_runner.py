import sys
import pytest
from app.cli_engine.runner import CLIExecutionRunner
from app.cli_engine.registry import CLIRegistry

@pytest.mark.asyncio
async def test_cli_runner_success():
    runner = CLIExecutionRunner()
    # Run a simple python print command
    args = [sys.executable, "-c", "import sys; sys.stdout.write('hello from stdout\\n'); sys.stderr.write('[STATUS] process step\\n')"]
    result = await runner.execute(args, timeout=5)

    assert result.exit_code == 0
    assert "hello from stdout" in result.stdout
    assert "[STATUS] process step" in result.stderr
    assert result.timed_out is False

@pytest.mark.asyncio
async def test_cli_runner_timeout():
    runner = CLIExecutionRunner()
    # Run a command that sleeps longer than timeout
    args = [sys.executable, "-c", "import time; time.sleep(10)"]
    result = await runner.execute(args, timeout=1)

    assert result.timed_out is True
    assert result.exit_code == -1
    assert "timed out" in result.stderr.lower()

def test_cli_registry_whitelisting():
    tools = CLIRegistry.list_commands()
    assert any(t["name"] == "web_crawler" for t in tools)

    with pytest.raises(ValueError):
        CLIRegistry.build_command_args("unapproved_tool", {})
