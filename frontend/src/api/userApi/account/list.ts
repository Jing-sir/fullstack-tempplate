export interface CancellationApplicationType {
    label?: string;
    value?: string | number;
}

export interface CancellationApplicationItem {
    id?: string | number;
    userId?: string;
    account?: string;
    state?: number;
    createTime?: string;
}

export type CancellationApplicationList = CancellationApplicationItem[];
