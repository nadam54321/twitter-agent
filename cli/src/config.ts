/**
 * Configuration management for x-research CLI
 * Handles OpenRouter API key storage and retrieval
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".config", "x-research");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  apiKey?: string;
  defaultFormat?: "json" | "pretty" | "markdown";
}

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load config from file
 */
export function loadConfig(): Config {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Ignore errors, return empty config
  }
  return {};
}

/**
 * Save config to file
 */
export function saveConfig(config: Config): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/**
 * Get API key from (in order of priority):
 * 1. Command line argument
 * 2. Environment variable OPENROUTER_API_KEY
 * 3. Config file
 */
export function getApiKey(cliKey?: string): string | undefined {
  // 1. CLI argument takes priority
  if (cliKey) {
    return cliKey;
  }

  // 2. Environment variable
  const envKey = process.env.OPENROUTER_API_KEY;
  if (envKey) {
    return envKey;
  }

  // 3. Config file
  const config = loadConfig();
  return config.apiKey;
}

/**
 * Set API key in config file
 */
export function setApiKey(apiKey: string): void {
  const config = loadConfig();
  config.apiKey = apiKey;
  saveConfig(config);
}

/**
 * Check if API key is configured
 */
export function hasApiKey(): boolean {
  return !!getApiKey();
}

/**
 * Get config file path (for display)
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}
