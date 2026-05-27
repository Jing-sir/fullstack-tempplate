# Go Coding Standard

This project is a Gin-based Go backend. Code must stay small, explicit, and easy to test.

## Architecture Rules

- Keep HTTP concerns in `internal/handler`.
- Keep business decisions in `internal/service`.
- Keep SQL and Redis access in `internal/repository`.
- Keep runtime setup in `internal/app`.
- Keep environment parsing and clients in `internal/config`.
- Do not let handlers call `database/sql`, Redis clients, JWT signing, or bcrypt directly.
- Do not introduce package-level mutable dependencies such as global DB or Redis clients.
- Prefer constructor injection: `NewUserService(repo, ...)`, `NewUserRepository(db)`.

## Package Design

- Use `internal` packages for application code.
- Do not add broad utility packages until there are at least two real call sites.
- Keep exported names minimal. Export only when another package needs the symbol.
- Do not create cyclic dependencies. Dependency direction should generally be:
  `app -> handler -> service -> repository -> config/model/consts`.

## Context and Timeouts

- Every request-scoped operation must use `c.Request.Context()` or a derived context.
- Repository methods must accept `context.Context`.
- Do not use `context.Background()` inside handlers or repositories for request work.
- External calls, Redis operations, and SQL operations must be cancellable through context.

## Errors and Responses

- Services should return typed sentinel errors or wrapped errors.
- Handlers map service errors to response codes and messages.
- Repositories return raw lower-level errors; they do not write HTTP responses.
- Do not leak database errors, secrets, SQL, stack traces, or internal implementation details to clients.
- Use the shared response helper in `internal/response`.

## Configuration

- All secrets and environment-specific values must come from `internal/config`.
- Never hardcode credentials, JWT secrets, database DSNs, Redis passwords, hostnames, or cryptographic keys in code.
- Production mode must fail fast when required secrets are missing.
- Add new config keys to `.env.example` and document them in `README.md`.

## Naming and Style

- Use `gofmt` for all Go files.
- Use short, meaningful names in local scope and descriptive names for exported symbols.
- Keep files focused around one domain or layer.
- Avoid comments that repeat the code. Add comments only for non-obvious behavior, security choices, or compatibility decisions.
- Prefer table-driven tests for multiple input cases.

## Security

- Store passwords only as bcrypt hashes.
- Never return password hashes, TOTP secrets, tokens, or raw internal errors in public responses.
- JWT generation and parsing must use the same configured manager.
- Do not invent custom crypto protocols for new features. If compatibility code exists, isolate it and document the migration path.
- Validate all inbound JSON with binding tags or explicit checks before use.

## Database and Redis Access

- SQL belongs in repositories.
- Redis key creation belongs in repository/service helpers, not handlers.
- Use parameterized SQL only.
- Avoid `SELECT *`; select explicit columns.
- Check `rows.Err()` after iteration.
- Use pagination for list endpoints that can grow.

## Tests and Verification

- Add tests for config parsing, crypto helpers, token behavior, service decisions, and regressions.
- Prefer tests that do not require real MySQL or Redis unless they are integration tests.
- Before declaring work complete, run:

```bash
go test ./...
go vet ./...
go build ./...
```

## Change Checklist

- New API behavior updates `README.md`.
- New environment variable updates `.env.example`.
- New table or column adds a migration under `migrations/`.
- New Redis key follows `docs/standards/redis.md`.
- New SQL follows `docs/standards/database.md`.
- New Go code follows this file and has tests when behavior is non-trivial.
