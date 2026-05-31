# arco-vue-template

基于 Vue 3、TypeScript、Vite、Pinia、Vue Router、vue-i18n、Arco Design、Tailwind CSS 和 SCSS 的后台管理模板。

这份 README 不是通用脚手架介绍，而是根据当前仓库实际代码结构、页面模块、公共能力和协作约定整理出的项目说明，目标是帮助维护者快速理解：

- 这个项目现在有哪些功能
- 项目是怎么启动、路由、鉴权和请求的
- 新功能应该放到哪里
- 列表页、表单页、权限页在这个仓库里应该怎么写

## 1. 项目概览

当前仓库已经具备一套完整的后台基础能力，核心包括：

- 登录流程
    - 账号密码登录
    - 登录密码 AES-GCM 加密提交
    - 登录后按需触发 2FA 验证
- 布局能力
    - 左侧菜单
    - 顶部面包屑
    - 用户下拉菜单
    - 主题色切换
    - keep-alive 页面缓存
- 权限能力
    - 后端菜单驱动的动态可见路由
    - 页面级权限校验
    - 按钮级权限判断
- 通用列表页能力
    - 搜索区
    - 高级筛选
    - 表格
    - 分页
    - 刷新和命令式重载
- 系统管理模块
    - 操作日志
    - 角色与权限
    - 账号管理

当前页面入口主要集中在：

- `src/views/Login/Index.vue`
- `src/views/Home/Index.vue`
- `src/views/SystemManage/operation-log/Index.vue`
- `src/views/SystemManage/role-permissions/Index.vue`
- `src/views/SystemManage/role-permissions/form/Index.vue`
- `src/views/SystemManage/account-manage/Index.vue`
- `src/views/SystemManage/account-manage/form/Index.vue`

其中 `Home` 页面目前更接近“通用列表页模板示例”，展示了 `TableSearchWrap` 在复杂搜索条件下的接入方式。

## 2. 技术栈

### 2.1 运行时

- Vue `^3.5.30`
- Vue Router `^5.0.3`
- Pinia `^3.0.4`
- vue-i18n `^11.3.0`
- Arco Design Vue `^2.57.0`
- Axios `^1.13.6`
- Day.js `^1.11.20`
- vue-request `^2.0.4`

### 2.2 工程能力

- Vite `^8.0.0`
- TypeScript `^5.9.3`
- ESLint flat config
- Prettier
- Tailwind CSS `^3.4.19`
- Sass
- Auto Import
- Components Auto Import

### 2.3 当前工程特征

- 包管理器固定为 `pnpm`
- 路径别名固定为 `@ -> src`
- 主入口为 `src/main.ts`
- 路由聚合入口为 `src/routes.ts`
- 路由初始化位于 `src/setup/router-setup.ts`
- 请求封装位于 `src/plugins/http.ts`
- API 基类位于 `src/api/api.ts`
- ESLint 只使用 `eslint.config.js`

Vite 侧还开启了两类自动导入能力：

- `unplugin-auto-import`
    - 自动导入 `vue`、`vue-router`、`vue-i18n`、`pinia`
    - 自动扫描 `src/store`、`src/utils`、`src/use`
- `unplugin-vue-components`
    - 自动导入 `src/components` 下组件
    - 通过 `ArcoResolver` 自动按需引入 Arco 组件

## 3. 快速开始

### 3.1 安装依赖

```bash
pnpm install
```

### 3.2 本地开发

```bash
pnpm run dev
```

默认开发端口来自 `vite.config.ts`，当前配置为 `60001`。

### 3.3 常用命令

```bash
pnpm run dev
pnpm run build
pnpm run preview
pnpm run typecheck
pnpm run lint
```

如果只想检查改动文件，推荐使用：

```bash
pnpm exec eslint src/path/to/file.ts src/path/to/file.vue
```

## 4. 环境变量

仓库根目录存在：

- `.env`
- `.env.development`
- `.env.production`

结合当前代码扫描，变量使用情况如下：

| 变量名                  | 当前用途     | 说明                                                                                   |
| ----------------------- | ------------ | -------------------------------------------------------------------------------------- |
| `VITE_APP_BASE_URL`     | 已使用       | API 基础路径，`src/api/api.ts`、`src/api/permission.ts`、`src/api/examine.ts` 会读取它 |
| `VITE_PUBLIC_PATH`      | 已使用       | Vite `base` 配置，见 `vite.config.ts`                                                  |
| `VITE_DEV_PROXY_TARGET` | 开发环境使用 | 本地 `/api` 代理目标，生产构建不依赖它                                                 |

