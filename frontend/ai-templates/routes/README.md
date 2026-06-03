# 路由新增模板

本项目路由只允许写在 `src/routes/permissionRoutes.ts`。

路由分三类：

| 类型 | 什么时候用 | 是否出现在侧边栏 |
| --- | --- | --- |
| 一级大模块 | 新增一个左侧一级菜单分组 | 是 |
| 二级页面 | 在已有一级菜单下面新增一个页面 | 是 |
| 隐藏页面 | 详情、新增、编辑、审核等跳转页 | 否，必须写 `isShow: true` |

## 通用规则

- 顶级模块必须使用 `component: MainLayout`
- `MainLayout` 统一从 `./layout` 引入，不允许直接 `import('@/Main.vue')`
- 普通业务路由必须写 `meta.requiresAuth: true`
- 列表页必须写 `meta.permissionKey` 和 `meta.permissionParent`，并让两者等于后端 `menus.name`
- 隐藏页必须写独立的 `meta.permissionKey`，并用 `meta.permissionParent` 指向父列表页权限 key
- `meta.role` 是遗留字段，不得用于新增路由
- 顶级模块必须写 `meta.icon`
- 路由 `name` 必须全项目唯一
- 页面文件默认放在 `src/views/<Module>/<feature-name>/Index.vue`
- 不确定权限 key、`icon`、页面路径时，AI 必须先确认，不允许猜
- 权限接口加载成功但当前路由无权限时，系统会跳 `/error/no-permission`，不要把无权限伪装成 404

`src/routes/permissionRoutes.ts` 文件顶部保持：

```ts
import type { RouteRecordRaw } from 'vue-router'
import { MainLayout } from './layout'
```

## 例子 1：新增一级大模块

适用场景：左侧菜单要新增一个完整分组，比如“订单管理”。

把下面整个对象添加到 `permissionRoutes` 数组里：

```ts
{
    path: '/order',
    name: 'order',
    redirect: 'noRedirect',
    component: MainLayout,
    meta: {
        title: '订单管理',
        icon: 'orderManage',
        requiresAuth: true,
    },
    children: [
        {
            path: 'orderList',
            name: 'orderList',
            component: () =>
                import(
                    /* webpackChunkName: "orderList" */ '@/views/Order/order-list/Index.vue'
                ),
            meta: {
                title: '订单列表',
                requiresAuth: true,
                permissionKey: 'orderList',
                permissionParent: 'orderList',
            },
        },
    ],
}
```

必须替换：

- `order`：一级菜单 `name`
- `订单管理`：一级菜单标题
- `orderManage`：一级菜单图标 key
- `orderList`：页面 `name`、`permissionKey` 和 `permissionParent`
- `@/views/Order/order-list/Index.vue`：真实页面路径

## 例子 2：已有大模块下新增小页面

适用场景：一级菜单已经存在，只是在它的 `children` 里加一个页面。

例如在 `/order` 模块下面新增“退款订单”页面，只添加一个 child：

```ts
{
    path: 'refundOrderList',
    name: 'refundOrderList',
    component: () =>
        import(
            /* webpackChunkName: "refundOrderList" */ '@/views/Order/refund-order-list/Index.vue'
        ),
    meta: {
        title: '退款订单',
        requiresAuth: true,
        permissionKey: 'refundOrderList',
        permissionParent: 'refundOrderList',
    },
}
```

注意：

- 不要再复制一个 `/order` 顶级模块
- 不要再写 `component: MainLayout`
- 只放到已有顶级模块的 `children` 里
- `path` 不能以 `/` 开头

## 例子 3：新增隐藏详情页 / 编辑页

适用场景：点击列表行的“详情、编辑、审核”后跳转新页面，但不希望这个页面出现在左侧菜单。

把隐藏路由放在对应一级模块的 `children` 里：

```ts
{
    path: 'orderList/detail/:id',
    name: 'orderDetail',
    component: () =>
        import(
            /* webpackChunkName: "orderDetail" */ '@/views/Order/order-list/detail/Index.vue'
        ),
    meta: {
        title: '订单详情',
        requiresAuth: true,
        isShow: true,
        permissionKey: 'orderList-view',
        permissionParent: 'orderList',
    },
}
```

权限 key 怎么选：

- 隐藏页必须在后端 `menus` 表中有独立权限节点，例如 `orderList-view`
- `permissionKey` 填隐藏页权限节点的 `menus.name`
- `permissionParent` 填父列表页权限节点的 `menus.name`，例如 `orderList`
- 后端权限节点尚未定义时必须先补契约，不允许复用父权限兜底

页面跳转示例：

```ts
router.push({
    name: 'orderDetail',
    params: { id: record.id },
})
```

## 例子 4：新增隐藏新增页 / 编辑页

适用场景：新增或编辑不是弹窗，而是独立页面。

```ts
{
    path: 'orderList/add',
    name: 'orderAdd',
    component: () =>
        import(/* webpackChunkName: "orderAdd" */ '@/views/Order/order-list/form/Index.vue'),
    meta: {
        title: '新增订单',
        requiresAuth: true,
        isShow: true,
        permissionKey: 'orderList-add',
        permissionParent: 'orderList',
    },
},
{
    path: 'orderList/edit/:id',
    name: 'orderEdit',
    component: () =>
        import(/* webpackChunkName: "orderEdit" */ '@/views/Order/order-list/form/Index.vue'),
    meta: {
        title: '编辑订单',
        requiresAuth: true,
        isShow: true,
        permissionKey: 'orderList-edit',
        permissionParent: 'orderList',
    },
}
```

## 新增路由前，AI 必须确认

| 信息 | 谁提供 | 没有时怎么办 |
| --- | --- | --- |
| 一级菜单标题 | 用户 / 旧项目 / 后端菜单 | 标记待确认 |
| 一级菜单权限 key | 后端菜单 `name` | 不能猜 |
| 一级菜单 icon | 项目已有 icon key 或用户指定 | 不能猜 |
| 页面标题 | 用户 / 旧项目 | 标记待确认 |
| 列表页 `permissionKey` | 后端菜单 `name` | 不能猜 |
| 隐藏页 `permissionKey` | 后端隐藏权限节点 `name` | 不能猜，不允许复用父权限 |
| 隐藏页 `permissionParent` | 父列表页权限节点 `name` | 不能猜 |
| 是否隐藏 | 需求决定 | 详情/编辑页默认隐藏 |
| 页面文件路径 | 按 `src/views/<Module>/<feature>/Index.vue` | 由 AI 给出并说明 |

## 禁止写法

```ts
// 禁止：重复动态导入 Main.vue
component: () => import('@/Main.vue')

// 禁止：二级页面也使用 MainLayout
{
    path: 'orderList',
    component: MainLayout,
}

// 禁止：列表页没有权限 key 和父页面 key
meta: {
    title: '订单列表',
    requiresAuth: true,
}

// 禁止：详情页忘记隐藏，导致出现在左侧菜单
meta: {
    title: '订单详情',
    requiresAuth: true,
    permissionKey: 'orderList-view',
    permissionParent: 'orderList',
}
```
