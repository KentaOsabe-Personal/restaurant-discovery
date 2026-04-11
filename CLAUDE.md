# Agentic SDLC and Spec-Driven Development

Kiro-style Spec-Driven Development on an agentic SDLC

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro-spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro-steering`, `/kiro-steering-custom`
- Discovery: `/kiro-discovery "idea"` — determines action path, writes brief.md + roadmap.md for multi-spec projects
- Phase 1 (Specification):
  - Single spec: `/kiro-spec-quick {feature} [--auto]` or step by step:
    - `/kiro-spec-init "description"`
    - `/kiro-spec-requirements {feature}`
    - `/kiro-validate-gap {feature}` (optional: for existing codebase)
    - `/kiro-spec-design {feature} [-y]`
    - `/kiro-validate-design {feature}` (optional: design review)
    - `/kiro-spec-tasks {feature} [-y]`
  - Multi-spec: `/kiro-spec-batch` — creates all specs from roadmap.md in parallel by dependency wave
- Phase 2 (Implementation): `/kiro-impl {feature} [tasks]`
  - Without task numbers: autonomous mode (subagent per task + independent review + final validation)
  - With task numbers: manual mode (selected tasks in main context, still reviewer-gated before completion)
  - `/kiro-validate-impl {feature}` (standalone re-validation)
- Progress check: `/kiro-spec-status {feature}` (use anytime)

## Skills Structure
Skills are located in `.claude/skills/kiro-*/SKILL.md`
- Each skill is a directory with a `SKILL.md` file
- Skills run inline with access to conversation context
- Skills may delegate parallel research to subagents for efficiency
- Additional files (templates, examples) can be added to skill directories
- `kiro-review` — task-local adversarial review protocol used by reviewer subagents
- `kiro-debug` — root-cause-first debug protocol used by debugger subagents
- `kiro-verify-completion` — fresh-evidence gate before success or completion claims
- **If there is even a 1% chance a skill applies to the current task, invoke it.** Do not skip skills because the task seems simple.

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro-spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.
- **差分比較は必ず `origin/main` と行う**（ローカルの `main` はpull済みとは限らないため）。例: `git diff origin/main...HEAD`, `git log origin/main..HEAD`

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro-steering-custom`)

---

## Architecture Overview

Full-stack web application with a decoupled frontend and backend, orchestrated via Docker Compose.

- **frontend/** — React 19 + TypeScript + Vite (port 5175 on host)
- **backend/** — Ruby on Rails 8.1 (port 3001 on host)
- **db** — MySQL 8.4 (port 3306 on host)

The backend mounts `./backend` into the container at `/rails`. The frontend mounts `./frontend` into `/app` with `node_modules` isolated in an anonymous volume.

## Docker Commands

```bash
# Start all services
docker compose up

# Rebuild after Dockerfile or dependency changes
docker compose up --build backend
docker compose up --build frontend
```

## Backend (Rails)

Commands run inside the container via `docker compose exec backend <cmd>`.

```bash
# Lint
docker compose exec backend bin/rubocop

# Security scan
docker compose exec backend bin/brakeman --no-pager
docker compose exec backend bin/bundler-audit

# Database
docker compose exec backend rails db:create
docker compose exec backend rails db:migrate
docker compose exec backend rails db:seed
docker compose exec backend rails console
```

RuboCop style is based on `rubocop-rails-omakase`. Overrides go in `backend/.rubocop.yml`.

## Frontend (React)

Commands run inside the container via `docker compose exec frontend <cmd>`.

```bash
# Run tests (watch mode)
docker compose exec frontend pnpm test

# Run tests once
docker compose exec frontend pnpm test --run

# Type-check + build
docker compose exec frontend pnpm build
```

Test setup uses Vitest + jsdom + Testing Library. Globals (`describe`/`it`/`expect`) are enabled without imports. Setup file: `frontend/src/test/setup.ts`.

## Database Connection (backend)

The backend reads DB credentials from environment variables set in `docker-compose.yml`:

| Variable | Value |
|---|---|
| `DATABASE_HOST` | `db` |
| `DATABASE_USER` | `app` |
| `DATABASE_PASSWORD` | `password` |