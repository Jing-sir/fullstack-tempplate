# AI Coding Rules

These rules apply to AI assistants and human contributors working in this repository.

## Read First

- Read `README.md` before changing behavior.
- Follow `docs/standards/go.md` for Go code.
- Follow `docs/standards/redis.md` for Redis usage.
- Follow `docs/standards/database.md` for MySQL schema and queries.

## Project Architecture

- HTTP handlers live in `internal/handler`.
- Business logic lives in `internal/service`.
- SQL and Redis access live in `internal/repository`.
- App wiring lives in `internal/app`.
- Runtime config lives in `internal/config`.
- Do not reintroduce global DB, Redis, JWT, or service dependencies.

## Required Behavior

- Use `context.Context` in service and repository calls.
- Use parameterized SQL only.
- Keep Redis keys and TTLs explicit.
- Hash passwords with bcrypt before storage.
- Never return password hashes, TOTP secrets, JWT secrets, or raw internal errors.
- Add or update migrations for database schema changes.
- Add or update `.env.example` when config changes.
- Add or update `README.md` when API behavior or startup behavior changes.

## AI Guardrails

- Preserve user edits and do not revert unrelated files.
- Prefer small, direct changes over speculative abstractions.
- Match existing code style and package boundaries.
- Do not add dependencies unless they remove real complexity and are justified.
- Do not hardcode secrets, credentials, hosts, ports, or environment-specific values in code.
- Do not put business logic in handlers.
- Do not put HTTP response code in services or repositories.
- Do not use Redis as the only source of truth for business data.
- Do not create migrations that depend on local machine state.

## Verification

Before claiming completion, run:

```bash
go test ./...
go vet ./...
go build ./...
```

Also run `git diff --check` for whitespace issues when files were edited.

## When Unsure

- Prefer the simpler implementation that fits the current architecture.
- Add a short comment only when the decision is non-obvious.
- Ask for clarification if a change would alter API compatibility, data retention, authentication, or production configuration.
