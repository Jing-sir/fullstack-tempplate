# Permission Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a secure RBAC permission flow where navigation, page children, buttons, tabs, hidden routes, and backend APIs share explicit permission keys and cannot be bypassed by typing a URL directly.

**Architecture:** Keep all permission nodes in `menus`, extend the node enum with tabs, and load only navigation nodes from `/menus`. Load a page's authorized child tree from `POST /permissions/list` with `parentKey` in the request body; enforce the same permission keys again on backend APIs. Keep the role editor on the complete admin tree and normalize ancestor closure when saving.

**Tech Stack:** Go, Gin, PostgreSQL, Vue 3, TypeScript, Pinia, Vue Router

---

### Task 1: Harden backend identity and authorization

**Files:**
- Modify: `backend/internal/model/admin_user.go`
- Modify: `backend/internal/config/jwt.go`
- Modify: `backend/internal/middleware/auth_middleware.go`
- Modify: `backend/internal/handler/handler.go`
- Create: `backend/migrations/008_permission_hardening.up.sql`
- Create: `backend/migrations/008_permission_hardening.down.sql`

**Steps:**
1. Add `token_version` to administrator accounts and JWT claims.
2. Require every protected request to resolve an active database user and match `token_version`.
3. Add reusable `RequireAnyPermission` middleware.
4. Register fixed endpoint permissions and add Handler checks for mixed create/update endpoints.
5. Verify with `go test ./...`.

### Task 2: Add page child permissions and tree integrity

**Files:**
- Modify: `backend/internal/model/menu.go`
- Modify: `backend/internal/service/interfaces.go`
- Modify: `backend/internal/service/permission_service.go`
- Modify: `backend/internal/service/menu_service.go`
- Modify: `backend/internal/service/role_service.go`
- Modify: `backend/internal/handler/menu_handler.go`

**Steps:**
1. Add `type=5` tab nodes.
2. Return only directory and page nodes from `/menus`.
3. Add `POST /permissions/list` with body field `parentKey` for the current user's authorized page subtree.
4. Normalize role grants with ancestor closure on the backend.
5. Reuse menu parent validation for create and update.
6. Verify with `go test ./...`.

### Task 3: Redact audit logs

**Files:**
- Modify: `backend/internal/middleware/operation_log_middleware.go`
- Create: `backend/internal/middleware/operation_log_middleware_test.go`

**Steps:**
1. Parse JSON request and response bodies before persistence.
2. Replace passwords, tokens, secrets, and verification codes with a redaction marker.
3. Omit non-JSON bodies by default.
4. Verify with focused and full Go tests.

### Task 4: Unify frontend permission consumption

**Files:**
- Modify: `frontend/src/api/sys/role.ts`
- Modify: `frontend/src/store/sideBar.ts`
- Modify: `frontend/src/setup/router-setup.ts`
- Modify: `frontend/src/routes/permissionRoutes.ts`
- Modify: `frontend/src/components/TableSearchWrap/components/PermissionButton.vue`
- Modify: `frontend/src/use/useButtonRole.ts`
- Modify: `frontend/src/use/useTabsRole.ts`

**Steps:**
1. Store a recursively flattened permission key set.
2. Fetch and cache page child permission trees before entering protected list or hidden routes.
3. Add explicit route `permissionKey` and `permissionParent`.
4. Remove hidden-route parent fallback.
5. Make buttons and tabs use the shared permission store.
6. Verify with `pnpm run typecheck` and `pnpm run lint`.

### Task 5: Synchronize role configuration, migration, and documentation

**Files:**
- Modify: `frontend/src/views/SystemManage/role-permissions/form/Index.vue`
- Modify: `backend/docs/design/permission.md`
- Modify: `frontend/openspec/specs/menu-type-enum/spec.md`
- Modify: `frontend/openspec/specs/hidden-route-permission/spec.md`
- Modify: `frontend/openspec/specs/permission-tree-linkage/spec.md`

**Steps:**
1. Preserve editable independent hidden-page grants while keeping backend closure normalization.
2. Document the runtime navigation endpoint, page subtree endpoint, role editor tree, backend API enforcement, and security boundaries.
3. Run diff checks, Go tests, and frontend checks.
