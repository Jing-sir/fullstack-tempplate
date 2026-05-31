import { Api } from './api';

export interface FlashOption {
    label: string;
    value: string | number;
}

class FlashExchangeApi extends Api {
    async getTradeOptions(): Promise<FlashOption[]> {
        return this.api.get<FlashOption[], FlashOption[]>('/trade/options');
    }

    async getExternalTradeOptions(): Promise<FlashOption[]> {
        return this.api.get<FlashOption[], FlashOption[]>('/trade/external-options');
    }
}

export default new FlashExchangeApi();
