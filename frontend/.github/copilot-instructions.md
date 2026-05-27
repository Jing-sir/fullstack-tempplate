# Arco Vue Admin Template - AI Coding Rules

## 项目概述
这是一个基于 Vue 3 + TypeScript + Vite 的企业级管理后台模板项目，使用 Arco Design Vue 作为 UI 组件库。

## 技术栈

### 核心框架
- **Vue 3.5.30** - 使用 Composition API 和 `<script setup>` 语法
- **TypeScript 5.9.3** - 启用严格模式，禁止使用 `any` 类型
- **Vite 8.0.0** - 构建工具和开发服务器
- **Vue Router 5.0.3** - 客户端路由（注意：v5 移除了默认导出）
- **Pinia 3.0.4** - 状态管理（Vue 3 推荐）

### UI 和样式
- **Arco Design Vue 2.57.0** - 企业级 UI 组件库
- **Tailwind CSS 3.4.19** - 实用优先的 CSS 框架
- **LESS 4.6.4** - CSS 预处理器（用于组件样式）

### 工具库
- **Vue i18n 11.3.0** - 国际化支持（中文/英文）
- **Axios 1.13.6** - HTTP 客户端
- **dayjs 1.11.20** - 日期处理
- **lodash-es 4.17.23** - 工具函数库
- **vue-request 2.0.4** - 数据请求 hook

### 开发工具
- **ESLint 10.0.3** - 代码检查
- **Prettier 3.8.1** - 代码格式化
- **TypeScript ESLint 8.57.1** - TypeScript 代码检查

---

## 代码规范

### TypeScript 严格要求

#### ❌ 禁止事项
```typescript
// ❌ 禁止使用 any
const data: any = {};
const result = (item as any).value;

// ❌ 禁止使用 Record<string, any>
const params: Record<string, any> = {};

// ❌ 禁止省略函数返回类型
const getData = () => { ... }
```

#### ✅ 正确做法
```typescript
// ✅ 使用精确的类型或泛型
interface UserData {
    id: number;
    name: string;
}
const data: UserData = { id: 1, name: 'User' };

// ✅ 使用 unknown 或具体类型
const params: Record<string, unknown> = {};
const params: SearchParams = {};

// ✅ 明确函数返回类型
const getData = (): Promise<UserData> => { ... }
const formatText = (text: string): string => { ... }

// ✅ 使用类型守卫
if (item.type === 'input') {
    const inputItem = item as InputSearchOption;
    inputItem.value = '';
}
```

### Vue 3 组件开发规范

#### 组件结构
```vue
<script setup lang="ts">
// 1. 导入语句
import { ref, computed, watch } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

// 2. 类型定义
interface Props {
    data: DataType;
    isLoading?: boolean;
}

// 3. Props 定义
const props = defineProps({
    data: {
        type: Object as PropType<DataType>,
        required: true,
    },
    isLoading: {
        type: Boolean,
        default: false,
    },
});

// 4. Emits 定义
const emits = defineEmits<{
    update: [value: string];
    submit: [data: FormData];
}>();

// 5. 组合式函数
const { t } = useI18n();

// 6. 响应式状态
const count = ref(0);

// 7. 计算属性
const doubleCount = computed(() => count.value * 2);

// 8. 方法
const handleClick = (): void => {
    emits('update', 'value');
};

// 9. 生命周期
onMounted(() => {
    // 初始化逻辑
});

// 10. Watch
watch(() => props.data, (newVal) => {
    // 处理逻辑
});
</script>

<template>
    <div class="component-wrapper">
        <!-- 模板内容 -->
    </div>
</template>

<style scoped lang="scss">
.component-wrapper {
    // 样式
}
</style>
```

#### Props 和 Emits
```typescript
// ✅ 使用 PropType 定义复杂类型
import type { PropType } from 'vue';

const props = defineProps({
    items: {
        type: Array as PropType<ItemType[]>,
        required: true,
        default: () => [],
    },
    config: {
        type: Object as PropType<ConfigType>,
        required: true,
    },
});

// ✅ 使用类型化的 emits
const emits = defineEmits<{
    'update:modelValue': [value: string];
    search: [params: SearchParams];
    close: [];
}>();

// ✅ 正确触发事件
emits('search', { keyword: 'test' });
```

### 状态管理（Pinia）

