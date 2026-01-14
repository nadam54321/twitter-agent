import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Optional


@dataclass
class ResearchOutput:
    """Structured output format for research results with citations and metadata."""

    query: str
    timestamp: str
    response: str
    citations: list[str]
    metadata: dict[str, Any]
    inline_citations: list[dict[str, Any]] = field(default_factory=list)

    @classmethod
    def create(
        cls,
        query: str,
        response: str,
        citations: list[str],
        metadata: dict[str, Any],
        inline_citations: Optional[list[dict[str, Any]]] = None,
    ) -> "ResearchOutput":
        """Create a ResearchOutput instance with auto-generated timestamp.

        Args:
            query: The research query
            response: Grok's raw synthesized response
            citations: List of citation URLs
            metadata: Dictionary with model, tokens, cost, tool_calls, duration
            inline_citations: Optional list of inline citation dicts with id, url, start, end

        Returns:
            ResearchOutput instance with ISO format timestamp
        """
        return cls(
            query=query,
            timestamp=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            response=response,
            citations=citations,
            metadata=metadata,
            inline_citations=inline_citations or [],
        )

    def to_json(self) -> str:
        """Convert ResearchOutput to JSON string.

        Returns:
            JSON string with all fields, using default=str for non-serializable types
        """
        return json.dumps(asdict(self), indent=2, default=str)

    def format_for_stdout(self) -> str:
        """Pretty print helper for console output.

        Returns:
            Formatted string representation of the output
        """
        lines = [
            f"Query: {self.query}",
            f"Timestamp: {self.timestamp}",
            f"Response: {self.response}",
            f"Citations: {', '.join(self.citations) if self.citations else 'None'}",
            f"Metadata: {self.metadata}",
        ]
        if self.inline_citations:
            lines.append(f"Inline Citations: {self.inline_citations}")
        return "\n".join(lines)