开发环境还配置了 `/api` 代理，定义在 `vite.config.ts` 的 `server.proxy` 中。

## 5. 目录结构

```text
.
├─ public/
├─ src/
│  ├─ api/                 后端接口调用层
│  ├─ assets/              静态资源与全局样式
│  ├─ components/          公共组件
│  ├─ directives/          公共指令
│  ├─ filters/             格式化与过滤工具
│  ├─ interface/           跨模块共享类型
│  ├─ lang/                国际化资源
│  ├─ plugins/             插件与基础封装
│  ├─ routes/              路由定义
│  ├─ setup/               启动阶段配置
│  ├─ store/               Pinia 状态
│  ├─ use/                 通用 hooks / composables
│  ├─ utils/               公共工具函数
│  ├─ views/               路由页面
│  ├─ App.vue
│  ├─ Main.vue
│  └─ main.ts
├─ AGENTS.md               AI 协作规则
├─ CLAUDE.md               需与 AGENTS.md 保持一致
├─ eslint.config.js
├─ tailwind.config.ts
├─ tsconfig.json
├─ vite.config.ts
└─ package.json
```

## 6. 入口与启动链路

### 6.1 `src/main.ts`

应用启动时会按顺序注册：

- Pinia
- i18n
- Arco Design Vue
- Router
- 日期格式化 filter
- 空值展示指令 `defempty`
- 千分位 filter
- 数字格式化 filter

同时引入：

- `nprogress` 样式
- `src/assets/stylesheet/main.css`
- `tailwindcss/tailwind.css`
- `@arco-design/web-vue/dist/arco.css`

### 6.2 `src/App.vue`

`App.vue` 负责全局壳层能力：

- 根据当前 i18n 语言切换 Arco 组件语言包
- 初始化 Day.js 语言
- 在挂载前调用 `user` store 的 `getPwdIv()`，为登录加密流程预取后端密钥

### 6.3 `src/Main.vue`

主布局由 `Main.vue` 负责，核心包含：

- 左侧侧边栏 `SideNavigationBar`
- 顶部 `Header`
- 主内容区 `<router-view>`
- keep-alive 缓存逻辑
- 在线/离线状态提示
- 路由切换时重新拉取可访问菜单

注意：

- 仓库中存在 `TagsView.vue`，但当前 `Main.vue` 未挂载它
- `keepAlive` 名单来源于 `tagsView` store

## 7. 路由与权限

### 7.1 路由拆分

路由相关文件当前由两层组成：

- `src/routes.ts`
    - 聚合导出完整路由数组
- `src/routes/constantRoutes.ts`
    - 常驻路由
- `src/routes/asyncRoutes.ts`
    - 受权限控制的路由

其中路由定义主要分为：

- `constantRoutes.ts`
    - 登录页
    - 错误页
    - 无权限页
- `asyncRoutes.ts`
    - 首页
    - 系统管理模块

### 7.2 路由守卫

`src/setup/router-setup.ts` 当前承担了以下职责：

- 根据路由 `meta.lang` 或 URL 前缀设置语言
- 根据路由 `meta.title` 设置浏览器标题
- 结合 `sideBar.roleMenu` 做页面权限校验
- 处理路由级重定向
- 页面切换后将 `#app` 滚动条重置到顶部

### 7.3 权限来源

权限数据主要来自两个接口：

- `src/api/sys.ts` 中的 `menuList()`
- `src/api/permission.ts` 中的 `homeMenu()`

实际布局中，左侧菜单主要通过 `src/store/sideBar.ts`：

1. 调用 `api.menuList()`
2. 将后端返回的 `component` 字段与本地 `asyncRoutes` 的 `meta.role` 做匹配
3. 生成当前用户可见的动态路由树
4. 存入：
    - `roleMenu`：原始权限菜单
    - `routes`：过滤后的前端路由树

### 7.4 权限相关约定

- `meta.title` 使用中文 key，不直接写英文语义 key
- `meta.role` 必须和后端权限名保持一致
- 按钮权限判断统一走 `src/use/useButtonRole.ts`

