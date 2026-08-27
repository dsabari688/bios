/**
 * schemaValidator.ts
 *
 * Centralized tool schema, data type, and range validator.
 * Prevents out-of-range values, invalid data types, schema mismatches, and unregistered tools.
 */

import { listPiggyTools } from "./toolExecutor.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  normalizedArgs: Record<string, unknown>;
}

/**
 * Validates requested tool exists and that arguments conform to required types and ranges.
 */
export function validateToolSchema(
  toolName: string,
  rawArgs: Record<string, unknown> = {},
): ValidationResult {
  const tools = listPiggyTools();
  const definition = tools.find((t) => t.name === toolName);

  if (!definition) {
    return {
      valid: false,
      errors: [`Tool "${toolName}" is not registered or supported by Piggy.`],
      normalizedArgs: {},
    };
  }

  const errors: string[] = [];
  const normalized: Record<string, unknown> = { ...rawArgs };
  const schemaProps = definition.inputSchema.properties ?? {};
  const requiredFields = definition.inputSchema.required ?? [];

  // Check required fields
  for (const field of requiredFields) {
    if (normalized[field] === undefined || normalized[field] === null || normalized[field] === "") {
      errors.push(`Missing required argument "${field}" for ${toolName}.`);
    }
  }

  // Range and type validation for specific tools / parameters
  for (const [key, value] of Object.entries(normalized)) {
    if (value === undefined || value === null) continue;

    const expectedType = schemaProps[key]?.type;

    // String cleanup first
    if (typeof value === "string" && key !== "progress") {
      normalized[key] = value.trim();
    }

    // Progress range check (Goal operations)
    if (key === "progress") {
      let numVal: number;
      if (typeof value === "string") {
        const cleaned = value.replace(/%/g, "").trim();
        numVal = Number(cleaned);
      } else {
        numVal = Number(value);
      }

      if (isNaN(numVal)) {
        errors.push(`Invalid progress value "${value}". Must be a number between 0 and 100.`);
      } else if (numVal < 0 || numVal > 100) {
        errors.push(`Goal progress must be between 0% and 100%. Got ${numVal}%.`);
      } else {
        normalized[key] = Math.round(numVal);
      }
    }

    // Amount validation (Expense operations)
    if (key === "amount") {
      const numVal = Number(value);
      if (isNaN(numVal) || numVal <= 0) {
        errors.push(`Expense amount must be a positive number. Got "${value}".`);
      } else {
        normalized[key] = numVal;
      }
    }

    // Number type enforcement
    if ((expectedType === "number" || expectedType === "integer") && key !== "progress") {
      const numVal = Number(normalized[key]);
      if (isNaN(numVal)) {
        errors.push(`Argument "${key}" expected a number, but received "${normalized[key]}".`);
      } else {
        normalized[key] = expectedType === "integer" ? Math.floor(numVal) : numVal;
      }
    }

  }

  return {
    valid: errors.length === 0,
    errors,
    normalizedArgs: normalized,
  };
}

/**
 * Maps internal backend / database error objects to clean user-facing descriptions.
 */
export function mapInternalErrorToUserMessage(error: unknown): string {
  if (!error) return "Something went wrong while completing that request.";

  const errStr = String(error);

  if (errStr.includes("P2002") || errStr.includes("unique constraint")) {
    return "A record with that information already exists.";
  }
  if (errStr.includes("P2025") || errStr.includes("Record to update not found")) {
    return "I couldn't find that item in your records.";
  }
  if (errStr.includes("P2003") || errStr.includes("foreign key constraint")) {
    return "This action depends on another item that doesn't exist.";
  }
  if (errStr.includes("ECONNREFUSED") || errStr.includes("ENOTFOUND")) {
    return "I couldn't connect to the database right now. Please try again in a moment.";
  }

  return "I ran into a problem completing that action. Want to try again?";
}
