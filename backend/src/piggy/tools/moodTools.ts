import { moodService } from "../../modules/moods/mood.service.js";
import { MOOD_VALUES, type MoodValue } from "../../modules/moods/mood.types.js";
import type {
  PiggyToolDefinition,
  PiggyToolResult,
} from "./habitTools.js";

export const moodToolDefinitions: PiggyToolDefinition[] = [
  {
    name: "piggy_mood_log",
    description:
      "Log the user's current mood. Mood must be one of Great, Good, Normal, Low, Bad.",
    category: "analytics" as never,
    inputSchema: {
      type: "object",
      properties: {
        mood: {
          type: "string",
          description: "Mood value",
          enum: [...MOOD_VALUES],
          default: "Normal",
        },
        note: { type: "string", description: "Optional journal note" },
      },
      required: ["mood"],
    },
  },
  {
    name: "piggy_mood_create",
    description:
      "Log or record the user's current mood. Mood must be one of Great, Good, Normal, Low, Bad.",
    category: "analytics" as never,
    inputSchema: {
      type: "object",
      properties: {
        mood: {
          type: "string",
          description: "Mood value",
          enum: [...MOOD_VALUES],
          default: "Normal",
        },
        note: { type: "string", description: "Optional journal note" },
      },
      required: ["mood"],
    },
  },
  {
    name: "piggy_moods_create",
    description:
      "Log or record the user's current mood. Mood must be one of Great, Good, Normal, Low, Bad.",
    category: "analytics" as never,
    inputSchema: {
      type: "object",
      properties: {
        mood: {
          type: "string",
          description: "Mood value",
          enum: [...MOOD_VALUES],
          default: "Normal",
        },
        note: { type: "string", description: "Optional journal note" },
      },
      required: ["mood"],
    },
  },
  {
    name: "piggy_moods_list",
    description: "List recent mood entries logged by the user.",
    category: "analytics" as never,
    inputSchema: { type: "object", properties: {} },
  },
];

function normalizeMood(raw: string): MoodValue {
  const match = MOOD_VALUES.find(
    (m) => m.toLowerCase() === raw.trim().toLowerCase(),
  );

  if (match) return match;
  if (raw.toLowerCase().includes("great") || raw.toLowerCase().includes("happy") || raw.toLowerCase().includes("awesome")) return "Great";
  if (raw.toLowerCase().includes("good") || raw.toLowerCase().includes("fine")) return "Good";
  if (raw.toLowerCase().includes("low") || raw.toLowerCase().includes("sad") || raw.toLowerCase().includes("anxious")) return "Low";
  if (raw.toLowerCase().includes("bad") || raw.toLowerCase().includes("terrible")) return "Bad";

  return "Normal";
}

// Standalone function so all handler aliases can call it without `this` binding
async function logMoodHandler(
  args: Record<string, unknown>,
): Promise<PiggyToolResult> {
  const rawMood = typeof args.mood === "string" ? args.mood : "Normal";
  const mood = normalizeMood(rawMood);
  const note = typeof args.note === "string" ? args.note.trim() : undefined;

  try {
    const logged = await moodService.createMood({
      mood,
      ...(note ? { note } : {}),
    });

    return {
      success: true,
      data: logged,
      message: `Logged mood "${logged.mood}" (score ${logged.score}/5).`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to log mood.",
    };
  }
}

export const moodTools = {
  piggy_mood_log: logMoodHandler,
  piggy_mood_create: logMoodHandler,
  piggy_moods_create: logMoodHandler,

  async piggy_moods_list(): Promise<PiggyToolResult> {
    const moods = await moodService.getMoods();

    return {
      success: true,
      data: moods,
      message: `Retrieved ${moods.length} mood entries.`,
    };
  },
};
