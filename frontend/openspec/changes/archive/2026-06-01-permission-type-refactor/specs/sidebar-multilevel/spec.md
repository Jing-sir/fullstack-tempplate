## ADDED Requirements

### Requirement: 侧边栏支持三级及以上菜单的缩进样式
`SideNavigationBar/index.vue` 的 SCSS SHALL 为三级及以上的 `a-sub-menu` 嵌套节点提供正确的缩进视觉，每多一级缩进 16px，保证层级关系清晰可辨。

`Item.vue` 已是递归结构（`a-sub-menu` 内嵌 `Item`），无需修改组件逻辑，仅需 CSS 补充。

#### Scenario: 三级菜单正常缩进显示
- **WHEN** 后端返回包含三级菜单的菜单树（如：系统管理 → 权限组 → 角色管理）
- **THEN** 侧边栏第三级菜单项相对第二级有明显的缩进层级，文字不溢出，不与左侧 icon 重叠

#### Scenario: 折叠态下三级菜单不显示文字
- **WHEN** 侧边栏处于折叠（collapsed）状态
- **THEN** 三级菜单的文字隐藏，仅 icon 可见，与一二级折叠行为一致

#### Scenario: 选中三级菜单时父链高亮正确
- **WHEN** 当前路由对应三级菜单项
- **THEN** 三级菜单项显示为 primary 色选中态，其父级一级和二级节点显示为 active 描边态（左侧主色竖线），不出现两个同权重高亮
