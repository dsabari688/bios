import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_URL =
  process.env.QDRANT_URL ?? "http://localhost:6333";

const COLLECTION_NAME =
  process.env.QDRANT_COLLECTION ?? "piggy_memory";

const QDRANT_VECTOR_SIZE = Number(
  process.env.QDRANT_VECTOR_SIZE ?? "768",
);

export const qdrant = new QdrantClient({
  url: QDRANT_URL,
});

export async function ensureQdrantCollection(): Promise<void> {
  const collections = await qdrant.getCollections();

  const exists = collections.collections.some(
    (collection) => collection.name === COLLECTION_NAME,
  );

  if (exists) {
    return;
  }

  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: {
      size: QDRANT_VECTOR_SIZE,
      distance: "Cosine",
    },
  });

  console.log(
    `[PIGGY][QDRANT] created collection ${COLLECTION_NAME} (${QDRANT_VECTOR_SIZE} dimensions)`,
  );
}

export { COLLECTION_NAME };