#### Store 定义
```typescript
// src/store/user.ts
import { defineStore } from 'pinia';

interface UserState {
    id: number;
    name: string;
    token: string | null;
}

export const useUserStore = defineStore('user', {
    state: (): UserState => ({
        id: 0,
        name: '',
        token: null,
    }),

    getters: {
        isLoggedIn: (state): boolean => !!state.token,
        fullName: (state): string => `User: ${state.name}`,
    },

    actions: {
        async login(credentials: LoginCredentials): Promise<void> {
            const response = await loginApi(credentials);
            this.token = response.token;
            this.name = response.name;
        },

        logout(): void {
            this.token = null;
            this.name = '';
        },
    },
});
```

#### Store 使用
```typescript
// ✅ 在组件中使用
const userStore = useUserStore();

// ✅ 访问 state
console.log(userStore.name);

// ✅ 访问 getters
console.log(userStore.isLoggedIn);

// ✅ 调用 actions
await userStore.login({ username, password });

// ✅ 使用 storeToRefs 保持响应性
import { storeToRefs } from 'pinia';
const { name, token } = storeToRefs(userStore);
```

### API 调用规范

#### API 类定义
```typescript
// src/api/user.ts
import { Api } from './api';

interface LoginParams {
    username: string;
    password: string;
}

interface LoginResponse {
    token: string;
    userInfo: UserInfo;
}

class UserApi extends Api {
    // ✅ 明确的请求和响应类型
    async login(params: LoginParams): Promise<LoginResponse> {
        return this.post<LoginResponse>('/auth/login', params);
    }

    async getUserInfo(): Promise<UserInfo> {
        return this.get<UserInfo>('/user/info');
    }

    async updateProfile(data: Partial<UserInfo>): Promise<void> {
        return this.put<void>('/user/profile', data);
    }
}

export const userApi = new UserApi();
```

#### 在组件中使用
```typescript
// ✅ 使用 vue-request 处理异步请求
import { useRequest } from 'vue-request';

const { data, loading, error, run } = useRequest(
    () => userApi.getUserInfo(),
    {
        manual: true,
    }
);

// ✅ 或直接调用
const handleLogin = async (): Promise<void> => {
    try {
        const response = await userApi.login({ username, password });
        // 处理响应
    } catch (error) {
        // 错误处理
        console.error(error);
    }
};
```

### 国际化（i18n）规范

#### 语言文件结构
```json
// src/lang/zh-CN.json
{
    "common": {
        "confirm": "确认",
        "cancel": "取消",
        "save": "保存"
    },
    "user": {
        "login": "登录",
        "logout": "退出登录",
        "profile": "个人资料"
    }
}
```

#### 使用方式
```vue
<script setup lang="ts">
const { t } = useI18n();

// ✅ 使用完整的 key 路径
const loginText = t('user.login');
const confirmText = t('common.confirm');
</script>

<template>
    <!-- ✅ 在模板中使用 -->
    <a-button>{{ t('common.confirm') }}</a-button>

    <!-- ✅ 带参数的翻译 -->
    <p>{{ t('user.welcome', { name: userName }) }}</p>
</template>
```

#### ❌ 禁止硬编码文本
```vue
<!-- ❌ 不要硬编码中文 -->
<a-button>确认</a-button>
<p>默认展开</p>

<!-- ✅ 使用 i18n -->
<a-button>{{ t('common.confirm') }}</a-button>
<p>{{ t('search.defaultExpanded') }}</p>
```

### 样式规范

#### Tailwind CSS 优先
```vue
<template>
    <!-- ✅ 优先使用 Tailwind 工具类 -->
    <div class="flex items-center justify-between w-full p-4">
        <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Click me
        </button>
    </div>
</template>
```

#### 组件样式使用 SCSS
```vue
<style scoped lang="scss">
// ✅ 复杂样式使用 SCSS
.custom-component {
    background: #fbfbfd;
    @apply rounded-lg; // 可以混用 Tailwind

    &:hover {
        background: #f0f0f0;
    }

    .child-element {
        padding: 1rem;
    }
}

// ✅ 使用深度选择器修改子组件样式
::v-deep(.arco-button) {
    border-radius: 8px;
}
</style>
```

### 文件命名和组织

