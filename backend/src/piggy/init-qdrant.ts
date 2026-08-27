import { ensureQdrantCollection } from "./qdrant.js";

await ensureQdrantCollection();

console.log("Qdrant initialization complete.");
