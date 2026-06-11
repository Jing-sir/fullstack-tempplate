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
for migration in \
  migrations/001_init.sql \
  migrations/002_permission.up.sql \
  migrations/003_operation_log.up.sql \
  migrations/004_menu_type_refactor.up.sql \
  migrations/005_account_hidden_routes.up.sql \
  migrations/006_button_permissions.up.sql \
  migrations/007_superadmin_new_menus.up.sql \
  migrations/008_permission_hardening.up.sql \
  migrations/009_business_permissions.up.sql \
  migrations/010_admin_user_real_name.up.sql \
  migrations/011_permission_version.up.sql \
  migrations/012_permission_seed.up.sql
do
  /opt/homebrew/opt/postgresql@17.9/bin/psql mydb -v ON_ERROR_STOP=1 -f "$migration"
done
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

Only forward migrations are mounted into PostgreSQL's initialization directory.
Rollback files stay under `migrations/` for manual use and are never executed
automatically during bootstrap.

The current migrations seed the baseline `superadmin` role, system management
menu tree, and role-menu bindings. When `SEED_USERNAME` and `SEED_PASSWORD` are
configured, application startup also binds that seed user to the `superadmin`
role.

## Main Endpoints

All public backend endpoints are versioned under a fixed prefix. The current
version prefix is `/api/v1`; future breaking versions should add a new fixed
prefix such as `/api/v2`.

- `POST /api/v1/login`
- `POST /api/v1/users`
- `GET /api/v1/security/iv`
- `POST /api/v1/users/list`
- `GET /api/v1/user/info`
- `POST /api/v1/user/password`
- `POST /api/v1/user/password/check`
- `POST /api/v1/user/password/2fa/check`
- `GET /api/v1/user/2fa/setup`
- `POST /api/v1/user/2fa/replace/setup`
- `POST /api/v1/user/2fa/verify`

Protected endpoints require `Authorization: Bearer <token>`.

Key permission endpoints:

- `POST /api/v1/permissions/list`, body: `{ "parentKey": "accountManage" }`
- `GET /api/v1/roles/info/:id`
- `GET /api/v1/roles/menus/:id`
- `PUT /api/v1/roles/menus/:id`

Dynamic path parameters must appear in the final URL segment.

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