#### 目录结构
```
src/
├── api/                    # API 接口定义
│   ├── api.ts             # 基础 API 类
│   ├── user.ts            # 用户相关 API
│   └── sys.ts             # 系统相关 API
├── components/            # 公共组件
│   ├── TableSearchWrap/   # 表格搜索组件
│   │   ├── Index.vue      # 主组件
│   │   └── SearchWrap/    # 子组件
│   └── Modal/             # 模态框组件
├── views/                 # 页面组件
│   ├── Home/              # 首页
│   │   └── Index.vue
│   └── Login/             # 登录页
├── store/                 # Pinia stores
│   ├── Index.ts           # Store 实例
│   ├── user.ts            # 用户 store
│   └── sideBar.ts         # 侧边栏 store
├── routes/                # 路由定义
│   ├── constantRoutes.ts  # 静态路由
│   └── asyncRoutes.ts     # 动态路由
├── interface/             # TypeScript 接口
│   └── TableType.ts       # 表格相关类型
├── utils/                 # 工具函数
│   └── common.ts
├── use/                   # 组合式函数
│   ├── useFetchTableData.ts
│   └── useModalHandler.ts
├── filters/               # 过滤器/格式化函数
│   └── dateFormat.ts
├── lang/                  # 国际化语言包
│   ├── zh-CN.json
│   └── en-US.json
└── setup/                 # 应用配置
    ├── router-setup.ts
    └── i18n-setup.ts
```

#### 命名规范
```
✅ 组件文件：PascalCase 或 Index.vue
   - TableSearchWrap/Index.vue
   - UserProfile.vue

✅ 工具函数：camelCase.ts
   - common.ts
   - dateFormat.ts

✅ Store 文件：camelCase.ts
   - user.ts
   - sideBar.ts

✅ 类型文件：PascalCase.ts
   - TableType.ts
   - UserType.ts

✅ 常量：UPPER_SNAKE_CASE
   - const MAX_COUNT = 100;
   - const API_BASE_URL = '/api';
```

### 组合式函数（Composables）规范

```typescript
// src/use/useTableData.ts
import { ref, computed } from 'vue';
import type { Ref } from 'vue';

interface UseTableDataOptions {
    pageSize?: number;
    autoLoad?: boolean;
}

interface UseTableDataReturn<T> {
    data: Ref<T[]>;
    loading: Ref<boolean>;
    total: Ref<number>;
    currentPage: Ref<number>;
    fetchData: () => Promise<void>;
    reset: () => void;
}

// ✅ 组合式函数命名以 use 开头
export function useTableData<T>(
    apiFn: (params: any) => Promise<T[]>,
    options: UseTableDataOptions = {}
): UseTableDataReturn<T> {
    const { pageSize = 20, autoLoad = true } = options;

    const data = ref<T[]>([]) as Ref<T[]>;
    const loading = ref(false);
    const total = ref(0);
    const currentPage = ref(1);

    const fetchData = async (): Promise<void> => {
        loading.value = true;
        try {
            const result = await apiFn({ page: currentPage.value, size: pageSize });
            data.value = result;
        } finally {
            loading.value = false;
        }
    };

    const reset = (): void => {
        data.value = [];
        currentPage.value = 1;
        total.value = 0;
    };

    if (autoLoad) {
        onMounted(() => {
            fetchData();
        });
    }

    return {
        data,
        loading,
        total,
        currentPage,
        fetchData,
        reset,
    };
}
```

### 表格和表单组件使用

#### TableSearchWrap 组件
```vue
<script setup lang="ts">
import type { SearchOption } from '@/interface/TableType';

// ✅ 搜索配置
const searchConf: SearchOption[] = [
    {
        type: 'input',
        label: '用户名',
        modelKey: 'username',
        value: null,
    },
    {
        type: 'select',
        label: '状态',
        modelKey: 'status',
        value: null,
        optionsArr: [
            { label: '启用', value: 1 },
            { label: '禁用', value: 2 },
        ],
    },
    {
        type: 'date',
        label: '创建时间',
        modelKey: ['startTime', 'endTime'],
    },
];

// ✅ 表格列配置
const tableColumns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '用户名', dataIndex: 'username', width: 150 },
    { title: '状态', dataIndex: 'status', width: 100 },
];

// ✅ API 调用
const fetchData = async (params: SearchParams) => {
    return userApi.getList(params);
};
</script>

<template>
    <TableSearchWrap
        :search-conf="searchConf"
        :table-columns="tableColumns"
        :api-fetch="fetchData"
    >
        <!-- 自定义列插槽 -->
        <template #optional="{ record }">
            <a-button @click="handleEdit(record)">编辑</a-button>
        </template>
    </TableSearchWrap>
</template>
```

### 错误处理

