# Copilot Instructions

Follow `AGENTS.md` and the project standards in `docs/standards/`.

Key constraints:

- Keep Go code layered: handler -> service -> repository.
- Use context-aware SQL and Redis calls.
- Public HTTP endpoints must use a fixed versioned prefix such as `/api/v1`, and login is fixed at `POST /api/v1/login`.
- Future breaking API upgrades must add the next fixed prefix such as `/api/v2`, not unversioned `/api` routes.
- Never hardcode secrets or environment-specific configuration.
- Add migrations for DB schema changes.
- Add tests for non-trivial behavior.
- Run `go test ./...`, `go vet ./...`, and `go build ./...` before marking work complete.
