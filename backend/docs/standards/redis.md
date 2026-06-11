# Redis Standard

Redis is used for short-lived operational state such as login IV challenges, cache entries, rate limits, and distributed coordination. Treat Redis as a volatile dependency, not the source of truth.

## Key Naming

- Use lowercase, colon-separated keys.
- Prefix keys with app and environment when the value may be shared across deployments:
  `auth-service:{env}:{domain}:{identifier}`.
- Keep domain-specific keys close to the service/repository that owns them.
- Do not construct Redis keys in handlers.
- Avoid unbounded key names that include raw user input without validation or normalization.

Examples:

```text
auth-service:dev:security:iv:{uuid}
auth-service:prod:user:profile:{uid}
auth-service:prod:rate-limit:login:{ip}
auth-service:prod:security:2fa:challenge:{uuid}
auth-service:prod:security:2fa:failures:{admin_user_id}
auth-service:prod:security:2fa:used:{admin_user_id}:{totp_counter}
```

## TTL Rules

- Every cache, challenge, token marker, rate-limit bucket, lock, and temporary value must have an explicit TTL.
- Never store permanent business data only in Redis.
- Keep TTLs near the business code and name them as constants when reused.
- One-time secrets or challenges must be deleted after successful use.
- Avoid refreshing TTLs silently unless the behavior is part of the product contract.

## Data Modeling

- Use strings for small scalar values and short-lived tokens.
- Use hashes for small objects that are updated field-by-field.
- Use sorted sets for rankings, scheduled tasks, or time-window queries.
- Use sets for membership checks.
- Prefer JSON only when the object is naturally read/written as one whole value.
- Store timestamps in Unix seconds or RFC3339 consistently within the same key family.

## Access Patterns

- Use repository methods for Redis access.
- Pass `context.Context` to every Redis call.
- Avoid `KEYS` in application code. Use `SCAN` only for admin/maintenance paths.
- Use pipelining for batches of independent commands.
- Use Lua scripts only when atomic multi-key behavior is necessary and tests cover it.
- Do not run blocking commands in HTTP request paths unless there is a strict timeout.

## Cache Policy

- Define the source of truth before adding any cache.
- Document cache key, TTL, invalidation trigger, and acceptable staleness.
- Prefer cache-aside:
  read cache, fallback to DB, write cache with TTL.
- Invalidate or update cache after writes to the source of truth.
- Avoid caching sensitive data unless encrypted or strictly necessary.

## Rate Limiting and Locks

- Rate-limit keys must include the subject and time window.
- Use `INCR` with expiry for simple counters.
- Distributed locks must use `SET key value NX PX ttl` and release only if the value matches.
- Lock TTL must be short and tied to the operation's worst-case runtime.
- Avoid long-running business workflows behind Redis locks.

## Reliability

- Redis failures should not corrupt source-of-truth data.
- Decide per use case whether Redis failure is fail-open or fail-closed.
- Security challenges, rate limits, and sessions normally fail closed.
- Optional caches normally fail open and fall back to the database.
- Log operational failures with enough key-family context, but never log secrets.

## Security

- Never store plaintext passwords, TOTP secrets, JWT signing keys, or long-lived credentials in Redis.
- Store short-lived security challenges with a TTL and delete after use.
- Do not expose Redis keys or internal values in API responses except intentional public challenges such as `iv_id`.
- Use Redis AUTH/TLS in production when available.

## Project Rules

- Login IV keys must be one-time-use where clients send `iv_id`.
- 2FA challenge 绑定管理员 ID、服务端动作和目标哈希，TTL 固定为 2 分钟，成功后删除。
- 2FA 失败计数按管理员维度保存 10 分钟，第 5 次失败起拒绝高风险操作。
- 已使用 TOTP 时间片按管理员维度保存 90 秒；challenge 消费、防重放写入和失败计数清理必须由 Lua 原子完成。
- 2FA 安全状态依赖 Redis 且必须 fail closed，Redis 异常时不得继续高风险写操作。
- New Redis key families must be documented in this file or adjacent package comments.
- New Redis usage must have tests around key construction and expiry behavior when practical.
