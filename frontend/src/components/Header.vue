<script setup lang="ts">
import {
    IconComputer,
    IconMenuFold,
    IconMenuUnfold,
    IconMoonFill,
    IconSunFill,
} from '@arco-design/web-vue/es/icon'
import Settings2FA from '@/components/Settings2FA.vue'
import SettingsPassword from '@/components/SettingsPassword.vue'
import type { RouteRecordRaw } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import sysAuthApi from '@/api/sys/auth'
import { clearManageToken } from '@/utils/session'

type HeaderRouteRecord = RouteRecordRaw & {
    meta?: RouteRecordRaw['meta'] & {
        title?: string | (() => string)
    }
}

const props = withDefaults(
    defineProps<{
        isOnline?: boolean
    }>(),
    {
        isOnline: true,
    },
)

const is2FAModalOpen = ref(false)
const isPasswordModalOpen = ref(false)
const twoFAModalType = ref<'add' | 'edit'>('edit')

const { t } = useI18n()
const store = sideBar()
const userStore = user()
const themeStore = theme()
const hasRoute = useRoute()
const { push } = useRouter()
const storeTagsView = tagsView()
const { isSidebar } = storeToRefs(store)
const { themeMode, resolvedThemeMode } = storeToRefs(themeStore)

const homeRoute: HeaderRouteRecord = {
    path: '/',
    meta: { title: '首页', role: '' },
    redirect: '/Home',
}

const pageTitleOverrides: Record<string, string> = {
    addAccount: '新增管理员',
    editAccount: '编辑管理员',
    addRolePermissions: '新增角色',
    editRolePermissions: '编辑角色权限',
    viewRolePermissions: '查看角色权限',
}

const onIsSidebar = (status: boolean) => {
    store.updateIsSidebar(!status)
}

const isHome = (route?: HeaderRouteRecord) => {
    const name = route?.name
    if (!name) return false
    return String(name).trim().toLocaleLowerCase() === 'main'
}

const onOpenPass = (): void => {
    // 老项目里“修改密码”要求先绑定 2FA，这里保持同样的前置约束。
    if (userStore.userInfo?.isFACode !== 1) {
        Message.warning(t('请绑定2FA再操作'))
        return
    }
    isPasswordModalOpen.value = true
}

const onOpen2FA = (): void => {
    twoFAModalType.value = userStore.userInfo?.isFACode === 1 ? 'edit' : 'add'
    is2FAModalOpen.value = true
}

const onClosePasswordModal = (): void => {
    isPasswordModalOpen.value = false
}

const onClose2FAModal = (): void => {
    is2FAModalOpen.value = false
}

const _onLink = (item: HeaderRouteRecord) => {
    const { redirect, path } = item
    if (redirect) {
        const routePath = redirect === '/Home' ? '/' : redirect
        push(String(routePath))
        return
    }
    push(path)
}

/**
 * 清理前端本地登录态（token + 标签页缓存）。
 * 这个步骤必须和后端接口结果解耦，避免“后端登出失败时用户仍卡在已登录状态”。
 */
const clearLocalSession = (): void => {
    clearManageToken()
    storeTagsView.clearVisitedView()
}

/**
 * 登出流程策略：
 * 1. 先尝试通知后端销毁会话
 * 2. 无论接口成功或失败，都执行本地会话清理并跳转登录页
 *
 * 这样可以保证前端退出行为稳定，避免网络抖动导致“点击退出无反应”。
 */
const onLoginOut = async (): Promise<void> => {
    await sysAuthApi.loginOut().finally(async () => {
        clearLocalSession()
        await push('/login')
    })
}

const formatRouteTitle = (title?: string | (() => string)): string =>
    title ? t(String(typeof title === 'function' ? title() : title)) : ''

const breadcrumbRoutes = computed<HeaderRouteRecord[]>(() => {
    const matched = hasRoute.matched.filter((item) =>
        Boolean(item.meta?.title),
    ) as HeaderRouteRecord[]

    if (!matched.length) {
        return [homeRoute]
    }

    return isHome(matched[0]) ? matched : [homeRoute, ...matched]
})

const routeName = computed(() => String(hasRoute.name ?? ''))

const currentPageTitleKey = computed(
    () =>
        pageTitleOverrides[routeName.value] ||
        String(
            breadcrumbRoutes.value[breadcrumbRoutes.value.length - 1]?.meta?.title ||
                hasRoute.meta?.title ||
                '首页',
        ),
)

const currentPageTitle = computed(() => formatRouteTitle(currentPageTitleKey.value))

const userDisplayName = computed(() => userStore.userInfo?.fullName || '')
const userInitial = computed(() => userDisplayName.value.slice(0, 1).toUpperCase() || 'A')
const twoFALabel = computed(() =>
    userStore.userInfo?.isFACode === 1 ? t('更换2FA') : t('绑定2FA'),
)
/**
 * 在线状态在页面标题区和用户区都可能复用，集中到 computed 可以避免模板里重复分支。
 */
const onlineStatusClassName = computed(() =>
    props.isOnline ? 'text-[var(--color-primary-6)]' : 'text-[var(--app-status-offline)]',
)
const onlineStatusLabel = computed(() => (props.isOnline ? t('在线') : t('离线')))

