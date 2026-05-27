import type { AxiosInstance } from 'axios';
import http from '../plugins/http';

export abstract class Api {
    protected api: AxiosInstance;

    constructor() {
        const baseUrl: string = String(import.meta.env.VITE_APP_BASE_URL);
        this.api = http[baseUrl] || http.instance(baseUrl);
    }
}
