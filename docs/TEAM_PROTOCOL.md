# Multi-agent execution and merge protocol

The team consists of **five roles total**: one primary coordinator/orchestrator, **three implementation subagents**, one independent acceptance reviewer. Do not count the reviewer as an implementation subagent.

## Responsibilities and allowed overlap

| Role | Writes | Reads | Must not write |
| --- | --- | --- | --- |
| Coordinator (primary Codex thread) | root configs, `src/shared`, shared shell, integration, plan, docs, tests wiring | all | others' work mid-edit without coordination |
| `public_site` | public routes, public components, public styling | backend exports, specs | DB/migrations, admin UI, package config |
| `content_backend` | SQLite schema/migrations, server services, APIs, auth | shared contracts, specs | public/admin visual components, root configs |
| `maintainer_admin` | admin UI routes/components, theme UI, editorial tooling | API contracts, specs | DB/migrations, public visual components, root configs |
| `acceptance_reviewer` | **none** (read-only findings returned to coordinator) | all code and running site | all project files |

## Wave A — contracts and scaffolding

Coordinator owns app initialization, chooses exact compatible dependency versions, creates shared DTO/Zod imports, route resolver, root layout, TypeScript/ESLint/test scripts and placeholder API service interface. Coordinator announces file boundaries to all agents. Instruct workers not to edit a path owned by another agent.

## Wave B — parallel work

- Backend designs migrations and server-backed typed services, including tests.
- Public worker creates composable sections/templates driven by those services, SSR and metadata, responsive design.
- Admin worker creates safe editor UX and contracts to backend for CRUD/theme/SEO.
- Workers send status as concise deltas rather than dumping logs; flag interface changes before merging.
- Shared repo filesystem means edits are immediately visible; use unique paths and avoid parallel edits to shared files.

## Wave C — coordinator integration

Coordinator reconciles API mismatches, imports shared types, makes commands stable, handles builds/cache issues, seeds test content and runs browser-level checks. Workers fix defects in their owned code. Coordinator alone updates root package versions and lockfile.

## Wave D — independent acceptance

When build, migrations and basic smoke checks pass, coordinator spawns only `acceptance_reviewer`. Reviewer is read-only and should independently test all criteria, classifying P0 critical / P1 blocking / P2 non-blocking / P3 minor. Reviewer returns evidence, not blanket approval. Coordinator writes `reports/acceptance-latest.md`, assigns defects, reruns checks and requests re-review until no P0/P1 remain.

## Handoff format (each worker)

```
Agent:
Scope completed:
Files created/changed:
Shared interfaces introduced or changed:
Commands/tests actually executed and results:
Risks / outstanding work:
Coordinator action required:
```

## Escalation rule

If two agents need one file, stop concurrent editing of that file. Coordinator assigns one owner, or creates a shared abstraction before either resumes. Do not resolve conflicts with force push or rebase on another agent's uncommitted work. Use local commits for milestones if practical and only push upstream with user authorization.
