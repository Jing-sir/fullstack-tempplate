# Permission Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复系统对象保护、祖先禁用、权限树并发成环、TOTP 重放以及角色/账号跨步骤写入五类安全与一致性缺陷。

**Architecture:** PostgreSQL 继续作为角色、账号和权限树的事实来源，关键写操作在 Repository 事务内完成并加事务级 advisory lock。Redis 保存一次性 2FA challenge、用户失败窗口和已使用 TOTP 时间片，通用 `GoogleCode.vue` 在弹窗打开时自动申请 challenge。

**Tech Stack:** Go、Gin、PostgreSQL 17.9、Redis、Vue 3、TypeScript、Playwright。

---

### Task 1: 系统角色、系统权限节点和最后超级管理员保护

**Files:**
- Modify: `internal/service/role_service.go`
- Modify: `internal/service/menu_service.go`
- Modify: `internal/service/user_service.go`
- Modify: `internal/repository/admin_user_repository.go`
- Modify: `internal/service/interfaces.go`
- Test: `internal/service/permission_service_test.go`
- Test: `internal/service/user_service_test.go`

**Steps:**
1. 先增加失败测试：`superadmin` 不可重命名、禁用、删除或覆盖权限。
2. 增加失败测试：系统权限节点不可删除、禁用、改变父级或类型。
3. 增加失败测试：非超级管理员不可给账号绑定 `superadmin`。
4. 增加失败测试：最后一个启用的超级管理员不可被禁用或移除角色。
5. 在 Service 中定义系统角色与系统权限 key，并返回明确业务错误。
6. 在账号事务中锁定超级管理员成员关系并校验最后一个启用账号。
7. 运行目标测试，确认全部通过。

### Task 2: 父节点禁用后子权限立即失效

**Files:**
- Modify: `internal/repository/menu_repository.go`
- Test: real API probe

**Steps:**
1. 将 `GetByRoleIDs` 改为从启用根节点递归向下构建 `enabled_menus`。
2. 仅返回自身及全部祖先均启用、且能从根节点到达的授权节点。
3. 真实接口创建目录、页面、按钮和受限角色。
4. 验证父节点启用时按钮 API 放行，禁用父节点后同一 token 的权限版本变化且按钮权限拒绝。

### Task 3: 权限树并发移动防环

**Files:**
- Modify: `internal/repository/errors.go`
- Modify: `internal/repository/menu_repository.go`
- Modify: `internal/service/menu_service.go`
- Test: `internal/service/permission_service_test.go`
- Test: real PostgreSQL concurrency probe

**Steps:**
1. 在菜单父级变更事务中获取固定的 `pg_advisory_xact_lock`。
2. 获取锁后使用递归 CTE 重新判断目标父节点是否为自身或后代。
3. `UpdateWithVersionBump` 与 `MoveWithVersionBump` 共用同一事务内校验。
4. 将 Repository 成环错误映射为现有父节点非法业务错误。
5. 并发执行 `A -> B` 与 `B -> A`，断言最多一个成功且最终树无环。

### Task 4: 2FA challenge、失败限流与 TOTP 防重放

**Files:**
- Create: `internal/repository/two_fa_repository.go`
- Modify: `internal/service/user_service.go`
- Modify: `internal/app/app.go`
- Modify: `internal/handler/security_handler.go`
- Modify: `internal/handler/menu_handler.go`
- Modify: `internal/handler/admin_user_handler.go`
- Modify: `internal/handler/handler.go`
- Modify: `internal/consts/code.go`
- Modify: `src/components/GoogleCode.vue`
- Modify: `src/api/sys/auth.ts`
- Modify: all privileged 2FA callers
- Test: `internal/service/user_service_test.go`
- Test: `frontend/tests/e2e`

**Steps:**
1. 新增鉴权接口 `POST /api/v1/security/2fa/challenges`，请求体包含 `action` 和 `target`。
2. challenge 绑定当前管理员、动作和目标，Redis TTL 为 2 分钟。
3. 2FA 校验前检查用户失败窗口；10 分钟内最多失败 5 次。
4. 精确计算匹配的 30 秒 TOTP 时间片。
5. 使用 Redis Lua 原子校验并消费 challenge，同时以用户和时间片写入防重放标记。
6. privileged API 必须同时提交 `facode` 与 `fa_challenge_id`，Handler 使用服务端动作和目标校验。
7. 通用 `GoogleCode.vue` 根据 props 自动申请 challenge，并向父组件同时返回验证码与 challenge ID。
8. 验证 challenge 不能跨动作、跨目标、重复使用；同一时间片不能执行第二次高风险操作；连续失败触发 `429`。

### Task 5: 角色与账号复合写入事务化

**Files:**
- Modify: `internal/repository/role_repository.go`
- Modify: `internal/repository/admin_user_repository.go`
- Modify: `internal/service/role_service.go`
- Modify: `internal/service/user_service.go`
- Modify: `internal/service/interfaces.go`
- Modify: `internal/handler/role_handler.go`
- Modify: `internal/handler/admin_user_handler.go`
- Test: service tests and real API rollback probes

**Steps:**
1. 新增角色与权限一次事务写入方法。
2. 编辑角色基本信息与权限覆盖使用同一事务。
3. 新增账号与角色绑定使用同一事务。
4. 编辑账号基本信息、状态与角色替换使用同一事务。
5. 通过临时数据库触发器制造关联写入失败，确认主记录同步回滚。

### Task 6: 文档与完整验证

**Files:**
- Modify: `docs/design/permission.md`
- Modify: `docs/standards/redis.md`
- Modify: real API probe under `/private/tmp`

**Steps:**
1. 更新系统角色、系统权限节点和最后超级管理员规则。
2. 明确父节点禁用采用“权限计算要求完整祖先链启用”语义。
3. 记录 advisory lock 与事务内防环策略。
4. 记录 challenge、限流、防重放 Redis key、TTL 和错误语义。
5. 记录角色/账号复合写入的事务边界。
6. 运行 `gofmt`、`go test ./...`、`go vet ./...`、`go build ./...`。
7. 运行前端 `typecheck`、`lint`、`build`、完整 Playwright E2E。
8. 运行真实 PostgreSQL/Redis/API 探针及 `git diff --check`。
