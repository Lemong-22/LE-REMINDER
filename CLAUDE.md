# CLAUDE.md — LE-REMINDER Constitution

This file is the **strict constitutional contract** for the LE-REMINDER repository. All AI agents operating in this codebase MUST read and follow this document.

---

## Tech Stack

The following technologies are used in this project. When relevant, load the corresponding skill before acting:

| Technology | Skill Token | Install Command |
|------------|-------------|-----------------|
| Bun | `${bun}` | `npx skills add bun` |
| TypeScript | `${typescript}` | Built-in |
| Next.js | `${vercel-react-best-practices}` | `npx skills add vercel-labs/agent-skills/vercel-react-best-practices` |
| React | `${vercel-react-best-practices}` | `npx skills add vercel-labs/agent-skills/vercel-react-best-practices` |
| TanStack Query | `${vercel-react-best-practices}` | `npx skills add vercel-labs/agent-skills/vercel-react-best-practices` |
| Shadcn/UI | `${shadcn}` | `npx skills add shadcn/ui/shadcn` |
| tRPC | `${trpc}` | Use Next.js best practices |
| Drizzle ORM | `${drizzle}` | Use SQL best practices |
| Turso | — | Edge SQLite documentation |

> Phase 0 is single-user with no auth and no notification-delivery engine (see Phase 0 Constraints below). Better Auth, Pinecone, and Upstash QStash are not part of this repo's dependency set — re-add explicitly if a future phase requires auth, semantic search, or in-repo scheduled delivery.

### Skill Loading Instructions

When a task matches a skill below, load that skill's `SKILL.md` before acting and follow only the relevant referenced material:

```
"AGENTS.md reference" : ${skill-token}
```

| Skill | Trigger |
|-------|---------|
| `${better-auth-best-practices}` | Better Auth setup, auth config, sessions, adapters, plugins, env handling |
| `${bun}` | Bun runtime, scripts, dependency management, tests, builds |
| `${clean-code}` | Code design, implementation, review, refactoring quality |
| `${design-md}` | Analyzing Stitch projects and synthesizing semantic design systems into DESIGN.md files |
| `${gh-cli}` | GitHub CLI workflows |
| `${impeccable}` | Frontend design, UX, UI polish, accessibility, visual refinement |
| `${shadcn}` | shadcn/ui components, registry use, composition, forms, styling, icons |
| `${ddd-hexagonal-ts}` | Hexagonal Architecture setup, domain isolation, ports/adapters wiring |
| `${drizzle-turso-edge}` | Drizzle ORM schema, Turso edge client, SQLite migrations |
| `${vector-pinecone-capture}` | Pinecone vector ops, metadata structure, semantic search |
| `${sync-local-skills}` | Discovering repo-local skills and updating AGENTS.md with Local Skills trigger rules |
| `${vercel-react-best-practices}` | React and Next.js performance-sensitive work |

**Local Skills Directory**: `.agents/skills/<name>` — Use as canonical skill tokens.

---

## Design Pattern

You are to develop **STRICTLY** with:
- **Domain-Driven Design (DDD)**
- **Hexagonal Architecture** (Ports & Adapters)

This is a **greenfield project**; there is **no legacy MVC code**. Do NOT use MVC.

### Directory Structure

```
src/
├── domain/           # Pure domain logic, entities, value objects, ports
├── application/      # Use cases, command handlers, query handlers
├── infrastructure/   # Adapters: Turso, Pinecone, QStash, GitHub, OpenAI
├── interface/        # UI components, pages, tRPC routers
└── lib/              # Shared utilities, type definitions
```

### Import Aliases

Use **absolute imports** only:

```typescript
import { Capture } from '@/domain/capture';
import { CreateKnowledgeUseCase } from '@/application/knowledge';
import { TursoKnowledgeAdapter } from '@/infrastructure/adapters/turso';
```

Configured in `tsconfig.json`:
- `@/domain` → `src/domain`
- `@/application` → `src/application`
- `@/infrastructure` → `src/infrastructure`
- `@/interface` → `src/interface`
- `@/lib` → `src/lib`

---

## Architecture Rules

Enforce **strictly**:

1. **Domain-Driven Design (DDD)**
   - Bounded contexts: Capture, Classification, Knowledge, Scheduling, Search
   - Entities have identity; value objects are immutable
   - Aggregates define consistency boundaries

2. **Hexagonal Architecture**
   - Core domain is isolated from infrastructure
   - Ports define interfaces (in domain layer)
   - Adapters implement ports (in infrastructure layer)
   - No direct dependencies from domain to external systems

3. **Clean Separation of Concerns**
   - UI layer knows nothing about database queries
   - Domain layer has no framework imports
   - Infrastructure adapters are injected, not hardcoded

4. **Framework-Independent Domain Layer**
   - Domain entities are plain TypeScript classes/objects
   - No React, Next.js, tRPC imports in domain
   - Pure functions preferred; avoid hidden side effects

