# Implementation Roadmap — LE-REMINDER

## Overview

Phased implementation following DDD + Hexagonal Architecture.
Each phase delivers a working slice of the system.

---

## Phase 1 — Architecture & Specification

**Duration**: 1 week

### Objectives
- Establish project scaffolding with Bun, Next.js, TypeScript
- Configure strict TypeScript mode (no `any`)
- Set up Drizzle ORM with Turso
- Define domain layer structure (ports/interfaces only, no implementation)
- Create absolute import paths (`@/domain`, `@/application`, etc.)

### Deliverables
- [ ] Project initialization with `bun create next-app`
- [ ] `tsconfig.json` with strict mode and path aliases
- [ ] Directory structure: `src/domain`, `src/application`, `src/infrastructure`, `src/interface`
- [ ] Drizzle schema for all entities (Turso)
- [ ] Port interfaces for each bounded context
- [ ] GitHub repo initialization with `.gitignore`

### Risks
- Misalignment between architecture vision and initial scaffolding
- **Mitigation**: Review AGENTS.md before each phase

### Dependencies
- None (greenfield)

### Completion Criteria
- Project runs with `bun dev`
- TypeScript compiles with zero errors
- All port interfaces defined but not implemented
- At least one passing unit test (domain layer)

---

## Phase 2 — Core Domain Modeling

**Duration**: 1-2 weeks

### Objectives
- Implement domain entities and value objects
- Create domain services with pure business logic
- Define repository interfaces (ports)
- Write unit tests for domain logic

### Deliverables

#### Capture Context
- [ ] `Capture` entity (id, userId, content, status, createdAt, processedAt)
- [ ] `CaptureStatus` value object (pending, processed)
- [ ] `CaptureService` with validation logic
- [ ] `CaptureRepository` port interface

#### Classification Context
- [ ] `ClassificationResult` value object
- [ ] `Draft` entity (id, captureId, content, classification, status, createdAt, approvedAt)
- [ ] `DraftStatus` value object (pending, approved, rejected)
- [ ] `DraftService` with validation logic
- [ ] `DraftRepository` port interface

#### Knowledge Context
- [ ] `KnowledgeType` value object (sop, habit, checklist, routine)
- [ ] `Knowledge` entity (id, type, title, slug, content, category, tags, markdownPath)
- [ ] `KnowledgeService` with business rules
- [ ] `KnowledgeRepository` port interface
- [ ] `MarkdownStorage` port interface
- [ ] `GitSyncService` port interface

#### Scheduling Context
- [ ] `Schedule` entity (id, knowledgeId, cronExpression, nextRunAt, lastRunAt, status)
- [ ] `Execution` entity (id, scheduleId, executedAt, status, completionNote)
- [ ] `ScheduleService` with cron validation
- [ ] `SchedulerService` port interface

#### Search Context
- [ ] `SearchQuery` value object
- [ ] `SearchResult` value object (knowledgeId, score, snippet)
- [ ] `SearchService` port interface

### Risks
- Domain logic complexity underestimated
- **Mitigation**: Prioritize pure functions; defer side effects to application layer

### Dependencies
- Phase 1 complete

### Completion Criteria
- All domain entities implemented
- All port interfaces defined
- Unit test coverage > 80% for domain services
- No external dependencies in domain layer (framework-agnostic)

---

## Phase 3 — Markdown Engine

**Duration**: 1 week

### Objectives
- Implement Markdown file operations (read/write/delete)
- Create frontmatter parser/generator
- Implement slug generation
- Create file organization by type/date

### Deliverables
- [ ] `MarkdownParser` for frontmatter extraction/generation
- [ ] `FileSystemMarkdownAdapter` implementing `MarkdownStorage`
- [ ] Slug generation utility (collision-resistant)
- [ ] File path builder (`/knowledge/{type}/{date}-{slug}.md`)
- [ ] Markdown generation from `Knowledge` entity

