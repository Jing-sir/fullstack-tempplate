/**
 * 兼容层：仅保留 re-export，防止已有 import 路径短期内编译失败。
 *
 * 迁移说明：
 * - Pagination            → src/interface/TableType.ts
 * - CancellationApplicationType / CancellationApplicationItem / List
 *                         → src/api/userApi/account/list.ts
 *
 * 请逐步将调用方 import 切换到上述新位置，待全量迁移完成后删除此文件。
 */
export type { Pagination } from '@/interface/TableType'
export type {
    CancellationApplicationType,
    CancellationApplicationItem,
    CancellationApplicationList as List,
} from '@/api/userApi/account/list'