/**
 * 主题模式按钮直接复用中文 i18n key。
 * 这样按钮文案和下拉项都能跟随当前语言切换。
 */
const currentThemeModeLabel = computed(() => {
    if (themeMode.value === 'system') return '跟随系统'
    return themeMode.value === 'dark' ? '深色' : '浅色'
})

/**
 * 跟随系统模式需要展示“用户当前选择的是 system”，但图标要反映真正生效的明暗结果。
 * 这样既能表达偏好来源，也能让按钮图标保持直观。
 */
const currentThemeModeIcon = computed(() => {
    if (themeMode.value === 'system') return IconComputer
    return resolvedThemeMode.value === 'dark' ? IconMoonFill : IconSunFill
})

const onUpdateThemeMode = (mode: 'light' | 'dark' | 'system'): void => {
    themeStore.updateThemeMode(mode)
}

onMounted(() => {
    userStore.getUserInfo()
})
</script>

<template>
    <div class="header">
        <SettingsPassword
            :visible="isPasswordModalOpen"
            @onClose="onClosePasswordModal"
            @onSuccess="onClosePasswordModal"
        />
        <Settings2FA
            :visible="is2FAModalOpen"
            :type="twoFAModalType"
            @onClose="onClose2FAModal"
            @onSuccess="onClose2FAModal"
        />

        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] items-center">
            <div class="flex min-w-0 items-center gap-3">
                <button type="button" @click.stop="onIsSidebar(isSidebar)">
                    <IconMenuFold v-if="isSidebar" :style="{ fontSize: '18px' }" />
                    <IconMenuUnfold v-else :style="{ fontSize: '18px' }" />
                </button>

                <div class="flex min-w-0 flex-1 flex-col gap-2">
                    <div class="flex items-center">
                        <h1
                            class="m-0 text-base font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--app-text)]"
                        >
                            {{ currentPageTitle }}
                        </h1>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-2 lg:self-start">
                <a-dropdown trigger="click">
                    <button
                        type="button"
                        class="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[var(--app-control-bg)] px-3 text-[var(--app-control-text)] transition-colors hover:bg-[var(--app-control-hover-bg)]"
                        :title="t('主题模式')"
                    >
                        <component :is="currentThemeModeIcon" :style="{ fontSize: '15px' }" />
                        <span class="hidden text-xs font-medium sm:inline">
                            {{ t(currentThemeModeLabel) }}
                        </span>
                    </button>
                    <template #content>
                        <a-menu :selected-keys="[themeMode]">
                            <a-menu-item key="light" @click="onUpdateThemeMode('light')">
                                <div class="flex items-center gap-2">
                                    <IconSunFill :style="{ fontSize: '15px' }" />
                                    <span>{{ t('浅色') }}</span>
                                </div>
                            </a-menu-item>
                            <a-menu-item key="dark" @click="onUpdateThemeMode('dark')">
                                <div class="flex items-center gap-2">
                                    <IconMoonFill :style="{ fontSize: '15px' }" />
                                    <span>{{ t('深色') }}</span>
                                </div>
                            </a-menu-item>
                            <a-menu-item key="system" @click="onUpdateThemeMode('system')">
                                <div class="flex items-center gap-2">
                                    <IconComputer :style="{ fontSize: '15px' }" />
                                    <span>{{ t('跟随系统') }}</span>
                                </div>
                            </a-menu-item>
                        </a-menu>
                    </template>
                </a-dropdown>

                <a-dropdown trigger="hover">
                    <div
                        class="flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--app-control-bg)] px-[10px] py-1 pl-1 transition-colors hover:bg-[var(--app-control-hover-bg)]"
                    >
                        <div
                            class="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-[var(--color-primary-6)] text-xs font-bold text-white"
                        >
                            {{ userInitial }}
                        </div>
                        <div class="flex min-w-0 flex-col gap-0.5">
                            <p
                                class="m-0 max-w-[180px] overflow-hidden text-xs font-semibold text-[var(--app-text)] text-ellipsis whitespace-nowrap"
                            >
                                {{ userDisplayName || '--' }}
                            </p>
                            <span
                                class="inline-flex items-center gap-1 text-[10px] font-medium leading-none tracking-[0.02em]"
                                :class="onlineStatusClassName"
                            >
                                <span class="h-1.5 w-1.5 rounded-full bg-current" />
                                {{ onlineStatusLabel }}
                            </span>
                        </div>
                    </div>
                    <template #content>
                        <a-menu>
                            <a-menu-item key="google" @click="onOpen2FA">{{
                                twoFALabel
                            }}</a-menu-item>
                            <a-menu-item key="password" @click="onOpenPass">{{
                                t('修改密码')
                            }}</a-menu-item>
                            <a-menu-item key="logout" @click="onLoginOut">{{
                                t('退出登录')
                            }}</a-menu-item>
                        </a-menu>
                    </template>
                </a-dropdown>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.header {
    min-height: 48px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 4px 6px 0 rgb(223 225 232 / 12%);
    padding: 10px 20px 10px 13px;
}
</style>
