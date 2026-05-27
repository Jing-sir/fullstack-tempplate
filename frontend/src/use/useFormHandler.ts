import type { FormInstance } from '@arco-design/web-vue';
import { deepCopy } from '@/utils/common'
import allToRaw from '@/utils/allToRaw';

type IOptions<T extends Record<string, unknown>> = {
    defaultState: {
        [P in keyof T]: T[P]
    }
}
export default function useFormHandler<FormType extends Record<string, unknown>>(options: IOptions<FormType>) {
    const { defaultState } = options;
    type FormState = IOptions<FormType>['defaultState'];

    const formState = ref<FormState>(deepCopy(defaultState) as FormState);
    const formRef = ref<FormInstance>();

    return {
        formState,
        formRef,

        resetFields: (): void => {
            formState.value = deepCopy(defaultState) as FormState;
        },

        validateFields: (): Promise<FormState> =>
            new Promise<FormState>((resolve, reject) => {
                formRef.value?.validateFields()
                    .then((values: unknown) => {
                        resolve(values as FormState);
                    })
                    .catch((err: unknown) => {
                        reject(err);
                    });
            }),

        validateField: (nameList: string): void => {
            setTimeout(() => {
                formRef.value?.validateFields(nameList);
            }, 300);
        },

        setFields: (fields: FormState): void => {
            const values = allToRaw<FormState>(fields);
            const state = allToRaw(formState.value);

            formState.value = {
                ...state,
                ...values,
            };
        },
    };
}
