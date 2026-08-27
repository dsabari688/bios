import { createEmbedding, embeddingConfig } from "./memory/embedding.service.js";

const vector = await createEmbedding(
  "Sabari completed his morning study session and felt productive."
);

console.log("Embedding model:", embeddingConfig.model);
console.log("Embedding dimensions:", vector.length);
console.log("First 5 values:", vector.slice(0, 5));
