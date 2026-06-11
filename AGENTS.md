# 项目级 AI 规则

本规则适用于 `backend` 和 `frontend`。子目录规则只能补充，不能覆盖本文件中的强制约束。

## API 路径参数位置（强制）

- 动态路径参数只能出现在 URL 的最后一个片段，禁止放在 URL 中间。
- 列表查询、筛选、分页参数优先放在 `POST` 请求体中，不要为了传参制造中间动态路径。
- 前后端新增或修改接口时，必须同时遵守此约束。

```text
# 禁止
GET  /api/v1/roles/:id/info
GET  /api/v1/roles/:id/menus
PUT  /api/v1/roles/:id/menus
POST /api/v1/permissions/:key/list

# 推荐
GET  /api/v1/roles/info/:id
GET  /api/v1/roles/menus/:id
PUT  /api/v1/roles/menus/:id
POST /api/v1/permissions/list
Body: { "parentKey": "accountManage" }
```

## 2FA 交互组件（强制）

- 所有需要输入 2FA 验证码的前端操作，必须统一调用
  `frontend/src/components/GoogleCode.vue` 独立弹窗。
- 2FA 验证码必须使用该组件提供的 6 个独立数字输入格；禁止在业务表单、
  Modal、Drawer 或页面中直接新增普通 `a-input` / `a-input-password` 验证码字段。
- 业务组件只负责校验业务字段、打开 `GoogleCode.vue`，并在组件回传完整
  6 位验证码后调用业务接口。
- 删除、启停等需要业务确认的操作，必须先完成业务确认，再打开独立 2FA
  弹窗；禁止把确认选项和验证码输入混在同一个弹窗。
- 接口参数可以继续使用 `facode` 等后端约定字段，但验证码值必须来自
  `GoogleCode.vue` 的完成回调。
- 登录、修改密码、绑定/更换 2FA、管理员重置、权限节点增删改等场景均适用，
  不得为单个页面重复实现新的 2FA 输入组件。
