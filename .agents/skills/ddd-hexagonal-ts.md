---
name: ddd-hexagonal-ts
description: "Strict Hexagonal Architecture (Ports and Adapters) guidelines for TypeScript, Next.js, and tRPC. Prevents Anemic Domain Models and spaghetti code."
---

## When to use this skill
- Setting up folder structures for new features.
- Writing domain logic, use cases, or database queries.
- Wiring tRPC endpoints to business logic.

## Core Rules
1. **Domain Isolation:** The `src/domain` folder MUST NOT import anything from `src/infra`, `next`, `react`, or database ORMs (like `drizzle-orm`).
2. **Dependency Inversion:** Use Interfaces (Ports) for external systems.
3. **DTOs at Boundaries:** Never leak database schemas to the UI.

## Folder Structure
```text
src/
├── domain/
│   ├── models/       # Pure TS classes/types for Entities & Value Objects
│   └── ports/        # Interfaces (e.g., IUserRepository)
├── application/
│   └── usecases/     # Business logic orchestrators
└── infra/
    ├── inbound/      # tRPC routers, Next.js API routes, cron jobs
    └── outbound/     # Drizzle implementations, Pinecone clients
```

## Example: Inbound Adapter (tRPC)

```typescript
// src/infra/inbound/trpc/routers/notes.ts
import { SaveNoteUseCase } from '@/application/usecases/SaveNoteUseCase';

export const notesRouter = router({
  save: publicProcedure.input(z.object({ text: z.string() })).mutation(async ({ input, ctx }) => {
    const useCase = new SaveNoteUseCase(ctx.noteRepository);
    return await useCase.execute(input);
  }),
});
```