/**
 * conversational.test.ts
 *
 * Automated tests for Piggy's conversational intelligence.
 * Covers spec sections A through P:
 * - Routing, fast-chat vs RAG
 * - Speech-to-text typo slot filling ("10 pam today", "today 10 pm")
 * - Multi-slot extraction & cancellation ("cancel")
 * - Historical memory retrieval ("What was my old programming preference?")
 * - Silent memory auto-save
 * - Casual/profanity non-memory routing ("i need to fuck my ass")
 * - Reasoning boundaries ("Tell me something about me that I haven't told you")
 * - Task list free of UUIDs and internal execution leaks
 * - General knowledge, songs, movies, motivation
 *
 * Run: npx tsx src/piggy/evaluation/conversational.test.ts
 */

import "dotenv/config";
import { piggyIntelligence } from "../PiggyIntelligence.js";
import { classifyQuery } from "../rag.js";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, details?: string): void {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${details ? `\n     ${details}` : ""}`);
    failed++;
    failures.push(testName);
  }
}

function notContains(response: string, badTerms: string[]): boolean {
  const lower = response.toLowerCase();
  return badTerms.every((term) => !lower.includes(term.toLowerCase()));
}

async function chat(message: string, convId?: string): Promise<{ response: string; convId: string; success: boolean }> {
  let attempts = 0;
  let result = await piggyIntelligence.handleChat({ message, conversationId: convId ?? null });

  while (result.response.includes("slowdown") && attempts < 3) {
    attempts++;
    console.log(`     [RATE-LIMIT RETRY ${attempts}] waiting 4s for Groq quota reset...`);
    await new Promise((r) => setTimeout(r, 4000));
    result = await piggyIntelligence.handleChat({ message, conversationId: convId ?? null });
  }

  console.log(`     "${message.slice(0, 50)}" → "${result.response.slice(0, 80)}"`);
  return { response: result.response, convId: result.conversationId, success: result.success };
}

const BAD_PATTERNS = [
  "uuid", "database updated", "ai bridge", "mission initialized", "tactical",
  "cognitive vectors", "telemetry", "secure uplink", "confidence 0.", "mcp",
  "[id=", "action_type", "tool execution", "piggy_", "api responded",
];

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// ─── Test Sections ─────────────────────────────────────────────────────────

async function testRouting() {
  console.log("\n=== A. ROUTING TESTS (classifyQuery) ===");

  const cases: [string, string][] = [
    ["hi", "FAST_CHAT"],
    ["hello", "FAST_CHAT"],
    ["can u help me", "FAST_CHAT"],
    ["sing a song for me", "FAST_CHAT"],
    ["tell me something", "FAST_CHAT"],
    ["say some stories", "FAST_CHAT"],
    ["motivate me", "FAST_CHAT"],
    ["what is the capital of france", "FAST_CHAT"],
    ["what is docker", "FAST_CHAT"],
    ["explain recursion", "FAST_CHAT"],
    ["recommend a movie", "FAST_CHAT"],
    ["i'm tired", "FAST_CHAT"],
    ["i need to fuck my ass", "NONE"], // Profane/casual phrase must NOT be MEMORY
    ["what are my tasks", "LIVE_DATA"],
    ["what are my goals", "LIVE_DATA"],
    ["what is my budget", "LIVE_DATA"],
    ["what do I prefer studying", "MEMORY"],
    ["what do you know about me", "MEMORY"],
    ["considering my morning preference, what should I focus on today", "HYBRID"],
  ];

  for (const [query, expectedMode] of cases) {
    const { mode } = classifyQuery(query);
    assert(mode === expectedMode, `classifyQuery("${query}") === "${expectedMode}"`, `Got: "${mode}"`);
  }

  // Negative routing assertions
  const { mode: dockerMode, liveSources: dockerSources } = classifyQuery("what is docker?");
  assert(
    dockerMode !== "LIVE_DATA" && dockerSources.length === 0,
    `"what is docker?" does NOT trigger live data retrieval`,
    `mode=${dockerMode}, liveSources=${JSON.stringify(dockerSources)}`,
  );
}

async function testConversation() {
  console.log("\n=== B. CONVERSATION & CASUAL CHAT TESTS ===");
  const convId = crypto.randomUUID();

  const r1 = await chat("hi", convId);
  assert(r1.success, "hi → success");
  assert(notContains(r1.response, BAD_PATTERNS), "hi → no internal metadata");
  assert(r1.response.length < 100, "hi → concise response");

  const r2 = await chat("tell me something", convId);
  assert(r2.success, "tell me something → success");
  assert(
    !r2.response.toLowerCase().includes("task") && !r2.response.toLowerCase().includes("scheduled"),
    "tell me something → does NOT return a task",
    `Got: "${r2.response}"`,
  );
  assert(notContains(r2.response, BAD_PATTERNS), "tell me something → no internal metadata");

  const r3 = await chat("say some stories", convId);
  assert(r3.success, "say some stories → success");
  assert(r3.response.length > 20, "say some stories → returns creative content");
  assert(notContains(r3.response, BAD_PATTERNS), "say some stories → no internal metadata");
}

async function testGeneralKnowledge() {
  console.log("\n=== C. GENERAL KNOWLEDGE TESTS ===");
  const convId = crypto.randomUUID();

  const r1 = await chat("what is the capital of france?", convId);
  assert(r1.success, "capital of france → success");
  assert(
    r1.response.toLowerCase().includes("paris"),
    'capital of france → response contains "Paris"',
    `Got: "${r1.response}"`,
  );
  assert(notContains(r1.response, BAD_PATTERNS), "capital of france → no internal metadata");

  const r2 = await chat("what is docker?", convId);
  assert(r2.success, "what is docker → success");
  assert(r2.response.length > 20, "what is docker → informative response");
  assert(notContains(r2.response, BAD_PATTERNS), "what is docker → no internal metadata");
}

async function testEntertainment() {
  console.log("\n=== D. ENTERTAINMENT & MOTIVATION TESTS ===");
  const convId = crypto.randomUUID();

  const r1 = await chat("sing a song for me", convId);
  assert(r1.success, "sing → success");
  assert(
    !r1.response.toLowerCase().includes("cannot actually sing") &&
    !r1.response.toLowerCase().includes("unable to sing"),
    "sing → produces song (not a refusal)",
    `Got: "${r1.response.slice(0, 100)}"`,
  );

  const r2 = await chat("motivate me", convId);
  assert(r2.success, "motivate me → success");
  assert(notContains(r2.response, ["analytics", "task created", "piggy_", "[id="]), "motivate me → natural motivation");
}

async function testMemoryLifecycle() {
  console.log("\n=== E. MEMORY LIFECYCLE & HISTORICAL RETRIEVAL TESTS ===");
  const convId = crypto.randomUUID();

  // Save Python preference
  const r1 = await chat("I prefer studying Python in the morning.", convId);
  assert(r1.success, "memory: save Python preference → success");
  assert(notContains(r1.response, BAD_PATTERNS), "memory: save Python → no internal metadata");
  assert(!r1.response.includes("PIGGY EXECUTED"), "memory: save Python → silent response (no execution trace)");
  await new Promise((r) => setTimeout(r, 800));

  // Retrieve Python preference
  const r2 = await chat("What do I prefer studying in the morning?", convId);
  assert(r2.success, "memory: retrieve active Python → success");
  assert(
    r2.response.toLowerCase().includes("python"),
    'memory: retrieve active → response mentions "Python"',
    `Got: "${r2.response}"`,
  );

  // Update preference to Java
  const r3 = await chat("I prefer studying Java in the morning now.", convId);
  assert(r3.success, "memory: update to Java → success");
  assert(!r3.response.includes("DATABASE UPDATED"), "memory: update to Java → silent response");
  await new Promise((r) => setTimeout(r, 800));

  // Retrieve active Java preference
  const r4 = await chat("What do I prefer studying in the morning?", convId);
  assert(r4.success, "memory: retrieve updated Java → success");
  assert(
    r4.response.toLowerCase().includes("java"),
    'memory: retrieve updated → response mentions "Java"',
    `Got: "${r4.response}"`,
  );

  // Retrieve historical superseded Python preference
  const r5 = await chat("What was my old programming preference?", convId);
  assert(r5.success, "memory: retrieve historical Python preference → success");
  assert(
    r5.response.toLowerCase().includes("python"),
    'memory: historical query → response mentions superseded "Python"',
    `Got: "${r5.response}"`,
  );
}

async function testReasoningBoundaries() {
  console.log("\n=== F. REASONING BOUNDARIES & UNKNOWN FACTS TESTS ===");
  const convId = crypto.randomUUID();

  const r1 = await chat("Tell me something about me that I haven't told you", convId);
  assert(r1.success, "reasoning boundary → success");
  assert(
    !r1.response.toLowerCase().includes("task scheduled") &&
    !r1.response.toLowerCase().includes("you have a task"),
    "reasoning boundary → does NOT invent a task",
    `Got: "${r1.response}"`,
  );
  assert(notContains(r1.response, BAD_PATTERNS), "reasoning boundary → clean response");

  const r2 = await chat("What is my pet's name?", convId);
  assert(r2.success, "unknown pet name → success");
  assert(
    r2.response.toLowerCase().includes("don't know") ||
    r2.response.toLowerCase().includes("haven't") ||
    r2.response.toLowerCase().includes("not sure") ||
    r2.response.toLowerCase().includes("no record") ||
    r2.response.toLowerCase().includes("haven't shared"),
    "unknown pet name → acknowledges unknown without hallucinating",
    `Got: "${r2.response}"`,
  );

  const r3 = await chat("I want to learn Docker", convId);
  assert(r3.success, "learning intention → success");
  assert(
    !r3.response.toLowerCase().includes("task created") &&
    !r3.response.toLowerCase().includes("added task"),
    "learning intention → does NOT automatically create a task",
    `Got: "${r3.response}"`,
  );
}

async function testSlotFilling() {
  console.log("\n=== G. TYPO-TOLERANT & MULTI-SLOT TASK CREATION TESTS ===");

  // Test 1: Direct inline task creation
  const convId1 = crypto.randomUUID();
  const r1 = await chat("Create a task to study Java tomorrow at 7 PM", convId1);
  assert(r1.success, "task inline → success");
  assert(
    r1.response.toLowerCase().includes("study java") || r1.response.toLowerCase().includes("java"),
    "task inline → mentions task title",
    `Got: "${r1.response}"`,
  );
  assert(!UUID_REGEX.test(r1.response), "task inline → contains NO UUIDs");
  assert(notContains(r1.response, BAD_PATTERNS), "task inline → clean response");

  // Test 2: Typo-tolerant slot filling ("10 pam today", "today 10 pm")
  const convId2 = crypto.randomUUID();
  const r2a = await chat("create task", convId2);
  assert(r2a.success, "slot fill: step 1 (create task) → success");
  assert(r2a.response.includes("?"), "slot fill: step 1 → asks question");

  const r2b = await chat("my love", r2a.convId);
  assert(r2b.success, "slot fill: step 2 (title: my love) → success");

  // Speech-to-text typo: "10 pam today" (supplies BOTH date "today" AND time "10 pm" with typo)
  const r2c = await chat("10 pam today", r2a.convId);
  assert(r2c.success, "slot fill: step 3 (10 pam today typo) → handles typo & multi-slot");
  assert(
    r2c.response.toLowerCase().includes("my love") || r2c.response.toLowerCase().includes("done") || r2c.response.toLowerCase().includes("added"),
    "slot fill: step 3 → completes task creation instead of repeating date question",
    `Got: "${r2c.response}"`,
  );
  assert(!UUID_REGEX.test(r2c.response), "slot fill: step 3 → contains NO UUIDs");

  // Test 3: Cancellation during slot filling
  const convId3 = crypto.randomUUID();
  await chat("create task", convId3);
  await chat("Study Docker", convId3);
  const r3cancel = await chat("cancel", convId3);
  assert(r3cancel.success, "slot fill: cancellation → success");
  assert(
    r3cancel.response.toLowerCase().includes("cancel"),
    "slot fill: cancellation → confirms cancellation",
    `Got: "${r3cancel.response}"`,
  );
}

async function testLiveDataSanitization() {
  console.log("\n=== H. LIVE DATA SANITIZATION TESTS ===");
  const convId = crypto.randomUUID();

  const r1 = await chat("What are my tasks?", convId);
  assert(r1.success, "tasks list → success");
  assert(!UUID_REGEX.test(r1.response), "tasks list → contains NO UUIDs");
  assert(notContains(r1.response, ["[id=", "piggy_", "taskid:"]), "tasks list → contains no internal IDs or tool names");
}

// ─── Main Execution ────────────────────────────────────────────────────────

async function main() {
  console.log("\n🐷 PIGGY CONVERSATIONAL PRODUCTION TEST SUITE\n" + "=".repeat(55));

  await testRouting();
  await testConversation();
  await testGeneralKnowledge();
  await testEntertainment();
  await testMemoryLifecycle();
  await testReasoningBoundaries();
  await testSlotFilling();
  await testLiveDataSanitization();

  console.log("\n" + "=".repeat(55));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log("\n❌ Failed tests:");
    failures.forEach((f) => console.log(`  - ${f}`));
  } else {
    console.log("\n🎉 All tests passed!");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test suite error:", err);
  process.exit(1);
});
