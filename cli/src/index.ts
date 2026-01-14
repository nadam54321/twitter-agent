#!/usr/bin/env bun
/**
 * x-research CLI - Deep research on X/Twitter using Grok AI
 *
 * Usage:
 *   x-research "your query"              # Run research with pretty output
 *   x-research "query" --json            # JSON output
 *   x-research "query" --markdown        # Markdown output
 *   x-research "query" --citations       # Citations only
 *   x-research "query" --stream          # Stream output in real-time
 *   x-research "query" --output file.md  # Save to file
 *   x-research config --set-key <key>    # Set API key
 *   x-research config --show             # Show current config
 *   x-research --help                    # Show help
 */

import { writeFileSync } from "fs";
import {
  getApiKey,
  setApiKey,
  getConfigPath,
  loadConfig,
} from "./config";
import { research, researchStream, type ResearchResult } from "./grok";
import {
  formatResult,
  printStreamToken,
  printError,
  printSuccess,
  printInfo,
} from "./output";

const VERSION = "1.0.0";

interface ParsedArgs {
  command: "research" | "config" | "help" | "version";
  query?: string;
  format: "pretty" | "json" | "markdown" | "citations";
  stream: boolean;
  outputFile?: string;
  configAction?: "set-key" | "show";
  apiKey?: string;
}

function printHelp(): void {
  console.log(`
x-research v${VERSION} - Deep research on X/Twitter using Grok AI

USAGE:
  x-research <query> [options]
  x-research config <action>
  x-research --help | --version

COMMANDS:
  <query>              Run research query (default command)
  config               Manage configuration

RESEARCH OPTIONS:
  --json               Output as JSON
  --markdown, --md     Output as Markdown
  --citations          Output citations only
  --pretty             Output with colors (default)
  --stream             Stream output in real-time
  --output, -o <file>  Save output to file
  --api-key <key>      Use specific API key for this request

CONFIG ACTIONS:
  config --set-key <key>   Save API key to config file
  config --show            Show current configuration

EXAMPLES:
  x-research "Find AI developers building agents on X"
  x-research "Latest news about OpenAI" --json
  x-research "Trending crypto discussions" --markdown -o report.md
  x-research "What are people saying about Grok?" --stream
  x-research config --set-key xai-your-api-key-here

ENVIRONMENT:
  XAI_API_KEY          API key (can also be set via config)

CONFIG FILE:
  ${getConfigPath()}
`);
}

function printVersion(): void {
  console.log(`x-research v${VERSION}`);
}

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    command: "research",
    format: "pretty",
    stream: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    // Help
    if (arg === "--help" || arg === "-h") {
      parsed.command = "help";
      return parsed;
    }

    // Version
    if (arg === "--version" || arg === "-v") {
      parsed.command = "version";
      return parsed;
    }

    // Config command
    if (arg === "config") {
      parsed.command = "config";
      i++;
      continue;
    }

    // Config actions
    if (arg === "--set-key") {
      parsed.configAction = "set-key";
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        parsed.apiKey = args[i + 1];
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (arg === "--show") {
      parsed.configAction = "show";
      i++;
      continue;
    }

    // Format options
    if (arg === "--json") {
      parsed.format = "json";
      i++;
      continue;
    }

    if (arg === "--markdown" || arg === "--md") {
      parsed.format = "markdown";
      i++;
      continue;
    }

    if (arg === "--citations") {
      parsed.format = "citations";
      i++;
      continue;
    }

    if (arg === "--pretty") {
      parsed.format = "pretty";
      i++;
      continue;
    }

    // Stream option
    if (arg === "--stream") {
      parsed.stream = true;
      i++;
      continue;
    }

    // Output file
    if (arg === "--output" || arg === "-o") {
      if (i + 1 < args.length) {
        parsed.outputFile = args[i + 1];
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    // API key option
    if (arg === "--api-key") {
      if (i + 1 < args.length) {
        parsed.apiKey = args[i + 1];
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    // Query (non-flag argument)
    if (!arg.startsWith("-") && !parsed.query) {
      parsed.query = arg;
      i++;
      continue;
    }

    i++;
  }

  return parsed;
}

async function handleConfig(args: ParsedArgs): Promise<void> {
  if (args.configAction === "set-key") {
    if (!args.apiKey) {
      printError("No API key provided. Usage: x-research config --set-key <key>");
      process.exit(1);
    }
    setApiKey(args.apiKey);
    printSuccess(`API key saved to ${getConfigPath()}`);
    return;
  }

  if (args.configAction === "show") {
    const config = loadConfig();
    const apiKey = getApiKey();
    console.log("\nCurrent Configuration:");
    console.log(`  Config file: ${getConfigPath()}`);
    console.log(
      `  API key: ${apiKey ? apiKey.slice(0, 8) + "..." + apiKey.slice(-4) : "(not set)"}`
    );
    console.log(`  Default format: ${config.defaultFormat || "pretty"}`);
    console.log("");
    return;
  }

  // No action specified
  printError("No config action specified. Use --set-key or --show");
  process.exit(1);
}

async function handleResearch(args: ParsedArgs): Promise<void> {
  if (!args.query) {
    printError("No query provided. Usage: x-research \"your query\"");
    process.exit(1);
  }

  const apiKey = getApiKey(args.apiKey);
  if (!apiKey) {
    printError(
      "No API key found. Set it with:\n" +
        "  x-research config --set-key <your-key>\n" +
        "  or set XAI_API_KEY environment variable"
    );
    process.exit(1);
  }

  let result: ResearchResult;

  try {
    if (args.stream) {
      // Streaming mode
      printInfo(`Researching: "${args.query}"\n`);
      result = await researchStream(apiKey, args.query, {
        onToken: (token) => printStreamToken(token),
      });
      console.log("\n"); // Add newlines after streaming
    } else {
      // Non-streaming mode
      printInfo(`Researching: "${args.query}"...`);
      result = await research(apiKey, args.query);
    }

    // Format output
    const output = formatResult(result, args.format);

    // Save to file if specified
    if (args.outputFile) {
      writeFileSync(args.outputFile, output);
      printSuccess(`Output saved to ${args.outputFile}`);
    } else if (!args.stream || args.format !== "pretty") {
      // Print output (skip if streaming with pretty format - already printed)
      console.log(output);
    } else {
      // For streaming with pretty format, just print metadata
      console.log(`\nTokens: ${result.metadata.tokens.total} | Duration: ${result.metadata.durationSeconds}s | Cost: $${result.metadata.estimatedCost.toFixed(6)}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      printError(error.message);
    } else {
      printError("An unknown error occurred");
    }
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case "help":
      printHelp();
      break;
    case "version":
      printVersion();
      break;
    case "config":
      await handleConfig(args);
      break;
    case "research":
    default:
      await handleResearch(args);
      break;
  }
}

main().catch((error) => {
  printError(error.message || "An unexpected error occurred");
  process.exit(1);
});
