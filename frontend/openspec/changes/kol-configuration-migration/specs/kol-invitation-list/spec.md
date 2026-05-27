## ADDED Requirements

### Requirement: KOL申请列表展示
KOL申请列表页（`/kolConfiguration/invitationList`）展示所有 KOL 申请记录，支持搜索和导出。

#### Scenario: 列表加载
- **WHEN** 用户进入 KOL申请列表页
- **THEN** 自动加载列表数据，展示字段：ID、邮箱、阶梯费率（gradeName）、等级其他（gradeOther）、社区人数（communityNum）、联系人（contact）、联系电话（contactPhone）、其它说明（repairRemark）、创建时间、修改时间

#### Scenario: 按邮箱搜索
- **WHEN** 用户在邮箱输入框输入关键词后触发搜索
- **THEN** 列表过滤展示匹配的记录，分页重置到第 1 页

#### Scenario: 按阶梯费率筛选
- **WHEN** 用户选择阶梯费率下拉（全部 / Level 1 / Level 2 / Level 3 / Other，对应值 null/1/2/3/4）
- **THEN** 列表过滤展示对应费率等级的记录

#### Scenario: 导出
- **WHEN** 用户点击导出按钮（需权限 `export`）
- **THEN** 调用 `/kolApply/export` 接口，下载 Excel 文件，文件名为路由标题
