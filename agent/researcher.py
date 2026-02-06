"""
X/Twitter Research Agent using Grok via OpenRouter.

This module provides the XResearcher class that uses xAI's Grok model
via OpenRouter with native x_search and web_search capabilities.
"""

import os
import time
from typing import Any

from openai import OpenAI


class XResearcher:
    """
    X/Twitter researcher powered by Grok's agentic search capabilities via OpenRouter.

    Uses x-ai/grok-4.1-fast model through OpenRouter with native x_search()
    and web_search() tools for intelligent research on Twitter/X and the web.
    """

    def __init__(self):
        """
        Initialize the XResearcher.

        Reads OPENROUTER_API_KEY from environment.
        """
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable is required")

        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            default_headers={
                "HTTP-Referer": "https://x-research-agent.local",
                "X-Title": "x-research",
            },
        )
        self.model = "x-ai/grok-4.1-fast"

    def research(self, query: str) -> dict[str, Any]:
        """
        Perform research using Grok's agentic search via OpenRouter.

        Args:
            query: The research question or topic to investigate

        Returns:
            dict with keys:
                - response: str - The full response content from Grok
                - citations: list[str] - URLs cited in the response
                - inline_citations: list - Inline citation objects
                - metadata: dict - Model info, tokens, tool calls, duration
        """
        start_time = time.time()

        try:
            # Call OpenRouter with native web search plugin (enables both x_search and web_search)
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": query},
                ],
                extra_body={
                    "plugins": [{"id": "web", "engine": "native"}],
                },
            )

            duration = time.time() - start_time

            content = response.choices[0].message.content or ""

            # Extract citations from annotations (OpenRouter standardized format)
            citations = []
            inline_citations = []
            message = response.choices[0].message
            if hasattr(message, "annotations") and message.annotations:
                for annotation in message.annotations:
                    if hasattr(annotation, "url_citation") and annotation.url_citation:
                        url = annotation.url_citation.url
                        if url:
                            citations.append(url)
                            inline_citations.append(
                                {
                                    "url": url,
                                    "title": getattr(
                                        annotation.url_citation, "title", ""
                                    ),
                                    "start_index": getattr(
                                        annotation.url_citation, "start_index", 0
                                    ),
                                    "end_index": getattr(
                                        annotation.url_citation, "end_index", 0
                                    ),
                                }
                            )

            # Build metadata
            usage = response.usage
            metadata = {
                "model": response.model or self.model,
                "tokens": {
                    "input": usage.prompt_tokens if usage else 0,
                    "output": usage.completion_tokens if usage else 0,
                    "reasoning": getattr(usage, "reasoning_tokens", 0) if usage else 0,
                },
                "tool_calls": [],
                "duration_seconds": round(duration, 2),
            }

            return {
                "response": content,
                "citations": citations,
                "inline_citations": inline_citations,
                "metadata": metadata,
            }

        except Exception as e:
            # Handle errors gracefully
            duration = time.time() - start_time
            print(f"\n❌ Error during research: {e}")

            return {
                "response": "",
                "citations": [],
                "inline_citations": [],
                "metadata": {
                    "model": self.model,
                    "tokens": {"input": 0, "output": 0, "reasoning": 0},
                    "tool_calls": [],
                    "duration_seconds": round(duration, 2),
                    "error": str(e),
                },
            }
