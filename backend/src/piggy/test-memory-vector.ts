import "dotenv/config";
import { ensureQdrantCollection } from "./qdrant.js";
import { piggyMemory } from "./memory.js";

await ensureQdrantCollection();

console.log("========== SAVING TEST MEMORIES ==========");

await piggyMemory.save(
  "Sabari prefers studying Python in the morning.",
  "preference",
  8,
);

await piggyMemory.save(
  "Sabari has a goal to become strong in Data Science and Machine Learning.",
  "goal",
  9,
);

await piggyMemory.save(
  "Sabari wants to practice LeetCode every day.",
  "goal",
  8,
);

console.log("========== SEMANTIC SEARCH ==========");

const results = await piggyMemory.retrieveRelevant(
  "What does Sabari like to do in the morning?",
  6,
);

console.log("Relevant memories:");
console.log(results);

console.log("========== TEST COMPLETE ==========");
