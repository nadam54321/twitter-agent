/**
 * Grok API client for x-research CLI
 * Handles communication with xAI's Grok API
 */

export interface ResearchResult {
  query: string;
  timestamp: string;
  response: string;
  citations: string[];
  metadata: {
    model: string;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    durationSeconds: number;
    estimatedCost: number;
  };
}

interface GrokMessage {
  role: string;
  content: string;
}

interface GrokChoice {
  index: number;
  message: GrokMessage;
  finish_reason: string;
}

interface GrokUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface GrokResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GrokChoice[];
  usage: GrokUsage;
  citations?: string[];
}

export interface StreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (result: ResearchResult) => void;
  onError?: (error: Error) => void;
}

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = "grok-4-1-fast-reasoning";

const SYSTEM_PROMPT = `You are a research assistant specializing in finding information on X (Twitter) and the web.

When given a research query:
1. Search for relevant posts, users, and discussions on X
2. Supplement with additional web context when needed
3. Synthesize findings into a comprehensive, well-organized response
4. Include specific usernames, post excerpts, and links when relevant
5. Be thorough but concise - focus on the most relevant and recent information

Format your response with clear sections and bullet points where appropriate.`;

/**
 * Perform research using Grok API
 */
export async function research(
  apiKey: string,
  query: string,
  callbacks?: StreamCallbacks
): Promise<ResearchResult> {
  const startTime = Date.now();

  callbacks?.onStart?.();

  const response = await fetch(GROK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      stream: false,
      search_parameters: {
        mode: "auto",
        sources: [
          { type: "x" },
          { type: "web" }
        ]
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Grok API error: ${response.status} - ${errorText}`);
    callbacks?.onError?.(error);
    throw error;
  }

  const data = (await response.json()) as GrokResponse;
  const durationSeconds = (Date.now() - startTime) / 1000;

  // Calculate estimated cost
  // Approximate: $0.20/1M input, $0.60/1M output
  const inputCost = (data.usage.prompt_tokens / 1_000_000) * 0.2;
  const outputCost = (data.usage.completion_tokens / 1_000_000) * 0.6;
  const estimatedCost = inputCost + outputCost;

  const result: ResearchResult = {
    query,
    timestamp: new Date().toISOString(),
    response: data.choices[0]?.message?.content || "",
    citations: data.citations || [],
    metadata: {
      model: data.model,
      tokens: {
        input: data.usage.prompt_tokens,
        output: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      },
      durationSeconds: Math.round(durationSeconds * 100) / 100,
      estimatedCost: Math.round(estimatedCost * 1000000) / 1000000,
    },
  };

  callbacks?.onToken?.(result.response);
  callbacks?.onComplete?.(result);

  return result;
}

/**
 * Perform research with streaming output
 */
export async function researchStream(
  apiKey: string,
  query: string,
  callbacks?: StreamCallbacks
): Promise<ResearchResult> {
  const startTime = Date.now();

  callbacks?.onStart?.();

  const response = await fetch(GROK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      stream: true,
      search_parameters: {
        mode: "auto",
        sources: [
          { type: "x" },
          { type: "web" }
        ]
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Grok API error: ${response.status} - ${errorText}`);
    callbacks?.onError?.(error);
    throw error;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let fullContent = "";
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let model = DEFAULT_MODEL;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

    for (const line of lines) {
      const data = line.slice(6); // Remove "data: " prefix
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullContent += content;
          callbacks?.onToken?.(content);
        }
        if (parsed.model) {
          model = parsed.model;
        }
        if (parsed.usage) {
          totalInputTokens = parsed.usage.prompt_tokens || totalInputTokens;
          totalOutputTokens = parsed.usage.completion_tokens || totalOutputTokens;
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  const durationSeconds = (Date.now() - startTime) / 1000;

  // Estimate tokens if not provided
  if (totalOutputTokens === 0) {
    totalOutputTokens = Math.ceil(fullContent.length / 4);
  }
  if (totalInputTokens === 0) {
    totalInputTokens = Math.ceil((SYSTEM_PROMPT.length + query.length) / 4);
  }

  const inputCost = (totalInputTokens / 1_000_000) * 0.2;
  const outputCost = (totalOutputTokens / 1_000_000) * 0.6;
  const estimatedCost = inputCost + outputCost;

  const result: ResearchResult = {
    query,
    timestamp: new Date().toISOString(),
    response: fullContent,
    citations: [],
    metadata: {
      model,
      tokens: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      durationSeconds: Math.round(durationSeconds * 100) / 100,
      estimatedCost: Math.round(estimatedCost * 1000000) / 1000000,
    },
  };

  callbacks?.onComplete?.(result);

  return result;
}
