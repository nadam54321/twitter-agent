#!/usr/bin/env python
"""
X Research Agent CLI - Deep research on X/Twitter using Grok API.

Usage:
    python research.py "your research query here"
    python research.py --query "your research query here"
"""

import argparse
import sys
import json
from dotenv import load_dotenv

# Load environment before importing agent modules
load_dotenv(".env.local")

from agent.researcher import XResearcher
from agent.output import ResearchOutput


def main():
    parser = argparse.ArgumentParser(
        description="X/Twitter Research Agent powered by Grok API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python research.py "What are developers saying about AI agents?"
  python research.py "Find VCs interested in AI startups"
  python research.py --query "Latest trends in crypto on X"
""",
    )
    parser.add_argument(
        "query", nargs="?", help="Research query (can also use --query)"
    )
    parser.add_argument(
        "--query",
        "-q",
        dest="query_flag",
        help="Research query (alternative to positional argument)",
    )

    args = parser.parse_args()

    # Get query from either positional or flag
    query = args.query or args.query_flag

    if not query:
        parser.print_help()
        sys.exit(1)

    try:
        researcher = XResearcher()
        result = researcher.research(query)

        output = ResearchOutput.create(
            query=query,
            response=result["response"],
            citations=result["citations"],
            metadata=result["metadata"],
            inline_citations=result.get("inline_citations", []),
        )

        print(output.to_json())

    except Exception as e:
        error_output = {"error": str(e), "query": query}
        print(json.dumps(error_output, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
