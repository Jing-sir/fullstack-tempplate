# Database Standard

MySQL is the source of truth for business data. Schema, queries, and migrations must be explicit and reviewable.

## Schema Naming

- Use lowercase snake_case for tables and columns.
- Use plural table names: `users`, `orders`, `login_logs`.
- Primary keys should be `id BIGINT AUTO_INCREMENT` unless there is a strong reason otherwise.
- Public identifiers should use separate stable IDs such as `uid`.
- Standard timestamp columns:
  `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`.

## Migrations

- Every schema change must be represented under `migrations/`.
- Migrations must be deterministic and safe to run in a fresh environment.
- Use numbered filenames: `001_init.sql`, `002_add_user_status.sql`.
- Do not edit already-applied migrations in shared environments; add a new migration instead.
- Add indexes and constraints in the same migration as the columns they support when possible.

## Column Design

- Prefer `NOT NULL` with defaults for required fields.
- Use nullable columns only when null has a clear business meaning.
- Store booleans as `TINYINT(1)`.
- Store enums as small strings or tiny integers only when values are documented.
- Store money as integer minor units or fixed precision decimals, never floating point.
- Keep secrets out of the database when possible; when stored, hash or encrypt as appropriate.

## Indexes and Constraints

- Add unique constraints for natural uniqueness such as username or public UID.
- Add indexes for foreign keys and common query filters.
- Composite indexes should match query predicates from left to right.
- Avoid indexes that are not tied to a known query.
- Use foreign keys when they improve data integrity and do not conflict with operational needs.

## Query Rules

- SQL belongs in `internal/repository`.
- Use parameterized queries only.
- Do not use string concatenation for user-controlled query parts.
- Avoid `SELECT *`; select explicit columns.
- Always check `rows.Err()` after iterating.
- Use `QueryRowContext`, `QueryContext`, and `ExecContext` with request context.
- Return domain models or repository-specific results, not raw SQL rows.

## Transactions

- Use transactions for multi-step writes that must succeed or fail together.
- Keep transactions short.
- Do not perform slow network calls inside a database transaction.
- Always rollback on error and commit only once.
- Prefer `READ COMMITTED` unless stronger isolation is required and justified.

## Pagination and Large Reads

- List endpoints must have pagination before the table can grow large.
- Prefer cursor pagination for high-volume tables.
- Limit maximum page size.
- Avoid offset pagination for deep pages on large datasets.
- Do not load unbounded result sets into memory.

## Error Handling

- Repositories may map `sql.ErrNoRows` to `nil` results when the service expects "not found" as normal flow.
- Services decide whether not-found is an error for the business case.
- Handlers convert service errors into API responses.
- Do not expose raw SQL errors to clients.

## Security and Privacy

- Never return password hashes or secrets from public models.
- Mask or omit sensitive columns in logs.
- Keep DB credentials in environment variables.
- Use least-privilege database users in production.
- Backups must be encrypted and tested for restore.

## Review Checklist

- New schema change has a migration.
- New query uses context and parameters.
- New list query has pagination or a documented limit.
- New unique business rule has a constraint.
- New index maps to a known query.
- New public response omits secrets and internal-only fields.