## 8. 请求层与 API 组织

### 8.1 `src/plugins/http.ts`

这是项目的 Axios 统一封装，主要做了：

- 请求头注入
    - `Token`
    - `Authorization: Bearer <token>`
    - `Accept-Language`
    - `DateTime`
    - trace/span id
- `multipart/form-data` 与流式表单转换
- 统一响应预处理
    - `code === 200` 时直接返回 `data`
    - 其它业务错误弹出 Arco `Message.error`
    - `10005` 时清空 `manageToken` 并跳转登录页

### 8.2 `src/api/api.ts`

普通 API 模块默认继承 `Api` 基类，通过 `VITE_APP_BASE_URL` 创建 Axios 实例。
`VITE_APP_BASE_URL` 必须是固定版本前缀，例如 `/api/v1` 或后续 `/api/v2`。

### 8.3 API 模块现状

- `src/api/sys/auth.ts`
    - 登录
    - 用户信息
    - 退出登录
    - 2FA 相关接口
    - 密钥 `pwdIv`
- `src/api/sys/role.ts`
    - 菜单
- `src/api/permission.ts`
    - 权限列表
    - 权限勾选
    - 首页菜单
- `src/api/examine.ts`
    - 审批流查询
- `src/api/fetchTest.ts`
    - 首页示例列表请求
- `src/api/fetchTest/index.ts`
    - 系统管理模块接口
    - 当前承担了较多业务接口，是后续可以继续按业务拆分的重点区域

### 8.4 API 约定

- 组件和页面里不要直接写 `axios`
- 后端接口统一放到 `src/api`
- 一般接口优先继承 `src/api/api.ts`
- 后端 URL 标准固定为 `/api/v{数字}/资源`，例如登录接口固定为 `POST /api/v1/login`
- 前端 API 方法内部只写版本前缀后的路径，例如 `'/login'`；版本前缀只能由 `VITE_APP_BASE_URL=/api/v1` 统一提供

## 9. 状态管理

`src/store` 当前包含以下几个 store：

### 9.1 `user.ts`

- 用户信息
- 账号
- 登录加密密钥 `pwdIv`

### 9.2 `sideBar.ts`

- 左侧菜单展开/收起状态
- 原始权限菜单 `roleMenu`
- 过滤后的动态路由树 `routes`
- 菜单权限拉取逻辑 `fetchSidebarRoutes`

### 9.3 `tagsView.ts`

- 已访问页签
- keep-alive 相关缓存路由记录

### 9.4 `theme.ts`

- 当前主题色
- 动态更新 CSS 变量 `--color-primary-6`

## 10. 国际化规则

国际化资源位于：

- `src/lang/zh-CN.json`
- `src/lang/en-US.json`

当前仓库采用“中文原文作为 key”的方式，而不是英文语义 key。示例：

```ts
t('登录')
t('请输入密码')
t('操作成功')
```

不要新增这类 key：

```ts
t('login.title')
t('search.reset')
```

新增用户可见文案时，需要同时维护两份语言包。

## 11. 公共组件与通用能力

### 11.1 列表页骨架 `TableSearchWrap`

`src/components/TableSearchWrap/Index.vue` 是当前仓库最重要的基础组件之一，用于承载：

- 搜索区
- 高级筛选区
- 表格
- 分页
- 工具栏按钮
- 插槽扩展
- 命令式刷新 / 查询 / 重置

推荐的列表页接入方式：

1. 页面定义 `searchConf`
2. 页面定义 `tableColumns`
3. 页面提供 `apiFetch`
4. 页面通过插槽补充操作列和工具栏

搜索区的最终实现位于：

- `src/components/TableSearchWrap/SearchWrap/Index.vue`

它支持：

- 顶部快捷搜索
- 输入框/选择器/单日期/日期范围
- 防抖输入查询
- 高级筛选折叠
- 表单重置与参数序列化

### 11.2 侧边栏

侧边栏相关文件：

- `src/components/SideNavigationBar/index.vue`
- `src/components/SideNavigationBar/Item.vue`

特点：

- 根据 `sideBar.routes` 动态渲染
- 自动拼接父子路由路径
- 自动高亮当前路由
- 递归菜单节点拆分为独立内部组件

### 11.3 头部与账户操作

