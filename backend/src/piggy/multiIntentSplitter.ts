/**
 * multiIntentSplitter.ts
 *
 * Splits complex multi-command messages into independent Action Units
 * and determines execution order (e.g. deletions before creation).
 */

export interface ActionUnit {
  rawText: string;
  toolHint?: string;
  orderPriority: number; // Lower numbers execute first (e.g. 1: delete, 2: complete, 3: create)
}

/**
 * Detects whether a message contains multiple commands split by conjunctions (and, then, comma).
 */
export function isMultiCommandMessage(message: string): boolean {
  const lower = message.toLowerCase().trim();
  const conjunctionPatterns = [
    /\b(create|add|make|schedule)\b.*\b(and|then|,)\b.*\b(delete|remove|clear|complete|finish)\b/i,
    /\b(delete|remove|clear|complete|finish)\b.*\b(and|then|,)\b.*\b(create|add|make|schedule)\b/i,
    /\b(complete|finish)\b.*\b(and|then|,)\b.*\b(delete|remove|clear)\b/i,
  ];

  return conjunctionPatterns.some((pattern) => pattern.test(lower));
}

/**
 * Splits a multi-command message into independent action sub-phrases with execution priority.
 */
export function splitMultiCommandMessage(message: string): ActionUnit[] {
  if (!isMultiCommandMessage(message)) {
    return [{ rawText: message.trim(), orderPriority: 1 }];
  }

  // Split on "and then", "then", " and ", or ", "
  const rawParts = message
    .split(/\b(?:and then|then)\b|(?:\s+and\s+)|(?:\s*,\s*)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (rawParts.length <= 1) {
    return [{ rawText: message.trim(), orderPriority: 1 }];
  }

  const units: ActionUnit[] = rawParts.map((part) => {
    let priority = 5; // Default middle priority
    const lower = part.toLowerCase();

    // Deletions / Removals happen first (Priority 1)
    if (/\b(delete|remove|clear|cancel)\b/i.test(lower)) {
      priority = 1;
    }
    // Completions / Updates happen second (Priority 2)
    else if (/\b(complete|finish|mark|done|update)\b/i.test(lower)) {
      priority = 2;
    }
    // Creations happen third (Priority 3)
    else if (/\b(create|add|make|schedule|set up)\b/i.test(lower)) {
      priority = 3;
    }

    return {
      rawText: part,
      orderPriority: priority,
    };
  });

  // Sort by priority so dependencies execute in safe order (deletes -> completes -> creates)
  units.sort((a, b) => a.orderPriority - b.orderPriority);

  return units;
}
