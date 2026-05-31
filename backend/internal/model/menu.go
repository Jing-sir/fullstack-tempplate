package model

import "time"

// MenuType 菜单类型
type MenuType int

const (
	MenuTypeMenu   MenuType = 1 // 菜单（对应前端路由）
	MenuTypeButton MenuType = 2 // 按钮（格式：routeName-actionName，如 userList-add）
)

// Menu 对应 menus 表，同时存储菜单项和按钮权限
type Menu struct {
	ID        int64     `json:"id"`
	ParentID  int64     `json:"parent_id"`  // 0 表示顶级菜单
	Name      string    `json:"name"`       // 权限 key，全局唯一（菜单=路由name，按钮=路由name-操作名）
	Title     string    `json:"title"`      // 显示名称
	Type      MenuType  `json:"type"`       // 1=菜单 2=按钮
	Icon      string    `json:"icon"`       // 图标标识，仅菜单有效
	Sort      int       `json:"sort"`       // 同级排序，数字越小越靠前
	Status    int       `json:"status"`     // 1=启用 0=禁用
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// MenuTree 在 Menu 基础上附加子节点列表，用于接口返回树形结构
type MenuTree struct {
	Menu
	Children []*MenuTree `json:"children,omitempty"`
}

// BuildMenuTree 将扁平 menu 列表构建为树形结构
func BuildMenuTree(menus []Menu) []*MenuTree {
	// 建立 id → node 索引
	nodeMap := make(map[int64]*MenuTree, len(menus))
	for i := range menus {
		nodeMap[menus[i].ID] = &MenuTree{Menu: menus[i]}
	}

	// 遍历，将子节点挂到父节点上
	var roots []*MenuTree
	for _, m := range menus {
		node := nodeMap[m.ID]
		if m.ParentID == 0 {
			roots = append(roots, node)
		} else if parent, ok := nodeMap[m.ParentID]; ok {
			parent.Children = append(parent.Children, node)
		}
	}
	return roots
}
