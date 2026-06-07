<script setup lang="ts">
import { useRequest } from 'vue-request'
import sysSecurityApi from '@/api/sys/security'
import useCurrentUserSecurity from '@/use/useCurrentUserSecurity'

const { t } = useI18n()

const formRef = ref()
const visible = ref(false)
const formState = ref({
    pass: '',
})

const { encryptCurrentUserPassword, getCurrentUserId } = useCurrentUserSecurity()

const { loading, runAsync } = useRequest(
    async () => {
        const { pass } = formState.value
        const userId = await getCurrentUserId()
        const { password, iv_id } = await encryptCurrentUserPassword(pass)
        return await sysSecurityApi.checkCipher({ password, userId, iv_id })
    },
    { manual: true },
)

const onOk = async () => {
    const r = await formRef.value.validate()
    if (!r) await runAsync()
}

const onShowDialog = (val = false): void => {
    visible.value = val
}

defineExpose({ onShowDialog })
</script>

<template>
    <a-modal v-model:visible="visible" :title="t('绑定2FA')" :width="380">
        <a-form ref="formRef" :model="formState" layout="vertical">
            <a-form-item
                :label="t('登录密码')"
                field="pass"
                :rules="[{ message: t('请输入登录密码'), required: true }]"
            >
                <a-input-password v-model="formState.pass" :placeholder="t('请输入登录密码')" />
            </a-form-item>
        </a-form>
        <template #footer>
            <a-button type="primary" :loading="loading" long @click.stop="onOk">{{
                t('验证')
            }}</a-button>
        </template>
    </a-modal>
</template>
