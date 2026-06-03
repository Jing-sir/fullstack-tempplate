<script setup lang="ts">
import type { ColumnType, TableSearchWrapExpose, TableToolbarButtonConfig } from '@/interface/TableType'
import TableSearchWrap from '@/components/TableSearchWrap/Index.vue'
import type { SystemRoleItem } from '@/interface/SystemManageType'
import sysRoleApi from '@/api/sys/role'

const { t } = useI18n()
const router = useRouter()

const tableWrapRef = ref<TableSearchWrapExpose | null>(null)

const toolbarButtons = computed<TableToolbarButtonConfig[]>(() => [
    {
        buttonKey: 'add',
        text: t('新增角色'),
        type: 'primary',
        onClick: async () => {
            await router.push('/systemManage/addRolePermissions')
        },
    },
])

const tableColumns = computed<ColumnType[]>(() => [
    { title: t('序号'), slotName: 'index' },
    { title: t('角色名称'), dataIndex: 'roleName' },
    {
        title: t('操作'),
        dataIndex: 'action',
        fixed: 'right',
        sorter: false,
        cellPreset: {
            type: 'actionButtons',
            buttons: [
                {
                    buttonKey: 'view',
                    text: t('查看权限'),
                    onClick: async (record) => {
                        await router.push(
                            `/systemManage/viewRolePermissions/${String(record.roleId || '')}/1`,
                        )
                    },
                },
                {
                    buttonKey: 'edit',
                    text: t('编辑'),
                    onClick: async (record) => {
                        await router.push(
                            `/systemManage/editRolePermissions/${String(record.roleId || '')}`,
                        )
                    },
                },
            ],
        },
    },
])

/**
 * 角色列表接口返回全量数组。
 * TableSearchWrap 内部会统一做分页壳适配，这里保持页面层只负责调用接口。
 */
const fetchRoleList = async (): Promise<SystemRoleItem[]> => sysRoleApi.sysRoleList()

useOnActivated(() => {
    tableWrapRef.value?.refresh()
})
</script>

<template>
    <TableSearchWrap
        ref="tableWrapRef"
        :api-fetch="fetchRoleList"
        :table-columns="tableColumns"
        :toolbar-buttons="toolbarButtons"
        :enable-column-sort="false"
        :table-props="{ pagination: false }"
        row-key="roleId"
    >
        <template #index="{ rowIndex }">
            {{ rowIndex + 1 }}
        </template>
    </TableSearchWrap>
</template>
