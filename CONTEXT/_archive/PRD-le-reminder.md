# Product Requirements Document — LE-REMINDER

## 1. Problem Statement

Modern knowledge workers and individuals struggle to maintain consistent personal operating systems. They face:
- Scattered notes across multiple apps with no unified structure
- Difficulty converting raw thoughts into actionable maintenance routines
- Lack of deterministic, portable knowledge that survives app migrations
- No intelligent system to organize chaotic input into structured SOPs

LE-REMINDER solves this by providing a hybrid knowledge + automation system that:
1. Accepts chaotic, rapid input (thoughts, reminders, notes)
2. Uses AI to classify and structure this input into drafts
3. Stores structured knowledge as portable Markdown files (source of truth)
4. Maintains operational metadata in a relational database
5. Enables semantic retrieval via vector embeddings

---

## 2. Goals

### Primary Goals
- Provide a frictionless capture system for thoughts and reminders
- Automate conversion of chaotic input into structured SOPs/habits via AI classification
- Maintain portable, version-controlled Markdown as the canonical knowledge source
- Enable semantic search across all captured knowledge
- Deliver reminders and scheduled tasks via in-app notifications

### Secondary Goals
- Support extraction of recurring maintenance routines from notes
- Build a personal knowledge graph linking related SOPs and habits
- Enable future multi-modal input (voice, screenshots)

---

## 3. Non-Goals

- **NOT** a general-purpose note-taking app (Evernote, Notion replacement)
- **NOT** implementing push notifications or email in Phase 1
- **NOT** supporting multi-user/collaboration in Phase 1
- **NOT** supporting voice transcripts or screenshot capture in Phase 1
- **NOT** auto-publishing AI drafts — all AI output requires human approval

---

## 4. Target Users

**Primary**: Single individual seeking to build a personal operating system for life maintenance
- Knowledge workers managing SOPs and routines
- Individuals building habits and maintenance checklists
- Users who value portable, Markdown-based knowledge

**Secondary** (future phases): Small teams needing shared knowledge bases

---

## 5. Product Vision

LE-REMINDER is a **personal operating system for life maintenance**. It treats human knowledge and routines as a deterministic, version-controlled system — not unlike how software teams manage code. The user captures raw thoughts, and AI transforms them into structured, actionable knowledge that persists in portable Markdown files.

**Core Metaphor**: LE-REMINDER is a "compiler" for human knowledge — raw input goes in, structured SOPs and habits come out.

---

## 6. Core Product Format

### Knowledge Types
1. **SOP (Standard Operating Procedure)**: Step-by-step instructions for repeatable processes
2. **Habit**: Recurring actions with scheduled triggers
3. **Checklist**: Grouped items for complex tasks
4. **Maintenance Routine**: Scheduled care procedures (daily/weekly/monthly)
5. **Random Note**: Unstructured capture pending classification

### Content Storage
- **Primary**: `.md` files with YAML frontmatter
- **Database**: Metadata, scheduling state, embeddings references, sync state
- **Vector DB**: Semantic embeddings for similarity search

---

## 7. Functional Requirements

### FR-1: Chaotic Input Capture
- Users can submit text notes via a minimal input interface
- Input is stored temporarily as "raw capture" pending classification
- Timestamps and basic metadata are attached automatically

### FR-2: AI Classification Pipeline
- Raw captures are processed by LLM for:
  - Intent detection (reminder, note, SOP-idea, habit-idea)
  - Entity extraction (topics, keywords, potential schedules)
  - Draft generation (structured markdown from unstructured input)
- Classification results are stored as **drafts** — NOT auto-published

### FR-3: Human-in-the-Loop Approval
- All AI-generated drafts remain in "pending" state
- Users can:
  - Approve draft → converts to structured SOP/habit
  - Reject draft → archived or sent back for reprocessing
  - Edit draft → user modifies before approving

### FR-4: Markdown Storage
- Approved content is written to `.md` files
- Frontmatter includes: title, type, tags, created_at, updated_at, schedule (if applicable)
- Files are organized by domain/category folders

### FR-5: GitHub Sync (Semi-automated)
- `.md` files are auto-committed to GitHub ONLY on:
  - User clicks "Approve & Save" on AI draft
  - User manually edits an existing SOP
- Commit messages follow conventional format

### FR-6: Semantic Search
- Content embeddings stored in Pinecone
- Users can search by natural language query
- Results include linked markdown content and metadata

### FR-7: Scheduling & Reminders
- Users can schedule SOPs/habits for recurring execution
- Cron-triggered Vercel endpoints check for due items
- In-app notifications alert users when items are due
- Execution state tracked in database

### FR-8: Dashboard
- Show pending drafts awaiting approval
- Show upcoming scheduled items
- Show recent captures and classifications
- Quick-access to approved SOPs and habits

---

## 8. Non-Functional Requirements

### NFR-1: Performance
- API response time < 500ms for standard operations
- Vector search latency < 200ms
- Cold start for serverless functions < 3s

### NFR-2: Reliability
- Data durability via Git-backed Markdown storage
- Database backups via Turso's built-in replication
- Graceful degradation if Pinecone is unavailable

