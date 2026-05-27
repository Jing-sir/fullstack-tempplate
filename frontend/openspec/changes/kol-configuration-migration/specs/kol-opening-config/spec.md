## ADDED Requirements

### Requirement: KOL开卡配置列表展示
KOL开卡配置页（`/kolConfiguration/agentCardOpeningConfiguration`）展示合伙人开卡费用配置，支持按合伙人UID搜索、新增和编辑。

#### Scenario: 列表加载
- **WHEN** 用户进入 KOL开卡配置页
- **THEN** 加载列表，展示字段：合伙人用户UID（agentAccountId）、卡费范围（rebateRangeName）、卡类型（cardType）、渠道名称（ditchName）、用户（email）、开卡费（openFee）、创建时间、修改时间、操作列（编辑）

#### Scenario: 按合伙人UID搜索
- **WHEN** 用户输入合伙人用户UID后触发搜索
- **THEN** 列表过滤展示对应合伙人的配置记录

#### Scenario: 新增开卡配置
- **WHEN** 用户点击新增按钮（需权限 `add`）
- **THEN** 打开新增 Drawer，表单字段：合伙人用户UID（必填）、卡费范围 radio（全部用户=1 / 指定用户=3）、指定用户时显示邮箱输入框（支持多邮箱逗号分隔，格式校验）、开卡费（必填，数字，最多两位小数，单位 USDT）

#### Scenario: UID 关联用户信息回显
- **WHEN** 用户在新增表单中输入合伙人UID并 blur
- **THEN** 调用 `/account/:id` 查询用户信息，在输入框下方展示 email 或 `国际区号-手机号`；查询失败则清空显示

#### Scenario: 编辑开卡配置
- **WHEN** 用户点击操作列编辑按钮（需权限 `edit`）
- **THEN** 打开编辑 Drawer，回填当前记录数据；合伙人UID、卡费范围字段编辑时禁用

#### Scenario: 表单提交
- **WHEN** 用户填写表单后点击确认
- **THEN** 表单校验通过后调用 `/agent/openConfig/addOrUpdate`，成功后关闭 Drawer，刷新列表
