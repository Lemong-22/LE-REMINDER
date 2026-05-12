---
name: drizzle-turso-edge
description: "Best practices for Drizzle ORM with Turso (Edge SQLite). Covers schema definitions, edge clients, and migrations."
---

## When to use this skill
- Creating or modifying the relational database schema.
- Writing queries using Drizzle ORM.
- Setting up Turso database clients.

## Core Rules
1. **SQLite Only:** Always use `drizzle-orm/sqlite-core`. DO NOT use `pg-core` or `mysql-core`.
2. **Edge Compatibility:** Use `@libsql/client/web` for Turso to ensure it runs on Vercel Edge functions without native bindings.
3. **Strict Typing:** Always export types for Select and Insert models.

## Example: Schema Definition
```typescript
// src/infra/outbound/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const sops = sqliteTable('sops', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  isApproved: integer('is_approved', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type SOP = typeof sops.$inferSelect;
export type InsertSOP = typeof sops.$inferInsert;
```

## Example: Client Setup
```typescript
// src/infra/outbound/db/client.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import * as schema from './schema';

const client = createClient({ url: process.env.TURSO_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
export const db = drizzle(client, { schema });
```