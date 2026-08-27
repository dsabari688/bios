/**
 * securityGuard.ts
 *
 * Security guardrails for prompt injection defense, untrusted data isolation,
 * and hypothetical / quoted text detection.
 */

export interface SecurityCheckResult {
  isHypotheticalOrQuoted: boolean;
  explanation?: string;
  sanitizedContent: string;
}

/**
 * Wraps untrusted external data (database records, memory facts, tool outputs)
 * inside strict XML delimiters to prevent prompt injection.
 */
export function wrapUntrustedData(data: string, tag: "UNTRUSTED_MEMORY" | "UNTRUSTED_LIVE_DATA" | "TOOL_OUTPUT"): string {
  if (!data) return "";
  const sanitized = data.replace(/<\/?(?:system|prompt|instruction|script)>/gi, "");
  return `<${tag}>\n${sanitized}\n</${tag}>`;
}

/**
 * Checks if user message is hypothetical ("what would happen if I delete this?"),
 * informational ("what does delete do?"), or quoted speech ("my friend said 'delete tasks'").
 */
export function analyzeSecurityContext(message: string): SecurityCheckResult {
  const lower = message.toLowerCase().trim();

  // Quoted text detection (e.g. my friend said "delete all tasks")
  const containsQuotedInstruction = /(?:said|wrote|messaged|told me)\s+["'«]([^"'»]+)["'»]/i.test(message);

  // Hypothetical questions (e.g. "what if I said...", "what would happen if...")
  const isHypothetical = /^(what if|what would happen if|suppose i|if i said|hypothetically)/i.test(lower);

  // Informational questions about operations (e.g. "what happens when I delete a task?")
  const isInformationalAboutOp = /^(what happens when|how do i|what does|is it safe to)\s+(delete|remove|clear|create)/i.test(lower);

  if (isHypothetical || isInformationalAboutOp || containsQuotedInstruction) {
    return {
      isHypotheticalOrQuoted: true,
      explanation: "This is an informational or hypothetical query, not a direct action request.",
      sanitizedContent: message,
    };
  }

  return {
    isHypotheticalOrQuoted: false,
    sanitizedContent: message,
  };
}
