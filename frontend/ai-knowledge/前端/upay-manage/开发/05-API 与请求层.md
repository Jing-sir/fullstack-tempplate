# 05 API 与请求层

## 基础分层

项目请求层主要分三层：

- `src/api/api.ts`
  - 统一 API 基类
- `src/api/*`
  - 业务 API 模块
- `src/servers/*`
  - Axios 实例、请求头、加密、统一响应处理

## Api 基类

`src/api/api.ts` 做的事情比较简单：

- 读取 `VITE_APP_BASE_URL`
- 创建 `UserRequest` 实例
- 暴露 `useHttp()` 供业务模块切换 baseURL

常见业务模块写法是：

- `class Xxx extends Api {}`
- `export default new Xxx()`

## 统一请求实例

`src/servers/index.ts` 里的 `UserRequest` 是核心实现。

它做了这些事：

- 创建 Axios 实例
- 请求前调用 `transformData()` 做加密
- 统一设置请求头
- 统一处理 `responseType`
- 统一把响应交给 `response.ts`

## 请求时要注意的项目约定

### GET 请求会过滤掉数组参数

`UserRequest.get()` 里对 `params` 做了处理：

- 如果 `params` 是对象
- 会把值为数组的字段过滤掉

这意味着如果某个接口必须通过 query 传数组，不能想当然沿用默认 `get()` 行为。

### 导出接口通常返回 blob

在项目里常见模式是：

- `this.api.post('/xxx/export', params, { responseType: 'blob' })`
- 页面侧再配合 `downloadExcel()` 下载

### 上传接口会带特殊 Accept

例如 `src/api/fetchTest/index.ts` 里的上传方法，会传：

- `headers: { Accept: 'application/json, ext/plain' }`

不要把上传接口当成普通 JSON 请求来写。

## 加密处理

`src/servers/config.ts` 会在请求前调用 `transformData()`：

- 只有命中 `whiteEncryptionList` 的接口才会处理
- 只有命中 `whiteKeys` 的字段才会加密

所以不是所有接口、所有字段都会加密，是否加密要看白名单。

## 统一响应处理

`src/servers/response.ts` 负责解包返回值和统一错误处理。

当前关键分支包括：

- `10005`、`10021`
  - 登录超时，清 token，跳登录页
- `10024`
  - 账号冻结，提示并跳登录页
- `20006`
  - 账户冻结，弹 warning
- `200`
  - 正常返回 `data`
- `500`
  - 统一提示服务器繁忙
- `result === 'success'`
  - 兼容旧格式，返回 `content`

这说明：

- 页面层通常拿到的是已经解包后的 `data`
- 如果接口格式特殊，要先确认是否已经被统一响应层处理过

## 业务 API 模块的真实风格

项目里常见的业务 API 模块有这些特征：

- 一个模块一个 class
- 方法名偏业务语义，不一定严格按 REST 命名
- 列表接口通常返回 `Pagination` 结构
- 下拉接口经常返回 `{ label, value }[]`
- 详情 / 状态更新 / 导出 / 选择器接口通常都混在同一业务模块里

例如：

- `src/api/acquiring/index.ts`
- `src/api/asset/index.ts`
- `src/api/fetchTest/index.ts`

## 特殊模块说明

### `src/api/fetchTest/index.ts`

虽然名字不够理想，但这里承载了很多系统级接口：

- 登录
- 退出
- 用户信息
- 菜单
- 角色权限
- 上传文件

开发时不要只看名字判断它是不是“测试接口”。

### 大模块 API 文件可能非常长

例如 `src/api/asset/index.ts` 就是典型的大型聚合模块。

遇到这类文件时，优先做法是：

- 先查有没有同业务小目录模块可复用
- 如果必须新增方法，尽量放在语义接近的位置
- 不要为了“整洁”随手拆散老文件，除非这是明确重构任务

## 页面侧调用建议

- 页面里不要直接散写 `axios`
- 先找 `src/api` 下是否已有同域模块
- 新增接口优先贴近现有业务模块
- 导出、上传、特殊响应类型要照着同类接口写

## 后续新增列表接口的统一规范

后续新增 API 时，列表接口统一参考 `src/api/wallet/collection/index.ts` 的写法，但文件命名按新规范继续收敛。

硬规则如下：

- 列表查询接口入参统一使用 `TableQueryParams<T>`
- 列表查询接口返回值统一使用 `Promise<TableDataPages<T>>`
- 两个公共类型统一从 `@/interface/StateType` 引入
- 类型文件里的接口 / type 定义统一使用 `declare interface`、`declare type`
- 后续新增 API 模块统一采用目录化结构：`src/api/<domain>/<module>/index.ts` + `src/api/<domain>/<module>/index.type.ts`
- 历史已有的 `type.d.ts`、`index.d.ts`、`index.types.ts`、`*.types.ts` 不做批量回改，只要求后续新增模块遵守新规范

推荐写法：

```ts
// src/api/<domain>/<module>/index.ts
import { TableDataPages, TableQueryParams } from '@/interface/StateType';
import { Api } from '@/api/api';

class XxxApi extends Api {
    constructor() {
        super('/xxx');
    }

    // xxx 列表
    getXxxList(params: TableQueryParams<XxxListParams>): Promise<TableDataPages<XxxListData>> {
        return this.api.post('/list', params);
    }
}

export default new XxxApi();
```

```ts
// src/api/<domain>/<module>/index.type.ts
declare interface XxxListParams {
    status: number | null;
}

declare interface XxxListData {
    id: string;
    status: number;
}
```

实际参考文件：

- `src/api/wallet/collection/index.ts`
- `src/interface/StateType.ts`

## 新增接口时建议参考

- 同业务域已有 API 文件
- 相同返回类型的列表接口
- 相同导出行为的 blob 接口
- 相同上传行为的文件接口

在这个项目里，跟最近兄弟模块保持一致，比抽象上“最优雅”的分层更重要。
