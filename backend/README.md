# Auth Service

Gin + MySQL + Redis backend service with JWT auth, user management, and optional TOTP 2FA.

## Run Locally

1. Create the database and apply `migrations/001_init.sql`.
2. Copy `.env.example` to `.env` and adjust secrets/DSN for your machine.
3. Export the variables from `.env`, then run:

```bash
go run ./cmd
```

The server listens on `HTTP_ADDR`, defaulting to `:8800`.

For a containerized local stack:

```bash
docker compose up --build
```

## Main Endpoints

- `POST /api/v1/login`
- `POST /api/v1/users`
- `GET /api/v1/security/iv`
- `GET /api/v1/users`
- `GET /api/v1/user/2fa/setup`
- `POST /api/v1/user/2fa/verify`

Protected endpoints require `Authorization: Bearer <token>`.

## Configuration

Runtime configuration is read from environment variables in `internal/config`.
`DATABASE_DSN` is required. Production mode also requires explicit `JWT_SECRET`
and `PASSWORD_CRYPTO_KEY`.

## Engineering Standards

- Go code: `docs/standards/go.md`
- Redis usage: `docs/standards/redis.md`
- Database schema and SQL: `docs/standards/database.md`
- AI coding rules: `AGENTS.md`, `.cursor/rules/project.mdc`, `.github/copilot-instructions.md`

## Verification

```bash
go test ./...
go vet ./...
go build ./...
```

The same commands are available as `make test`, `make vet`, and `make build`.