`src/components/Header.vue` 当前负责：

- 面包屑
- 菜单折叠切换
- 主题色切换
- 用户下拉菜单
- 绑定 2FA
- 修改密码入口
- 退出登录

### 11.4 2FA 相关组件

- `src/components/GoogleCode.vue`
    - 登录后 2FA 验证弹窗
- `src/components/CodeInput.vue`
    - 6 位验证码输入组件
- `src/components/Modal/BindGoogle.vue`
    - 绑定 2FA 前的密码校验弹窗

### 11.5 审批流展示

- `src/components/Approval.vue`
- `src/components/ListApproval.vue`

分别用于：

- 动态审批流拉取与展示
- 静态审批流列表展示

## 12. 通用 hooks / composables

`src/use` 下已经沉淀了不少可复用逻辑，新增功能前建议先检查这里。

常用项包括：

- `useButtonRole.ts`
    - 按钮权限判断
- `useFetchTableData.ts`
    - 通用表格请求、分页、loading 管理
- `useFormHandler.ts`
    - 表单状态、校验与字段回填
- `useModalHandler.ts`
    - 弹窗打开/关闭/标题控制
- `useOnActivated.ts`
    - keep-alive 激活逻辑
- `useUpload.ts`
    - 上传前校验
- `useValidatorConf.ts`
    - 通用校验器

## 13. 页面模块说明

### 13.1 登录页

文件：

- `src/views/Login/Index.vue`

流程概览：

1. 用户输入账号密码
2. 前端使用 `encryptAESGCM` 加密密码
3. 调用 `api.sysUserLogin`
4. 设置 `manageToken`
5. 如果后端返回 `googleState === 1`，弹出 `GoogleCode` 继续做 2FA 校验
6. 校验成功后跳转首页

### 13.2 首页

文件：

- `src/views/Home/Index.vue`

这是一个基于 `TableSearchWrap` 的列表页示例，包含大量搜索项与表格列，适合作为：

- 新列表页的接入参考
- `searchConf` 和 `tableColumns` 的参考实现

### 13.3 系统管理 / 操作日志

文件：

- `src/views/SystemManage/operation-log/Index.vue`

特点：

- 使用 `TableSearchWrap`
- 支持操作人、请求功能、时间范围搜索
- 请求/响应报文通过 Popover 展示格式化 JSON

### 13.4 系统管理 / 角色与权限

文件：

- `src/views/SystemManage/role-permissions/Index.vue`
- `src/views/SystemManage/role-permissions/form/Index.vue`

列表页能力：

- 展示角色列表
- 新增角色
- 查看权限
- 编辑角色

表单页能力：

- 左侧模块导航
- 中间权限树
- 右侧已选权限清单
- 权限搜索
- 仅看已选
- 展开/收起当前模块

这是当前仓库里结构最复杂的业务页之一，也是权限树类页面的最佳参考。

### 13.5 系统管理 / 账号管理

文件：

- `src/views/SystemManage/account-manage/Index.vue`
- `src/views/SystemManage/account-manage/form/Index.vue`
- `src/views/SystemManage/account-manage/modal/ResetPasswords.vue`

能力包括：

- 管理员列表
- 新增管理员
- 编辑管理员
- 启用/禁用状态切换
- 重置登录密码
- 重置 2FA

## 14. 类型、工具、过滤器与指令

### 14.1 类型

共享类型位于 `src/interface`，当前重点文件有：

- `TableType.ts`
    - 搜索配置
    - 表格列
    - 分页返回
    - `TableSearchWrap` 暴露类型
- `SystemManageType.ts`
    - 系统管理模块相关类型
- `SideNavigationType.ts`
    - 侧边栏菜单树类型

### 14.2 工具

`src/utils/common.ts` 是当前最核心的工具文件，包含：

- `formatText`
- 深拷贝
- 事件监听
- 随机字符串
- 树与扁平结构转换
- 防抖 / 节流
- 复制相关能力

`src/utils/constant.ts` 主要维护：

- 常用正则
- 数值边界
- 默认分页配置

### 14.3 过滤器

`src/filters` 下保留了一批格式化能力：

- `dateFormat.ts`
- `dataThousands.ts`
- `numberOperation.ts`
- `stringOperation.ts`
- `arraySort.ts`

这些文件保留了较强的兼容风格，既能按插件方式注册，也能直接导入函数使用。

