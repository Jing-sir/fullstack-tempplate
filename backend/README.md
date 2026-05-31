# Auth Service

Gin + PostgreSQL 17.9 + Redis backend service with JWT auth, user management, and optional TOTP 2FA.

## Run Locally

1. Install and start PostgreSQL 17.9:

```bash
brew tap-new xiangnan/postgresql-versions
brew tap --force homebrew/core
brew extract --version=17.9 postgresql@17 xiangnan/postgresql-versions
brew install xiangnan/postgresql-versions/postgresql@17.9
brew services start xiangnan/postgresql-versions/postgresql@17.9
/opt/homebrew/opt/postgresql@17.9/bin/createdb mydb
/opt/homebrew/opt/postgresql@17.9/bin/psql mydb -f migrations/001_init.sql
```

2. Copy `.env.example` to `.env` and adjust secrets/DSN for your machine.
3. Export the variables from `.env`, then run:

```bash
go run ./cmd/server
```

The server listens on `HTTP_ADDR`, defaulting to `:8800`.

For a containerized local stack:

```bash
docker compose up --build
```

## Main Endpoints

All public backend endpoints are versioned under a fixed prefix. The current
version prefix is `/api/v1`; future breaking versions should add a new fixed
prefix such as `/api/v2`.

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
