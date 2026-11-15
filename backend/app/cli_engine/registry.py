import sys
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class CommandDefinition(BaseModel):
    name: str
    description: str
    executable: str
    base_args: List[str]
    allowed_flags: List[str]
    default_timeout: int = 60

class CLIRegistry:
    """
    Whitelisted registry of approved executable commands.
    Prevents any arbitrary shell execution or injection attacks.
    """

    _registry: Dict[str, CommandDefinition] = {}

    @classmethod
    def register_command(cls, definition: CommandDefinition):
        cls._registry[definition.name] = definition

    @classmethod
    def get_command(cls, name: str) -> Optional[CommandDefinition]:
        return cls._registry.get(name)

    @classmethod
    def list_commands(cls) -> List[Dict[str, Any]]:
        return [cmd.model_dump() for cmd in cls._registry.values()]

    @classmethod
    def build_command_args(cls, tool_name: str, params: Dict[str, Any]) -> List[str]:
        """
        Builds a safe, non-shell command argument list for subprocess execution.
        """
        cmd_def = cls.get_command(tool_name)
        if not cmd_def:
            raise ValueError(f"Tool '{tool_name}' is not in the approved CLI registry.")

        args = [cmd_def.executable] + list(cmd_def.base_args)

        if tool_name == "web_crawler":
            url = params.get("url")
            if not url:
                raise ValueError("URL parameter is required for web_crawler.")
            args.extend(["--url", str(url)])

            if "max_pages" in params:
                args.extend(["--max-pages", str(int(params["max_pages"]))])
            if "depth" in params:
                args.extend(["--depth", str(int(params["depth"]))])
            if "timeout" in params:
                args.extend(["--timeout", str(float(params["timeout"]))])
            args.extend(["--format", "json"])

        return args

# Register default approved tools
python_bin = sys.executable

CLIRegistry.register_command(
    CommandDefinition(
        name="web_crawler",
        description="Autonomous website crawler and structured HTML/metadata extractor",
        executable=python_bin,
        base_args=["-m", "app.crawler.cli"],
        allowed_flags=["--url", "--max-pages", "--depth", "--timeout", "--format", "--output"],
        default_timeout=60
    )
)