### NFR-3: Security
- All data is single-user (no multi-tenancy in Phase 1)
- API endpoints protected by authentication (Better Auth)
- No secrets in code — environment variables for all credentials

### NFR-4: Maintainability
- Domain-driven design with clear bounded contexts
- Hexagonal architecture isolating core domain from infrastructure
- Framework-agnostic domain layer

### NFR-5: Portability
- Markdown files are human-readable and transferable
- No vendor lock-in for content storage

---

## 9. User Flows

### Flow 1: Capture a Thought
```
User opens app → Types thought in input box → Submits
→ System stores as raw capture → AI processes in background
→ User sees "Draft created" notification
```

### Flow 2: Review and Approve Draft
```
User opens Dashboard → Sees pending draft card
→ Clicks to view draft → Reviews AI-generated content
→ Chooses: Approve / Reject / Edit
→ If Approve: Markdown created → Git commit → Status updated
→ If Reject: Archive draft → Return to capture pool
```

### Flow 3: Create Manual SOP
```
User opens app → Clicks "New SOP" → Fills form
→ Enters title, steps, category → Saves
→ Markdown created → Git commit triggered
→ Appears in SOP list
```

### Flow 4: Schedule a Habit
```
User opens SOP/Habit → Clicks "Schedule" → Sets recurrence
→ Selects time/date triggers → Saves
→ System creates scheduled job via QStash
→ User receives in-app notification at scheduled time
```

### Flow 5: Semantic Search
```
User types search query → System embeds query
→ Pinecone returns similar content → Results displayed
→ User clicks result → Opens markdown content
```

---

## 10. AI Processing Pipeline

### Pipeline: Chaotic Input → Structured Output

```
┌─────────┐   ┌───────────┐   ┌──────────────┐   ┌────────────┐
│ Capture │──▶│ Enrichment│──▶│ Classification│──▶│ Vector     │
│ (raw)   │   │ (LLM)     │   │ (LLM)        │   │ Search     │
└─────────┘   └───────────┘   └──────────────┘   └────────────┘
                                                     │
                                                     ▼
┌─────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│ Markdown│◀──│ Scheduling │◀──│ Structuring │◀──│ Draft      │
│ Generation│  │ (optional)│   │ (LLM)       │   │ Generation │
└─────────┘   └────────────┘   └────────────┘   └────────────┘
```

### Pipeline Steps

1. **Capture**: Raw text input stored with timestamp
2. **Enrichment**: LLM extracts entities, keywords, sentiment
3. **Classification**: LLM determines content type (SOP, habit, note, reminder)
4. **Vector Search**: Find similar existing content for linking
5. **Draft Generation**: LLM generates structured markdown from raw input
6. **Structuring**: Final formatting with frontmatter
7. **Scheduling**: If applicable, extract schedule metadata

---

## 11. Constraints

### Technical Constraints
- Bun runtime for local development and builds
- Next.js App Router for application framework
- TypeScript strict mode enabled
- No `any` types allowed
- Vercel deployment target

### Architectural Constraints
- DDD + Hexagonal Architecture
- Markdown files are primary source of truth
- Domain layer must be framework-agnostic
- All core domain logic requires unit tests

### Operational Constraints
- Single-user only (no multi-tenancy)
- In-app notifications only (no push/email in Phase 1)
- Text input only (no voice/screenshots in Phase 1)
- Human-in-the-loop for all AI outputs

---

## 12. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LLM hallucinations produce incorrect SOPs | Medium | High | Human approval required for all drafts |
| Vector search quality degrades over time | Low | Medium | Periodic re-indexing and relevance tuning |
| Markdown merge conflicts (Git) | Low | Low | Single-user; conflicts unlikely |
| Pinecone service disruption | Low | Medium | Graceful degradation; search falls back to text search |
| QStash cron reliability | Low | Medium | Retry logic and status tracking |

---

## 13. Success Metrics

### Phase 1 Success Criteria

| Metric | Target |
|--------|--------|
| Draft → Approval conversion rate | > 60% |
| Average time from capture to approved SOP | < 5 minutes |
| Search relevance score (user rating) | > 4/5 |
| Markdown file integrity | 100% (no data loss) |
| Git commit success rate | > 99% |
| API uptime | > 99.5% |

### User Engagement Metrics (Future)
- Captures per day (retention indicator)
- Draft approval rate (AI quality indicator)
- SOP/Habit completion rate (system utility indicator)
- Search usage frequency (discovery indicator)

---

## 14. Appendix: Terminology

| Term | Definition |
|------|-------------|
| **SOP** | Standard Operating Procedure — deterministic step-by-step instructions |
| **Habit** | Recurring action with scheduled triggers |
| **Draft** | AI-generated content pending human approval |
| **Capture** | Raw user input in the chaotic input system |
| **Domain** | Bounded context in DDD (e.g., Capture, Classification, Scheduling) |
| **Port** | Interface defining how domain interacts with external systems |
| **Adapter** | Implementation of a port for a specific external system |
