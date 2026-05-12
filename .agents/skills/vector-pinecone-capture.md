---
name: vector-pinecone-capture
description: "Guidelines for Pinecone Serverless vector database operations. Specifically tailored for the 'Chaotic Quick Capture' to structured SOP pipeline."
---

## When to use this skill
- Implementing the "End B" chaotic input system.
- Generating embeddings from unstructured text.
- Querying Pinecone for similar concepts to build SOPs.

## Core Rules
1. **Metadata Structure is King:** Embeddings alone are not enough. Always include robust metadata (timestamp, tags, source, status) so we can filter before performing semantic search.
2. **Serverless Driver:** Use `@pinecone-database/pinecone` and ensure the client is initialized correctly for serverless environments.

## Example: Pinecone Upsert with Metadata
```typescript
// src/infra/outbound/vector/PineconeRepository.ts
import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index('le-reminder-notes');

export async function saveChaoticNote(id: string, text: string, vector: number[]) {
  await index.upsert([{
    id,
    values: vector,
    metadata: {
      textContent: text,
      captureDate: new Date().toISOString(),
      processedIntoSop: false
    }
  }]);
}
```

## Example: Semantic Query with Filter
```typescript
export async function findSimilarNotes(vector: number[]) {
  return await index.query({
    vector,
    topK: 5,
    includeMetadata: true,
    filter: { processedIntoSop: { $eq: false } }
  });
}
```