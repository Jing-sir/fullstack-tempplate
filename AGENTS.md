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
