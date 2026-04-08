"""System Time tool — provide current local time and date."""

from __future__ import annotations

import datetime
import logging
from typing import Any

from openjarvis.core.registry import ToolRegistry
from openjarvis.core.types import ToolResult
from openjarvis.tools._stubs import BaseTool, ToolSpec

logger = logging.getLogger(__name__)


@ToolRegistry.register("get_time")
class GetTimeTool(BaseTool):
    """Retrieve current system time and date."""

    tool_id = "get_time"
    is_local = True

    @property
    def spec(self) -> ToolSpec:
        return ToolSpec(
            name="get_time",
            description="Get the current local system time and date.",
            parameters={
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Optional timezone name (e.g., 'UTC', 'US/Pacific').",
                    }
                },
            },
            category="system",
        )

    def execute(self, **params: Any) -> ToolResult:
        try:
            # Simple local time for now
            now = datetime.datetime.now()
            formatted = now.strftime("%Y-%m-%d %H:%M:%S %Z")
            
            content = f"Current local time: {formatted}"
            if not now.tzname():
                content += " (Local System Time)"
                
            return ToolResult(
                tool_name="get_time",
                content=content,
                success=True,
            )
        except Exception as exc:
            return ToolResult(
                tool_name="get_time",
                content=f"Failed to get time: {exc}",
                success=False,
            )


__all__ = ["GetTimeTool"]