```typescript
// ✅ API 错误处理
try {
    const result = await userApi.getUserInfo();
    // 成功处理
} catch (error) {
    if (error instanceof Error) {
        Message.error(error.message);
    } else {
        Message.error('未知错误');
    }
    console.error('获取用户信息失败:', error);
}

// ✅ 表单验证错误处理
const formRef = ref();

const handleSubmit = async (): Promise<void> => {
    try {
        await formRef.value.validate();
        // 验证通过，提交表单
    } catch (error) {
        Message.warning('请检查表单填写');
    }
};
```

### Git 提交规范

```bash
# ✅ 使用语义化提交信息
feat: 添加用户管理模块
fix: 修复登录页面样式问题
refactor: 重构表格组件类型定义
style: 格式化代码
docs: 更新 API 文档
chore: 升级依赖包版本
perf: 优化列表查询性能
test: 添加用户模块单元测试

# ✅ 提交信息格式
<type>: <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 性能优化建议

### 组件懒加载
```typescript
// ✅ 路由懒加载
const routes = [
    {
        path: '/user',
        component: () => import('@/views/User/Index.vue'),
    },
];

// ✅ 组件懒加载
const HeavyComponent = defineAsyncComponent(() => import('@/components/HeavyComponent.vue'));
```

### 计算属性缓存
```typescript
// ✅ 使用计算属性缓存复杂计算
const filteredList = computed(() => {
    return list.value.filter(item => item.status === 'active');
});

// ❌ 避免在方法中做重复计算
const getFilteredList = () => {
    return list.value.filter(item => item.status === 'active');
};
```

### 列表渲染优化
```vue
<!-- ✅ 使用唯一 key -->
<div v-for="item in items" :key="item.id">
    {{ item.name }}
</div>

<!-- ❌ 避免使用 index 作为 key -->
<div v-for="(item, index) in items" :key="index">
    {{ item.name }}
</div>
```

---

## 常见问题和解决方案

### Vue Router 5 变化
```typescript
// ❌ Vue Router 4
import VueRouter from 'vue-router';

// ✅ Vue Router 5 - 移除了默认导出
import { createRouter, createWebHistory } from 'vue-router';
```

### Arco Design 组件 API 变化
```typescript
// ❌ 旧版本
Message.warn('警告信息');

// ✅ 新版本
Message.warning('警告信息');
```

### Pinia 3 变化
```typescript
// ✅ Pinia 3 - 使用方式保持不变
import { defineStore } from 'pinia';

export const useStore = defineStore('store', {
    // store 定义
});
```

---

## 开发工作流

1. **开发前**：确保运行 `npm install` 安装依赖
2. **开发中**：使用 `npm run dev` 启动开发服务器（端口 60001）
3. **类型检查**：使用 `npm run typecheck` 检查 TypeScript 类型
4. **代码格式化**：使用 Prettier 自动格式化代码
5. **提交前**：确保没有 TypeScript 错误和 ESLint 警告
6. **构建**：使用 `npm run build` 构建生产版本

---

## 禁止模式（Anti-patterns）

### ❌ 不要这样做

```typescript
// ❌ 使用 any
const data: any = {};

// ❌ 直接修改 props
props.data.value = 'new value';

// ❌ 在 computed 中修改状态
const computed = computed(() => {
    count.value++; // ❌
    return count.value;
});

// ❌ 硬编码字符串
<button>确认</button>

// ❌ 在模板中使用复杂表达式
<div>{{ items.filter(i => i.active).map(i => i.name).join(', ') }}</div>

// ❌ 不使用类型守卫
const value = (item as any).value;
```

### ✅ 应该这样做

```typescript
// ✅ 使用精确类型
const data: UserData = {};

// ✅ 通过 emit 通知父组件
emits('update:data', 'new value');

// ✅ computed 只用于计算
const doubleCount = computed(() => count.value * 2);

// ✅ 使用 i18n
<button>{{ t('common.confirm') }}</button>

// ✅ 提取为计算属性
const activeNames = computed(() =>
    items.value.filter(i => i.active).map(i => i.name).join(', ')
);

// ✅ 使用类型守卫
if (item.type === 'input') {
    const inputItem = item as InputSearchOption;
    const value = inputItem.value;
}
```

---

## 总结

遵循以上规范可以确保：
1. ✅ 代码类型安全，减少运行时错误
2. ✅ 代码风格一致，易于维护
3. ✅ 性能优化，用户体验好
4. ✅ 国际化支持，易于扩展
5. ✅ 符合 Vue 3 和 TypeScript 最佳实践

记住：**禁止使用 `any` 类型，始终使用精确的类型定义！**