import "dotenv/config";
import { piggyMemory } from "../memory.js";
import { piggyStore } from "../piggyStore.js";

async function runMemoryLifecycleTests(): Promise<void> {
  console.log("========================================");
  console.log("   PIGGY MEMORY LIFECYCLE EVALUATION    ");
  console.log("========================================\n");

  const createdIds: string[] = [];

  try {
    // 0. Cleanup any previous test data
    const existing = await piggyStore.all<{ id: string }>(
      "SELECT id FROM piggy_memory WHERE LOWER(fact) LIKE '%java%' OR LOWER(fact) LIKE '%python%'",
    );
    for (const r of existing) {
      await piggyMemory.remove(r.id);
    }

    // Step 1: Save initial preference memory
    console.log("[TEST 1] Ingesting initial preference memory: Python in the morning...");
    const mem1 = await piggyMemory.save(
      "Sabari prefers studying Python in the morning.",
      "preference",
      5,
    );
    createdIds.push(mem1.id);
    console.log(`  Saved memory 1 ID: ${mem1.id}, status: ${mem1.status}`);

    // Step 2: Verify active memory retrieval
    let retrieved = await piggyMemory.retrieveRelevant("What do I prefer studying in the morning?");
    console.log(`  Retrieved facts (${retrieved.length}):`, retrieved);
    const initialPass = retrieved.some((f) => f.includes("Python"));
    console.log(`  Initial retrieval check: ${initialPass ? "PASS" : "FAIL"}\n`);

    // Step 3: Ingest conflicting updated preference
    console.log("[TEST 2] Ingesting updated conflicting preference: Java in the morning...");
    const mem2 = await piggyMemory.save(
      "Sabari prefers studying Java in the morning.",
      "preference",
      5,
    );
    createdIds.push(mem2.id);
    console.log(`  Saved memory 2 ID: ${mem2.id}, status: ${mem2.status}`);

    // Step 4: Verify PostgreSQL lifecycle states
    const allMemories = await piggyMemory.list("all");
    const oldMem = allMemories.find((m) => m.id === mem1.id);
    const newMem = allMemories.find((m) => m.id === mem2.id);

    console.log(`  Old memory (${oldMem?.id}) status: ${oldMem?.status}, supersededBy: ${oldMem?.supersededBy}`);
    console.log(`  New memory (${newMem?.id}) status: ${newMem?.status}`);

    const lifecycleStatePass =
      oldMem?.status === "superseded" &&
      oldMem?.supersededBy === mem2.id &&
      newMem?.status === "active";

    console.log(`  Lifecycle status check: ${lifecycleStatePass ? "PASS" : "FAIL"}\n`);

    // Step 5: Verify RAG retrieval excludes superseded memory
    console.log("[TEST 3] Querying RAG retrieval after preference update...");
    retrieved = await piggyMemory.retrieveRelevant("What do I prefer studying in the morning?");
    console.log(`  Retrieved active facts (${retrieved.length}):`, retrieved);

    const hasNew = retrieved.some((f) => f.includes("Java"));
    const hasOld = retrieved.some((f) => f.includes("Python"));

    const retrievalConflictPass = hasNew && !hasOld;
    console.log(`  Conflicting old memory excluded from RAG: ${retrievalConflictPass ? "PASS" : "FAIL"}\n`);

    const overallPass = initialPass && lifecycleStatePass && retrievalConflictPass;

    console.log("========================================");
    console.log(`MEMORY LIFECYCLE OVERALL RESULT: ${overallPass ? "PASS" : "FAIL"}`);
    console.log("========================================\n");

    if (!overallPass) {
      process.exit(1);
    }
  } finally {
    console.log("[CLEANUP] Purging lifecycle test memories...");
    for (const id of createdIds) {
      await piggyMemory.remove(id);
    }
    console.log("[CLEANUP] Done.");
  }
}

runMemoryLifecycleTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Lifecycle evaluation failed:", err);
    process.exit(1);
  });
