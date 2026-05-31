import type { AxiosInstance } from 'axios';
import http from '../plugins/http';

const API_VERSION_BASE_RE = /^\/api\/v\d+$/;

export const getApiBaseUrl = (): string => {
    const baseUrl = String(import.meta.env.VITE_APP_BASE_URL || '').trim().replace(/\/+$/, '');

    if (!API_VERSION_BASE_RE.test(baseUrl)) {
        throw new Error('VITE_APP_BASE_URL must be a fixed versioned API path such as /api/v1');
    }

    return baseUrl;
};

export abstract class Api {
    protected api: AxiosInstance;

    constructor() {
        const baseUrl: string = getApiBaseUrl();
        this.api = http[baseUrl] || http.instance(baseUrl);
    }
}
