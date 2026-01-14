/**
 * Output formatters for x-research CLI
 * Handles different output formats: pretty, json, markdown, citations-only
 */

import type { ResearchResult } from "./grok";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

/**
 * Format result as pretty colored terminal output
 */
export function formatPretty(result: ResearchResult): string {
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(
    `${colors.cyan}${colors.bold}X Research Results${colors.reset}`
  );
  lines.push(`${colors.dim}${"─".repeat(50)}${colors.reset}`);

  // Query
  lines.push("");
  lines.push(`${colors.yellow}Query:${colors.reset} ${result.query}`);
  lines.push(
    `${colors.gray}${result.timestamp}${colors.reset}`
  );

  // Response
  lines.push("");
  lines.push(`${colors.green}${colors.bold}Response:${colors.reset}`);
  lines.push(`${colors.dim}${"─".repeat(50)}${colors.reset}`);
  lines.push("");
  lines.push(result.response);

  // Citations
  if (result.citations.length > 0) {
    lines.push("");
    lines.push(`${colors.blue}${colors.bold}Citations:${colors.reset}`);
    lines.push(`${colors.dim}${"─".repeat(50)}${colors.reset}`);
    result.citations.forEach((citation, i) => {
      lines.push(`${colors.dim}${i + 1}.${colors.reset} ${citation}`);
    });
  }

  // Metadata
  lines.push("");
  lines.push(`${colors.magenta}${colors.bold}Metadata:${colors.reset}`);
  lines.push(`${colors.dim}${"─".repeat(50)}${colors.reset}`);
  lines.push(`${colors.dim}Model:${colors.reset} ${result.metadata.model}`);
  lines.push(
    `${colors.dim}Tokens:${colors.reset} ${result.metadata.tokens.input} in / ${result.metadata.tokens.output} out (${result.metadata.tokens.total} total)`
  );
  lines.push(
    `${colors.dim}Duration:${colors.reset} ${result.metadata.durationSeconds}s`
  );
  lines.push(
    `${colors.dim}Est. Cost:${colors.reset} $${result.metadata.estimatedCost.toFixed(6)}`
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Format result as JSON
 */
export function formatJSON(result: ResearchResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format result as Markdown
 */
export function formatMarkdown(result: ResearchResult): string {
  const lines: string[] = [];

  lines.push("# X Research Results");
  lines.push("");
  lines.push(`**Query:** ${result.query}`);
  lines.push(`**Date:** ${result.timestamp}`);
  lines.push("");
  lines.push("## Response");
  lines.push("");
  lines.push(result.response);

  if (result.citations.length > 0) {
    lines.push("");
    lines.push("## Citations");
    lines.push("");
    result.citations.forEach((citation, i) => {
      lines.push(`${i + 1}. ${citation}`);
    });
  }

  lines.push("");
  lines.push("## Metadata");
  lines.push("");
  lines.push(`- **Model:** ${result.metadata.model}`);
  lines.push(
    `- **Tokens:** ${result.metadata.tokens.input} input / ${result.metadata.tokens.output} output (${result.metadata.tokens.total} total)`
  );
  lines.push(`- **Duration:** ${result.metadata.durationSeconds}s`);
  lines.push(`- **Estimated Cost:** $${result.metadata.estimatedCost.toFixed(6)}`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Format result as citations only (just the URLs/references)
 */
export function formatCitationsOnly(result: ResearchResult): string {
  if (result.citations.length === 0) {
    return "No citations found.";
  }
  return result.citations.join("\n");
}

/**
 * Format result based on format type
 */
export function formatResult(
  result: ResearchResult,
  format: "pretty" | "json" | "markdown" | "citations"
): string {
  switch (format) {
    case "json":
      return formatJSON(result);
    case "markdown":
      return formatMarkdown(result);
    case "citations":
      return formatCitationsOnly(result);
    case "pretty":
    default:
      return formatPretty(result);
  }
}

/**
 * Print streaming token (for real-time output)
 */
export function printStreamToken(token: string): void {
  process.stdout.write(token);
}

/**
 * Print error message
 */
export function printError(message: string): void {
  console.error(`${colors.bold}\x1b[31mError:${colors.reset} ${message}`);
}

/**
 * Print success message
 */
export function printSuccess(message: string): void {
  console.log(`${colors.green}${colors.bold}Success:${colors.reset} ${message}`);
}

/**
 * Print info message
 */
export function printInfo(message: string): void {
  console.log(`${colors.cyan}${message}${colors.reset}`);
}
