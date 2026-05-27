# Copilot Instructions

Follow `AGENTS.md` and the project standards in `docs/standards/`.

Key constraints:

- Keep Go code layered: handler -> service -> repository.
- Use context-aware SQL and Redis calls.
- Never hardcode secrets or environment-specific configuration.
- Add migrations for DB schema changes.
- Add tests for non-trivial behavior.
- Run `go test ./...`, `go vet ./...`, and `go build ./...` before marking work complete.