### Risks
- File system operations fail in serverless environment
- **Mitigation**: Abstract file ops behind port; mock in tests

### Dependencies
- Phase 2 complete (Knowledge context ports defined)

### Completion Criteria
- Can create, read, update, delete Markdown files
- Frontmatter correctly parsed and generated
- Tests pass with in-memory file system mock

---

## Phase 4 — Vector + AI Classification

**Duration**: 2-3 weeks

### Objectives
- Integrate OpenAI for classification and draft generation
- Implement Pinecone adapter for vector storage
- Create classification pipeline (capture → classification → draft)
- Implement semantic search

### Deliverables

#### AI Classification
- [ ] `OpenAIAdapter` implementing `LLMService` port
- [ ] Classification prompt engineering
- [ ] Draft generation prompt engineering
- [ ] `ClassificationService` orchestrating the pipeline

#### Vector Integration
- [ ] `PineconeAdapter` implementing `SearchService`
- [ ] Embedding generation on knowledge approve
- [ ] Vector deletion on knowledge delete
- [ ] Similarity search during classification (find related content)

#### Draft Workflow
- [ ] Capture → Classification → Draft flow
- [ ] Draft → Knowledge conversion on approval
- [ ] Draft rejection and archival

### Risks
- LLM produces low-quality classifications
- **Mitigation**: Human approval gate; allow user feedback
- Pinecone rate limits
- **Mitigation**: Batch embeddings; implement retry logic

### Dependencies
- Phase 2 complete (Classification, Search ports defined)
- OpenAI API key configured
- Pinecone index created

### Completion Criteria
- Submitting a capture creates a draft after AI processing
- Draft can be approved → creates Markdown + Knowledge record
- Semantic search returns relevant results

---

## Phase 5 — Scheduling & Reminder Engine

**Duration**: 1-2 weeks

### Objectives
- Integrate Upstash QStash for cron scheduling
- Create reminder trigger mechanism
- Implement in-app notification system
- Build execution tracking

### Deliverables

#### Scheduling
- [ ] `QStashSchedulerAdapter` implementing `SchedulerService`
- [ ] Cron expression parser/validator
- [ ] Schedule creation from Knowledge entity
- [ ] Schedule update/cancel operations

#### Reminders
- [ ] Vercel API route for QStash webhooks
- [ ] `ReminderService` to assemble context and generate notification
- [ ] In-app notification storage (database)
- [ ] UI to view pending notifications

#### Execution Tracking
- [ ] `ExecutionService` to record when reminders fire
- [ ] Completion status updates
- [ ] Next run calculation for recurring schedules

### Risks
- QStash reliability in serverless cold starts
- **Mitigation**: Implement retry logic; idempotent webhook handlers

### Dependencies
- Phase 2 complete (Scheduling ports defined)
- Phase 3 complete (Markdown engine)
- QStash account configured

### Completion Criteria
- Can schedule a habit/SOP with cron expression
- QStash cron triggers reminder endpoint
- User sees in-app notification when reminder fires
- Execution recorded in database

---

## Phase 6 — UI/UX Layer

**Duration**: 2-3 weeks

### Objectives
- Build complete UI with Shadcn/UI components
- Implement all user flows (capture, review, approve, search)
- Create dashboard with pending drafts, upcoming reminders
- Polish UX and accessibility

### Deliverables

#### Capture Interface
- [ ] Minimal text input for captures
- [ ] Submit button with loading state
- [ ] Success/error feedback

#### Dashboard
- [ ] Pending drafts section
- [ ] Upcoming reminders section
- [ ] Recent captures list
- [ ] Quick actions (new SOP, search)

#### Draft Review
- [ ] Draft detail view with AI-generated content
- [ ] Approve button → triggers Markdown + GitHub commit
- [ ] Reject button → archives draft
- [ ] Edit button → opens editor
- [ ] Editor for modifying draft before approval

