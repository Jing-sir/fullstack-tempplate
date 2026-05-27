export interface SidebarMenuNode {
    key: string
    title: string
    icon?: string
    role?: string
    children?: SidebarMenuNode[]
}
