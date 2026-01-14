"""
X/Twitter Research Agent using Grok API.

This module provides the XResearcher class that uses xAI's Grok model
with x_search() and web_search() tools for intelligent research.
"""

from typing import Any
import time
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.tools import web_search, x_search


class XResearcher:
    """
    X/Twitter researcher powered by Grok's agentic search capabilities.

    Uses grok-4-1-fast model with x_search() and web_search() tools
    to perform intelligent research on Twitter/X and the web.
    """

    def __init__(self):
        """
        Initialize the XResearcher.

        Reads XAI_API_KEY from environment automatically via Client().
        """
        self.client = Client()
        self.model = "grok-4-1-fast"

    def research(self, query: str) -> dict[str, Any]:
        """
        Perform research using Grok's agentic search.

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
            # Create chat with tools and streaming enabled
            chat = self.client.chat.create(
                model=self.model,
                tools=[
                    web_search(),
                    x_search(),
                ],
                include=[
                    "inline_citations",
                    "verbose_streaming",
                ],
            )
            chat.append(user(query))

            # Stream and collect response
            content = ""
            tool_calls = []
            response = None
            last_printed_tokens = 0
            is_thinking = True

            print(f"\n🔍 Researching: {query}\n")

            for resp, chunk in chat.stream():
                response = resp  # Keep latest response object

                # Track tool calls
                if chunk.tool_calls:
                    for tool_call in chunk.tool_calls:
                        tool_info = {
                            "name": tool_call.function.name,
                            "arguments": tool_call.function.arguments,
                        }
                        tool_calls.append(tool_info)
                        # Clear thinking line before printing tool call
                        if is_thinking:
                            print("\r" + " " * 40 + "\r", end="")
                        print(f"  🔧 {tool_call.function.name}")

                # Track thinking (only update every 100 tokens to reduce spam)
                if response.usage and response.usage.reasoning_tokens and is_thinking:
                    current_tokens = response.usage.reasoning_tokens
                    if current_tokens - last_printed_tokens >= 100:
                        print(
                            f"\r  💭 Thinking... ({current_tokens} tokens)",
                            end="",
                            flush=True,
                        )
                        last_printed_tokens = current_tokens

                # Accumulate and display content
                if chunk.content:
                    # Clear thinking line when content starts
                    if is_thinking:
                        final_tokens = (
                            response.usage.reasoning_tokens if response.usage else 0
                        )
                        print(
                            f"\r  💭 Done thinking ({final_tokens} tokens)" + " " * 10
                        )
                        is_thinking = False
                    content += chunk.content
                    print(chunk.content, end="", flush=True)

            print()  # Newline after streaming

            duration = time.time() - start_time

            # Extract citations
            citations = []
            if response and response.citations:
                citations = list(response.citations)

            # Extract inline citations
            inline_citations = []
            if (
                response
                and hasattr(response, "inline_citations")
                and response.inline_citations
            ):
                inline_citations = list(response.inline_citations)

            # Build metadata
            metadata = {
                "model": self.model,
                "tokens": {
                    "input": response.usage.prompt_tokens
                    if response and response.usage
                    else 0,
                    "output": response.usage.completion_tokens
                    if response and response.usage
                    else 0,
                    "reasoning": response.usage.reasoning_tokens
                    if response and response.usage
                    else 0,
                },
                "tool_calls": tool_calls,
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