#### Knowledge Browser
- [ ] List view of SOPs, habits, checklists
- [ ] Filter by type, category, tag
- [ ] Detail view with markdown rendering
- [ ] Edit functionality
- [ ] Delete with confirmation

#### Search
- [ ] Search input with natural language query
- [ ] Results display with relevance scores
- [ ] Click-through to knowledge detail

#### Scheduling UI
- [ ] Schedule creation form (cron expression builder)
- [ ] Schedule list with next/last run times
- [ ] Enable/disable schedule toggle

### Risks
- UI complexity leads to performance issues
- **Mitigation**: Use TanStack Query for efficient data fetching; optimize re-renders

### Dependencies
- Phase 4 complete (backend APIs available)
- Shadcn/UI installed and configured

### Completion Criteria
- All user flows functional end-to-end
- Zero console errors
- Responsive design works on mobile
- Accessible (WCAG 2.1 AA)

---

## Phase 7 — Automation & Intelligence

**Duration**: 2-3 weeks

### Objectives
- Improve AI classification quality with user feedback
- Add pattern detection across captures
- Implement automated linking of related knowledge
- Add smart scheduling suggestions

### Deliverables
- [ ] User feedback on draft quality (thumbs up/down)
- [ ] Feedback loop to improve future classifications
- [ ] Pattern detection: recurring themes in captures
- [ ] Automated cross-linking of related SOPs
- [ ] Smart schedule suggestions based on habit analysis

### Risks
- AI improvements are experimental
- **Mitigation**: Feature flags; don't auto-apply suggestions

### Dependencies
- Phase 6 complete (user feedback mechanism)
- Sufficient historical data for pattern detection

### Completion Criteria
- User can provide feedback on drafts
- System tracks classification quality metrics
- Related knowledge automatically suggested during capture

---

## Phase 8 — Observability & Hardening

**Duration**: 1-2 weeks

### Objectives
- Add logging and monitoring
- Implement error tracking (Sentry)
- Create health check endpoints
- Optimize performance
- Security audit

### Deliverables
- [ ] Structured logging ( Pino or similar)
- [ ] Sentry integration for error tracking
- [ ] Health check endpoint (`/api/health`)
- [ ] API response time monitoring
- [ ] Database query optimization
- [ ] Security review (OWASP Top 10)
- [ ] Rate limiting on API endpoints

### Risks
- Performance issues in serverless environment
- **Mitigation**: Cold start optimization; connection pooling

### Dependencies
- Phase 6 complete (full system in place)

### Completion Criteria
- All errors tracked in Sentry
- Health check returns 200
- API p99 latency < 500ms
- Security audit passed

---

## Phase 9 — Multi-user / Collaboration (Future)

**Status**: Out of scope for Phase 1

### Considerations
- Data isolation per user
- Shared knowledge base (opt-in)
- Permission model (owner, editor, viewer)
- Real-time collaboration on SOPs

---

## Timeline Summary

```
Week 1-2:    Phase 1 — Architecture & Specification
Week 3-4:    Phase 2 — Core Domain Modeling
Week 5:      Phase 3 — Markdown Engine
Week 6-8:    Phase 4 — Vector + AI Classification
Week 9-10:   Phase 5 — Scheduling & Reminder Engine
Week 11-13:  Phase 6 — UI/UX Layer
Week 14-16:  Phase 7 — Automation & Intelligence
Week 17-18:  Phase 8 — Observability & Hardening

Total: ~18 weeks (greenfield to production)
```

---

## Milestone Checkpoints

| Milestone | Phase | Criteria |
|-----------|-------|----------|
| M1: Foundation | 1-2 | Domain layer complete; builds; tests pass |
| M2: Persistence | 3-4 | Markdown works; AI generates drafts |
| M3: Core Loop | 5-6 | Capture → Draft → Approve → Schedule → Notify |
| M4: Production | 7-8 | Observability; hardening; optimization |