5. **Adapter-Based Infrastructure Integration**
   - Replaceable adapters for each external system
   - Database can swap Turso for another SQLite edge provider
   - Vector DB can swap Pinecone for another vector DB

---

## Data Rules

1. **`.md` files are the primary source of truth**
   - Knowledge content lives in Markdown files
   - Database stores metadata only
   - Human-readable and portable

2. **Relational DB stores operational metadata only**
   - Captures, drafts, schedules, embeddings references
   - Sync state and execution state
   - NOT content (that goes in Markdown)

3. **Vector DB stores embeddings and semantic indexes only**
   - Semantic retrieval via similarity search
   - Namespace isolation: knowledge, drafts, captures
   - Re-embed on content update

4. **Avoid business-critical logic inside database procedures**
   - All business logic in domain layer
   - Database is for persistence, not computation
   - Triggers and stored procedures avoided

---

## Development Rules

### TypeScript
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**No `any` types allowed.** Use `unknown` if type is truly unknown, then narrow appropriately.

### Testing
- All core domain logic requires **unit tests**
- Use a modern test runner (Vitest recommended)
- Focus tests on domain services and pure functions
- Run relevant test files only — do NOT run full suite unless necessary

### Code Style
- No comments unless explaining **why**, not **what**
- Prefer pure functions in domain services
- Avoid hidden side effects
- Single responsibility principle

### Naming Conventions
- **Entities**: PascalCase noun (`Capture`, `Draft`, `Knowledge`)
- **Value Objects**: PascalCase descriptive (`DraftStatus`, `KnowledgeType`)
- **Ports/Interfaces**: `I{noun}Service` or `{noun}Port`
- **Adapters**: `{provider}{context}Adapter` (`TursoCaptureAdapter`, `PineconeSearchAdapter`)
- **Use Cases**: `{verb}{noun}UseCase` (`CreateKnowledgeUseCase`, `ApproveDraftUseCase`)

---

## AI Safety & Operational Constraints

The AI agent is **STRICTLY FORBIDDEN** from:

| Forbidden Action | Reason |
|-----------------|--------|
| Dropping databases | Data destruction |
| Destructive migrations | Data destruction |
| Deleting production data | Irreversible action |
| Force pushing (`git push --force`) | Rewrites remote history |
| Rewriting Git history | Breaks collaboration |
| Modifying secrets/configs without approval | Security risk |

**Without explicit human confirmation**, none of the above actions are permitted.

### Safe Operations
- Creating new files
- Updating existing files with human-approved changes
- Running read-only queries
- Creating migrations (non-destructive)
- Normal git commits and pushes

---

## Running Tests

> When running tests for investigation or validation, do not run the entire full suite. You should focus on the relevant test-files only and run them selectively.

```bash
# Run specific domain tests
bun test src/domain/**/ *.test.ts

# Run infrastructure adapter tests
bun test src/infrastructure/**/*.test.ts

# Run with coverage
bun test --coverage
```

---

## Human-in-the-Loop Requirements

All AI-generated content **MUST** go through human approval:

1. **Capture submitted** → Stored as `pending` capture
2. **AI processes** → Creates `draft` with `pending` status
3. **User reviews** → Approves, rejects, or edits
4. **User approves** → Markdown created, Git commit triggered
5. **Only then** → Becomes structured knowledge

**No auto-publishing of AI content.**

---

## Sync Rules

### Markdown ↔ Turso ↔ Pinecone

| User Action | Markdown | Turso | Pinecone |
|-------------|----------|-------|----------|
| Submit capture | — | capture created | — |
| AI processes | — | draft created | — |
| Approve draft | .md created | knowledge created | vector added |
| Manual edit | .md updated | knowledge updated | vector updated |
| Delete knowledge | .md deleted | knowledge deleted | vector deleted |

### Git Sync (Semi-automated)

Git commits happen **ONLY** on:
1. User clicks "Approve & Save" on AI draft
2. User manually edits an SOP

**Not** on every minor change.

---

## Phase 0 Constraints

For Phase 0 implementation:

- **Single-user only** (no auth, no multi-tenancy)
- **No AI/LLM in the domain** — state computation is a deterministic pure function, never inferred
- **No notification/reminder delivery in this repo** — LE-REMINDER only computes and exposes state (`Due`/`Overdue`/`Done`); an external system, HERMES-AGENT, owns all alerting
- **No history/streak UI** — `CompletionEvent`s are recorded from day one, but Phase 0 only displays derived current state

---

## File Locations

| Document | Path |
|----------|------|
| PRD | `/CONTEXT/PRD.md` |
| SPEC | `/CONTEXT/SPEC.md` (Step 2) |
| Roadmap | `/CONTEXT/ROADMAP.md` (Step 3) |
| Archived (abandoned scope) | `/CONTEXT/_archive/` |
| Constitution | `/CLAUDE.md` |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-12 | Lead Developer | Initial constitution |
| 1.1 | 2026-05-12 | Lead Developer | Add local skills: ddd-hexagonal-ts, drizzle-turso-edge, vector-pinecone-capture |