### 14.4 指令

`src/directives` 当前包含：

- `whenEmpty.ts`
    - 已在 `main.ts` 注册
    - 为空时显示 `--`
- `onlyNumber.ts`
    - 当前存在于仓库中，但没有在 `main.ts` 注册

## 15. 当前工程约定

这些规则来自仓库实际结构与协作文件约定，开发时请遵守：

### 15.1 包管理与基础配置

- 日常工作使用 `pnpm`
- 不要重新引入 `.eslintrc.*`
- 路径别名使用 `@`

### 15.2 目录放置规则

- `src/components` 只放公共组件
- `src/interface` 放跨文件共享类型
- `src/routes` 只放路由定义
- `src/lang` 放国际化资源
- `src/utils` 放通用工具
- `src/api` 放后端接口模块
- `src/store` 放共享 Pinia 状态
- `src/use` 放通用 hooks

### 15.3 列表页约定

新建搜索/列表页时，优先复用：

- `src/components/TableSearchWrap/Index.vue`

不要在页面里重复手写一套“搜索表单 + 表格 + 分页”骨架，除非当前需求确实无法通过：

- `searchConf`
- 插槽
- 组件暴露方法

### 15.4 API 约定

- 不要在组件和页面里直接使用 `axios`
- 新接口放到 `src/api`
- 命名尽量跟随接口路径语义

### 15.5 i18n 约定

- 所有面向用户的文案默认必须国际化
- 中文原文作为 key
- 同时维护 `zh-CN.json` 与 `en-US.json`

### 15.6 验证约定

涉及 TS / Vue 改动时，最低要求：

```bash
pnpm run typecheck
```

涉及 lint 配置、格式、import 规则改动时，再补：

```bash
pnpm run lint
```

日常因为仓库存在历史 lint 债务，更推荐对改动文件做定向 ESLint 检查。

## 16. 新功能开发建议

### 16.1 新增一个列表页

推荐顺序：

1. 在 `src/api` 新增接口方法
2. 在 `src/views/<模块>/<功能>/Index.vue` 创建页面
3. 复用 `TableSearchWrap`
4. 用 `searchConf` 配搜索项
5. 用 `tableColumns` 配列
6. 在 `src/routes` 注册路由
7. 在 `src/lang` 同步补齐文案

### 16.2 新增一个权限页

建议优先复用现有能力：

- 菜单权限：`sideBar.ts`
- 按钮权限：`useButtonRole.ts`
- 树型权限：参考 `role-permissions/form/Index.vue`

### 16.3 新增一个通用组件

如果组件有内部子组件，建议使用：

```text
src/components/ComponentName/
├─ index.vue
└─ Item.vue
```

`index.vue` 作为唯一公开入口，其他文件作为内部实现细节。

## 17. 已知现状与维护提示

扫描当前仓库后，有几个现实情况值得提前知道：

- `src/api/fetchTest/index.ts` 承担了较多系统管理接口，后续如果业务继续增长，可以按模块逐步拆分，但不建议一次性大重构
- `TagsView.vue` 已存在，但当前主布局未接入
- `onlyNumber.ts` 指令已存在，但当前未在入口注册
- 如根目录出现其它包管理器锁文件，需删除并以 `pnpm-lock.yaml` 为准
- 根 `.env` 中存在未被当前代码读取的历史字段，不建议在未确认用途前继续扩散使用

## 18. 协作建议

开始动手前，建议优先阅读：

- `AGENTS.md`
- `CLAUDE.md`

这两个文件需要保持一致，里面已经定义了当前仓库对以下事项的约束：

- 目录职责
- API 与 store 放置方式
- i18n 写法
- 列表页实现方式
- 验证命令
- 小步修改、避免大重构的协作策略

如果你只是想快速找到核心入口，可以按下面顺序阅读代码：

1. `package.json`
2. `vite.config.ts`
3. `src/main.ts`
4. `src/App.vue`
5. `src/Main.vue`
6. `src/setup/router-setup.ts`
7. `src/store/sideBar.ts`
8. `src/plugins/http.ts`
9. `src/components/TableSearchWrap/Index.vue`
10. `src/views/SystemManage/role-permissions/form/Index.vue`

这样基本可以在最短时间内建立对整个仓库的整体认知。
