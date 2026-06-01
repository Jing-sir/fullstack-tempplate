## Context

当前 `menus` 表的 `type` 字段只有两个值：`1=菜单`、`2=按钮`。实际上"系统管理"这类目录节点和"操作日志"这类叶子菜单页都被标记为 type=1，导致：

1. 前端 `sideBar.ts` 无法区分"可点击的路由叶子节点"和"仅做分组的目录节点"
2. `viewRolePermissions` / `editRolePermissions` / `addRolePermissions` 等隐藏路由页没有对应菜单记录，前端路由守卫在 `permissionMap` 里找不到它们的 `route.name`，直接跳转"无权限"页面
3. type=2 按钮的 `name` 格式为 `routeName-action`，混入路由过滤逻辑后会产生意外匹配
4. 侧边栏 CSS 只写了两级缩进样式，三级菜单视觉错乱

权限配置页（`role-permissions/form/Index.vue`）在新增/编辑角色权限时，树组件不感知 type，无法自动联动 type=3 隐藏路由页。

## Goals / Non-Goals

**Goals:**
- `menus.type` 扩展为 4 个值，语义清晰、互不重叠
- 隐藏路由页（type=3）注册到菜单表，路由守卫通过 permissionMap 正常放行
- sideBar.ts 修复 type=4 按钮 key 混入路由过滤的 bug
- 权限配置树中 type=2 勾选时自动联动 type=3，type=3 不可单独操作
- 侧边栏支持三级及以上菜单的 CSS 样式
- 路由守卫加 isShow 安全网，防止未来漏入库时白屏

**Non-Goals:**
- `/api/v1/me` permissions 扁平数组方案（设计文档已有，本次不落地）
- `v-permission` 指令（type=4 按钮权限的页面消费，下一阶段）
- 菜单管理 UI 页面（后台配置菜单的前端页面，不在本次范围）
- `meta.role` 字段废弃清理

## Decisions

### 决策 1：type 值重新编号，原 type=2 按钮升级为 type=4

**选择**：`1=目录 2=菜单页 3=隐藏路由页 4=按钮`，原 type=2 → type=4。

**理由**：type=1/2 的语义是"从无路由到有路由"的渐进式，type=3 自然插入"有路由但不进侧边栏"，type=4 是完全无路由的按钮。编号有内在逻辑，比打乱重排更易记忆。原 type=2 按钮只有数据库存量数据，代码常量改名后，迁移 SQL 一次性修正数据即可。

**备选方案**：保留 type=1/2，新增 visible 字段区分目录/菜单页。
**否决原因**：多一个字段增加维护成本，且 visible 字段和 type 字段联合约束难以校验（type=2 + visible=false = type=3 的语义冗余）。

---

### 决策 2：type=3 隐藏路由页的路由守卫不改核心逻辑，通过数据入库解决

**选择**：只要 type=3 数据正确入库，`permissionMap` 自然包含其 `name`，路由守卫的 `permissionMap[routeName]` 校验可以直接放行，无需在守卫里写特殊分支。

**理由**：守卫逻辑保持单一职责（只做 key 查找），复杂度不随业务类型增长。

**安全网**：额外加一个 fallback：`meta.isShow:true` 且不在 permissionMap 时，向上遍历 `to.matched` 找父级 name 做校验。这是防御性措施，应对"开发者新加了隐藏路由但忘记入库"的情况。

---

### 决策 3：type=3 节点在权限配置树中跟随父级 type=2 联动，不可单独操作

**选择**：勾选 type=2 时，自动递归勾选其下所有 type=3 后代；取消 type=2 时，自动取消所有 type=3 后代。type=3 节点渲染为 `disableCheckbox: true`。

**理由**：
- 从管理员视角，"查看权限页"属于"有角色权限页"的附属操作，不应独立授权
- 独立授权 type=3 但不授权 type=2 父节点，会导致用户能访问详情页却看不到对应菜单入口，体验割裂

**备选方案**：type=3 完全不在树里展示。
**否决原因**：管理员无法感知哪些隐藏路由被自动授权，透明度差。展示但禁用交互，既告知又防误操作。

---

### 决策 4：sideBar.ts collectComponents 过滤 type=4

**选择**：在 `collectComponents` 遍历时，跳过 `item.type === 4` 的节点，不将 `routeName-action` 格式的 key 放入 `fetchRoleObj`。

**理由**：`getAsyRouter` 用 `fetchRoleObj[routeName]` 过滤路由，如果 `rolePermissions-edit` 这类 key 混入，会误匹配到不存在的路由或引起歧义。type=4 按钮权限的消费由未来的 `v-permission` 指令负责，不应通过路由过滤。

**前提**：`sysRoleMenuList` normalize 函数需要透传 `type` 字段给前端，否则 type 为 undefined 无法过滤。

## Risks / Trade-offs

**[Risk] menus 表存量数据的 type 重新分类可能遗漏** → 迁移 SQL 需要按 `parent_id=0 AND type=1` → type=1（目录），`parent_id != 0 AND type=1` → type=2（菜单页）的规则批量更新；上线前在 staging 验证侧边栏菜单结构不变形。

**[Risk] type=3 数据未入库时路由守卫 fallback 会掩盖问题** → fallback 逻辑加 console.warn 提示，开发期可快速发现。生产环境 fallback 是降级保护，不影响用户体验。

**[Risk] 权限配置树的 type=3 联动逻辑在后端数据结构变化后需同步调整** → 联动逻辑依赖 `type` 字段，只要后端正确返回 `type`，逻辑自洽；需在 `sysRoleMenuList` 的 normalize 里保证 `type` 不丢失。

**[Trade-off] type 编号 breaking change vs 平滑迁移** → 选择 breaking change（type=2→4）而非兼容保留，原因是存量按钮数据极少（尚未有业务按钮权限数据），迁移成本极低，而保留旧编号会让类型语义长期模糊。

## Migration Plan

1. **后端先行**：部署新代码（扩展 MenuType 常量）前，先跑迁移 SQL
2. **迁移 SQL 顺序**：
   - 更新 type=1 数据分类（目录 vs 菜单页）
   - 将 type=2（按钮）改为 type=4
   - 插入三条 type=3 隐藏路由页记录
3. **前端同步部署**：sideBar.ts、router-setup.ts、form/Index.vue、SideNavigationBar 同一版本发布
4. **回滚方案**：如迁移 SQL 执行有误，反向 SQL 将 type=4 改回 type=2、type=2 改回 type=1、删除新增的三条 type=3 记录

## Open Questions

- 后续若需要菜单管理 UI（在后台界面新增/编辑菜单），type=3 隐藏路由页的父节点选择器需要过滤只显示 type=2 的节点，这部分由菜单管理功能迭代时处理。
- type=4 按钮权限的前端消费（`v-permission` 指令）留待下一阶段，本次只建好数据结构。
