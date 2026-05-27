import { isRef, toRaw, unref } from 'vue';

export default function allToRaw<T>(value: T): T {
    const rawValue = isRef(value) ? unref(value) : value;

    return toRaw(rawValue) as T;
}
